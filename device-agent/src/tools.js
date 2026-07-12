import os from 'os';
import fs from 'fs/promises';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import open from 'open';
import screenshot from 'screenshot-desktop';
import si from 'systeminformation';
import clipboard from 'clipboardy';
import { safePath, ensureExists } from './security.js';

const execFileAsync = promisify(execFile);
const isWin = process.platform === 'win32';

export const tools = {
  'system.status': async () => {
    const [load, mem, disks, battery, temp, network, time] = await Promise.all([si.currentLoad(), si.mem(), si.fsSize(), si.battery(), si.cpuTemperature(), si.networkStats(), si.time()]);
    return { hostname: os.hostname(), platform: process.platform, cpuPercent: round(load.currentLoad), memoryPercent: round((mem.active / mem.total) * 100), memoryUsedGb: round(mem.active / 1073741824), memoryTotalGb: round(mem.total / 1073741824), disks: disks.map(d => ({ mount:d.mount, use:d.use, sizeGb:round(d.size/1073741824), availableGb:round(d.available/1073741824) })), battery: battery.hasBattery ? { percent:battery.percent, charging:battery.isCharging } : null, temperatureC: temp.main || null, network: network.map(n => ({ iface:n.iface, downMbps:round(n.rx_sec*8/1e6), upMbps:round(n.tx_sec*8/1e6) })), uptimeHours: round(time.uptime/3600) };
  },
  'process.list': async () => { const p = await si.processes(); return p.list.sort((a,b)=>b.cpu-a.cpu).slice(0,50).map(x=>({pid:x.pid,name:x.name,cpu:round(x.cpu),memory:round(x.mem)})); },
  'process.kill': async ({ name, pid }) => { if (!name && !pid) throw new Error('Process name or pid required'); if (isWin) await execFileAsync('taskkill', pid ? ['/PID',String(pid),'/F'] : ['/IM',String(name),'/F']); else await execFileAsync('pkill', ['-f', String(name || pid)]); return { killed: name || pid }; },
  'app.open': async ({ target }) => { if (!target) throw new Error('Application or target required'); await open(target, { wait:false }); return { opened: target }; },
  'file.list': async ({ path: input='.' }) => { const p=safePath(input); ensureExists(p); const entries=await fs.readdir(p,{withFileTypes:true}); return Promise.all(entries.slice(0,200).map(async e=>{const full=path.join(p,e.name); const st=await fs.stat(full); return {name:e.name,path:full,type:e.isDirectory()?'folder':'file',size:st.size,modifiedAt:st.mtime.toISOString()};})); },
  'file.read': async ({ path: input }) => { const p=safePath(input); ensureExists(p); const st=await fs.stat(p); if(st.size>2_000_000) throw new Error('File exceeds 2 MB read limit'); return {path:p,content:await fs.readFile(p,'utf8')}; },
  'file.write': async ({ path: input, content='' }) => { const p=safePath(input); await fs.mkdir(path.dirname(p),{recursive:true}); await fs.writeFile(p,String(content),'utf8'); return {written:p}; },
  'file.move': async ({ from, to }) => { const a=safePath(from), b=safePath(to); ensureExists(a); await fs.mkdir(path.dirname(b),{recursive:true}); await fs.rename(a,b); return {from:a,to:b}; },
  'file.delete': async ({ path: input }) => { const p=safePath(input); ensureExists(p); await fs.rm(p,{recursive:true,force:false}); return {deleted:p}; },
  'screen.capture': async () => { const dir=path.resolve(process.env.JERVIS_SCREENSHOT_DIR||'./screenshots'); await fs.mkdir(dir,{recursive:true}); const file=path.join(dir,`jervis-${Date.now()}.png`); await screenshot({filename:file}); return {path:file}; },
  'clipboard.read': async () => ({ text: await clipboard.read() }),
  'clipboard.write': async ({ text='' }) => { await clipboard.write(String(text)); return {written:true}; },
  'power.lock': async () => { if(isWin) await execFileAsync('rundll32.exe',['user32.dll,LockWorkStation']); else await execFileAsync('loginctl',['lock-session']); return {locked:true}; },
  'power.shutdown': async () => { if(isWin) await execFileAsync('shutdown',['/s','/t','10']); else await execFileAsync('shutdown',['-h','+1']); return {scheduled:true}; },
  'power.restart': async () => { if(isWin) await execFileAsync('shutdown',['/r','/t','10']); else await execFileAsync('shutdown',['-r','+1']); return {scheduled:true}; },
  'power.sleep': async () => { if(isWin) await execFileAsync('rundll32.exe',['powrprof.dll,SetSuspendState','0,1,0']); else await execFileAsync('systemctl',['suspend']); return {sleeping:true}; },
  'audio.mute': async ({ mute=true }) => { if(!isWin) throw new Error('Audio control currently supports Windows only'); const script=`$w=New-Object -ComObject WScript.Shell; $w.SendKeys([char]173)`; await execFileAsync('powershell.exe',['-NoProfile','-Command',script]); return {toggled:true,requestedMute:mute}; },
  'audio.volume': async ({ percent=50 }) => { if(!isWin) throw new Error('Audio control currently supports Windows only'); const p=Math.max(0,Math.min(100,Number(percent))); const script=`$w=New-Object -ComObject WScript.Shell; 1..50|%{$w.SendKeys([char]174)}; 1..${Math.round(p/2)}|%{$w.SendKeys([char]175)}`; await execFileAsync('powershell.exe',['-NoProfile','-Command',script]); return {percent:p}; }
};
function round(n){return Math.round((Number(n)||0)*100)/100;}
