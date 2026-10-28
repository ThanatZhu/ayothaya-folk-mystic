import {chromium} from 'file:///C:/Users/WIN%2011%20PRO/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';import {readFile,writeFile} from 'node:fs/promises';import path from 'node:path';
const browser=await chromium.launch({channel:'msedge',headless:true}),reports=[];
async function pageFor(width=1440,height=900){
 const p=await browser.newPage({viewport:{width,height},reducedMotion:'reduce',hasTouch:width<1000,isMobile:width<1000}),errors=[],missing=[],root=path.resolve('.');p.on('pageerror',e=>errors.push(e.message));
 await p.route('http://127.0.0.1:3047/**',async route=>{const file=path.resolve(root,'.'+decodeURIComponent(new URL(route.request().url()).pathname));if(!file.startsWith(root+path.sep))return route.fulfill({status:403,body:''});
  try{let body=await readFile(file);if(file.endsWith('premium-hub-lab.js'))body=Buffer.from(body.toString()+`\nglobalThis.__premium={game,hub,panel,collection,get record(){return record;},calls:[]};const actual=game.world.petCommand;game.world.petCommand=(...args)=>{__premium.calls.push({type:args[0],data:args[1],id:args[2]});return actual(...args);};`);
   await route.fulfill({body,contentType:({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.webp':'image/webp','.json':'application/json','.svg':'image/svg+xml','.ttf':'font/ttf'})[path.extname(file)]??'application/octet-stream'});
  }catch{missing.push(file);await route.fulfill({status:404,body:'Not found'});}
 });
 await p.goto('http://127.0.0.1:3047/premium-hub-lab.html');await p.locator('.amulet-main-art').waitFor({state:'attached'});await p.evaluate(()=>document.fonts.ready);return {p,errors,missing};
}
async function layout(p,selector,width,height){return p.locator(selector).evaluate((d,{width,height})=>{const b=d.getBoundingClientRect();return {x:b.x,y:b.y,width:b.width,height:b.height,overflow:(d.querySelector('.premium-gacha-body,.premium-store-body,#pet-premium')??d).scrollWidth-(d.querySelector('.premium-gacha-body,.premium-store-body,#pet-premium')??d).clientWidth,within:b.x>=0&&b.y>=0&&b.right<=width+1&&b.bottom<=height+1};},{width,height});}
try{
 for(const [width,height] of [[1440,900],[844,390],[667,375],[390,844],[320,568]]){
  const {p,errors,missing}=await pageFor(width,height);await p.waitForFunction(()=>[...document.images].filter(i=>i.getAttribute('src')).every(i=>i.complete&&i.naturalWidth>0));
  
  if(width<1000){await p.locator('#gacha-tab-pets').tap();await p.locator('#gacha-tab-amulets').tap();}
  const styleCheck=await p.evaluate(()=>({
   items:[...document.querySelectorAll('#gacha-window .amulet-roster button')].map(n=>{const s=getComputedStyle(n);return {color:s.backgroundColor,image:s.backgroundImage,border:s.borderWidth,shadow:s.boxShadow};}),
   action:getComputedStyle(document.querySelector('[data-amulet-draw="10"]')).borderImageSource,
   actionSlice:getComputedStyle(document.querySelector('[data-amulet-draw="10"]')).borderImageSlice,
   title:getComputedStyle(document.querySelector('.amulet-intro')).display
  }));
  for(const item of styleCheck.items){assert.equal(item.color,'rgba(0, 0, 0, 0)');assert.equal(item.image,'none');assert.equal(item.border,'0px');assert.equal(item.shadow,'none');}
  assert.match(styleCheck.action,/button-gold.webp/);assert.match(styleCheck.actionSlice,/fill/);assert.notEqual(styleCheck.title,'none');
  if(width>height&&height<550){const bottom=await p.locator('.gacha-tier-preview').evaluate(n=>n.getBoundingClientRect().bottom),footer=await p.locator('.amulet-actions').evaluate(n=>n.getBoundingClientRect().top);assert.ok(bottom<=footer,'Tier controls overlap footer');}
  await p.locator('#amulet-gacha .amulet-intro .gacha-secondary').click();
  await p.locator('#amulet-gacha .gacha-overlay[aria-label="รายละเอียดพระเครื่อง"]:not([hidden])').waitFor();
  await p.keyboard.press('Escape');assert.ok(await p.locator('#gacha-window').isVisible());
  await p.locator('#amulet-gacha .gacha-tools .gacha-secondary').click();await p.getByText('ยังไม่มีรายการสุ่มในหน้านี้',{exact:true}).waitFor();await p.keyboard.press('Escape');
  await p.locator('#gacha-window .gacha-rates-help').click();await p.locator('.gacha-rates-panel:not([hidden])').waitFor();await p.keyboard.press('Escape');
const gacha=await layout(p,'#gacha-window',width,height);assert.ok(gacha.within);assert.ok(gacha.overflow<=1);await p.screenshot({path:`outputs/design202/premium-gacha-${width}x${height}.png`});
  await p.locator('#gacha-tab-pets').click();await p.locator('#pet-draw-one').click();await p.locator('.summon-scene[data-phase=eggs]').waitFor();await p.locator('[data-egg="0"]').click();await p.locator('#pet-finish').click();assert.equal(await p.evaluate(()=>__premium.record.petCollection.balance),9900);await p.screenshot({path:`outputs/design202/premium-pets-summon-${width}x${height}.png`});
  await p.evaluate(()=>__premium.hub.openShop());assert.equal(await p.locator('#gacha-window').isVisible(),false);await p.locator('[data-buy="lek-lai-pack"]').click();await p.locator('#premium-order-quantity').fill('2');await p.locator('#premium-order-quantity').dispatchEvent('change');
  assert.match(await p.locator('.premium-total strong').textContent(),/200/);await p.locator('.premium-confirm').click();await p.waitForFunction(()=>__premium.game.world.bag.items['lek-lai']===10);assert.equal(await p.evaluate(()=>__premium.record.petCollection.balance),9700);assert.equal(await p.evaluate(()=>__premium.calls.filter(c=>c.type==='premiumBuy').length),1);
  await p.locator('[data-buy="rename-card"]').click();const shop=await layout(p,'#premium-store-window',width,height);assert.ok(shop.within);assert.ok(shop.overflow<=1);const confirm=await p.locator('.premium-confirm').boundingBox();assert.ok(confirm&&confirm.y>=0&&confirm.y+confirm.height<=height+1);await p.screenshot({path:`outputs/design202/premium-shop-${width}x${height}.png`});await p.locator('.premium-cancel').click();
  await p.evaluate(()=>{__premium.collection.show();document.getElementById('premium-store-window').close();__premium.panel.render(true);});assert.equal(await p.locator('#pet-window [data-amulet-draw],#pet-window #pet-draw-one').count(),0);assert.equal(await p.locator('#pet-window [data-pet]').count()>=4,true);await p.locator('#pet-equip-new').click();await p.waitForFunction(()=>!!__premium.record.petCollection.equipped);const collection=await layout(p,'#pet-window',width,height);assert.ok(collection.within);assert.ok(collection.overflow<=1);await p.screenshot({path:`outputs/design202/premium-collection-${width}x${height}.png`});assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);reports.push({width,height,gacha,shop,collection,errors,missing});await p.close();
 }
 // Lost acknowledgement: preserve request and controls until replay resolves; no second debit.
 {
  const {p,errors}=await pageFor();await p.evaluate(()=>{__premium.hub.openShop();const original=__premium.game.world.petCommand;let first=true;__premium.game.world.petCommand=async(...args)=>{const r=await original(...args);if(first){first=false;throw Error('server-timeout');}return r;};});await p.locator('[data-buy="break-guard"]').click();await p.locator('.premium-confirm').click();await p.waitForFunction(()=>document.querySelector('.premium-confirm').textContent.includes('ตรวจสอบ'));assert.equal(await p.locator('.premium-cancel').isDisabled(),true);assert.equal(await p.locator('#premium-order-quantity').isDisabled(),true);await p.locator('.premium-confirm').click();await p.waitForFunction(()=>!document.querySelector('.premium-order').checkVisibility());const result=await p.evaluate(()=>({balance:__premium.record.petCollection.balance,qty:__premium.record.bag.items['break-guard'],ids:__premium.calls.map(c=>c.id)}));assert.equal(result.balance,9900);assert.equal(result.qty,1);assert.equal(result.ids[0],result.ids[1]);assert.deepEqual(errors,[]);reports.push({case:'lost acknowledgement retry',...result});await p.close();
 }

 // Ten-pull batches survive switching banners; a lost acknowledgement retries exactly once.
 {
  const {p,errors}=await pageFor(844,390);
  await p.locator('[data-amulet-draw="10"]').click();await p.locator('.amulet-ceremony[data-phase=ready]').waitFor();
  assert.equal(await p.evaluate(()=>__premium.record.petCollection.balance),9000);
  await p.locator('#gacha-tab-pets').click();await p.locator('#gacha-tab-amulets').click();assert.equal(await p.locator('.relic-prize').count(),10);
  assert.match(await p.locator('.relic-open-all').evaluate(n=>getComputedStyle(n).borderImageSource),/button-jade.webp/);await p.locator('.relic-open-all').click();assert.match(await p.locator('.relic-done').evaluate(n=>getComputedStyle(n).borderImageSource),/button-gold.webp/);await p.locator('.relic-done').click();
  await p.locator('#amulet-gacha .gacha-tools .gacha-secondary').click();assert.equal(await p.locator('.gacha-history-entry li').count(),10);await p.keyboard.press('Escape');
  await p.evaluate(()=>{const original=__premium.game.world.petCommand;let first=true;__premium.game.world.petCommand=async(...args)=>{const r=await original(...args);if(first&&args[0]==='amuletDraw'){first=false;throw Error('server-timeout');}return r;};});
  await p.locator('[data-amulet-draw="1"]').click();await p.waitForFunction(()=>document.querySelector('[data-amulet-draw="1"]').dataset.retry==='true');
  await p.locator('[data-amulet-draw="1"]').click();await p.locator('.amulet-ceremony[data-phase=ready]').waitFor();
  const receipt=await p.evaluate(()=>({balance:__premium.record.petCollection.balance,calls:__premium.calls.filter(c=>c.type==='amuletDraw')}));
  assert.equal(receipt.balance,8900);assert.equal(receipt.calls.at(-1).id,receipt.calls.at(-2).id);
  assert.match(await p.locator('.relic-open-all').evaluate(n=>getComputedStyle(n).borderImageSource),/button-jade.webp/);await p.locator('.relic-open-all').click();assert.match(await p.locator('.relic-done').evaluate(n=>getComputedStyle(n).borderImageSource),/button-gold.webp/);await p.locator('.relic-done').click();
  await p.locator('#amulet-gacha .gacha-tools .gacha-secondary').click();assert.equal(await p.locator('.gacha-history-entry').count(),2);await p.keyboard.press('Escape');
  await p.locator('#gacha-tab-pets').click();await p.screenshot({path:'outputs/design202/pets-idle-844x390.png'});
  await p.locator('#pet-draw-ten').click();await p.locator('.summon-scene[data-phase=eggs]').waitFor();assert.equal(await p.locator('[data-egg]').count(),10);
  await p.locator('#pet-open-all').click();await p.locator('#pet-finish').click();
  await p.locator('#pet-summon-premium .gacha-tools .gacha-secondary').click();assert.equal(await p.locator('#pet-summon-premium .gacha-history-entry li').count(),10);
  assert.equal(await p.evaluate(()=>__premium.record.petCollection.balance),7900);assert.deepEqual(errors,[]);await p.keyboard.press('Escape');
  reports.push({case:'gacha ten-pull, category switch, revealed history and idempotent retry',balance:7900});await p.close();
 }
 await writeFile('outputs/design202/premium-hub-validation.json',JSON.stringify(reports,null,2));console.log(JSON.stringify(reports));
}finally{await browser.close();}
