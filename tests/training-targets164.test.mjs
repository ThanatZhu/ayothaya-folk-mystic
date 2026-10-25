import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {trainingMapPaths,trainingMonsterSources,trainingNextGoal} from '../training-targets164.js';
import {createTrainingWalk} from '../training-walk164.js';
import {TRIAL} from '../city-life-data.js';
import {DROPS} from '../items.js';
import {MONSTER_TYPES} from '../combat-core.js';
const catalog=JSON.parse(readFileSync(new URL('../maps/world.json',import.meta.url)));

test('every training material and boss resolves to a real, reachable open-world spawn and drop',()=>{
 for(const trial of Object.values(TRIAL)){
  for(const [id]of trial.items){
   const sources=trainingMonsterSources(catalog,'ayutthaya',{kind:'item',id});assert.ok(sources.length,id);
   assert.equal(sources[0].boss,false,'prefer repeatable regular monsters for '+id);
   for(const source of sources){assert.ok(DROPS[source.monster].items.some(([item,p])=>item===id&&p>0));assert.ok(catalog.maps.find(m=>m.id===source.mapId).mobs.some(([, ,t])=>t===source.typeIndex));}
  }
  const boss=trainingMonsterSources(catalog,'ayutthaya',{kind:'boss',id:trial.boss})[0];assert.equal(boss.monster,trial.boss);
 }
 assert.deepEqual(trainingMonsterSources(catalog,'ayutthaya',{kind:'item',id:'not-a-drop'}),[]);
});

test('material routing favours farmable nearby maps and reports the actual monster, not a similar item',()=>{
 const source=trainingMonsterSources(catalog,'lotus-marsh',{kind:'item',id:'lotus-seed'})[0];assert.equal(source.mapId,'lotus-marsh');assert.equal(source.monster,'lotus-vine');assert.equal(source.yield,.5);
 assert.equal(trainingMonsterSources(catalog,'rice-fields',{kind:'item',id:'spirit-thread'})[0].mapId,'rice-fields');
 const paths=trainingMapPaths(catalog,'ayutthaya');assert.deepEqual(paths.get('lotus-marsh'),['rice-fields','old-orchard','moonlit-mill','lotus-marsh']);assert.equal(paths.has('mill-cellar'),false);
 const fake={maps:[{id:'a',portals:[{to:'dungeon'},{to:'b'}]},{id:'dungeon',instance:true,portals:[{to:'c'}]},{id:'b',portals:[]},{id:'c',portals:[]}]};assert.equal(trainingMapPaths(fake,'a').has('c'),false);
});

test('next objective follows missing materials, boss, hunt and money; ready returns to the teacher',()=>{
 const status={trial:TRIAL.master,progress:100,target:100,bossDone:true},bag={coins:10000,items:{'spirit-thread':10,'palm-leaf':3,'lotus-seed':19}};
 assert.deepEqual(trainingNextGoal(status,bag,true),{kind:'item',id:'lotus-seed'});bag.items['lotus-seed']=20;assert.deepEqual(trainingNextGoal(status,bag,true),{kind:'mentor'});
 status.bossDone=false;assert.equal(trainingNextGoal(status,bag,true).kind,'boss');status.bossDone=true;status.progress=99;assert.equal(trainingNextGoal(status,bag,true).kind,'hunt');status.progress=100;bag.coins=9999;assert.equal(trainingNextGoal(status,bag,true).kind,'coins');
 assert.equal(trainingNextGoal(status,{coins:0,items:{}},false).kind,'mentor','offline trial still requires only the hunt');
});

const memory=()=>{const map=new Map();return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k),map};};
function fixture({storage=memory(),mapId='lotus-marsh',scope='realm:slot',signature='trial',now=100000,target=null}={}){
 const map=catalog.maps.find(m=>m.id===mapId),typeIndex=MONSTER_TYPES.findIndex(t=>t.id==='lotus-vine'),calls=[],notices=[],trips=[],selected=[];
 const world={player:{x:0,z:0,hp:100},mobs:[{id:1,type:typeIndex,x:10,z:0,hp:100},{id:2,type:typeIndex,x:3,z:0,hp:100}],notice:t=>notices.push(t),select:id=>selected.push(id)};
 const game={world,walking:false,clearInput(){},walkTo(point,opts){game.walking=true;calls.push({point,opts});return true;}};
 const state={signature,target:target??{mapId:'lotus-marsh',mapName:'บึงบัวต้องมนตร์',typeIndex,name:'เถาบัวพันขา',x:7,z:0}};
 const walk=createTrainingWalk({game,map,catalog,scope,storage,now:()=>now,signature:()=>state.signature,resolve:()=>state.target,travel:id=>{trips.push(id);return true;},talkTo:name=>selected.push(name)});
 return {walk,game,world,calls,notices,trips,selected,storage,state};
}

test('walking selects the nearest live monster and follows its position without auto-attacking',()=>{
 const f=fixture();assert.equal(f.walk.go({kind:'item',id:'lotus-seed'}),true);const c=f.calls[0];assert.equal(c.opts.mobId,2);assert.equal(c.opts.kind,'quest');f.world.mobs[1].x=5;assert.deepEqual(c.point(),{x:5,z:0});c.opts.onArrive();assert.deepEqual(f.selected,[2]);assert.equal(f.world.auto,undefined);
 f.game.walking=false;f.walk.update();assert.equal(f.calls.length,1,'manual movement never restarts the route');
});

test('a dead target switches to another live spawn; all dead walks to the real camp with a respawn notice',()=>{
 const f=fixture();f.walk.go({kind:'item',id:'lotus-seed'});f.world.mobs[1].hp=0;f.calls[0].opts.onFail('gone');assert.equal(f.calls[1].opts.mobId,1);
 f.world.mobs[0].hp=0;f.calls[1].opts.onFail('gone');assert.deepEqual(f.calls[2].point,{x:7,z:0});assert.equal(f.calls[2].opts.mobId,undefined);assert.ok(f.notices.some(t=>t.includes('ยังไม่เกิด')));
});

test('cross-map walking uses each portal and resumes only the same trial and character scope',async()=>{
 const f=fixture({mapId:'ayutthaya'}),goal={kind:'item',id:'lotus-seed'};f.walk.go(goal);assert.deepEqual(f.trips,[]);assert.equal(f.calls[0].opts.kind,'quest');
 const first=catalog.maps.find(m=>m.id==='ayutthaya').portals.find(p=>p.to==='rice-fields');assert.deepEqual(f.calls[0].point,{x:first.x,z:first.z});
 await f.calls[0].opts.onArrive();assert.deepEqual(f.trips,['rice-fields']);assert.equal(f.storage.map.size,1);
 const other=fixture({mapId:'rice-fields',storage:f.storage,scope:'realm:other-slot'});other.walk.update();assert.equal(other.calls.length,0);
 const resumed=fixture({mapId:'rice-fields',storage:f.storage});resumed.walk.update(false);assert.equal(resumed.calls.length,0);resumed.walk.update();assert.equal(resumed.calls.length,1);
 const next=catalog.maps.find(m=>m.id==='rice-fields').portals.find(p=>p.to==='old-orchard');assert.deepEqual(resumed.calls[0].point,{x:next.x,z:next.z});assert.equal(f.storage.map.size,0);
 resumed.game.walking=false;resumed.walk.update();assert.equal(resumed.calls.length,1);
});

test('cancelled/completed/expired trials and stale arrival callbacks cannot restart a trip',async()=>{
 for(const mode of ['cancel','complete','expired','manual']){
  const f=fixture({mapId:'ayutthaya'});f.walk.go({kind:'item',id:'lotus-seed'});await f.calls[0].opts.onArrive();
  const resumed=fixture({mapId:'rice-fields',storage:f.storage,signature:mode==='cancel'?'new-trial':'trial',now:mode==='expired'?800001:100000});if(mode==='complete')resumed.state.target=null;if(mode==='manual')resumed.game.walking=true;
  resumed.walk.update();assert.equal(resumed.calls.length,0,mode);assert.equal(f.storage.map.size,0);
 }
 const f=fixture({mapId:'ayutthaya'});f.walk.go({kind:'item',id:'lotus-seed'});f.walk.go({kind:'boss',id:'marsh-ape'});await f.calls[0].opts.onArrive();assert.deepEqual(f.trips,[]);
 f.state.signature='different';await f.calls[1].opts.onArrive();assert.deepEqual(f.trips,[]);
});

test('ready trials walk to the teacher; failed gate travel clears continuation without charging anything',async()=>{
 const f=fixture({mapId:'ayutthaya',target:{mapId:'ayutthaya',name:'ครู',npc:'ครู',x:4,z:5}});f.walk.go({kind:'mentor'});assert.equal(f.calls[0].opts.npc,'ครู');f.calls[0].opts.onArrive();assert.deepEqual(f.selected,['ครู']);
 const storage=memory(),game={world:{player:{hp:100},notice(){}},clearInput(){},walkTo(p,o){this.opts=o;return true;}};const w=createTrainingWalk({game,catalog,map:catalog.maps.find(m=>m.id==='ayutthaya'),scope:'qa',storage,signature:()=>'',resolve:()=>({mapId:'rice-fields'}),travel:()=>false,talkTo(){}});w.go({kind:'hunt'});await game.opts.onArrive();assert.equal(storage.map.size,0);
});

test('online continuations wait for the new connection and can be cancelled before it is ready',async()=>{
 const f=fixture({mapId:'ayutthaya'});f.game.online=true;f.walk.go({kind:'item',id:'lotus-seed'});await f.calls[0].opts.onArrive();
 const resumed=fixture({mapId:'rice-fields',storage:f.storage});resumed.walk.update();assert.equal(resumed.calls.length,0);assert.equal(resumed.walk.resuming,true);
 resumed.game.online=true;resumed.walk.update();assert.equal(resumed.calls.length,1);
 await f.calls[0].opts.onArrive();const cancelled=fixture({mapId:'rice-fields',storage:f.storage});cancelled.walk.cancelResume();cancelled.game.online=true;cancelled.walk.update();assert.equal(cancelled.calls.length,0);assert.equal(cancelled.walk.resuming,false);
});
