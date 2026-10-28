import assert from 'node:assert/strict';import {mkdir,writeFile} from 'node:fs/promises';import {fileURLToPath,pathToFileURL} from 'node:url';
import {usesMobileHud} from '../hud-mode204.js';
if(!process.argv[2])throw Error('Usage: node scripts/check-hud-mode204.mjs <playwright module path>');
const {chromium}=await import(pathToFileURL(process.argv[2]).href),browser=await chromium.launch({channel:'msedge',headless:true});
const out=new URL('../outputs/hud204/',import.meta.url);await mkdir(out,{recursive:true});const checks=[],errors=[];
try{
 for(const touch of [false,true]){
  const context=await browser.newContext({viewport:{width:1120,height:820},hasTouch:touch,isMobile:touch,deviceScaleFactor:1}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.stack));
  await page.goto('http://127.0.0.1:8957/auto202-review.html?v=hud204');await page.waitForFunction(()=>window.autoReview202,null,{timeout:120000});await page.waitForTimeout(500);
  const frame=page.frameLocator('#game');
  async function size(width,height){
   const value=width+','+height;await page.evaluate(value=>{const select=document.querySelector('#device');if(![...select.options].some(o=>o.value===value))select.add(new Option(value,value));},value);await page.locator('#device').selectOption(value);await page.waitForTimeout(500);
   const state=await page.evaluate(()=>{const w=document.querySelector('#game').contentWindow,d=w.document,visible=n=>n&&n.getBoundingClientRect().width>0&&getComputedStyle.call(w,n).display!=='none'&&getComputedStyle.call(w,n).visibility!=='hidden';return {width:w.innerWidth,height:w.innerHeight,coarse:w.matchMedia('(any-pointer:coarse)').matches,mobile:d.body.classList.contains('mobile-play'),actionMobile:d.body.classList.contains('actionbar-mobile'),actionDesktop:d.body.classList.contains('actionbar-desktop'),desktop:d.querySelector('#desktop-actionbar').hidden,apiDesktop:w.__ayothaya.game.actionBar.desktop,chatDesktop:d.querySelector('#online-dock').classList.contains('desktop-chat-overlay'),popover:d.querySelector('#online-dock').matches(':popover-open'),skills:[...d.querySelectorAll('#skills .skill')].filter(visible).length,channelParent:d.querySelector('#channel-button').parentElement.className,eventsParent:d.querySelector('#hud-chips').parentElement.id,shell:Math.round(d.querySelector('#game-shell').getBoundingClientRect().width),canvas:Math.round(d.querySelector('canvas').getBoundingClientRect().width)};});
   const mobile=usesMobileHud({width,height,coarse:state.coarse});assert.equal(state.mobile,mobile);assert.equal(state.actionMobile,mobile);assert.equal(state.actionDesktop,!mobile);assert.equal(state.desktop,mobile);assert.equal(state.apiDesktop,!mobile);assert.equal(state.chatDesktop,!mobile);assert.equal(state.shell,width);if(mobile){assert.equal(state.skills,4);assert.equal(state.eventsParent,'mobile-event-row');assert.equal(state.popover,false);}else assert.equal(state.skills,0);
   checks.push({input:touch?'touch':'mouse',...state});
   if(width===932)await frame.locator('body').screenshot({path:fileURLToPath(new URL((touch?'touch':'mouse')+'-932x430-'+checks.length+'.png',out))});
  }
  for(const [width,height]of [[844,390],[932,430],[1440,900],[932,430],[667,375],[568,320],[932,430]])await size(width,height);
  await frame.locator('#menu-toggle').click();await frame.locator('#game-menu.phone-open').waitFor();await frame.locator('#menu-toggle').click();
  await frame.locator('#auto-attack').click();await frame.locator('#auto-target-window[open]').waitFor();await frame.locator('#auto-target-close').click();
  // Mouse previews must still operate the same mobile chat, without a desktop popover.
  await frame.locator('#dock-toggle').click();await page.waitForTimeout(100);assert.equal(await frame.locator('#online-dock').evaluate(n=>n.matches(':popover-open')),false);await frame.locator('#mobile-chat-back').click();
  await context.close();
 }
 console.log(JSON.stringify({checks,errors},null,2));await writeFile(new URL('checks.json',out),JSON.stringify({checks,errors},null,2));assert.deepEqual(errors,[]);
}finally{await browser.close();}
