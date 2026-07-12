import { authFetch } from './auth';
const API = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');

async function jsonFetch(path: string, init?: RequestInit) {
  const response = await authFetch(`${API}${path}`, { ...init, headers: { 'content-type': 'application/json', ...(init?.headers || {}) } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body?.error?.message || body?.message || `Request failed: ${response.status}`) as Error & { body?: unknown; status?: number };
    error.body = body; error.status = response.status; throw error;
  }
  return body;
}

export async function firstOnlineDeviceId(): Promise<string> {
  const body = await jsonFetch('/devices');
  const device = body.data?.find((d: { status?: string }) => d.status === 'online') || body.data?.[0];
  if (!device) throw new Error('No paired JERVIS device found. Pair and start the device agent first.');
  return device.device_id;
}

export async function runDeviceAssistant(text: string, confirmed = false) {
  const deviceId = await firstOnlineDeviceId();
  return jsonFetch('/assistant/command', { method: 'POST', body: JSON.stringify({ text, deviceId, confirmed }) });
}
