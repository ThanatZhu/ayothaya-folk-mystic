import assert from 'node:assert/strict';
import {mkdir,mkdtemp,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {WebSocket} from 'ws';
import {LocalStore} from '../server/storage.js';
import {createHost} from '../server/host.js';
const out=new URL('../outputs/movement146/browser/',import.meta.url);await mkdir(out,{recursive:true});
const catalog=JSON.parse(await readFile(new URL('../maps/world.json',import.meta.url),'utf8'));catalog.maps.find(m=>m.id==='ayutthaya').citizens=[];
const origins=[],store=await new LocalStore(await mkdtemp(fileURLToPath(new URL('store-',out)))).init(),host=await createHost({mode:'local',store,catalog,origins,serveStatic:true});
await new Promise(r=>host.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+host.server.address().port;origins.push(base);
const {chromium}=await import(pathToFileURL(process.argv[2]).href),browser=await chromium.launch({channel:'msedge',headless:true}),errors=[],checks=[],sockets=[],timers=new Set();
const later=(fn,ms)=>{const timer=setTimeout(()=>{timers.delete(timer);fn();},ms);timers.add(timer);};
try{
 for(const lag of [60,180]){
  const session=await store.createLocal({name:'MovementQA'+lag,gender:'male'}),record=store.rows.get(session.uid);record.character.classId='shaman';record.daily={day:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),streak:1};
  const context=await browser.newContext({viewport:{width:1280,height:720}}),packets=[];
  await context.route('http://127.0.0.1:8787/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'}));
  await context.routeWebSocket('ws://127.0.0.1:8787/realtime',route=>{
   const socket=new WebSocket(base.replace('http','ws')+'/realtime',{origin:base}),pending=[];sockets.push(socket);let closed=false;
   route.onMessage(raw=>{packets.push(JSON.parse(raw));later(()=>{if(closed)return;socket.readyState===1?socket.send(raw):pending.push(raw);},lag);});
   socket.on('open',()=>pending.splice(0).forEach(raw=>socket.send(raw)));socket.on('message',raw=>later(()=>{if(!closed)route.send(raw.toString());},lag));
   route.onClose(()=>{closed=true;socket.close();});socket.on('error',e=>{if(!closed)errors.push(e.message);});
  });
  await context.addInitScript(({record,token})=>{sessionStorage.setItem('ayothaya-entry-v1',JSON.stringify({owner:'guest',serverId:'server-1',slotId:'slot-1'}));sessionStorage.setItem('ayothaya-local-network:slot-1',JSON.stringify({token,serverId:'server-1',slotId:'slot-1'}));localStorage.setItem('ayothaya-character-v2:slot-1',JSON.stringify(record));localStorage.setItem('ayothaya.lang','th');localStorage.setItem('ayothaya-coach-off','1');localStorage.setItem('ayothaya-perf',JSON.stringify({quality:'low',fps:60}));localStorage.setItem('ayothaya-welcome:ayothaya-story:server-1:slot-1','1');},{record,token:session.token});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/game.html?server=server-1&map=ayutthaya');await page.waitForFunction(()=>window.__ayothaya?.game.actionBar&&document.getElementById('online-button')?.dataset.state==='online',null,{timeout:90000});
  await page.evaluate(()=>{for(const d of document.querySelectorAll('dialog[open]'))d.close();if(document.getElementById('dock-toggle').getAttribute('aria-expanded')==='true')document.getElementById('dock-toggle').click();document.activeElement?.blur();window.__movementTrace=[];window.__movementStage='ready';const loop=()=>{const {game,scene}=window.__ayothaya,p=game.world.player;let avatar=window.__movementAvatar;if(!avatar){scene.traverse(n=>{if(n.userData.rigType==='painted-frames'&&Math.hypot(n.position.x-p.x,n.position.z-p.z)<.3)avatar=n;});window.__movementAvatar=avatar;}window.__movementTrace.push({at:performance.now(),stage:window.__movementStage,x:p.x,z:p.z,moving:p.moving,action:avatar?.userData.lifeAction??null,frame:avatar?.userData.lifeFrame??null});if(window.__movementTrace.length<5000)requestAnimationFrame(loop);};requestAnimationFrame(loop);});
  await page.waitForTimeout(600);
  for(const [key,duration] of [['d',800],['a',800],['d',90]]){
   await page.evaluate(()=>window.__movementStage='walking');await page.keyboard.down(key);await page.waitForTimeout(duration);await page.keyboard.up(key);const released=await page.evaluate(()=>{window.__movementStage='released';return performance.now();});await page.waitForTimeout(1500);
   const trace=await page.evaluate(at=>window.__movementTrace.filter(s=>s.at>at+100&&s.stage==='released'),released);assert.ok(trace.length>4);assert.ok(trace.every(s=>!s.moving),'release must not restart walking '+JSON.stringify({lag,key,trace}));assert.ok(trace.every(s=>s.action!=='walk'&&s.action!=='run'),'the rendered avatar remains idle after release');
   const peer=[...host.realm.peers.values()].find(p=>p.uid===session.uid),player=await page.evaluate(()=>({x:window.__ayothaya.game.world.player.x,z:window.__ayothaya.game.world.player.z}));assert.ok(Math.hypot(player.x-peer.world.player.x,player.z-peer.world.player.z)<.04,'idle reconciliation reaches authority');assert.ok(Number.isSafeInteger(host.realm.snapshot(peer).self.inputAck));checks.push({lag,key,duration,idleFrames:trace.length,authorityAck:peer.appliedInputSeq});
  }
  await page.evaluate(()=>{window.__movementStage='route';const game=window.__ayothaya.game,p=game.world.player;game.walkTo({x:p.x+1.2,z:p.z});});await page.waitForFunction(()=>!window.__ayothaya.game.walking,null,{timeout:10000});const arrived=await page.evaluate(()=>{window.__movementStage='arrived';return performance.now();});await page.waitForTimeout(1500);
  const routeTrace=await page.evaluate(at=>window.__movementTrace.filter(s=>s.at>at+100&&s.stage==='arrived'),arrived);assert.ok(routeTrace.length>4&&routeTrace.every(s=>!s.moving),'click-walk arrival stays stopped');
  await page.screenshot({path:fileURLToPath(new URL('stopped-'+lag+'ms.png',out))});await writeFile(new URL('trace-'+lag+'ms.json',out),JSON.stringify(await page.evaluate(()=>window.__movementTrace)));checks.push({lag,routeArrival:true,idleFrames:routeTrace.length});console.log('PASS',lag,'ms each way: keyboard, rapid tap, click-walk stop, idle art, authority agreement');await context.close();
 }
 assert.deepEqual(errors,[]);await writeFile(new URL('checks.json',out),JSON.stringify({checks,errors},null,2));
}finally{for(const timer of timers)clearTimeout(timer);for(const socket of sockets)socket.terminate();await browser.close();await host.close();}
process.exit(0);
