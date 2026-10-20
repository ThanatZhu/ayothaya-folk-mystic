import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {lifeFrameAt,lifeAppearanceCompatibility} from '../character-life-art.js';

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
test('every human design has grounded rest art and no rejected run advertised as ready',async()=>{
 const root=new URL('../assets/character-life100/',import.meta.url);
 const manifest=JSON.parse(await readFile(new URL('manifest.json',root),'utf8'));
 assert.equal(manifest.bodyHeight,210);assert.equal(manifest.frameSize,320);assert.equal(manifest.foot,276);
 const expected=[
  ...['novice','swordsman','lancer','hunter','boxer','rogue','shaman','acolyte'].flatMap(id=>['male','female'].map(g=>id+'-'+g)),
  ...Array.from({length:4},(_,i)=>'people-'+i),
  ...['masters-arms','masters-mystic','citizens-market','citizens-river'].flatMap(id=>Array.from({length:4},(_,i)=>id+'-'+i))
 ];
 assert.deepEqual(Object.keys(manifest.actors).sort(),expected.sort());
 for(const id of expected){
  const art=manifest.actors[id],png=await readFile(new URL(art.source,root));
  assert.equal(png.subarray(1,4).toString(),'PNG',id);
  const width=png.readUInt32BE(16),height=png.readUInt32BE(20);
  for(const f of art.frames){const [x,y,w,h]=f.rect;assert.equal(w,320,id);assert.equal(h,320,id);assert.ok(x>=0&&y>=0&&x+w<=width&&y+h<=height,id+' atlas bounds');}
  for(const action of ['idle','sit','sleep']){
   const clip=art.clips[action];assert.ok(clip?.frames?.length,id+' '+action);
   assert.ok(clip.frames.every(f=>Number.isInteger(f)&&f>=0&&f<art.frames.length),id+' frames');
   if(clip.frameDurations){assert.equal(clip.frameDurations.length,clip.frames.length,id);assert.ok(clip.frameDurations.every(t=>Number.isFinite(t)&&t>0),id);}
  }
  assert.equal(art.review,'draft',id);
  assert.equal(art.clips.run,undefined,id+' unapproved run must stay absent');
 }
});
