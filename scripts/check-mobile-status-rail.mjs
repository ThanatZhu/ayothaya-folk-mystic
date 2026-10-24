// Real game + isolated local accounts. Never touches a production character.
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {LocalStore} from '../server/storage.js';
import {createHost} from '../server/host.js';
import {levelStart,XP_CURVE} from '../experience.js';
const out=new URL('../outputs/mobile130/',import.meta.url);await mkdir(out,{recursive:true});
const base='http://127.0.0.1:8922',store=await new LocalStore(fileURLToPath(new URL('store/',out))).init();
const catalog=JSON.parse(await readFile(new URL('../maps/world.json',import.meta.url),'utf8'));
const host=await createHost({mode:'local',store,catalog,origins:[base],serveStatic:true});
await new Promise(r=>host.server.listen(8922,'127.0.0.1',r));
const {chromium}=await import(pathToFileURL(process.argv[2]).href),browser=await chromium.launch({channel:'msedge',headless:true}),errors=[],checks=[];
const overlaps=(a,b)=>Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x)>1&&Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y)>1;
try{
 for(const role of ['novice','shaman']){
  const seed=await store.createLocal({name:'MobileQA',gender:'male'}),record=store.rows.get(seed.uid);
  record.character.classId=role;record.character.jobId=role==='novice'?'':'spirit-master';record.xpCurve=XP_CURVE;
  record.state.mapId='ayutthaya';record.state.traveler.baseXp=levelStart(role==='novice'?1:99);record.state.traveler.jobXp=role==='novice'?0:1000000;
  record.skills={_tree84:Array(15).fill(0),_roles116:Array(15).fill(0),[role]:Array(15).fill(role==='novice'?0:10)};
  record.bag={coins:2000,items:{'hp-small':8,'mp-small':8,'fly-wing':2,'return-incense':2}};
  record.daily={day:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),streak:1};
  const context=await browser.newContext({viewport:{width:932,height:430},isMobile:true,hasTouch:true,deviceScaleFactor:1});
  await context.route('**/multiplayer-config.js*',r=>r.fulfill({contentType:'text/javascript',body:`export function multiplayerURL(){return '${base.replace('http','ws')}/realtime'}export function wakeServer(){}`}));
  await context.addInitScript(({record,token})=>{
   sessionStorage.setItem('ayothaya-entry-v1',JSON.stringify({owner:'guest',serverId:'server-1',slotId:'slot-1'}));
   sessionStorage.setItem('ayothaya-local-network:slot-1',JSON.stringify({token,serverId:'server-1',slotId:'slot-1'}));
   if(!localStorage.getItem('ayothaya-character-v2:slot-1'))localStorage.setItem('ayothaya-character-v2:slot-1',JSON.stringify(record));
   localStorage.setItem('ayothaya-coach-off','1');localStorage.setItem('ayothaya-perf',JSON.stringify({quality:'low',fps:30}));
  },{record,token:seed.token});
  const page=await context.newPage();page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.message);});page.on('console',m=>{if(m.type()==='error')console.log('CONSOLE',m.text());});
  for(const lang of ['th','en']){
   console.log('START',role,lang);await page.goto(base+'/game.html?server=server-1&map=ayutthaya&lang='+lang,{waitUntil:'domcontentloaded'});console.log('DOM loaded');
   await page.waitForFunction(()=>window.__ayothaya?.game.actionBar&&document.getElementById('online-button')?.dataset.state==='online',null,{timeout:45000});
   await page.waitForTimeout(1600);
   // Reproduce the sparse two-skill presentation shown in the report.
   if(role==='novice'){await page.evaluate(()=>{const w=window.__ayothaya.game.world;w.skills=w.skills.map((s,i)=>({...s,reserved:i>=2}));});await page.waitForTimeout(150);}
   for(const [width,height] of [[932,430],[844,390],[667,375],[568,320],[390,844]]){
    await page.setViewportSize({width,height});await page.waitForTimeout(200);
    await page.evaluate(()=>{for(const d of document.querySelectorAll('dialog[open]'))d.close();if(document.getElementById('dock-toggle')?.getAttribute('aria-expanded')==='true')document.getElementById('dock-toggle').click();});
    const rectangles=await page.evaluate(()=>{
     const nodes=[...document.querySelectorAll('#mobile-status-rail button,.player-panel,.mini-panel,#menu-toggle,.combat-controls #attack,.combat-controls #auto-attack,.combat-controls #auto-settings-open,.combat-controls #skill-bank,#skills .skill')];
     return nodes.filter(b=>b.checkVisibility()&&getComputedStyle(b).visibility!=='hidden').map(b=>{const r=b.getBoundingClientRect();return {id:b.id,x:r.x,y:r.y,width:r.width,height:r.height};});
    });
    for(const r of rectangles)assert.ok(r.x>=0&&r.y>=0&&r.x+r.width<=width+1&&r.y+r.height<=height+1,role+' '+width+' '+JSON.stringify(r));
    for(let i=0;i<rectangles.length;i++)for(let j=i+1;j<rectangles.length;j++)assert.ok(!overlaps(rectangles[i],rectangles[j]),width+' overlap '+JSON.stringify([rectangles[i],rectangles[j]]));
    assert.equal(await page.locator('#game-menu #hud-chips,#game-menu #online-button').count(),0);
    assert.equal(await page.locator('#skills .mobile-skill-empty').count(),0);
    const paint=await page.locator('#hud-chips>button:visible').evaluateAll(nodes=>nodes.map(b=>({bg:getComputedStyle(b).backgroundImage,color:getComputedStyle(b).backgroundColor,shadow:getComputedStyle(b,'::before').filter})));for(const p of paint){assert.equal(p.bg,'none');assert.equal(p.color,'rgba(0, 0, 0, 0)');assert.match(p.shadow,/drop-shadow/);}
    assert.equal(await page.locator('#quick-slots > button[id^="quick-"]:visible').count(),4);
    const reached=new Set(),pages=await page.locator('#skill-bank').getAttribute('aria-label');
    const total=Number(pages.match(/\d+/g)?.at(-1)??1);
    for(let i=0;i<total;i++){
     const visible=await page.locator('#skills .skill:visible').evaluateAll(nodes=>nodes.map(b=>[...b.parentElement.querySelectorAll('.skill')].indexOf(b)));assert.ok(visible.length<=4);
     visible.forEach(id=>reached.add(id));await page.locator('#skill-bank').click();
    }
    const available=await page.locator('#skills .skill:not([hidden])').count();assert.equal(reached.size,available,'all class and Master skills remain reachable');
    await page.locator('#menu-toggle').click();assert.ok(await page.locator('#game-menu').isVisible());
    assert.equal(await page.locator('#game-menu #hud-chips,#game-menu #online-button').count(),0);await page.locator('#menu-toggle').click();
    await page.locator('#mobile-quest-summary').click();assert.ok(await page.locator('#quest-tracker').isVisible());
    assert.equal((await page.locator('#quest-coach span').textContent()).trim(),lang==='en'?'Guide':'ไกด์');
    const quest=await page.locator('#quest-tracker').boundingBox(),coach=await page.locator('#quest-coach').boundingBox();
    assert.ok(quest.x>=0&&quest.x+quest.width<=width&&quest.y+quest.height<=height);assert.ok(coach.width<120&&coach.height<=46);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight));
    if(width===932)await page.screenshot({path:fileURLToPath(new URL(role+'-'+lang+'-guide.png',out))});
    await page.locator('#mobile-quest-summary').click();
    if(width===932||width===667)await page.screenshot({path:fileURLToPath(new URL(role+'-'+lang+'-'+width+'.png',out))});
    checks.push({role,lang,width,height,skills:reached.size});console.log('PASS',role,lang,width,height,reached.size,'skills');
   }
   await page.locator('#events-chip').click();assert.ok(await page.locator('#events-window').isVisible());await page.keyboard.press('Escape');
   await page.locator('#online-button').click();assert.ok(await page.locator('#online-panel').isVisible());await page.keyboard.press('Escape');
  }
  await context.close();
 }
 assert.deepEqual(errors,[]);await writeFile(new URL('checks.json',out),JSON.stringify({checks,errors},null,2));
}finally{await browser.close();await host.close();}
