const risky = new Set(['file.delete', 'file.move', 'process.kill', 'power.shutdown', 'power.restart', 'power.sleep', 'shell.run']);

export function planCommand(text) {
  const t = text.trim();
  const low = t.toLowerCase();
  let tool = null, args = {}, response = '';

  if (/system|cpu|memory|ram|disk|battery|temperature|network/.test(low)) tool = 'system.status';
  else if (/take (a )?screenshot|capture screen/.test(low)) tool = 'screen.capture';
  else if (/lock (my |the )?(pc|computer|device)/.test(low)) tool = 'power.lock';
  else if (/shutdown|turn off (my |the )?(pc|computer)/.test(low)) tool = 'power.shutdown';
  else if (/restart|reboot/.test(low)) tool = 'power.restart';
  else if (/sleep (my |the )?(pc|computer)/.test(low)) tool = 'power.sleep';
  else if (/mute/.test(low)) { tool = 'audio.mute'; args = { mute: true }; }
  else if (/unmute/.test(low)) { tool = 'audio.mute'; args = { mute: false }; }
  else if (/volume/.test(low)) { const n = low.match(/(\d{1,3})/); tool = 'audio.volume'; args = { percent: n ? Number(n[1]) : 50 }; }
  else if (/close|kill|terminate|end task/.test(low)) { tool = 'process.kill'; args = { name: extractAfter(t, /(close|kill|terminate|end task)\s+/i) }; }
  else if (/open|launch|start/.test(low)) { tool = 'app.open'; args = { target: extractAfter(t, /(open|launch|start)\s+/i) }; }
  else if (/list files|show files|files in/.test(low)) { tool = 'file.list'; args = { path: extractAfter(t, /(in|at)\s+/i) || '.' }; }
  else if (/read file/.test(low)) { tool = 'file.read'; args = { path: extractAfter(t, /read file\s+/i) }; }
  else if (/delete file|remove file/.test(low)) { tool = 'file.delete'; args = { path: extractAfter(t, /(delete|remove) file\s+/i) }; }
  else if (/running processes|process list/.test(low)) tool = 'process.list';

  if (!tool) return { matched: false };
  response = `Prepared ${tool} on the selected device.`;
  return { matched: true, tool, args, riskLevel: risky.has(tool) ? 'destructive' : ['app.open','screen.capture','audio.volume','audio.mute','power.lock'].includes(tool) ? 'moderate' : 'safe', requiresConfirmation: risky.has(tool), response };
}

function extractAfter(text, regex) { const m = text.match(regex); return m ? text.slice((m.index || 0) + m[0].length).trim().replace(/[.!?]+$/, '') : ''; }
