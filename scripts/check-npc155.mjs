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
const out=new URL('../outputs/npc155/',import.meta.url);await mkdir(out,{recursive:true});
const catalog=JSON.parse(await readFile(new URL('../maps/world.json',import.meta.url),'utf8')),origins=[],store=await new LocalStore(await mkdtemp(fileURLToPath(new URL('store-',out)))).init(),host=await createHost({mode:'local',store,catalog,origins,serveStatic:true});
await new Promise(r=>host.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+host.server.address().port;origins.push(base);
const {chromium}=await import(pathToFileURL(process.argv[2]).href),browser=await chromium.launch({channel:'msedge',headless:true,args:['--explicitly-allowed-ports='+host.server.address().port]}),sockets=[],errors=[],checks=[],commands=[];
try{
 catalog.maps.find(m=>m.id==='ayutthaya').citizens=[]; // Isolate input checks from randomly wandering passers-by.
 const seed=await store.createLocal({name:'StoryQA',gender:'female'}),record=store.rows.get(seed.uid),npc=catalog.maps.find(m=>m.id==='ayutthaya').npcs.find(n=>n.name==='ลุงเรือง');
 record.character.classId='rogue';record.character.appearance={outfit:'crimson',hair:'original',hairColor:'original',eyes:'original',beard:'none',tattoo:'none',garment:'original'};record.xpCurve=XP_CURVE;record.state=initialSave();record.state.mapId='ayutthaya';record.state.position={x:npc.x,z:npc.z+1};record.state.traveler.baseXp=levelStart(99);record.story={v:3,quest:0,step:0,count:0,done:false};
 record.gear={weapon:'daggers-crafted',head:'hat-headband',armor:'vest-cotton',garment:'cloak-cotton',shoes:'shoes-woven',accessory:'ring-ruby'};record.bag={coins:50000,slots:100,items:{...Object.fromEntries(Object.keys(ITEMS).slice(0,80).map(id=>[id,2])),'hp-small':8,'mp-small':8,'iron-ore':50}};
 record.daily={day:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),streak:1};
 async function launch(mobile=false,lang='th',source=seed,save=record,dpr=1){
 const context=await browser.newContext({viewport:{width:mobile?844:1440,height:mobile?390:900},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:dpr});
 await context.route('**/maps/world.json*',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(catalog)}));
 await context.route('http://127.0.0.1:8787/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'}));
 await context.routeWebSocket('ws://127.0.0.1:8787/realtime',route=>{const socket=new WebSocket(base.replace('http','ws')+'/realtime',{origin:base}),pending=[];sockets.push(socket);route.onMessage(m=>{commands.push(JSON.parse(m));socket.readyState===1?socket.send(m):pending.push(m);});socket.on('open',()=>pending.splice(0).forEach(m=>socket.send(m)));socket.on('message',m=>route.send(m.toString()));socket.on('error',e=>errors.push(e.message));route.onClose(()=>socket.close());socket.on('close',(code,reason)=>route.close({code:code===1006?1000:code,reason:reason.toString()}));});
 await context.addInitScript(({record,token,lang})=>{sessionStorage.setItem('ayothaya-entry-v1',JSON.stringify({owner:'guest',serverId:'server-1',slotId:'slot-1'}));sessionStorage.setItem('ayothaya-local-network:slot-1',JSON.stringify({token,serverId:'server-1',slotId:'slot-1'}));localStorage.setItem('ayothaya-character-v2:slot-1',JSON.stringify(record));localStorage.setItem('ayothaya.lang',lang);localStorage.setItem('ayothaya-coach-off','1');localStorage.setItem('ayothaya-cinematic155:server-1:slot-1',JSON.stringify(Array.from({length:24},(_,q)=>Array.from({length:8},(_,s)=>'story:t'+q+':'+s)).flat()));localStorage.setItem('ayothaya-perf',JSON.stringify({quality:'low',fps:30}));localStorage.setItem('ayothaya-welcome:ayothaya-story:server-1:slot-1','1');},{record:save,token:source.token,lang});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/game.html?server=server-1&map=ayutthaya');await page.waitForFunction(()=>window.__ayothaya&&document.getElementById('online-button')?.dataset.state==='online',null,{timeout:120000});await page.waitForTimeout(700);
 await page.evaluate(()=>{for(const d of document.querySelectorAll('dialog[open]'))d.close();});
 if(await page.locator('#dock-toggle').getAttribute('aria-expanded')==='true'&&mobile)await page.locator('#dock-toggle').click();
 return {context,page};}





 const {context,page}=await launch();
 const talk=async name=>{await page.locator('.npc-label').filter({hasText:name}).first().click({force:true});await page.waitForFunction(()=>document.getElementById('npc-dialog').open);};
 const fit=async(id,w,h,target=page)=>{const r=await target.locator(id).evaluate(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,overflow:n.scrollWidth-n.clientWidth};});assert.ok(r.x>=-1&&r.y>=-1&&r.right<=w+1&&r.bottom<=h+1&&r.overflow<=2,JSON.stringify({id,w,h,r}));};
 await talk('ลุงเรือง');await page.waitForSelector('#npc-dialog canvas[data-art-state="ready"]');
 await fit('#npc-dialog',1440,900);await page.screenshot({path:fileURLToPath(new URL('dialogue-desktop.png',out))});
 let q=commands.filter(c=>c.type==='questTalk').length;
 for(let i=0;i<4;i++)await page.keyboard.press('Space');await page.locator('#npc-story-ask').click();await page.locator('#npc-story-back').click();
 assert.equal(commands.filter(c=>c.type==='questTalk').length,q);assert.equal(store.rows.get(seed.uid).story.step,0);checks.push('reading, Space, questions and back never accept quest');
 await page.locator('#npc-story-cinematic').click();await page.waitForFunction(()=>document.getElementById('quest-cinematic').dataset.artState==='ready',null,{timeout:90000});
 const look=await page.locator('#quest-cinematic').getAttribute('data-player-look');assert.ok(look.includes('rogue')&&look.includes('female')&&look.includes('crimson'),look);
 await fit('#quest-cinematic',1440,900);await page.locator('#cinematic-seek').fill('6');await page.locator('#cinematic-pause').click();await page.screenshot({path:fileURLToPath(new URL('cutscene-desktop.png',out))});
 assert.equal(commands.filter(c=>c.type==='questTalk').length,q);checks.push('cinematic uses actual female rogue saved dye and equipped silhouette without quest commands');
 await page.keyboard.press('Escape');assert.ok(await page.locator('#npc-dialog').evaluate(n=>n.open));assert.equal(await page.locator('#quest-cinematic').evaluate(n=>n.open),false);
 while(await page.locator('#npc-text').getAttribute('data-page')!=='2')await page.locator('#npc-story-next').click();assert.equal(commands.filter(c=>c.type==='questTalk').length,q);
 await page.locator('#npc-story-next').click();await page.waitForFunction(()=>window.__ayothaya.game.world.story.step===1);assert.equal(commands.filter(c=>c.type==='questTalk').length,q+1);checks.push('only explicitly labelled final response sends exactly one authoritative quest action');
 await talk('ลุงเรือง');assert.ok(await page.locator('#npc-story-next').isHidden());await page.locator('#close-npc').click();
 // Journal replay must not advance the currently pending second talk step.
 await page.locator('#menu-quests').click({force:true});await page.locator('[data-cinematic-step="0"]').click();await page.waitForFunction(()=>document.getElementById('quest-cinematic').dataset.artState==='ready');
 await page.locator('#cinematic-pause').click();
 for(const [w,h]of [[1440,900],[1024,768],[932,430],[844,390],[667,375],[390,844]]){await page.setViewportSize({width:w,height:h});await fit('#quest-cinematic',w,h);await page.screenshot({path:fileURLToPath(new URL(`cutscene-${w}.png`,out))});}checks.push('cinematic bounds across six desktop/landscape/portrait sizes');
 await page.locator('#cinematic-skip').click();await page.locator('#quests-close').click();
 await talk('ลุงเรือง');for(const [w,h]of [[1440,900],[932,430],[844,390],[667,375],[390,844]]){await page.setViewportSize({width:w,height:h});await fit('#npc-dialog',w,h);await page.screenshot({path:fileURLToPath(new URL(`dialogue-${w}.png`,out))});}await page.locator('#close-npc').click();checks.push('shared NPC dialogue bounds across five desktop/phone sizes');
 // Preview all live monster families, including authored chapter-two clips, all steps remain read-only.
 for(const monster of ['straw','rat','lantern','mill-keeper','marsh-rat','bog-lantern','marsh-ape']){await page.evaluate(monster=>dispatchEvent(new CustomEvent('quest-cinematic-request',{detail:{kind:'bounty',title:'ตัวอย่างการล่า',goal:'สำรวจร่องรอยในแผนที่',monster}})),monster);await page.waitForFunction(()=>document.getElementById('quest-cinematic').dataset.artState==='ready',null,{timeout:90000});await page.locator('#cinematic-seek').fill('6');await page.locator('#cinematic-skip').click();}checks.push('authentic monster atlases animate in seven encounter previews');
 // Actual training conversation uses the same bottom strip with existing guarded controls.
 await page.setViewportSize({width:1440,height:900});await page.evaluate(async()=>{const {createMentorUI}=await import('./mentor-ui.js?v=npc155');const {game}=window.__ayothaya;const m=createMentorUI({game,account:{character:{classId:'rogue',gender:'female'},training:null},inTown:()=>true});const catalog=await (await fetch('./maps/world.json')).json();const n=catalog.maps.find(m=>m.id==='ayutthaya').npcs.find(n=>n.mentorId);m.open(n);});
 // Duplicate test panel only exists in this isolated QA context; inspect the last one.
 const mentor=page.locator('#mentor-panel').last();await mentor.locator('canvas[data-art-state="ready"]').waitFor();await page.screenshot({path:fileURLToPath(new URL('mentor-desktop.png',out))});await mentor.locator('#mentor-close').click();checks.push('mentor trial conversation shares portrait/text/actions layout');
 await context.close();
 const touch=await launch(true);await touch.page.locator('.npc-label').filter({hasText:'ลุงเรือง'}).first().tap({force:true});await touch.page.waitForSelector('#npc-dialog[open]');await fit('#npc-dialog',844,390,touch.page);await touch.page.locator('#close-npc').tap();
 await touch.page.evaluate(()=>dispatchEvent(new CustomEvent('quest-cinematic-request',{detail:{kind:'bounty',title:'ตัวอย่างบนมือถือ',goal:'สำรวจทุ่งข้าว',monster:'straw'}})));await touch.page.waitForFunction(()=>document.getElementById('quest-cinematic').dataset.artState==='ready');await touch.page.locator('#cinematic-pause').tap();await fit('#quest-cinematic',844,390,touch.page);await touch.page.screenshot({path:fileURLToPath(new URL('cutscene-touch.png',out))});await touch.page.locator('#cinematic-skip').tap();await touch.context.close();checks.push('actual touch context opens/closes NPC dialogue and pauses/skips cinematics');
 // Isolated renderer fixture exercises the production component for every player class and gender.
 const artPage=await browser.newPage({viewport:{width:1000,height:700}});artPage.on('pageerror',e=>errors.push(e.message));await artPage.route('**/scene-qa-fixture.html',r=>r.fulfill({status:200,contentType:'text/html',body:'<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>'}));await artPage.goto(base+'/scene-qa-fixture.html');
 await artPage.evaluate(async()=>{document.body.innerHTML='<main id="game-shell"></main>';const {createQuestCinematics}=await import('./quest-cinematic155.js?v=155');const catalog=await(await fetch('./maps/world.json')).json();const account={serverId:'qa',slotId:'art',character:{classId:'novice',gender:'male',appearance:{}},equipment:null},current={quest:99,step:0,done:true};const game={world:{player:{hp:100},mobs:[],profession:{id:'novice'},notice:()=>{}},clearInput:()=>{},cancelWalk:()=>{},online:false};window.artFixture={account,game,current,scenes:createQuestCinematics({game,account,catalog,map:{safe:true},state:()=>current})};});
 for(const classId of ['novice','swordsman','lancer','hunter','boxer','rogue','shaman','acolyte'])for(const gender of ['male','female']){
  const result=await artPage.evaluate(async({classId,gender})=>{const f=window.artFixture;Object.assign(f.account.character,{classId,gender});const {taskScene}=await import('./quest-cinematic-data155.js?v=155');await f.scenes.open(taskScene({kind:'training',title:'ฝึกวิชา',goal:'เรียนรู้จากครูของคุณ'}));return {ready:document.getElementById('quest-cinematic').dataset.artState,look:document.getElementById('quest-cinematic').dataset.playerLook};},{classId,gender});assert.equal(result.ready,'ready',JSON.stringify({classId,gender,result}));assert.ok(result.look.includes(classId)&&result.look.includes(gender));await artPage.locator('#cinematic-skip').click();
 }checks.push('all eight classes, both genders load their own painted animation frames');
 await artPage.evaluate(async()=>{const {taskScene}=await import('./quest-cinematic-data155.js?v=155');await window.artFixture.scenes.open(taskScene({title:'ทดสอบความเสียหาย',goal:'กลับสู่เกมเมื่อได้รับความเสียหาย'}));window.artFixture.game.world.player.hp=80;window.artFixture.scenes.observe();});assert.equal(await artPage.locator('#quest-cinematic').evaluate(n=>n.open),false);checks.push('incoming damage interrupts playback immediately');
 // Slow failed image loading cannot reopen a skipped scene.
 await artPage.route('**/scene-qa-fail.webp',async route=>{await new Promise(r=>setTimeout(r,250));await route.fulfill({status:404,body:''});});
 await artPage.evaluate(async()=>{const {taskScene}=await import('./quest-cinematic-data155.js?v=155');const scene=taskScene({title:'ฉากที่โหลดไม่ได้',goal:'กลับไปเล่นต่อได้เสมอ'});scene.art={src:'./scene-qa-fail.webp'};window.artFixture.scenes.open(scene);});await artPage.locator('#cinematic-skip').click();await artPage.waitForTimeout(450);assert.equal(await artPage.locator('#quest-cinematic').evaluate(n=>n.open),false);checks.push('skipping while assets load never reopens stale scenes');
 await artPage.evaluate(()=>{const f=window.artFixture;Object.assign(f.current,{quest:0,step:0,done:false});f.game.walking=true;f.scenes.observe();});await artPage.waitForTimeout(4200);await artPage.evaluate(()=>window.artFixture.scenes.observe());assert.equal(await artPage.locator('#quest-cinematic').evaluate(n=>n.open),false);
 await artPage.evaluate(()=>{const f=window.artFixture;f.game.walking=false;f.scenes.observe();});await artPage.waitForFunction(()=>document.getElementById('quest-cinematic').dataset.artState==='ready'&&document.getElementById('quest-cinematic').open);await artPage.locator('#cinematic-skip').click();await artPage.evaluate(()=>window.artFixture.scenes.observe());assert.equal(await artPage.locator('#quest-cinematic').evaluate(n=>n.open),false);assert.equal(await artPage.evaluate(()=>window.artFixture.scenes.story(5,0)),false);checks.push('automatic scene waits for route completion, stays seen after skip, and rejects future replay');await artPage.close();
 assert.deepEqual(errors,[]);await writeFile(new URL('report.json',out),JSON.stringify({checks,errors,look},null,2));console.log(JSON.stringify({checks,errors},null,2));
}finally{await browser.close();for(const socket of sockets)socket.terminate();await host.close();}
