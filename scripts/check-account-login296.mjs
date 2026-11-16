// Production page/handlers and roster loader, isolated Firebase/network boundaries.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=resolve('.'),out=resolve('outputs/login296');await mkdir(out,{recursive:true});
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.ttf':'font/ttf','.json':'application/json'};
const service=createServer(async(req,res)=>{try{const file=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(root+sep))throw Error('path');res.setHeader('Content-Type',mime[extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>service.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+service.address().port;
const {chromium}=await import(pathToFileURL(process.argv[2]).href),browser=await chromium.launch({channel:'chrome',headless:true});
const fixture=`
import {initialSave} from './realm-state.js';
export const deadline=p=>p;
export async function connectFirebase(){
 const mode=new URL(location.href).searchParams.get('mode')||'empty';
 const guest={uid:'qa-temporary',isAnonymous:true,getIdToken:async()=> 'fixture'};
 const google={uid:'qa-original-google',isAnonymous:false,displayName:'Original Google',getIdToken:async()=> 'fixture'};
 const state=initialSave();state.traveler.baseXp=1800;state.traveler.jobXp=300;
 const record={slotId:'slot-1',serverId:'server-1',revision:12,character:{name:'OriginalHero',gender:'male',classId:'novice'},state};
 const saved={'players/qa-original-google/characters/slot-1':record};
 if(mode==='filled')saved['players/qa-temporary/characters/slot-1']={...record,character:{...record.character,name:'TemporaryHero'}};
 if(mode==='legacy')saved['players/qa-temporary/saves/server-1']={...record,character:{...record.character,name:'LegacyHero'}};
 const auth={currentUser:sessionStorage.getItem('qa-google')?google:mode==='new'?null:guest};
 let changed=()=>{};window.__qa={auth,saved,before:JSON.stringify(saved),writes:0,calls:[]};
 const snap=ref=>({exists:()=>!!saved[ref],data:()=>structuredClone(saved[ref])});
 const forbid=()=>{window.__qa.writes++;throw Error('Unexpected data mutation')};
 return{auth,db:{},sdk:{GoogleAuthProvider:class{setCustomParameters(){}},doc:(_db,...p)=>p.join('/'),
  getDocFromServer:async ref=>{window.__qa.calls.push('read');if(mode==='read-error')throw Error('unavailable');return snap(ref)},
  onAuthStateChanged:(_auth,callback)=>{changed=callback;},
  signInWithPopup:async()=>{window.__qa.calls.push('google-sign-in');if(mode==='cancel')throw Object.assign(Error('cancelled'),{code:'auth/popup-closed-by-user'});auth.currentUser=google;sessionStorage.setItem('qa-google','yes');changed(google);return{user:google}},
  linkWithPopup:async()=>{window.__qa.calls.push('link');throw Object.assign(Error('already-used'),{code:'auth/credential-already-in-use'})},
  runTransaction:async(_db,fn)=>fn({get:async ref=>snap(ref),set:forbid}),
  signOut:forbid,deleteUser:forbid,setDoc:forbid,deleteDoc:forbid
 }};
}`;
const results=[],errors=[];
try{
 for(const mode of ['new','empty','cancel','filled','legacy','read-error']){
  const context=await browser.newContext({viewport:{width:1366,height:768},locale:'th-TH'});
  await context.route('**/*',async route=>{const u=new URL(route.request().url());
   if(u.origin===base&&u.pathname==='/firebase-client.js')return route.fulfill({contentType:'text/javascript',body:fixture});
   if(u.origin===base&&u.pathname==='/consent')return route.fulfill({json:{version:'2026-10-27',at:Date.now()}});
   if(u.origin!==base)return route.fulfill({json:u.pathname==='/character/previews'?{schema:1,characters:[]}:{}});
   return route.continue();
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/play.html?mode='+mode+'&lang=th');
  await page.waitForFunction(()=>window.__qa&&!document.querySelector('#login-google').disabled);
  assert.equal(await page.locator('#login-google').isVisible(),true);
  assert.match(await page.locator('#login-google').textContent(),/เข้าสู่บัญชี Google เดิม/);
  for(const [width,height] of [[1366,768],[390,844],[320,568]]){
   await page.setViewportSize({width,height});await page.evaluate(()=>document.fonts.ready);
   const layout=await page.evaluate(()=>{const b=[...document.querySelectorAll('.login-actions>button')].filter(e=>!e.hidden).map(e=>{const r=e.getBoundingClientRect();return{id:e.id,x:r.x,y:r.y,w:r.width,h:r.height}}).sort((a,b)=>a.y-b.y);return{buttons:b,width:document.documentElement.scrollWidth};});
   assert.equal(layout.width,width);for(let i=0;i<layout.buttons.length;i++){const b=layout.buttons[i];assert.ok(b.h>=52);assert.ok(b.x>=0&&b.x+b.w<=width+1);if(i)assert.ok(b.y>=layout.buttons[i-1].y+layout.buttons[i-1].h);}
   if(mode==='empty'&&width!==320){await page.waitForTimeout(250);await page.screenshot({path:resolve(out,'login-'+width+'.png'),fullPage:true});}
  }
  await page.setViewportSize({width:390,height:844});
  if(mode==='empty'){
   await page.locator('#link-google').click();await page.waitForFunction(()=>document.querySelector('#lobby-status').textContent.includes('เข้าสู่บัญชี Google เดิม'));
   assert.equal(await page.locator('#login-google').isVisible(),true);
  }
  await page.locator('#login-google').click();
  if(mode!=='new'){
   await page.waitForSelector('#google-switch-dialog[open]');
   if(['filled','legacy','read-error'].includes(mode)){
    await page.waitForFunction(()=>!document.querySelector('#google-switch-status').textContent.includes('กำลังตรวจ'));
    assert.equal(await page.locator('#google-switch-confirm').isVisible(),false);
    assert.equal(await page.evaluate(()=>window.__qa.auth.currentUser.uid),'qa-temporary');
    assert.equal(await page.evaluate(()=>window.__qa.calls.includes('google-sign-in')),false);
    await page.screenshot({path:resolve(out,'protected-'+mode+'.png')});
    await page.locator('#google-switch-cancel').click();assert.equal(await page.locator('#continue-account').isEnabled(),true);
   }else{
    await page.waitForSelector('#google-switch-confirm:visible');
    await page.screenshot({path:resolve(out,'confirm-'+mode+'.png')});
    // Escape also keeps the original anonymous identity.
    await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>window.__qa.auth.currentUser.uid),'qa-temporary');
    await page.locator('#login-google').click();await page.locator('#google-switch-confirm').click();
   }
  }
  if(mode==='new'||mode==='empty'){
   await page.waitForSelector('#existing-character:visible');assert.match(await page.locator('#existing-name').textContent(),/OriginalHero/);
   const original=await page.evaluate(()=>JSON.stringify(window.__qa.saved));
   await page.reload();await page.waitForSelector('#continue-account:visible');await page.locator('#continue-account').click();
   await page.waitForSelector('#existing-character:visible');assert.match(await page.locator('#existing-name').textContent(),/OriginalHero/);
   assert.equal(await page.evaluate(()=>JSON.stringify(window.__qa.saved)),original);
   await page.screenshot({path:resolve(out,'restored-'+mode+'.png')});
  }
  if(mode==='cancel'){
   await page.waitForFunction(()=>document.querySelector('#lobby-status').textContent.includes('ยังไม่ได้ล็อกอิน'));
   assert.equal(await page.evaluate(()=>window.__qa.auth.currentUser.uid),'qa-temporary');assert.equal(await page.locator('#continue-account').isEnabled(),true);
  }
  assert.equal(await page.evaluate(()=>window.__qa.writes),0);assert.equal(await page.evaluate(()=>JSON.stringify(window.__qa.saved)===window.__qa.before),true);
  results.push({mode,noSaveWrites:true,passed:true});await context.close();
 }
 assert.deepEqual(errors,[]);await writeFile(resolve(out,'report.json'),JSON.stringify({results,errors,scope:'Real production UI/handlers/roster loader; isolated auth and database fixtures. No live player data accessed.'},null,2));
 console.log('PASS: Google login from temporary account, original hero restored after reload, popup cancellation, current/legacy temporary saves protected, read failures blocked, 18 responsive layouts, zero save mutations.');
}finally{await browser.close();await new Promise(r=>service.close(r));}
