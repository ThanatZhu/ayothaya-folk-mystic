import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {WebSocket} from 'ws';
import {LocalStore} from '../server/storage.js';
import {createHost} from '../server/host.js';
import {initialSave} from '../realm-state.js';
import {XP_CURVE} from '../experience.js';
const out=new URL('../outputs/story123/',import.meta.url);await mkdir(out,{recursive:true});
const catalog=JSON.parse(await readFile(new URL('../maps/world.json',import.meta.url),'utf8')),map=catalog.maps.find(m=>m.id==='ayutthaya'),npc=map.npcs.find(n=>n.name==='ลุงเรือง');
const store=await new LocalStore(fileURLToPath(new URL('local-store/',out))).init(),base='http://127.0.0.1:8914';
const service=await createHost({mode:'local',store,catalog,origins:[base],serveStatic:true});await new Promise(r=>service.server.listen(8914,'127.0.0.1',r));
const {chromium}=await import(pathToFileURL(process.argv[2]).href),browser=await chromium.launch({channel:'msedge',headless:true}),errors=[],results=[];
try{
 const seeded=await store.createLocal({name:'StoryTest',gender:'male'}),record=store.rows.get(seeded.uid);record.xpCurve=XP_CURVE;record.story={v:2,quest:0,step:0,count:0,done:false};record.state={...initialSave(),mapId:map.id,position:{x:npc.x+1,z:npc.z},traveler:{...initialSave().traveler,baseXp:400,jobXp:0}};
 const context=await browser.newContext({viewport:{width:1440,height:900}});
 await context.route('http://127.0.0.1:8787/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'}));
 await context.routeWebSocket('ws://127.0.0.1:8787/realtime',route=>{const socket=new WebSocket(base.replace('http','ws')+'/realtime',{origin:base}),pending=[];route.onMessage(m=>{if(socket.readyState===1)socket.send(m);else pending.push(m);});socket.on('open',()=>pending.splice(0).forEach(m=>socket.send(m)));socket.on('message',m=>route.send(m.toString()));socket.on('error',e=>errors.push(e.message));route.onClose(()=>socket.close());socket.on('close',(code,reason)=>route.close({code:code===1006?1000:code,reason:reason.toString()}));});
 await context.addInitScript(({record,token})=>{sessionStorage.setItem('ayothaya-entry-v1',JSON.stringify({owner:'guest',serverId:'server-1',slotId:'slot-1'}));sessionStorage.setItem('ayothaya-local-network:slot-1',JSON.stringify({token,serverId:'server-1',slotId:'slot-1'}));localStorage.setItem('ayothaya-character-v2:slot-1',JSON.stringify(record));localStorage.setItem('ayothaya.lang','th');localStorage.setItem('ayothaya-coach-off','1');localStorage.setItem('ayothaya-perf',JSON.stringify({quality:'low',fps:30}));localStorage.setItem('ayothaya-welcome:ayothaya-story:server-1:slot-1','1');},{record,token:seeded.token});
 const page=await context.newPage();page.on('pageerror',e=>{errors.push(e.message);console.error(e);});
 await page.goto(base+'/game.html?server=server-1&map=ayutthaya');await page.waitForFunction(()=>window.__ayothaya&&document.getElementById('online-button')?.dataset.state==='online',null,{timeout:120000});await page.waitForTimeout(3000);await page.evaluate(()=>{for(const d of document.querySelectorAll('dialog[open]'))d.close();});
 const peer=[...service.realm.peers.values()].find(p=>p.uid===seeded.uid);assert.ok(peer);Object.assign(peer.world.player,{x:npc.x+1,z:npc.z});await page.waitForTimeout(250);
 const talk=()=>page.locator('.npc-label').filter({hasText:'ลุงเรือง'}).evaluate(el=>el.click());
 await talk();await page.waitForSelector('#story-scene[open]');assert.equal(peer.story.step,0);await page.locator('#story-scene-ask').click();assert.equal(await page.locator('#story-scene-answer').isVisible(),true);assert.equal(peer.story.step,0);await page.locator('#story-scene-close').click();assert.equal(peer.story.step,0);await talk();assert.equal(await page.locator('#story-scene-page').textContent(),'1 / 3');
 for(const [width,height] of [[1440,900],[844,390],[667,375],[390,844]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(200);await page.evaluate(()=>{document.getElementById('orientation-gate')?.close();});const bounds=await page.locator('#story-scene').evaluate(e=>{const r=e.getBoundingClientRect(),b=e.querySelector('footer').getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom,footerBottom:b.bottom,scroll:e.querySelector('.story-scene-scroll').scrollHeight,client:e.querySelector('.story-scene-scroll').clientHeight};});assert.ok(bounds.x>=0&&bounds.y>=0&&bounds.right<=width+1&&bounds.bottom<=height+1,JSON.stringify(bounds));assert.ok(bounds.footerBottom<=height+1);results.push({width,height,...bounds});await page.screenshot({path:fileURLToPath(new URL(width+'x'+height+'.png',out))});
 }
 await page.setViewportSize({width:1440,height:900});await page.locator('#story-scene-next').click();assert.equal(peer.story.step,0);await page.locator('#story-scene-back').click();assert.equal(await page.locator('#story-scene-page').textContent(),'1 / 3');await page.locator('#story-scene-next').click();await page.locator('#story-scene-next').click();assert.equal(peer.story.step,0);await page.locator('#story-scene-next').click();await page.waitForFunction(()=>window.__ayothaya.game.world.story?.step===1);assert.equal(peer.story.step,1);assert.equal(peer.world.baseXp,400,'first conversation pays no quest completion reward');
 await page.locator('#menu-quests').click();await page.locator('[data-qt=story]').click();assert.ok((await page.locator('#quests-body').textContent()).includes('ลุงเรือง'));await page.screenshot({path:fileURLToPath(new URL('journal.png',out))});await page.locator('#quests-close').click();
 await talk();assert.equal(await page.locator('#story-scene').isVisible(),false,'completed NPC uses ordinary dialogue');await page.locator('#close-npc').click();

 // Exercise every authored conversation and offline status migration with real DOM/CSS.
 const html=await readFile(new URL('../game.html',import.meta.url),'utf8');
 await context.route(base+'/__story_fixture**',r=>r.fulfill({status:200,contentType:'text/html',body:html.split('</head>')[0]+'</head><body><div id="game-shell"><nav id="game-menu"></nav></div></body></html>'}));
 const fixture=await context.newPage();fixture.on('pageerror',e=>errors.push(e.message));await fixture.goto(base+'/__story_fixture?lang=en');await fixture.setViewportSize({width:667,height:375});
 const detail=await fixture.evaluate(async()=>{
  const {STORY,currentObjective,normalizeStory}=await import('./story-quests.js'),{createStoryDialogue}=await import('./story-dialogue-ui.js'),{createStatusUI}=await import('./status-ui.js'),{normalizeStats,statPoints}=await import('./character-stats.js');
  let state=normalizeStory(null),accepted=0,stops=0;const game={online:false,clearInput(){},cancelWalk(){},world:{player:{x:0,z:0,hp:1},setAuto(){stops++;}}};
  const ui=createStoryDialogue({game,worldUI:{endTalk(){}},state:()=>state,objective:()=>currentObjective(state),complete:()=>accepted++});
  for(let q=0;q<STORY.length;q++)for(let step=0;step<STORY[q].steps.length;step++){
   if(STORY[q].steps[step].type!=='talk')continue;state=normalizeStory({v:2,quest:q,step});ui.open({name:STORY[q].steps[step].npc,x:0,z:0});
   document.getElementById('story-scene-ask').click();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));const bounds=document.getElementById('story-scene').getBoundingClientRect(),footer=document.querySelector('#story-scene footer').getBoundingClientRect();if(bounds.y<0||bounds.bottom>innerHeight+1||footer.bottom>innerHeight+1)throw Error('mobile dialogue overflow '+q+':'+step);if(document.getElementById('story-scene-answer').hidden)throw Error('optional answer hidden');
   document.getElementById('story-scene-next').click();document.getElementById('story-scene-next').click();document.getElementById('story-scene-next').click();
  }
  if(accepted!==18)throw Error('missing conversation '+accepted);
  state=normalizeStory(null);ui.open({name:'ลุงเรือง',x:0,z:0});await new Promise(r=>setTimeout(r,30));
  if(/[\u0e00-\u0e7f]/.test(document.getElementById('story-scene-text').textContent))throw Error('story English translation missing');
  document.getElementById('story-scene-close').click();
  const key='ayothaya-status:local:fixture',stats=normalizeStats({str:20,agi:7}),gear={armor:'vest-cotton'};
  localStorage.setItem(key,JSON.stringify({stats,gear,path:'novice:'}));
  function mount(classId,jobId=''){
   document.getElementById('status-window')?.remove();document.getElementById('menu-status')?.remove();
   const world={profession:{id:classId},player:{hp:100},baseXp:10000,jobXp:0,applyDerived(){},notice(){}};
   return createStatusUI({game:{online:false,world,clearInput(){}},account:{serverId:'local',slotId:'fixture',cloud:false,character:{classId,jobId}},bagUI:{bag:()=>({items:{}}),setLocal(){}}});
  }
  if(mount('novice').view().stats.str!==20)throw Error('same class lost stats');
  const changed=mount('swordsman').view();if(JSON.stringify(changed.stats)!==JSON.stringify(normalizeStats(null)))throw Error('offline class refund failed');if(changed.gear.armor!=='vest-cotton')throw Error('gear lost');
  const saved=JSON.parse(localStorage.getItem(key));saved.stats=stats;localStorage.setItem(key,JSON.stringify(saved));
  if(mount('swordsman').view().stats.str!==20)throw Error('reloaded class lost stats');
  if(mount('swordsman','guardian').view().stats.str!==1)throw Error('offline Master refund failed');
  localStorage.setItem(key,JSON.stringify({stats,gear}));if(mount('swordsman','guardian').view().stats.str!==20)throw Error('legacy save lost allocation');
  return {conversations:accepted,autoStopped:stops,offlineRefund:true,gearPreserved:true,english:true};
 });
 console.log(JSON.stringify(detail));
 assert.deepEqual(errors,[]);await writeFile(new URL('checks.json',out),JSON.stringify({results,errors},null,2));console.log(JSON.stringify({checks:results.length,progress:peer.story,errors}));await context.close();
}finally{await browser.close();await service.close();}
process.exit(0);
