import test from 'node:test';import assert from 'node:assert/strict';
import {itemDef} from '../items.js';
import {pieceId,weaponId,bossId,withGrade} from '../gear-sets.js';

const def=id=>itemDef(id);
test('heads and weapons carry PVP damage by grade, armour pieces do not',()=>{
 assert.equal(def(pieceId('pierce','head','swordsman',6)).pct.pvpDmg,.005);
 assert.equal(def(withGrade(pieceId('pierce','head','swordsman',6),4)).pct.pvpDmg,.008);
 assert.equal(def(withGrade(weaponId('swordsman',6),4)).pct.pvpDmg,.016);
 assert.equal(def(pieceId('pierce','armor','swordsman',6)).pct.pvpDmg,undefined);
 assert.equal(def(bossId('head','swordsman')).pct.pvpDmg,.015);
 assert.equal(def(bossId('weapon','swordsman')).pct.pvpDmg,.025);
});
test('DEF moves from the helmet to the garment and shoes',()=>{
 assert.equal(def(pieceId('wall','head','swordsman',6)).def,Math.round(.05*85));
 assert.equal(def(pieceId('wall','garment','swordsman',6)).def,Math.round(.15*85));
 assert.equal(def(pieceId('wall','shoes','swordsman',6)).def,Math.round(.12*85));
});

import {composeId} from '../items.js';
import {setBonuses,setTierLines,STAT_CAPS} from '../gear-sets.js';
import {deriveStats} from '../character-stats.js';
const at4=(family,r)=>['head','armor','garment','shoes'].map(s=>itemDef(composeId(pieceId(family,s,'swordsman',6),r)));
test('a full family set unlocks PVP at +5 on every piece and doubles at +10',()=>{
 const pvp=w=>+setBonuses(w).total.pvpDmg.toFixed(4);
 assert.equal(pvp(at4('pierce',4)),.005);
 assert.equal(pvp(at4('pierce',5)),.035);assert.equal(pvp(at4('pierce',10)),.065);
 const mixed=at4('pierce',5);mixed[2]=itemDef(composeId(pieceId('pierce','garment','swordsman',6),4));
 assert.equal(pvp(mixed),.005);
 assert.equal(setBonuses(at4('pierce',10)).active[0].refineTier,2);
 assert.equal(setBonuses(at4('pierce',5).slice(0,3)).active[0].refineTier??0,0);
});
test('a boss set needs all five pieces, weapon included',()=>{
 const armour=r=>['head','armor','garment','shoes'].map(s=>itemDef(composeId(bossId(s,'swordsman'),r)));
 assert.equal(+setBonuses(armour(10)).total.pvpDmg.toFixed(4),.015);
 const full=[...armour(10),itemDef(composeId(bossId('weapon','swordsman'),10))];
 assert.equal(+setBonuses(full).total.pvpDmg.toFixed(4),.14);
});
test('derived PVE and PVP damage come from gear and stay under the 15% cap',()=>{
 const gear={weapon:composeId(bossId('weapon','swordsman'),10),...Object.fromEntries(['head','armor','garment','shoes'].map(s=>[s,composeId(bossId(s,'swordsman'),10)]))};
 const d=deriveStats({classId:'swordsman',level:99,gear});
 assert.equal(+d.pvpDmg.toFixed(4),.14);assert.equal(d.pveDmg,0);
 assert.equal(STAT_CAPS.pvpDmg,.15);assert.equal(STAT_CAPS.pveDmg,.15);
});
test('the bag shows both refine tiers and marks the reached one',()=>{
 const lines=setTierLines('family',[5,5,5,7],4);
 assert.deepEqual(lines,[['ตีบวก +5 ทั้งชุด: ดาเมจ PVP +3%',true],['ตีบวก +10 ทั้งชุด: ดาเมจ PVP +6%',false]]);
 assert.deepEqual(setTierLines('boss',[10,10,10,10],5).map(l=>l[1]),[false,false]);
});

import {pvpDamage} from '../pvp223.js';
import {RealmServer} from '../server/realm.js';
import {initialSave} from '../realm-state.js';
test('PVP damage raises player hits after the attacker bonus, before the target defence',()=>{
 const target={derived:{def:0,mdef:0,flee:0},player:{shield:0},status:{}},never=()=>1;
 assert.equal(pvpDamage({derived:{},damageContext:{}},target,100,1,never),100);
 assert.equal(pvpDamage({derived:{pvpDmg:.1},damageContext:{}},target,100,1,never),110);
 const armoured={...target,derived:{def:50,mdef:0,flee:0}};
 assert.ok(pvpDamage({derived:{pvpDmg:.1},damageContext:{}},armoured,100,1,never)<110);
 assert.equal(pvpDamage({derived:{pvpDmg:.1},damageContext:{}},{...target,derived:{def:0,flee:.9}},100,1,()=>0),0,'a dodge stays a dodge');
});
test('PVE damage raises monster hits on the server',()=>{
 const map={id:'f',name:'ทุ่ง',safe:false,nav:{zones:[{x:-20,z:-20,w:40,d:40}],obstacles:[],props:[]},spawn:{x:0,z:0},mobs:[[4,0,1]]};
 const realm=new RealmServer({catalog:{capital:'f',maps:[map]},now:()=>1e4}),state=initialSave();state.mapId='f';
 const p=realm.join({uid:'u1',serverId:'server-1',slotId:'slot-1',record:{character:{name:'ผู้ทดสอบ',gender:'male',classId:'novice'},state,bag:{coins:5,items:{}}},send:()=>{}});
 const [m]=p.room.mobs,hit=pve=>{m.hp=m.maxHp=10000;p.world.derived.pveDmg=pve;realm.hurt(p,m,100);return 10000-m.hp;};
 const plain=hit(0);assert.equal(hit(.1),Math.round(plain*1.1));
});

import {familySetItemIds} from '../class-reward-items192.js';
test('review fix: the class-reward weapon carries PVP but never decides the refine tier',()=>{
 const ids=familySetItemIds('pierce',{classId:'swordsman',gender:'male'});   // [weapon, head, armor, garment, shoes] all ^4
 const at=(weaponRefine,armourRefine)=>ids.map((id,i)=>itemDef(id.replace('^4','')+'+'+(i?armourRefine:weaponRefine)+'^4'));
 assert.equal(itemDef(ids[0]).pct.pvpDmg,.016);
 const full=setBonuses(at(3,10));assert.equal(full.active.find(a=>a.family).refineTier,2,'a +3 weapon does not block a +10 armour set');
 const three=ids.slice(0,4).map((id,i)=>itemDef(id.replace('^4','')+'+10^4'));
 assert.equal(setBonuses(three).active.find(a=>a.family).refineTier,0,'weapon + 3 armour pieces is not a full set');
});
