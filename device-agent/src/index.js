import 'dotenv/config';
import os from 'os';
import { io } from 'socket.io-client';
import { tools } from './tools.js';

const serverUrl = process.env.JERVIS_SERVER_URL;
const deviceId = process.env.JERVIS_DEVICE_ID;
const token = process.env.JERVIS_PAIRING_TOKEN;
if (!serverUrl || !deviceId || !token) throw new Error('Set JERVIS_SERVER_URL, JERVIS_DEVICE_ID and JERVIS_PAIRING_TOKEN in device-agent/.env');

const socket = io(serverUrl, { transports:['websocket','polling'], reconnection:true, auth:{deviceId,token} });
socket.on('connect', () => console.log(`JERVIS agent connected as ${deviceId} (${os.hostname()})`));
socket.on('connect_error', error => console.error('Connection failed:', error.message));
socket.on('command:execute', async command => {
  const startedAt = Date.now();
  try {
    const handler = tools[command.tool];
    if (!handler) throw new Error(`Tool not allowed: ${command.tool}`);
    const data = await handler(command.args || {});
    socket.emit('command:result', { commandId:command.commandId, success:true, data, durationMs:Date.now()-startedAt });
  } catch (error) {
    socket.emit('command:result', { commandId:command.commandId, success:false, error:error.message, durationMs:Date.now()-startedAt });
  }
});
setInterval(async()=>{ try { const data=await tools['system.status'](); socket.emit('heartbeat',data); } catch {} },30000);
