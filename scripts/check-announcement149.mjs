import assert from 'node:assert/strict';
import {mkdir,mkdtemp,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {WebSocket} from 'ws';
import {LocalStore} from '../server/storage.js';
import {createHost} from '../server/host.js';
import {STORY} from '../story-quests.js';
import {ITEMS} from '../items.js';
import {initialSave} from '../realm-state.js';
import {levelStart,XP_CURVE} from '../experience.js';
const out=new URL('../outputs/announcement149/',import.meta.url);await mkdir(out,{recursive:true});
const catalog=JSON.parse(await readFile(new URL('../maps/world.json',import.meta.url),'utf8')),origins=[],store=await new LocalStore(await mkdtemp(fileURLToPath(new URL('store-',out)))).init(),host=await createHost({mode:'local',store,catalog,origins,serveStatic:true});
await new Promise(r=>host.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+host.server.address().port;origins.push(base);
const {chromium}=await import(pathToFileURL(process.argv[2]).href),browser=await chromium.launch({channel:'msedge',headless:true}),sockets=[],errors=[],checks=[],commands=[];
try{
 catalog.maps.find(m=>m.id==='ayutthaya').citizens=[]; // Isolate input checks from randomly wandering passers-by.
 const seed=await store.createLocal({name:'TalkQA',gender:'male'}),record=store.rows.get(seed.uid),npc=catalog.maps.find(m=>m.id==='ayutthaya').npcs.find(n=>n.name==='ครูแสนดาบ');
 record.character.classId='swordsman';record.xpCurve=XP_CURVE;record.state=initialSave();record.state.mapId='rice-fields';record.state.position={...catalog.maps.find(m=>m.id==='rice-fields').spawn};record.state.traveler.baseXp=levelStart(99);record.story={v:3,quest:STORY.length,step:0,count:0,done:true};
 record.gear={weapon:'sword-iron',head:'hat-headband',armor:'vest-cotton',garment:'cloak-cotton',shoes:'shoes-woven',accessory:'ring-ruby'};record.bag={coins:50000,slots:100,items:{...Object.fromEntries(Object.keys(ITEMS).slice(0,80).map(id=>[id,2])),'hp-small':8,'mp-small':8,'iron-ore':50}};
 record.daily={day:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),streak:1};
 async function launch(mobile=false,lang='th',source=seed,save=record){
 const context=await browser.newContext({viewport:{width:mobile?844:1440,height:mobile?390:900},isMobile:mobile,hasTouch:mobile});
 await context.route('**/maps/world.json*',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(catalog)}));
 await context.route('http://127.0.0.1:8787/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'}));
 await context.routeWebSocket('ws://127.0.0.1:8787/realtime',route=>{const socket=new WebSocket(base.replace('http','ws')+'/realtime',{origin:base}),pending=[];sockets.push(socket);route.onMessage(m=>{commands.push(JSON.parse(m));socket.readyState===1?socket.send(m):pending.push(m);});socket.on('open',()=>pending.splice(0).forEach(m=>socket.send(m)));socket.on('message',m=>route.send(m.toString()));socket.on('error',e=>errors.push(e.message));route.onClose(()=>socket.close());socket.on('close',(code,reason)=>route.close({code:code===1006?1000:code,reason:reason.toString()}));});
 await context.addInitScript(({record,token,lang})=>{sessionStorage.setItem('ayothaya-entry-v1',JSON.stringify({owner:'guest',serverId:'server-1',slotId:'slot-1'}));sessionStorage.setItem('ayothaya-local-network:slot-1',JSON.stringify({token,serverId:'server-1',slotId:'slot-1'}));localStorage.setItem('ayothaya-character-v2:slot-1',JSON.stringify(record));localStorage.setItem('ayothaya.lang',lang);localStorage.setItem('ayothaya-coach-off','1');localStorage.setItem('ayothaya-perf',JSON.stringify({quality:'low',fps:30}));localStorage.setItem('ayothaya-welcome:ayothaya-story:server-1:slot-1','1');},{record:save,token:source.token,lang});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/game.html?server=server-1&map=rice-fields');await page.waitForFunction(()=>window.__ayothaya&&document.getElementById('online-button')?.dataset.state==='online',null,{timeout:120000});await page.waitForTimeout(700);
 await page.evaluate(()=>{for(const d of document.querySelectorAll('dialog[open]'))d.close();});
 if(await page.locator('#dock-toggle').getAttribute('aria-expanded')==='true'&&mobile)await page.locator('#dock-toggle').click();
 return {context,page};}

 let {context,page}=await launch(false);
 const peer=[...host.realm.peers.values()].find(p=>p.uid===seed.uid);peer.world.player.hp=peer.world.player.maxHp=1000000;
 peer.rebirth=5;await page.waitForFunction(()=>!document.querySelector('.hero-label .rank-title').hidden);
 const other=await store.createLocal({name:'RemoteQA',gender:'female'}),otherRecord=store.rows.get(other.uid);
 otherRecord.character.classId='acolyte';otherRecord.rebirth=3;otherRecord.state=structuredClone(record.state);otherRecord.state.position.x+=2;
 const remote=await launch(false,'th',other,otherRecord);
 await page.locator('.remote-player-label').waitFor();await page.waitForTimeout(1500);
 async function names(){
  const rows=await page.evaluate(async()=>{
   const {scene,camera,game}=window.__ayothaya;
   const {Vector3}=await import('/vendor/build/three.module.js');
   const labels=[...document.querySelectorAll('.hero-label,.remote-player-label')];
   const sprites=scene.children.filter(o=>o.userData.rigType==='painted-frames');
   const local=sprites.reduce((a,b)=>Math.hypot(b.position.x-game.world.player.x,b.position.z-game.world.player.z)<Math.hypot(a.position.x-game.world.player.x,a.position.z-game.world.player.z)?b:a);
   return labels.map(n=>{const r=n.getBoundingClientRect(),lines=[...n.children].filter(c=>!c.hidden).map(c=>{const range=document.createRange();range.selectNodeContents(c);const b=range.getBoundingClientRect();return {text:c.textContent,center:b.x+b.width/2};});
    const sprite=n.classList.contains('hero-label')?local:sprites.filter(s=>s!==local).reduce((a,b)=>Math.hypot(b.position.x-game.world.player.x,b.position.z-game.world.player.z)<Math.hypot(a.position.x-game.world.player.x,a.position.z-game.world.player.z)?b:a);
    const feet=sprite.position.clone().project(camera),up=camera.matrixWorld.elements,h=sprite.scale.y*210/256+.18;
    const head=new Vector3(sprite.position.x+up[4]*h,sprite.position.y+up[5]*h,sprite.position.z+up[6]*h).project(camera);
    return {rect:r.toJSON(),center:r.x+r.width/2,head:{x:(head.x*.5+.5)*innerWidth,y:(-head.y*.5+.5)*innerHeight},feet:{x:(feet.x*.5+.5)*innerWidth,y:(-feet.y*.5+.5)*innerHeight},lines};});
  });
  for(const r of rows){assert.ok(Math.abs(r.center-r.head.x)<1.5,JSON.stringify(r));assert.ok(Math.abs(r.rect.bottom-r.head.y)<1.5,JSON.stringify(r));for(const l of r.lines)assert.ok(Math.abs(l.center-r.center)<1.5,JSON.stringify(r));}
  assert.ok(rows.length>=2);return rows;
 }
 await names();checks.push('Local and remote name/rank text centres above the actual camera-facing head');
 host.realm.worldSay('server-1',{actor:peer.id,name:'ประกาศ',text:'ordinary player chat'});
 await page.waitForTimeout(250);assert.equal(await page.locator('#realm-announcement').isVisible(),false);
 host.realm.worldSay('server-1',{actor:null,name:'ประกาศ',text:'📣 ทดสอบตีบวก ดาบเหล็ก +9 สำเร็จ!'});
 await page.locator('#realm-announcement:not([hidden])').waitFor();
 const before=await page.locator('.announcement-text').evaluate(n=>n.getBoundingClientRect().x);
 await page.waitForTimeout(700);const after=await page.locator('.announcement-text').evaluate(n=>n.getBoundingClientRect().x);
 assert.ok(after<before-30,{before,after});assert.ok(await page.locator('.announcement-owl').evaluate(n=>n.complete&&n.naturalWidth===160));
 host.realm.announce('server-1','👑 บอสโลกปรากฏตัวแล้ว!');
 assert.match(await page.locator('.announcement-text').textContent(),/ตีบวก/);checks.push('Refine announcements scroll right to left; boss messages queue without overlap; player chat is excluded');
 for(const [width,height]of [[1920,1080],[1440,900],[1024,768]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(400);await names();const r=await page.locator('#realm-announcement').boundingBox();assert.ok(r.x>=0&&r.x+r.width<=width&&r.y>=100&&r.y+r.height<height*.4);await page.screenshot({path:fileURLToPath(new URL('desktop-'+width+'.png',out))});
 }
 await page.waitForFunction(()=>document.querySelector('.announcement-text').textContent.includes('บอสโลก'),null,{timeout:30000});
 await page.waitForFunction(()=>document.getElementById('realm-announcement').hidden,null,{timeout:30000});
 const activeWeather=await page.locator('#weather-chip').getAttribute('data-weather');
 host.realm.setWeather({serverId:'server-1',weather:activeWeather==='storm'?'clear':'storm',minutes:5});
 await page.waitForFunction(()=>document.querySelector('.announcement-text')?.textContent.includes('สภาพอากาศเปลี่ยน'));
 checks.push('Queue completes and hides; actual server weather override triggers a weather announcement');
 await context.close();await remote.context.close();
 ({context,page}=await launch(true));
 const mobilePeer=[...host.realm.peers.values()].find(p=>p.uid===seed.uid);mobilePeer.rebirth=5;
 host.realm.announce('server-1','📣 นักผจญภัย ตีบวกอุปกรณ์ +10 สำเร็จ!');
 await page.locator('#realm-announcement:not([hidden])').waitFor();
 for(const [width,height]of [[844,390],[932,430],[568,320],[390,844]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(400);
  const g=await page.locator('#realm-announcement').evaluate(n=>({rect:n.getBoundingClientRect().toJSON(),owl:n.querySelector('img').getBoundingClientRect().toJSON(),bg:getComputedStyle(n).backgroundImage,pointer:getComputedStyle(n).pointerEvents}));
  assert.ok(g.rect.x>=0&&g.rect.right<=width&&g.owl.x>=0&&g.rect.y>=80&&g.rect.bottom<height*.4,JSON.stringify(g));assert.equal(g.pointer,'none');
  const activity=await page.locator('#activity-content').boundingBox();if(activity&&activity.y<g.owl.bottom&&activity.y+activity.height>g.owl.y)assert.ok(g.owl.x>=activity.x+activity.width+5,JSON.stringify({g,activity}));
  await page.screenshot({path:fileURLToPath(new URL('mobile-'+width+'.png',out))});
 }
 await page.setViewportSize({width:844,height:390});await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(100);
 assert.equal(await page.locator('.announcement-text').evaluate(n=>getComputedStyle(n).transform),'none');await page.screenshot({path:fileURLToPath(new URL('reduced-motion.png',out))});
 checks.push('Four phone dimensions retain bounds, touch input passes through, reduced motion shows static wrapped text');
 assert.deepEqual(errors,[]);await writeFile(new URL('checks.json',out),JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks,errors}));await context.close();
}finally{for(const socket of sockets)socket.terminate();await browser.close();await host.close();}process.exit(0);
