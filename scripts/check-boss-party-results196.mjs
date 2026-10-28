// Production boss-browser/results modules and styles, with an authority-generated encounter.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {recordBossDamage,finishBossDamage} from '../boss-results.js';
const root=fileURLToPath(new URL('../',import.meta.url)),out=new URL('../outputs/boss-party-results196/',import.meta.url);
await mkdir(out,{recursive:true});
const fixture=`<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="typography.css"><link rel="stylesheet" href="ui-kit.css"><script type="importmap">{"imports":{"three":"./vendor/build/three.module.js","three/addons/":"./vendor/addons/"}}</script><style>body{margin:0;background:#0b1e19;color:#f6e7bf}#game-menu{padding:8px}#game-menu>button{font:inherit}</style></head><body><div id="game-shell"><nav id="game-menu"></nav></div><script type="module">
import {createBossBrowserUI} from './boss-browser-ui.js?v=party-results196';
const catalog=await fetch('./maps/world.json').then(r=>r.json()),listeners=[];
const game={online:false,world:{networkSelfId:'A',market(){}},clearInput(){},onEvent(fn){listeners.push(fn);}};
window.review={game,ui:createBossBrowserUI({game,catalog,map:catalog.maps.find(m=>m.id==='rice-fields'),worldUI:{}}),emit(event){for(const fn of listeners)fn(event);}};
</script></body></html>`;
const mime={'.js':'text/javascript','.json':'application/json','.css':'text/css','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.ttf':'font/ttf'};
const server=http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');if(url.pathname==='/'){res.setHeader('Content-Type','text/html');res.end(fixture);return;}const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));if(!file.startsWith(root)){res.writeHead(403).end();return;}res.setHeader('Content-Type',mime[path.extname(file)]??'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+server.address().port;
const peer=(id,name,partyId=null)=>({id,key:'private-'+id,partyId,character:{name,classId:'swordsman'}});
const room={id:'room',map:{id:'rice-fields',name:'ทุ่งขวัญข้าว'},channel:1,peers:new Set(['A','B','C','D'])},a=peer('A','คณะนักล่าแห่งอยุธยา','party-1'),b=peer('B','ผู้ร่วมรบ','party-1'),support=peer('D','ผู้ช่วยฟื้นฟู','party-1'),solo=peer('C','นักรบเดี่ยว');
const party={id:'party-1',leaderName:a.character.name,members:[a,b,support]},mob={id:1};
recordBossDamage(room,mob,a,400000,0,party);recordBossDamage(room,mob,solo,450000,2);recordBossDamage(room,mob,b,150000,8,party);
const report=finishBossDamage(room,mob,{id:'straw-king',name:'ราชาหุ่นฟางเพลิง'},10);
const {chromium}=await import(pathToFileURL(process.argv[2]).href),browser=await chromium.launch({channel:'msedge',headless:true}),errors=[],checks=[];
try{
 for(const [width,height] of [[1440,900],[844,390],[390,844],[320,568]]){
  const mobile=width<1000,context=await browser.newContext({viewport:{width,height},isMobile:mobile,hasTouch:mobile}),page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));await page.goto(base);await page.waitForFunction(()=>window.review);await page.evaluate(()=>document.fonts.ready);
  await page.evaluate(report=>window.review.emit(report),report);await page.locator('#boss-browser[open]').waitFor();await page.locator('.boss-result-row').first().waitFor();
  assert.equal(await page.locator('.boss-result-entry').count(),2);assert.equal(await page.locator('.boss-result-entry[data-kind=solo] .boss-result-player strong').textContent(),'นักรบเดี่ยว');
  assert.equal(await page.locator('.boss-winner').textContent(),'นักรบเดี่ยว','MVP is still the highest individual');
  assert.equal(await page.locator('.boss-party-members').isVisible(),false);
  const summary=page.locator('.boss-party>summary');
  if(mobile)await summary.tap();else{await summary.focus();await page.keyboard.press('Enter');}
  assert.equal(await page.locator('.boss-party-members').isVisible(),true);assert.equal(await page.locator('.boss-member-row').count(),3);
  assert.deepEqual(await page.locator('.boss-member-row .boss-damage').allTextContents(),['400,000','150,000','0']);
  assert.match(await page.locator('.boss-party>summary .boss-share').textContent(),/55\.0%$/);assert.match(await page.locator('.boss-party>summary .boss-dps').textContent(),/55,000$/);
  assert.equal(await page.locator('.boss-result-entry[data-kind=solo] details').count(),0);
  const bounds=await page.locator('#boss-browser').boundingBox();assert.ok(bounds.x>=-1&&bounds.y>=-1&&bounds.x+bounds.width<=width+1&&bounds.y+bounds.height<=height+1,JSON.stringify(bounds));
  const overflow=await page.locator('#boss-results').evaluate(n=>({scroll:n.scrollWidth,width:n.clientWidth}));assert.ok(overflow.scroll<=overflow.width+1,JSON.stringify(overflow));
  await page.screenshot({path:fileURLToPath(new URL('results-'+width+'.png',out))});
  if(mobile)await summary.tap();else await page.keyboard.press('Space');assert.equal(await page.locator('.boss-party-members').isVisible(),false);
  await page.evaluate(report=>window.review.emit(report),report);assert.equal(await page.evaluate(()=>window.review.ui.results.results.length),1,'duplicate event ignored');
  await page.locator('#boss-browser-close').click();
  await page.evaluate(report=>{window.review.game.world.networkSelfId='watcher';window.review.emit({...report,encounterId:'spectator-report'});},report);
  assert.equal(await page.locator('#boss-browser').evaluate(n=>n.open),false,'spectators are not interrupted');
  await page.evaluate(()=>window.review.ui.results.open());assert.equal(await page.locator('#boss-browser').evaluate(n=>n.open),true,'history can still be opened');
  if(width===390){
   await page.addScriptTag({url:base+'/i18n-en.js'});await page.evaluate(()=>localStorage.setItem('ayothaya.lang','en'));await page.addScriptTag({url:base+'/i18n.js'});
   assert.equal(await page.locator('.boss-party>summary .boss-result-player strong').textContent(),'Party of คณะนักล่าแห่งอยุธยา');
   assert.equal(await page.locator('.boss-member-row .boss-result-player strong').first().textContent(),'คณะนักล่าแห่งอยุธยา');
   assert.ok(!/[฀-๿]/.test(await page.locator('.boss-party>summary .boss-stat-label').allTextContents().then(a=>a.join(''))));
   await page.locator('.boss-party>summary').tap();await page.screenshot({path:fileURLToPath(new URL('results-390-en.png',out))});
  }
  checks.push({width,height,input:mobile?'touch':'keyboard',partyMembers:3,soloRows:1,overflow:false});await context.close();
 }
 assert.deepEqual(errors,[]);await writeFile(new URL('report.json',out),JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks,errors},null,2));
}finally{await browser.close();await new Promise(r=>server.close(r));}
