import {mkdir,mkdtemp,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {WebSocket} from 'ws';
import {LocalStore} from '../server/storage.js';
import {createHost} from '../server/host.js';
import {initialSave} from '../realm-state.js';
import {levelStart,XP_CURVE} from '../experience.js';
import {STORY} from '../story-quests.js';
const out=new URL('../outputs/performance197/',import.meta.url);await mkdir(out,{recursive:true});
const catalog=JSON.parse(await readFile(new URL('../maps/world.json',import.meta.url),'utf8'));
const origins=[],store=await new LocalStore(await mkdtemp(fileURLToPath(new URL('store-',out)))).init();
const host=await createHost({mode:'local',store,catalog,origins,serveStatic:true});
await new Promise(r=>host.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+host.server.address().port;origins.push(base);
const {chromium}=await import('file:///C:/Users/WIN%2011%20PRO/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const browser=await chromium.launch({channel:'msedge',headless:true}),sockets=[],results=[];
try{
 const seed=await store.createLocal({name:'PerformanceQA',gender:'male'}),record=store.rows.get(seed.uid);
 record.character.classId='novice';record.xpCurve=XP_CURVE;record.state=initialSave();record.state.mapId='ayutthaya';record.state.position={x:0,z:0};record.state.traveler.baseXp=levelStart(99);record.story={v:4,quest:STORY.length,step:0,count:0,done:true};
 const context=await browser.newContext({viewport:{width:1920,height:944},deviceScaleFactor:1});await context.grantPermissions(['local-network-access'],{origin:base});
 await context.route('http://127.0.0.1:8787/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'}));
 await context.routeWebSocket('ws://127.0.0.1:8787/realtime',route=>{const socket=new WebSocket(base.replace('http','ws')+'/realtime',{origin:base}),queue=[];sockets.push(socket);route.onMessage(raw=>socket.readyState===1?socket.send(raw):queue.push(raw));socket.on('open',()=>queue.splice(0).forEach(x=>socket.send(x)));socket.on('message',x=>{try{route.send(x.toString());}catch{}});socket.on('error',()=>{});route.onClose(()=>socket.close());});
 await context.addInitScript(({record,token,seen})=>{sessionStorage.setItem('ayothaya-entry-v1',JSON.stringify({owner:'guest',serverId:'server-1',slotId:'slot-1'}));sessionStorage.setItem('ayothaya-local-network:slot-1',JSON.stringify({token,serverId:'server-1',slotId:'slot-1'}));localStorage.setItem('ayothaya-character-v2:slot-1',JSON.stringify(record));localStorage.setItem('ayothaya.lang','th');localStorage.setItem('ayothaya-coach-off','1');localStorage.setItem('ayothaya-perf',JSON.stringify({quality:'high',fps:60}));localStorage.setItem('ayothaya-welcome:ayothaya-story:server-1:slot-1','1');localStorage.setItem('ayothaya-cinematic155:server-1:slot-1',JSON.stringify(seen));},{record,token:seed.token,seen:STORY.flatMap(q=>q.steps.map((_,i)=>'story:'+q.id+':'+i))});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/game.html?server=server-1&map=ayutthaya');await page.waitForFunction(()=>window.__ayothaya?.lighting.actors.actors.size>0&&document.getElementById('online-button')?.dataset.state==='online',null,{timeout:120000});
 await page.evaluate(()=>{for(const d of document.querySelectorAll('dialog[open]'))d.close();document.activeElement?.blur();});
 for(const quality of ['high','mid','low']){
  await page.locator('#perf-quality').selectOption(quality,{force:true});await page.waitForTimeout(2000);
  const result=await page.evaluate(async()=>{
   const v=window.__ayothaya,stats={render:{ms:0,n:0},actors:{ms:0,n:0},game:{ms:0,n:0}},restore=[];
   for(const [obj,key,name] of [[v.renderer,'render','render'],[v.lighting.actors,'update','actors'],[v.game,'update','game']]){const original=obj[key];obj[key]=function(...args){const t=performance.now();try{return original.apply(this,args);}finally{stats[name].ms+=performance.now()-t;stats[name].n++;}};restore.push(()=>obj[key]=original);}
   const longTasks=[];const observer=new PerformanceObserver(list=>longTasks.push(...list.getEntries().map(e=>e.duration)));observer.observe({type:'longtask'});
   const frames=[],start=performance.now();let previous=start;
   await new Promise(resolve=>{function sample(t){frames.push(t-previous);previous=t;if(t-start<6000)requestAnimationFrame(sample);else resolve();}requestAnimationFrame(sample);});
   observer.disconnect();restore.forEach(fn=>fn());const gl=v.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info'),sorted=frames.slice().sort((a,b)=>a-b);
   let objects=0,meshes=0;v.scene.traverse(o=>{objects++;if(o.isMesh)meshes++;});
   return {elapsed:performance.now()-start,frameCallbacks:frames.length,fps:frames.length*1000/(previous-start),p95FrameMs:sorted[Math.floor(sorted.length*.95)],stats,objects,meshes,actors:v.lighting.actors.actors.size,draw:v.renderer.info.render,memory:v.renderer.info.memory,ratio:v.renderer.getPixelRatio(),gpu:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),ping:document.getElementById('online-button')?.dataset.ping,longTasks};
  });
  results.push({quality,...result,errors});console.log(JSON.stringify(results.at(-1)));await page.screenshot({path:fileURLToPath(new URL(quality+'.png',out))});
 }
 await writeFile(new URL((process.env.PROFILE_LABEL??'baseline')+'.json',out),JSON.stringify(results,null,2));
}finally{for(const s of sockets)s.terminate();await browser.close();await host.close();}

