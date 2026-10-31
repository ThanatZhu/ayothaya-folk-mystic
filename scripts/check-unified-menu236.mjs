import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
// Pass PLAYWRIGHT_MODULE on another workstation, or install playwright locally.
const fallback='file:///C:/Users/WIN%2011%20PRO/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright').catch(()=>import(fallback));
const root=process.cwd(),out=path.join(root,'outputs/menu-migration236');await fs.mkdir(out,{recursive:true});
const b=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||'msedge',headless:true});
const mime={'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.ttf':'font/ttf'};
const reports=[];
try{for(const [width,height]of [[1440,900],[844,390],[390,844],[320,568]]){
 const p=await b.newPage({viewport:{width,height}});const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.route('http://menu.test/**',async r=>{const url=new URL(r.request().url());if(url.pathname==='/test')return r.fulfill({contentType:'text/html',body:'<!doctype html><meta charset="utf-8"><body><style>dialog{width:600px;max-width:90vw;height:300px} .account-card{position:relative;width:260px;height:220px;overflow:auto}</style><script type="module" src="/jade-surfaces222.js"></script></body>'});const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));if(!file.startsWith(root+path.sep))return r.fulfill({status:403,body:''});try{return r.fulfill({body:await fs.readFile(file),contentType:mime[path.extname(file)]||'application/octet-stream'});}catch{return r.fulfill({status:404,body:''});}});
 await p.goto('http://menu.test/test');await p.waitForFunction(()=>document.querySelector('#unified-menu236')?.sheet);
 const rows=await p.evaluate(async()=>{
  // Old styles arriving late must not restore former menu frames or textures.
  for(const href of ['ui-kit.css','craft176.css','npc-conversation155.css','painted-panels150.css','premium-hub.css'])await new Promise((resolve,reject)=>{const l=document.createElement('link');l.rel='stylesheet';l.href=href;l.onload=resolve;l.onerror=()=>reject(Error('Stylesheet failed: '+href));document.head.append(l);});
  const settle=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));const result=[];
  for(const id of ['bag-window','craft-window','npc-dialog','mail-window','premium-store-window','future-menu-900','gacha-window','pet-window','quest-cinematic','boss-victory','item-hover221','boss-live-meter']){
   const d=document.createElement('dialog');d.id=id;if(id==='craft-window')d.dataset.craft176='';d.innerHTML='<header><h2>หัวข้อภาษาไทยยาวเพื่อทดสอบหน้าต่าง</h2><button id="test-close">×</button></header><p>เนื้อหา</p>';d.querySelector('button').onclick=()=>d.close();document.body.append(d);d.showModal();await settle();const skin=d.querySelector(':scope > .menu-skin236'),s=skin&&getComputedStyle(skin,'::before');result.push({id,themed:!!skin,frame:skin&&getComputedStyle(skin,'::after').borderImageSource,back:s?.backgroundImage,x:s?.left,y:s?.top,rootFrame:getComputedStyle(d).borderImageSource,headerAfter:getComputedStyle(d.querySelector('header'),'::after').display});d.querySelector('button').click();if(d.open)throw Error('Close handler changed');
   if(skin){d.innerHTML='<p>rerender</p>';await settle();if(d.querySelectorAll(':scope > .menu-skin236').length!==1)throw Error('Missing/repeated frame after innerHTML replacement');}d.remove();
  }
  const parent=document.createElement('div');parent.className='gacha-overlay';parent.innerHTML='<dialog id="rates-child"></dialog>';document.body.append(parent);await settle();if(parent.querySelector('.unified-menu236'))throw Error('Gacha child reskinned');parent.remove();
  const overlay=document.createElement('section');overlay.id='account-panel';overlay.setAttribute('role','dialog');overlay.innerHTML='<div class="account-card"><p style="height:800px">Scrollable settings</p></div>';document.body.append(overlay);await settle();const card=overlay.firstElementChild,skin=card.querySelector('.menu-skin236'),before=skin.getBoundingClientRect().top,max=card.scrollHeight;card.scrollTop=150;await settle();if(Math.abs(skin.getBoundingClientRect().top-before)>1)throw Error('Frame moved with scroll');if(card.scrollHeight!==max)throw Error('Pinned frame grew scrolling extent');if(overlay.classList.contains('unified-menu236'))throw Error('Backdrop got frame');overlay.remove();
  const nav=document.createElement('nav');nav.id='game-menu';document.body.append(nav);nav.classList.add('phone-open');await settle();if(!nav.querySelector('.menu-skin236'))throw Error('Phone menu missing frame');nav.classList.remove('phone-open');await settle();if(nav.querySelector('.menu-skin236'))throw Error('Frame left on regular HUD');nav.remove();
  return result;
 });
 for(const r of rows){const excluded=['gacha-window','pet-window','quest-cinematic','boss-victory','item-hover221','boss-live-meter'].includes(r.id);assert.equal(r.themed,!excluded,r.id);if(excluded)continue;assert.match(r.frame,/ui-unified236\/frame.png/);assert.match(r.back,/ui-unified236\/matte-jade.png/);assert.equal(r.rootFrame,'none');assert.equal(r.headerAfter,'none');assert.ok(Math.abs(parseFloat(r.x)-(width<=700||height<=550?13.12:16.4))<.05);assert.ok(Math.abs(parseFloat(r.y)-(width<=700||height<=550?15.84:19.8))<.05);}
 assert.deepEqual(errors,[]);reports.push({width,height,rows});await p.close();
}await fs.writeFile(path.join(out,'regression.json'),JSON.stringify(reports,null,2));console.log('Unified menu regression: 4 viewports; late CSS, future dialogs, rerender, scrolling, exclusions, phone menu and close actions passed.');}finally{await b.close();}
