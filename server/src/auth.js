import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getCollectionModel, serializeDocument } from './db.js';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'dev-access-change-me';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-change-me';
const ACCESS_TTL = process.env.JWT_ACCESS_TTL || '15m';
const REFRESH_DAYS = Number(process.env.JWT_REFRESH_DAYS || 30);

const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const publicUser = user => {
  const data = serializeDocument(user);
  delete data.password_hash;
  return data;
};

export function signAccessToken(user) {
  return jwt.sign({ sub: String(user._id), role: user.role, email: user.email, type: 'access' }, ACCESS_SECRET, { expiresIn: ACCESS_TTL, issuer: 'jervis' });
}

export async function issueRefreshToken(user, meta = {}) {
  const Refresh = getCollectionModel('refresh_tokens');
  const tokenId = crypto.randomUUID();
  const token = jwt.sign({ sub: String(user._id), jti: tokenId, type: 'refresh' }, REFRESH_SECRET, { expiresIn: `${REFRESH_DAYS}d`, issuer: 'jervis' });
  await Refresh.create({ user_id: String(user._id), token_id: tokenId, token_hash: sha256(token), revoked: false, expires_at: new Date(Date.now() + REFRESH_DAYS * 86400000).toISOString(), created_at: new Date().toISOString(), ip: meta.ip, user_agent: meta.userAgent });
  return token;
}

export async function createSession(user, meta = {}) {
  return { accessToken: signAccessToken(user), refreshToken: await issueRefreshToken(user, meta), user: publicUser(user) };
}

export async function registerUser({ name, email, password }) {
  const User = getCollectionModel('users');
  const normalized = String(email).trim().toLowerCase();
  if (await User.exists({ email: normalized })) throw Object.assign(new Error('Email is already registered'), { status: 409 });
  const role = (await User.countDocuments({})) === 0 ? 'admin' : 'user';
  const user = await User.create({ name: String(name).trim(), email: normalized, password_hash: await bcrypt.hash(password, 12), role, status: 'active', created_at: new Date().toISOString() });
  return user;
}

export async function authenticateUser(email, password) {
  const User = getCollectionModel('users');
  const user = await User.findOne({ email: String(email).trim().toLowerCase(), status: { $ne: 'disabled' } });
  if (!user || !(await bcrypt.compare(password, user.password_hash || ''))) throw Object.assign(new Error('Invalid email or password'), { status: 401 });
  return user;
}

export async function rotateRefreshToken(token, meta = {}) {
  let payload;
  try { payload = jwt.verify(token, REFRESH_SECRET, { issuer: 'jervis' }); } catch { throw Object.assign(new Error('Invalid or expired refresh token'), { status: 401 }); }
  if (payload.type !== 'refresh') throw Object.assign(new Error('Invalid token type'), { status: 401 });
  const Refresh = getCollectionModel('refresh_tokens');
  const stored = await Refresh.findOne({ token_id: payload.jti, token_hash: sha256(token), revoked: false });
  if (!stored || new Date(stored.expires_at) <= new Date()) throw Object.assign(new Error('Refresh token revoked or expired'), { status: 401 });
  await Refresh.updateOne({ _id: stored._id }, { $set: { revoked: true, revoked_at: new Date().toISOString(), replaced: true } });
  const User = getCollectionModel('users');
  const user = await User.findById(payload.sub);
  if (!user || user.status === 'disabled') throw Object.assign(new Error('User unavailable'), { status: 401 });
  return createSession(user, meta);
}

export async function revokeRefreshToken(token, reason = 'logout') {
  const Refresh = getCollectionModel('refresh_tokens');
  await Refresh.updateMany({ token_hash: sha256(token), revoked: false }, { $set: { revoked: true, revoked_at: new Date().toISOString(), revoke_reason: reason } });
}

export async function revokeAllUserTokens(userId, reason = 'revoke-all') {
  const Refresh = getCollectionModel('refresh_tokens');
  await Refresh.updateMany({ user_id: String(userId), revoked: false }, { $set: { revoked: true, revoked_at: new Date().toISOString(), revoke_reason: reason } });
}

export function requireAuth(req, _res, next) {
  const token = req.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return next(Object.assign(new Error('Authentication required'), { status: 401 }));
  try {
    const payload = jwt.verify(token, ACCESS_SECRET, { issuer: 'jervis' });
    if (payload.type !== 'access') throw new Error('Wrong token type');
    req.user = { id: payload.sub, role: payload.role, email: payload.email };
    next();
  } catch { next(Object.assign(new Error('Invalid or expired access token'), { status: 401 })); }
}

export function requireRole(...roles) {
  return (req, _res, next) => roles.includes(req.user?.role) ? next() : next(Object.assign(new Error('Insufficient permissions'), { status: 403 }));
}

export { publicUser };
