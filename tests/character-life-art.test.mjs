import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {lifeFrameAt,lifeAppearanceCompatibility} from '../character-life-art.js';
import {GAMEPLAY_RUN_ENABLED} from '../character-action-state.js';

test('authored posture sampling retains the chosen posture with reduced motion',()=>{
 const clip={frames:['eyes-open','eyes-closed','eyes-open'],frameDurations:[4.6,.16,.34],loop:true};
 assert.equal(lifeFrameAt(clip,4.61),1);
 assert.equal(lifeFrameAt(clip,4.8),2);
 assert.equal(lifeFrameAt(clip,5.2),0);
 assert.equal(lifeFrameAt(clip,4.61,true),0);
 assert.equal(lifeFrameAt({frames:['lying'],fps:1,loop:true},100,true),0);
 assert.equal(lifeFrameAt(null,100),-1);
 assert.equal(lifeFrameAt(clip,NaN),0);
});
test('unsupported appearance never silently removes worn equipment or face layers',()=>{
 assert.equal(lifeAppearanceCompatibility('novice',{},null),null);
 assert.equal(lifeAppearanceCompatibility('novice',{}, {weapon:'novice-weapon-crafted'}),'weapon');
 assert.equal(lifeAppearanceCompatibility('swordsman',{hair:'braid'}),'appearance');
 assert.equal(lifeAppearanceCompatibility('acolyte',{}, {outfit:'acolyte-outfit-crimson'}),'appearance');
 assert.equal(lifeAppearanceCompatibility('novice',{}, {outfit:'novice-outfit-crimson'}),null);
});
test('every human design has complete authored life clips with valid per-frame atlas bounds',async()=>{
 const root=new URL('../assets/character-life100/',import.meta.url);
 const gameRoot=new URL('../',import.meta.url),atlases=new Map();
 function sourceURL(source){
  assert.equal(typeof source,'string','frame source must be explicit or inherited');
  return /^(?:\.\/)?assets\//.test(source)||source.startsWith('/')
   ?new URL(source.replace(/^\.?\//,''),gameRoot):new URL(source,root);
 }
 async function atlas(source){
  const url=sourceURL(source);
  if(!atlases.has(url.href))atlases.set(url.href,(async()=>{
   const png=await readFile(url);
   assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a',url.href+' PNG signature');
   assert.equal(png.toString('ascii',12,16),'IHDR',url.href+' PNG header');
   return {width:png.readUInt32BE(16),height:png.readUInt32BE(20)};
  })());
  return atlases.get(url.href);
 }
 const manifest=JSON.parse(await readFile(new URL('manifest.json',root),'utf8'));
 assert.equal(manifest.bodyHeight,210);assert.equal(manifest.frameSize,320);assert.equal(manifest.foot,276);
 const expected=[
  ...['novice','swordsman','lancer','hunter','boxer','rogue','shaman','acolyte'].flatMap(id=>['male','female'].map(g=>id+'-'+g)),
  ...Array.from({length:4},(_,i)=>'people-'+i),
  ...['masters-arms','masters-mystic','citizens-market','citizens-river'].flatMap(id=>Array.from({length:4},(_,i)=>id+'-'+i))
 ];
 assert.deepEqual(Object.keys(manifest.actors).sort(),expected.sort());
 for(const id of expected){
  const art=manifest.actors[id];
  for(const [index,f] of art.frames.entries()){
   const {width,height}=await atlas(f.source??art.source),[x,y,w,h]=f.rect;
   assert.ok(f.rect.every(Number.isInteger),id+' integer frame bounds');
   assert.equal(w,320,id);assert.equal(h,320,id);
   assert.ok(x>=0&&y>=0&&x+w<=width&&y+h<=height,id+' frame '+index+' atlas bounds');
  }
  for(const action of ['idle','walk','run','sitDown','sit','standUp','sleep']){
   const clip=art.clips[action];assert.ok(clip?.frames?.length,id+' '+action);
   assert.ok(clip.frames.every(f=>Number.isInteger(f)&&f>=0&&f<art.frames.length),id+' frames');
   if(clip.frameDurations){assert.equal(clip.frameDurations.length,clip.frames.length,id);assert.ok(clip.frameDurations.every(t=>Number.isFinite(t)&&t>0),id);}
   else assert.ok(Number.isFinite(clip.fps)&&clip.fps>0,id+' '+action+' timing');
   if(['walk','run'].includes(action)){
    assert.ok([4,8].includes(clip.frames.length),id+' '+action+' authored phase count');
    assert.equal(new Set(clip.frames).size,clip.frames.length,id+' '+action+' distinct phases');
    assert.equal(clip.loop,true,id+' '+action+' loops');
   }
   if(['sitDown','standUp'].includes(action)){
    assert.ok(clip.frames.length>=2,id+' '+action+' authored transition');
    assert.equal(clip.loop,false,id+' '+action+' is one-shot');
    assert.equal(lifeFrameAt(clip,1e6),clip.frames.length-1,id+' '+action+' finishes at last frame');
   }
  }
  assert.equal(art.review,'draft',id);
 }
 assert.equal(GAMEPLAY_RUN_ENABLED,false,'reviewing authored run clips must not enable gameplay sprint');
});
