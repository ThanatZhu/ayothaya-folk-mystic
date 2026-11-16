// Real production entry and handlers; only Firebase/backend boundaries are fixtures.
// Usage: node scripts/check-login295.mjs <absolute playwright-core entry>
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=resolve('.'),out=resolve('outputs/login295');await mkdir(out,{recursive:true});
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.ttf':'font/ttf','.json':'application/json'};
const service=createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost'),file=resolve(root,'.'+decodeURIComponent(url.pathname));if(!file.startsWith(root+sep))throw Error('path');res.setHeader('Content-Type',mime[extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>service.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+service.address().port;
const {chromium}=await import(pathToFileURL(process.argv[2]).href);
const browser=await chromium.launch({channel:'chrome',headless:true});
const reports=[],errors=[];
const fixture=`
export const deadline=p=>p;
export async function connectFirebase(){
 const mode=new URL(location.href).searchParams.get('account');
 if(mode==='error')throw Error('fixture-offline');
 const makeUser=()=>({uid:'qa-login295',isAnonymous:mode!=='signed',displayName:'QA',getIdToken:async()=> 'isolated-fixture'});
 const auth={currentUser:mode==='returning'||mode==='signed'||sessionStorage.getItem('qa-auth')?makeUser():null};
 window.__authCalls=[];
 const signIn=async method=>{window.__authCalls.push(method);auth.currentUser=makeUser();sessionStorage.setItem('qa-auth','yes');return {user:auth.currentUser}};
 return {auth,db:{},sdk:{GoogleAuthProvider:class{setCustomParameters(){}},onAuthStateChanged(){},signInAnonymously:()=>signIn('anonymous'),signInWithPopup:()=>signIn('google'),linkWithPopup:()=>signIn('link'),signOut:async()=>{auth.currentUser=null;sessionStorage.removeItem('qa-auth')},doc:()=>({}),runTransaction:async(db,fn)=>fn({get:async()=>({exists:()=>false}),set(){}})}};
}`;
try{
 const context=await browser.newContext({viewport:{width:1366,height:768},locale:'th-TH'});
 await context.route('**/*',async route=>{const u=new URL(route.request().url());
  if(u.origin===base&&u.pathname==='/firebase-client.js')return route.fulfill({contentType:'text/javascript',body:fixture});
  if(u.origin===base&&u.pathname==='/consent')return route.fulfill({json:{}});
  if(u.origin!==base)return route.fulfill({json:u.pathname==='/character/previews'?{schema:1,characters:[]}:{}});
  return route.continue();
 });
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 for(const account of ['new','returning','signed','error']){
  await page.goto(base+'/play.html?lang=th&account='+account);
  await page.waitForFunction(()=>!document.querySelector('#login-quick').disabled||!document.querySelector('#retry-connection').hidden);
  await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(2300);
  for(const [width,height] of [[1366,768],[390,844],[320,568],[844,390]]){
   await page.setViewportSize({width,height});
   await page.waitForFunction(()=>document.fonts.status==='loaded');
   const state=await page.evaluate(()=>{
    const card=document.querySelector('.lobby-card'),r=card.getBoundingClientRect();
    const buttons=[...document.querySelectorAll('.login-actions>button')].filter(b=>!b.hidden).map(b=>{const r=b.getBoundingClientRect();return{id:b.id,x:r.x,y:r.y,w:r.width,h:r.height}}).sort((a,b)=>a.y-b.y);
    return{border:getComputedStyle(card).borderTopWidth,background:getComputedStyle(card).backgroundColor,center:r.x+r.width/2,width:innerWidth,scroll:document.documentElement.scrollWidth,buttons,continueHidden:document.querySelector('#continue-account').hidden};
   });
   assert.equal(state.border,'0px');assert.equal(state.background,'rgba(0, 0, 0, 0)');assert.ok(Math.abs(state.center-width/2)<1);assert.equal(state.scroll,width);
   assert.equal(state.continueHidden,!['returning','signed'].includes(account));
   assert.equal(state.buttons[0].id,['returning','signed'].includes(account)?'continue-account':'login-google');
   for(let i=0;i<state.buttons.length;i++){const b=state.buttons[i];assert.ok(b.h>=52);assert.ok(b.x>=0&&b.x+b.w<=width+1);if(i)assert.ok(b.y>=state.buttons[i-1].y+state.buttons[i-1].h);}
   reports.push({account,width,height,passed:true});
   if((width===1366||width===390)&&account!=='signed')await page.screenshot({path:resolve(out,account+'-'+width+'.png'),fullPage:true});
  }
 }
 await page.setViewportSize({width:390,height:844});
 // Returning session is exposed without waiting for the introduction.
 await page.goto(base+'/play.html?lang=th&account=returning');
 await page.waitForSelector('#continue-account:visible');
 assert.equal(await page.locator('.cinematic-logo img').evaluate(e=>getComputedStyle(e).animationName),'none');
 await page.reload();await page.waitForSelector('#continue-account:visible');
 await page.locator('#continue-account').click();await page.waitForSelector('.consent-dialog:visible');
 await page.locator('.consent-decline').click();assert.equal(await page.locator('body').getAttribute('data-screen'),'login');
 // Fresh online Play Now still calls anonymous auth and asks for consent.
 await page.goto(base+'/play.html?lang=th&account=new');await page.waitForFunction(()=>!document.querySelector('#login-quick').disabled);
 await page.locator('#login-quick').click();await page.waitForSelector('.consent-dialog:visible');assert.deepEqual(await page.evaluate(()=>window.__authCalls),['anonymous']);
 await page.locator('.consent-dialog input[name=terms]').check();await page.locator('.consent-dialog input[name=age]').check();await page.locator('.consent-accept').click();
 await page.waitForFunction(()=>document.body.dataset.screen==='character');
 // Real local guest character save survives a reload; no production data is touched.
 await page.goto(base+'/play.html?lang=th&account=new');await page.locator('#login-guest').click();await page.waitForFunction(()=>document.body.dataset.screen==='character');
 await page.locator('#hero-name').fill('QALogin295');await page.locator('#create-character').click();await page.waitForSelector('#existing-character:visible');
 await page.reload();await page.locator('#login-guest').click();await page.waitForSelector('#existing-character:visible');assert.match(await page.locator('#existing-name').textContent(),/QALogin295/);
 await page.screenshot({path:resolve(out,'character-390.png')});
 await page.goto(base+'/play.html?lang=en&account=new');await page.locator('[data-lang-toggle]').click();await page.locator('[data-lang-toggle]').click();assert.equal(await page.locator('#replay-login').textContent(),'Replay Intro');
 await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#replay-login').click();assert.equal(await page.locator('.cinematic-logo img').evaluate(e=>getComputedStyle(e).animationName),'none');
 assert.deepEqual(errors,[]);
 await writeFile(resolve(out,'report.json'),JSON.stringify({reports,auth:'fixture boundary; real UI and handlers',consent:true,localCharacterReload:true,errors},null,2));
 console.log('PASS: 16 login layouts, returning session, online auth/consent handlers, offline character reload, language, reduced motion; no page errors.');
}finally{await browser.close();await new Promise(r=>service.close(r));}
