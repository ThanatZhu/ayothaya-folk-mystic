import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fieldAdventurers,adventurerOffer,adventurerAt,adventurerViews,adventurerContract} from '../field-adventurers177.js';
import {CombatWorld,MONSTER_TYPES,walkable} from '../combat-core.js';
import {RealmServer} from '../server/realm.js';
import {serializeTraveler} from '../world-state.js';
import {initialSave} from '../realm-state.js';
const catalog=JSON.parse(readFileSync(new URL('../maps/world.json',import.meta.url))),maps=catalog.maps;
test('all fourteen hunting maps have three deterministic hireable adventurers with body-safe patrols',()=>{
 const fields=maps.filter(m=>adventurerOffer(m));assert.equal(fields.length,14);
 for(const map of fields){
  const rows=fieldAdventurers(map);assert.equal(rows.length,3);assert.deepEqual(fieldAdventurers(structuredClone(map)),rows);assert.equal(new Set(rows.map(n=>n.id)).size,3);
  for(const n of rows)for(let t=0;t<80;t+=.25){const p=adventurerAt(n,t);assert.ok(walkable(p.x,p.z,.4,map.nav),map.id+' '+n.id);assert.ok(Number.isFinite(p.x));}
 }
 for(const map of maps.filter(m=>!adventurerOffer(m)))assert.deepEqual(fieldAdventurers(map),[]);
 const prices=fields.map(m=>adventurerOffer(m).cost);assert.deepEqual(prices,[400,800,800,1500,2500,2500,4000,4000,4000,400,800,2500,4000,4000]);
});
function setup(mapId='old-orchard',coins=10000){
 let now=100000;const realm=new RealmServer({catalog,now:()=>now}),state=initialSave();state.mapId=mapId;
 const p=realm.join({uid:'hire-test',serverId:'server-1',slotId:'slot-1',record:{character:{name:'Employer',gender:'male',classId:'novice'},state,bag:{coins,items:{}},daily:{day:'2099-01-01',streak:1}},send(){}});
 p.bag.coins=coins;const def=fieldAdventurers(p.room.map)[0],npc=()=>adventurerAt(def,now/1000);
 const near=()=>Object.assign(p.world.player,npc());
 const send=data=>realm.receive(p.id,{type:'hire',seq:p.seq+1,...data});return {realm,p,def,npc,near,send};
}
test('realm owns price, identity, damage and duration; far/forged/duplicate requests never charge',()=>{
 const {realm,p,def,near,send}=setup(),before=p.bag.coins;
 Object.assign(p.world.player,{x:999,z:999});assert.equal(send({adventurer:def.id,x:0,z:0,cost:0}),false);assert.equal(p.bag.coins,before);
 near();assert.equal(send({adventurer:'rice-fields:adventurer:0'}),false);assert.equal(send({adventurer:def.id,cost:1,power:1e9,seconds:1e9,classId:'rogue'}),true);
 assert.equal(p.bag.coins,before-def.cost);assert.equal(p.world.merc.left,1200);assert.equal(p.world.merc.power,def.power);assert.equal(p.world.merc.classId,def.classId);assert.equal(serializeTraveler(p.world).merc,undefined);
 assert.equal(send({adventurer:def.id}),false);assert.equal(p.bag.coins,before-def.cost);
 const snap=realm.snapshot(p).self;assert.equal(snap.adventurerSchema,1);assert.equal(snap.adventurers.length,3);assert.equal(snap.mercenary.id,def.id);assert.equal(snap.merc,1200);assert.deepEqual(snap.adventurers,adventurerViews(p.room.map,100));
});
test('not enough money and defeated employers cannot hire; contracts are absent from travel saves',()=>{
 const {p,def,near,send}=setup('rice-fields',199);near();assert.equal(send({adventurer:def.id}),false);assert.equal(p.bag.coins,199);assert.equal(p.world.merc,null);
 p.bag.coins=1000;p.world.player.hp=0;assert.equal(send({adventurer:def.id}),false);assert.equal(p.bag.coins,1000);
});
test('helper hit follows its wind-up, credits actual monster damage, refuses players and expires',()=>{
 const map=maps.find(m=>m.id==='old-orchard'),def=fieldAdventurers(map)[0],nav={zones:[{x:-20,z:-20,w:40,d:40}],obstacles:[],props:[]};
 const w=new CombatWorld({classId:'novice',nav,spawn:{x:0,z:0},mobs:[[2,0,MONSTER_TYPES.findIndex(t=>t.id==='straw')]]});
 const mob=w.mobs[0];mob.hp=mob.maxHp=10000;w.targetId=mob.id;w.hire(2,adventurerContract(def));w.mercStep(.01);assert.equal(mob.hp,10000);assert.ok(w.events.some(e=>e.type==='merc'));
 w.mercStep(.24);assert.equal(mob.hp,10000);w.mercStep(.02);assert.equal(mob.hp,10000-def.power);assert.ok(w.events.some(e=>e.type==='mercHit'));
 const hp=mob.hp;w.foe={id:'player',hp:500,x:1,z:0};w.targetId='player';w.mercStep(1.5);assert.equal(w.foe.hp,500);assert.equal(mob.hp,hp);w.mercStep(1);assert.equal(w.merc,null);
});
