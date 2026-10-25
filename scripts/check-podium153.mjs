import assert from 'node:assert/strict';
import {arenaWeek} from '../arena.js';
import {mkdir,mkdtemp,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {WebSocket} from 'ws';
import {LocalStore} from '../server/storage.js';
import {createHost} from '../server/host.js';
import {STORY} from '../story-quests.js';
import {ITEMS} from '../items.js';
import {initialSave} from '../realm-state.js';
import {levelStart,XP_CURVE} from '../experience.js';
const out=new URL('../outputs/podium153/',import.meta.url);await mkdir(out,{recursive:true});
const catalog=JSON.parse(await readFile(new URL('../maps/world.json',import.meta.url),'utf8')),origins=[],store=await new LocalStore(await mkdtemp(fileURLToPath(new URL('store-',out)))).init(),host=await createHost({mode:'local',store,catalog,origins,serveStatic:true});
await new Promise(r=>host.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+host.server.address().port;origins.push(base);
const {chromium}=await import(pathToFileURL(process.argv[2]).href),browser=await chromium.launch({channel:'msedge',headless:true,args:['--explicitly-allowed-ports='+host.server.address().port]}),sockets=[],errors=[],checks=[],commands=[];
try{
 catalog.maps.find(m=>m.id==='ayutthaya').citizens=[]; // Isolate input checks from randomly wandering passers-by.
 const seed=await store.createLocal({name:'TalkQA',gender:'male'}),record=store.rows.get(seed.uid),npc=catalog.maps.find(m=>m.id==='ayutthaya').npcs.find(n=>n.name==='ครูแสนดาบ');
 record.character.classId='swordsman';record.xpCurve=XP_CURVE;record.state=initialSave();record.state.mapId='ayutthaya';record.state.position={...catalog.maps.find(m=>m.id==='ayutthaya').spawn};record.state.traveler.baseXp=levelStart(99);record.story={v:3,quest:STORY.length,step:0,count:0,done:true};
 record.gear={weapon:'sword-iron',head:'hat-headband',armor:'vest-cotton',garment:'cloak-cotton',shoes:'shoes-woven',accessory:'ring-ruby'};record.bag={coins:50000,slots:100,items:{...Object.fromEntries(Object.keys(ITEMS).slice(0,80).map(id=>[id,2])),'hp-small':8,'mp-small':8,'iron-ore':50}};
 record.daily={day:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),streak:1};
 async function launch(mobile=false,lang='th',source=seed,save=record,dpr=1){
 const context=await browser.newContext({viewport:{width:mobile?844:1440,height:mobile?390:900},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:dpr});
 await context.route('**/maps/world.json*',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(catalog)}));
 await context.route('http://127.0.0.1:8787/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'}));
 await context.routeWebSocket('ws://127.0.0.1:8787/realtime',route=>{const socket=new WebSocket(base.replace('http','ws')+'/realtime',{origin:base}),pending=[];sockets.push(socket);route.onMessage(m=>{commands.push(JSON.parse(m));socket.readyState===1?socket.send(m):pending.push(m);});socket.on('open',()=>pending.splice(0).forEach(m=>socket.send(m)));socket.on('message',m=>route.send(m.toString()));socket.on('error',e=>errors.push(e.message));route.onClose(()=>socket.close());socket.on('close',(code,reason)=>route.close({code:code===1006?1000:code,reason:reason.toString()}));});
 await context.addInitScript(({record,token,lang})=>{sessionStorage.setItem('ayothaya-entry-v1',JSON.stringify({owner:'guest',serverId:'server-1',slotId:'slot-1'}));sessionStorage.setItem('ayothaya-local-network:slot-1',JSON.stringify({token,serverId:'server-1',slotId:'slot-1'}));localStorage.setItem('ayothaya-character-v2:slot-1',JSON.stringify(record));localStorage.setItem('ayothaya.lang',lang);localStorage.setItem('ayothaya-coach-off','1');localStorage.setItem('ayothaya-perf',JSON.stringify({quality:'low',fps:30}));localStorage.setItem('ayothaya-welcome:ayothaya-story:server-1:slot-1','1');},{record:save,token:source.token,lang});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/game.html?server=server-1&map=ayutthaya');await page.waitForFunction(()=>window.__ayothaya&&document.getElementById('online-button')?.dataset.state==='online',null,{timeout:120000});await page.waitForTimeout(700);
 await page.evaluate(()=>{for(const d of document.querySelectorAll('dialog[open]'))d.close();});
 if(await page.locator('#dock-toggle').getAttribute('aria-expanded')==='true'&&mobile)await page.locator('#dock-toggle').click();
 return {context,page};}



 const classes=['swordsman','shaman','rogue','lancer','hunter','boxer','acolyte','novice'];
 function seedBoard(){
  host.realm.leaders.set('server-1',Object.fromEntries(Array.from({length:14},(_,i)=>{
   const classId=classes[i%classes.length];return ['fixture'+i,{name:i===3?'Name <b>safe</b>':'Champion '+(i+1),classId,gender:i%2?'female':'male',level:99,power:100000-i*1000,appearance:{hairColor:i%2?'silver':'black'},equipment:{weapon:classId+'-weapon-'+(i%2?'basic':'crafted'),outfit:classId+'-outfit-'+(i%2?'indigo':'crimson')}}];
  })));
  host.realm.leaders.set('arena:server-1',{week:arenaWeek(Date.now()),rows:Object.fromEntries(Array.from({length:14},(_,i)=>['fixture'+i,{name:'Champion '+(i+1),classId:classes[i%8],points:100-i,wins:14-i,losses:0,draws:1,t:i}])),last:[],prizes:{}});
 }
 for(const mobile of [false,true]){
  console.log(mobile?'Checking mobile podium':'Checking desktop podium');seedBoard();
  const source=await store.createLocal({name:mobile?'PodiumMobile':'PodiumDesktop',gender:'male'}),save=store.rows.get(source.uid);Object.assign(save,{state:structuredClone(record.state),xpCurve:XP_CURVE,story:record.story,daily:record.daily});
  const {context,page}=await launch(mobile,'th',source,save);
  await page.evaluate(()=>window.__ayothayaRank.open());
  await page.waitForFunction(()=>document.querySelectorAll('#leaderboard [data-art-state=ready]').length===10,null,{timeout:120000});
  assert.equal(await page.locator('.rank-podium-card[data-place]').count(),3);assert.equal(await page.locator('.rank-contender').count(),7);
  assert.deepEqual(await page.locator('.rank-podium-card[data-place]').evaluateAll(ns=>ns.map(n=>+n.dataset.place)),[2,1,3]);
  assert.deepEqual(await page.locator('.rank-contender').evaluateAll(ns=>ns.map(n=>+n.dataset.place)),[4,5,6,7,8,9,10]);
  assert.equal(await page.locator('.rank-contender strong b').count(),0);assert.ok(await page.locator('.rank-contender').first().textContent().then(s=>s.includes('<b>safe</b>')));
  const pixels=await page.locator('#leaderboard canvas').evaluateAll(ns=>ns.map(n=>{const p=n.getContext('2d').getImageData(0,0,320,320).data;let count=0,foot=0;for(let i=3;i<p.length;i+=4)if(p[i]>20){count++;if(i>=320*312*4)foot++;}return {count,foot};}));assert.ok(pixels.every(p=>p.count>1000&&p.foot>0),JSON.stringify(pixels));
  if(!mobile){
   assert.equal(await page.evaluate(async()=>{
    const {loadPaintedCharacter,loadPaintedStanding}=await import('./painted-character.js?v=podium153');
    for(const gender of ['male','female']){const eq={weapon:'swordsman-weapon-crafted',outfit:'swordsman-outfit-crimson'},a=await loadPaintedStanding('swordsman',gender,{hairColor:'silver'},eq),b=(await loadPaintedCharacter('swordsman',{hairColor:'silver'},eq))[gender][0];if(a.toDataURL()!==b.toDataURL())return false;}return true;
   }),true);checks.push('Lightweight standing frames match the full game painter pixel for pixel for both genders and saved cosmetics');
  }
  checks.push((mobile?'Mobile':'Desktop')+': correct 2–1–3 podium, ranks 4–10, ten actual painted avatars, soles on the platforms and escaped player names');
  for(const [width,height]of mobile?[[932,430],[844,390],[667,375],[568,320],[390,844]]:[[1920,1080],[1440,900],[1024,768]]){
   await page.setViewportSize({width,height});await page.waitForTimeout(180);await page.evaluate(()=>document.querySelector('#orientation-gate[open]')?.close());
   const fit=await page.locator('#leaderboard').evaluate(n=>{const r=n.getBoundingClientRect(),c=n.querySelector('#rank-close').getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,overflow:n.scrollWidth-n.clientWidth,close:c.bottom};});
   assert.ok(fit.x>=-1&&fit.y>=-1&&fit.right<=width+1&&fit.bottom<=height+1&&fit.close<=height&&fit.overflow<2,JSON.stringify(fit));if(width>=1280)assert.ok(fit.width>=1000);
   await page.locator('#rank-body').evaluate(n=>n.scrollTop=0);await page.screenshot({path:fileURLToPath(new URL('podium-'+width+'.png',out))});
   const places=await page.locator('.rank-podium-card[data-place]').evaluateAll(ns=>ns.map(n=>({rank:+n.dataset.place,x:n.getBoundingClientRect().x,top:n.querySelector('.rank-plinth').getBoundingClientRect().top,gap:n.querySelector('.rank-plinth').getBoundingClientRect().top-n.querySelector('canvas').getBoundingClientRect().bottom})));
   assert.ok(places[0].x<places[1].x&&places[1].x<places[2].x);assert.ok(places[1].top<places[0].top&&places[0].top<places[2].top);assert.ok(places.every(p=>Math.abs(p.gap)<1),JSON.stringify(places));
  }
  await page.locator('#leaderboard [data-tab=arena]').click();await page.waitForFunction(()=>document.querySelectorAll('#leaderboard [data-art-state=ready]').length===10);assert.equal(await page.locator('.rank-contender').count(),7);await page.locator('#rank-body').evaluate(n=>n.scrollTop=0);await page.screenshot({path:fileURLToPath(new URL(mobile?'arena-mobile.png':'arena-desktop.png',out))});
  checks.push((mobile?'Mobile':'Desktop')+': responsive bounds and current arena avatars without changing tournament rules');
  host.realm.leaders.set('arena:server-1',{week:arenaWeek(Date.now()),rows:{},prizes:{},last:[]});
  await page.locator('#rank-close').click();await page.evaluate(()=>window.__ayothayaRank.open());await page.locator('.rank-empty').waitFor();assert.equal(await page.locator('#leaderboard canvas').count(),0);
  checks.push('Empty tournament renders a message instead of invented winners');await context.close();
 }
 assert.deepEqual(errors,[]);await writeFile(new URL('checks.json',out),JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks,errors}));
}finally{for(const socket of sockets)socket.terminate();await browser.close();await host.close();}process.exit(0);
