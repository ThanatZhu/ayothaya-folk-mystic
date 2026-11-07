import test from 'node:test';
import assert from 'node:assert/strict';
import {CombatWorld} from '../combat-core.js';
import {deriveStats,raiseStat} from '../character-stats.js';
import {BOSS_SETS,bossId,SET_SLOTS,weaponId,pieceId,withGrade,bossLines} from '../gear-sets.js';
import {SET_FX} from '../boss-set-effects.js';
import {PASSIVE_SLOTS,MASTER_PASSIVE_SLOTS} from '../role-skill-progress.js';

const nav={zones:[{x:-30,z:-30,w:60,d:60}],obstacles:[],props:[]};
function world(classId,count){
 const w=new CombatWorld({classId,jobId:'',roleSkills:true,nav,spawn:{x:0,z:0},mobs:[[2,0,0],[3,1,0],[3,-1,0]]});
 w.skillLevels.fill(5);for(const i of [...PASSIVE_SLOTS,...MASTER_PASSIVE_SLOTS])w.skillLevels[i]=0;
 w.applyDerived({...deriveStats({classId,level:80}),sets:count?[{boss:classId,count}]:[]});
 w.player.hp=w.player.maxHp=5000;w.player.mp=w.player.maxMp=10000;w.mobs.forEach(m=>m.hp=m.maxHp=100000);w.targetId=0;return w;
}
const fx=w=>w.roleCombat.setFx;
const procs=(w,key)=>w.events.filter(e=>e.type==='setProc'&&e.key===key).length;

test('a full rainbow set beats a red tier 6 set on attack',()=>{
 let stats=null;for(const [k,to] of [['str',99],['agi',70],['vit',50],['dex',50],['luk',40]])while((stats?.[k]??1)<to){try{stats=raiseStat(stats,k,99);}catch{break;}}
 for(const [cls,look,family] of [['rogue','rogue','exec'],['swordsman','swordsman','wall'],['boxer','boxer','wind']]){
  const rainbow={weapon:bossId('weapon',cls),...Object.fromEntries(SET_SLOTS.map(s=>[s,bossId(s,look)]))};
  const red={weapon:withGrade(weaponId(cls,6),4),...Object.fromEntries(SET_SLOTS.map(s=>[s,withGrade(pieceId(family,s,look,6),4)]))};
  assert.ok(deriveStats({classId:cls,level:99,stats,gear:rainbow}).atk>deriveStats({classId:cls,level:99,stats,gear:red}).atk,cls);
 }
});
test('the bag lists 2- to 5-piece lines with no "coming soon" left',()=>{
 for(const cls of Object.keys(BOSS_SETS)){const lines=bossLines(cls,5);assert.ok(lines.length>=3,cls);for(const [text,on] of lines){assert.equal(on,true);assert.doesNotMatch(text,/เร็วๆ นี้/);}}
});
test('no set, no effect',()=>{
 const w=world('rogue',0),m=w.mobs[0];m.hp=10;assert.equal(fx(w).outgoing(m,100),100);
});
test('rogue: 5 pieces finish weak targets, 3 pieces run after a crit',()=>{
 const w=world('rogue',5),m=w.mobs[0];
 assert.equal(fx(w).outgoing(m,100),100);
 m.hp=m.maxHp*.2;assert.equal(Math.round(fx(w).outgoing(m,100)),140);assert.equal(procs(w,'rogue5'),1);
 const before=w.walkSpeed();fx(w).landed(m,true);assert.ok(w.walkSpeed()>before*1.15);
 assert.equal(world('rogue',2).roleCombat.setFx.outgoing(Object.assign(m,{}),100),100);
});
test('lancer: 2 pieces reach further, 3 pieces hit far targets harder, 5 pieces send a wave every fifth basic hit',()=>{
 const base=world('lancer',0).profession.range,w=world('lancer',5);
 assert.equal(w.profession.range,base+SET_FX.lancerRange);
 const far=w.mobs[0];far.x=6;assert.equal(Math.round(fx(w).outgoing(far,100)),115);far.x=2;assert.equal(fx(w).outgoing(far,100),100);
 const hp=w.mobs[1].hp;for(let i=0;i<5;i++)fx(w).basicHit(w.mobs[0],10,()=>{});
 assert.equal(procs(w,'lancer5'),1);assert.ok(w.mobs.some(m=>m.hp<m.maxHp)||w.mobs[1].hp<hp);
});
test('hunter: the sixth shot on the same target is a sure crit',()=>{
 const w=world('hunter',5),m=w.mobs[0];
 for(let i=0;i<5;i++){assert.equal(fx(w).forceCrit(m),false);fx(w).basicHit(m,10,()=>{});}
 assert.equal(fx(w).forceCrit(m),true);assert.equal(fx(w).forceCrit(m),false);
 const extra=world('hunter',3);let shots=0;const s=extra.roleCombat.setFx;for(let i=0;i<400;i++)s.basicHit(m,10,()=>shots++);
 assert.ok(shots>30&&shots<100,String(shots));
});
test('boxer: stacks raise damage, ten stacks make the next skill free',()=>{
 const w=world('boxer',5),m=w.mobs[0];
 for(let i=0;i<10;i++)fx(w).landed(m,false);
 assert.equal(Math.round(fx(w).outgoing(m,100)),130);assert.equal(procs(w,'boxer5'),1);
 w.cooldowns[1]=9;fx(w).cast(1,w.skills[1],m,77);assert.equal(w.cooldowns[1],0);assert.equal(fx(w).state.stacks,0);
 w.time+=SET_FX.boxerWindow+1;assert.equal(fx(w).outgoing(m,100),100);
});
test('swordsman: a shield below 30% HP once a minute, and ten hits taken double the next skill',()=>{
 const w=world('swordsman',5),m=w.mobs[0];w.player.hp=1600;
 fx(w).incoming(200);assert.ok(w.roleCombat.state.shield>=w.player.maxHp*SET_FX.swordShield-1);assert.equal(procs(w,'sword3'),1);
 w.roleCombat.state.shield=0;fx(w).incoming(200);assert.equal(w.roleCombat.state.shield,0,'only once a minute');
 for(let i=0;i<10;i++)fx(w).incoming(1);
 fx(w).cast(0,w.skills[0],m,55);w.damageContext={castId:55};assert.equal(fx(w).outgoing(m,100),200);w.damageContext={castId:56};assert.equal(fx(w).outgoing(m,100),100);
});
test('shaman: circle skills leave burning ground, every fourth skill frees a spirit strike',()=>{
 const w=world('shaman',5),m=w.mobs[0],ground=w.skills.find(s=>['zone','mine','meteor'].includes(s?.type));
 fx(w).cast(3,ground,{x:2,z:0},1);assert.ok(w.roleCombat.state.fields.some(f=>f.kind==='burn'));
 const hp=m.hp;for(let i=0;i<3;i++)fx(w).cast(0,w.skills[0],m,i+2);assert.ok(m.hp<hp);assert.equal(procs(w,'shaman5'),1);
});
test('acolyte: stronger heals, overheal becomes a shield, and the aura protects nearby friends',()=>{
 const w=world('acolyte',5);assert.equal(fx(w).healMultiplier(),1+SET_FX.acolyteHeal);
 fx(w).overheal({world:w,player:w.player},10000);assert.equal(Math.round(w.roleCombat.state.shield),Math.round(w.player.maxHp*SET_FX.acolyteOverheal));
 const friend=world('swordsman',0);w.roleOwnerId='healer';friend.roleOwnerId='friend';
 const party=()=>[{id:'healer',world:w,player:w.player},{id:'friend',world:friend,player:friend.player}];w.roleAllies=friend.roleAllies=party;
 assert.equal(Math.round(friend.roleCombat.setFx.incoming(100)),90);
 friend.player.x=20;assert.equal(friend.roleCombat.setFx.incoming(100),100);
});
test('through the real engine: basic hits, skill casts and heals reach the set effects',()=>{
 const w=world('rogue',5);w.derived.crit=0;w.derived.hit=null;const m=w.mobs[0];
 const hit=()=>{const before=m.hp;w.basicHit(m,1);return before-m.hp;};
 const normal=hit();m.hp=m.maxHp*.2;const finish=hit();assert.ok(finish>normal*1.3,normal+' '+finish);
 const boxer=world('boxer',5),b=boxer.roleCombat.setFx;boxer.derived.hit=null;for(let i=0;i<10;i++)boxer.basicHit(boxer.mobs[0],i);assert.equal(b.state.stacks,10);
 const slot=boxer.skills.findIndex(s=>s&&!s.passive&&!s.reserved&&!['evade'].includes(s.type));boxer.cooldowns.fill(0);
 assert.equal(boxer.roleCombat.cast(slot),true);assert.equal(boxer.cooldowns[slot],0,'the free skill keeps no cooldown');
 const healer=world('acolyte',5),slotHeal=healer.skills.findIndex(s=>s?.type==='heal');healer.player.hp=healer.player.maxHp;healer.supportTargetId=null;
 healer.cooldowns.fill(0);healer.roleCombat.cast(slotHeal);for(let t=0;t<3;t+=.05)healer.update(.05,{x:0,z:0,attack:false},{monsters:false});
 assert.ok(healer.roleCombat.state.shield>0,'a full-HP heal became a shield');
});
