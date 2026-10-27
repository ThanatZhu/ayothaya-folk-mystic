import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {walkable,moveBody,CombatWorld} from '../combat-core.js';
import {createRouteWalker} from '../route-walk.js';
import {RealmServer} from '../server/realm.js';
import {initialSave} from '../realm-state.js';
import {loadingTheme} from '../loading-theme.js';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url));
const catalog=JSON.parse(read('maps/world.json'));
const manifest=JSON.parse(read('maps/chapter2-manifest.json'));
const maps=manifest.maps.map(a=>catalog.maps.find(m=>m.id===a.id));
function route(map,goal,from=map.spawn){
 const body={...from};let arrived=false,failed;
 const walker=createRouteWalker(()=>map.nav);
 walker.go(goal,{radius:.65,onArrive:()=>arrived=true,onFail:r=>failed=r});
 for(let i=0;i<18000&&walker.active;i++){const d=walker.step(body,1/30);if(d)moveBody(body,d.x*5/30,d.z*5/30,map.nav);}
 assert.ok(arrived,map.id+' '+JSON.stringify(goal)+' '+failed);
}
test('chapter 2 ships reviewed geometry, matching navigation and separate loading illustrations',()=>{
 for(const [i,m] of maps.entries()){
  if(m.safe){assert.equal(m.exploration,true);assert.equal(new CombatWorld(m).mobs.length,0);}
  else{assert.equal(m.exploration,false);assert.equal(new CombatWorld(m).mobs.length,56);assert.ok(m.worldBoss);}
  const blob=read(m.scene);assert.ok(blob.length<=5000000);
  assert.equal(createHash('sha256').update(blob).digest('hex'),manifest.maps[i].sha256);
  assert.equal(m.nav.grid.rows.length,m.nav.grid.h);
  assert.equal(loadingTheme(m.id).name,m.name);
  assert.ok(read(loadingTheme(m.id).art.replace('./','')).length>10000);
 }
 assert.equal(maps.at(-1).layoutRevision,'kailash-v3');
});
test('all chapter 2 portals, districts and NPC approaches remain reachable with NPC collision enabled',()=>{
 for(const m of maps){
  assert.ok(walkable(m.spawn.x,m.spawn.z,.6,m.nav));
  for(const p of m.portals){assert.ok(catalog.maps.find(v=>v.id===p.to)?.portals.some(q=>q.to===m.id));route(m,p);}
  for(const d of m.districts)route(m,d);
  for(const n of m.npcs){
   const approaches=[[0,1.5],[1.5,0],[-1.5,0],[0,-1.5]].map(([x,z])=>({x:n.x+x,z:n.z+z})).filter(p=>walkable(p.x,p.z,.6,m.nav));
   assert.ok(approaches.length>=2,m.id+' '+n.name);route(m,approaches[0]);
  }
  for(const r of m.roads){
   const dx=r.b[0]-r.a[0],dz=r.b[1]-r.a[1],length=Math.hypot(dx,dz),steps=Math.ceil(length*2);
   for(let i=0;i<=steps;i++)for(const offset of [-2,0,2]){
    const x=r.a[0]+dx*i/steps-dz/length*offset,z=r.a[1]+dz*i/steps+dx/length*offset;
    assert.ok(walkable(x,z,.6,m.nav),m.id+' clear lane '+x+','+z);
   }
  }
 }
 const marsh=catalog.maps.find(m=>m.id==='lotus-marsh');route(marsh,marsh.portals.find(p=>p.to==='bamboo-grove'));
});
test('authoritative server accepts the connected exploration journey and rejects sealed/unknown destinations',()=>{
 const realm=new RealmServer({catalog});
 let from='lotus-marsh';
 for(const m of maps){
  const state=initialSave();state.mapId=from;
  const peer=realm.join({uid:'chapter2-qa-'+m.id,serverId:'server-1',slotId:'slot-1',record:{character:{name:'MapQA',gender:'male',classId:'novice'},state},send:()=>{}});
  const portal=peer.room.map.portals.find(p=>p.to===m.id);
  assert.ok(portal);Object.assign(peer.world.player,{x:portal.x,z:portal.z});
  assert.equal(realm.travelDestination(peer,m.id).id,m.id);
  assert.throws(()=>realm.travelDestination(peer,'sealed'),/travel-invalid/);
  from=m.id;
 }
});
