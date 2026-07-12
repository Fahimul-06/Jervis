import 'dotenv/config';
import os from 'os';
const server=(process.env.JERVIS_SERVER_URL||'http://localhost:5000').replace(/\/$/,'');
const response=await fetch(`${server}/api/devices/pair`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:os.hostname(),platform:process.platform,deviceType:'computer'})});
if(!response.ok) throw new Error(await response.text());
const data=await response.json();
console.log('\nAdd these values to device-agent/.env:\n');
console.log(`JERVIS_SERVER_URL=${server}`); console.log(`JERVIS_DEVICE_ID=${data.deviceId}`); console.log(`JERVIS_PAIRING_TOKEN=${data.pairingToken}`);
