// Browser-only entry-flow QA. No Firebase, real accounts or persistent game saves.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {mobileLobbyFixture} from './mobile-lobby-fixture.mjs';

const root=resolve('.'),out=resolve('outputs/arrival186');await mkdir(out,{recursive:true});
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.ttf':'font/ttf','.json':'application/json'};
const service=createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');if(url.pathname==='/mobile-lobby-fixture.html'){res.setHeader('Content-Type',mime['.html']);res.end(await mobileLobbyFixture());return;}const file=resolve(root,'.'+decodeURIComponent(url.pathname));if(!file.startsWith(root+sep)||!mime[extname(file)])throw Error('path');const body=await readFile(file);res.writeHead(200,{'Content-Type':mime[extname(file)],'Cache-Control':'public,max-age=3600'});res.end(body);}catch{res.writeHead(404);res.end('not found');}});
await new Promise(r=>service.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+service.address().port;
const {chromium}=await import(pathToFileURL(process.argv[2]).href),browser=await chromium.launch({channel:'msedge',headless:true,args:['--explicitly-allowed-ports='+service.address().port]}),errors=[],failures=[],results=[],features=[];
const sizes=process.env.ARRIVAL_SIZES?JSON.parse(process.env.ARRIVAL_SIZES):[[320,480],[320,568],[360,640],[375,667],[390,844],[430,932],[568,280],[568,320],[667,300],[667,375],[740,320],[812,305],[844,390],[932,430],[1024,600],[1024,768],[1280,590],[1280,720],[1366,768],[1440,900],[1920,1080],[2560,1440],[768,1024],[820,1180]];
const states=[['login','signed'],['login','anon'],['login','new'],['login','error'],['servers','signed'],['character','signed'],['create','signed']];
async function inspect(page,{modal=false}={}){return page.evaluate(({modal})=>{
 const issues=[],w=innerWidth,h=Math.min(innerHeight,visualViewport?.height??innerHeight),scope=modal?document.querySelector('.path-dialog'):document;
 const visible=e=>!!e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden'&&!e.closest('[hidden]');
 for(const e of scope.querySelectorAll('button,input:not([type=radio]),.lobby-card,.character-stage')){if(!visible(e))continue;const r=e.getBoundingClientRect(),key=e.id||e.className;if(r.left<-.6||r.top<-.6||r.right>w+.6||r.bottom>h+.6)issues.push(key+' outside '+JSON.stringify({x:r.x,y:r.y,w:r.width,h:r.height}));if(e.tagName==='BUTTON'&&r.height<43.5)issues.push(key+' touch target '+r.height);}
 // A software keyboard reduces the visual viewport without shrinking the
 // layout viewport. Check page scroll against the latter, controls against h.
 if(!modal){if(document.documentElement.scrollWidth>w+1||document.documentElement.scrollHeight>innerHeight+1)issues.push('document scroll '+document.documentElement.scrollWidth+'x'+document.documentElement.scrollHeight);for(const e of document.querySelectorAll('.lobby-layout,.lobby-card,.screen,.character-body,.character-details,#character-slots,.login-actions')){if(!visible(e))continue;if(e.scrollHeight>e.clientHeight+2||e.scrollWidth>e.clientWidth+2)issues.push((e.id||e.className)+' content overflow '+e.scrollWidth+'x'+e.scrollHeight+' / '+e.clientWidth+'x'+e.clientHeight);}}
 const buttons=[...scope.querySelectorAll(modal?'button':'.lobby-card button')].filter(visible);for(let i=0;i<buttons.length;i++)for(let j=i+1;j<buttons.length;j++){const a=buttons[i].getBoundingClientRect(),b=buttons[j].getBoundingClientRect();if(a.left<b.right-1&&a.right>b.left+1&&a.top<b.bottom-1&&a.bottom>b.top+1)issues.push('buttons overlap '+(buttons[i].id||buttons[i].className)+'/'+(buttons[j].id||buttons[j].className));}
 if(modal){const d=scope.getBoundingClientRect();if(d.left<0||d.top<0||d.right>w+.6||d.bottom>h+.6)issues.push('class dialog outside');}
 return issues;
 },{modal});}
async function saveFailure(page,key,problems){failures.push({key,problems});if(failures.length<=12)await page.screenshot({path:resolve(out,'failure-'+key+'.png')});}
try{
 const context=await browser.newContext({hasTouch:true,reducedMotion:'reduce'}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
 for(const [width,height] of sizes){await page.setViewportSize({width,height});for(const lang of ['th','en'])for(const [screen,account] of states){
  const key=[width,height,lang,screen,account].join('-');await page.goto(base+'/mobile-lobby-fixture.html?'+new URLSearchParams({screen,account,lang}));await page.locator('body[data-review=ready]').waitFor();await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(35);
  assert.equal(await page.locator('#motion-toggle').count(),0,'motion toggle is absent in every entry state');const problems=await inspect(page);if(problems.length)await saveFailure(page,key,problems);results.push({key,passed:!problems.length});
  if(lang==='th'&&((account==='signed'&&[[1440,900],[844,390],[390,844],[320,568]].some(([w,h])=>w===width&&h===height))||(screen==='login'&&account==='new'&&width===1440)))await page.screenshot({path:resolve(out,key+'.png')});
 }}
 // End-to-end demo interaction: no writes, same visible steps and entry actions.
 await page.setViewportSize({width:1440,height:900});await page.goto(base+'/mobile-lobby-fixture.html?screen=login&account=new&lang=th');await page.locator('body[data-review=ready]').waitFor();await page.locator('#login-quick').click();await page.waitForFunction(()=>document.body.dataset.screen==='servers');await page.locator('[data-server=server-1]').click();await page.waitForFunction(()=>document.body.dataset.screen==='character');await page.locator('.character-slot[data-slot="3"]').click();await page.waitForFunction(()=>document.body.dataset.characterMode==='create');await page.locator('#hero-name').fill('FirstArrival');await page.locator('[name=gender][value=female]').check();await page.locator('#create-character').click();await page.waitForFunction(()=>document.body.dataset.characterMode==='select');assert.equal(await page.locator('#existing-name').textContent(),'FirstArrival · Lv. 1');assert.equal(await page.evaluate(()=>window.__mobileLobby.state.classId),'novice');features.push({demoFlow:true,newCharacter:'novice'});
 // Read-only profession gallery, all seven paths, current skill art and Master copy.
 await page.evaluate(()=>window.__mobileLobby.show('login'));await page.evaluate(()=>window.__mobileLobby.showcase.open());await page.locator('#path-preview-dialog[open]').waitFor();
 const classes=await page.locator('.path-choice').evaluateAll(es=>es.map(e=>e.dataset.classId));assert.equal(classes.length,7);
 for(const id of classes){await page.locator('.path-choice[data-class-id="'+id+'"]').click();await page.waitForFunction(id=>document.getElementById('arrival-showcase').dataset.classId===id&&document.getElementById('arrival-showcase').dataset.artReady==='true',id);assert.equal(await page.locator('.path-skill img').count(),3);assert.equal(await page.locator('.path-master').count(),2);assert.ok(['idle','walk','attack'].includes(await page.locator('.path-dialog').getAttribute('data-pose')));}
 for(const [width,height] of [[1440,900],[844,390],[667,375],[390,844],[320,568],[568,280]]){await page.setViewportSize({width,height});await page.waitForTimeout(40);const problems=await inspect(page,{modal:true});if(problems.length)await saveFailure(page,'gallery-'+width+'-'+height,problems);features.push({gallery:[width,height],passed:!problems.length});await page.screenshot({path:resolve(out,'gallery-'+width+'-'+height+'.png')});}
 await page.locator('.path-close').click();features.push({galleryClasses:classes,motionToggleAbsent:true});
 // Simulate the layout contract used when a software keyboard reduces the viewport.
 await page.setViewportSize({width:390,height:500});await page.evaluate(()=>window.__mobileLobby.show('create'));await page.locator('#hero-name').focus();await page.evaluate(()=>{Object.defineProperty(window.visualViewport,'height',{configurable:true,get:()=>300});window.visualViewport.dispatchEvent(new Event('resize'));});await page.waitForFunction(()=>document.documentElement.classList.contains('keyboard-open'));await page.waitForTimeout(80);const keyboardProblems=await inspect(page);if(keyboardProblems.length)await saveFailure(page,'keyboard-390-300',keyboardProblems);features.push({keyboardFit:!keyboardProblems.length,visualViewport:300});await page.screenshot({path:resolve(out,'keyboard-390-300.png')});
 await context.close();
 // Motion stays on without a pause control. Reduced preference uses the same
 // continuous sequence at .65x; the normal class cycle remains14 seconds.
 async function checkMotion(preference){
  const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:preference}),motionPage=await context.newPage();motionPage.on('pageerror',e=>errors.push(e.message));
  try{
   await motionPage.goto(base+'/mobile-lobby-fixture.html?screen=login&account=new&lang=th');await motionPage.locator('body[data-review=ready]').waitFor();await motionPage.waitForFunction(()=>document.getElementById('arrival-showcase').dataset.artReady==='true');assert.equal(await motionPage.locator('#motion-toggle').count(),0);
   const sequence=await motionPage.evaluate(()=>new Promise((resolve,reject)=>{
    const host=document.getElementById('arrival-showcase'),initial=host.dataset.classId,start=performance.now(),states=[];let previous='';
    const timer=setInterval(()=>{const elapsed=(performance.now()-start)/1000,key=host.dataset.classId+':'+host.dataset.pose;if(key!==previous){states.push({classId:host.dataset.classId,pose:host.dataset.pose,elapsed});previous=key;}if(host.dataset.classId!==initial){clearInterval(timer);resolve({initial,final:host.dataset.classId,elapsed,states});}else if(elapsed>32){clearInterval(timer);reject(Error('Continuous choreography did not complete its class cycle'));}},40);
   }));
   assert.ok(sequence.states.some(s=>s.pose==='idle'));assert.ok(sequence.states.some(s=>s.pose==='walk'));assert.ok(sequence.states.some(s=>s.pose==='attack'));assert.notEqual(sequence.initial,sequence.final);
   const expected=preference==='reduce'?14/.65:14;assert.ok(Math.abs(sequence.elapsed-expected)<3.5,JSON.stringify({expected,sequence}));features.push({continuousMotion:preference,expectedClassCycle:expected,...sequence});
  }finally{await context.close();}
 }
 await Promise.all([checkMotion('no-preference'),checkMotion('reduce')]);
 await writeFile(resolve(out,'checks.json'),JSON.stringify({cases:results.length,failures,errors,features},null,2));console.log(JSON.stringify({cases:results.length,failureCount:failures.length,failures:failures.slice(0,24),errors,features}));assert.deepEqual(errors,[]);assert.equal(failures.length,0);
}catch(error){await writeFile(resolve(out,'checks.json'),JSON.stringify({cases:results.length,failures,errors,features,error:error.stack},null,2));throw error;}
finally{await browser.close();await new Promise(r=>service.close(r));}
