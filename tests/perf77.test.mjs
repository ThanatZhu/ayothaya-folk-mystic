import test from 'node:test';
import assert from 'node:assert/strict';
const store=new Map();
globalThis.localStorage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)};
globalThis.matchMedia=()=>({matches:false});
globalThis.devicePixelRatio=2;
const {createPerfSettings,readPerf}=await import('../perf-settings.js');
const fake=()=>{const r={ratio:0,shadowMap:{enabled:true},setPixelRatio(v){r.ratio=v;}};return r;};
const frames=(perf,hz,seconds=1)=>{let n=0;for(let i=0;i<hz*seconds;i++)if(perf.shouldDraw(i*1000/hz))n++;return n;};
test('fps cap holds 30 and 60 on 60/120 Hz screens and stays out of the way when uncapped',()=>{
 const make=fps=>{store.set('ayothaya-perf',JSON.stringify({fps,quality:'high'}));return createPerfSettings({renderer:fake(),scene:{traverse(){}},sun:{},softLook:{setEnabled(){}},resize(){}});};
 assert.equal(frames(make(30),60),30);assert.equal(frames(make(60),120),60);assert.equal(frames(make(60),60),60);
 assert.equal(frames(make(120),120),120);assert.equal(frames(make(0),144),144);
});
test('quality levels set sharpness and shadows; bad saved values fall back to defaults',()=>{
 store.set('ayothaya-perf','{"fps":45,"quality":"ultra"}');assert.deepEqual(readPerf(),{fps:60,quality:'high'});
 store.set('ayothaya-perf',JSON.stringify({fps:30,quality:'low'}));const r=fake(),sun={castShadow:true};let soft=true;
 createPerfSettings({renderer:r,scene:{traverse(){}},sun,softLook:{setEnabled(v){soft=v;}},resize(){}});
 assert.equal(r.ratio,.8);assert.equal(r.shadowMap.enabled,false);assert.equal(sun.castShadow,false);assert.equal(soft,false);
});
test('automatic resolution drops when frames are slow, never below the level floor, and recovers',()=>{
 store.set('ayothaya-perf',JSON.stringify({fps:60,quality:'high'}));const r=fake();let resized=0;
 const perf=createPerfSettings({renderer:r,scene:{traverse(){}},sun:{},softLook:{setEnabled(){}},resize(){resized++;}});assert.equal(r.ratio,1.5);
 let t=0;for(;t<20000;t+=50)perf.shouldDraw(t); // 20 FPS for 20 s
 assert.equal(r.ratio,.75);assert.ok(resized>1);
 for(const end=t+60000;t<end;t+=1000/60)perf.shouldDraw(t); // smooth 60 FPS again
 assert.equal(perf.renderScale,1);assert.equal(r.ratio,1.5);
});
test('GPU name is read from the ANGLE string and built-in GPUs are recognised',async()=>{
 const {gpuName,integratedGpu}=await import('../perf-settings.js');
 const gl=raw=>({getExtension:()=>({UNMASKED_RENDERER_WEBGL:1}),getParameter:()=>raw});
 const intel=gpuName(gl('ANGLE (Intel, Intel(R) UHD Graphics 630 (0x00003E9B) Direct3D11 vs_5_0 ps_5_0, D3D11)'));
 const nvidia=gpuName(gl('ANGLE (NVIDIA, NVIDIA GeForce GTX 1660 Ti (0x00002191) Direct3D11 vs_5_0 ps_5_0, D3D11)'));
 assert.equal(intel,'Intel(R) UHD Graphics 630');assert.equal(nvidia,'NVIDIA GeForce GTX 1660 Ti');
 assert.ok(integratedGpu(intel));assert.ok(!integratedGpu(nvidia));assert.ok(integratedGpu('AMD Radeon(TM) Graphics'));assert.ok(!integratedGpu('AMD Radeon RX 6600'));
});

test('mid quality omits bloom; high drops bloom after slow frames without changing saved quality',()=>{
 store.set('ayothaya-perf',JSON.stringify({fps:60,quality:'mid'}));let budgets=[];
 createPerfSettings({renderer:fake(),scene:{traverse(){}},sun:{},softLook:{setEnabled(){},setPerformanceBudget(v){budgets.push(v);}},resize(){}});
 assert.deepEqual(budgets,['reduced']);
 store.set('ayothaya-perf',JSON.stringify({fps:60,quality:'high'}));budgets=[];const renderer=fake(),sun={castShadow:true};
 const perf=createPerfSettings({renderer,scene:{traverse(){}},sun,softLook:{setEnabled(){},setPerformanceBudget(v){budgets.push(v);}},resize(){}});
 assert.deepEqual(budgets,['full']);for(let t=0;t<=6000;t+=50)perf.shouldDraw(t);
 assert.ok(budgets.includes('reduced'));assert.equal(perf.quality,'high');assert.equal(sun.castShadow,true);assert.equal(renderer.shadowMap.enabled,true);
 const fullCount=budgets.filter(v=>v==='full').length;for(let t=6016;t<20000;t+=1000/60)perf.shouldDraw(t);
 assert.equal(budgets.filter(v=>v==='full').length,fullCount,'recovery must not oscillate bloom on/off');
 assert.deepEqual(readPerf(),{fps:60,quality:'high'});
});
