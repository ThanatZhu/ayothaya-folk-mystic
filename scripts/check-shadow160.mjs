import assert from 'node:assert/strict';
import http from 'node:http';import path from 'node:path';import {fileURLToPath} from 'node:url';import {readFile,writeFile,mkdir} from 'node:fs/promises';
const root=path.resolve(fileURLToPath(new URL('../',import.meta.url))),out=path.join(root,'outputs/shadow160');await mkdir(out,{recursive:true});
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.glb':'model/gltf-binary','.wasm':'application/wasm','.ttf':'font/ttf','.woff2':'font/woff2'};
const server=http.createServer(async(req,res)=>{try{const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname),file=path.resolve(root,'.'+name);if(!file.startsWith(root+path.sep)||!types[path.extname(file)])throw Error('path');const bytes=await readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)],'Cache-Control':'no-store'});res.end(bytes);}catch{res.writeHead(404);res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port;
const {chromium}=await import('file:///C:/Users/WIN%2011%20PRO/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'),browser=await chromium.launch({channel:'msedge',headless:true,args:['--explicitly-allowed-ports='+port]}),checks=[];
try{
 for(const spec of [{width:1280,height:720,art:'synthetic'},{width:844,height:390,art:'synthetic'},{width:1280,height:720,art:'shaman'},{width:844,height:390,art:'shaman'}]){
  const viewport={width:spec.width,height:spec.height};
  const page=await browser.newPage({viewport,deviceScaleFactor:1}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto('http://127.0.0.1:'+port+'/tests/fixtures/actor-shadow160.html?art='+spec.art+(process.argv.includes('--repro')?'&legacy=1':''));await page.waitForFunction(()=>window.__shadow160?.ready,null,{timeout:120000});
  const cases=[['sunRight',{x:12,flip:false}],['shadeLeft',{x:4.4,flip:true}],['returnLeft',{x:12,flip:true}],['unshadowedRight',{x:12,flip:false,shadows:false,occluder:false}],['unshadowedLeft',{x:12,flip:true,shadows:false,occluder:false}],['withoutSelfShadow',{x:12,flip:true,ownShadow:false}]],result={viewport,art:spec.art,errors};
  for(const [name,options] of cases){result[name]=await page.evaluate(o=>window.__shadow160.sample(o),options);await page.screenshot({path:path.join(out,(process.argv.includes('--repro')?'before-':'after-')+spec.art+'-'+viewport.width+'-'+name+'.png')});}
  result.cycles=await page.evaluate(()=>{const rows=[];for(let i=0;i<3;i++){const shade=window.__shadow160.sample({x:4.4,flip:i%2===0}),sun=window.__shadow160.sample({x:12,flip:i%2===0});rows.push({shade,sun});}return rows;});
  checks.push(result);console.log(JSON.stringify(result));
  if(!process.argv.includes('--repro')){assert.deepEqual(errors,[]);assert.ok(Math.abs(result.unshadowedRight.mean-result.unshadowedLeft.mean)<3,'mirroring must not darken unshadowed art');assert.ok(Math.abs(result.sunRight.mean-result.returnLeft.mean)<3,'must regain brightness after leaving shade');assert.ok(result.shadeLeft.mean<result.returnLeft.mean-5,'real environment shade remains');for(const c of result.cycles)assert.ok(Math.abs(c.sun.mean-result.sunRight.mean)<3,'repeat crossings do not accumulate shade');}
  await page.close();
 }
 await writeFile(path.join(out,process.argv.includes('--repro')?'before.json':'after.json'),JSON.stringify(checks,null,2));
}finally{await browser.close();await new Promise(r=>server.close(r));}
