import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BODY_HEIGHT,FRAME_SIZE,FRAME_FOOT,bodyScale,standingHeight,drawCharacterFrame} from '../character-size.js';
const ids=['novice','swordsman','lancer','hunter','boxer','rogue','shaman','acolyte'];
test('all professions, genders and weapon sets share standing height without clipping any pose',()=>{
 for(const directory of ['animation37','equipment41'])for(const id of ids){
  const meta=JSON.parse(readFileSync(new URL(`../assets/${directory}/${id}.json`,import.meta.url)));
  for(const gender of ['male','female']){
   const frames=meta.frames[gender],factor=bodyScale(directory,id,gender,frames[0].scale);
   assert.ok(Math.abs(standingHeight(directory,id,gender)*frames[0].scale*factor-BODY_HEIGHT)<.001);
   for(const f of frames){const [, ,w,h]=f.rect,s=f.scale*factor,left=FRAME_SIZE/2-f.anchor*s,top=FRAME_FOOT-h*s;
    assert.ok(left>=0&&left+w*s<=FRAME_SIZE&&top>=0,`${directory}/${id}/${gender}: complete weapon and body fit`);
   }
  }
 }
});
test('preview padding retains the same logical foot position and uniform aspect ratio',()=>{
 const calls=[];drawCharacterFrame({drawImage:(...args)=>calls.push(args)},'frame',32,12);
 const [,x,y,w,h]=calls[0];assert.equal(w,h);assert.equal(x+w/2,160);assert.equal(y+FRAME_FOOT,256);
});
