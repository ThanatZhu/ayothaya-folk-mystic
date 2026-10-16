import test from 'node:test';
import assert from 'node:assert/strict';
import {moveBody,walkable} from '../combat-core.js';
import {createRouteWalker,nearestWalkable} from '../route-walk.js';

// A walled yard: open box with a wall across the middle that has a gap only at the far end.
const NAV={zones:[{x:0,z:0,w:20,d:12}],obstacles:[{x:9,z:0,w:1,d:9}],props:[]};

function walk(walker,player,{speed=3.4,dt=1/30,seconds=20}={}){
 for(let t=0;t<seconds;t+=dt){
  const dir=walker.step(player,dt);if(!dir)return t;
  moveBody(player,dir.x*speed*dt,dir.z*speed*dt,NAV);
 }
 return Infinity;
}

test('click-to-move walks around a wall and stops at the tapped point', () => {
 const player={x:3,z:3};let arrived=false;
 const walker=createRouteWalker(()=>NAV);
 walker.go({x:16,z:3},{onArrive:()=>{arrived=true;}});
 const took=walk(walker,player);
 assert.ok(arrived,'onArrive fired');
 assert.ok(took<12,'arrived in reasonable time: '+took);
 assert.ok(Math.hypot(player.x-16,player.z-3)<.25,`stopped at goal, got ${player.x.toFixed(2)},${player.z.toFixed(2)}`);
 assert.equal(walker.active,false);
});

test('a tap inside a wall snaps to the nearest standable point', () => {
 const p=nearestWalkable({x:9.5,z:4},NAV);
 assert.ok(p&&walkable(p.x,p.z,.32,NAV));
 assert.ok(Math.hypot(p.x-9.5,p.z-4)<1.2);
 assert.equal(nearestWalkable({x:40,z:40},NAV),null,'far outside the map is unreachable');
});

test('walking to a moving target re-plans and arrives within its radius', () => {
 const player={x:2,z:10};const npc={x:5,z:10};let arrived=false;
 const walker=createRouteWalker(()=>NAV);
 walker.go(()=>npc,{radius:1.5,onArrive:()=>{arrived=true;}});
 for(let i=0;i<300&&walker.active;i++){npc.x=Math.min(8,npc.x+.01);const d=walker.step(player,1/30);if(d)moveBody(player,d.x*3.4/30,d.z*3.4/30,NAV);}
 assert.ok(arrived);
 assert.ok(Math.hypot(player.x-npc.x,player.z-npc.z)<=1.5);
});

test('an unreachable goal fails instead of walking forever', () => {
 const sealed={zones:[{x:0,z:0,w:10,d:10},{x:20,z:0,w:5,d:5}],obstacles:[],props:[]};
 let failed=null;const walker=createRouteWalker(()=>sealed);
 walker.go({x:22,z:2},{onFail:r=>{failed=r;}});
 assert.equal(walker.step({x:2,z:2},1/30),null);
 assert.equal(failed,'no-path');
});

test('cancel stops at once', () => {
 const walker=createRouteWalker(()=>NAV);walker.go({x:5,z:5});
 assert.ok(walker.step({x:1,z:1},1/30));walker.cancel();
 assert.equal(walker.step({x:1,z:1},1/30),null);
});
