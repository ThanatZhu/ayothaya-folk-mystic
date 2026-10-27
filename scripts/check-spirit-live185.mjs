// Production-game integration against an isolated local account/server, never production saves.
import {mkdir,mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {WebSocket} from 'ws';
import {LocalStore} from '../server/storage.js';
import {createHost} from '../server/host.js';
import {initialSave} from '../realm-state.js';
import {XP_CURVE} from '../experience.js';
import {ROLE_MARK} from '../role-skill-progress.js';
import {TREE_MARK,SLOTS} from '../skill-progress.js';
import {walkable,lineClear} from '../combat-core.js';

process.env.DISCORD_WEBHOOK_URL='';
const out=new URL('../outputs/spirit-live185/',import.meta.url);await mkdir(out,{recursive:true});
const catalog=JSON.parse(await readFile(new URL('../maps/world.json',import.meta.url),'utf8'));
const storePath=await mkdtemp(fileURLToPath(new URL('store-',out)));assert.ok(storePath.startsWith(fileURLToPath(out)));const store=await new LocalStore(storePath).init(),origins=[];
const service=await createHost({mode:'local',store,catalog,origins,serveStatic:true});
await new Promise(r=>service.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+service.server.address().port;origins.push(base);
const {chromium}=await import(pathToFileURL(process.argv[2]).href),browser=await chromium.launch({channel:'msedge',headless:true,args:['--explicitly-allowed-ports='+service.server.address().port]}),errors=[],checks=[],contexts=[];
const thaiDay=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
function seed(record,classId='shaman',jobId='spirit-master'){
 record.character={...record.character,classId,jobId};record.xpCurve=XP_CURVE;record.daily={day:thaiDay(),streak:1};record.story={v:3,quest:0,step:0,count:0,done:false};
 record.skills={[TREE_MARK]:Array(SLOTS).fill(0),[ROLE_MARK]:Array(SLOTS).fill(0),[classId]:Array(SLOTS).fill(0)};record.skills[classId][10]=1;
 record.petCollection={balance:400};record.bag={coins:1234,items:{'soul-talisman':1}};
 record.state={...initialSave(),mapId:'rice-fields',position:{...catalog.maps.find(m=>m.id==='rice-fields').spawn}};
 record.state.traveler={...record.state.traveler,baseXp:1000000,jobXp:100000,hp:1000,mp:1000};
}
async function pageFor(session,record,viewport={width:1440,height:900}){
 const context=await browser.newContext({viewport});contexts.push(context);
 await context.route('http://127.0.0.1:8787/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'}));
 await context.routeWebSocket('ws://127.0.0.1:8787/realtime',route=>{
  const socket=new WebSocket(base.replace('http','ws')+'/realtime',{origin:base}),queue=[];
  route.onMessage(m=>socket.readyState===1?socket.send(m):queue.push(m));socket.on('open',()=>queue.splice(0).forEach(m=>socket.send(m)));socket.on('message',m=>route.send(m.toString()));socket.on('error',e=>errors.push('socket '+e.message));route.onClose(()=>socket.close());socket.on('close',(code,reason)=>route.close({code:code===1006?1000:code,reason:reason.toString()}));
 });
 await context.addInitScript(({record,token})=>{
  sessionStorage.setItem('ayothaya-entry-v1',JSON.stringify({owner:'guest',serverId:'server-1',slotId:'slot-1'}));sessionStorage.setItem('ayothaya-local-network:slot-1',JSON.stringify({token,serverId:'server-1',slotId:'slot-1'}));localStorage.setItem('ayothaya-character-v2:slot-1',JSON.stringify(record));localStorage.setItem('ayothaya.lang','th');localStorage.setItem('ayothaya-coach-off','1');localStorage.setItem('ayothaya-perf',JSON.stringify({quality:'low',fps:30}));localStorage.setItem('ayothaya-welcome:ayothaya-story:server-1:slot-1','1');
 },{record,token:session.token});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/Shader Error|VALIDATE_STATUS|Error creating WebGL|THREE.WebGLProgram/.test(m.text()))errors.push(m.text());});
 await page.goto(base+'/game.html?server=server-1&map=rice-fields');
 await page.waitForFunction(()=>window.__ayothaya&&document.getElementById('online-button')?.dataset.state==='online',null,{timeout:120000});
 await page.evaluate(()=>{for(const d of document.querySelectorAll('dialog[open]'))d.close();window.__spiritLiveEvents=[];window.__ayothaya.game.onEvent(e=>{window.__spiritLiveEvents.push({...e,clientTime:window.__ayothaya.game.world.time});if(window.__spiritLiveEvents.length>300)window.__spiritLiveEvents.shift();});});
 await page.waitForFunction(()=>window.__ayothaya.game.roleDecor.spirit?.metrics.ready===true,null,{timeout:30000});return page;
}
const capture=async(page,name)=>page.screenshot({path:fileURLToPath(new URL(name,out))});
const metrics=page=>page.evaluate(()=>({spirit:window.__ayothaya.game.roleDecor.spirit.metrics,decor:window.__ayothaya.game.roleDecor.metrics,player:{...window.__ayothaya.game.world.player},camera:window.__ayothaya.camera.position.toArray()}));
try{
 const owner=await store.createLocal({name:'SpiritOwner',gender:'male'}),observer=await store.createLocal({name:'SpiritObserver',gender:'female'});seed(store.rows.get(owner.uid));seed(store.rows.get(observer.uid));
 const ownerPage=await pageFor(owner,store.rows.get(owner.uid)),observerPage=await pageFor(observer,store.rows.get(observer.uid));
 await ownerPage.waitForTimeout(1200);await observerPage.waitForTimeout(400);
 await Promise.all([ownerPage,observerPage].map(page=>page.evaluate(()=>{for(const d of document.querySelectorAll('dialog[open]'))d.close();})));
 const ownerPeer=[...service.realm.peers.values()].find(p=>p.uid===owner.uid),observerPeer=[...service.realm.peers.values()].find(p=>p.uid===observer.uid);assert.ok(ownerPeer&&observerPeer);assert.equal(ownerPeer.room,observerPeer.room);assert.equal(ownerPeer.world.spiritCompanion,true);
 const w=ownerPeer.world,p=w.player,room=ownerPeer.room,target=room.mobs[0];assert.ok(target);
 const watcherOffset=[[-4,0],[0,-4],[-3,-3]].find(([dx,dz])=>walkable(p.x+dx,p.z+dz,.4,w.nav));assert.ok(watcherOffset);Object.assign(observerPeer.world.player,{x:p.x+watcherOffset[0],z:p.z+watcherOffset[1]});
 for(const m of room.mobs)Object.assign(m,{hp:0,dead:1e7,aggro:false,root:999});
 const offset=[[5,0],[-5,0],[0,-5],[0,5],[4,-3],[-4,-3]].find(([dx,dz])=>walkable(p.x+dx,p.z+dz,.4,w.nav)&&lineClear(p,{x:p.x+dx,z:p.z+dz},w.nav));assert.ok(offset,'an unobstructed nearby target spot exists');
 Object.assign(target,{x:p.x+offset[0],z:p.z+offset[1],home:{x:p.x+offset[0],z:p.z+offset[1]},hp:100000,maxHp:100000,dead:0,attackCD:999,root:999,aggro:false});
 w.targetId=target.id;w.player.mp=w.player.maxMp;w.cooldowns.fill(0);
 const summonIndex=w.skills.findIndex(s=>s.roleSkillId==='sm-lord');assert.equal(summonIndex,10);assert.equal(w.skillLevels[summonIndex],1);
 await ownerPage.evaluate(id=>window.__ayothaya.game.world.select(id),target.id);await ownerPage.waitForTimeout(120);await ownerPage.evaluate(()=>window.__ayothaya.game.world.skill(10));
 await ownerPage.waitForFunction(()=>window.__ayothaya.game.world.rolePetsView?.some(p=>p.kind==='spirit'),null,{timeout:15000});
 await Promise.all([ownerPage,observerPage].map(page=>page.waitForFunction(()=>window.__ayothaya.game.roleDecor.spirit.metrics.hitCount>0,null,{timeout:20000})));
 const first=await metrics(ownerPage),second=await metrics(observerPage);assert.equal(first.spirit.pets,1);assert.equal(second.spirit.pets,1);assert.equal(first.decor.petSlots,0,'the old spirit sprite is absent for the owner');assert.equal(second.decor.petSlots,0,'the old spirit sprite is absent for the observer');assert.ok(first.spirit.shotCount>0&&second.spirit.shotCount>0);assert.ok(first.spirit.hitCount>0&&second.spirit.hitCount>0);
 const sources=await Promise.all([ownerPage,observerPage].map(page=>page.evaluate(()=>window.__spiritLiveEvents.filter(e=>e.type==='damage'&&e.source==='spirit').map(e=>({petId:e.petId,shotId:e.shotId,actor:e.actor,amount:e.amount,synced:e.synced})))));assert.ok(sources.every(a=>a.length&&a[0].petId&&a[0].shotId));checks.push({owner:first,observer:second,sources});
 await Promise.all([ownerPage,observerPage].map(page=>page.waitForFunction(()=>[...document.querySelectorAll('[data-damage-source=spirit]')].some(el=>el.textContent.includes('พราย')),null,{timeout:10000})));
 await capture(ownerPage,'owner-desktop.png');await capture(observerPage,'observer-desktop.png');
 // A direct ordinary hit must not inherit the companion source or attribution.
 w.roleCombat.state.pets=[];w.roleCombat.state.spiritShots=[];w.player.attackCD=0;w.targetId=target.id;target.x=w.player.x+1;target.z=w.player.z;target.root=999;target.hp=100000;
 assert.equal(w.basicAttack(),true);await ownerPage.waitForFunction(()=>window.__spiritLiveEvents.some(e=>e.type==='damage'&&e.source==='basic'),null,{timeout:10000});
 const basic=await ownerPage.evaluate(()=>window.__spiritLiveEvents.findLast(e=>e.type==='damage'&&e.source==='basic'));assert.equal(basic.petId,undefined);assert.equal(basic.shotId,undefined);checks.push({basicSource:basic.source,amount:basic.amount});
 // Re-summon while the real camera rotates; the companion still renders exactly once.
 w.player.attackCD=0;w.cooldowns.fill(0);w.roleCombat.state.pending=null;w.targetId=target.id;w.player.mp=w.player.maxMp;assert.equal(w.skill(summonIndex),true);
 await ownerPage.waitForFunction(old=>window.__ayothaya.game.world.rolePetsView.some(p=>p.kind==='spirit'&&p.id!==old),sources[0][0].petId,{timeout:10000});
 await ownerPage.waitForFunction(()=>window.__ayothaya.game.roleDecor.spirit.metrics.pets===1,null,{timeout:10000});
 const before=await ownerPage.evaluate(()=>window.__ayothaya.camera.position.toArray());
 await ownerPage.evaluate(()=>{const a=window.__ayothaya,p=a.game.world.player,c=a.camera,dx=c.position.x-p.x,dz=c.position.z-p.z,angle=.65;c.position.x=p.x+dx*Math.cos(angle)-dz*Math.sin(angle);c.position.z=p.z+dx*Math.sin(angle)+dz*Math.cos(angle);c.lookAt(p.x,1,p.z);c.updateMatrixWorld();});await ownerPage.waitForTimeout(300);
 const after=await ownerPage.evaluate(()=>window.__ayothaya.camera.position.toArray());assert.ok(Math.hypot(after[0]-before[0],after[2]-before[2])>1);await capture(ownerPage,'camera-rotated.png');checks.push({cameraBefore:before,cameraAfter:after,spirit:(await metrics(ownerPage)).spirit});
 for(const [width,height] of [[1440,900],[1024,768],[844,390],[667,375],[390,844],[320,568]]){
  await ownerPage.setViewportSize({width,height});await ownerPage.waitForTimeout(220);await ownerPage.evaluate(()=>document.getElementById('orientation-gate')?.close());
  const view=await metrics(ownerPage);assert.equal(view.spirit.pets,1);assert.ok(view.spirit.ready);const fit=await ownerPage.evaluate(()=>({w:innerWidth,h:innerHeight,sw:document.documentElement.scrollWidth,sh:document.documentElement.scrollHeight}));assert.ok(fit.sw<=width&&fit.sh<=height,JSON.stringify(fit));checks.push({width,height,fit,spirit:view.spirit});await capture(ownerPage,'live-'+width+'.png');
 }
 // The merged death dialog still consumes an item and purchases one with exactly 200 bars.
 await ownerPage.setViewportSize({width:1440,height:900});w.player.hp=0;w.fall();await ownerPage.locator('#role-down-panel').waitFor({state:'visible'});await ownerPage.locator('[data-respawn=here]').click();await ownerPage.waitForFunction(()=>!document.getElementById('role-down-panel').open);assert.equal(ownerPeer.bag.items['soul-talisman'],undefined);assert.ok(w.player.hp>0);
 w.player.hp=0;w.fall();await ownerPage.locator('#role-down-panel').waitFor({state:'visible'});assert.equal(await ownerPage.locator('[data-respawn=here]').isDisabled(),true);await ownerPage.locator('.death-buy').click();await ownerPage.waitForFunction(()=>document.querySelector('.death-feedback')?.textContent.includes('หัก 200'));assert.equal(ownerPeer.petCollection.balance,200);assert.equal(ownerPeer.bag.items['soul-talisman'],1);assert.equal(w.player.hp,0);checks.push({deathAndPurchase:true,gold:ownerPeer.petCollection.balance,talismans:ownerPeer.bag.items['soul-talisman']});
 assert.deepEqual(errors,[]);await writeFile(new URL('checks.json',out),JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({passed:true,checks:checks.length,errors}));
}catch(error){
 const pages=contexts.flatMap(c=>c.pages()),state=[];for(const [i,page] of pages.entries()){try{await capture(page,'failure-'+i+'.png');state.push(await page.evaluate(()=>({url:location.href,online:document.getElementById('online-button')?.dataset.state,world:window.__ayothaya?{classId:window.__ayothaya.game.world.profession.id,jobId:window.__ayothaya.game.world.jobId,skillLevels:window.__ayothaya.game.world.skillLevels,pets:window.__ayothaya.game.world.rolePetsView,spirit:window.__ayothaya.game.roleDecor.spirit?.metrics,events:window.__spiritLiveEvents}:null})));}catch(e){state.push({error:e.message});}}
 await writeFile(new URL('failure.json',out),JSON.stringify({error:error.stack,errors,checks,state},null,2));throw error;
}
finally{for(const context of contexts)await context.close();await browser.close();await service.close();await rm(storePath,{recursive:true,force:true});}
