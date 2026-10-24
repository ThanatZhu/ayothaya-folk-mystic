import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {ROLES} from '../assets/skills-next/catalog.js';
import './mobile-review-server.mjs';
const {chromium}=await import(pathToFileURL(process.argv[2]).href),browser=await chromium.launch({channel:'msedge',headless:true}),base=`http://127.0.0.1:${process.env.MOBILE_REVIEW_PORT||8896}`,out=new URL('../outputs/skill-icons/',import.meta.url);await mkdir(out,{recursive:true});const errors=[],failed=[],checked=[];
try{
 const page=await browser.newPage({viewport:{width:1100,height:900}});page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))failed.push(r.url());});
 await page.goto(base+'/skill-buttons-lab.html');await page.locator('body[data-ready=true]').waitFor();
 assert.equal(await page.locator('#classes [data-icon-ready=ready]').count(),112);assert.equal(await page.locator('#novice [data-icon-ready=ready]').count(),10);assert.equal(await page.locator('[data-icon-ready=error]').count(),0);
 await page.locator('#comparison').screenshot({path:fileURLToPath(new URL('shaman-before-after.png',out))});await page.screenshot({path:fileURLToPath(new URL('all-classes.png',out)),fullPage:true});
 const sampling=await page.evaluate(async()=>{
  const {paintSkillRegion,clearSkillIcon}=await import('./assets/skills-next/icon-renderer.js'),c=document.createElement('canvas');c.width=64;c.height=192;const ctx=c.getContext('2d');['#ff0000','#00ff00','#0000ff'].forEach((v,i)=>{ctx.fillStyle=v;ctx.fillRect(0,64*i,64,64);});const url=c.toDataURL(),el=document.createElement('strong'),region=y=>({rect:[0,y,64,64],width:64,height:192});
  const pixel=async()=>{const img=new Image();img.src=el.style.backgroundImage.slice(5,-2);await img.decode();ctx.clearRect(0,0,64,192);ctx.drawImage(img,0,0);return [...ctx.getImageData(32,32,1,1).data];};
  await paintSkillRegion(el,url,region(0));const isolated=await pixel();await Promise.all([paintSkillRegion(el,url,region(0)),paintSkillRegion(el,url,region(128))]);const latest=await pixel();const pending=paintSkillRegion(el,url,region(64));clearSkillIcon(el);await pending;return {isolated,latest,cleared:el.style.backgroundImage};
 });assert.deepEqual(sampling,{isolated:[255,0,0,255],latest:[0,0,255,255],cleared:'none'});
 for(const role of ROLES)for(const branch of role.branches){
  await page.setViewportSize({width:844,height:390});await page.goto(base+'/mobile-fixture.html?role=1&class='+role.id+'&branch='+branch.id);await page.locator('body[data-review=ready]').waitFor();await page.waitForFunction(()=>document.querySelectorAll('#skills [data-icon-ready=ready]').length===11);
  const check=async selector=>{const icons=await page.locator(selector).evaluateAll(es=>es.filter(e=>e.dataset.skillIcon).map(e=>({id:e.dataset.skillIcon,ready:e.dataset.iconReady,bg:e.style.backgroundImage})));assert.equal(icons.length,11,role.id+' '+branch.id+' '+selector);assert.ok(icons.every(i=>i.ready==='ready'&&i.bg.startsWith('url("data:image/png;')));};
  await check('#skills strong');await page.locator('#auto-settings-open').click();await page.waitForFunction(()=>document.querySelectorAll('#auto-hotbar [data-icon-ready=ready]').length===11);await check('#auto-hotbar strong');await check('#auto-skill-choices strong');
  await page.locator('[data-auto-tab=positions]').click();await page.locator('#auto-hotbar [data-slot="0"]').click();await page.locator('#auto-hotbar [data-slot="10"]').click();await page.waitForFunction(()=>document.querySelectorAll('#auto-hotbar [data-icon-ready=ready]').length===11);
  assert.equal(await page.locator('#skills .skill').first().locator('strong').getAttribute('data-skill-icon'),branch.active[0].id,'reordered hotbar artwork');await page.keyboard.press('Escape');
  await page.evaluate(()=>dispatchEvent(new CustomEvent('open-skill-window')));await page.waitForFunction(()=>document.querySelectorAll('#skill-tree [data-icon-ready=ready]').length===11);await check('#skill-tree strong');await page.locator('[data-tab=master]').click();assert.equal(await page.locator('.skill-node:visible').count(),5);await page.locator('#skill-close').click();
  if(role.id==='shaman'&&branch===role.branches[0])await page.screenshot({path:fileURLToPath(new URL('shaman-mobile-hud.png',out)),fullPage:true});checked.push(role.id+'/'+branch.id);
 }
 assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);const report={classes:7,branches:checked,sprites:112,novice:10,sampling,errors,failed};await writeFile(new URL('checks.json',out),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser.close();}process.exit(0);
