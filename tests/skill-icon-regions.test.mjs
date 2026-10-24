import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ALL_SKILLS} from '../assets/skills-next/catalog.js';
import {ICON_LAYOUTS,roleIconRegion} from '../assets/skills-next/icon-regions.js';
test('all 112 skill crops stay inside their measured atlas cell and actual PNG',()=>{
 assert.equal(ALL_SKILLS.length,112);const keys=new Set();
 for(const skill of ALL_SKILLS){
  const {sheet,row,col}=skill.icon,l=ICON_LAYOUTS[sheet],png=readFileSync(new URL('../assets/skills-next/'+sheet,import.meta.url));
  assert.equal(png.readUInt32BE(16),l.width);assert.equal(png.readUInt32BE(20),l.height);
  const {rect:[x,y,w,h]}=roleIconRegion(skill.icon);
  assert.ok(x>l.x[row][col]&&x+w<l.x[row][col+1]&&y>l.y[row]&&y+h<l.y[row+1],skill.id);
  assert.ok(w>100&&h>100);keys.add([sheet,row,col].join(':'));
 }assert.equal(keys.size,112);
});
test('shaman Master crop excludes the acolyte row visible in the old equal-grid sampler',()=>{
 const region=roleIconRegion({sheet:'master-skills-v1.png',row:5,col:0});
 assert.equal(region.rect[1],928);assert.equal(region.rect[1]+region.rect[3],1114);
 assert.ok(1355/7*6>1117,'old sampler crossed the real divider');
});
test('unknown sheets and out-of-range crop indices fail explicitly',()=>{
 for(const icon of [{sheet:'unknown',row:0,col:0},{sheet:'role-skills-v1.png',row:7,col:0},{sheet:'master-passives-v1.png',row:0,col:4},{sheet:'role-skills-v1.png',row:0,col:-1}])assert.throws(()=>roleIconRegion(icon),/Invalid skill icon region/);
});
