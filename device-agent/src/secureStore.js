import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { execFileSync } from 'child_process';
const dir=path.join(process.env.PROGRAMDATA||path.join(os.homedir(),'.jervis'),'JERVIS');
const file=path.join(dir,'device.dat');
function ps(script,args=[]){return execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',script,...args],{encoding:'utf8'}).trim();}
export function saveSecureConfig(config){fs.mkdirSync(dir,{recursive:true});const json=JSON.stringify(config);if(process.platform==='win32'){const script=`$b=[Text.Encoding]::UTF8.GetBytes($args[0]);$e=[Security.Cryptography.ProtectedData]::Protect($b,$null,[Security.Cryptography.DataProtectionScope]::LocalMachine);[Convert]::ToBase64String($e)`;fs.writeFileSync(file,ps(script,[json]),{mode:0o600});}else{const keyFile=path.join(dir,'.key');if(!fs.existsSync(keyFile))fs.writeFileSync(keyFile,crypto.randomBytes(32),{mode:0o600});const key=fs.readFileSync(keyFile),iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',key,iv);const enc=Buffer.concat([cipher.update(json),cipher.final()]);fs.writeFileSync(file,Buffer.concat([iv,cipher.getAuthTag(),enc]).toString('base64'),{mode:0o600});}return file;}
export function loadSecureConfig(){if(!fs.existsSync(file))return null;const raw=fs.readFileSync(file,'utf8');if(process.platform==='win32'){const script=`$e=[Convert]::FromBase64String($args[0]);$b=[Security.Cryptography.ProtectedData]::Unprotect($e,$null,[Security.Cryptography.DataProtectionScope]::LocalMachine);[Text.Encoding]::UTF8.GetString($b)`;return JSON.parse(ps(script,[raw]));}const key=fs.readFileSync(path.join(dir,'.key')),buf=Buffer.from(raw,'base64'),iv=buf.subarray(0,12),tag=buf.subarray(12,28),dec=crypto.createDecipheriv('aes-256-gcm',key,iv);dec.setAuthTag(tag);return JSON.parse(Buffer.concat([dec.update(buf.subarray(28)),dec.final()]).toString());}
export const secureConfigPath=file;
