import assert from 'node:assert/strict';
import {mkdir,mkdtemp,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {WebSocket} from 'ws';
import {LocalStore} from '../server/storage.js';
import {createHost} from '../server/host.js';
import {initialSave} from '../realm-state.js';
import {XP_CURVE,levelStart} from '../experience.js';
import {STORY} from '../story-quests.js';
import {ITEMS} from '../items.js';
import {MARKET_ZONE,openShop,tradePerks,recordPrice} from '../market-board.js';
const out=new URL('../outputs/market188/',import.meta.url);await mkdir(out,{recursive:true});
const catalog=JSON.parse(await readFile(new URL('../maps/world.json',import.meta.url),'utf8'));catalog.maps.find(m=>m.id==='ayutthaya').citizens=[];
const store=await new LocalStore(await mkdtemp(fileURLToPath(new URL('store-',out)))).init(),origins=[];
const host=await createHost({mode:'local',store,catalog,origins,serveStatic:true});await new Promise(r=>host.server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+host.server.address().port;origins.push(base);
const {chromium}=await import(pathToFileURL(process.argv[2]).href),browser=await chromium.launch({channel:'msedge',headless:true,args:['--explicitly-allowed-ports='+host.server.address().port]});
const sockets=[],errors=[],commands=[],checks=[],now=Date.now();
const ids=['rat-tooth','hp-small','iron-ore','weapon-swordsman-one','pierce-armor-swordsman-one','card-rat'];
for(let i=0;i<32;i++){
 const r=openShop({bag:{coins:0,items:Object.fromEntries(ids.map(id=>[id,10]))},req:{title:'ร้านทดลอง '+String(i+1).padStart(2,'0'),items:Object.fromEntries(ids.map((id,j)=>[id,{count:10,price:20+i*10+j*5}]))},
  perks:tradePerks(0),owner:{key:'fixture:'+i,name:'แม่ค้าคน'+String(i+1).padStart(2,'0'),serverId:'server-1'},x:MARKET_ZONE.x+3+(i%7)*3.4,z:MARKET_ZONE.z+3+Math.floor(i/7)*3.4,mapId:'ayutthaya',now:now-i*10000,id:'browse-'+i,existing:[...host.realm.shops.values()]});
 host.realm.shops.set(r.shop.id,r.shop);
}
let prices=recordPrice({},'rat-tooth',20,now,25);prices=recordPrice(prices,'weapon-swordsman-one',80,now,3);host.realm.prices.set('server-1',prices);
async function launch(mobile=false,lang='th'){
 const source=await store.createLocal({name:mobile?'ตลาดมือถือ':'ตลาดคอม',gender:'male'}),record=store.rows.get(source.uid);
 record.character.classId='swordsman';record.state=initialSave();record.state.position={x:MARKET_ZONE.x+3,z:MARKET_ZONE.z+3};record.state.traveler.baseXp=levelStart(30);record.xpCurve=XP_CURVE;
 record.story={v:3,quest:STORY.length,step:0,count:0,done:true};record.bag={coins:50000,slots:100,items:{}};
 record.daily={day:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),streak:1};
 const context=await browser.newContext({viewport:{width:mobile?844:1440,height:mobile?390:900},isMobile:mobile,hasTouch:mobile});
 await context.route('http://127.0.0.1:8787/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'}));
 await context.routeWebSocket('ws://127.0.0.1:8787/realtime',route=>{
  const socket=new WebSocket(base.replace('http','ws')+'/realtime',{origin:base}),pending=[];sockets.push(socket);
  route.onMessage(m=>{commands.push(JSON.parse(m));socket.readyState===1?socket.send(m):pending.push(m);});
  socket.on('open',()=>pending.splice(0).forEach(m=>socket.send(m)));socket.on('message',m=>route.send(m.toString()));socket.on('error',e=>errors.push(e.message));route.onClose(()=>socket.close());socket.on('close',(code,reason)=>route.close({code:code===1006?1000:code,reason:reason.toString()}));
 });
 await context.addInitScript(({record,token,lang})=>{
  sessionStorage.setItem('ayothaya-entry-v1',JSON.stringify({owner:'guest',serverId:'server-1',slotId:'slot-1'}));
  sessionStorage.setItem('ayothaya-local-network:slot-1',JSON.stringify({token,serverId:'server-1',slotId:'slot-1'}));
  localStorage.setItem('ayothaya-character-v2:slot-1',JSON.stringify(record));localStorage.setItem('ayothaya.lang',lang);localStorage.setItem('ayothaya-coach-off','1');
  localStorage.setItem('ayothaya-perf',JSON.stringify({quality:'low',fps:30}));localStorage.setItem('ayothaya-welcome:ayothaya-story:server-1:slot-1','1');
 },{record,token:source.token,lang});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/game.html?server=server-1&map=ayutthaya');
 await page.waitForFunction(()=>window.__ayothaya&&document.getElementById('online-button')?.dataset.state==='online',null,{timeout:120000});
 await page.evaluate(()=>{for(const d of document.querySelectorAll('dialog[open]'))d.close();});
 await page.locator('#menu-bag').evaluate(n=>n.click());await page.locator('#open-market-board').click();
 try{await page.waitForFunction(()=>document.querySelectorAll('.board-product').length===24&&document.querySelector('.board-results')?.getAttribute('aria-busy')==='false');}
 catch(error){await page.screenshot({path:fileURLToPath(new URL('debug.png',out))});await writeFile(new URL('debug.json',out),JSON.stringify({errors,marketCommands:commands.filter(m=>m.type==='marketSearch'),html:await page.locator('#market-board').evaluate(n=>n.outerHTML),peers:[...host.realm.peers.values()].map(p=>({name:p.character.name,browse:p.marketBrowse,events:p.world.events.filter(e=>e.type==='marketResults')}))},null,2));throw error;}
 return {page,context,source};
}
async function ready(page){await page.waitForFunction(()=>document.querySelector('.board-results')?.getAttribute('aria-busy')==='false');}
async function fit(page,width,height,label){
 await page.setViewportSize({width,height});await page.waitForTimeout(150);await page.evaluate(()=>document.querySelector('#orientation-gate[open]')?.close());
 const r=await page.locator('#market-board').evaluate(n=>{const b=n.getBoundingClientRect(),c=n.querySelector('#board-close').getBoundingClientRect(),body=n.querySelector('#board-body');return {x:b.x,y:b.y,right:b.right,bottom:b.bottom,overflow:n.scrollWidth-n.clientWidth,bodyOverflow:body.scrollWidth-body.clientWidth,close:c.bottom};});
 assert.ok(r.x>=-1&&r.y>=-1&&r.right<=width+1&&r.bottom<=height+1&&r.close<=height+1&&r.overflow<2&&r.bodyOverflow<2,JSON.stringify({width,height,r}));
 const first=await page.locator('.board-product').first().boundingBox();assert.ok(first&&first.y<r.bottom-40,'Products must be visible on opening '+label+' '+width+'x'+height);
 await page.locator('#board-body').evaluate(n=>n.scrollTop=0);await page.screenshot({path:fileURLToPath(new URL(label+'-'+width+'x'+height+'.png',out))});
 checks.push('Fits '+label+' '+width+'x'+height);
}
try{
 const {page,context,source}=await launch();
 assert.ok(commands.some(m=>m.type==='marketSearch'&&m.query===''));checks.push('Opening the market shows 24 of 192 listings without typing');
 const searches=commands.filter(m=>m.type==='marketSearch').length;await page.waitForTimeout(1200);assert.equal(commands.filter(m=>m.type==='marketSearch').length,searches);checks.push('No recurring search polling');
 for(const size of [[1920,1080],[1440,900],[1024,768]])await fit(page,...size,'desktop');
 await page.locator('[data-category="card"]').click();await ready(page);assert.equal(await page.locator('.board-product').count(),24);assert.ok((await page.locator('.board-section-title h3').last().innerText()).includes('32'));
 await page.locator('#board-q').fill('แม่ค้าคน01');await page.waitForTimeout(400);await ready(page);assert.equal(await page.locator('.board-product').count(),1);
 await page.locator('#board-q').focus();await page.locator('#board-q').evaluate(n=>n.setSelectionRange(2,4));
 const s=host.realm.shops.get('browse-0');s.items['card-rat'].price=123;host.realm.shopsChanged('server-1');await page.waitForTimeout(1200);
 assert.equal(await page.locator('#board-q').inputValue(),'แม่ค้าคน01');assert.equal(await page.evaluate(()=>document.activeElement.id),'board-q');assert.equal(await page.locator('#board-q').evaluate(n=>n.selectionStart),2);checks.push('Seller/category filters work; live results preserve typing focus and caret');
 await page.locator('#board-reset').click();await ready(page);await page.locator('.board-results').evaluate(n=>n.scrollTop=200);s.items['hp-small'].count=9;host.realm.shopsChanged('server-1');await page.waitForTimeout(1200);assert.ok(Math.abs(await page.locator('.board-results').evaluate(n=>n.scrollTop)-200)<2);checks.push('Live stock changes preserve the product list scroll position');
 await page.locator('#board-next').click();await ready(page);assert.ok((await page.locator('.board-pagination span').innerText()).includes('2 / 8'));checks.push('All listings remain reachable through pagination');
 await page.locator('#board-reset').click();await ready(page);await page.locator('[data-category="weapon"]').click();await ready(page);
 await page.locator('#board-sort').selectOption('price-high');await ready(page);assert.ok((await page.locator('.board-product-price').first().innerText()).includes('345'));
 await page.locator('#board-price-min').fill('100');await page.locator('#board-price-max').fill('200');await page.waitForTimeout(550);await ready(page);
 for(const text of await page.locator('.board-product-price').allInnerTexts()){const n=Number(text.replace(/[^0-9]/g,''));assert.ok(n>=100&&n<=200,text);}checks.push('Price sorting and price range combine with equipment category');
 await page.locator('#board-reset').click();await ready(page);
 const peer=[...host.realm.peers.values()].find(p=>p.uid===source.uid);Object.assign(peer.world.player,{x:s.x,z:s.z});
 await page.evaluate(()=>window.__ayothaya.game.world.market('shopBuy',{shop:'browse-0',item:'rat-tooth',count:10}));await page.waitForTimeout(1200);
 assert.equal(peer.bag.items['rat-tooth'],10);assert.equal(host.realm.prices.get('server-1')['rat-tooth'].days[0].units,35);assert.ok((await page.locator('.board-trend').first().innerText()).includes('35'));checks.push('Actual WebSocket purchase removes sold listing and updates real demand');
 await page.locator('#board-close').click();await page.waitForTimeout(80);assert.equal(peer.marketBrowse,undefined);checks.push('Closing stops the market subscription');await context.close();
 for(const lang of ['th','en']){
  const {page,context}=await launch(true,lang);for(const size of [[844,390],[667,375],[390,844]])await fit(page,...size,'mobile-'+lang);await context.close();
 }
 assert.deepEqual(errors,[]);await writeFile(new URL('checks.json',out),JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks,errors},null,2));
}finally{for(const s of sockets)s.terminate();await browser.close();await host.close();}
