import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {walkable,moveBody,walkLineClear,lineClear,CombatWorld} from '../combat-core.js';
import {createRouteWalker,planRoute} from '../route-walk.js';
import {RealmServer} from '../server/realm.js';
import {initialSave} from '../realm-state.js';
const map=JSON.parse(readFileSync(new URL('../maps/world.json',import.meta.url))).maps.find(m=>m.id==='lotus-marsh');
// Authored v5 boardwalk endpoints, converted from Blender y to game z.
const bridges=[
 [[-7.21,47.89],[-23.81,33.8]],[[5.94,47.21],[19.38,31.85]],
 [[-32.34,15.01],[-30.72,-12.01]],[[28.72,10.01],[30.04,-12.02]],
 [[-20.01,-32.99],[-12.34,-39.89]],[[17.17,-38.26],[13.79,-40.77]],
 [[-20.04,25.15],[13.05,22.98]],[[-15.05,-24.98],[13.05,-26.82]]
];
const clipped={start:{x:-7.662980499118266,z:48.423674683134365},goal:{x:-24.262980499118264,z:34.33367468313436}};
test('a visible line along the marsh bridge edge is not a body-safe walking shortcut',()=>{
 assert.ok(lineClear(clipped.start,clipped.goal,map.nav),'retain projectile/sight behavior');
 assert.equal(walkLineClear(clipped.start,clipped.goal,map.nav),false);
 const path=planRoute(clipped.start,clipped.goal,map.nav);assert.ok(path?.length>1,'walk around the clipped board edge');
 let from=clipped.start;for(const to of path){assert.ok(walkLineClear(from,to,map.nav));from=to;}
 assert.equal(walkLineClear(map.spawn,{x:0,z:0},map.nav),false,'water is still blocked');
});
test('all eight real bridges are traversable both ways from 191 valid lane pairs at walk and sprint speeds',()=>{
 let pairs=0;
 for(const [index,[a,b]]of bridges.entries())for(let ai=-2;ai<=2;ai++)for(let bi=-2;bi<=2;bi++){
  const len=Math.hypot(b[0]-a[0],b[1]-a[1]),nx=-(b[1]-a[1])/len,nz=(b[0]-a[0])/len;
  const start={x:a[0]+nx*ai*.7,z:a[1]+nz*ai*.7},goal={x:b[0]+nx*bi*.7,z:b[1]+nz*bi*.7};
  if(!walkable(start.x,start.z,.32,map.nav)||!walkable(goal.x,goal.z,.32,map.nav))continue;pairs++;
  for(const [from,to]of [[start,goal],[goal,start]])for(const speed of [3.4,7,12]){
   const player={...from},walker=createRouteWalker(()=>map.nav);let arrived=false,failed=null;
   walker.go(to,{onArrive:()=>arrived=true,onFail:r=>failed=r});
   const dt=1/30;for(let t=0;t<35&&walker.active;t+=dt){const d=walker.step(player,dt,speed*dt);if(d)moveBody(player,d.x*speed*dt,d.z*speed*dt,map.nav);assert.ok(walkable(player.x,player.z,.28,map.nav));}
   assert.ok(arrived&&!failed,JSON.stringify({index,ai,bi,speed,from,to,player,failed}));assert.ok(Math.hypot(player.x-to.x,player.z-to.z)<.2);
  }
 }
 assert.equal(pairs,191);
});
test('authoritative destination walking crosses the previously clipping bridge without a stuck retry',()=>{
 const safe={...map,safe:true,mobs:[],npcs:[]},catalog={capital:map.id,maps:[safe]};let now=1000;
 const realm=new RealmServer({catalog,now:()=>now}),record={character:{name:'BridgeTest',gender:'male',classId:'novice'},state:{...initialSave(),mapId:map.id,position:{...clipped.start}}};
 const peer=realm.join({uid:'bridge-test',serverId:'server-1',slotId:'slot-1',record,send(){}});
 assert.ok(realm.receive(peer.id,{type:'walkTo',seq:1,id:'bridge-route-164',mapId:map.id,...clipped.goal}));
 for(let i=0;i<500&&peer.walkRoute.status==='walking';i++){now+=50;realm.step(.05);}
 assert.equal(peer.walkRoute.status,'arrived');assert.ok(Math.hypot(peer.world.player.x-clipped.goal.x,peer.world.player.z-clipped.goal.z)<.2);
});
test('AUTO pursuit uses body clearance while attacks keep sight clearance',()=>{
 const world=new CombatWorld({classId:'swordsman',nav:map.nav,spawn:clipped.start,mobs:[[clipped.goal.x,clipped.goal.z,0]]});
 const mob=world.mobs[0];mob.hp=mob.maxHp=10000;world.autoCast=1e9;world.select(0);world.toggleAuto();
 for(let i=0;i<500;i++)world.update(.05,{x:0,z:0},{monsters:false});
 assert.ok(Math.hypot(world.player.x-mob.x,world.player.z-mob.z)<3,'AUTO reaches the target across the bridge');
});
