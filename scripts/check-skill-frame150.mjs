import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {ROLES} from '../assets/skills-next/catalog.js';
const root=path.resolve(fileURLToPath(new URL('../',import.meta.url))),out=new URL('../outputs/skill150/',import.meta.url);await mkdir(out,{recursive:true});
const source=(await readFile(path.join(root,'game.html'),'utf8')).replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'');
const fixture=source.replace('</body>',`<script type="module">
 import {CombatWorld} from './combat-core.js';import {createSkillWindow} from './skill-window.js?v=skill150';
 document.querySelector('#journey-loading')?.remove();document.querySelector('#orientation-gate')?.remove();document.body.classList.add('field-hud','hud63');
 const q=new URL(location.href).searchParams,classId=q.get('class')||'shaman',jobId=q.get('branch')||'',world=new CombatWorld({classId,jobId,roleSkills:classId!=='novice'});world.skillLevels=world.skills.map(s=>s.reserved?0:s.passive?1:10);world.skillPoints=12;
 const game={world,upgradeSkill(i){world.skillLevels[i]++;return true;}},view=createSkillWindow({game,classId});window.__skillFrame={game,view};view.open();
 document.body.dataset.ready='true';
 </script><style>body{background:radial-gradient(ellipse at 50% 45%,#4d6651,#0c211d)}#game-shell{background:repeating-linear-gradient(35deg,#ffffff03 0 1px,transparent 1px 70px)}</style></body>`);
const server=http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');if(url.pathname==='/__skill150'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(fixture);return;}const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));if(!file.startsWith(root+path.sep))throw Error('path');const mime={'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.ttf':'font/ttf','.json':'application/json'};if(!mime[path.extname(file)])throw Error('extension');res.setHeader('Content-Type',mime[path.extname(file)]);res.end(await readFile(file));}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
const {chromium}=await import(pathToFileURL(process.argv[2]).href),browser=await chromium.launch({channel:'msedge',headless:true}),errors=[],failed=[],checks=[];
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});page.on('pageerror',e=>{errors.push(e.message);console.error('PAGE',e.message);});page.on('response',r=>{if(r.status()>=400){failed.push(r.url());console.error('HTTP',r.status(),r.url());}});
 const cases=[{id:'novice',branches:[{id:''}]},...ROLES];
 for(const role of cases)for(const branch of role.branches){
  await page.goto(base+'/__skill150?class='+role.id+'&branch='+branch.id);await page.waitForSelector('body[data-ready=true]');await page.waitForFunction(()=>document.querySelector('link[data-skill-tree]')?.sheet);await page.waitForTimeout(120);
  for(const tab of ['base','master']){
   await page.locator('[data-tab='+tab+']').click();await page.waitForTimeout(40);
   const result=await page.evaluate(()=>{const d=document.getElementById('skill-window'),t=d.querySelector('.skill-tree'),r=d.getBoundingClientRect();return {classId:d.dataset.profession,count:[...t.querySelectorAll('.skill-node')].filter(n=>!n.hidden).length,frame:getComputedStyle(d,'::before').borderImageSource,nodeFrame:getComputedStyle(t.querySelector('.skill-node:not([hidden])'),'::after').borderImageSource,width:r.width,height:r.height,x:r.x,y:r.y,treeScroll:t.scrollWidth-t.clientWidth,windowScroll:d.scrollHeight-d.clientHeight};});
   assert.equal(result.classId,role.id);assert.equal(result.count,role.id==='novice'?(tab==='base'?10:5):(tab==='base'?6:5));assert.ok(result.frame.includes('ui-skill150/window.webp'));assert.ok(result.nodeFrame.includes('ui-skill150/node.webp'));assert.ok(result.windowScroll<2,JSON.stringify(result));assert.ok(result.treeScroll<2,JSON.stringify(result));checks.push({role:role.id,branch:branch.id,tab,...result});
   await page.screenshot({path:fileURLToPath(new URL(role.id+'-'+branch.id+'-'+tab+'.png',out))});
  }
 }
 // All tree sizes, both tabs, and the longest legacy tree, with real production styles.
 for(const role of ['novice','shaman']){
  await page.goto(base+'/__skill150?class='+role+'&branch='+(role==='novice'?'':'spirit-master'));await page.waitForSelector('body[data-ready=true]');await page.waitForFunction(()=>document.querySelector('link[data-skill-tree]')?.sheet);
  for(const [width,height] of [[1920,1080],[1440,900],[1024,768],[844,390],[667,375],[390,844],[320,568]]){
   await page.setViewportSize({width,height});await page.evaluate(()=>document.body.classList.toggle('mobile-play',innerWidth<900));
   for(const tab of ['base','master']){
    await page.locator('[data-tab='+tab+']').click();await page.waitForTimeout(50);
    const fit=await page.evaluate(()=>{const d=document.getElementById('skill-window'),r=d.getBoundingClientRect(),close=d.querySelector('#skill-close').getBoundingClientRect(),workspace=d.querySelector('.skill-workspace');return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,close:close.bottom,outerScroll:d.scrollHeight-d.clientHeight,documentOverflow:document.documentElement.scrollWidth-innerWidth,innerOverflow:workspace.scrollWidth-workspace.clientWidth};});
    assert.ok(fit.x>=-1&&fit.y>=-1&&fit.right<=width+1&&fit.bottom<=height+1,JSON.stringify({role,width,height,tab,fit}));assert.ok(fit.outerScroll<2&&fit.documentOverflow<2&&fit.innerOverflow<2,JSON.stringify({role,width,height,tab,fit}));assert.ok(fit.close<=height);checks.push({role,width,height,tab,fit});
    await page.screenshot({path:fileURLToPath(new URL(role+'-'+width+'x'+height+'-'+tab+'.png',out))});
   }
  }
 }
 await page.setViewportSize({width:1440,height:900});await page.goto(base+'/__skill150?class=swordsman&branch=guardian');await page.waitForSelector('body[data-ready=true]');await page.waitForFunction(()=>document.querySelector('link[data-skill-tree]')?.sheet);
 await page.evaluate(()=>{const w=window.__skillFrame.game.world;w.skillLevels[0]=1;});await page.waitForTimeout(600);await page.locator('.skill-node[data-slot="0"]>button').click();assert.equal(await page.evaluate(()=>window.__skillFrame.game.world.skillLevels[0]),2);
 await page.locator('.skill-node[data-slot="4"]').click();assert.ok((await page.locator('#skill-detail strong').textContent()).includes('ผ่าเกราะ'));
 await page.locator('#skill-close').click();assert.equal(await page.locator('#skill-window').isVisible(),false);await page.keyboard.press('KeyK');assert.equal(await page.locator('#skill-window').isVisible(),true);
 assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);await writeFile(new URL('checks.json',out),JSON.stringify({checks,errors,failed},null,2));console.log(JSON.stringify({passed:true,checks:checks.length,professions:cases.length,branches:cases.reduce((n,r)=>n+r.branches.length,0),errors,failed}));
}finally{await browser.close();await new Promise(r=>server.close(r));}
