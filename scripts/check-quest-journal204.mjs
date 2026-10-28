// Exercise the real journal module; missing campaign imports previously left only its title and tabs.
import {chromium} from 'file:///C:/Users/WIN%2011%20PRO/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import path from 'node:path';
const output=path.resolve('outputs/quest-journal204');await mkdir(output,{recursive:true});
const styles=[...readFileSync(new URL('../game.html',import.meta.url),'utf8').matchAll(/<link[^>]*rel="stylesheet"[^>]*>/g)].map(m=>m[0]).join("\n");
const html=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<script type="importmap">{"imports":{"three":"./vendor/build/three.module.js","three/addons/":"./vendor/addons/"}}</script>
${styles}<link rel="stylesheet" href="social-ui.css"><link rel="stylesheet" href="ui-kit.css">
<style>body{margin:0;background:#0b2119}#game-shell{width:100%;height:100dvh}#game-menu{position:fixed;top:12px;left:12px}</style></head>
<body class="field-hud hud63"><div id="game-shell"><nav id="game-menu"></nav></div><script type="module">
import {createQuestsUI} from './quests-ui.js';
import {STORY,STORY_VERSION,normalizeStory,normalizeRebirthStory,storyQuests} from './story-quests.js?v=rebirth196';
const params=new URLSearchParams(location.search),mode=params.get('mode')??'main',touch=params.get('touch')==='true';
if(touch)document.body.classList.add('mobile-play');
const world={story:normalizeStory({v:STORY_VERSION,quest:12}),rebirth:mode.includes('rebirth')?2:0,rebirthStory:normalizeRebirthStory({campaign:'rebirth',cycle:1,quest:3},2),storyCampaign:mode==='rebirth-main'?'main':undefined,networkMapId:'ayutthaya',mobs:[],album:[],albumRewards:[],notice(){},market(){},emit(){}};
const game={online:!mode.startsWith('offline'),networkStatus:mode==='waiting'?'connecting':'online',world,clearInput(){},onEvent(){}};
const account={serverId:'journal',slotId:'regression',cloud:false},map={id:'ayutthaya',safe:true},bagUI={talkHooks:[],bag:()=>({coins:0,items:{}})};
localStorage.setItem('ayothaya-story:journal:regression',JSON.stringify(world.story));
localStorage.setItem('ayothaya-story:journal:regression:rebirth',JSON.stringify(world.rebirthStory));
const api=createQuestsUI({game,account,map,bagUI});
globalThis.__journal={game,account,map,api,expected:storyQuests(mode.includes('rebirth')&&mode!=='rebirth-main'?world.rebirthStory:world.story)[mode.includes('rebirth')&&mode!=='rebirth-main'?3:12].title};
</script></body></html>`;
const browser=await chromium.launch({channel:'msedge',headless:true}),results=[],before=process.argv.includes('--before');
async function launch(width,height,mode,touch){
 const page=await browser.newPage({viewport:{width,height},hasTouch:touch,isMobile:touch,reducedMotion:'reduce'}),errors=[],missing=[],root=path.resolve('.');
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('http://127.0.0.1:3047/**',async route=>{
  const name=decodeURIComponent(new URL(route.request().url()).pathname);
  if(name==='/journal204-fixture.html')return route.fulfill({body:html,contentType:'text/html'});
  const file=path.resolve(root,'.'+name);if(!file.startsWith(root+path.sep))return route.fulfill({status:403,body:''});
  try{const body=await readFile(file);await route.fulfill({body,contentType:({'.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.json':'application/json','.ttf':'font/ttf'})[path.extname(file)]??'application/octet-stream'});}
  catch{missing.push(name);await route.fulfill({status:404,body:''});}
 });
 await page.goto('http://127.0.0.1:3047/journal204-fixture.html?mode='+mode+'&touch='+touch);
 await page.waitForFunction(()=>!!globalThis.__journal);await page.evaluate(()=>document.fonts.ready);
 await page.locator('#menu-quests').click();return {page,errors,missing};
}
try{
 if(before){
  const {page,errors}=await launch(390,844,'main',true);await page.waitForTimeout(100);
  assert.ok(errors.some(e=>e.includes('storyForWorld is not defined')));
  assert.equal(await page.locator('#quests-body').textContent(),'');
  await page.screenshot({path:path.join(output,'before.png')});
  console.log(JSON.stringify({reproduced:true,errors}));await page.close();
 }else{
  for(const [width,height,touch]of [[1440,900,false],[390,844,true],[320,568,true],[844,390,true],[720,320,true]]){
   const {page,errors,missing}=await launch(width,height,'main',touch);
   await page.locator('#quest-detail-title').waitFor();assert.equal(await page.locator('#quest-detail-title').textContent(),await page.evaluate(()=>__journal.expected));
   await page.waitForFunction(()=>[...document.querySelectorAll('#quests-window img[src]')].every(i=>i.complete&&i.naturalWidth>0));
   await page.evaluate(()=>Promise.all([...document.querySelectorAll('#quests-window img[src]')].map(i=>i.decode())));
   await page.waitForTimeout(60);
   const window=await page.locator('#quests-window').boundingBox();assert.ok(window.height>Math.min(240,height*.55),'Window collapsed');
   const title=await page.locator('#quest-detail-title').boundingBox();assert.ok(title&&title.height>0);
   await page.screenshot({path:path.join(output,'main-'+width+'x'+height+'.png')});
   const owner=await page.evaluateHandle(()=>[document.querySelector('.quest-journal-list'),document.querySelector('.quest-journal-detail'),document.querySelector('#quests-body'),document.querySelector('#quests-window')].find(n=>n.scrollHeight>n.clientHeight+20&&/auto|scroll/.test(getComputedStyle(n).overflowY)));
   if(touch&&height<=568)assert.ok(await owner.evaluate(n=>!!n),'A phone journal must expose a scrollable region');
   if(await owner.evaluate(n=>!!n)){
    const rect=await owner.asElement().boundingBox(),x=rect.x+rect.width/2,y=Math.min(height-30,rect.y+rect.height*.7);
    if(touch){const cdp=await page.context().newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});for(let i=1;i<=6;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-90*i/6,id:1}]});await page.waitForTimeout(25);}await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();}
    else{await page.mouse.move(x,y);await page.mouse.wheel(0,160);}
    await page.waitForTimeout(250);assert.ok(await owner.evaluate(n=>n.scrollTop>10),'Native quest scrolling failed');
   }
   for(const tab of ['bounty','weekly','album','story']){
    await page.locator('[data-qt="'+tab+'"]').click();assert.ok((await page.locator('#quests-body').textContent()).trim().length>20);
   }
   assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);results.push({width,height,mode:'main',nativeScroll:await owner.evaluate(n=>!!n),errors,missing});await page.close();
  }
  for(const mode of ['rebirth','rebirth-main','offline','offline-rebirth','waiting']){
   const {page,errors,missing}=await launch(390,844,mode,true);
   if(mode==='waiting'){
    await page.getByText('กำลังโหลดเควสจากเซิร์ฟเวอร์…',{exact:true}).waitFor();
    await page.evaluate(()=>{__journal.game.networkStatus='online';__journal.api.update()});
   }
   await page.locator('#quest-detail-title').waitFor();
   assert.equal(await page.locator('#quest-detail-title').textContent(),await page.evaluate(()=>__journal.expected));
   assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);results.push({mode,errors,missing});await page.close();
  }
  await writeFile(path.join(output,'validation.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results));
 }
}finally{await browser.close();}
