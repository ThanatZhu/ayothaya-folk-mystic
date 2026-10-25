import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
const root=path.resolve(fileURLToPath(new URL('../',import.meta.url))),out=path.join(root,'outputs/light156');await mkdir(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.glb':'model/gltf-binary','.wasm':'application/wasm','.woff2':'font/woff2','.ttf':'font/ttf'};
const server=http.createServer(async(req,res)=>{try{const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname),file=path.resolve(root,'.'+(name==='/'?'/rice-light-lab.html':name)),relative=path.relative(root,file);if(!file.startsWith(root+path.sep)||!mime[path.extname(file)]||relative.includes(path.sep)&&!['assets','maps','vendor'].includes(relative.split(path.sep)[0]))throw Error('path');const data=await readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)],'Cache-Control':'no-store'});res.end(data);}catch{res.writeHead(404);res.end('Not found');}});
await new Promise(r=>server.listen(process.argv.includes('--serve')?8923:0,'127.0.0.1',r));
const port=server.address().port,base='http://127.0.0.1:'+port;
if(process.argv.includes('--serve')){console.log(base+'/rice-light-lab.html');process.on('SIGINT',()=>server.close());}
else{
 const {chromium}=await import('file:///C:/Users/WIN%2011%20PRO/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
 const browser=await chromium.launch({channel:'msedge',headless:true,args:['--explicitly-allowed-ports='+port]});const checks=[];
 try{
  for(const spec of [{name:'desktop',width:1440,height:900,mobile:false},{name:'phone-landscape',width:844,height:390,mobile:true},{name:'phone-portrait',width:390,height:844,mobile:true}]){
   const context=await browser.newContext({viewport:{width:spec.width,height:spec.height},deviceScaleFactor:1,hasTouch:spec.mobile,isMobile:spec.mobile});const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE',e.message);});page.on('console',m=>{if(m.type()==='error'){errors.push(m.text());console.log('CONSOLE',m.text());}});page.on('requestfailed',r=>console.log('REQUEST',r.url(),r.failure()));
   await page.goto(base+'/rice-light-lab.html?quality='+(spec.mobile?'mobile':'desktop'));await page.waitForFunction(()=>window.__riceLight?.ready,{},{timeout:120000});await page.waitForTimeout(2500);
   await page.evaluate(()=>window.__riceLight.setPaused(true));
   const layout=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight,sceneCount:window.__riceLight.scenes.length,grass:window.__riceLight.scenes.map(v=>v.meadow.count),contacts:window.__riceLight.scenes[1].contact.group.children.reduce((a,c)=>a+c.count,0),buttons:[...document.querySelectorAll('button,select,input')].map(e=>{const r=e.getBoundingClientRect();return {id:e.id||e.textContent,inBounds:r.x>=0&&r.y>=0&&r.right<=innerWidth&&r.bottom<=innerHeight};})}));
   await page.screenshot({path:path.join(out,spec.name+'-split.png')});
   if(!spec.mobile){for(const [name,value] of [['original',100],['warm',0]]){await page.evaluate(v=>window.__riceLight.setSplit(v),value);await page.waitForTimeout(300);await page.screenshot({path:path.join(out,spec.name+'-'+name+'.png')});}}
   await page.getByRole('button',{name:'ริมคลอง',exact:true}).click();await page.waitForTimeout(300);await page.screenshot({path:path.join(out,spec.name+'-bridge.png')});
   await page.getByRole('button',{name:'ใต้ร่มไม้',exact:true}).click();await page.waitForTimeout(300);await page.screenshot({path:path.join(out,spec.name+'-grove.png')});
   let benchmark=null;if(process.argv.includes('--bench')&&spec.name!=='phone-portrait'){await page.getByRole('button',{name:'ริมคลอง',exact:true}).click();benchmark=await page.evaluate(()=>window.__riceLight.measure({samples:90}));}
   checks.push({name:spec.name,layout,errors,benchmark});console.log(JSON.stringify(checks.at(-1)));
   if(layout.overflow||layout.buttons.some(b=>!b.inBounds)||errors.length)throw Error(spec.name+' QA failed');await context.close();
  }
  await writeFile(path.join(out,process.argv.includes('--bench')?'benchmark.json':'checks.json'),JSON.stringify(checks,null,2));
 }finally{await browser.close();await new Promise(r=>server.close(r));}
}
