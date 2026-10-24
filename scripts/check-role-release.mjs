import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {WebSocket} from 'ws';
import {LocalStore} from '../server/storage.js';
import {createHost} from '../server/host.js';
import {initialSave} from '../realm-state.js';
import {XP_CURVE} from '../experience.js';
import {ROLE_MARK} from '../role-skill-progress.js';
const out=new URL('../outputs/role-release/',import.meta.url);await mkdir(out,{recursive:true});
const catalog=JSON.parse(await readFile(new URL('../maps/world.json',import.meta.url),'utf8'));
const store=await new LocalStore(fileURLToPath(new URL('local-store/',out))).init(),base='http://127.0.0.1:8910';
const service=await createHost({mode:'local',store,catalog,origins:[base],serveStatic:true});await new Promise(r=>service.server.listen(8910,'127.0.0.1',r));
const {chromium}=await import(pathToFileURL(process.argv[2]).href),browser=await chromium.launch({channel:'msedge',headless:true}),errors=[],failed=[],results=[];
try{
 for(const [classId,jobId,cast] of [['swordsman','guardian',3],['lancer','war-lancer',0],['hunter','spirit-hunter',0],['boxer','master-boxer',0],['rogue','assassin',3],['shaman','spirit-master',1],['acolyte','healer',1]]){
  const seeded=await store.createLocal({name:'Test'+classId,gender:'male'}),record=store.rows.get(seeded.uid),map=catalog.maps.find(m=>m.id==='rice-fields');record.character={...record.character,classId,jobId};record.xpCurve=XP_CURVE;record.daily={day:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),streak:1};record.state={...initialSave(),mapId:map.id,position:map.spawn,traveler:{...initialSave().traveler,hp:9999,mp:9999,baseXp:100000000,jobXp:100000000}};record.skills={_tree84:Array(15).fill(0),[ROLE_MARK]:Array(15).fill(0),[classId]:Array.from({length:15},(_,i)=>i>=6&&i<10?0:i>=13?1:10)};
  const context=await browser.newContext({viewport:{width:1440,height:900}});
  await context.route('http://127.0.0.1:8787/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'}));
  await context.routeWebSocket('ws://127.0.0.1:8787/realtime',route=>{const socket=new WebSocket('ws://127.0.0.1:8910/realtime',{origin:base}),pending=[];route.onMessage(m=>{if(socket.readyState===1)socket.send(m);else pending.push(m);});socket.on('open',()=>pending.splice(0).forEach(m=>socket.send(m)));socket.on('message',m=>route.send(m.toString()));socket.on('error',e=>errors.push(e.message));route.onClose(()=>socket.close());socket.on('close',(code,reason)=>route.close({code:code===1006?1000:code,reason:reason.toString()}));});
  await context.addInitScript(({record,token})=>{sessionStorage.setItem('ayothaya-entry-v1',JSON.stringify({owner:'guest',serverId:'server-1',slotId:'slot-1'}));sessionStorage.setItem('ayothaya-local-network:slot-1',JSON.stringify({token,serverId:'server-1',slotId:'slot-1'}));localStorage.setItem('ayothaya-character-v2:slot-1',JSON.stringify(record));localStorage.setItem('ayothaya.lang','th');localStorage.setItem('ayothaya-coach-off','1');localStorage.setItem('ayothaya-perf',JSON.stringify({quality:'low',fps:30}));},{record,token:seeded.token});
  const page=await context.newPage();page.on('pageerror',e=>{errors.push(classId+': '+e.message);console.error(e);});page.on('response',r=>{if(r.status()>=400)failed.push(r.url());});
  await page.goto(base+'/game.html?server=server-1&map=rice-fields');await page.waitForFunction(()=>window.__ayothaya&&document.getElementById('online-button')?.dataset.state==='online',null,{timeout:120000});await page.waitForTimeout(1500);if(await page.locator('#welcome-go').isVisible())await page.locator('#welcome-go').click();await page.evaluate(()=>{for(const d of document.querySelectorAll('dialog[open]'))d.close();});
  const peer=[...service.realm.peers.values()].find(p=>p.uid===seeded.uid);assert.ok(peer,classId+' server joined');const mob=peer.room.mobs.find(m=>m.hp>0);mob.x=peer.world.player.x+1.4;mob.z=peer.world.player.z;mob.hp=mob.maxHp=20000;mob.home={x:mob.x,z:mob.z};peer.world.player.mp=peer.world.player.maxMp;
  await page.evaluate(id=>window.__ayothaya.game.world.select(id),mob.id);await page.waitForTimeout(180);
  assert.equal(await page.evaluate(()=>window.__ayothaya.game.world.skills.filter(s=>s.roleSkillId&&!s.passive).length),9,classId+' new skills');
  await page.evaluate(index=>window.__ayothaya.game.world.skill(index),cast);await page.waitForTimeout(1100);const metrics=await page.evaluate(()=>window.__ayothaya.game.roleEffects.metrics);assert.ok(metrics.active>0&&metrics.active<=3,classId+' painted live effect');
  await page.screenshot({path:fileURLToPath(new URL(classId+'-combat.png',out)),fullPage:true});
  await page.evaluate(()=>dispatchEvent(new CustomEvent('open-skill-window')));await page.waitForTimeout(120);assert.equal(await page.locator('.skill-node:visible').count(),6);await page.locator('[data-tab=master]').click();assert.equal(await page.locator('.skill-node:visible').count(),5);await page.screenshot({path:fileURLToPath(new URL(classId+'-master.png',out)),fullPage:true});await page.locator('#skill-close').click();
  await page.locator('#auto-settings-open').click();assert.equal(await page.locator('#auto-skill-choices .auto-skill-choice:visible').count(),9);assert.equal(await page.locator('#auto-skill-choices [data-auto="13"]').isVisible(),false);await page.keyboard.press('Escape');
  if(classId==='hunter'){assert.ok(peer.world.roleCombat.state.pets.some(p=>p.kind==='rooster'));assert.ok((await page.evaluate(()=>window.__ayothaya.game.roleDecor.metrics)).petSlots>0);}
  if(classId==='acolyte'){await page.setViewportSize({width:844,height:390});await page.evaluate(()=>{const chat=document.querySelector('#chat-dock');if(chat)chat.classList.add('collapsed');});await page.waitForTimeout(250);await page.screenshot({path:fileURLToPath(new URL('mobile-live.png',out)),fullPage:true});}
  results.push({classId,metrics});await context.close();await page.waitForTimeout?.(0).catch(()=>{});
 }
 await writeFile(new URL('checks.json',out),JSON.stringify({results,errors,failed},null,2));assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);console.log(JSON.stringify({classes:results.length,errors,failed}));
}finally{await browser.close();await service.close();}process.exit(0);
