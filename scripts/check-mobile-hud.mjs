import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL,fileURLToPath} from 'node:url';
import './mobile-review-server.mjs';
const {chromium}=await import(pathToFileURL(process.argv[2]).href);
const browser=await chromium.launch({channel:'msedge',headless:true});
const output=new URL('../outputs/mobile-stability/',import.meta.url);await mkdir(output,{recursive:true});
const results=[];
try{
 for(const [width,height] of [[320,568],[390,844],[430,932],[568,320],[667,375],[844,390],[932,430],[1024,768]]){
  const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true});const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error('PAGE',e.message);});page.on('response',r=>{if(r.status()>=400)console.error(r.status(),r.url());});
  await page.goto(`http://127.0.0.1:${process.env.MOBILE_REVIEW_PORT||8896}/mobile-fixture.html`);await page.locator('body[data-review=ready]').waitFor();await page.waitForTimeout(300);
  const inside=async selector=>{const r=await page.locator(selector).boundingBox();assert.ok(r&&r.width>0&&r.height>0,selector+' visible');assert.ok(r.x>=-1&&r.y>=-1&&r.x+r.width<=width+1&&r.y+r.height<=height+1,selector+' within viewport '+JSON.stringify(r));return r;};
  const profile=await inside('.player-panel'),map=await inside('.mini-panel'),toggle=await inside('#menu-toggle');
  assert.ok(profile.height<=120,'compact profile including status icons');
  const separate=(a,b)=>a.x+a.width<=b.x||b.x+b.width<=a.x||a.y+a.height<=b.y||b.y+b.height<=a.y;
  assert.ok(separate(profile,toggle),'profile/menu overlap');
  assert.ok(separate(toggle,map),'menu/map overlap');
  await inside('#mobile-quest-summary');await inside('#online-dock');
  assert.equal(await page.locator('.target-panel').isVisible(),false);
  assert.equal(await page.locator('.f-profile').count(),1);
  const hp=await inside('.player-panel'),buffs=await inside('#ailment-row');assert.ok(buffs.y>=hp.y+hp.height,'buffs below vitals');
  await page.evaluate(()=>window.__hudReviewSelect('normal'));await inside('.target-panel');assert.equal(await page.locator('.target-panel').getAttribute('data-kind'),'monster');
  await page.evaluate(()=>window.__hudReviewSelect('boss'));await inside('.target-panel');assert.equal(await page.locator('.target-panel').getAttribute('data-kind'),'boss');
  await page.evaluate(()=>window.__hudReviewSelect('none'));assert.equal(await page.locator('.target-panel').isVisible(),false);
  const intersects=(a,b)=>a.x<b.x+b.width-1&&a.x+a.width>b.x+1&&a.y<b.y+b.height-1&&a.y+a.height>b.y+1;
  const stick=await inside('#joystick'),chat=await inside('#online-dock'),quest=await inside('#mobile-quest-summary');
  for(const skill of await page.locator('#skills .skill:visible').all()){
   const r=await skill.boundingBox();assert.ok(!intersects(r,stick),'skill/joystick overlap');assert.ok(!intersects(r,chat),'skill/chat overlap');assert.ok(!intersects(r,quest),'skill/quest overlap');
   if(height>width)assert.ok(r.width>=44&&r.height>=44,'portrait skill touch target');
  }
  await page.locator('#menu-toggle').click();await inside('#game-menu');const channel=await inside('#channel-button');
  for(const button of await page.locator('#game-menu button:not(#channel-button)').all()){if(await button.isVisible())assert.ok(!intersects(channel,await button.boundingBox()),'CH overlaps another menu button');}
  await page.locator('#menu-bag').click();
  assert.equal(await page.locator('#game-menu').isVisible(),false);await inside('#bag-window');assert.equal(await page.locator('#bag-window').evaluate(e=>getComputedStyle(e).zoom),'1');
  await page.locator('#bag-window button').click();await page.locator('#dock-toggle').click();await inside('#online-dock');await page.locator('#online-text').focus();
  assert.equal(await page.locator('body').evaluate(e=>e.classList.contains('chat-typing')),true);await inside('#online-dock');
  await page.locator('#online-text').blur();await page.waitForTimeout(100);assert.equal(await page.locator('#joystick').isVisible(),false);
  await page.locator('#dock-toggle').click();await page.screenshot({path:fileURLToPath(new URL(`${width}x${height}.png`,output))});
  assert.deepEqual(errors,[]);results.push({width,height,passed:true});await page.close();
 }
 const desktop=await browser.newPage({viewport:{width:1440,height:900}});
 await desktop.goto(`http://127.0.0.1:${process.env.MOBILE_REVIEW_PORT||8896}/mobile-fixture.html`);await desktop.locator('body[data-review=ready]').waitFor();
 assert.equal(await desktop.locator('#menu-toggle').isVisible(),false);
 assert.equal(await desktop.locator('.target-panel').isVisible(),false);assert.equal(await desktop.locator('.f-profile').count(),1);
 await desktop.screenshot({path:fileURLToPath(new URL('desktop-minimal.png',output))});
 await desktop.evaluate(()=>window.__hudReviewSelect('boss'));assert.equal(await desktop.locator('.target-panel').isVisible(),true);assert.equal(await desktop.locator('.target-panel').getAttribute('data-kind'),'boss');
 assert.equal(await desktop.locator('.target-panel').evaluate(e=>getComputedStyle(e).borderImageSource),'none');
 await desktop.screenshot({path:fileURLToPath(new URL('desktop-boss.png',output))});
 assert.equal(await desktop.locator('#hud-chips').evaluate(e=>e.parentElement.id),'hud-right');
 const ch=await desktop.locator('#channel-button').boundingBox();
 for(const selector of ['#game-menu','.mini-panel','#quest-tracker']){const r=await desktop.locator(selector).boundingBox();assert.ok(!(ch.x<r.x+r.width&&ch.x+ch.width>r.x&&ch.y<r.y+r.height&&ch.y+ch.height>r.y),'desktop CH overlap '+selector);}
 assert.equal(await desktop.locator('#hud-channel-row').evaluate(e=>e.parentElement.id),'hud-right');
 for(const width of [901,1024,1180,1440,1920]){
  await desktop.setViewportSize({width,height:900});await desktop.waitForTimeout(80);
  const menu=await desktop.locator('#game-menu').boundingBox(),profile=await desktop.locator('.player-panel').boundingBox(),map=await desktop.locator('.mini-panel').boundingBox();
  assert.ok(menu.x>=profile.x+profile.width,'desktop menu overlaps profile at '+width);
  assert.ok(menu.x+menu.width<=map.x,'desktop menu overlaps map at '+width);
  assert.ok(menu.y+menu.height<= (await desktop.locator('.target-panel').boundingBox()).y,'desktop menu overlaps boss at '+width);
  await desktop.locator('#game-menu').evaluate(e=>{if(e.scrollWidth>e.clientWidth){e.scrollLeft=e.scrollWidth;if(e.scrollLeft<=0)throw new Error('menu cannot scroll');e.scrollLeft=0;}});
 }
 await desktop.setViewportSize({width:390,height:844});await desktop.waitForTimeout(100);
 assert.equal(await desktop.locator('#hud-chips').evaluate(e=>e.parentElement.id),'game-menu');
 await desktop.setViewportSize({width:1440,height:900});await desktop.waitForTimeout(100);
 assert.equal(await desktop.locator('#hud-chips').evaluate(e=>e.parentElement.id),'hud-right');
 assert.equal(await desktop.locator('#channel-button').evaluate(e=>e.parentElement.id),'hud-channel-row');await desktop.close();
 results.push({desktopAndResize:true,passed:true});
 const gallery=await browser.newPage({viewport:{width:1000,height:900}});await gallery.goto(`http://127.0.0.1:${process.env.MOBILE_REVIEW_PORT||8896}/mobile-review.html`);
 await gallery.locator('iframe').first().waitFor();
 const dimensions=await gallery.locator('.device-stage').evaluateAll(stages=>stages.map(s=>({wantedWidth:Number(s.dataset.width),wantedHeight:Number(s.dataset.height),width:s.querySelector('iframe').contentWindow.innerWidth,height:s.querySelector('iframe').contentWindow.innerHeight})));
 for(const d of dimensions){assert.equal(d.width,d.wantedWidth,'preview preserves declared width');assert.equal(d.height,d.wantedHeight,'preview preserves declared height');}
 await gallery.screenshot({path:fileURLToPath(new URL('gallery-scaled.png',output))});await gallery.close();results.push({galleryDimensions:true,passed:true});
 await writeFile(new URL('checks.json',output),JSON.stringify(results,null,2));console.log(JSON.stringify(results));
}catch(e){console.error(e);process.exitCode=1;}finally{await browser.close();process.exit(process.exitCode??0);}
