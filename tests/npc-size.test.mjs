import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {WORLD_BODY_HEIGHT} from '../character-size.js';
import {PEOPLE_BODY_CALIBRATION,CITY_BODY_HEIGHTS,peoplePlacement,citizenBodyHeight} from '../npc-size.js';
import {CITIZEN_STYLES} from '../city-life-data.js';

const read=path=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
const maps=read('../maps/world.json').maps,metadata=read('../assets/citizens40/frames.json');
const close=(actual,expected,message)=>assert.ok(Math.abs(actual-expected)<1e-9,message??`${actual} != ${expected}`);

test('every map NPC and every citizen art style has a measured body calibration',()=>{
 const people=new Set(),rows=new Set();
 for(const map of maps){
  for(const n of map.npcs??[]){
   if(n.mentorId){assert.ok(citizenBodyHeight(n.sheet,n.row)>0);rows.add(`${n.sheet}/${n.row}`);}
   else{peoplePlacement(n.texture);people.add(n.texture);}
  }
  for(const n of map.citizens??[])assert.ok(CITIZEN_STYLES[n.style],`${map.id}: unknown citizen style`);
 }
 for(const n of CITIZEN_STYLES){assert.ok(citizenBodyHeight(n.sheet,n.row)>0);rows.add(`${n.sheet}/${n.row}`);}
 assert.equal(people.size,4);
 assert.equal(rows.size,16);
 assert.equal(Object.values(CITY_BODY_HEIGHTS).flat().length,rows.size);
});

test('all four people sprites stand on their sole and share body height despite unequal padding',()=>{
 for(const [index,body] of PEOPLE_BODY_CALIBRATION.entries()){
  for(const size of [627,1254]){
   const p=peoplePlacement(index,size,size);
   close(p.height*(body.sole-body.crown)/627,WORLD_BODY_HEIGHT);
   close(p.height*(1-body.sole/627-p.centerY),0,'the visible sole must land at the actor origin');
   close(p.width,p.height,'preserve the square source cell aspect ratio');
   assert.ok(p.centerX>0&&p.centerX<1&&p.centerY>=0&&p.centerY<1);
  }
 }
});

test('merchant luggage remains above the standardized crown without shrinking the body',()=>{
 const body=PEOPLE_BODY_CALIBRATION[3],p=peoplePlacement(3);
 // Measured luggage begins at source y=24; the turban crown begins at y=61.
 const luggageTop=p.height*((1-24/627)-p.centerY);
 const crown=p.height*((1-body.crown/627)-p.centerY);
 close(crown,WORLD_BODY_HEIGHT);
 assert.ok(luggageTop>crown+.1);
 assert.equal(body.sole,590,'shoe sole, not the bottom of the transparent cell');
});

test('city gestures use the standing body scale and keep complete weapon bounds',()=>{
 for(const [sheet,heights] of Object.entries(CITY_BODY_HEIGHTS)){
  const data=metadata[sheet];
  for(const [row,standing] of heights.entries()){
   const frames=data.rects.slice(row*data.columns,(row+1)*data.columns);
   assert.equal(frames.length,data.columns);
   assert.equal(frames[0][3],standing,`${sheet}/${row}: standing crown-to-sole reference`);
   const scale=WORLD_BODY_HEIGHT/citizenBodyHeight(sheet,row);
   close(standing*scale,WORLD_BODY_HEIGHT);
   for(const [col,rect] of frames.entries()){
    assert.ok(rect[2]>0&&rect[3]>0);
    const anchor=data.anchors[row*data.columns+col];
    assert.ok(anchor>=0&&anchor<=rect[2]);
    // Retain the whole cropped image with padding at this scale. Gesture
    // extents may grow or shrink; they must not be renormalized to body height.
    const pad=3,h=(rect[3]+pad*2)*scale,center=pad/(rect[3]+pad*2);
    close(h*center,pad*scale);
   }
  }
 }
 const hunter=metadata['masters-arms'].rects.slice(8,12);
 assert.ok(hunter[3][3]>citizenBodyHeight('masters-arms',2),'raised bow exceeds the standing body bounds');
 const scale=WORLD_BODY_HEIGHT/citizenBodyHeight('masters-arms',2);
 assert.ok(hunter[3][3]*scale>WORLD_BODY_HEIGHT,'do not shrink the hunter when a bow is raised');
});

test('invalid source calibrations and impossible frame sizes fail clearly',()=>{
 for(const id of [-1,4,1.5,NaN,'0'])assert.throws(()=>peoplePlacement(id),/calibration/);
 for(const [w,h] of [[0,627],[627,-1],[Infinity,627],[627,NaN]])assert.throws(()=>peoplePlacement(0,w,h),/calibration/);
 for(const [sheet,row] of [['missing',0],['masters-arms',4],['masters-arms',-1],['masters-arms',.5]])assert.throws(()=>citizenBodyHeight(sheet,row),/calibration/);
});
