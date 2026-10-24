import assert from 'node:assert/strict';
import {mkdir,mkdtemp,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {WebSocket} from 'ws';
import {LocalStore} from '../server/storage.js';
import {createHost} from '../server/host.js';
import {initialSave} from '../realm-state.js';
import {levelStart,XP_CURVE} from '../experience.js';
const out=new URL('../outputs/refine136/',import.meta.url);await mkdir(out,{recursive:true});
const catalog=JSON.parse(await readFile(new URL('../maps/world.json',import.meta.url),'utf8')),origins=[],store=await new LocalStore(await mkdtemp(fileURLToPath(new URL('store-',out)))).init(),host=await createHost({mode:'local',store,catalog,origins,serveStatic:true});
await new Promise(r=>host.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+host.server.address().port;origins.push(base);
const {chromium}=await import(pathToFileURL(process.argv[2]).href),browser=await chromium.launch({channel:'msedge',headless:true}),sockets=[],errors=[],checks=[];
try{
 const seed=await store.createLocal({name:'ForgeQA',gender:'male'}),record=store.rows.get(seed.uid),npc=catalog.maps.find(m=>m.id==='ayutthaya').npcs.find(n=>n.name==='ครูแสนดาบ');
 record.character.classId='swordsman';record.xpCurve=XP_CURVE;record.state=initialSave();record.state.position={x:npc.x-1,z:npc.z+.5};record.state.traveler.baseXp=levelStart(99);record.story={v:3,quest:12,step:0,count:0,done:false};
 record.gear={weapon:'sword-iron',head:'hat-headband',armor:'vest-cotton',garment:'cloak-cotton',shoes:'shoes-woven',accessory:'ring-ruby'};record.bag={coins:50000,items:{'iron-ore':50,laterite:50,'lek-lai':5,'break-guard':5}};
 record.daily={day:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),streak:1};
 const context=await browser.newContext({viewport:{width:1440,height:900}});
 await context.route('http://127.0.0.1:8787/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'}));
 await context.routeWebSocket('ws://127.0.0.1:8787/realtime',route=>{const socket=new WebSocket(base.replace('http','ws')+'/realtime',{origin:base}),pending=[];sockets.push(socket);route.onMessage(m=>socket.readyState===1?socket.send(m):pending.push(m));socket.on('open',()=>pending.splice(0).forEach(m=>socket.send(m)));socket.on('message',m=>route.send(m.toString()));socket.on('error',e=>errors.push(e.message));route.onClose(()=>socket.close());socket.on('close',(code,reason)=>route.close({code:code===1006?1000:code,reason:reason.toString()}));});
 await context.addInitScript(({record,token})=>{sessionStorage.setItem('ayothaya-entry-v1',JSON.stringify({owner:'guest',serverId:'server-1',slotId:'slot-1'}));sessionStorage.setItem('ayothaya-local-network:slot-1',JSON.stringify({token,serverId:'server-1',slotId:'slot-1'}));localStorage.setItem('ayothaya-character-v2:slot-1',JSON.stringify(record));localStorage.setItem('ayothaya.lang','th');localStorage.setItem('ayothaya-coach-off','1');localStorage.setItem('ayothaya-perf',JSON.stringify({quality:'low',fps:30}));localStorage.setItem('ayothaya-welcome:ayothaya-story:server-1:slot-1','1');},{record,token:seed.token});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/game.html?server=server-1&map=ayutthaya');await page.waitForFunction(()=>window.__ayothaya&&document.getElementById('online-button')?.dataset.state==='online',null,{timeout:120000});await page.waitForTimeout(700);
 await page.evaluate(()=>{for(const d of document.querySelectorAll('dialog[open]'))d.close();});await page.locator('.npc-label[aria-label="คุยกับ ครูแสนดาบ"]').click();await page.locator('#npc-refine').click();await page.waitForSelector('#refine-window[open]');
 const peer=[...host.realm.peers.values()].find(p=>p.uid===seed.uid);assert.equal(await page.locator('#refine-list [data-slot]').count(),6);
 await page.screenshot({path:fileURLToPath(new URL('forge-ready.png',out))});
 await page.evaluate(()=>{window.forgeTrace=[];new MutationObserver(()=>{const d=document.getElementById('refine-window');window.forgeTrace.push({time:performance.now(),busy:d.getAttribute('aria-busy'),phase:document.getElementById('forge-stage').dataset.phase,result:document.getElementById('refine-result').textContent});}).observe(document.getElementById('refine-window'),{subtree:true,attributes:true,attributeFilter:['aria-busy','data-phase']});});
 for(const slot of Object.keys(record.gear)){
  await page.locator(`#refine-list [data-slot=${slot}]`).click();const before=peer.bag.coins,started=await page.evaluate(()=>performance.now());await page.locator('#refine-go').click();assert.ok(await page.locator('#refine-go').isDisabled());assert.equal(await page.locator('#refine-list button:enabled').count(),0);
  if(slot==='weapon'){await page.waitForTimeout(600);assert.match(await page.locator('#refine-result').textContent(),/กำลังตีบวก/);assert.equal(peer.gear.weapon,'sword-iron+1');assert.equal(await page.locator('[data-slot=weapon] .forge-level').textContent(),'+0');await page.screenshot({path:fileURLToPath(new URL('forge-hammer.png',out))});}
  await page.waitForFunction(()=>document.getElementById('forge-stage').dataset.phase==='success',null,{timeout:12000});const ended=await page.evaluate(()=>performance.now());assert.ok(ended-started>=2050);assert.equal(peer.gear[slot],record.gear[slot]+'+1');assert.equal(peer.bag.coins,before-100);checks.push({slot,success:true,elapsed:Math.round(ended-started)});
 }
 // Force a roll only in this isolated server process to cover actual failure UI.
 const originalRandom=Math.random;try{
  Math.random=()=>.99;peer.gear.head='hat-headband+9';host.realm.refreshStats(peer);await page.waitForFunction(()=>window.__ayothaya.game.world.gear.head==='hat-headband+9');await page.locator('#refine-list [data-slot=head]').click();await page.locator('#refine-guard').check();const guards=peer.bag.items['break-guard'];await page.locator('#refine-go').click();await page.waitForFunction(()=>document.getElementById('forge-stage').dataset.phase==='guarded');assert.equal(peer.gear.head,'hat-headband+9');assert.equal(peer.bag.items['break-guard'],guards-1);await page.screenshot({path:fileURLToPath(new URL('forge-guarded.png',out))});
  await page.locator('#refine-guard').uncheck();await page.locator('#refine-go').click();await page.waitForFunction(()=>document.getElementById('forge-stage').dataset.phase==='broken');assert.equal(peer.gear.head,null);assert.match(await page.locator('#refine-result').textContent(),/ผ้าโพกหัวนักเดินทาง/);await page.screenshot({path:fileURLToPath(new URL('forge-broken.png',out))});
 }finally{Math.random=originalRandom;}
 for(const [width,height] of [[1920,1080],[1440,900],[1024,768],[844,390],[667,375],[568,320],[390,844]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(250);await page.evaluate(()=>{document.getElementById('orientation-gate')?.close();});
  const r=await page.locator('#refine-window').boundingBox();assert.ok(r&&r.x>=-1&&r.y>=-1&&r.x+r.width<=width+1&&r.y+r.height<=height+1,JSON.stringify({width,height,r}));assert.ok(Math.abs(r.x+r.width/2-width/2)<2&&Math.abs(r.y+r.height/2-height/2)<2,JSON.stringify({width,height,r}));
  await page.locator('#refine-list [data-slot=accessory]').scrollIntoViewIfNeeded();await page.locator('#refine-list [data-slot=accessory]').click();assert.equal(await page.locator('#refine-go').isEnabled(),true);
  const clear=await page.locator('#refine-go').evaluate(b=>{const r=b.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return b===hit||b.contains(hit);});assert.ok(clear,'refine button must not be covered');
  if([1440,844,568,390].includes(width))await page.screenshot({path:fileURLToPath(new URL('forge-'+width+'.png',out))});checks.push({width,height,centered:true});
 }
 await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:844,height:390});await page.locator('#refine-go').click();await page.waitForTimeout(600);assert.equal(await page.locator('#forge-actor').evaluate(e=>e.style.backgroundPosition),'0% 0%');await page.locator('#refine-close').click();if(await page.locator('#dock-toggle').getAttribute('aria-expanded')==='true')await page.locator('#dock-toggle').click();await page.waitForFunction(()=>document.getElementById('forge-stage').dataset.phase==='success');await page.locator('.npc-label[aria-label="คุยกับ ครูแสนดาบ"]').click();await page.locator('#npc-refine').click();assert.match(await page.locator('#refine-result').textContent(),/ตีบวกสำเร็จ/);
 assert.deepEqual(errors,[]);const trace=await page.evaluate(()=>window.forgeTrace);await writeFile(new URL('checks.json',out),JSON.stringify({checks,guarded:true,broken:true,reducedMotion:true,trace,errors},null,2));console.log(JSON.stringify({checks:checks.length,guarded:true,broken:true,reducedMotion:true,errors}));await context.close();
}finally{for(const socket of sockets)socket.terminate();await browser.close();await host.close();}process.exit(0);
