import path from 'path';import { fileURLToPath } from 'url';import { Service } from 'node-windows';
const here=path.dirname(fileURLToPath(import.meta.url));const svc=new Service({name:'JERVIS Device Agent',script:path.join(here,'index.js')});svc.on('uninstall',()=>console.log('JERVIS Device Agent removed.'));svc.on('error',console.error);svc.uninstall();
