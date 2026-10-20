import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BODY_HEIGHT,FRAME_SIZE,FRAME_FOOT,bodyScale,standingHeight,drawCharacterFrame,paintedFrameCalibration,LANCER_WALK_BODY} from '../character-size.js';
const ids=['novice','swordsman','lancer','hunter','boxer','rogue','shaman','acolyte'];
test('all professions, genders and weapon sets share standing height without clipping any pose',()=>{
 for(const directory of ['animation37','equipment41'])for(const id of ids){
  const meta=JSON.parse(readFileSync(new URL(`../assets/${directory}/${id}.json`,import.meta.url)));
  for(const gender of ['male','female']){
   const frames=meta.frames[gender],factor=bodyScale(directory,id,gender,frames[0].scale);
   assert.ok(Math.abs(standingHeight(directory,id,gender)*frames[0].scale*factor-BODY_HEIGHT)<.001);
   for(const [index,f] of frames.entries()){const calibration=paintedFrameCalibration(directory,id,gender,index,f,frames[0].scale),[, ,w,h]=f.rect,s=f.scale*calibration.factor,left=FRAME_SIZE/2-f.anchor*s,top=FRAME_FOOT+(244-calibration.foot-h*f.scale)*calibration.factor;
    assert.ok(left>=0&&left+w*s<=FRAME_SIZE&&top>=0,`${directory}/${id}/${gender}: complete weapon and body fit`);
   }
  }
 }
});
test('walking keeps the measured body at standing size with basic and crafted weapons',()=>{
 for(const directory of ['animation37','equipment41'])for(const id of ids){
  const meta=JSON.parse(readFileSync(new URL(`../assets/${directory}/${id}.json`,import.meta.url)));
  for(const gender of ['male','female'])for(const [index,frame] of meta.frames[gender].entries()){
   if(index<12)continue;
   const [crown,sole]=id==='lancer'?LANCER_WALK_BODY[directory][gender][index-12]:[0,frame.rect[3]];
   const {factor,foot}=paintedFrameCalibration(directory,id,gender,index,frame,meta.frames[gender][0].scale);
   assert.ok(Math.abs((sole-crown)*frame.scale*factor-BODY_HEIGHT)<1e-8,`${directory}/${id}/${gender}/${index}`);
   const renderedSole=FRAME_FOOT+(244-foot-(frame.rect[3]-sole)*frame.scale)*factor;
   assert.ok(Math.abs(renderedSole-FRAME_FOOT)<1e-8);
  }
 }
 // The strongest regression: a tall trident must fit above the standardized body.
 const meta=JSON.parse(readFileSync(new URL('../assets/equipment41/lancer.json',import.meta.url)));
 const f=meta.frames.male[12],c=paintedFrameCalibration('equipment41','lancer','male',12,f,meta.frames.male[0].scale);
 assert.ok(f.rect[3]*f.scale*c.factor>BODY_HEIGHT+50);
 assert.throws(()=>paintedFrameCalibration('equipment41','lancer','male',12,{...f,rect:[...f.rect.slice(0,3),f.rect[3]+1]},meta.frames.male[0].scale),/remeasurement/);
});
test('preview padding retains the same logical foot position and uniform aspect ratio',()=>{
 const calls=[];drawCharacterFrame({drawImage:(...args)=>calls.push(args)},'frame',32,12);
 const [,x,y,w,h]=calls[0];assert.equal(w,h);assert.equal(x+w/2,160);assert.equal(y+FRAME_FOOT,256);
});
