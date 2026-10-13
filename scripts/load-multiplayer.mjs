// Loopback smoke-load only; not a production capacity guarantee or a long soak.
import {WebSocket} from 'ws';
import {readFile,mkdir,mkdtemp,rm} from 'node:fs/promises';
import path from 'node:path';
import {LocalStore} from '../server/storage.js';
import {createHost} from '../server/host.js';
const root=path.resolve('.local-multiplayer');await mkdir(root,{recursive:true});const directory=await mkdtemp(path.join(root,'load-'));
const count=50,origin='http://127.0.0.1:8870',catalog=JSON.parse(await readFile(new URL('../maps/world.json',import.meta.url),'utf8')),store=await new LocalStore(directory).init(),host=await createHost({mode:'local',store,catalog,capacity:count,origins:[origin]}),clients=[],rtts=[];
let bytes=0,snapshots=0,timer;
try{
 await new Promise(r=>host.server.listen(0,'127.0.0.1',r));const port=host.server.address().port;
 for(let i=0;i<count;i++){
  const identity=await store.createLocal({name:'load-'+String(i).padStart(3,'0')}),socket=new WebSocket(`ws://127.0.0.1:${port}/realtime`,{origin}),client={socket,seq:0};clients.push(client);
  await new Promise((resolve,reject)=>{socket.on('error',reject);socket.on('message',raw=>{bytes+=raw.length;const m=JSON.parse(raw);if(m.type==='welcome')resolve();if(m.type==='snapshot')snapshots++;if(m.type==='pong')rtts.push(performance.now()-m.stamp);});socket.on('open',()=>socket.send(JSON.stringify({type:'join',token:identity.token,slotId:'slot-1',serverId:'server-1'})));});
 }
 bytes=0;snapshots=0;const start=performance.now();let tick=0;
 timer=setInterval(()=>{tick++;clients.forEach((c,i)=>{c.socket.send(JSON.stringify({type:'input',seq:++c.seq,x:Math.sin(i+tick/10),z:Math.cos(i+tick/10),attack:false}));if(tick%10===0)c.socket.send(JSON.stringify({type:'ping',seq:++c.seq,stamp:performance.now()}));});},100);
 await new Promise(r=>setTimeout(r,3000));clearInterval(timer);const seconds=(performance.now()-start)/1000;rtts.sort((a,b)=>a-b);
 console.log(JSON.stringify({clients:count,seconds:Number(seconds.toFixed(2)),snapshots,receivedMiB:Number((bytes/1048576).toFixed(2)),perClientKiBps:Number((bytes/count/seconds/1024).toFixed(1)),roundTripP95ms:Number((rtts[Math.floor(rtts.length*.95)]??0).toFixed(1)),note:'Loopback, 3-second smoke test, local auth. Not cloud/mobile/soak capacity.'},null,2));
}finally{clearInterval(timer);for(const c of clients)c.socket.terminate();await host.close();if(!path.resolve(directory).startsWith(root+path.sep))throw new Error('unsafe-cleanup');await rm(directory,{recursive:true,force:true});}
