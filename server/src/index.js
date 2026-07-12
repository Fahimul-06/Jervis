import 'dotenv/config';
import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { connectDatabase, getCollectionModel, serializeDocument } from './db.js';
import { createPairingCode, setupDeviceHub, executeOnDevice, getDevices, isDeviceOnline } from './deviceHub.js';
import { planCommand } from './assistant.js';

const app = express();
const PORT = Number(process.env.PORT || 5000);
const server = http.createServer(app);
const io = new SocketIOServer(server, { cors: { origin: true, credentials: true } });
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/jervis';
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: CLIENT_ORIGIN.split(',').map(v => v.trim()), credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'jervis-mongodb-api', database: 'mongodb' });
});

function parseValue(raw) {
  if (raw === undefined) return undefined;
  try { return JSON.parse(raw); } catch { return raw; }
}

function buildFilter(filters = [], orExpression) {
  const query = {};
  for (const filter of filters) {
    const { field, operator, value } = filter;
    if (!field || !operator) continue;
    if (field === 'id') {
      query._id = value;
      continue;
    }
    switch (operator) {
      case 'eq': query[field] = value; break;
      case 'neq': query[field] = { $ne: value }; break;
      case 'gt': query[field] = { $gt: value }; break;
      case 'gte': query[field] = { $gte: value }; break;
      case 'lt': query[field] = { $lt: value }; break;
      case 'lte': query[field] = { $lte: value }; break;
      case 'in': query[field] = { $in: Array.isArray(value) ? value : [] }; break;
      case 'is': query[field] = value; break;
      default: break;
    }
  }
  if (orExpression && typeof orExpression === 'string') {
    const clauses = orExpression.split(',').map(part => {
      const match = part.match(/^([a-zA-Z0-9_]+)\.ilike\.%?(.*?)%?$/);
      if (!match) return null;
      return { [match[1]]: { $regex: match[2], $options: 'i' } };
    }).filter(Boolean);
    if (clauses.length) query.$or = clauses;
  }
  return query;
}


app.post('/api/devices/pair', async (req, res, next) => {
  try {
    const Device = getCollectionModel('connected_devices');
    const deviceId = req.body?.deviceId || `device-${Math.random().toString(36).slice(2, 10)}`;
    const pairingToken = createPairingCode();
    const name = req.body?.name || 'JERVIS Device';
    await Device.findOneAndUpdate(
      { device_id: deviceId },
      { $set: { device_id: deviceId, device_name: name, device_type: req.body?.deviceType || 'computer', platform: req.body?.platform || 'unknown', pairing_token: pairingToken, status: 'offline', paired_at: new Date().toISOString(), created_at: new Date().toISOString() } },
      { upsert: true, new: true },
    );
    res.status(201).json({ deviceId, pairingToken, serverUrl: process.env.PUBLIC_SERVER_URL || `${req.protocol}://${req.get('host')}` });
  } catch (error) { next(error); }
});

app.get('/api/devices', async (_req, res, next) => {
  try { res.json({ data: await getDevices(), error: null }); } catch (error) { next(error); }
});

app.post('/api/devices/:deviceId/commands', async (req, res, next) => {
  try {
    const { tool, args = {}, confirmed = false } = req.body || {};
    if (!tool) return res.status(400).json({ error: { message: 'tool is required' } });
    const destructive = ['file.delete','file.move','process.kill','power.shutdown','power.restart','power.sleep','shell.run'].includes(tool);
    if (destructive && !confirmed) return res.status(409).json({ requiresConfirmation: true, riskLevel: 'destructive', tool, args });
    const result = await executeOnDevice(req.params.deviceId, tool, args);
    res.json({ data: result, error: null });
  } catch (error) { next(error); }
});

app.post('/api/assistant/command', async (req, res, next) => {
  try {
    const { text, deviceId, confirmed = false } = req.body || {};
    if (!text || !deviceId) return res.status(400).json({ error: { message: 'text and deviceId are required' } });
    const plan = planCommand(text);
    if (!plan.matched) return res.json({ data: { matched: false }, error: null });
    if (plan.requiresConfirmation && !confirmed) return res.status(409).json({ requiresConfirmation: true, ...plan });
    const result = await executeOnDevice(deviceId, plan.tool, plan.args);
    res.json({ data: { ...plan, result, deviceOnline: isDeviceOnline(deviceId) }, error: null });
  } catch (error) { next(error); }
});

app.post('/api/db/:collection/query', async (req, res, next) => {
  try {
    const Model = getCollectionModel(req.params.collection);
    const { filters = [], orders = [], limit, countOnly = false, single = false, or } = req.body || {};
    const mongoFilter = buildFilter(filters, or);

    if (countOnly) {
      const count = await Model.countDocuments(mongoFilter);
      return res.json({ data: null, count, error: null });
    }

    let query = Model.find(mongoFilter).lean();
    if (orders.length) {
      const sort = {};
      for (const order of orders) sort[order.field] = order.ascending === false ? -1 : 1;
      query = query.sort(sort);
    }
    if (Number.isFinite(limit)) query = query.limit(Number(limit));
    const docs = await query.exec();
    const data = docs.map(serializeDocument);
    return res.json({ data: single ? (data[0] ?? null) : data, count: null, error: null });
  } catch (error) { next(error); }
});

app.post('/api/db/:collection', async (req, res, next) => {
  try {
    const Model = getCollectionModel(req.params.collection);
    const payload = req.body?.data;
    const items = Array.isArray(payload) ? payload : [payload];
    const now = new Date().toISOString();
    const normalized = items.map(item => ({ created_at: item?.created_at ?? now, ...item }));
    const docs = await Model.insertMany(normalized);
    const data = docs.map(serializeDocument);
    res.status(201).json({ data: Array.isArray(payload) ? data : data[0], error: null });
  } catch (error) { next(error); }
});

app.patch('/api/db/:collection', async (req, res, next) => {
  try {
    const Model = getCollectionModel(req.params.collection);
    const filter = buildFilter(req.body?.filters || []);
    const update = { ...req.body?.data, updated_at: new Date().toISOString() };
    await Model.updateMany(filter, { $set: update });
    const docs = await Model.find(filter).lean();
    res.json({ data: docs.map(serializeDocument), error: null });
  } catch (error) { next(error); }
});

app.delete('/api/db/:collection', async (req, res, next) => {
  try {
    const Model = getCollectionModel(req.params.collection);
    const filter = buildFilter(req.body?.filters || []);
    const docs = await Model.find(filter).lean();
    await Model.deleteMany(filter);
    res.json({ data: docs.map(serializeDocument), error: null });
  } catch (error) { next(error); }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ data: null, error: { message: error.message || 'Internal server error' } });
});

connectDatabase(MONGODB_URI)
  .then(() => { setupDeviceHub(io); server.listen(PORT, () => console.log(`JERVIS API running on http://localhost:${PORT}`)); })
  .catch(error => {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  });
