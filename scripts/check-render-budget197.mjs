import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url),out=new URL('outputs/performance197/',root);await mkdir(out,{recursive:true});
const html='<script type="importmap">'+JSON.stringify({imports:{three:'/vendor/build/three.module.js','three/addons/':'/vendor/addons/'}})+'</script>';
const server=http.createServer(async(req,res)=>{try{const p=new URL(req.url,'http://localhost').pathname;if(p==='/'){res.setHeader('Content-Type','text/html');res.end(html);return;}if(p!=='/soft-look.js'&&!p.startsWith('/vendor/'))throw Error('not-found');if(p.includes('..'))throw Error('path');const body=await readFile(new URL('.'+p,root));res.setHeader('Content-Type','text/javascript');res.end(body);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
const {chromium}=await import('file:///C:/Users/WIN%2011%20PRO/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage({viewport:{width:640,height:480}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(base);
 const result=await page.evaluate(async()=>{
  const T=await import('/vendor/build/three.module.js'),{createSoftLook}=await import('/soft-look.js');
  const renderer=new T.WebGLRenderer({antialias:true});renderer.setSize(640,480);renderer.shadowMap.enabled=true;document.body.append(renderer.domElement);
  const scene=new T.Scene();scene.background=new T.Color('#c9d8c4');const camera=new T.PerspectiveCamera(50,640/480,.1,100);camera.position.set(4,5,8);camera.lookAt(0,0,0);camera.layers.enable(1);
  scene.add(new T.HemisphereLight(0xffffff,0x334433,2));const sun=new T.DirectionalLight(0xffffff,2);sun.position.set(3,8,4);sun.castShadow=true;sun.shadow.mapSize.set(256,256);scene.add(sun);
  const floor=new T.Mesh(new T.BoxGeometry(9,.1,9),new T.MeshLambertMaterial({color:'#79956b'}));floor.position.y=-1;floor.receiveShadow=true;scene.add(floor);
  const material=new T.MeshLambertMaterial({color:'#d0b15e'}),actor=new T.Mesh(new T.BoxGeometry(1,2,1),material);actor.castShadow=true;actor.layers.enable(1);scene.add(actor);
  const behind=new T.Mesh(new T.BoxGeometry(2,2,.2),new T.MeshLambertMaterial({color:'#225544'}));behind.position.set(0,0,1);behind.castShadow=true;scene.add(behind);
  const look=createSoftLook({renderer,scene,camera});look.setSize(640,480);look.setEnabled(true);look.setPerformanceBudget('reduced');
  let shadowDraws=0;const original=renderer.shadowMap.render;renderer.shadowMap.render=function(lights,...args){if(lights.length&&renderer.shadowMap.enabled&&(renderer.shadowMap.autoUpdate||renderer.shadowMap.needsUpdate))shadowDraws++;return original.call(this,lights,...args);};
  const cases=[];
  for(const enabled of [true,false]){look.setEnabled(enabled);shadowDraws=0;look.render();cases.push({enabled,shadowDraws,shadowAuto:renderer.shadowMap.autoUpdate,mask:camera.layers.mask,restoredMaterial:actor.material===material,bloom:look.bloomEnabled,hasShadow:!!sun.shadow.map});}
  look.setPerformanceBudget('full');const full=look.bloomEnabled;look.setPerformanceBudget('reduced');const reduced=look.bloomEnabled;
  // Make the actor overlay fail: all frame state must still be restored.
  const render=renderer.render;renderer.render=function(...args){if(camera.layers.mask===2)throw Error('intentional overlay failure');return render.apply(this,args);};
  let threw=false;try{look.setEnabled(true);look.render();}catch(e){threw=e.message==='intentional overlay failure';}
  const exception={threw,shadowAuto:renderer.shadowMap.autoUpdate,mask:camera.layers.mask,restoredMaterial:actor.material===material,background:!!scene.background};
  renderer.render=render;look.setEnabled(true);look.render();
  return {cases,full,reduced,exception};
 });
 assert.deepEqual(errors,[]);
 for(const c of result.cases){assert.equal(c.shadowDraws,1);assert.ok(c.shadowAuto&&c.restoredMaterial&&c.hasShadow);assert.equal(c.mask,3);assert.equal(c.bloom,false);}
 assert.equal(result.full,true);assert.equal(result.reduced,false);
 assert.deepEqual(result.exception,{threw:true,shadowAuto:true,mask:3,restoredMaterial:true,background:true});
 await page.screenshot({path:fileURLToPath(new URL('shadow-reuse.png',out))});await writeFile(new URL('render-check.json',out),JSON.stringify({result,errors},null,2));console.log(JSON.stringify({result,errors}));
}finally{await browser.close();await new Promise(r=>server.close(r));}

