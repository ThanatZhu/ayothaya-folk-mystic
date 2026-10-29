import {chromium} from 'file:///C:/Users/WIN%2011%20PRO/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';
import {createHost} from '../server/host.js';import {LocalStore} from '../server/storage.js';import {thaiDay} from '../daily.js';import {initialSave} from '../realm-state.js';import {levelStart,XP_CURVE} from '../experience.js';import {petAccountAction} from '../pet-account.js';
const output=path.resolve('outputs/pet-build220');fs.mkdirSync(output,{recursive:true});
const store=await new LocalStore(fs.mkdtempSync(path.join(output,'store-'))).init(),catalog=JSON.parse(fs.readFileSync('maps/world.json','utf8')),origins=[];
const host=await createHost({mode:'local',store,catalog,origins,serveStatic:true,prologue:false});await new Promise(r=>host.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+host.server.address().port;origins.push(base);
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const who=await store.createLocal({name:'BuildTester',gender:'female'}),rec=store.rows.get(who.uid),map=catalog.maps.find(m=>m.id===catalog.capital);
 let pet=petAccountAction(null,{type:'petGrant',pet:'garuda-dawn',gems:0,requestId:'qa-grant-0001'}).state;pet=petAccountAction(pet,{type:'petEquip',pet:'garuda-dawn',requestId:'qa-equip-0001'}).state;
 Object.assign(rec,{character:{...rec.character,classId:'swordsman'},state:{...initialSave(),mapId:map.id,position:map.spawn,traveler:{...initialSave().traveler,baseXp:levelStart(30),jobXp:0}},daily:{day:thaiDay(Date.now()),streak:1},xpCurve:XP_CURVE,petCollection:pet});
 const context=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:path.join(output,'video'),size:{width:1440,height:900}}}),page=await context.newPage(),errors=[],missing=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url());});
 await page.route('**/multiplayer-config.js*',async route=>route.fulfill({contentType:'text/javascript',body:fs.readFileSync('multiplayer-config.js','utf8').replace('ws://127.0.0.1:8787/realtime',base.replace('http','ws')+'/realtime')}));
 await page.addInitScript(({token,record})=>{sessionStorage.setItem('ayothaya-entry-v1',JSON.stringify({owner:'guest',serverId:'server-1',slotId:'slot-1'}));sessionStorage.setItem('ayothaya-local-network:slot-1',JSON.stringify({token,serverId:'server-1',slotId:'slot-1'}));localStorage.setItem('ayothaya-character-v2:slot-1',JSON.stringify(record));localStorage.setItem('ayothaya.lang','th');localStorage.setItem('ayothaya-coach-off','1');localStorage.setItem('ayothaya-perf',JSON.stringify({quality:'low',fps:30}));localStorage.setItem('ayothaya-audio',JSON.stringify({music:0,sfx:0}));},{token:who.token,record:rec});
 await page.goto(base+'/game.html?server=server-1&map='+map.id,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>!!window.__ayothaya?.game.world.networkSelfId&&!!window.__ayothaya.game.world.petBuildStatus,{},{timeout:90000});
 await page.waitForTimeout(1500);await page.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));await page.locator('#menu-more').click();await page.locator('#menu-pet').click();await page.locator('.pet-build-editor summary').click();
 await page.locator('[data-build-slot="0"]').click();await page.locator('[data-build-stat="agi"]').click();await page.locator('[data-build-slot="1"]').click();await page.locator('[data-build-stat="luk"]').click();await page.locator('[data-build-slot="2"]').click();await page.locator('[data-build-stat="str"]').click();await page.locator('[data-build-save]').click();
 await page.waitForFunction(()=>window.__ayothaya.game.world.petCollection.statBuild?.stats.join(',')==='agi,luk,str'&&window.__ayothaya.game.world.derivedView.total.agi===5,{},{timeout:20000});
 const peer=[...host.realm.peers.values()].find(p=>p.uid===who.uid);assert.deepEqual(peer.petCollection.statBuild.stats,['agi','luk','str']);assert.deepEqual(store.rows.get(who.uid).petCollection.statBuild.stats,['agi','luk','str']);assert.equal(peer.derived.total.agi,5);
 await page.locator('.pet-build-editor summary').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(output,'live-game-saved.png')});await page.waitForTimeout(1500);
 assert.deepEqual(errors,[]);const baselineAudio=missing.filter(u=>/\/assets\/audio180\/(?:swing[0-2]|hit[0-2]|crit|cast|potion|defeat|dodge|hurt|level|fanfare|chime|rare|coin|forge|click)\.mp3/.test(u));assert.deepEqual(missing.filter(u=>!baselineAudio.includes(u)),[]);
 const result={savedThroughRealGame:true,serverAndClientAGI:5,profile:peer.petCollection.statBuild,errors,changedMissingAssets:0,existingAudioMissing:baselineAudio.length};fs.writeFileSync(path.join(output,'runtime-report.json'),JSON.stringify(result,null,2));
 await context.close();fs.copyFileSync(await page.video().path(),path.join(output,'live-game-normal.webm'));console.log(JSON.stringify(result));
}finally{await browser.close();await host.close();}
