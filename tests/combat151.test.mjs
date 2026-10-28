import {mobileHudScale208} from '../mobile-hud-scale208.js';
import test from 'node:test';import assert from 'node:assert/strict';
import {standardCombatLayout,keepNonCombatPreferences} from '../mobile-combat-layout.js';
test('approved screenshot centres map to the same logical pixels, including attack, bank and targeting',()=>{
 const {controls:c,scale}=standardCombatLayout({width:932,height:430});assert.equal(scale,1);
 const measured={'skill-1':[2156.5,1063],'skill-2':[2231.5,898],'skill-3':[2366.5,773],'skill-4':[2546.5,718],attack:[2503.5,1064],swap:[2647,853.5],target:[2287.5,1177.5]};
 for(const [id,[x,y]]of Object.entries(measured)){assert.ok(Math.abs((c[id].x+c[id].width/2)*3-x)<.01,id);assert.ok(Math.abs((c[id].y+c[id].height/2)*3-y)<.01,id);}
});
test('one uniform cluster keeps order, circle gaps, touch sizes and screen bounds across phone aspect ratios',()=>{
 for(const [width,height]of [[568,320],[667,375],[740,360],[812,375],[844,390],[852,393],[896,414],[915,412],[932,430],[960,432],[1024,768],[320,568],[390,844],[180,170]]){
  const {controls,scale}=standardCombatLayout({width,height}),rows=Object.entries(controls),minimum=mobileHudScale208({width,height})<1?32:44;
  for(const [id,r]of rows)assert.ok(r.x>=3.9&&r.y>=3.9&&r.x+r.width<=width&&r.y+r.height<=height,id+JSON.stringify({width,height,r}));
  for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++){const [a,b]=[rows[i][1],rows[j][1]],distance=Math.hypot(a.x+a.width/2-b.x-b.width/2,a.y+a.height/2-b.y-b.height/2),hitA=width>=320?Math.max(minimum,a.width):a.width,hitB=width>=320?Math.max(minimum,b.width):b.width;assert.ok(distance>=(hitA+hitB)/2,JSON.stringify({width,height,one:rows[i][0],two:rows[j][0],distance,scale}));}
 }
});
test('old dragged combat positions are removed without changing joystick or AUTO settings in either orientation',()=>{
 const auto={x:.6,y:.7},joystick={x:.2,y:.8},saved={v:1,landscape:{'skill-1':{x:.1,y:.2},attack:{x:.1,y:.1},swap:{x:.2,y:.2},target:{x:.3,y:.3},auto,joystick},portrait:{'skill-4':{x:.8,y:.8},joystick}};
 const migrated=keepNonCombatPreferences(saved);assert.deepEqual(migrated,{v:1,landscape:{auto,joystick},portrait:{joystick}});assert.equal(migrated.landscape.auto,auto);assert.equal(migrated.portrait.joystick,joystick);
});
