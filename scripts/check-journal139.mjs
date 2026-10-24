// Real local realm: wide journal, touch layout, recap navigation and unchanged progress.
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {LocalStore} from '../server/storage.js';
import {createHost} from '../server/host.js';
import {STORY,normalizeStory} from '../story-quests.js';
import {XP_CURVE,levelStart} from '../experience.js';
const out=new URL('../outputs/journal139/',import.meta.url);await mkdir(out,{recursive:true});
const catalog=JSON.parse(await readFile(new URL('../maps/world.json',import.meta.url),'utf8'));
const origins=[],store=await new LocalStore(await mkdtemp(fileURLToPath(new URL('store-',out)))).init();
const host=await createHost({mode:'local',store,catalog,origins,serveStatic:true});
await new Promise(r=>host.server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+host.server.address().port;origins.push(base);
const {chromium}=await import(pathToFileURL(process.argv[2]).href),browser=await chromium.launch({channel:'msedge',headless:true});
const checks=[],errors=[];
try{
 for(const mobile of [false,true])for(const lang of ['th','en']){
  const session=await store.createLocal({name:'JournalQA',gender:'male'}),record=store.rows.get(session.uid);
  record.story=normalizeStory({v:3,quest:STORY.findIndex(q=>q.title==='หนูบึงยักษ์'),step:1});record.xpCurve=XP_CURVE;
  record.state.traveler.baseXp=levelStart(83);record.state.traveler.jobXp=1000000;
  record.daily={day:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),streak:1};
  const context=await browser.newContext({viewport:{width:mobile?932:1920,height:mobile?430:945},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:1});
  await context.route('**/multiplayer-config.js*',r=>r.fulfill({contentType:'text/javascript',body:`export function multiplayerURL(){return '${base.replace('http','ws')}/realtime'}export function wakeServer(){}`}));
  await context.addInitScript(({record,token,lang})=>{
   sessionStorage.setItem('ayothaya-entry-v1',JSON.stringify({owner:'guest',serverId:'server-1',slotId:'slot-1'}));
   sessionStorage.setItem('ayothaya-local-network:slot-1',JSON.stringify({token,serverId:'server-1',slotId:'slot-1'}));
   localStorage.setItem('ayothaya-character-v2:slot-1',JSON.stringify(record));localStorage.setItem('ayothaya.lang',lang);
   localStorage.setItem('ayothaya-coach-off','1');localStorage.setItem('ayothaya-perf',JSON.stringify({quality:'low',fps:30}));
  },{record,token:session.token,lang});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/game.html?server=server-1&map=ayutthaya');
  await page.waitForFunction(()=>window.__ayothaya?.game.actionBar&&document.getElementById('online-button')?.dataset.state==='online',null,{timeout:90000});
  await page.waitForTimeout(500);
  const peer=[...host.realm.peers.values()].find(p=>p.uid===session.uid);assert.ok(peer);
  const initial=structuredClone({story:peer.story,bag:peer.bag,baseXp:peer.world.baseXp});
  const open=async()=>{
   await page.evaluate(()=>{for(const d of document.querySelectorAll('dialog[open]'))d.close();if(document.getElementById('dock-toggle')?.getAttribute('aria-expanded')==='true')document.getElementById('dock-toggle').click();});
   if(!await page.locator('#menu-quests').isVisible())await page.locator('#menu-toggle').click();
   await page.locator('#menu-quests').click();await page.locator('#quests-window[open]').waitFor();
  };
  for(const [width,height] of mobile?[[932,430],[844,390],[667,375],[568,320],[390,844]]:[[1920,945],[1440,900],[1280,720],[1024,768],[1280,600]]){
   await page.setViewportSize({width,height});await page.waitForTimeout(150);await open();
   await page.locator('[data-qt=story]').click();
   await page.locator('.story-recap-art').evaluate(i=>i.decode());
   const metrics=await page.locator('#quests-window').evaluate(e=>{
    const r=e.getBoundingClientRect(),rect=n=>{const b=n.getBoundingClientRect();return {x:b.x,y:b.y,right:b.right,bottom:b.bottom,width:b.width,height:b.height};};
    return {panel:rect(e),list:rect(e.querySelector('.quest-journal-list')),detail:rect(e.querySelector('.quest-journal-detail')),goal:rect(e.querySelector('.quest-journal-goal')),scroll:e.scrollHeight>e.clientHeight+1,pageScroll:document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight,desktop:matchMedia('(min-width:901px) and (pointer:fine)').matches};
   });
   const r=metrics.panel;assert.ok(r.x>=0&&r.y>=0&&r.right<=width+1&&r.bottom<=height+1,JSON.stringify(metrics));assert.equal(metrics.pageScroll,false);
   if(!mobile){assert.ok(r.width>=Math.min(1000,width-50));assert.equal(metrics.scroll,false);assert.ok(metrics.list.right<metrics.detail.x);assert.ok(metrics.list.bottom<=r.bottom);assert.ok(metrics.detail.bottom<=r.bottom);assert.ok(metrics.goal.y>=metrics.detail.y&&metrics.goal.bottom<=metrics.detail.bottom,'current objective is visible without scrolling');
    await page.locator('.quest-journal-list').hover();await page.mouse.wheel(0,500);await page.waitForFunction(()=>document.querySelector('.quest-journal-list').scrollTop>0);}
   else{assert.equal(metrics.desktop,false);assert.equal(await page.locator('.quest-journal-toggle').getAttribute('aria-expanded'),'false');await page.locator('.quest-journal-toggle').click();}
   const first=page.locator('[data-quest-index="0"]');await first.click();await page.waitForTimeout(50);
   assert.equal(await page.locator('#quest-detail-title').textContent(),lang==='th'?STORY[0].title:'The Night the Lamps Went Out');
   if(mobile)await page.locator('.quest-journal-toggle').click();
   await page.locator(`[data-quest-index="${record.story.quest}"]`).click();await page.waitForTimeout(50);
   assert.ok(await page.locator('.quest-journal-goal').isVisible());
   await page.screenshot({path:fileURLToPath(new URL(`${lang}-${mobile?'touch':'desktop'}-${width}x${height}.png`,out))});
   for(const tab of ['bounty','weekly','album']){
    await page.locator(`[data-qt=${tab}]`).click();assert.ok(await page.locator('#quests-body').isVisible());
    if(tab==='bounty')assert.ok(await page.locator('[data-claim]').count()>0);
    if(tab==='album')assert.ok(await page.locator('.album-grid span').count()>0);
   }
   checks.push({lang,mobile,width,height,...metrics});await page.keyboard.press('Escape');
  }
  assert.deepEqual({story:peer.story,bag:peer.bag,baseXp:peer.world.baseXp},initial,'reading current and old quests must not mutate progress or rewards');
  if(!mobile&&lang==='th'){
   await page.setViewportSize({width:1920,height:945});
   if(await page.locator('#activity-quest-tab').getAttribute('aria-expanded')!=='true')await page.locator('#activity-quest-tab').click();
   await page.locator('#activity-journal').click();await page.locator('#quests-window[open]').waitFor();
   await page.locator('[data-qt=story]').click();assert.equal(await page.locator('.quest-journal-toggle').getAttribute('aria-expanded'),'true');
   await page.setViewportSize({width:844,height:390});await page.waitForTimeout(100);assert.equal(await page.locator('.quest-journal-toggle').getAttribute('aria-expanded'),'false');
   await page.setViewportSize({width:1920,height:945});await page.waitForTimeout(100);assert.equal(await page.locator('.quest-journal-toggle').getAttribute('aria-expanded'),'true');
   await page.locator('#quests-close').click();
  }
  // First quest and completed-story edge states must still display a usable journal.
  for(const quest of [0,STORY.length]){
   peer.story=normalizeStory({v:3,quest,step:0});await page.waitForFunction(q=>window.__ayothaya.game.world.story?.quest===q,quest);
   await open();await page.locator('[data-qt=story]').click();assert.equal(await page.locator('[data-quest-index]').count(),quest+1);assert.ok(await page.locator('#quest-detail-title').isVisible());await page.keyboard.press('Escape');
  }
  console.log('PASS',mobile?'touch':'desktop',lang,'5 viewports, all tabs, recaps, unchanged progress, first and final quest');await context.close();
 }
 assert.deepEqual(errors,[]);await writeFile(new URL('checks.json',out),JSON.stringify({checks,errors},null,2));
}finally{await browser.close();await host.close();}
process.exit(0);
