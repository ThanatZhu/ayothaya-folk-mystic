import test from 'node:test';
import assert from 'node:assert/strict';
import {refineGear,REFINE_RATE,refineCost} from '../refine.js';
import {itemDef,normalizeBag,sell} from '../items.js';
import {deriveStats,equipGear,unequipGear} from '../character-stats.js';
import {affinityMultiplier,elementMultiplier,MONSTER_AFFINITY} from '../affinity.js';
import {CombatWorld,MONSTER_TYPES} from '../combat-core.js';
import {RealmServer} from '../server/realm.js';
import {initialSave} from '../realm-state.js';

test('refined ids resolve, keep their level in the bag, and are worth more', () => {
 assert.equal(itemDef('sword-iron+5').refine,5);assert.equal(itemDef('sword-iron+5').name,'ดาบเหล็กกล้า +5');
 assert.equal(itemDef('ring-ruby+3'),null,'accessories cannot be refined');assert.equal(itemDef('sword-iron+11'),null);
 assert.deepEqual(normalizeBag({items:{'sword-iron+5':1,'hp-small+2':1}}).items,{'sword-iron+5':1});
 assert.ok(itemDef('sword-iron+5').sell>itemDef('sword-iron').sell);
 const r=unequipGear({items:{}},{weapon:'sword-iron+5'},'weapon');assert.equal(r.bag.items['sword-iron+5'],1,'unequip keeps the refine');
 assert.equal(equipGear(r.bag,r.gear,'sword-iron+5',{classId:'swordsman',level:1}).gear.weapon,'sword-iron+5');
 assert.equal(sell({items:{'sword-iron+5':1}},'sword-iron+5').coins,itemDef('sword-iron+5').sell);
});

test('refining spends coins + ore, +1..+4 never break, a failure from +5 destroys the piece', () => {
 const bag={coins:10000,items:{'iron-ore':20,'laterite':5,'lek-lai':1}};
 let r=refineGear(bag,{weapon:'sword-iron'},'weapon',{rand:()=>.999});
 assert.equal(r.result,'success');assert.equal(r.gear.weapon,'sword-iron+1');assert.equal(r.bag.coins,10000-refineCost(1));assert.equal(r.bag.items['iron-ore'],19);
 r=refineGear(r.bag,{weapon:'sword-iron+4'},'weapon',{rand:()=>.95});assert.equal(r.result,'broken');assert.equal(r.gear.weapon,null);
 r=refineGear(bag,{weapon:'sword-iron+4'},'weapon',{lekLai:true,rand:()=>.95});assert.equal(r.result,'success','lek-lai lifts 90% to 100%');assert.equal(r.bag.items['lek-lai'],undefined);
 assert.throws(()=>refineGear(bag,{accessory:'ring-ruby'},'accessory'),/not-refinable/);
 assert.throws(()=>refineGear(bag,{weapon:'sword-iron+10'},'weapon'),/refine-max/);
 assert.throws(()=>refineGear({coins:10,items:{'iron-ore':1}},{weapon:'sword-iron'},'weapon'),/no-coins/);
 assert.throws(()=>refineGear({coins:9999,items:{}},{armor:'vest-cotton'},'armor'),/no-ore/);
 assert.deepEqual(REFINE_RATE.slice(0,4),[1,1,1,1]);
 const plain=deriveStats({level:10,classId:'swordsman',gear:{weapon:'sword-iron',armor:'vest-cotton'}}),up=deriveStats({level:10,classId:'swordsman',gear:{weapon:'sword-iron+7',armor:'vest-cotton+3'}});
 assert.ok(up.atk>=plain.atk+14&&up.def===plain.def+3);
});

test('elements and sizes: fire burns earth, holy purges ghosts, neutral grazes them, daggers struggle on big targets', () => {
 for(const id of Object.keys(MONSTER_AFFINITY))assert.ok(MONSTER_TYPES.some(t=>t.id===id),id);
 assert.equal(elementMultiplier('fire','earth'),1.5);assert.ok(elementMultiplier('neutral','ghost')<1);assert.ok(elementMultiplier('holy','ghost')>1.5);
 assert.ok(affinityMultiplier({element:'neutral',physical:true,classId:'rogue'},'mill-keeper')<affinityMultiplier({element:'neutral',physical:true,classId:'lancer'},'mill-keeper'));
 assert.equal(affinityMultiplier({element:'fire',physical:false,classId:'shaman'},'mill-keeper'),1.25,'magic ignores size');
 // In the world: a shaman's skill hits an earth monster harder than a neutral-element mob of the same HP.
 const straw=MONSTER_TYPES.findIndex(t=>t.id==='straw'),rat=MONSTER_TYPES.findIndex(t=>t.id==='rat');
 const nav={zones:[{x:-20,z:-20,w:40,d:40}],obstacles:[],props:[]};
 const hit=type=>{const w=new CombatWorld({classId:'shaman',safe:false,nav,spawn:{x:0,z:0},mobs:[[1,0,type]]});const m=w.mobs[0];m.hp=9999;w.skill(0);return 9999-m.hp;};
 assert.ok(hit(straw)>hit(rat),'fire skill vs earth > vs neutral');
});

test('server: refining only at the forge, rolls, saves the refined id', () => {
 const nav={zones:[{x:-40,z:-40,w:80,d:80}],obstacles:[],props:[]};
 const map={id:'ayutthaya',safe:true,nav,spawn:{x:0,z:0},mobs:[],portals:[],npcs:[{name:'ครูแสนดาบ',x:5,z:0,text:'-'},{name:'แม่บัว',x:-5,z:0,text:'-'}]};
 let time=1e4;const realm=new RealmServer({catalog:{capital:'ayutthaya',maps:[map]},now:()=>time});
 const record={character:{name:'tester',gender:'male',classId:'swordsman'},state:initialSave(),bag:{coins:5000,items:{'iron-ore':3}},gear:{weapon:'sword-iron'}};
 const peer=realm.join({uid:'u',serverId:'server-1',slotId:'slot-1',record,send:()=>{}});
 const send=(type,data)=>{time+=1000;return realm.receive(peer.id,{type,seq:peer.seq+1,...data});};
 Object.assign(peer.world.player,{x:-4,z:0});
 assert.equal(send('refine',{slot:'weapon',npc:'แม่บัว'}),false,'not a forge');
 Object.assign(peer.world.player,{x:4,z:0});
 assert.equal(send('refine',{slot:'weapon',npc:'ครูแสนดาบ'}),true);
 assert.equal(realm.record(peer,record).gear.weapon,'sword-iron+1','+1 is always safe');
 assert.equal(realm.record(peer,record).bag.items['iron-ore'],2);
 assert.ok(peer.world.events.some(e=>e.type==='refined'&&e.result==='success'));
});
