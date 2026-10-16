import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {MENTORS,trainingAction,trainingStatus} from '../city-life-data.js';
import {sampleRoute,routeDuration} from '../citizen-routes.js';
import {initialSave} from '../realm-state.js';
import {createRealmStore} from '../realm-store.js';
import {walkable} from '../combat-core.js';
const catalog=JSON.parse(await readFile(new URL('../maps/world.json',import.meta.url),'utf8')),city=catalog.maps.find(m=>m.id==='ayutthaya');
const record=(mentor=MENTORS[0],level=25)=>({character:{name:'ศิษย์ทดสอบ',gender:'female',classId:'novice'},state:{...initialSave(),position:{x:mentor.x,z:mentor.z+1.3},traveler:{...initialSave().traveler,baseXp:(level-1)*100,kills:9}}});
test('capital has eight unique teachers for seven professions, 32 reachable walking citizens and no monsters',()=>{
 assert.equal(city.safe,true);assert.equal(city.mobs.length,0);assert.equal(new Set(MENTORS.map(m=>m.id)).size,8);assert.equal(new Set(MENTORS.map(m=>m.classId)).size,7);assert.equal(city.citizens.length,32);
 for(const c of city.citizens){assert.ok(c.route.filter(p=>p.rest).length>=4);for(let t=0;t<routeDuration(c.route,c.speed,c.pause);t+=.3){const p=sampleRoute(c.route,t,c);assert.ok(walkable(p.x,p.z,.3,city.nav),`${c.id} route at ${p.x},${p.z}`);}}
});
test('walking loops repeat exactly, stop at authored rest points and do not pause at pathfinding nodes',()=>{
 const route=[{x:0,z:0,rest:true},{x:2,z:0},{x:4,z:0,rest:true}],opts={speed:1,pause:2};assert.equal(routeDuration(route,1,2),12);assert.equal(sampleRoute(route,1,opts).moving,false);assert.equal(sampleRoute(route,4.1,opts).moving,true);assert.deepEqual(sampleRoute(route,3,opts),sampleRoute(route,15,opts));
});
test('every profession requires a fresh accepted field trial before class change and a separate Master trial',()=>{
 for(const m of MENTORS){let r=record(m);assert.throws(()=>trainingAction(r,m.id,'complete'),/trainer-quest/);const accepted=trainingAction(r,m.id,'accept');r.training=accepted.training;assert.throws(()=>trainingAction(r,m.id,'accept'),/trainer-active/);assert.throws(()=>trainingAction(r,m.id,'complete'),/trainer-incomplete/);r.state.traveler.kills+=5;const first=trainingAction(r,m.id,'complete');assert.equal(first.character.classId,m.classId);assert.equal(first.character.jobId,'');r={...r,...first};assert.throws(()=>trainingAction(r,m.id,'accept'),/trainer-level/);r.state.traveler.baseXp=5900;r.training=trainingAction(r,m.id,'accept').training;r.state.traveler.kills+=15;assert.throws(()=>trainingAction(r,m.id,'complete','fake'),/invalid-job/);for(const branch of trainingStatus(r.character,r.training,r.state.traveler,m.id).branches){const result=trainingAction(r,m.id,'complete',branch.id);assert.equal(result.character.jobId,branch.id);assert.equal(result.training,null);assert.throws(()=>trainingAction({...r,...result},m.id,'accept'),/trainer-finished/);}}
});
test('teacher validates level, location, alive state, class and shared monk/nun trial',()=>{
 let r=record(MENTORS[0],24);assert.throws(()=>trainingAction(r,MENTORS[0].id,'accept'),/trainer-level/);r=record();r.state.position={x:0,z:0};assert.throws(()=>trainingAction(r,MENTORS[0].id,'accept'),/trainer-distance/);r=record();r.state.traveler.hp=0;assert.throws(()=>trainingAction(r,MENTORS[0].id,'accept'),/trainer-distance/);
 r=record(MENTORS[6]);r.training=trainingAction(r,MENTORS[6].id,'accept').training;r.state.position={x:MENTORS[7].x,z:MENTORS[7].z+1.3};r.state.traveler.kills+=5;assert.equal(trainingAction(r,MENTORS[7].id,'complete').character.classId,'acolyte');
});
test('guest trial persists independently through save, travel and reload, and Job EXP alone resets on class change',async()=>{
 const rows=new Map(),storage={getItem:k=>rows.get(k)??null,setItem:(k,v)=>rows.set(k,v)},store=createRealmStore({catalog,storage});let r=await store.create('server-1',record().character);const other=await store.create('server-1',{...record().character,name:'ศิษย์คนสอง'});const state=record().state;state.traveler.jobXp=400;r=await store.save('server-1',r,state);r=(await store.train('server-1',r,MENTORS[0].id,'accept')).record;
 r=await store.save('server-1',r,{...r.state,mapId:'rice-fields',position:{x:0,z:0}});r=await store.load('server-1',r.slotId);assert.equal(r.training.startKills,9);assert.equal((await store.load('server-1',other.slotId)).training??null,null);
 r=await store.save('server-1',r,{...state,traveler:{...state.traveler,kills:14}});r=(await store.train('server-1',r,MENTORS[0].id,'complete')).record;assert.equal(r.character.classId,'swordsman');assert.equal(r.state.traveler.baseXp,2400);assert.equal(r.state.traveler.jobXp,0);assert.equal(r.training,null);
});
