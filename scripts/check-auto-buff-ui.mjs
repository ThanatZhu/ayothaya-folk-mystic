import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import './mobile-review-server.mjs';
const {chromium}=await import(pathToFileURL(process.argv[2]).href),browser=await chromium.launch({channel:'msedge',headless:true});
const out=new URL('../outputs/auto-buff-ui/',import.meta.url);await mkdir(out,{recursive:true});const errors=[],failed=[],viewports=[];
const base=`http://127.0.0.1:${process.env.MOBILE_REVIEW_PORT||8896}`;
const overlaps=(a,b)=>a.x<b.x+b.width-1&&a.x+a.width>b.x+1&&a.y<b.y+b.height-1&&a.y+a.height>b.y+1;
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push(r.url());});
 const ready=async()=>{await page.locator('body[data-review=ready]').waitFor();await page.waitForTimeout(180);};
 await page.goto(base+'/mobile-fixture.html');await ready();
 assert.equal(await page.locator('#ailment-row .status-art').count(),3);
 await page.locator('#auto-attack').click();assert.equal(await page.locator('#auto-attack').getAttribute('aria-pressed'),'true');
 await page.locator('#auto-settings-open').click();assert.equal(await page.locator('#auto-attack').getAttribute('aria-pressed'),'true','gear does not toggle AUTO');assert.equal(await page.locator('#auto-settings-window').isVisible(),true);
 assert.equal(await page.locator('#auto-skill-choices input').count(),15);assert.equal(await page.locator('#auto-skill-choices input[data-auto="14"]').isDisabled(),true);
 await page.locator('#auto-skill-choices input[data-auto="4"]').check();assert.deepEqual(await page.evaluate(()=>window.__autoReview.world.autoConfig.skills),[0,4]);
 await page.locator('[data-auto-tab=positions]').click();await page.locator('#auto-hotbar [data-slot="0"]').click();await page.locator('#auto-hotbar [data-slot="10"]').click();
 assert.deepEqual(await page.evaluate(()=>window.__autoReview.hotbar.slice(0,2)),[10,1]);assert.deepEqual(await page.evaluate(()=>window.__autoReview.world.autoConfig.skills),[4,0]);
 await page.locator('[data-auto-tab=potions]').click();await page.locator('#auto-hp').fill('60');await page.locator('#auto-mp').fill('25');await page.locator('#auto-mp').dispatchEvent('input');assert.equal(await page.evaluate(()=>window.__autoReview.world.autoConfig.hp),60);
 await page.reload();await ready();assert.equal(await page.evaluate(()=>window.__autoReview.hotbar[0]),10);assert.deepEqual(await page.evaluate(()=>window.__autoReview.world.autoConfig),{skills:[4,0],hp:60,mp:25});
 await page.evaluate(()=>dispatchEvent(new CustomEvent('open-skill-window')));assert.equal(await page.locator('#skill-window').isVisible(),true);assert.equal(await page.locator('#skill-window input,#skill-window .skill-setup').count(),0);
 await page.screenshot({path:fileURLToPath(new URL('upgrade-only.png',out)),fullPage:true});await page.locator('#skill-close').click();
 for(const [width,height] of [[1920,1080],[1440,900],[1024,768],[844,390],[667,375],[568,320],[390,844],[320,568]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(140);
  const rect=async selector=>{const r=await page.locator(selector).boundingBox();assert.ok(r&&r.x>=-1&&r.y>=-1&&r.x+r.width<=width+1&&r.y+r.height<=height+1,selector+' on '+width+'x'+height+' '+JSON.stringify(r));return r;};
  const auto=await rect('#auto-attack'),gear=await rect('#auto-settings-open');assert.ok(auto.width>=50,'larger AUTO');assert.ok(gear.width>=44&&gear.height>=44,'44px gear target');
  await page.screenshot({path:fileURLToPath(new URL(width+'x'+height+'-hud.png',out)),fullPage:true});
  for(const b of await page.locator('#skills .skill:visible,#attack').all()){const r=await b.boundingBox();assert.ok(!overlaps(gear,r),'gear does not cover a skill '+width+'x'+height+' '+JSON.stringify({gear,r,text:await b.textContent()}));}
  await page.screenshot({path:fileURLToPath(new URL(width+'x'+height+'-hud.png',out)),fullPage:true});
  await page.locator('#auto-settings-open').click();await rect('#auto-settings-window');
  assert.ok(await page.evaluate(()=>document.querySelector('#auto-settings-window').scrollWidth<=document.querySelector('#auto-settings-window').clientWidth+1),'no panel horizontal overflow');
  await page.screenshot({path:fileURLToPath(new URL(width+'x'+height+'-settings.png',out)),fullPage:true});await page.keyboard.press('Escape');assert.equal(await page.locator('#auto-settings-window').isVisible(),false);viewports.push({width,height,auto:Math.round(auto.width),gear:Math.round(gear.width)});
 }
 await page.setViewportSize({width:1440,height:900});for(const role of ['lancer','hunter','boxer','rogue','shaman','acolyte']){await page.goto(base+'/mobile-fixture.html?class='+role);await ready();await page.locator('#auto-settings-open').click();assert.equal(await page.locator('#auto-skill-choices input').count(),15);await page.locator('[data-auto-tab=positions]').click();assert.equal(await page.locator('#auto-hotbar .skill-art').count(),15);}
 await page.goto(base+'/buff-gallery.html');await page.locator('article').nth(35).waitFor();assert.equal(await page.locator('article').count(),36);await page.locator('details').last().locator('summary').click();await page.waitForTimeout(100);assert.ok((await page.locator('#prompts').textContent()).includes('DEBUFF ATLAS'));await page.locator('details').last().locator('summary').click();await page.screenshot({path:fileURLToPath(new URL('buff-gallery.png',out)),fullPage:true});
 await writeFile(new URL('checks.json',out),JSON.stringify({errors,failed,viewports},null,2));assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);console.log(JSON.stringify({viewports,errors,failed,classes:7,statusIcons:36}));
}finally{await browser.close();}process.exit(0);
