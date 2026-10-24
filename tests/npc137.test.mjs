import test from 'node:test';
import assert from 'node:assert/strict';
import {nearestTalkNPC,opaqueNPCHit} from '../npc-interaction.js';
test('Space chooses the nearest live-position NPC in talk range, and none for dead/distant players',()=>{
 const a={name:'a',x:2,z:0},b={name:'b',x:1,z:0},p={x:0,z:0,hp:10};assert.equal(nearestTalkNPC([a,b],p),b);b.x=5;assert.equal(nearestTalkNPC([a,b],p),a);a.x=4;assert.equal(nearestTalkNPC([a,b],p),null);assert.equal(nearestTalkNPC([{x:0,z:0}],{...p,hp:0}),null);
});
test('NPC body picking honors transparent padding and mirrored live texture UVs',()=>{
 let position;const image={width:10,height:10,getContext:()=>({getImageData:(x,y)=>{position=[x,y];return {data:[0,0,0,x===2?255:0]};}})},texture={image,transformUv:uv=>{uv.x=1-uv.x;}};
 const hit={object:{material:{map:texture}},uv:{clone:()=>({x:.75,y:.5})}};assert.equal(opaqueNPCHit(hit),true);assert.deepEqual(position,[2,5]);assert.equal(opaqueNPCHit({...hit,uv:{clone:()=>({x:.2,y:.5})}}),false);
});
