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
 assert.equal(r.ratio,1);assert.equal(r.shadowMap.enabled,false);assert.equal(sun.castShadow,false);assert.equal(soft,false);
});
