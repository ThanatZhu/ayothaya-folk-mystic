import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {BODY_HEIGHT,LOGICAL_SIZE} from '../character-size.js';
import {DIRECTIONS,DIRECTIONAL_CLASSES,directionalManifestPath,placement} from '../directional-sprite.js';
import {DIRECTIONAL_BODY_MEASUREMENTS,DIRECTIONAL_SOURCE_SHA256,directionalBodyMetrics} from '../directional-size.js';
import {createDirectionalActor} from '../directional-actor.js';

const load=classId=>JSON.parse(readFileSync(new URL('../'+directionalManifestPath(classId),import.meta.url)));
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
const target=BODY_HEIGHT/LOGICAL_SIZE;

test('measured source PNGs have not changed since crown and sole review',()=>{
 const paths=new Set(DIRECTIONAL_CLASSES.flatMap(id=>Object.values(load(id).sources).map(s=>s.path)));
 assert.deepEqual([...paths].sort(),Object.keys(DIRECTIONAL_SOURCE_SHA256).sort());
 for(const path of paths){
  const png=readFileSync(new URL('../'+path,import.meta.url));
  assert.equal(createHash('sha256').update(png).digest('hex'),DIRECTIONAL_SOURCE_SHA256[path],`${path}: remeasure body after replacing artwork`);
 }
});

test('all 128 source views put the measured crown at the same height and sole at ground',()=>{
 let count=0;
 for(const classId of DIRECTIONAL_CLASSES){
  const manifest=load(classId);
  for(const gender of ['male','female'])for(const direction of DIRECTIONS){
   const frame=manifest.frames[gender][direction],dest=placement(frame,manifest.cell,manifest.anchor);
   const size=directionalBodyMetrics(classId,gender,direction,frame,dest,manifest.cell);
   const measured=DIRECTIONAL_BODY_MEASUREMENTS[classId][gender][direction];
   assert.ok(measured[5]>=0&&measured[6]<=frame.rect[3]&&measured[6]>measured[5]);
   near((size.footV-size.crownV)*size.bodyScale,target);
   near((size.footV-size.footV)*size.bodyScale,0);
   count++;
  }
 }
 assert.equal(count,128);
});

test('lancer spear tips stay above the crown without making the body shorter',()=>{
 const manifest=load('lancer'),frame=manifest.frames.male.NE,dest=placement(frame,manifest.cell,manifest.anchor);
 const size=directionalBodyMetrics('lancer','male','NE',frame,dest,manifest.cell);
 assert.equal(DIRECTIONAL_BODY_MEASUREMENTS.lancer.male.NE[5],29);
 assert.ok(size.crownV>dest.y/manifest.cell);
 assert.ok((size.footV-dest.y/manifest.cell)*size.bodyScale>target);
 // Atlas fitting may reserve extra space for a wider future weapon. The body
 // still measures the same after geometry compensation; UVs need not change.
 const smaller={...dest,w:dest.w/2,h:dest.h/2};
 const compensated=directionalBodyMetrics('lancer','male','NE',frame,smaller,manifest.cell);
 near(compensated.bodyScale,size.bodyScale*2);
 near((compensated.footV-compensated.crownV)*compensated.bodyScale,target);
 assert.throws(()=>directionalBodyMetrics('lancer','male','NE',{...frame,rect:[...frame.rect.slice(0,3),frame.rect[3]+1]},dest,manifest.cell),/remeasurement/);
});

test('actor applies each gender and view calibration while retaining rig texture coordinates',()=>{
 for(const classId of DIRECTIONAL_CLASSES){
  const manifest=load(classId),art={manifest,frames:{},sizing:{},footV:manifest.anchor[1]/manifest.cell};
  for(const gender of ['male','female']){
   art.frames[gender]={};art.sizing[gender]={};
   for(const direction of DIRECTIONS){
    const frame=manifest.frames[gender][direction];
    art.frames[gender][direction]={width:manifest.cell,height:manifest.cell,label:gender+'/'+direction};
    art.sizing[gender][direction]=directionalBodyMetrics(classId,gender,direction,frame,placement(frame,manifest.cell,manifest.anchor),manifest.cell);
   }
  }
  const actor=createDirectionalActor(art,{classId,columns:16,rows:20}),uv=actor.geometry.attributes.uv.array.slice();
  for(const gender of ['male','female'])for(const direction of DIRECTIONS){
   actor.userData.pose({}, {gender,direction,reduced:true});
   const size=art.sizing[gender][direction],positions=actor.geometry.attributes.position;
   near(actor.userData.bodyScale,size.bodyScale);near(actor.userData.footV,size.footV);
   near(positions.getY(0),size.footV*size.bodyScale);
   assert.deepEqual(actor.geometry.attributes.uv.array,uv);
   assert.equal(actor.material.map.image,art.frames[gender][direction]);
  }
  actor.userData.dispose();
 }
});
