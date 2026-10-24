import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import './mobile-review-server.mjs';
const {chromium}=await import(pathToFileURL(process.argv[2]).href),browser=await chromium.launch({channel:'msedge',headless:true}),out=new URL('../outputs/lobby-fit/',import.meta.url),base=`http://127.0.0.1:${process.env.MOBILE_REVIEW_PORT||8896}`;await mkdir(out,{recursive:true});const failures=[],errors=[],results=[];
const sizes=[[320,480],[320,568],[360,640],[375,667],[390,844],[430,932],[568,280],[568,320],[667,300],[667,375],[740,320],[812,305],[844,390],[932,430],[1024,600],[1024,768],[1280,590],[1280,720],[1366,768],[1440,900],[1920,1080],[2560,1440],[768,1024],[820,1180]];
const states=[['login','signed'],['login','anon'],['login','new'],['login','error'],['servers','signed'],['character','signed'],['create','signed']];
try{
 const page=await browser.newPage({hasTouch:true,reducedMotion:'reduce'});page.on('pageerror',e=>errors.push(e.message));
 for(const [width,height] of process.env.LOBBY_SIZES?JSON.parse(process.env.LOBBY_SIZES):sizes){await page.setViewportSize({width,height});for(const lang of ['th','en'])for(const [screen,account] of states){
  await page.goto(base+'/mobile-lobby-fixture.html?screen='+screen+'&account='+account+'&lang='+lang);await page.locator('body[data-review=ready]').waitFor();await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(40);
  const problems=await page.evaluate(()=>{
   const issues=[],w=innerWidth,h=Math.min(innerHeight,visualViewport.height),visible=e=>!!(e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden');
   for(const el of document.querySelectorAll('button,input:not([type=radio]),.lobby-card,.character-stage')){if(!visible(el)||el.closest('[hidden]'))continue;const r=el.getBoundingClientRect(),key=el.id||el.className;if(r.left<-.5||r.top<-.5||r.right>w+.5||r.bottom>h+.5)issues.push(key+' outside '+JSON.stringify({x:r.x,y:r.y,w:r.width,h:r.height}));if(el.tagName==='BUTTON'&&r.height<43.5)issues.push(key+' touch target '+r.height);}
   for(const el of document.querySelectorAll('.lobby-layout,.lobby-card,.screen,.character-body,.character-details,#character-slots,.login-actions')){if(!visible(el)||el.closest('[hidden]'))continue;if(el.scrollHeight>el.clientHeight+2||el.scrollWidth>el.clientWidth+2)issues.push((el.id||el.className)+' content overflow '+el.scrollWidth+'x'+el.scrollHeight+' / '+el.clientWidth+'x'+el.clientHeight);}
   const buttons=[...document.querySelectorAll('.lobby-card button')].filter(e=>visible(e)&&!e.closest('[hidden]'));for(let i=0;i<buttons.length;i++)for(let j=i+1;j<buttons.length;j++){const a=buttons[i].getBoundingClientRect(),b=buttons[j].getBoundingClientRect();if(a.left<b.right-1&&a.right>b.left+1&&a.top<b.bottom-1&&a.bottom>b.top+1)issues.push('buttons overlap '+(buttons[i].id||buttons[i].className)+'/'+(buttons[j].id||buttons[j].className));}
   return issues;
  });const key=[width,height,lang,screen,account].join('-');if(problems.length){failures.push({key,problems});if(failures.length<=12)await page.screenshot({path:fileURLToPath(new URL(key+'.png',out))});}results.push({key,passed:!problems.length});
  if(lang==='en'&&account==='signed'&&[[1280,590],[844,390],[320,568]].some(([w,h])=>w===width&&h===height))await page.screenshot({path:fileURLToPath(new URL(key+'.png',out))});
 }}
 await writeFile(new URL('checks.json',out),JSON.stringify({cases:results.length,failures,errors},null,2));console.log(JSON.stringify({cases:results.length,failures:failures.slice(0,18),failureCount:failures.length,errors}));assert.deepEqual(errors,[]);assert.equal(failures.length,0);
}finally{await browser.close();}process.exit(0);
