import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const root=path.resolve(fileURLToPath(new URL('../',import.meta.url))),out=path.join(root,'outputs/water158');await mkdir(out,{recursive:true});
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.glb':'model/gltf-binary','.wasm':'application/wasm','.woff2':'font/woff2','.ttf':'font/ttf'};
const server=http.createServer(async(req,res)=>{try{const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname),file=path.resolve(root,'.'+(name==='/'?'/water-lab.html':name)),relative=path.relative(root,file);if(!file.startsWith(root+path.sep)||!types[path.extname(file)]||relative.includes(path.sep)&&!['assets','maps','vendor'].includes(relative.split(path.sep)[0]))throw Error('path');res.writeHead(200,{'Content-Type':types[path.extname(file)],'Cache-Control':'no-store'});res.end(await readFile(file));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(process.argv.includes('--serve')?8924:0,'127.0.0.1',r));const port=server.address().port,base='http://127.0.0.1:'+port;
if(process.argv.includes('--serve'))console.log(base+'/water-lab.html');
else{
 const {chromium}=await import('file:///C:/Users/WIN%2011%20PRO/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
 const browser=await chromium.launch({channel:'msedge',headless:true,args:['--explicitly-allowed-ports='+port]}),checks=[];
 const catalog=JSON.parse(await readFile(path.join(root,'maps/world.json'),'utf8'));
 try{
  const cases=catalog.maps.map(m=>({map:m.id,quality:'desktop',w:1280,h:720}));
  for(const quality of ['mobile','low'])for(const map of ['rice-fields','bamboo-grove','himmapan-edge','naga-cave'])cases.push({map,quality,w:844,h:390});
  cases.push({map:'lotus-marsh',quality:'mobile',w:390,h:844});
  for(const spec of cases){
   const context=await browser.newContext({viewport:{width:spec.w,height:spec.h},deviceScaleFactor:1,hasTouch:spec.quality!=='desktop',isMobile:spec.quality!=='desktop'}),page=await context.newPage(),errors=[];
   page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE',e.message);});page.on('console',m=>{if(m.type()==='error'){errors.push(m.text());console.log('GL',m.text().slice(0,1600));}});
   await page.goto(base+'/water-lab.html?map='+spec.map+'&quality='+spec.quality);await page.waitForFunction(()=>window.__waterLab?.ready,null,{timeout:120000});await page.waitForTimeout(400);
   const result=await page.evaluate(()=>{
    const l=window.__waterLab;l.setPaused(true);l.controls.enableDamping=false;
    const capture=t=>{l.setTime(t);l.render(0);const c=document.createElement('canvas');c.width=innerWidth;c.height=innerHeight;const g=c.getContext('2d');g.drawImage(l.renderer.domElement,0,0);return g.getImageData(0,0,c.width,c.height).data;};
    const a=capture(0),b=capture(2.4);let changed=0;for(let i=0;i<a.length;i+=4)if(Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2])>9)changed++;
    const start=performance.now();for(let i=0;i<12;i++)l.render(0);const cpu=(performance.now()-start)/12;
    return {surfaces:l.motion.water.count,profiles:l.motion.water.states.map(s=>s.profile.kind),changedPixels:changed,cpuSubmissionMs:cpu,draws:l.renderer.info.render.calls,overflow:document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight};
   });
   await page.screenshot({path:path.join(out,spec.map+'-'+spec.quality+'.png')});
   if(spec.map==='himmapan-edge'){await page.getByRole('button',{name:'ดูน้ำตก',exact:true}).click();await page.waitForTimeout(300);await page.screenshot({path:path.join(out,'waterfall-'+spec.quality+'.png')});}
   if(errors.length||result.overflow||spec.map!=='kailash-peak'&&(!result.surfaces||result.changedPixels<3))throw Error(JSON.stringify({spec,result,errors}));
   checks.push({spec,...result,errors});console.log(JSON.stringify(checks.at(-1)));await context.close();
  }
  await writeFile(path.join(out,'checks.json'),JSON.stringify(checks,null,2));
 }finally{await browser.close();await new Promise(r=>server.close(r));}
}
