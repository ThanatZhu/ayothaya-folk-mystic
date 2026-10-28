import test from 'node:test';
import assert from 'node:assert/strict';
import {CombatWorld,MONSTER_TYPES,bodyRadius} from '../combat-core.js';
import {RealmServer} from '../server/realm.js';
import {initialSave} from '../realm-state.js';
const classes=['swordsman','lancer','hunter','boxer','rogue','shaman','acolyte'];
const bosses=MONSTER_TYPES.map((m,type)=>({...m,type})).filter(m=>m.boss);
const nav={zones:[{x:-40,z:-40,w:80,d:80}],obstacles:[],props:[]};
const type=MONSTER_TYPES.findIndex(m=>m.id==='straw-king');
function setup(id='boxer',boss=type){
 const w=new CombatWorld({classId:id,roleSkills:true,spawn:{x:0,z:0},mobs:[[12,0,boss]],nav});
 w.skillLevels=w.skills.map(s=>s.reserved||s.passive?0:1);w.player.mp=w.player.maxMp=1e6;w.player.hp=w.player.maxHp=1e8;
 w.autoConfig={skills:[0],hp:0,mp:0};w.mobs[0].hp=w.mobs[0].maxHp=1e9;return w;
}
function tick(w,seconds=15){const events=[];for(let i=0;i<seconds/.05;i++){w.update(.05,{x:0,z:0},{monsters:false});events.push(...w.events.splice(0));}return events;}
for(const id of classes)test(`${id}: AUTO uses the selected learned skill on every boss from quest and target filters`,()=>{
 for(const boss of bosses)for(const kind of ['quest','entity']){
  const w=setup(id,boss.type);w.setAuto(true,kind==='quest'?boss.type:null,kind==='entity'?{kind:'entity',id:0}:null);
  const events=tick(w),label=`${boss.id}/${kind}`;
  assert.ok(events.some(e=>e.type==='cast'&&e.skillIndex===0),label+' casts selected skill');
  assert.ok(events.some(e=>e.type==='damage'&&e.source==='skill'),label+' resolves skill damage');
  assert.ok(!events.some(e=>e.type==='cast'&&Number.isInteger(e.skillIndex)&&e.skillIndex!==0),label+' respects selected skills');
 }
});
test('boss body edge counts for manual casts, while out-of-range, walls and ground points remain invalid',()=>{
 const w=setup(),m=w.mobs[0],range=w.skills[0].range,r=bodyRadius(m),mp=w.player.mp;w.select(m.id);m.x=range+r+.61;
 assert.equal(w.skill(0),false);assert.equal(w.player.mp,mp);assert.equal(w.cooldowns[0],0);
 m.x=range+r-.05;assert.equal(w.skill(0),true);assert.ok(tick(w,1).some(e=>e.type==='damage'&&e.source==='skill'));
 const blocked=setup();blocked.mobs[0].x=2;blocked.select(0);blocked.nav={...nav,obstacles:[{x:.7,z:-2,w:.5,d:4}]};assert.equal(blocked.skill(0),false);
 const ground=setup('hunter');ground.select(0);ground.roleGround={x:8.61,z:0,hp:1};const before=ground.player.mp;assert.equal(ground.skill(3),false);assert.equal(ground.player.mp,before);
});
test('line, cone and circular damage intersect boss bodies at their outer range',()=>{
 for(const [id,skillId] of [['lancer','lance-pierce'],['hunter','rang-fan'],['swordsman','sword-cleave']]){
  const w=setup(id),m=w.mobs[0];
  if(skillId==='rang-fan'){const upgraded=new CombatWorld({classId:id,jobId:'ranger',roleSkills:true,spawn:{x:0,z:0},mobs:[[1,0,type]],nav});w.skills=upgraded.skills;w.skillLevels=w.skills.map(s=>s.reserved||s.passive?0:1);}
  const i=w.skills.findIndex(s=>s.roleSkillId===skillId);assert.ok(i>=0,skillId);const s=w.skills[i];m.x=(skillId==='sword-cleave'?s.radius:s.range)+bodyRadius(m)-.05;w.select(0);
  const outside={...m,id:1,x:m.x+.15};w.mobs.push(outside);
  assert.equal(w.skill(i),true,skillId+' starts');const events=tick(w,2);assert.ok(events.some(e=>e.type==='damage'&&e.source==='skill'&&e.id===m.id),skillId+' hits body crossing range');assert.equal(outside.hp,outside.maxHp,skillId+' misses body outside range');
 }
});
test('body-edge range never extends a friendly heal',()=>{
 const w=setup('acolyte'),ally=setup('swordsman');ally.player.x=w.skills[0].range+bodyRadius(w.mobs[0]);ally.player.hp=1;
 const i=w.skills.findIndex(s=>s.type==='heal');assert.ok(i>=0);ally.player.x=w.skills[i].range+.61;
 w.roleAllies=()=>[{id:'friend',player:ally.player,world:ally}];w.supportTargetId='friend';const mp=w.player.mp;
 assert.equal(w.skill(i),false);assert.equal(w.player.mp,mp);assert.equal(ally.player.hp,1);
});
for(const filter of ['quest','entity'])test(`authoritative server uses skills after ${filter} AUTO command, including repeated cooldown cycles`,()=>{
 const map={id:'f',name:'Field',safe:false,nav,spawn:{x:0,z:0},mobs:[[12,0,type]]};let t=1e4;const events=[];
 const realm=new RealmServer({catalog:{capital:'f',maps:[map]},now:()=>t,roleSkills:true});const state=initialSave();state.mapId='f';
 const p=realm.join({uid:'u',serverId:'server-1',slotId:'slot-1',record:{character:{name:'BossTest',gender:'male',classId:'boxer'},state,bag:{coins:0,items:{}}},send:m=>events.push(...m.events??[])});
 const w=p.world;w.skillLevels=w.skills.map(s=>s.reserved||s.passive?0:1);w.player.mp=w.player.maxMp=1e6;w.player.hp=w.player.maxHp=1e8;
 const boss=p.room.mobs[0];boss.hp=boss.maxHp=1e9;
 assert.equal(realm.receive(p.id,{type:'autoConfig',seq:1,skills:[0],hp:0,mp:0}),true);assert.equal(realm.receive(p.id,{type:'auto',seq:2,on:true,...(filter==='quest'?{hunt:type}:{target:{kind:'entity',id:boss.id}})}),true);assert.equal(w.auto,true);
 // Keep the boss stationary to preserve the large-body gap that moving bosses can hide.
 const saved=MONSTER_TYPES[type].speed;MONSTER_TYPES[type].speed=0;
 try{for(let i=0;i<500;i++){t+=50;boss.hp=boss.maxHp=1e9;realm.step(.05);}}finally{MONSTER_TYPES[type].speed=saved;}
 assert.ok(events.filter(e=>e.type==='cast'&&e.skillIndex===0).length>=3,'uses skill again as cooldown expires');
 assert.ok(events.some(e=>e.type==='damage'&&e.source==='skill'),'authoritative skill deals damage');
});
test('empty skill selection, zero skill level and insufficient mana still fall back to basic attacks',()=>{
 for(const mode of ['empty','unlearned','mana']){const w=setup();if(mode==='empty')w.autoConfig.skills=[];if(mode==='unlearned')w.skillLevels[0]=0;if(mode==='mana'){w.player.mp=0;w.derived={mpRegen:0};}w.setAuto(true,type);const events=tick(w,5);assert.ok(events.some(e=>e.type==='cast'&&e.skillIndex===null));assert.ok(!events.some(e=>e.type==='cast'&&Number.isInteger(e.skillIndex)),mode);}
});
