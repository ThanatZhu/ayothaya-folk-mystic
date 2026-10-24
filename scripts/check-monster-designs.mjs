import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile,stat} from 'node:fs/promises';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {chapter2FrameAt} from '../chapter2-monster-art.js';
import './mobile-review-server.mjs';
const out=new URL('../outputs/monster-chapter2/',import.meta.url),art=new URL('../assets/monsters-chapter2/',import.meta.url);
await mkdir(out,{recursive:true});
const manifest=JSON.parse(await readFile(new URL('designs.json',art),'utf8'));
let creatures=0,poses=0;
for(const map of manifest.maps)for(const m of map.monsters){
  assert.equal(m.gameReady,false);assert.ok(m.height>0);
  await stat(new URL(m.art,art));
  const meta=JSON.parse(await readFile(new URL(m.animation,art),'utf8'));
  await stat(new URL('animations/'+meta.source,art));assert.equal(meta.frames.length,8);
  assert.equal(meta.idlePixels,meta.frames[0].rect[3]);
  for(const f of meta.frames){assert.ok(f.clipRows.length>0);assert.equal(f.anchor[1],f.rect[3]);}
  const move=new Set(Array.from({length:800},(_,t)=>chapter2FrameAt(meta,'move',t).index));
  assert.ok(move.has(1)&&move.has(2),'Both locomotion key poses play');
  const attack=new Set(Array.from({length:1500},(_,t)=>chapter2FrameAt(meta,'attack',t).index));
  assert.ok(attack.has(3)&&attack.has(4)&&attack.has(6));
  assert.equal(chapter2FrameAt(meta,'down',100000).index,7);
  assert.ok(meta.frames[7].rect[3]<meta.idlePixels*.8,'Down pose must stay lower, without auto enlargement');
  creatures++;poses+=meta.frames.length;
}
assert.equal(creatures,25);assert.equal(poses,200);assert.equal(manifest.safeTown,'lablae');
const {chromium}=await import(pathToFileURL(process.argv[2]).href);
const browser=await chromium.launch({channel:'msedge',headless:true}),base='http://127.0.0.1:'+(process.env.MOBILE_REVIEW_PORT||8896);
const errors=[],failed=[],checks=[];
try{
  const page=await browser.newPage({reducedMotion:'reduce'});
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))failed.push(r.url());});
  for(const [width,height] of [[1280,900],[390,844]]){
    await page.setViewportSize({width,height});await page.goto(base+'/monster-design-lab.html');await page.locator('body[data-ready=true]').waitFor();
    assert.equal(await page.locator('#maps button').count(),5);assert.equal(await page.locator('#planned article').count(),5);
    for(const map of manifest.maps){
      await page.locator('[data-map="'+map.mapId+'"]').click();await page.locator('body[data-ready=true]').waitFor();
      assert.equal(await page.locator('#creatures article').count(),5);assert.equal(await page.locator('#poses button').count(),8);
      const poseChecks=[];
      for(let index=0;index<8;index++){
        await page.locator('#frame').fill(String(index));await page.locator('#frame').dispatchEvent('input');
        assert.equal(await page.locator('#focus').getAttribute('data-frame'),String(index));
        const rendered=await page.locator('.portrait').evaluateAll(canvases=>canvases.map(c=>{
          const a=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
          let empty=0,opaque=0,edge=0,signature=2166136261;
          for(let i=3;i<a.length;i+=4){const p=(i-3)/4,x=p%c.width,y=Math.floor(p/c.width);
            empty+=a[i]===0;opaque+=a[i]>230;if(x===0||x===c.width-1||y===0||y===c.height-1)edge+=a[i]>8;
            if(p%7===0)signature=Math.imul(signature^a[i-1]^a[i],16777619)>>>0;
          }return {empty,opaque,edge,signature};
        }));
        assert.ok(rendered.every(a=>a.empty>10000&&a.opaque>500),'Transparent sprite rendered');
        assert.ok(rendered.every(a=>a.edge===0),'No preview pose is clipped by canvas');
        poseChecks.push(rendered);
      }
      for(let m=0;m<5;m++)assert.equal(new Set(poseChecks.map(p=>p[m].signature)).size,8,'Eight visually distinct rendered poses');
      await page.locator('#frame').fill('0');await page.locator('#frame').dispatchEvent('input');
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No horizontal page overflow');
      await page.screenshot({path:fileURLToPath(new URL(width+'-'+map.mapId+'.png',out)),fullPage:true});
      await page.locator('#action').selectOption('move');await page.locator('#pause').click();
      const frames=new Set();
      for(let t=0;t<10;t++){frames.add(await page.locator('#focus').getAttribute('data-frame'));await page.waitForTimeout(90);}
      assert.ok(frames.has('1')&&frames.has('2'),'Real playback advances through both locomotion poses');
      await page.locator('#pause').click();
      await page.locator('#background').click();
      await page.locator('#zoom').fill('64');await page.locator('#zoom').dispatchEvent('input');
      if(width===1280)await page.screenshot({path:fileURLToPath(new URL(map.mapId+'-light.png',out)),fullPage:true});
      await page.locator('#background').click();
      checks.push({width,height,map:map.mapId,posesChecked:40,playbackFrames:[...frames]});
    }
  }
  assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
  await writeFile(new URL('preview-checks.json',out),JSON.stringify({creatures,poses,checks,errors,failed},null,2));
  console.log(JSON.stringify({creatures,poses,viewports:2,mapViews:checks.length,errors,failed}));
}finally{await browser.close();}
process.exit(0);
