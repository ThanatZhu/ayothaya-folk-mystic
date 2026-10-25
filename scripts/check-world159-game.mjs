import assert from 'node:assert/strict';
import {mkdir,mkdtemp,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {WebSocket} from 'ws';
import {LocalStore} from '../server/storage.js';
import {createHost} from '../server/host.js';
import {initialSave} from '../realm-state.js';
import {levelStart,XP_CURVE} from '../experience.js';
import {STORY} from '../story-quests.js';
const out=new URL('../outputs/world159/',import.meta.url);await mkdir(out,{recursive:true});
const catalog=JSON.parse(await readFile(new URL('../maps/world.json',import.meta.url),'utf8')),origins=[],store=await new LocalStore(await mkdtemp(fileURLToPath(new URL('game-store-',out)))).init(),host=await createHost({mode:'local',store,catalog,origins,serveStatic:true});
await new Promise(r=>host.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+host.server.address().port;origins.push(base);
const {chromium}=await import('file:///C:/Users/WIN%2011%20PRO/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'),browser=await chromium.launch({channel:'msedge',headless:true,args:['--explicitly-allowed-ports='+host.server.address().port]}),checks=[],sockets=[];
try{
 for(const spec of [{map:'ayutthaya',quality:'high',mobile:false},{map:'rice-fields',quality:'mid',mobile:true},{map:'moonlit-mill',quality:'high',mobile:false},{map:'naga-cave',quality:'low',mobile:true},{map:'kailash-peak',quality:'high',mobile:false}]){
  const seed=await store.createLocal({name:'LightQA',gender:'male'}),record=store.rows.get(seed.uid),map=catalog.maps.find(m=>m.id===spec.map);record.character.classId='shaman';record.xpCurve=XP_CURVE;record.state=initialSave();record.state.mapId=map.id;record.state.position={...map.spawn};record.state.traveler.baseXp=levelStart(99);record.story={v:3,quest:STORY.length,step:0,count:0,done:true};
  const context=await browser.newContext({viewport:spec.mobile?{width:844,height:390}:{width:1440,height:900},deviceScaleFactor:1,isMobile:spec.mobile,hasTouch:spec.mobile}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await context.route('http://127.0.0.1:8787/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'}));
  await context.routeWebSocket('ws://127.0.0.1:8787/realtime',route=>{const socket=new WebSocket(base.replace('http','ws')+'/realtime',{origin:base}),queue=[];sockets.push(socket);route.onMessage(raw=>socket.readyState===1?socket.send(raw):queue.push(raw));socket.on('open',()=>queue.splice(0).forEach(x=>socket.send(x)));socket.on('message',x=>{try{route.send(x.toString());}catch{}});socket.on('error',()=>{});route.onClose(()=>socket.close());});
  await context.addInitScript(({record,token,spec,seen})=>{sessionStorage.setItem('ayothaya-entry-v1',JSON.stringify({owner:'guest',serverId:'server-1',slotId:'slot-1'}));sessionStorage.setItem('ayothaya-local-network:slot-1',JSON.stringify({token,serverId:'server-1',slotId:'slot-1'}));localStorage.setItem('ayothaya-character-v2:slot-1',JSON.stringify(record));localStorage.setItem('ayothaya.lang','th');localStorage.setItem('ayothaya-coach-off','1');localStorage.setItem('ayothaya-perf',JSON.stringify({quality:spec.quality,fps:60}));localStorage.setItem('ayothaya-welcome:ayothaya-story:server-1:slot-1','1');localStorage.setItem('ayothaya-cinematic155:server-1:slot-1',JSON.stringify(seen));},{record,token:seed.token,spec,seen:STORY.flatMap(q=>q.steps.map((_,i)=>'story:'+q.id+':'+i))});
  await page.goto(base+'/game.html?server=server-1&map='+map.id+'&weather=clear');await page.waitForFunction(()=>window.__ayothaya?.lighting.actors.actors.size>0&&document.getElementById('online-button')?.dataset.state==='online',null,{timeout:120000});await page.waitForTimeout(1600);await page.evaluate(()=>{for(const d of document.querySelectorAll('dialog[open]'))d.close();document.activeElement?.blur();});
  const result=await page.evaluate(async()=>{const T=await import('./vendor/build/three.module.js'),l=window.__ayothaya,actors=[...l.lighting.actors.actors.values()],sprites=actors.filter(s=>s.source.isSprite&&s.proxy.visible),ray=new T.Raycaster(),p=new T.Vector3(),scale=new T.Vector3(),q=new T.Quaternion();let pickable=0;
   for(const s of sprites.slice(0,8)){s.source.matrixWorld.decompose(p,q,scale);p.addScaledVector(new T.Vector3().setFromMatrixColumn(l.camera.matrixWorld,1),(.5-s.source.center.y)*scale.y).project(l.camera);ray.setFromCamera(new T.Vector2(p.x,p.y),l.camera);if(ray.intersectObject(s.source).length)pickable++;}
   return {map:l.map.id,mood:l.lighting.profile.mood,actors:actors.length,visible:actors.filter(s=>s.proxy.visible).length,sprites:sprites.length,pickable,casters:actors.filter(s=>s.proxy.visible&&s.proxy.castShadow).length,contacts:actors.filter(s=>s.foot.visible).length,shadows:l.renderer.shadowMap.enabled,sourceLayers:actors.every(s=>s.source.layers.mask===1),sourceVisible:actors.some(s=>s.source.visible&&s.source.material.visible),position:{x:l.game.world.player.x,z:l.game.world.player.z}};
  });
  assert.equal(result.map,spec.map);assert.ok(result.visible>0&&result.casters>0&&result.sourceLayers&&result.sourceVisible);assert.ok(result.sprites===0||result.pickable>0);assert.equal(result.shadows,spec.quality!=='low');if(spec.quality==='low')assert.ok(result.contacts>0);
  await page.locator('#menu-bag').evaluate(e=>e.click());await page.waitForTimeout(200);assert.ok(await page.locator('dialog[open]').count());await page.evaluate(()=>{for(const d of document.querySelectorAll('dialog[open]'))d.close();document.activeElement?.blur();});
  await page.keyboard.down('d');await page.waitForTimeout(450);await page.keyboard.up('d');await page.waitForTimeout(400);const after=await page.evaluate(()=>({x:window.__ayothaya.game.world.player.x,z:window.__ayothaya.game.world.player.z}));assert.ok(Math.hypot(after.x-result.position.x,after.z-result.position.z)>.1,'movement');
  await page.screenshot({path:fileURLToPath(new URL('game-'+spec.map+'-'+spec.quality+'.png',out))});assert.deepEqual(errors,[]);checks.push({spec,...result,menu:true,moved:true,errors});console.log(JSON.stringify(checks.at(-1)));await context.close();
 }
 await writeFile(new URL('game-checks.json',out),JSON.stringify(checks,null,2));
}finally{for(const s of sockets)s.terminate();await browser.close();await host.close();}
