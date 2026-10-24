// Exercise real menu actions against isolated accounts, including full inventory.
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {LocalStore} from '../server/storage.js';
import {createHost} from '../server/host.js';
import {levelStart,XP_CURVE} from '../experience.js';
import {ITEMS} from '../items.js';
const out=new URL('../outputs/center132/',import.meta.url);await mkdir(out,{recursive:true});
const base='http://127.0.0.1:8923',store=await new LocalStore(fileURLToPath(new URL('store/',out))).init();
const catalog=JSON.parse(await readFile(new URL('../maps/world.json',import.meta.url),'utf8'));
const host=await createHost({mode:'local',store,catalog,origins:[base],serveStatic:true});await new Promise(r=>host.server.listen(8923,'127.0.0.1',r));
const {chromium}=await import(pathToFileURL(process.argv[2]).href),browser=await chromium.launch({channel:'msedge',headless:true}),errors=[],checks=[];
const menus=[['menu-bag','#bag-window'],['menu-skills','#skill-window'],['menu-quests','#quests-window'],['menu-market','#market-board'],['menu-rank','#leaderboard'],['menu-social','#social-window'],['menu-status','#status-window'],['menu-pet','#pet-window'],['menu-mail','#mail-window'],['menu-settings','#account-panel .account-card'],['open-account','#profile-card'],['events-chip','#events-window']];
try{
 for(const mobile of [false,true]){
  const seed=await store.createLocal({name:'WindowQA',gender:'male'}),record=store.rows.get(seed.uid);
  record.character.classId='shaman';record.character.jobId='spirit-master';record.xpCurve=XP_CURVE;
  record.state.mapId='ayutthaya';record.state.traveler.baseXp=levelStart(70);record.state.traveler.jobXp=1000000;
  record.skills={_tree84:Array(15).fill(0),_roles116:Array(15).fill(0),shaman:Array(15).fill(10)};
  record.bag={coins:10000,items:Object.fromEntries(Object.keys(ITEMS).slice(0,38).map(id=>[id,20]))};
  record.daily={day:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),streak:1};
  const context=await browser.newContext({viewport:{width:mobile?932:1920,height:mobile?430:945},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:1});
  await context.route('**/multiplayer-config.js*',r=>r.fulfill({contentType:'text/javascript',body:`export function multiplayerURL(){return '${base.replace('http','ws')}/realtime'}export function wakeServer(){}`}));
  await context.addInitScript(({record,token})=>{
   sessionStorage.setItem('ayothaya-entry-v1',JSON.stringify({owner:'guest',serverId:'server-1',slotId:'slot-1'}));sessionStorage.setItem('ayothaya-local-network:slot-1',JSON.stringify({token,serverId:'server-1',slotId:'slot-1'}));
   localStorage.setItem('ayothaya-character-v2:slot-1',JSON.stringify(record));localStorage.setItem('ayothaya.lang','th');localStorage.setItem('ayothaya-coach-off','1');localStorage.setItem('ayothaya-perf',JSON.stringify({quality:'low',fps:30}));
  },{record,token:seed.token});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/game.html?server=server-1&map=ayutthaya');await page.waitForFunction(()=>window.__ayothaya?.game.actionBar&&document.getElementById('online-button')?.dataset.state==='online',null,{timeout:90000});await page.waitForTimeout(1200);
  for(const [width,height] of mobile?[[932,430],[667,375],[390,844]]:[[1920,945],[1440,900],[1024,768],[1280,600]]){
   await page.setViewportSize({width,height});await page.waitForTimeout(150);
   await page.evaluate(()=>{for(const d of document.querySelectorAll('dialog[open]'))d.close();if(document.getElementById('dock-toggle')?.getAttribute('aria-expanded')==='true')document.getElementById('dock-toggle').click();});
   for(const [id,selector] of menus){
    if(id.startsWith('menu-')&&!(await page.locator('#'+id).isVisible()))await page.locator('#menu-toggle').click();
    await page.locator('#'+id).click();await page.locator(selector).waitFor({state:'visible'});await page.waitForTimeout(60);
    const r=await page.locator(selector).boundingBox();
    const clear=await page.locator(selector).evaluate(panel=>{const r=panel.getBoundingClientRect(),hit=document.elementFromPoint(r.right-20,r.bottom-20);return panel===hit||panel.contains(hit);});assert.ok(clear,id+' must stay above gameplay controls');
    assert.ok(r&&r.x>=-1&&r.y>=-1&&r.x+r.width<=width+1&&r.y+r.height<=height+1,`${width} ${id} outside viewport: ${JSON.stringify(r)}`);
    assert.ok(Math.abs(r.x+r.width/2-width/2)<2&&Math.abs(r.y+r.height/2-height/2)<2,`${width} ${id} is not centred: ${JSON.stringify(r)}`);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight),id+' page must not scroll');
    if(id==='menu-bag'||id==='menu-pet')await page.screenshot({path:fileURLToPath(new URL(id+'-'+width+'.png',out))});
    checks.push({mobile,width,height,id,rect:r});await page.keyboard.press('Escape');
   }
   console.log('PASS',mobile?'touch':'desktop',width,height,menus.length,'menu windows centred');
  }
  await context.close();
 }
 assert.deepEqual(errors,[]);await writeFile(new URL('checks.json',out),JSON.stringify({checks,errors},null,2));
}finally{await browser.close();await host.close();}
