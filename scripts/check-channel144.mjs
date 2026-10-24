// Verify the compact channel button and text-only chat tabs against a local server.
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {LocalStore} from '../server/storage.js';
import {createHost} from '../server/host.js';
const out=new URL('../outputs/channel144/',import.meta.url);await mkdir(out,{recursive:true});
const catalog=JSON.parse(await readFile(new URL('../maps/world.json',import.meta.url),'utf8')),origins=[];
const store=await new LocalStore(await mkdtemp(fileURLToPath(new URL('store-',out)))).init(),host=await createHost({mode:'local',store,catalog,origins,serveStatic:true});
await new Promise(r=>host.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+host.server.address().port;origins.push(base);
const {chromium}=await import(pathToFileURL(process.argv[2]).href),browser=await chromium.launch({channel:'msedge',headless:true}),errors=[],checks=[];
try{
 for(const lang of ['th','en']){
  const session=await store.createLocal({name:'ChannelArtQA',gender:'male'}),record=store.rows.get(session.uid);
  record.daily={day:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),streak:1};
  const context=await browser.newContext({viewport:{width:1440,height:900}});
  await context.route('**/multiplayer-config.js*',r=>r.fulfill({contentType:'text/javascript',body:`export function multiplayerURL(){return '${base.replace('http','ws')}/realtime'}export function wakeServer(){}`}));
  await context.addInitScript(({record,token,lang})=>{
   sessionStorage.setItem('ayothaya-entry-v1',JSON.stringify({owner:'guest',serverId:'server-1',slotId:'slot-1'}));sessionStorage.setItem('ayothaya-local-network:slot-1',JSON.stringify({token,serverId:'server-1',slotId:'slot-1'}));
   localStorage.setItem('ayothaya-character-v2:slot-1',JSON.stringify(record));localStorage.setItem('ayothaya.lang',lang);localStorage.setItem('ayothaya-coach-off','1');localStorage.setItem('ayothaya-perf',JSON.stringify({quality:'low',fps:30}));
  },{record,token:session.token,lang});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/game.html?server=server-1&map=ayutthaya');
  await page.waitForFunction(()=>window.__ayothaya?.game.actionBar&&document.getElementById('online-button')?.dataset.state==='online',null,{timeout:90000});await page.waitForTimeout(500);await page.evaluate(()=>document.fonts.ready);
  await page.evaluate(()=>{for(const d of document.querySelectorAll('dialog[open]'))d.close();});
  for(const [width,height] of [[1920,1080],[1440,900],[1280,720],[1024,768],[1280,600]]){
   await page.setViewportSize({width,height});await page.waitForFunction(()=>{const b=document.getElementById('channel-button').getBoundingClientRect(),m=document.querySelector('.mini-panel').getBoundingClientRect();return b.width>0&&b.left>=m.left&&b.right<=m.right&&b.top>=m.bottom;});await page.waitForTimeout(150);
   const metrics=await page.locator('#channel-button').evaluate(async button=>{
    const rect=e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
    const bg=getComputedStyle(button).backgroundImage,image=new Image();image.src=bg.slice(5,-2);await image.decode();const r=button.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
    return {button:rect(button),map:rect(document.querySelector('.mini-panel')),events:[...document.querySelectorAll('#hud-chips>button')].filter(b=>!b.hidden&&b.getClientRects().length).map(rect),art:bg,naturalWidth:image.naturalWidth,hit:hit===button||button.contains(hit),globe:getComputedStyle(button.querySelector('.ch-ico')).display,scroll:document.documentElement.scrollWidth>innerWidth};
   });
   const b=metrics.button,m=metrics.map;assert.ok(b.left>=m.left&&b.right<=m.right,'channel stays inside the map width '+JSON.stringify({lang,width,height,...metrics}));assert.ok(b.width<=144&&b.height>=44&&b.top>=m.bottom,'compact button remains below the minimap');assert.ok(metrics.hit);assert.equal(metrics.scroll,false);assert.equal(metrics.globe,'none');assert.equal(metrics.naturalWidth,512);assert.match(metrics.art,/ui-channel144\/channel.webp/);
   for(const e of metrics.events)assert.ok(b.right<=e.left||b.left>=e.right||b.bottom<=e.top||b.top>=e.bottom,'channel does not cover event icons');
   await page.locator('#channel-button').click();assert.ok(await page.locator('#channel-popover').isVisible());assert.equal(await page.locator('#channel-pop-list>button').count(),5);const popup=await page.locator('#channel-popover').boundingBox();assert.ok(popup.x>=0&&popup.y>=b.bottom&&popup.x+popup.width<=width&&popup.y+popup.height<=height);await page.locator('#channel-pop-close').click();
   await page.screenshot({path:fileURLToPath(new URL(`${lang}-hud-${width}x${height}.png`,out))});
   await page.locator('#desktop-chat-launcher').click();
   const tabs=await page.locator('#online-dock .mp-tabs button').evaluateAll(nodes=>nodes.map(n=>({text:n.textContent.trim(),content:getComputedStyle(n,'::before').content,display:getComputedStyle(n,'::before').display})));
   assert.equal(tabs.length,6);for(const tab of tabs){assert.ok(tab.text.length>0);assert.equal(tab.content,'none');assert.equal(tab.display,'none');}
   await page.screenshot({path:fileURLToPath(new URL(`${lang}-chat-${width}x${height}.png`,out))});await page.keyboard.press('Escape');checks.push({lang,width,height,...metrics,tabs});
  }
  // The painted button retains the existing server-backed channel picker.
  await page.locator('#channel-button').click();await page.locator('#channel-pop-list>button').nth(1).click();await page.waitForFunction(()=>document.getElementById('channel-btn-mob').textContent==='CH 2');
  await page.locator('#channel-button').click();await page.locator('#channel-pop-list>button').first().click();await page.waitForFunction(()=>document.getElementById('channel-btn-mob').textContent==='CH 1');
  for(const [width,height] of [[844,390],[390,844]]){
   await page.setViewportSize({width,height});await page.waitForTimeout(200);const button=page.locator('.player-panel>#channel-button');assert.ok(await button.isVisible());const r=await button.boundingBox();assert.equal(r.width,44);assert.equal(r.height,44);assert.ok(r.x>=0&&r.y>=0&&r.x+r.width<=width&&r.y+r.height<=height);assert.doesNotMatch(await button.evaluate(e=>getComputedStyle(e).backgroundImage),/ui-channel144/);
  }
  console.log('PASS',lang,'five compact minimap placements, text-only tabs, actual channel switch, touch restoration');await context.close();
 }
 assert.deepEqual(errors,[]);await writeFile(new URL('checks.json',out),JSON.stringify({checks,errors},null,2));
}finally{await browser.close();await host.close();}
process.exit(0);
