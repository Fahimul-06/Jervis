import path from 'path';
import fs from 'fs';

export function allowedRoots() {
  return (process.env.JERVIS_ALLOWED_PATHS || process.cwd()).split(',').map(v => path.resolve(v.trim())).filter(Boolean);
}

export function safePath(input) {
  if (!input) throw new Error('A path is required');
  const resolved = path.resolve(input);
  const ok = allowedRoots().some(root => resolved === root || resolved.startsWith(root + path.sep));
  if (!ok) throw new Error(`Path is outside allowed roots: ${resolved}`);
  return resolved;
}

export function ensureExists(p) { if (!fs.existsSync(p)) throw new Error(`Path does not exist: ${p}`); }
