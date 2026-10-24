import assert from 'node:assert/strict';
import {JOBS} from '../advancement.js';
import {standardCombatLayout} from '../mobile-combat-layout.js';
import {composeMail,deliverMail,publicInbox} from '../mailbox.js';
import {mkdir,mkdtemp,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {WebSocket} from 'ws';
import {LocalStore} from '../server/storage.js';
import {createHost} from '../server/host.js';
import {STORY} from '../story-quests.js';
import {ITEMS} from '../items.js';
import {initialSave} from '../realm-state.js';
import {levelStart,XP_CURVE} from '../experience.js';
const out=new URL('../outputs/combat151/',import.meta.url);await mkdir(out,{recursive:true});
const catalog=JSON.parse(await readFile(new URL('../maps/world.json',import.meta.url),'utf8')),origins=[],store=await new LocalStore(await mkdtemp(fileURLToPath(new URL('store-',out)))).init(),host=await createHost({mode:'local',store,catalog,origins,serveStatic:true});
await new Promise(r=>host.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+host.server.address().port;origins.push(base);
const {chromium}=await import(pathToFileURL(process.argv[2]).href),browser=await chromium.launch({channel:'msedge',headless:true}),sockets=[],errors=[],checks=[],commands=[];
try{
 catalog.maps.find(m=>m.id==='ayutthaya').citizens=[]; // Isolate input checks from randomly wandering passers-by.
 const seed=await store.createLocal({name:'TalkQA',gender:'male'}),record=store.rows.get(seed.uid),npc=catalog.maps.find(m=>m.id==='ayutthaya').npcs.find(n=>n.name==='ครูแสนดาบ');
 record.character.classId='swordsman';record.xpCurve=XP_CURVE;record.state=initialSave();record.state.mapId='rice-fields';record.state.position={...catalog.maps.find(m=>m.id==='rice-fields').spawn};record.state.traveler.baseXp=levelStart(99);record.story={v:3,quest:STORY.length,step:0,count:0,done:true};
 record.gear={weapon:'sword-iron',head:'hat-headband',armor:'vest-cotton',garment:'cloak-cotton',shoes:'shoes-woven',accessory:'ring-ruby'};record.bag={coins:50000,slots:100,items:{...Object.fromEntries(Object.keys(ITEMS).slice(0,80).map(id=>[id,2])),'hp-small':8,'mp-small':8,'iron-ore':50}};
 record.daily={day:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),streak:1};
 async function launch(mobile=false,lang='th',source=seed,save=record,dpr=3){
 const context=await browser.newContext({viewport:{width:mobile?844:1440,height:mobile?390:900},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:dpr});
 await context.route('**/maps/world.json*',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(catalog)}));
 await context.route('http://127.0.0.1:8787/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'}));
 await context.routeWebSocket('ws://127.0.0.1:8787/realtime',route=>{const socket=new WebSocket(base.replace('http','ws')+'/realtime',{origin:base}),pending=[];sockets.push(socket);route.onMessage(m=>{commands.push(JSON.parse(m));socket.readyState===1?socket.send(m):pending.push(m);});socket.on('open',()=>pending.splice(0).forEach(m=>socket.send(m)));socket.on('message',m=>route.send(m.toString()));socket.on('error',e=>errors.push(e.message));route.onClose(()=>socket.close());socket.on('close',(code,reason)=>route.close({code:code===1006?1000:code,reason:reason.toString()}));});
 await context.addInitScript(({record,token,lang})=>{sessionStorage.setItem('ayothaya-entry-v1',JSON.stringify({owner:'guest',serverId:'server-1',slotId:'slot-1'}));sessionStorage.setItem('ayothaya-local-network:slot-1',JSON.stringify({token,serverId:'server-1',slotId:'slot-1'}));localStorage.setItem('ayothaya-character-v2:slot-1',JSON.stringify(record));localStorage.setItem('ayothaya.lang',lang);localStorage.setItem('ayothaya-coach-off','1');localStorage.setItem('ayothaya-perf',JSON.stringify({quality:'low',fps:30}));localStorage.setItem('ayothaya-welcome:ayothaya-story:server-1:slot-1','1');},{record:save,token:source.token,lang});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/game.html?server=server-1&map=rice-fields');await page.waitForFunction(()=>window.__ayothaya&&document.getElementById('online-button')?.dataset.state==='online',null,{timeout:120000});await page.waitForTimeout(700);
 await page.evaluate(()=>{for(const d of document.querySelectorAll('dialog[open]'))d.close();});
 if(await page.locator('#dock-toggle').getAttribute('aria-expanded')==='true'&&mobile)await page.locator('#dock-toggle').click();
 return {context,page};}

 const classes=['novice','swordsman','lancer','hunter','boxer','rogue','shaman','acolyte'];let context,page;
 const near=(a,b,label)=>assert.ok(Math.abs(a-b)<1.1,label+' '+a+' != '+b);
 async function geometry(){return page.evaluate(()=>{
  const slots=[...document.querySelectorAll('#skills .skill:not([hidden]):not([data-mobile-away])')],rows=slots.map((n,i)=>({id:'skill-'+(i+1),rect:n.getBoundingClientRect().toJSON(),hit:n.querySelector('.mobile-combat-hit')?.getBoundingClientRect().toJSON()}));
  for(const [id,selector]of [['attack','#attack'],['swap','#skill-bank'],['target','#mobile-target-next']])rows.push({id,rect:document.querySelector(selector).getBoundingClientRect().toJSON(),hit:document.querySelector(selector+' .mobile-combat-hit')?.getBoundingClientRect().toJSON()});return rows;
 });}
 async function match(){const viewport=await page.evaluate(()=>({width:innerWidth,height:Math.min(innerHeight,document.getElementById('game-shell').getBoundingClientRect().height)})),expected=standardCombatLayout(viewport).controls,rows=await geometry();
  for(const {id,hit}of rows)assert.ok(hit&&hit.width>=43.99&&hit.height>=43.99,id+' hit area');for(const {id,rect}of rows)for(const field of ['x','y','width','height'])near(rect[field],expected[id][field],id+' '+field);return rows;}
 async function tap(selector){const n=page.locator(selector);await n.waitFor({state:'visible'});const r=await n.boundingBox();assert.ok(await n.evaluate(n=>{const r=n.getBoundingClientRect(),h=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return h===n||n.contains(h);}),selector+' is covered');await page.touchscreen.tap(r.x+r.width/2,r.y+r.height/2);await page.waitForTimeout(90);}
 const prefs={v:1,landscape:{'skill-1':{x:.1,y:.1},'skill-2':{x:.2,y:.2},attack:{x:.3,y:.3},swap:{x:.4,y:.4},target:{x:.5,y:.5},auto:{x:.62,y:.71},joystick:{x:.17,y:.78}},portrait:{'skill-4':{x:.2,y:.2},joystick:{x:.19,y:.8}}};
 for(const classId of classes){
  const source=await store.createLocal({name:'Layout'+classId,gender:'male'}),save=store.rows.get(source.uid);save.character.classId=classId;save.character.jobId=JOBS[classId]?.[0]?.id??'';save.state=structuredClone(record.state);save.xpCurve=XP_CURVE;save.story=record.story;save.skills={_tree84:Array(15).fill(0),_roles116:Array(15).fill(0),[classId]:Array(15).fill(10)};save.daily=record.daily;
  ({context,page}=await launch(true,'th',source,save));const peer=[...host.realm.peers.values()].find(p=>p.uid===source.uid);peer.world.player.hp=peer.world.player.maxHp=1000000;
  await page.setViewportSize({width:932,height:430});await page.waitForTimeout(200);await match();
  const first=await page.locator('#skill-bank').getAttribute('aria-label');let switched=0;
  do{await tap('#skill-bank');await match();switched++;assert.ok(switched<=5);}while((await page.locator('#skill-bank').getAttribute('aria-label'))!==first);
  checks.push(classId+' uses the same four positions through all '+switched+' base/master pages');
  if(classId==='shaman'){
   // Apply pre-release preferences and reload: combat positions must migrate, AUTO/joystick must survive.
   await page.evaluate(p=>localStorage.setItem('ayothaya-mobile-hud-v1',JSON.stringify(p)),prefs);await page.reload();await page.waitForFunction(()=>window.__ayothaya&&document.getElementById('online-button')?.dataset.state==='online');await page.waitForTimeout(700);await page.evaluate(()=>{for(const d of document.querySelectorAll('dialog[open]'))d.close();});await match();
   const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('ayothaya-mobile-hud-v1')));assert.deepEqual(saved.landscape,{auto:prefs.landscape.auto,joystick:prefs.landscape.joystick});assert.deepEqual(saved.portrait,{joystick:prefs.portrait.joystick});
   for(const [width,height]of [[932,430],[844,390],[667,375],[568,320],[960,432],[1024,768],[390,844]]){
    await page.setViewportSize({width,height});await page.waitForTimeout(200);await match();if(height<width){await tap('#skill-bank');await match();const skill='#skills .skill:not([hidden]):not([data-mobile-away])';await page.locator(skill).first().evaluate(n=>n.addEventListener('click',e=>{e.stopImmediatePropagation();window.__skillHit=(window.__skillHit??0)+1;},{once:true,capture:true}));const n=await page.locator(skill).first().boundingBox();const before=await page.evaluate(()=>window.__skillHit??0);await page.touchscreen.tap(n.x+n.width/2,n.y+n.height/2);assert.equal(await page.evaluate(()=>window.__skillHit),before+1);}await page.screenshot({path:fileURLToPath(new URL('layout-'+width+'.png',out))});
   }
   await page.setViewportSize({width:932,height:430});await page.waitForTimeout(200);await page.evaluate(()=>{for(const d of document.querySelectorAll('dialog[open]'))d.close();dispatchEvent(new CustomEvent('open-mobile-hud-editor'));});await page.locator('#mobile-hud-editor:not([hidden])').waitFor();
   assert.deepEqual((await page.locator('.hud-layout-handle').evaluateAll(ns=>ns.map(n=>n.dataset.control))).sort(),['auto','joystick']);await tap('[data-layout=cancel]');await match();
   const order=await page.evaluate(()=>window.__ayothaya.game.hotbar);await page.evaluate(()=>window.__ayothaya.game.setHotbar([...window.__ayothaya.game.hotbar].reverse()));await page.waitForTimeout(150);await match();await page.evaluate(order=>window.__ayothaya.game.setHotbar(order),order);await page.waitForTimeout(100);await match();
   checks.push('Old combat preferences migrate while AUTO/joystick survive; seven viewport sizes, editor and reversed hotbar retain the template');
  }
  await context.close();
 }
 ({context,page}=await launch(true,'th',seed,record,1));await page.setViewportSize({width:932,height:430});await page.waitForTimeout(200);await match();await context.close();checks.push('DPR 1 and DPR 3 share identical logical button positions');
 ({context,page}=await launch(false));assert.equal(await page.evaluate(()=>document.body.classList.contains('mobile-play')),false);assert.equal(await page.locator('#attack').evaluate(n=>n.style.getPropertyPriority('position')),'');await page.screenshot({path:fileURLToPath(new URL('desktop-unchanged.png',out))});await context.close();checks.push('Desktop layout receives no combat overrides');
 assert.deepEqual(errors,[]);await writeFile(new URL('checks.json',out),JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks,errors}));
}finally{for(const socket of sockets)socket.terminate();await browser.close();await host.close();}process.exit(0);
