import {chromium} from 'file:///C:/Users/WIN%2011%20PRO/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHost} from '../server/host.js';
import {LocalStore} from '../server/storage.js';
import {thaiDay} from '../daily.js';
import {initialSave} from '../realm-state.js';
import {levelStart,XP_CURVE} from '../experience.js';
import {petAccountAction} from '../pet-account.js';
import {spawnMonsterLoot} from '../server/ground-loot.js';
const output=path.resolve('outputs/ground-loot219');fs.mkdirSync(output,{recursive:true});
const store=await new LocalStore(fs.mkdtempSync(path.join(output,'store-'))).init();
const catalog=JSON.parse(fs.readFileSync('maps/world.json','utf8')),origins=[];
const host=await createHost({mode:'local',store,catalog,origins,serveStatic:true,prologue:false});
await new Promise(r=>host.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+host.server.address().port;origins.push(base);
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const reports=[];
try{
 for(const [width,height,reduced] of (process.argv.includes('--desktop')?[[1440,900,false]]:[[1440,900,false],[844,390,false],[844,390,true]])){
  const who=await store.createLocal({name:'LootTester',gender:'female'}),rec=store.rows.get(who.uid),map=catalog.maps.find(m=>m.id==='rice-fields');
  const petCollection=petAccountAction(null,{type:'petGrant',pet:'rice-rabbit',gems:0,requestId:'qa-grant-0001'}).state;
  Object.assign(rec,{character:{...rec.character,classId:'swordsman'},state:{...initialSave(),mapId:map.id,position:map.spawn,traveler:{...initialSave().traveler,baseXp:levelStart(30),jobXp:0}},daily:{day:thaiDay(Date.now()),streak:1},xpCurve:XP_CURVE,bag:{coins:10000,slots:100,items:{}},petCollection});
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,hasTouch:width<1000,isMobile:width<1000,reducedMotion:reduced?'reduce':'no-preference',...(width===1440?{recordVideo:{dir:path.join(output,'video'),size:{width:1440,height:900}}}:{})});
  const page=await context.newPage(),videoStart=Date.now(),errors=[],missing=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push([r.status(),r.url()]);});
  // The production URL remains unchanged. This isolated browser redirects the loopback-only test backend.
  await page.route('**/multiplayer-config.js*',async route=>{let body=fs.readFileSync('multiplayer-config.js','utf8').replace('ws://127.0.0.1:8787/realtime',base.replace('http','ws')+'/realtime');await route.fulfill({body,contentType:'text/javascript'});});
  await page.addInitScript(({token,record})=>{
   sessionStorage.setItem('ayothaya-entry-v1',JSON.stringify({owner:'guest',serverId:'server-1',slotId:'slot-1'}));
   sessionStorage.setItem('ayothaya-local-network:slot-1',JSON.stringify({token,serverId:'server-1',slotId:'slot-1'}));
   localStorage.setItem('ayothaya-character-v2:slot-1',JSON.stringify(record));
   localStorage.setItem('ayothaya.lang','th');localStorage.setItem('ayothaya-coach-off','1');localStorage.setItem('ayothaya-perf',JSON.stringify({quality:'low',fps:30}));localStorage.setItem('ayothaya-audio',JSON.stringify({music:0,sfx:0}));
  },{token:who.token,record:rec});
  await page.goto(base+'/game.html?server=server-1&map=rice-fields',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.__ayothaya?.game.world.networkSelfId,{},{timeout:90000});
  const peer=[...host.realm.peers.values()].find(p=>p.uid===who.uid);assert.ok(peer);
  for(const m of peer.room.mobs){m.hp=0;m.dead=1e9;}
  await page.waitForTimeout(1500);await page.evaluate(()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());});
  const starting=peer.bag.coins;
  await page.evaluate(()=>window.__ayothaya.game.world.setAuto(true));await page.waitForTimeout(250);
  spawnMonsterLoot(host.realm,peer,{coins:17,items:[{id:'rat-tooth',count:2}]},{x:peer.world.player.x+6,z:peer.world.player.z});
  const first=[...peer.room.groundLoot.values()].at(-1);
  await page.locator('[data-drop-id="'+first.id+'"]').waitFor({state:'visible'});
  await page.waitForTimeout(1700);assert.equal(peer.bag.coins,starting,'AUTO with owned but resting pet cannot pick up');
  await page.screenshot({path:path.join(output,'ground-'+width+(reduced?'-reduced':'')+'.png')});
  if(width<1000)await page.locator('[data-drop-id="'+first.id+'"]').tap();else await page.locator('[data-drop-id="'+first.id+'"]').click();
  await page.waitForFunction(n=>window.__ayothaya.game.world.bag.coins===n,starting+17,{timeout:20000});
  await page.evaluate(async()=>{await window.__ayothaya.game.world.petCommand('petEquip',{pet:'rice-rabbit'});});
  await page.waitForTimeout(700);assert.equal(peer.world.auto,false,'manual walk left combat AUTO off; equipping must not enable it');
  spawnMonsterLoot(host.realm,peer,{coins:23,items:[{id:'spirit-rope',count:1}]},{x:peer.world.player.x+8,z:peer.world.player.z});
  const clipStart=(Date.now()-videoStart)/1000,second=[...peer.room.groundLoot.values()].at(-1),startPet={...peer.groundPet};
  await page.waitForTimeout(600);assert.equal(peer.bag.coins,starting+17,'physical travel must precede grant');
  const midway=peer.groundPet&&{x:peer.groundPet.x,z:peer.groundPet.z};assert.ok(midway&&Math.hypot(midway.x-startPet.x,midway.z-startPet.z)>1);
  await page.screenshot({path:path.join(output,'pet-running-'+width+(reduced?'-reduced':'')+'.png')});
  await page.waitForFunction(n=>window.__ayothaya.game.world.bag.coins===n,starting+40,{timeout:12000});
  await page.waitForFunction(()=>{const w=window.__ayothaya.game.world;return w.groundPet&&Math.hypot(w.groundPet.x-w.player.x,w.groundPet.z-w.player.z)<2;},{},{timeout:20000});assert.ok(Math.hypot(peer.groundPet.x-peer.world.player.x,peer.groundPet.z-peer.world.player.z)<2,'pet returns to owner');
  assert.equal(peer.room.groundLoot.has(second.id),false);
  if(width===1440){
   await page.evaluate(async()=>{await window.__ayothaya.game.world.petCommand('petEquip',{pet:null});document.activeElement?.blur();});
   spawnMonsterLoot(host.realm,peer,{coins:3,items:[]},peer.world.player);
   const keyDrop=[...peer.room.groundLoot.values()].at(-1);
   await page.locator('[data-drop-id="'+keyDrop.id+'"]').waitFor({state:'visible'});
   assert.equal(peer.world.auto,false);await page.keyboard.press('f');
   await page.waitForFunction(n=>window.__ayothaya.game.world.bag.coins===n,starting+43,{timeout:12000});
   assert.equal(peer.world.auto,false,'F pickup must not toggle combat AUTO');
   await page.keyboard.press('f');await page.waitForFunction(()=>window.__ayothaya.game.world.auto);
  }
  const domCount=await page.locator('.ground-loot-item').count();assert.equal(domCount,0);
  assert.deepEqual(errors,[]);const knownAudio=missing.filter(([,url])=>/\/assets\/audio180\/(?:swing[0-2]|hit[0-2]|crit|cast|potion|defeat|dodge|hurt|level|fanfare|chime|rare|coin|forge|click)\.mp3/.test(url));const changedMissing=missing.filter(row=>!knownAudio.includes(row));assert.deepEqual(changedMissing,[]);
  const result={width,height,reduced,videoWindow:[clipStart,(Date.now()-videoStart)/1000],manualPickup:true,autoNeedsFollowingPet:true,collectsWithCombatAutoOff:true,petTravelBeforeGrant:true,petReturns:true,errors,missing:changedMissing,existingMissingAudio:knownAudio};
  reports.push(result);console.log(JSON.stringify({...result,existingMissingAudio:knownAudio.length}));await context.close();if(width===1440)fs.copyFileSync(await page.video().path(),path.join(output,'pet-collect-desktop.webm'));fs.writeFileSync(path.join(output,'browser.json'),JSON.stringify(reports,null,2));host.realm.leave(peer.id);
 }
 fs.writeFileSync(path.join(output,'browser.json'),JSON.stringify(reports,null,2));
}finally{await browser.close();await host.close();}
