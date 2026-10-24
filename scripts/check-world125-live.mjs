import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {WebSocket} from 'ws';
import {LocalStore} from '../server/storage.js';
import {createHost} from '../server/host.js';
import {initialSave} from '../realm-state.js';
import {levelStart,XP_CURVE} from '../experience.js';
import {WORLD_MAP_BOSSES} from '../chapter2-monsters.js';
import {MONSTER_TYPES} from '../combat-core.js';
const out=new URL('../outputs/world125/',import.meta.url);await mkdir(out,{recursive:true});
const catalog=JSON.parse(await readFile(new URL('../maps/world.json',import.meta.url),'utf8'));
const store=await new LocalStore(fileURLToPath(new URL('store/',out))).init();
const base='http://127.0.0.1:8920',service=await createHost({mode:'local',store,catalog,origins:[base],serveStatic:true});
await new Promise(r=>service.server.listen(8920,'127.0.0.1',r));
const {chromium}=await import(pathToFileURL(process.argv[2]).href),browser=await chromium.launch({channel:'msedge',headless:true});
const errors=[],failed=[],results=[];
try{
 for(const b of WORLD_MAP_BOSSES){
  const seeded=await store.createLocal({name:'BossVisualQA',gender:'male'}),record=store.rows.get(seeded.uid);
  record.character.classId='swordsman';record.xpCurve=XP_CURVE;record.state.mapId=b.mapId;record.state.traveler.baseXp=levelStart(99);record.state.traveler.jobXp=0;
  record.daily={day:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),streak:1};
  const map=catalog.maps.find(m=>m.id===b.mapId),spawn=map.mobs.find(([,,i])=>MONSTER_TYPES[i].id===b.id);
  record.state.position={x:spawn[0]+4,z:spawn[1]};record.story={v:2,quest:0,step:0,count:0,done:false};
  const context=await browser.newContext({viewport:{width:1280,height:800}});
  await context.route('http://127.0.0.1:8787/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'}));
  await context.routeWebSocket('ws://127.0.0.1:8787/realtime',route=>{
   const socket=new WebSocket(base.replace('http','ws')+'/realtime',{origin:base}),pending=[];
   route.onMessage(m=>{if(socket.readyState===1)socket.send(m);else pending.push(m);});socket.on('open',()=>pending.splice(0).forEach(m=>socket.send(m)));
   socket.on('message',m=>route.send(m.toString()));socket.on('error',e=>errors.push(e.message));route.onClose(()=>socket.close());socket.on('close',(code,reason)=>route.close({code:code===1006?1000:code,reason:reason.toString()}));
  });
  await context.addInitScript(({record,token})=>{
   sessionStorage.setItem('ayothaya-entry-v1',JSON.stringify({owner:'guest',serverId:'server-1',slotId:'slot-1'}));
   sessionStorage.setItem('ayothaya-local-network:slot-1',JSON.stringify({token,serverId:'server-1',slotId:'slot-1'}));
   localStorage.setItem('ayothaya-character-v2:slot-1',JSON.stringify(record));localStorage.setItem('ayothaya.lang','th');
   localStorage.setItem('ayothaya-coach-off','1');localStorage.setItem('ayothaya-perf',JSON.stringify({quality:'low',fps:30}));
  },{record,token:seeded.token});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(b.mapId+': '+e.message));page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))failed.push(r.url());});
  await page.goto(base+'/game.html?server=server-1&map='+b.mapId);
  await page.waitForFunction(()=>window.__ayothaya&&document.getElementById('online-button')?.dataset.state==='online',null,{timeout:120000});
  const peer=[...service.realm.peers.values()].find(p=>p.uid===seeded.uid);assert.ok(peer);
  const boss=peer.room.mobs.find(m=>MONSTER_TYPES[m.type].worldBoss);assert.ok(boss);assert.equal(boss.maxHp,b.hp);
  Object.assign(peer.world.player,{x:boss.x+4,z:boss.z,hp:1000000,maxHp:1000000});
  await page.evaluate(id=>{for(const d of document.querySelectorAll('dialog[open]'))d.close();window.__ayothaya.game.world.select(id);},boss.id);
  await page.waitForTimeout(1600);await page.evaluate(()=>{for(const d of document.querySelectorAll('dialog[open]'))d.close();});
  const art=await page.evaluate(id=>{
   const {scene,game}=window.__ayothaya,mob=game.world.mobs.find(m=>m.id===id);let s;scene.traverse(n=>{if(n.isSprite&&n.userData.monsterId===id)s=n;});
   const t=s?.material.map;return {count:game.world.mobs.length,type:mob?.type,hp:mob?.maxHp,texture:t?.image?.width,height:t?.userData.monsterHeight,bodyHeight:t?.userData.bodyHeight,visible:s?.visible};
  },boss.id);
  assert.equal(art.texture,256);assert.ok(art.height>0&&art.bodyHeight>0&&art.visible,'authored boss texture, not fallback');
  if(b.order===1){
   Object.assign(boss,{windup:.5,strike:0,moving:false,attackCD:0,aggro:true});
   const frames=await page.evaluate(async id=>{
    const frames=new Set(),until=performance.now()+1500;
    while(performance.now()<until){window.__ayothaya.scene.traverse(n=>{if(n.isSprite&&n.userData.monsterId===id)frames.add(n.material.map?.userData.monsterFrame);});await new Promise(r=>setTimeout(r,20));}
    return [...frames];
   },boss.id);
   assert.ok(frames.includes(3)&&frames.includes(4),'real online wind-up and strike textures are played');console.log('online attack frames',frames);
  }
  await page.screenshot({path:fileURLToPath(new URL(b.mapId+'-desktop.png',out))});
  if(b.order>=5){
   const custom=await page.evaluate(()=>{const a=[];window.__ayothaya.scene.traverse(n=>{if(n.isSprite&&Number.isInteger(n.userData.monsterId))a.push(!!n.material.map?.userData.bodyHeight);});return a;});
   assert.equal(custom.length,29);assert.ok(custom.every(Boolean),'every new camp uses its real authored art');
  }
  if(b.order===8||b.order===9){await page.setViewportSize({width:844,height:390});await page.waitForTimeout(350);const toggle=page.locator('#dock-toggle');if(await toggle.getAttribute('aria-expanded')==='true')await toggle.click();await page.screenshot({path:fileURLToPath(new URL(b.mapId+'-mobile.png',out))});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
  results.push({map:b.mapId,...art});console.log('verified',b.mapId,art.count,'monsters');
  await context.close();
 }
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 // Isolated local fixture removes only the client login gate; local API authorization remains in use.
 await context.route('**/ayothaya-admin-9x7k.html',async route=>{
  const response=await route.fetch(),text=await response.text();
  await route.fulfill({response,body:text.replace('id="auth-gate"','id="fixture-auth-gate"').replace('id="app-shell" hidden style="display:none !important"','id="app-shell"').replace('id="fixture-auth-gate"','id="fixture-auth-gate" hidden style="display:none"')});
 });
 await context.addInitScript(()=>{localStorage.setItem('ayo-admin-view',JSON.stringify({tab:'mapbosses',classId:'swordsman'}));localStorage.setItem('ayothaya.lang','th');});
 const admin=await context.newPage();admin.on('pageerror',e=>errors.push('admin: '+e.message));await admin.goto(base+'/ayothaya-admin-9x7k.html');
 await admin.locator('#mb-refresh').waitFor();await admin.locator('#mb-refresh').click();await admin.waitForFunction(()=>document.querySelector('#view [role=status]')?.textContent.includes('สถานะจากเซิร์ฟเวอร์'));
 assert.equal(await admin.locator('#view tbody tr').count(),9);assert.ok((await admin.locator('#view').textContent()).includes('4,500,000'));
 await admin.screenshot({path:fileURLToPath(new URL('admin-bosses.png',out)),fullPage:true});
 await admin.locator('[data-mb-drops="cloud-peak-yaksha"]').click();assert.ok((await admin.locator('#view').textContent()).includes('ตรายักษ์เมฆา'));
 await admin.screenshot({path:fileURLToPath(new URL('admin-drops.png',out)),fullPage:true});
 await admin.locator('#tab-monsters').click();await admin.locator('#search').fill('cloud-peak-yaksha');assert.equal(await admin.locator('#view input[data-f=respawn]').isDisabled(),true);
 await context.close();assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
 await writeFile(new URL('checks.json',out),JSON.stringify({results,adminBosses:9,errors,failed},null,2));console.log(JSON.stringify({maps:results.length,adminBosses:9,errors,failed}));
}finally{await browser.close();await service.close();}
