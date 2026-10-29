import {chromium} from 'file:///C:/Users/WIN%2011%20PRO/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';import {readFile,writeFile,mkdir} from 'node:fs/promises';
const base=process.env.PET_BUILD_PREVIEW??new URL(await readFile('outputs/gacha-banner200/preview-url.txt','utf8')).origin,out='outputs/pet-build220';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true}),reports=[];
try{for(const [width,height]of [[1440,900],[844,390],[667,375],[390,844],[320,568]]){
 const p=await browser.newPage({viewport:{width,height},isMobile:width<1000,hasTouch:width<1000,reducedMotion:'reduce'}),errors=[],missing=[];
 p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)missing.push(r.url());});
 await p.route('**/premium-hub-lab.js',async route=>route.fulfill({contentType:'text/javascript',body:await readFile('premium-hub-lab.js','utf8')+'\nglobalThis.__petBuild={game,hub,panel,collection,get record(){return record;},calls:[]};const original=game.world.petCommand;game.world.petCommand=(...args)=>{__petBuild.calls.push(args);return original(...args);};'}));
 await p.goto(base+'/premium-hub-lab.html?view=companions&rev=petbuild220');await p.locator('#pet-window[open]').waitFor();await p.evaluate(()=>document.fonts.ready);
 const editor=p.locator('.pet-build-editor'),save=p.locator('[data-build-save]');
 await editor.locator('summary').click();await p.locator('[data-build-recommend]').click();assert.match(await p.locator('[data-build-slot="0"]').innerText(),/AGI \+4/);
 await p.locator('[data-build-slot="1"]').click();await p.locator('[data-build-stat="str"]').click();assert.match(await p.locator('[data-build-slot="1"]').innerText(),/STR \+2/);
 await p.waitForTimeout(350);assert.match(await p.locator('[data-build-slot="1"]').innerText(),/STR \+2/,'periodic renders preserve an open draft');
 await save.click();await p.waitForFunction(()=>__petBuild.record.petCollection.statBuild?.stats.join(',')==='agi,str,luk');assert.equal(await save.isDisabled(),true);
 await p.locator('[data-pet="lotus-naga"]').click();assert.match(await p.locator('.pet-bonus').innerText(),/AGI \+4/);assert.match(await p.locator('.pet-build-summary').innerText(),/AGI \/ STR \/ LUK/);
 await p.locator('[data-build-slot="0"]').click();await p.locator('[data-build-stat="str"]').click();assert.match(await p.locator('[data-build-slot="1"]').innerText(),/AGI \+2/,'duplicate choice swaps priority');
 await p.locator('[data-build-cancel]').click();assert.equal(await editor.evaluate(n=>n.open),false);
 await editor.locator('summary').click();assert.match(await p.locator('[data-build-slot="0"]').innerText(),/AGI \+4/);
 await p.evaluate(()=>{__petBuild.game.world.petBuildStatus={blocked:true,reason:'pet-build-combat',remaining:5};__petBuild.panel.render();});await p.locator('[data-build-recommend]').click();assert.equal(await save.isDisabled(),true);assert.match(await p.locator('.pet-build-state').innerText(),/5/);
 await p.evaluate(()=>{__petBuild.game.online=false;__petBuild.panel.render(true);});assert.equal(await p.locator('[data-build-stat="str"]').isDisabled(),true);
 await p.evaluate(()=>{__petBuild.game.online=true;__petBuild.game.world.petBuildStatus={blocked:false,reason:null,remaining:0};__petBuild.panel.render(true);});
 await p.locator('[data-pet="golden-singha"]').click();assert.equal(await editor.isVisible(),false);assert.match(await p.locator('.pet-bonus').innerText(),/STR \+3/);
 await p.locator('[data-pet="garuda-dawn"]').click();await p.locator('[data-build-slot="0"]').scrollIntoViewIfNeeded();
 const dialog=await p.locator('#pet-window').evaluate(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,overflow:n.scrollWidth-n.clientWidth};});
 assert.ok(dialog.x>=-1&&dialog.y>=-1&&dialog.right<=width+1&&dialog.bottom<=height+1,JSON.stringify(dialog));assert.ok(dialog.overflow<=1);
 for(const control of ['[data-build-slot="0"]','[data-build-stat="luk"]','[data-build-save]']){
  await p.locator(control).scrollIntoViewIfNeeded();const r=await p.locator(control).boundingBox();assert.ok(r.y>=0&&r.y+r.height<=height+1,'scroll reaches '+control);
  assert.match(await p.locator(control).evaluate(n=>getComputedStyle(n).borderImageSource),/button-(jade|gold).webp/);
 }
 await p.locator('[data-build-slot="0"]').scrollIntoViewIfNeeded();await p.screenshot({path:out+'/editor-'+width+'x'+height+'.png'});
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);assert.equal(await p.evaluate(()=>__petBuild.calls.filter(c=>c[0]==='petStatBuild').length),1);
 reports.push({width,height,dialog,errors,missing});await p.close();
}
 // A lost response uses the same persisted receipt and never submits a different draft.
 const p=await browser.newPage({viewport:{width:1440,height:900}});await p.route('**/premium-hub-lab.js',async route=>route.fulfill({contentType:'text/javascript',body:await readFile('premium-hub-lab.js','utf8')+'\nglobalThis.__petBuild={game,hub,panel,collection,get record(){return record;},calls:[]};const original=game.world.petCommand;let first=true;game.world.petCommand=async(...args)=>{__petBuild.calls.push(args);const r=await original(...args);if(first&&args[0]==="petStatBuild"){first=false;throw Error("server-timeout");}return r;};'}));
 await p.goto(base+'/premium-hub-lab.html?view=companions');await p.locator('.pet-build-editor summary').click();await p.locator('[data-build-save]').click();await p.locator('.pet-retry:not([hidden])').waitFor();
 assert.equal(await p.locator('[data-build-save]').isDisabled(),true);await p.locator('.pet-retry').click();await p.waitForFunction(()=>!document.querySelector('.pet-retry').checkVisibility());
 const ids=await p.evaluate(()=>__petBuild.calls.map(c=>c[2]));assert.equal(ids.length,2);assert.equal(ids[0],ids[1]);reports.push({case:'lost response replays same saved request'});await p.close();
 await writeFile(out+'/ui-report.json',JSON.stringify(reports,null,2));console.log(JSON.stringify(reports));
}finally{await browser.close();}
