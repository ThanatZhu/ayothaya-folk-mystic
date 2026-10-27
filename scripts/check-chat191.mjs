import assert from 'node:assert/strict';
import {mkdir,mkdtemp,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {LocalStore} from '../server/storage.js';
import {createHost} from '../server/host.js';
import {initialSave} from '../realm-state.js';
const out=new URL('../outputs/chat191/',import.meta.url);await mkdir(out,{recursive:true});
const catalog=JSON.parse(await readFile(new URL('../maps/world.json',import.meta.url))),origins=[],store=await new LocalStore(await mkdtemp(fileURLToPath(new URL('store-',out)))).init();
const host=await createHost({mode:'local',store,catalog,origins,serveStatic:true});
await new Promise(r=>host.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+host.server.address().port;origins.push(base);
const {chromium}=await import('file:///C:/Users/WIN%2011%20PRO/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--explicitly-allowed-ports='+host.server.address().port]}),errors=[],checks=[],sockets=[];
try{
 let seed,record;const head=(await readFile(new URL('../game.html',import.meta.url),'utf8')).split('</head>')[0];
 async function launch(mobile){
  const context=await browser.newContext({viewport:{width:mobile?844:1440,height:mobile?390:900},isMobile:mobile,hasTouch:mobile});
  await context.grantPermissions(['local-network-access'],{origin:base});
  // Exercise the production chat component/transport without rendering the 3D map.
  await context.route('**/multiplayer-config.js*',r=>r.fulfill({contentType:'text/javascript',body:"export function multiplayerURL(){return '"+base.replace('http','ws')+"/realtime'}export function wakeServer(){}"}));
  await context.addInitScript(({token,character,nav})=>{window.chatFixture={token,character,nav};},{token:seed.token,character:record.character,nav:catalog.maps.find(m=>m.id==='ayutthaya').nav});
  const html=head+'</head><body class="field-hud hud63" data-map="ayutthaya" data-safe="true"><div id="game-shell"><div id="game-menu"></div><div id="world-labels"></div></div><script type="module">import * as THREE from "three";import {createMultiplayer} from "./multiplayer-ui.js?v=chat-channels191";const f=window.chatFixture;const account={cloud:true,character:f.character,serverId:"server-1",slotId:"slot-1",beginOnline:async()=>{},setOnline(){},token:async()=>f.token};const game={world:{player:{x:0,z:0,hp:100,maxHp:100},nav:f.nav,events:[],notice:text=>dispatchEvent(new CustomEvent("game-notice",{detail:text}))},clearInput(){},onEvent(){},setNetwork(client){window.qaClient=client;},expectNetwork(){}};window.qaGame=game;createMultiplayer({scene:new THREE.Scene(),camera:new THREE.PerspectiveCamera(),controls:{getAzimuthalAngle:()=>0},game,account});</script></body></html>';
  await context.route('**/chat191-qa.html',r=>r.fulfill({contentType:'text/html',body:html}));
  const page=await context.newPage();page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.message);});page.on('console',m=>{if(m.type()==='error')console.log('CONSOLE',m.text());});page.on('requestfailed',r=>console.log('FAILED',r.url(),r.failure()?.errorText));
  await page.goto(base+'/chat191-qa.html');await page.waitForTimeout(1500);console.log('STARTUP',await page.evaluate(()=>({body:document.body.innerText.slice(0,1600),state:document.querySelector('#online-button')?.dataset.state,client:window.qaClient?.status,url:window.qaClient?.url,socket:window.qaClient?.socket?.readyState,fixture:!!window.chatFixture})));await page.waitForFunction(()=>document.querySelector('#online-button')?.dataset.state==='online',null,{timeout:60000});
  return {context,page};
 }
 for(const mobile of [false,true]){
 seed=await store.createLocal({name:mobile?'ChatTouch':'ChatDesk'});record=store.rows.get(seed.uid);
 const {context,page}=await launch(mobile);const prefix=mobile?'QA_M_':'QA_D_',peer=[...host.realm.peers.values()].find(p=>p.uid===seed.uid);
 await page.evaluate(()=>document.activeElement?.blur());await page.keyboard.press('Enter');await page.locator('#online-dock').waitFor({state:'visible'});await page.locator('#online-dock [data-channel=room]').click();
 const post=(kind,text,name='Chat friend',actor='qa-peer',id=prefix+text)=>peer.send({type:'chat',channel:kind,text:prefix+text,name,actor,id,time:Date.now()});
 post('room','ROOM');post('world','WORLD');post('whisper','WHISPER');post('world','FAKE','ประกาศ');host.realm.announce('server-1',prefix+'ANNOUNCE');
 await page.evaluate(prefix=>dispatchEvent(new CustomEvent('game-notice',{detail:prefix+'SYSTEM'})),prefix);
 await page.waitForFunction(prefix=>[...document.querySelectorAll('#online-messages p')].some(n=>n.textContent.includes(prefix+'SYSTEM')),prefix);
 await page.waitForFunction(prefix=>[...document.querySelectorAll('#online-messages .chat-message-text')].some(n=>n.textContent.trim()===prefix+'ANNOUNCE'),prefix);
 const visible=()=>page.locator('#online-messages>p:not([hidden]) .chat-message-text').evaluateAll((rows,p)=>rows.map(n=>n.textContent.trim()).filter(s=>s.startsWith(p)),prefix);
 assert.deepEqual((await visible()).sort(),[prefix+'ANNOUNCE',prefix+'ROOM'].sort());assert.ok((await page.locator('#dock-preview').textContent()).includes(prefix+'ANNOUNCE'));
 await page.screenshot({path:fileURLToPath(new URL((mobile?'mobile':'desktop')+'-room.png',out))});
 await page.locator('#online-dock [data-channel=system]').click();assert.deepEqual((await visible()).sort(),[prefix+'ANNOUNCE',prefix+'SYSTEM'].sort());await page.screenshot({path:fileURLToPath(new URL((mobile?'mobile':'desktop')+'-system.png',out))});
 await page.locator('#online-dock [data-channel=world]').click();assert.deepEqual((await visible()).sort(),[prefix+'ANNOUNCE',prefix+'FAKE',prefix+'WORLD'].sort());
 await page.locator('#online-dock [data-channel=whisper]').click();assert.deepEqual(await visible(),[prefix+'WHISPER']);
 await page.locator('#online-dock [data-channel=room]').click();
 await page.evaluate(prefix=>{for(let i=0;i<95;i++)dispatchEvent(new CustomEvent('game-notice',{detail:prefix+'SYSTEM_'+i}));},prefix);
 assert.deepEqual((await visible()).sort(),[prefix+'ANNOUNCE',prefix+'ROOM'].sort());assert.equal(await page.locator('#online-messages>[data-chat-stream=system]').count(),80);
 post('room','ROOM');await page.waitForTimeout(100);assert.equal(await page.locator('#online-messages>[data-chat-stream=room]').filter({hasText:prefix+'ROOM'}).count(),1,'replayed message deduplicated');
 // A real channel-switch reply replaces map chat with that channel's history.
 const next=host.realm.join({uid:'chat191-next-'+mobile,serverId:'server-1',slotId:'slot-1',channel:2,record:{character:{name:'ChannelTwo',gender:'male',classId:'novice'},state:initialSave()},send(){}});
 next.room.history.push({type:'chat',channel:'room',text:prefix+'ROOM2',name:'ChannelTwo',actor:next.id,id:prefix+'room2-history',time:Date.now()});
 await page.evaluate(()=>{document.activeElement?.blur();document.getElementById('dock-toggle').click();document.getElementById('channel-button').click();});await page.locator('#channel-pop-list>button').nth(1).click();
 await page.waitForFunction(prefix=>[...document.querySelectorAll('#online-messages p')].some(n=>n.textContent.includes(prefix+'ROOM2')),prefix);
 await page.evaluate(()=>document.activeElement?.blur());await page.keyboard.press('Enter');await page.locator('#online-dock').waitFor({state:'visible'});
 assert.deepEqual((await visible()).sort(),[prefix+'ANNOUNCE',prefix+'ROOM2'].sort());assert.equal(await page.locator('#online-messages>[data-chat-stream=room]').filter({hasText:prefix+'ROOM'}).count(),1,'only the new room remains');
 checks.push((mobile?'Mobile':'Desktop')+': map chat and announcements only; system-only tab and preview; bounded separate histories; new channel history loaded');console.log(checks.at(-1));host.realm.leave(next.id);await context.close();await new Promise(r=>setTimeout(r,300));
 }
 assert.deepEqual(errors,[]);await writeFile(new URL('validation.json',out),JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks,errors},null,2));
}finally{for(const s of sockets)s.terminate();await browser.close();await host.close();}
