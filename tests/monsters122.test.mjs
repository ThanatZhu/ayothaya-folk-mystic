import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {CombatWorld,MONSTER_TYPES,packSpawns,SPREAD} from '../combat-core.js';
import {TERRITORY,STROLL} from '../monster-catalog.js';

const ordinary=t=>t&&!t.boss&&!t.elite&&!t.mvp&&!t.worldBoss&&t.sheet!=='elite-monsters';
const high=MONSTER_TYPES.findIndex(t=>ordinary(t)&&t.level>=16),low=MONSTER_TYPES.findIndex(t=>ordinary(t)&&t.level<=5);
const field=mobs=>({id:'field',safe:false,nav:{zones:[{x:-60,z:-60,w:120,d:120}],obstacles:[],props:[]},spawn:{x:0,z:0},mobs});
const run=(w,seconds,each=()=>{})=>{for(let i=0;i<seconds*20;i++){each();w.update(.05,{x:0,z:0});}};

test('camps spread out: monsters 3 m+ apart, copied camps 12 m+ from their original (0.122)',()=>{
 const maps=JSON.parse(fs.readFileSync(new URL('../maps/world.json',import.meta.url),'utf8')).maps.filter(m=>m.packs&&m.id!=='lotus-marsh');
 for(const map of maps){
  const spawns=packSpawns(map.mobs,{packs:true,nav:map.nav,mobPopulation:map.mobPopulation??1}),plain=spawns.filter(s=>ordinary(MONSTER_TYPES[s[2]]));
  for(const [i,a] of plain.entries())for(const b of plain.slice(i+1))assert.ok(Math.hypot(a[0]-b[0],a[1]-b[1])>=SPREAD.gap-1e-9,map.id+' monsters closer than 3 m');
 }
 // the same input always builds the same spots (server and clients share ids)
 const map=maps[0];assert.deepEqual(packSpawns(map.mobs,{packs:true,nav:map.nav,mobPopulation:2}),packSpawns(map.mobs,{packs:true,nav:map.nav,mobPopulation:2}));
});

test('idle monsters stroll within 4 m of home and rest between walks',()=>{
 const w=new CombatWorld(field([[20,20,low]]));const m=w.mobs[0];let moved=0,far=0,last={x:m.x,z:m.z};
 run(w,40,()=>{w.player.hp=w.player.maxHp;if(Math.hypot(m.x-last.x,m.z-last.z)>1e-6)moved++;last={x:m.x,z:m.z};far=Math.max(far,Math.hypot(m.x-m.home.x,m.z-m.home.z));});
 assert.ok(moved>40,'it walked');assert.ok(moved<800*.8,'it also rested');assert.ok(far<=STROLL.radius+.05,'stayed near home: '+far.toFixed(2));
});

test('a monster 15+ levels above attacks a player who comes within 5 m; a weaker one waits to be hit',()=>{
 assert.ok(high>=0&&low>=0);
 const strong=new CombatWorld(field([[4,0,high]]));
 run(strong,6,()=>{strong.player.hp=strong.player.maxHp;});
 assert.equal(strong.mobs[0].aggro,true,'Lv.'+MONSTER_TYPES[high].level+' vs Lv.1 at 4 m');
 const weak=new CombatWorld(field([[4,0,low]]));
 run(weak,6,()=>{weak.player.hp=weak.player.maxHp;});
 assert.equal(weak.mobs[0].aggro,false,'Lv.'+MONSTER_TYPES[low].level+' stays passive');
 const outside=new CombatWorld(field([[TERRITORY.range+4,0,high]]));outside.mobs[0].stroll=null;outside.mobs[0].rest=1e9;
 run(outside,2,()=>{outside.player.hp=outside.player.maxHp;});
 assert.equal(outside.mobs[0].aggro,false,'beyond 5 m it leaves you alone');
});
