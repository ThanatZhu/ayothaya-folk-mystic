import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {WebSocket} from 'ws';
import {LocalStore} from '../server/storage.js';
import {createHost} from '../server/host.js';
import {levelStart,XP_CURVE} from '../experience.js';
const out=new URL('../outputs/combat142/',import.meta.url);await mkdir(out,{recursive:true});
const catalog=JSON.parse(await readFile(new URL('../maps/world.json',import.meta.url),'utf8'));
const store=await new LocalStore(fileURLToPath(new URL('store/',out))).init(),base='http://127.0.0.1:8920';
const host=await createHost({mode:'local',store,catalog,origins:[base],serveStatic:true});await new Promise(r=>host.server.listen(8920,'127.0.0.1',r));
const {chromium}=await import(pathToFileURL(process.argv[2]).href),browser=await chromium.launch({channel:'msedge',headless:true}),errors=[];
try{
 const seeded=await store.createLocal({name:'ActionbarQA',gender:'male'}),record=store.rows.get(seeded.uid);
 record.character.classId='shaman';record.character.jobId='spirit-master';record.xpCurve=XP_CURVE;record.state.mapId='ayutthaya';record.state.traveler.baseXp=levelStart(59);record.skills={_tree84:Array(15).fill(0),_roles116:Array(15).fill(0),shaman:Array(15).fill(10)};
 record.bag={coins:2000,items:{'hp-small':8,'mp-small':8,'fly-wing':2,'return-incense':2}};record.daily={day:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),streak:1};
 const context=await browser.newContext({viewport:{width:1440,height:900}});
 await context.route('http://127.0.0.1:8787/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'}));
 await context.routeWebSocket('ws://127.0.0.1:8787/realtime',route=>{
  const socket=new WebSocket(base.replace('http','ws')+'/realtime',{origin:base}),pending=[];
  route.onMessage(m=>socket.readyState===1?socket.send(m):pending.push(m));socket.on('open',()=>pending.splice(0).forEach(m=>socket.send(m)));socket.on('message',m=>route.send(m.toString()));
  socket.on('error',e=>errors.push(e.message));route.onClose(()=>socket.close());socket.on('close',(code,reason)=>route.close({code:code===1006?1000:code,reason:reason.toString()}));
 });
 await context.addInitScript(({record,token})=>{
  sessionStorage.setItem('ayothaya-entry-v1',JSON.stringify({owner:'guest',serverId:'server-1',slotId:'slot-1'}));
  sessionStorage.setItem('ayothaya-local-network:slot-1',JSON.stringify({token,serverId:'server-1',slotId:'slot-1'}));
  localStorage.setItem('ayothaya-character-v2:slot-1',JSON.stringify(record));localStorage.setItem('ayothaya.lang','th');localStorage.setItem('ayothaya-coach-off','1');localStorage.setItem('ayothaya-perf',JSON.stringify({quality:'low',fps:30}));
 },{record,token:seeded.token});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/game.html?server=server-1&map=ayutthaya');await page.waitForFunction(()=>window.__ayothaya?.game.actionBar&&document.getElementById('online-button')?.dataset.state==='online',null,{timeout:120000});
 await page.waitForTimeout(1200);await page.evaluate(()=>{for(const d of document.querySelectorAll('dialog[open]'))d.close();if(document.getElementById('dock-toggle')?.getAttribute('aria-expanded')==='true')document.getElementById('dock-toggle').click();});
 assert.ok(await page.locator('#desktop-actionbar').isVisible());assert.ok(!(await page.locator('.combat-controls').isVisible()));assert.ok(!(await page.locator('#quick-slots').isVisible()));
 assert.ok(await page.locator('#attack').isEnabled());assert.equal(await page.locator('#actionbar-life #emote-open').count(),1);
 await page.locator('#auto-settings-open').click();await page.locator('#auto-settings-window[open]').waitFor();await page.keyboard.press('Escape');
 const safeNote='ทุกเมืองเป็นเขตปลอดภัย',safeBefore=await page.locator('#online-messages p.system').filter({hasText:safeNote}).count();await page.locator('#auto-attack').click();await page.waitForFunction(before=>[...document.querySelectorAll('#online-messages p.system')].filter(p=>p.textContent.includes('ทุกเมืองเป็นเขตปลอดภัย')).length>before,safeBefore);assert.equal(await page.locator('#auto-attack').getAttribute('aria-pressed'),'false','AUTO still obeys the server safe-zone guard');
 await page.locator('#emote-open').click();assert.ok(await page.locator('#emote-window').isVisible());await page.keyboard.press('Escape');
 if(await page.locator('#run-toggle').isEnabled()){
  const before=await page.evaluate(()=>window.__ayothaya.game.runningRequested);await page.locator('#run-toggle').click();
  assert.equal(await page.evaluate(()=>window.__ayothaya.game.runningRequested),!before);assert.equal(await page.locator('#run-toggle .movement-label').textContent(),before?'วิ่ง':'เดิน');
  assert.equal(await page.locator('#run-toggle svg:visible').count(),0);assert.ok(await page.locator('#run-toggle .action-helper-art').isVisible());await page.locator('#run-toggle').click();
 }
 while(!(await page.locator('#actionbar-remove').isDisabled()))await page.locator('#actionbar-remove').click();
 const bottom=await page.locator('.actionbar-row[data-row="0"]').boundingBox(),entries=await page.evaluate(()=>window.__ayothaya.game.actionBar.state.slots.slice(0,8));
 await page.locator('#actionbar-add').click();const same=await page.locator('.actionbar-row[data-row="0"]').boundingBox();assert.equal(Math.round(bottom.y),Math.round(same.y));assert.equal(await page.locator('.actionbar-row').first().getAttribute('data-row'),'1');
 await page.locator('#actionbar-add').click();await page.locator('#actionbar-remove').click();assert.deepEqual(await page.evaluate(()=>window.__ayothaya.game.actionBar.state.slots.slice(0,8)),entries);
 const drag=async(source,target)=>{
  const s=await source.boundingBox(),t=await target.boundingBox();assert.ok(s&&t);await page.mouse.move(s.x+s.width/2,s.y+s.height/2);await page.mouse.down();await page.mouse.move(t.x+t.width/2,t.y+t.height/2,{steps:12});await page.mouse.up();await page.waitForTimeout(150);
 };
 await page.keyboard.press('b');await page.locator('#bag-grid [data-id="hp-small"]').waitFor();
 const beforeDrop=await page.evaluate(()=>window.__ayothaya.game.world.bag.items['hp-small']);
 await drag(page.locator('#bag-grid [data-id="hp-small"]'),page.locator('.action-slot[data-index="0"]'));
 assert.deepEqual(await page.evaluate(()=>window.__ayothaya.game.actionBar.state.slots[0]),{kind:'item',id:'hp-small'});assert.ok(!(await page.locator('#bag-discard').isVisible()));
 assert.equal(await page.evaluate(()=>window.__ayothaya.game.world.bag.items['hp-small']),beforeDrop,'assigning a shortcut neither consumes nor discards inventory');
 await page.locator('#bag-close').click();const peer=[...host.realm.peers.values()].find(p=>p.uid===seeded.uid);peer.world.player.hp=Math.max(1,peer.world.player.maxHp-50);await page.waitForTimeout(180);
 const count=peer.bag.items['hp-small'];await page.keyboard.press('1');await page.waitForTimeout(350);assert.equal(peer.bag.items['hp-small'],count-1,'shortcut uses server-owned inventory');
 await page.keyboard.press('k');await page.locator('#skill-window').waitFor({state:'visible'});
 await drag(page.locator('#skill-window .skill-node[data-slot="0"] strong'),page.locator('.action-slot[data-index="1"]'));assert.deepEqual(await page.evaluate(()=>window.__ayothaya.game.actionBar.state.slots[1]),{kind:'skill',index:0});await page.locator('#skill-close').click();
 await drag(page.locator('.action-slot[data-index="0"]'),page.locator('.action-slot[data-index="2"]'));assert.deepEqual(await page.evaluate(()=>window.__ayothaya.game.actionBar.state.slots[2]),{kind:'item',id:'hp-small'});
 peer.world.cooldowns[0]=4;await page.waitForFunction(()=>/^[1-4]$/.test(document.querySelector('.action-slot[data-index="1"] em')?.textContent),null,{timeout:3500});assert.match(await page.locator('.action-slot[data-index="1"] em').textContent(),/^[1-4]$/);peer.world.cooldowns[0]=0;
 const saved=await page.evaluate(()=>window.__ayothaya.game.actionBar.state);await page.reload();await page.waitForFunction(()=>window.__ayothaya?.game.actionBar&&document.getElementById('online-button')?.dataset.state==='online');await page.waitForTimeout(750);assert.deepEqual(await page.evaluate(()=>window.__ayothaya.game.actionBar.state),saved);
 for(const [w,h] of [[1920,1080],[1440,900],[1280,720],[1024,768],[1280,600]]){
  await page.setViewportSize({width:w,height:h});await page.waitForTimeout(200);
  const r=await page.locator('#desktop-actionbar').boundingBox();assert.ok(r&&r.x>=0&&r.x+r.width<=w&&r.y+r.height<=h);
  const grid=await page.locator('.actionbar-rows').boundingBox(),tools=await page.locator('.actionbar-tools').boundingBox();assert.ok(Math.abs(grid.x+grid.width/2-w/2)<1,'the grid itself is centered');assert.ok(tools.x>=grid.x+grid.width&&tools.x+tools.width<=w,'side controls stay outside the grid and inside the screen');
  const resize=await page.locator('.actionbar-resize').boundingBox();assert.ok(resize.x>=0&&resize.x+resize.width<grid.x,'row controls stay on the left of the grid');assert.ok(resize.y>=0&&resize.y+resize.height<=h);
  const boxes=await page.evaluate(()=>Object.fromEntries(['actionbar-add','actionbar-remove','emote-open','run-toggle','auto-attack','auto-settings-open','attack'].map(id=>{const r=document.getElementById(id).getBoundingClientRect();return [id,{x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height}];})));
  assert.ok(Math.abs(boxes['actionbar-add'].y-boxes['emote-open'].y)<1&&Math.abs(boxes['actionbar-remove'].y-boxes['run-toggle'].y)<1,'helper pairs share horizontal levels');
  assert.ok(Math.abs(boxes['actionbar-remove'].x-boxes['actionbar-add'].x)<1&&Math.abs(boxes['emote-open'].x-boxes['run-toggle'].x)<1,'helper pairs are vertical');
  const gap=boxes['actionbar-remove'].y-boxes['actionbar-add'].bottom;assert.ok(gap>=8&&gap<=14,'plus/minus keep a small fixed gap');
  const a=boxes['auto-attack'],g=boxes['auto-settings-open'],s=boxes.attack;assert.ok(a.width>=80&&s.width>=80&&g.width>=32&&g.width<=40,'battle buttons are enlarged with a smaller settings cog');
  assert.ok(Math.abs(a.x-s.x)<1&&s.y>a.bottom,'auto and attack form a separate vertical column');assert.ok(g.x>a.x+a.width/2&&g.y<a.y+4&&g.bottom>a.y,'settings overlaps the top right corner of AUTO');
  for(const [id,b] of Object.entries(boxes))assert.ok(b.x>=0&&b.y>=0&&b.right<=w&&b.bottom<=h,id+' fits the viewport');
  for(const id of ['actionbar-add','actionbar-remove','emote-open','run-toggle']){
   const image=page.locator('#'+id+' img');assert.match(await image.getAttribute('src'),/assets\/ui-action141\/.+\.webp/);await image.evaluate(i=>i.decode());assert.ok(await image.isVisible());
   const clickable=await page.locator('#'+id).evaluate(b=>{const r=b.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return b===hit||b.contains(hit);});assert.ok(clickable,id+' remains unobstructed');
  }
  for(const [id,art,size] of [['auto-attack','auto',512],['auto-settings-open','settings',256],['attack','attack',512]]){
   const image=page.locator('#'+id+' .combat-control-art');assert.equal(await image.getAttribute('src'),'assets/ui-combat142/'+art+'.webp');await image.evaluate(i=>i.decode());assert.equal(await image.evaluate(i=>i.naturalWidth),size);assert.ok(await image.isVisible());
   assert.ok(await page.locator('#'+id).evaluate(b=>{const r=b.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return b===hit||b.contains(hit);}),id+' is clickable');
  }
  const events=await page.evaluate(()=>{const map=document.querySelector('.mini-panel').getBoundingClientRect();return [...document.querySelectorAll('#hud-chips>button')].filter(b=>!b.hidden).map(b=>{const s=getComputedStyle(b),r=b.getBoundingClientRect();return {x:r.x,y:r.y,bottom:r.bottom,mapBottom:map.bottom,bg:s.backgroundImage,color:s.backgroundColor,shadow:s.boxShadow,iconShadow:getComputedStyle(b,'::before').filter,image:getComputedStyle(b,'::before').backgroundImage};});});
  assert.ok(events.length>0);for(const e of events){assert.equal(e.bg,'none');assert.equal(e.color,'rgba(0, 0, 0, 0)');assert.equal(e.shadow,'none');assert.match(e.iconShadow,/drop-shadow/);assert.match(e.image,/status-ai-v1\/.*\.webp/,'real generated art is bound to each event');assert.ok(e.y>=e.mapBottom,'desktop events begin below the map');assert.ok(e.bottom<=h,'desktop event column fits');}
  for(let i=1;i<events.length;i++){assert.equal(events[i].x,events[0].x);assert.ok(events[i].y>=events[i-1].bottom,'desktop events form a vertical column');}
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:fileURLToPath(new URL('desktop-'+w+'.png',out))});console.log('desktop',w,h,'8 columns, fits');
 }
 for(const [width,height] of [[1440,900],[1024,768],[1280,600]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(100);
  while(!(await page.locator('#actionbar-remove').isDisabled()))await page.locator('#actionbar-remove').click();
  await page.locator('#emote-open').click();let previous=null;
  for(const count of [1,2,3,4,3,2,1]){
   while((await page.locator('.actionbar-row').count())<count)await page.locator('#actionbar-add').click();
   while((await page.locator('.actionbar-row').count())>count)await page.locator('#actionbar-remove').click();
   await page.waitForTimeout(70);
   const picker=await page.locator('#emote-window').boundingBox(),grid=await page.locator('.actionbar-rows').boundingBox();
   const resize=await page.locator('.actionbar-resize').boundingBox();assert.ok(resize.x>=0&&resize.x+resize.width<grid.x&&resize.y>=0&&resize.y+resize.height<=height,'painted row controls fit at every row count');
   assert.ok(Math.abs(resize.height-130)<1,'row controls no longer spread apart as rows grow');
   assert.ok(picker.x>=0&&picker.y>=0&&picker.x+picker.width<=width,'emote picker fits');
   assert.ok(Math.abs(grid.y-picker.y-picker.height-10)<2,'emotes sit ten pixels above the current top row');
   if(previous&&previous.count!==count)assert.ok(count>previous.count?picker.y+picker.height<previous.bottom:picker.y+picker.height>previous.bottom,'open picker follows added and removed rows');
   previous={count,bottom:picker.y+picker.height};
   const targets=await page.locator('#emote-window [data-b]').evaluateAll(nodes=>nodes.map(b=>{const r=b.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return b===hit||b.contains(hit);}));
   assert.equal(targets.length,24);if(!targets.every(Boolean))await page.screenshot({path:fileURLToPath(new URL('emote-click-failure.png',out))});assert.ok(targets.every(Boolean),'every emote remains clickable above the table: '+JSON.stringify({width,height,count,targets}));
   if(count===4)await page.screenshot({path:fileURLToPath(new URL('emotes-four-rows-'+width+'.png',out))});
  }
  await page.locator('#emote-window [data-b="24"]').click();assert.ok(!(await page.locator('#emote-window').isVisible()));
  console.log('emotes',width,height,'follow rows 1–4 and back; all 24 targets clickable');
 }
 while(!(await page.locator('#actionbar-add').isDisabled()))await page.locator('#actionbar-add').click();await page.screenshot({path:fileURLToPath(new URL('desktop-four-rows.png',out))});
 for(const [w,h] of [[844,390],[667,375]]){
  await page.setViewportSize({width:w,height:h});await page.waitForTimeout(350);await page.evaluate(()=>{for(const d of document.querySelectorAll('dialog[open]'))d.close();if(document.getElementById('dock-toggle')?.getAttribute('aria-expanded')==='true')document.getElementById('dock-toggle').click();});
  assert.ok(!(await page.locator('#desktop-actionbar').isVisible()));assert.ok(await page.locator('.combat-controls').isVisible());
  assert.equal(await page.locator('.action-helper-art:visible').count(),0,'mobile controls retain their established layout');
  assert.equal(await page.locator('.combat-control-art:visible').count(),0,'desktop combat artwork does not alter the mobile wheel');
  const geometry=await page.evaluate(()=>[...document.querySelectorAll('#skills .skill')].filter(b=>!b.hidden&&!b.hasAttribute('data-mobile-away')).map(b=>{const r=b.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,radius:getComputedStyle(b).borderRadius};}));
  assert.ok(geometry.length>0&&geometry.length<=4);assert.ok(geometry.every(r=>r.radius==='50%'&&r.w>=44&&r.x>=0&&r.x+r.w<=w&&r.y>=0&&r.y+r.h<=h),JSON.stringify(geometry));
  assert.equal(await page.locator('#quick-slots > button[id^="quick-"]:visible').count(),4);
  for(let i=0;i<4;i++)assert.ok(await page.locator('#quick-'+i).isEnabled(),'all four owned quick items are usable');
  assert.equal(await page.locator('#skills .mobile-skill-empty').count(),0,'unused skill positions never paint floating disks');
  for(let i=0;i<geometry.length;i++)for(let j=i+1;j<geometry.length;j++){const a=geometry[i],b=geometry[j];assert.ok(a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y,'mobile skill targets do not overlap');}
  await page.locator('#skill-bank').click();await page.screenshot({path:fileURLToPath(new URL('mobile-'+w+'.png',out))});console.log('mobile',w,h,'circular skills, fits');
 }
 assert.deepEqual(errors,[]);await writeFile(new URL('checks.json',out),JSON.stringify({errors,desktopSizes:5,mobileSizes:2,paintedButtons:7,rowControlsOnLeft:true,verticalHelpers:true,cornerGear:true,safeZoneAutoGuard:true,autoSettings:true,bagDrop:true,skillDrop:true,serverItemUse:true,cooldown:true,persistence:true},null,2));
 await context.close();console.log('PASS actionbar: drag, reorder, use, row anchoring, persistence, desktop and mobile');
}finally{await browser.close();await host.close();}
