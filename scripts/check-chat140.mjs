// Chat actions use real isolated WebSocket clients, never production players.
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {WebSocket} from 'ws';
import {LocalStore} from '../server/storage.js';
import {createHost} from '../server/host.js';
import {XP_CURVE} from '../experience.js';
const out=new URL('../outputs/chat140/',import.meta.url);await mkdir(out,{recursive:true});
const catalog=JSON.parse(await readFile(new URL('../maps/world.json',import.meta.url),'utf8')),origins=[];
const store=await new LocalStore(await mkdtemp(fileURLToPath(new URL('store-',out)))).init(),host=await createHost({mode:'local',store,catalog,origins,serveStatic:true});
await new Promise(r=>host.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+host.server.address().port;origins.push(base);
const {chromium}=await import(pathToFileURL(process.argv[2]).href),browser=await chromium.launch({channel:'msedge',headless:true}),checks=[],errors=[],sockets=[];
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function waitFor(check){for(let i=0;i<100;i++){if(check())return;await pause(50);}assert.ok(check(),'server message not received');}
async function seed(name){const session=await store.createLocal({name,gender:'male'}),record=store.rows.get(session.uid);record.xpCurve=XP_CURVE;record.story={v:3,quest:0,step:0,count:0,done:false};record.daily={day:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),streak:1};return {...session,record};}
try{
 for(const mobile of [false,true])for(const lang of ['th','en']){
  const session=await seed('ChatHero'),friend=await seed('ChatFriend'),received=[];
  const socket=new WebSocket(base.replace('http','ws')+'/realtime',{origin:base});sockets.push(socket);socket.on('message',raw=>received.push(JSON.parse(raw)));
  await new Promise(r=>socket.on('open',r));socket.send(JSON.stringify({type:'join',token:friend.token,serverId:'server-1',slotId:'slot-1',channel:1}));await waitFor(()=>received.some(m=>m.type==='welcome'));let seq=0;
  const reply=async(text,channel='room')=>{await pause(1250);socket.send(JSON.stringify({type:'chat',seq:++seq,channel,text}));await waitFor(()=>received.some(m=>m.type==='chat'&&m.text===text));};
  const context=await browser.newContext({viewport:{width:mobile?932:1920,height:mobile?430:945},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:1});
  await context.route('**/multiplayer-config.js*',r=>r.fulfill({contentType:'text/javascript',body:`export function multiplayerURL(){return '${base.replace('http','ws')}/realtime'}export function wakeServer(){}`}));
  await context.addInitScript(({record,token,lang})=>{
   sessionStorage.setItem('ayothaya-entry-v1',JSON.stringify({owner:'guest',serverId:'server-1',slotId:'slot-1'}));sessionStorage.setItem('ayothaya-local-network:slot-1',JSON.stringify({token,serverId:'server-1',slotId:'slot-1'}));
   localStorage.setItem('ayothaya-character-v2:slot-1',JSON.stringify(record));localStorage.setItem('ayothaya.lang',lang);localStorage.setItem('ayothaya-coach-off','1');localStorage.setItem('ayothaya-perf',JSON.stringify({quality:'low',fps:30}));
  },{record:session.record,token:session.token,lang});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/game.html?server=server-1&map=ayutthaya');
  await page.waitForFunction(()=>window.__ayothaya?.game.actionBar&&document.getElementById('online-button')?.dataset.state==='online',null,{timeout:90000});await page.waitForTimeout(500);
  await page.evaluate(()=>{for(const d of document.querySelectorAll('dialog[open]'))d.close();});
  const peer=[...host.realm.peers.values()].find(p=>p.uid===session.uid);assert.ok(peer);
  const state=structuredClone({story:peer.story,bag:peer.bag});
  assert.equal(await page.locator('#online-dock').isVisible(),mobile);
  if(!mobile){
   await page.locator('#desktop-chat-launcher img').evaluate(i=>i.decode());assert.ok(await page.locator('#desktop-chat-launcher').isVisible());
   assert.equal(await page.locator('#desktop-chat-launcher kbd').textContent(),'Enter');await page.screenshot({path:fileURLToPath(new URL(`${lang}-desktop-collapsed.png`,out))});
  }else assert.equal(await page.locator('#desktop-chat-launcher').isVisible(),false);
  const expand=async()=>{if(mobile){if(await page.locator('#dock-toggle').getAttribute('aria-expanded')==='false')await page.locator('#dock-toggle').click();await page.locator('#online-text').focus();}else await page.locator('#desktop-chat-launcher').click();};
  if(!mobile)await page.keyboard.press('Enter');else await expand();
  await page.waitForFunction(()=>document.activeElement?.id==='online-text');
  const sent=lang==='th'?'พร้อมออกล่าบอสกันไหมครับ 🌸':'Ready to hunt the map boss together?';
  await page.locator('#online-text').fill(sent);await page.keyboard.press('Enter');await waitFor(()=>received.some(m=>m.type==='chat'&&m.name==='ChatHero'&&m.text===sent));
  const own=page.locator('#online-messages p.mine').filter({hasText:sent});await own.waitFor();assert.equal(await own.locator('img').count(),0);assert.equal(await page.locator('#online-text').inputValue(),'');assert.equal(await page.locator('#online-text').evaluate(e=>document.activeElement===e),true);
  const answer=lang==='th'?(mobile?'เดี๋ยวตามไป เจอกันที่บึงบัวนะครับ':'พร้อมแล้ว เจอกันที่บึงบัวนะครับ'):(mobile?'On my way to Lotus Marsh!':'Ready! Meet you at Lotus Marsh.');await reply(answer);await page.locator('#online-messages p').filter({hasText:answer}).waitFor();
  const whispered=lang==='th'?'ชวนเข้าปาร์ตี้ได้เลยครับ':'You can invite me to the party.';await pause(1250);await page.locator('#online-text').fill('/w ChatFriend '+whispered);await page.keyboard.press('Enter');await waitFor(()=>received.some(m=>m.channel==='whisper'&&m.text===whispered));assert.equal(await page.locator('#online-text').inputValue(),'/w ChatFriend ');
  await page.locator('#online-text').fill('Draft stays');await page.keyboard.press('Escape');
  if(!mobile){
   assert.equal(await page.locator('#online-dock').isVisible(),false);assert.equal(await page.locator('#online-text').inputValue(),'Draft stays');
   await reply(lang==='th'?'ใครยังไม่มีปาร์ตี้ มารวมกันได้เลย':'Anyone without a party is welcome to join.');await page.waitForFunction(()=>!document.querySelector('.desktop-chat-unread').hidden);await page.locator('#desktop-chat-launcher').click();
   assert.equal(await page.locator('#online-text').inputValue(),'Draft stays');assert.equal(await page.locator('.desktop-chat-unread').isVisible(),false);
   await page.locator('#online-text').fill('');
  }
  for(const [width,height] of mobile?[[932,430],[667,375],[390,844]]:[[1920,945],[1440,900],[1280,720],[1024,768],[1280,600]]){
   await page.setViewportSize({width,height});await page.waitForTimeout(100);
   if(!mobile&&!(await page.locator('#online-dock').isVisible()))await expand();
   if(mobile&&await page.locator('#dock-toggle').getAttribute('aria-expanded')==='false')await expand();
   const metrics=await page.locator('#online-dock').evaluate(e=>{
    const rect=n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
    return {panel:rect(e),input:rect(e.querySelector('#online-text')),tabs:rect(e.querySelector('.mp-tabs')),messages:rect(e.querySelector('#online-messages')),scroll:document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight};
   });
   const r=metrics.panel;assert.ok(r.x>=0&&r.y>=0&&r.right<=width+1&&r.bottom<=height+1,JSON.stringify(metrics));assert.equal(metrics.scroll,false);
   if(!mobile){assert.ok(metrics.tabs.right<=metrics.messages.x+1);assert.ok(metrics.input.bottom<=r.bottom);assert.ok(metrics.messages.height>100);assert.ok(await page.locator('#desktop-chat-close').isVisible());assert.equal(await page.locator('#dock-toggle').isVisible(),false);}
   else{assert.equal(await page.locator('#desktop-chat-close').isVisible(),false);assert.equal(await page.locator('.chat-author-mark').first().isVisible(),false);}
   await page.screenshot({path:fileURLToPath(new URL(`${lang}-${mobile?'touch':'desktop'}-${width}x${height}.png`,out))});checks.push({mobile,lang,width,height,...metrics});
  }
  await page.locator('#online-dock [data-channel=world]').click();
  assert.equal(await own.isVisible(),false,'room messages are filtered out of world chat');
  const worldText='World chat '+lang+(mobile?' touch':' desktop');await pause(1250);await page.locator('#online-text').fill(worldText);await page.keyboard.press('Enter');await waitFor(()=>received.some(m=>m.channel==='world'&&m.text===worldText));await page.locator('#online-messages p.world').filter({hasText:worldText}).waitFor();
  await page.locator('#online-dock [data-channel=system]').click();assert.equal(await own.isVisible(),false);assert.ok(await page.locator('#online-messages p.system').count()>0);
  await page.locator('#online-dock [data-channel=room]').click();assert.ok(await own.isVisible());
  // User-authored markup is always text, including in the new bubble presentation.
  const literal='<img src=x onerror=alert(1)> & literal text';await pause(1250);await page.locator('#online-text').fill(literal);await page.keyboard.press('Enter');await waitFor(()=>received.some(m=>m.name==='ChatHero'&&m.text===literal));
  const escaped=page.locator('#online-messages p.mine').filter({hasText:literal});await escaped.waitFor();assert.equal(await escaped.locator('img').count(),0);
  if(!mobile){
   await page.locator('#desktop-chat-close').click();assert.equal(await page.locator('#online-dock').isVisible(),false);
   await page.keyboard.press('Enter');assert.equal(await page.locator('#online-text').evaluate(e=>document.activeElement===e),true);
   await page.keyboard.press('Escape');
   await page.keyboard.press('Control+Enter');assert.equal(await page.locator('#online-dock').isVisible(),false);
   await page.evaluate(()=>document.body.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',code:'Enter',isComposing:true,bubbles:true})));assert.equal(await page.locator('#online-dock').isVisible(),false);
   // Opening a utility window keeps Enter from stealing focus into chat.
   if(!await page.locator('#menu-bag').isVisible())await page.locator('#menu-toggle').click();await page.locator('#menu-bag').click();await page.keyboard.press('Enter');assert.equal(await page.locator('#online-dock').isVisible(),false);await page.keyboard.press('Escape');
   await page.locator('#desktop-chat-launcher').click();await page.setViewportSize({width:844,height:390});await page.waitForTimeout(100);assert.equal(await page.locator('#desktop-chat-launcher').isVisible(),false);assert.equal(await page.locator('#dock-toggle').getAttribute('aria-expanded'),'false');
   await page.setViewportSize({width:1440,height:900});await page.waitForTimeout(100);assert.ok(await page.locator('#desktop-chat-launcher').isVisible());
  }
  assert.deepEqual({story:peer.story,bag:peer.bag},state,'chat UI must not modify inventory or quest progress');
  console.log('PASS',mobile?'touch':'desktop',lang,'send, receive, whisper, draft, keyboard, geometry');await context.close();socket.close();
 }
 assert.deepEqual(errors,[]);await writeFile(new URL('checks.json',out),JSON.stringify({checks,errors},null,2));
}finally{await browser.close();for(const s of sockets)s.close();await host.close();}
process.exit(0);
