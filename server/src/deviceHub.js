import crypto from 'crypto';
import { getCollectionModel, serializeDocument } from './db.js';

const sockets = new Map();
const pending = new Map();

export function createPairingCode() {
  return crypto.randomBytes(24).toString('base64url');
}

export function setupDeviceHub(io) {
  io.use(async (socket, next) => {
    try {
      const { deviceId, token } = socket.handshake.auth || {};
      if (!deviceId || !token) return next(new Error('Missing device credentials'));
      const Device = getCollectionModel('connected_devices');
      const device = await Device.findOne({ device_id: deviceId, pairing_token: token });
      if (!device) return next(new Error('Invalid device credentials'));
      socket.deviceId = deviceId;
      next();
    } catch (error) { next(error); }
  });

  io.on('connection', async socket => {
    const deviceId = socket.deviceId;
    sockets.set(deviceId, socket);
    const Device = getCollectionModel('connected_devices');
    await Device.updateOne({ device_id: deviceId }, { $set: { status: 'online', last_seen_at: new Date().toISOString(), socket_id: socket.id } });

    socket.on('heartbeat', async payload => {
      await Device.updateOne({ device_id: deviceId }, { $set: { status: 'online', last_seen_at: new Date().toISOString(), system: payload } });
    });

    socket.on('command:result', async result => {
      const waiter = pending.get(result.commandId);
      if (waiter) {
        pending.delete(result.commandId);
        waiter.resolve(result);
      }
    });

    socket.on('disconnect', async () => {
      sockets.delete(deviceId);
      await Device.updateOne({ device_id: deviceId }, { $set: { status: 'offline', last_seen_at: new Date().toISOString() } });
    });
  });
}

export function isDeviceOnline(deviceId) { return sockets.has(deviceId); }

export async function executeOnDevice(deviceId, tool, args = {}, timeoutMs = 30000) {
  const socket = sockets.get(deviceId);
  if (!socket) throw new Error('Device is offline');
  const commandId = crypto.randomUUID();
  const Command = getCollectionModel('device_commands');
  await Command.create({ command_id: commandId, device_id: deviceId, tool, args, status: 'pending', created_at: new Date().toISOString() });

  const result = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(commandId);
      reject(new Error('Device command timed out'));
    }, timeoutMs);
    pending.set(commandId, { resolve: value => { clearTimeout(timer); resolve(value); }, reject });
    socket.emit('command:execute', { commandId, tool, args });
  });

  await Command.updateOne({ command_id: commandId }, { $set: { status: result.success ? 'executed' : 'failed', result, completed_at: new Date().toISOString() } });
  return result;
}

export async function getDevices() {
  const Device = getCollectionModel('connected_devices');
  const docs = await Device.find({}).sort({ last_seen_at: -1 }).lean();
  return docs.map(serializeDocument).map(d => ({ ...d, pairing_token: undefined, socket_id: undefined }));
}
