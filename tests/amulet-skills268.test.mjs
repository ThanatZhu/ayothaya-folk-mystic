import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {CombatWorld,MONSTER_TYPES} from '../combat-core.js';import {deriveStats} from '../character-stats.js';import {AMULETS,amuletAtTier} from '../amulets.js';
import {amuletHit,amuletCoins,amuletCrit,shieldPoints} from '../amulet-skills.js';import {petBlessing} from '../pet-combat.js';
import {RealmServer} from '../server/realm.js';import {arenaCommand,ARENA_MAP} from '../server/arena-rooms166.js';import {initialSave} from '../realm-state.js';

const nav={bounds:{w:60,h:60},blocked:[]},type=MONSTER_TYPES.find(t=>t.id==='straw');
function wearing(amulet,classId='novice'){
 const w=new CombatWorld({classId,nav,spawn:{x:0,z:0},mobs:[]});w.applyDerived(deriveStats({level:50,classId,gear:{accessory:amulet}}));
 w.player.hp=w.player.maxHp;return w;
}
const hit=(w,raw)=>{const random=Math.random;try{Math.random=()=>.99;return w.takeMonsterHit(type,raw);}finally{Math.random=random;}};

test('only a worn rainbow amulet carries a skill',()=>{
 for(const a of AMULETS){assert.equal(deriveStats({gear:{accessory:a.id}}).amuletSkill,a.id);assert.equal(deriveStats({gear:{accessory:amuletAtTier(a,'red').id}}).amuletSkill,null);assert.ok(amuletAtTier(a).effects[0].startsWith('สกิลพิเศษ'),a.id);}
 assert.equal(deriveStats({}).amuletSkill,null);
});

test('rainbow stats stay inside what the best boss set gives',()=>{
 const best={hpPct:.3,defPct:.5,dmgReduce:.13,atkPct:.08,matkPct:.08,crit:.15,critDmg:.6,armorPen:.35,cdr:.2,mpCut:.18,moveSpeed:.1};
 for(const a of AMULETS)for(const [k,n] of Object.entries(a.pct))assert.ok(n<=best[k]*.6+1e-9||n<=.15,`${a.id} ${k} ${n}`);
});

test('Phra Rod stops a killing blow at 1 HP, then 3 seconds of immortality, then a cooldown',()=>{
 const w=wearing('amulet-phra-rod');hit(w,1e9);assert.equal(w.player.hp,1);assert.equal(w.player.down,0);assert.equal(w.status.undying,3);
 hit(w,1e9);assert.equal(w.player.hp,1,'still immortal');
 for(let i=0;i<70;i++)w.update(.05,{x:0,z:0},{monsters:false});assert.equal(w.status.undying,undefined);
 hit(w,1e9);assert.equal(w.player.hp,0,'second blow lands while the amulet is on cooldown');assert.ok(w.player.down>0);
 const again=wearing('amulet-phra-rod');again.time=1000;again.amuletReadyAt=1000+179;hit(again,1e9);assert.equal(again.player.hp,0);
});

test('a player without the amulet dies as before and PvP waits 5 minutes',()=>{
 const w=wearing(null);hit(w,1e9);assert.equal(w.player.hp,0);
 const pvp=wearing('amulet-phra-rod'),start=pvp.time;assert.equal(amuletHit(pvp,1e9,{pvp:true}),pvp.player.hp-1);assert.equal(pvp.amuletReadyAt,start+300);
 const pve=wearing('amulet-phra-rod');amuletHit(pve,1e9);assert.equal(pve.amuletReadyAt,pve.time+180);
});

test('Phra Somdej shields once under 40% and the shield counts as grey HP',()=>{
 const w=wearing('amulet-somdej'),{player:p}=w;p.hp=p.maxHp*.41;w.update(.05,{x:0,z:0},{monsters:false});assert.equal(shieldPoints(w),0);
 p.hp=p.maxHp*.39;w.update(.05,{x:0,z:0},{monsters:false});const full=Math.round(p.maxHp*.25);assert.equal(shieldPoints(w),full);
 assert.equal(amuletHit(w,full-10),0);assert.equal(shieldPoints(w),10);assert.equal(amuletHit(w,25),15);assert.equal(shieldPoints(w),0);
 for(let i=0;i<20;i++)w.update(.05,{x:0,z:0},{monsters:false});assert.equal(shieldPoints(w),0,'no second shield inside the cooldown');
 const faded=wearing('amulet-somdej');faded.player.hp=1;faded.update(.05,{x:0,z:0},{monsters:false});for(let i=0;i<125;i++)faded.update(.05,{x:0,z:0},{monsters:false});assert.equal(shieldPoints(faded),0,'gone after 6 seconds');
});

test('Phra Phong Suphan breaks control, heals and holds off control for 3 seconds',()=>{
 const w=wearing('amulet-phong-suphan'),{player:p}=w;p.hp=100;w.status.stun=2;w.update(.05,{x:0,z:0},{monsters:false});
 assert.equal(w.status.stun,undefined);assert.equal(p.hp,Math.min(p.maxHp,100+Math.round(p.maxHp*.15)));assert.ok(w.status.stoutSpirit>0);
 const healed=p.hp;w.status.sleep=5;w.status.root=3;w.update(.05,{x:0,z:0},{monsters:false});assert.equal(w.status.sleep,undefined);assert.equal(w.status.root,undefined);assert.ok(p.hp<=healed+1,'a blocked control does not heal again');
 for(let i=0;i<70;i++)w.update(.05,{x:0,z:0},{monsters:false});w.status.stun=2;w.update(.05,{x:0,z:0},{monsters:false});assert.ok(w.status.stun>0,'after the guard, the cooldown holds');
});

test('Phra Nang Phaya crit raises damage 15% for 6 seconds, once every 30 seconds',()=>{
 const w=wearing('amulet-nang-phaya');assert.equal(petBlessing(w),1);amuletCrit(w);assert.equal(w.status.baramee,6);assert.equal(petBlessing(w),1.15);
 delete w.status.baramee;amuletCrit(w);assert.equal(w.status.baramee,undefined,'cooldown');w.time+=30;amuletCrit(w);assert.equal(w.status.baramee,6);
 const none=wearing(null);amuletCrit(none);assert.equal(none.status.baramee,undefined);
});

test('Phra Sum Kor turns 2% of kills into ten times the coins',()=>{
 const w=wearing('amulet-sum-kor');assert.equal(amuletCoins(w,50,()=>.019),500);assert.equal(amuletCoins(w,50,()=>.02),50);assert.equal(amuletCoins(wearing(null),50,()=>0),50);assert.equal(amuletCoins(w,0,()=>0),0);
});

const catalog=JSON.parse(await readFile(new URL('../maps/world.json',import.meta.url)));
function realm(){const r=new RealmServer({catalog,now:()=>10000,roleSkills:true});
 const record=(name,gear,mapId='ayutthaya')=>({character:{name,gender:'male',classId:'swordsman'},state:{...initialSave(),mapId,gear},bag:{items:{},coins:100}});
 const join=(name,rec)=>r.join({uid:name,serverId:'server-1',slotId:'slot-1',channel:1,record:rec,send(){}});
 const enter=(p,gear)=>{const rec=r.record(p,record(p.uid,gear));r.travelDestination(p,ARENA_MAP);r.leave(p.id,{travel:true});rec.state.mapId=ARENA_MAP;return join(p.uid,rec);};
 return {r,record,join,enter};}

test('a duel knockout at 1 HP still counts unless Phra Rod saves the wearer',()=>{
 const {r,record,join,enter}=realm();let a=join('Alice',record('Alice',{})),b=join('Bobby',record('Bobby',{}));
 const room=arenaCommand(r,a,{action:'create'}).mine.id;arenaCommand(r,b,{action:'join',room});a=enter(a,{});b=enter(b,{});
 arenaCommand(r,a,{action:'ready'});arenaCommand(r,b,{action:'ready'});
 b.world.applyDerived(deriveStats({level:50,classId:'swordsman',gear:{accessory:'amulet-phra-rod'}}));
 const random=Math.random;try{Math.random=()=>.99;r.hurt(a,a.world.foe,1e6);assert.equal(b.world.player.hp,2,'one point above the knockout');assert.ok(a.duel);assert.equal(b.world.status.undying,3);assert.equal(b.world.amuletReadyAt,b.world.time+300);
  r.hurt(a,a.world.foe,1e6);assert.equal(b.world.player.hp,2,'immortal');b.world.status={};r.hurt(a,a.world.foe,1e6);assert.equal(b.world.player.hp,1);assert.equal(a.duel,null);}finally{Math.random=random;}
});

test('the server sends the shield to the HP bar',()=>{
 const {r,record,join}=realm(),a=join('Alice',record('Alice',{}));
 a.world.amuletShield={hp:42.2,left:5};assert.equal(r.snapshot(a).self.shieldHp,43);
});
