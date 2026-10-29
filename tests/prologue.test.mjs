import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {RealmServer} from '../server/realm.js';
import {initialSave} from '../realm-state.js';
import {MONSTER_TYPES} from '../combat-core.js';
import {PROLOGUE_MAP,PROLOGUE_KILLS,TERRACE,TRIAL_CLASSES,PROLOGUE_BOSS,dueScene,prologueDue,normalizePrologue} from '../prologue.js';
import {trialKit,TRIAL_LEVEL} from '../server/prologue-realm.js';
import {itemDef} from '../items.js';
import {deriveStats} from '../character-stats.js';

const catalog=JSON.parse(fs.readFileSync(new URL('../maps/world.json',import.meta.url)));
const realmOf=()=>new RealmServer({catalog,roleSkills:true,prologue:true,now:()=>Date.UTC(2026,9,28,6)});
const fresh=(extra={})=>({character:{name:'Dreamer',gender:'female',classId:'novice'},state:initialSave(),daily:{day:'2099-01-01',streak:1},...extra});
const join=(realm,record,uid='u-dream')=>{const box=[];const p=realm.join({uid,serverId:'server-1',slotId:'slot-1',channel:1,record,send:m=>box.push(m)});return {p,box};};
let seq=0;const send=(realm,p,m)=>realm.receive(p.id,{...m,seq:++seq});
const say=(realm,p,m)=>send(realm,p,{type:'prologue',...m});
const killTraining=(realm,p,n)=>{for(let i=0;i<n;i++){const mob=p.room.mobs.find(m=>m.hp>0&&!m.prologueBoss);Object.assign(p.world.player,{x:mob.x+.5,z:mob.z});realm.hurt(p,mob,1e6);}};
const teacher=()=>catalog.maps.find(m=>m.id===PROLOGUE_MAP).npcs.find(n=>n.name==='วิญญาณครู');

test('only a brand-new Novice is due the prologue; finished or existing characters never are',()=>{
 assert.equal(prologueDue(fresh()).stage,'wake');
 const played=fresh();played.state.traveler={...played.state.traveler,baseXp:40};assert.equal(prologueDue(played),null);
 assert.equal(prologueDue(fresh({character:{name:'A',gender:'male',classId:'swordsman',jobId:''}})),null);
 assert.equal(prologueDue(fresh({story:{v:3,quest:1,step:0,count:0,done:[]}})),null);
 assert.equal(prologueDue(fresh({prologue:{stage:'done',seen:['dream']}})).stage,'done');
 // a lent class without its class id falls back to the teacher step
 assert.equal(normalizePrologue({stage:'boss',classId:'wizard'}).stage,'teacher');
 const realm=new RealmServer({catalog,roleSkills:true,now:()=>1e12});const {p}=join(realm,fresh());assert.equal(p.room.map.id,'ayutthaya','off unless the realm turns it on');
});

test('the whole vision: training, the lent class, the guardian, and home as a Novice with nothing leaked into the save',()=>{
 const realm=realmOf();let {p,box}=join(realm,fresh());
 assert.equal(p.room.map.id,PROLOGUE_MAP);assert.match(p.room.id,/:solo-u-dream$/);
 assert.equal(box[0].snapshot.self.prologue.stage,'wake');assert.equal(dueScene(p.prologue,PROLOGUE_MAP),'dream');
 const other=join(realm,fresh(),'u-other').p;assert.notEqual(other.room,p.room,'every dreamer has a room of their own');
 // cutscenes only report seen, once
 say(realm,p,{action:'seen',id:'dream'});say(realm,p,{action:'seen',id:'dream'});assert.deepEqual(p.prologue.seen,['dream']);
 // talking to the teacher too early does nothing
 Object.assign(p.world.player,{x:teacher().x+1,z:teacher().z});say(realm,p,{action:'class',classId:'swordsman'});assert.equal(p.prologue.stage,'wake');
 killTraining(realm,p,PROLOGUE_KILLS-1);assert.equal(p.prologue.stage,'wake');killTraining(realm,p,1);assert.equal(p.prologue.stage,'teacher');
 // the class is chosen at the teacher, not from across the meadow
 Object.assign(p.world.player,{x:0,z:30});say(realm,p,{action:'class',classId:'swordsman'});assert.equal(p.prologue.stage,'teacher');
 Object.assign(p.world.player,{x:teacher().x+1,z:teacher().z});say(realm,p,{action:'class',classId:'wizard'});assert.equal(p.prologue.stage,'teacher');
 say(realm,p,{action:'class',classId:'hunter'});assert.equal(p.prologue.stage,'trial');
 assert.equal(p.world.profession.id,'hunter');assert.deepEqual(p.world.skillLevels.slice(0,6),[5,5,5,5,5,5]);assert.ok(p.world.skills[5].ultimate);
 // nothing of the lent kit reaches the save; the save never names the dream map
 const skillsBefore=JSON.stringify(p.skills);send(realm,p,{type:'upgradeSkill',index:0});assert.equal(JSON.stringify(p.skills),skillsBefore);
 let saved=realm.record(p,fresh());assert.equal(saved.character.classId,'novice');assert.equal(JSON.stringify(saved.skills),skillsBefore);
 assert.equal(saved.state.mapId,'ayutthaya');assert.equal(saved.prologue.classId,'hunter');assert.ok(saved.roleCooldowns.values.every(v=>v===0));
 // a reconnect puts the dreamer back in the vision with the same lent class
 realm.leave(p.id);({p,box}=join(realm,saved));assert.equal(p.room.map.id,PROLOGUE_MAP);assert.equal(p.world.profession.id,'hunter');assert.equal(p.prologue.stage,'trial');
 // finishing early is refused; the guardian waits until the terrace scene has played
 say(realm,p,{action:'finish'});say(realm,p,{action:'boss'});assert.equal(p.prologue.stage,'trial');assert.ok(!p.room.mobs.some(m=>m.prologueBoss));
 Object.assign(p.world.player,{x:TERRACE.x,z:TERRACE.z+TERRACE.r-1});for(let i=0;i<25;i++)realm.step(.05);assert.equal(p.prologue.stage,'arena');
 assert.equal(dueScene(p.prologue,PROLOGUE_MAP),'boss');say(realm,p,{action:'seen',id:'boss'});say(realm,p,{action:'boss'});say(realm,p,{action:'boss'});
 const bosses=p.room.mobs.filter(m=>m.prologueBoss);assert.equal(bosses.length,1);assert.equal(MONSTER_TYPES[bosses[0].type].id,'vision-straw-guardian');assert.equal(p.prologue.stage,'boss');
 // a reconnect mid-fight brings the guardian back
 saved=realm.record(p,saved);realm.leave(p.id);({p}=join(realm,saved));assert.equal(p.room.mobs.filter(m=>m.prologueBoss&&m.hp>0).length,1);
 // home is refused until the vision is over
 assert.throws(()=>realm.travelDestination(p,'ayutthaya'),/travel-invalid/);
 const boss=p.room.mobs.find(m=>m.prologueBoss);Object.assign(p.world.player,{x:boss.x+1,z:boss.z});realm.hurt(p,boss,1e6);
 assert.equal(p.prologue.stage,'fading');assert.equal(p.world.profession.id,'novice');assert.equal(p.trial,null);
 assert.equal(dueScene(p.prologue,PROLOGUE_MAP),'fading');say(realm,p,{action:'seen',id:'fading'});say(realm,p,{action:'finish'});assert.equal(p.prologue.stage,'done');
 assert.throws(()=>realm.travelDestination(p,'rice-fields'),/travel-invalid/);assert.equal(realm.travelDestination(p,'ayutthaya').id,'ayutthaya');
 // after travel the record says Ayutthaya; the next join is a normal Novice in the capital who still owes the waking scene
 saved=realm.record(p,saved);saved.state.mapId='ayutthaya';realm.leave(p.id);({p}=join(realm,saved));
 assert.equal(p.room.map.id,'ayutthaya');assert.equal(p.world.profession.id,'novice');assert.equal(dueScene(p.prologue,'ayutthaya'),'awake');
 say(realm,p,{action:'seen',id:'awake'});assert.equal(dueScene(p.prologue,'ayutthaya'),null);
 // and a done prologue never sends anyone back into the dream
 saved=realm.record(p,saved);saved.state.mapId=PROLOGUE_MAP;realm.leave(p.id);({p}=join(realm,saved));assert.equal(p.room.map.id,'ayutthaya');
});

test('the lent class can actually beat the guardian with its own skills',()=>{
 const realm=realmOf();const {p}=join(realm,fresh(),'u-fight');
 p.prologue={stage:'teacher',kills:PROLOGUE_KILLS,classId:null,seen:['dream','teacher']};
 for(const classId of ['swordsman','lancer','hunter','boxer','rogue','shaman','acolyte']){
  p.prologue={...p.prologue,stage:'teacher',classId:null};Object.assign(p.world.player,{x:teacher().x+1,z:teacher().z});
  say(realm,p,{action:'class',classId});p.prologue={...p.prologue,stage:'arena'};say(realm,p,{action:'boss'});
  const boss=p.room.mobs.find(m=>m.prologueBoss&&m.hp>0);Object.assign(p.world.player,{x:boss.x,z:boss.z+2.2,hp:p.world.player.maxHp});boss.x=boss.home.x;
  send(realm,p,{type:'auto',on:true});let t=0,low=1;for(;t<240&&boss.hp>0&&p.world.player.hp>0;t+=.05){realm.step(.05);low=Math.min(low,p.world.player.hp/p.world.player.maxHp);}
  console.log('fight',classId,Math.round(t)+' s','lowest HP',Math.round(low*100)+'%');assert.ok(p.world.player.hp>0,classId+' fell to the guardian');
  assert.ok(boss.hp<=0,classId+' did not win in 4 min (hp '+boss.hp+')');
  assert.ok(t>=20&&t<120,classId+' took '+Math.round(t)+' s');
 }
});
test('every lent class fights at its height (Lv.80, full boss set) and goes home with nothing of it kept (0.122)',()=>{
 for(const classId of TRIAL_CLASSES)for(const gender of ['male','female']){
  const kit=trialKit(classId,gender);assert.equal(kit.level,TRIAL_LEVEL);
  assert.deepEqual(Object.keys(kit.gear).sort(),['armor','garment','head','shoes','weapon']);
  for(const id of Object.values(kit.gear))assert.ok(itemDef(id),classId+' '+gender+' '+id);
  const d=deriveStats({classId,level:kit.level,stats:kit.stats,gear:kit.gear});assert.ok(Math.max(d.atk,d.matk)>=400,classId+' hits hard');assert.ok(d.maxHp>1400);
  const realm=realmOf(),record=fresh({character:{name:'Dreamer',gender,classId:'novice'}}),bagBefore=null;let {p}=join(realm,record,'u-'+classId+gender);
  const gearBefore=JSON.stringify(p.gear),statsBefore=JSON.stringify(p.stats);
  killTraining(realm,p,PROLOGUE_KILLS);Object.assign(p.world.player,{x:teacher().x+1,z:teacher().z});say(realm,p,{action:'class',classId});
  assert.equal(p.trial,classId);assert.equal(p.world.player.hp,p.world.player.maxHp);assert.equal(p.world.player.maxHp,d.maxHp,'the trial build is what the world fights with');
  assert.equal(p.derived.basicBonus,d.basicBonus);
  // the real character is untouched while lent, and in the save
  assert.equal(JSON.stringify(p.gear),gearBefore);assert.equal(JSON.stringify(p.stats),statsBefore);
  const saved=realm.record(p,record);assert.equal(JSON.stringify(saved.gear??{}),JSON.stringify(record.gear??p.gear));
  // the guardian holds out for a real fight, then the build goes with the borrowed class
  assert.ok(PROLOGUE_BOSS.hp>=Math.max(d.atk,d.matk)*30);
  Object.assign(p.world.player,{x:TERRACE.x,z:TERRACE.z+TERRACE.r-1});for(let i=0;i<25;i++)realm.step(.05);say(realm,p,{action:'seen',id:'boss'});say(realm,p,{action:'boss'});
  const boss=p.room.mobs.find(m=>m.prologueBoss);Object.assign(p.world.player,{x:boss.x+1,z:boss.z});realm.hurt(p,boss,1e6);
  assert.equal(p.trial,null);assert.ok(p.world.player.maxHp<400,'back to a Novice');assert.ok(p.world.player.hp<=p.world.player.maxHp);
 }
});
