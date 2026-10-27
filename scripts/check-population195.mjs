import assert from 'node:assert/strict';
import {MARKET_ZONE} from '../market-board.js';
import {mkdir,mkdtemp,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {WebSocket} from 'ws';
import {LocalStore} from '../server/storage.js';
import {createHost} from '../server/host.js';
import {STORY} from '../story-quests.js';
import {ITEMS} from '../items.js';
import {initialSave} from '../realm-state.js';
import {levelStart,XP_CURVE} from '../experience.js';
const out=new URL('../outputs/population195/',import.meta.url);await mkdir(out,{recursive:true});
const catalog=JSON.parse(await readFile(new URL('../maps/world.json',import.meta.url),'utf8')),origins=[],store=await new LocalStore(await mkdtemp(fileURLToPath(new URL('store-',out)))).init(),host=await createHost({mode:'local',store,catalog,origins,serveStatic:true});
await new Promise(r=>host.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+host.server.address().port;origins.push(base);
const {chromium}=await import('file:///C:/Users/WIN%2011%20PRO/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'),browser=await chromium.launch({channel:'msedge',headless:true,args:['--explicitly-allowed-ports='+host.server.address().port]}),sockets=[],errors=[],checks=[],commands=[];
try{
 const seed=await store.createLocal({name:'StoryQA',gender:'female'}),record=store.rows.get(seed.uid),npc=catalog.maps.find(m=>m.id==='ayutthaya').npcs.find(n=>n.name==='ครูแสนดาบ');
 record.character.classId='swordsman';record.character.appearance={outfit:'crimson',hair:'original',hairColor:'original',eyes:'original',beard:'none',tattoo:'none',garment:'original'};record.xpCurve=XP_CURVE;record.state=initialSave();record.state.mapId='ayutthaya';record.state.position={x:npc.x,z:npc.z+1};record.state.traveler.baseXp=levelStart(99);record.story={v:4,quest:STORY.findIndex(q=>q.id==='t17-craft'),step:0,count:0,done:false};
 record.gear={weapon:'weapon-swordsman-one',head:null,armor:null,garment:null,shoes:null,accessory:null};record.bag={coins:1000000,slots:100,items:{'weapon-fragment-rice':500,'iron-ore':500,'lek-lai':100}};
 record.stats={str:10,agi:1,vit:2,int:1,dex:1,luk:1};record.rebirth=2;record.petCollection={balance:500};record.bag.items['stat-reset-scroll']=1;
 record.daily={day:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),streak:1};
 async function launch(mobile=false,lang='th',source=seed,save=record,dpr=1){
 const context=await browser.newContext({viewport:{width:mobile?844:1440,height:mobile?390:900},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:dpr});
 await context.grantPermissions(['local-network-access'],{origin:base});
 await context.route('**/maps/world.json*',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(catalog)}));
 await context.route('http://127.0.0.1:8787/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'}));
 await context.routeWebSocket('ws://127.0.0.1:8787/realtime',route=>{const socket=new WebSocket(base.replace('http','ws')+'/realtime',{origin:base}),pending=[];sockets.push(socket);route.onMessage(m=>{commands.push(JSON.parse(m));socket.readyState===1?socket.send(m):pending.push(m);});socket.on('open',()=>pending.splice(0).forEach(m=>socket.send(m)));socket.on('message',m=>route.send(m.toString()));socket.on('error',e=>errors.push(e.message));route.onClose(()=>socket.close());socket.on('close',(code,reason)=>route.close({code:code===1006?1000:code,reason:reason.toString()}));});
 await context.addInitScript(({record,token,lang})=>{sessionStorage.setItem('ayothaya-entry-v1',JSON.stringify({owner:'guest',serverId:'server-1',slotId:'slot-1'}));sessionStorage.setItem('ayothaya-local-network:slot-1',JSON.stringify({token,serverId:'server-1',slotId:'slot-1'}));localStorage.setItem('ayothaya-character-v2:slot-1',JSON.stringify(record));localStorage.setItem('ayothaya.lang',lang);localStorage.setItem('ayothaya-coach-off','1');localStorage.setItem('ayothaya-cinematic155:server-1:slot-1',JSON.stringify(Array.from({length:24},(_,q)=>Array.from({length:8},(_,s)=>'story:t'+q+':'+s)).flat()));localStorage.setItem('ayothaya-perf',JSON.stringify({quality:'low',fps:30}));localStorage.setItem('ayothaya-welcome:ayothaya-story:server-1:slot-1','1');},{record:save,token:source.token,lang});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/game.html?server=server-1&map='+save.state.mapId);await page.waitForFunction(()=>window.__ayothaya&&document.getElementById('online-button')?.dataset.state==='online',null,{timeout:120000});await page.waitForTimeout(700);
 await page.evaluate(()=>{for(const d of document.querySelectorAll('dialog[open]'))d.close();});
 if(await page.locator('#dock-toggle').getAttribute('aria-expanded')==='true'&&mobile)await page.locator('#dock-toggle').click();
 return {context,page};}





 

 for(const [mapId,mobile] of [['rice-fields',false],['ayutthaya',true],['lablae',true]]){
 const session=await store.createLocal({name:'Pop'+mapId.replaceAll('-',''),gender:'male'}),save=store.rows.get(session.uid),map=catalog.maps.find(m=>m.id===mapId);
 save.state=initialSave();save.state.mapId=mapId;save.state.position={...map.spawn};save.xpCurve=XP_CURVE;save.daily={day:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),streak:1};
 const {context,page}=await launch(mobile,'th',session,save);
 const state=await page.evaluate(()=>{const v=window.__ayothaya,ids=new Set(),teachers=new Set();v.scene.traverse(o=>{if(o.userData.citizenId)ids.add(o.userData.citizenId);if(o.userData.npc?.mentorId)teachers.add(o.userData.npc.mentorId);});return {map:v.map.id,online:v.game.online,mobs:v.game.world.mobs.length,citizens:[...ids].sort(),teachers:teachers.size,drawCalls:v.renderer.info.render.calls};});
 const peer=[...host.realm.peers.values()].find(p=>p.uid===session.uid);assert.equal(state.map,mapId);assert.equal(state.mobs,peer.room.mobs.length);assert.ok(state.online);assert.ok(state.drawCalls>0);
 if(mapId==='rice-fields')assert.equal(state.mobs,119);
 else {assert.equal(state.mobs,0);assert.deepEqual(state.citizens,map.citizens.map(c=>c.id).sort());assert.equal(state.citizens.length,mapId==='ayutthaya'?16:12);if(mapId==='ayutthaya')assert.equal(state.teachers,8);}
 checks.push({map:mapId,mobile,...state});console.log(JSON.stringify(checks.at(-1)));await page.screenshot({path:fileURLToPath(new URL(mapId+'-'+(mobile?'mobile':'desktop')+'.png',out))});await context.close();await new Promise(r=>setTimeout(r,300));
 }
 assert.deepEqual(errors,[]);await writeFile(new URL('validation.json',out),JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks,errors},null,2));
}finally{for(const s of sockets)s.terminate();await browser.close();await host.close();}
