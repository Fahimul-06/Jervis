import 'dotenv/config';
import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { connectDatabase, getCollectionModel, serializeDocument } from './db.js';
import { createPairingCode, setupDeviceHub, executeOnDevice, getDevices, isDeviceOnline } from './deviceHub.js';
import { planCommand } from './assistant.js';
import { planWithLLM } from './llm.js';
import { registerUser, authenticateUser, createSession, rotateRefreshToken, revokeRefreshToken, revokeAllUserTokens, requireAuth, requireRole, publicUser } from './auth.js';

const app = express();
const PORT = Number(process.env.PORT || 5000);
const server = http.createServer(app);
const origins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',').map(v => v.trim());
const io = new SocketIOServer(server, { cors: { origin: origins, credentials: true } });
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/jervis';
const allowedCollections = new Set((process.env.ALLOWED_COLLECTIONS || 'messages,notifications,mood_history,command_logs,reminders,automation_rules,integrations,calendar_events,emails,github_repos,file_entries,system_metrics,fb_conversations,fb_messages,fb_posts,fb_comments,spotify_tracks,spotify_playlists').split(',').map(x=>x.trim()).filter(Boolean));

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: origins, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());
app.use(morgan('dev'));
app.use('/api', rateLimit({ windowMs: 60_000, limit: Number(process.env.API_RATE_LIMIT || 180), standardHeaders: 'draft-7', legacyHeaders: false }));
const authLimiter = rateLimit({ windowMs: 15 * 60_000, limit: Number(process.env.AUTH_RATE_LIMIT || 20), standardHeaders: 'draft-7', legacyHeaders: false });
const meta = req => ({ ip: req.ip, userAgent: req.get('user-agent') });

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'jervis-secure-api', database: 'mongodb', auth: 'jwt' }));

app.post('/api/auth/register', authLimiter, async (req,res,next)=>{ try {
  const input = z.object({name:z.string().min(2).max(80),email:z.string().email(),password:z.string().min(8).max(128)}).parse(req.body);
  const user = await registerUser(input); res.status(201).json({ data: await createSession(user, meta(req)), error:null });
} catch(e){next(e);} });
app.post('/api/auth/login', authLimiter, async (req,res,next)=>{ try {
  const input = z.object({email:z.string().email(),password:z.string().min(1)}).parse(req.body);
  const user = await authenticateUser(input.email,input.password); res.json({ data: await createSession(user, meta(req)), error:null });
} catch(e){next(e);} });
app.post('/api/auth/refresh', authLimiter, async (req,res,next)=>{ try { const token=req.body?.refreshToken; if(!token) throw Object.assign(new Error('refreshToken is required'),{status:400}); res.json({data:await rotateRefreshToken(token,meta(req)),error:null}); } catch(e){next(e);} });
app.post('/api/auth/logout', async (req,res,next)=>{ try { if(req.body?.refreshToken) await revokeRefreshToken(req.body.refreshToken); res.json({data:{loggedOut:true},error:null}); } catch(e){next(e);} });
app.get('/api/auth/me', requireAuth, async (req,res,next)=>{ try { const User=getCollectionModel('users'); const user=await User.findById(req.user.id); res.json({data:publicUser(user),error:null}); } catch(e){next(e);} });
app.post('/api/auth/revoke-all', requireAuth, async (req,res,next)=>{ try { await revokeAllUserTokens(req.user.id,'user-request'); res.json({data:{revoked:true},error:null}); } catch(e){next(e);} });
app.patch('/api/admin/users/:id/role', requireAuth, requireRole('admin'), async(req,res,next)=>{ try { const role=z.enum(['admin','user','viewer']).parse(req.body?.role); const User=getCollectionModel('users'); const user=await User.findByIdAndUpdate(req.params.id,{$set:{role,updated_at:new Date().toISOString()}},{new:true}); res.json({data:publicUser(user),error:null}); }catch(e){next(e);} });

app.post('/api/devices/pair', requireAuth, async (req,res,next)=>{ try {
  const Device=getCollectionModel('connected_devices'); const deviceId=req.body?.deviceId||`device-${Math.random().toString(36).slice(2,10)}`; const pairingToken=createPairingCode();
  await Device.findOneAndUpdate({device_id:deviceId,user_id:req.user.id},{$set:{device_id:deviceId,user_id:req.user.id,device_name:req.body?.name||'JERVIS Device',device_type:req.body?.deviceType||'computer',platform:req.body?.platform||'unknown',pairing_token_hash:await import('crypto').then(({default:c})=>c.createHash('sha256').update(pairingToken).digest('hex')),status:'offline',paired_at:new Date().toISOString(),created_at:new Date().toISOString()}},{upsert:true,new:true});
  res.status(201).json({data:{deviceId,pairingToken,serverUrl:process.env.PUBLIC_SERVER_URL||`${req.protocol}://${req.get('host')}`},error:null});
} catch(e){next(e);} });
app.get('/api/devices', requireAuth, async(req,res,next)=>{try{res.json({data:await getDevices(req.user),error:null});}catch(e){next(e);}});
app.delete('/api/devices/:deviceId', requireAuth, async(req,res,next)=>{try{const Device=getCollectionModel('connected_devices'); const filter={device_id:req.params.deviceId,...(req.user.role==='admin'?{}:{user_id:req.user.id})}; await Device.deleteOne(filter); res.json({data:{deleted:true},error:null});}catch(e){next(e);}});
app.post('/api/devices/:deviceId/commands', requireAuth, async(req,res,next)=>{try{
  const {tool,args={},confirmed=false}=req.body||{}; if(!tool) throw Object.assign(new Error('tool is required'),{status:400});
  const destructive=['file.delete','file.move','file.write','process.kill','power.shutdown','power.restart','power.sleep'].includes(tool); if(destructive&&!confirmed)return res.status(409).json({requiresConfirmation:true,riskLevel:'destructive',tool,args});
  res.json({data:await executeOnDevice(req.params.deviceId,tool,args,30000,req.user),error:null});
}catch(e){next(e);}});
app.post('/api/assistant/command', requireAuth, async(req,res,next)=>{try{
  const {text,deviceId,confirmed=false}=req.body||{}; if(!text||!deviceId) throw Object.assign(new Error('text and deviceId are required'),{status:400});
  let plan; try{plan=await planWithLLM(text);}catch(err){console.warn('LLM planner fallback:',err.message);} plan=plan||planCommand(text);
  if(!plan.matched)return res.json({data:{matched:false,response:plan.response||'I could not map that request to a device action.'},error:null});
  if(plan.requiresConfirmation&&!confirmed)return res.status(409).json({requiresConfirmation:true,...plan});
  const result=await executeOnDevice(deviceId,plan.tool,plan.args,30000,req.user); res.json({data:{...plan,result,deviceOnline:isDeviceOnline(deviceId)},error:null});
}catch(e){next(e);}});

function collectionGuard(req,_res,next){ if(!allowedCollections.has(req.params.collection)&&req.user.role!=='admin') return next(Object.assign(new Error('Collection is not allowed'),{status:403})); next(); }
function buildFilter(filters=[],orExpression){const query={}; for(const f of filters){if(!f.field||!f.operator)continue; const field=f.field==='id'?'_id':f.field; const v=f.value; if(f.operator==='eq')query[field]=v; else if(f.operator==='neq')query[field]={$ne:v}; else if(['gt','gte','lt','lte'].includes(f.operator))query[field]={[`$${f.operator}`]:v}; else if(f.operator==='in')query[field]={$in:Array.isArray(v)?v:[]}; else if(f.operator==='is')query[field]=v;} if(orExpression){const clauses=String(orExpression).split(',').map(p=>{const m=p.match(/^([\w]+)\.ilike\.%?(.*?)%?$/);return m?{[m[1]]:{$regex:m[2],$options:'i'}}:null;}).filter(Boolean);if(clauses.length)query.$or=clauses;} return query;}
const ownerFilter=(req,filter={})=>req.user.role==='admin'&&req.query.allUsers==='true'?filter:{...filter,user_id:req.user.id};
app.post('/api/db/:collection/query',requireAuth,collectionGuard,async(req,res,next)=>{try{const Model=getCollectionModel(req.params.collection);const {filters=[],orders=[],limit,countOnly=false,single=false,or}=req.body||{};const filter=ownerFilter(req,buildFilter(filters,or));if(countOnly)return res.json({data:null,count:await Model.countDocuments(filter),error:null});let q=Model.find(filter).lean();if(orders.length){const sort={};for(const o of orders)sort[o.field]=o.ascending===false?-1:1;q=q.sort(sort);}if(Number.isFinite(limit))q=q.limit(Number(limit));const data=(await q.exec()).map(serializeDocument);res.json({data:single?(data[0]??null):data,count:null,error:null});}catch(e){next(e);}});
app.post('/api/db/:collection',requireAuth,collectionGuard,async(req,res,next)=>{try{const Model=getCollectionModel(req.params.collection);const payload=req.body?.data;const items=Array.isArray(payload)?payload:[payload];const now=new Date().toISOString();const docs=await Model.insertMany(items.map(item=>({...item,user_id:req.user.id,created_at:item?.created_at??now})));const data=docs.map(serializeDocument);res.status(201).json({data:Array.isArray(payload)?data:data[0],error:null});}catch(e){next(e);}});
app.patch('/api/db/:collection',requireAuth,collectionGuard,async(req,res,next)=>{try{const Model=getCollectionModel(req.params.collection);const filter=ownerFilter(req,buildFilter(req.body?.filters||[]));await Model.updateMany(filter,{$set:{...req.body?.data,updated_at:new Date().toISOString()}});res.json({data:(await Model.find(filter).lean()).map(serializeDocument),error:null});}catch(e){next(e);}});
app.delete('/api/db/:collection',requireAuth,collectionGuard,async(req,res,next)=>{try{const Model=getCollectionModel(req.params.collection);const filter=ownerFilter(req,buildFilter(req.body?.filters||[]));const docs=await Model.find(filter).lean();await Model.deleteMany(filter);res.json({data:docs.map(serializeDocument),error:null});}catch(e){next(e);}});

app.use((error,_req,res,_next)=>{console.error(error);const status=error.status||((error.name==='ZodError')?400:500);res.status(status).json({data:null,error:{message:error.name==='ZodError'?error.issues?.map(i=>i.message).join(', '):error.message||'Internal server error'}});});
connectDatabase(MONGODB_URI).then(()=>{setupDeviceHub(io);server.listen(PORT,()=>console.log(`JERVIS secure API running on http://localhost:${PORT}`));}).catch(e=>{console.error('MongoDB connection failed:',e.message);process.exit(1);});
