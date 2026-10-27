// Realm side of the ทุ่งนิมิต prologue (rules in ../prologue.js). Every step is decided here: kills, the teacher's lent
// class, the terrace, the guardian and the way home. Cutscenes only report "seen"; skipping one never skips a step.
import {MONSTER_TYPES} from '../combat-core.js';
import {PROLOGUE_MAP,PROLOGUE_KILLS,TEACHER,TERRACE,BOSS_SPOT,TRIAL_CLASSES,SCENE_IDS,PROLOGUE_BOSS,prologueDue,inTrial,onTerrace} from '../prologue.js?v=1';
const BOSS_TYPE=MONSTER_TYPES.findIndex(t=>t.id===PROLOGUE_BOSS.id);
const ACTIVE_LEVEL=5;   // every active skill of the lent class (ultimate included) at its top rank

// the state a joining record is in, or null (prologue off, finished long ago, or an existing character)
export function prologueJoin(realm,record){
 if(!realm.prologue||!realm.catalog.maps.some(m=>m.id===PROLOGUE_MAP))return null;
 return prologueDue(record);
}
export const prologueMap=realm=>realm.catalog.maps.find(m=>m.id===PROLOGUE_MAP);
function lend(p){
 const w=p.world;w.setProfession(p.prologue.classId,'');
 w.skillLevels=w.skills.map((s,i)=>i<6&&!s.reserved&&!s.master&&!s.passive?ACTIVE_LEVEL:0);
 w.player.mp=w.player.maxMp;p.trial=p.prologue.classId;
}
function giveBack(p){
 const w=p.world;w.setProfession(p.character.classId,p.character.jobId??'');
 w.skillLevels=[...(p.skills[p.character.classId]??w.skillLevels)];w.targetId=null;w.auto=false;p.trial=null;
}
function spawnBoss(room){
 if(room.mobs.some(m=>m.prologueBoss&&m.hp>0))return;
 const hp=MONSTER_TYPES[BOSS_TYPE].hp;
 room.mobs.push({id:room.mobs.length,type:BOSS_TYPE,pack:null,leader:false,x:BOSS_SPOT.x,z:BOSS_SPOT.z,home:{...BOSS_SPOT},hp,maxHp:hp,attackCD:1.5,root:0,dead:0,hit:0,aggro:true,step:0,prologueBoss:true});
}
function advance(p,stage,notice){p.prologue={...p.prologue,stage};p.saveNow=true;if(notice)p.world.notice(notice);}

// after the peer exists: lend the kit back after a reconnect, put the guardian back if the fight was on
export function prologueStart(realm,p){
 if(!p.prologue||p.room.map.id!==PROLOGUE_MAP)return;
 const w=p.world;Object.assign(w.player,p.room.map.spawn);
 if(inTrial(p.prologue)){lend(p);const npc=p.room.map.npcs.find(n=>n.name===TEACHER);Object.assign(w.player,p.prologue.stage==='trial'&&npc?{x:npc.x+2,z:npc.z+1}:{x:TERRACE.x,z:TERRACE.z+TERRACE.r+3});}
 if(p.prologue.stage==='boss')spawnBoss(p.room);
 if(p.prologue.stage==='fading'&&p.world.profession.id!==p.character.classId)giveBack(p);
}
export function prologueKill(realm,p,mob){
 if(!p.prologue||p.room.map.id!==PROLOGUE_MAP)return;
 if(mob.prologueBoss&&p.prologue.stage==='boss'){giveBack(p);advance(p,'fading','✨ อสูรฟางนิมิตสลายไปแล้ว');return;}
 if(p.prologue.stage!=='wake'||mob.prologueBoss)return;
 const kills=Math.min(PROLOGUE_KILLS,p.prologue.kills+1);p.prologue={...p.prologue,kills};p.saveNow=true;
 if(kills>=PROLOGUE_KILLS)advance(p,'teacher','🌿 วิญญาณครูกำลังรอเจ้าอยู่ที่ต้นไทร');
 else p.world.notice(`ฝึกในทุ่งนิมิต ${kills}/${PROLOGUE_KILLS}`);
}
export function prologueTick(realm,p){
 if(p.prologue?.stage==='trial'&&p.room.map.id===PROLOGUE_MAP&&p.world.player.hp>0&&onTerrace(p.world.player))advance(p,'arena');
}
// m: {type:'prologue', action:'seen'|'class'|'boss'|'finish', id?, classId?}
export function prologueCommand(realm,p,m){
 const s=p.prologue;if(!s)return realm.error(p,'prologue-none');
 if(m.action==='seen'){if(!SCENE_IDS.includes(m.id)||s.seen.includes(m.id))return;p.prologue={...s,seen:[...s.seen,m.id]};p.saveNow=true;return;}
 if(p.room.map.id!==PROLOGUE_MAP)return realm.error(p,'prologue-map');
 if(m.action==='class'){
  const npc=p.room.map.npcs.find(n=>n.name===TEACHER);
  if(s.stage!=='teacher'||!TRIAL_CLASSES.includes(m.classId)||!npc||Math.hypot(npc.x-p.world.player.x,npc.z-p.world.player.z)>3.6)return realm.error(p,'prologue-class');
  p.prologue={...s,classId:m.classId,stage:'trial'};p.saveNow=true;lend(p);p.world.notice('⚔️ พลังที่ยืมมาไหลเข้าสู่กาย · ไปที่ลานศิลาโบราณทางเหนือ');return;
 }
 if(m.action==='boss'){if(s.stage!=='arena')return;advance(p,'boss');spawnBoss(p.room);return;}
 if(m.action==='finish'){if(s.stage!=='fading')return realm.error(p,'prologue-finish');advance(p,'done');return;}
 return realm.error(p,'prologue-action');
}
// the way home: only the capital, only once the vision is over
export const prologueExit=(realm,p,id)=>p.room.map.id===PROLOGUE_MAP&&p.prologue?.stage==='done'&&id===realm.catalog.capital;
export const prologueView=p=>p.prologue?{stage:p.prologue.stage,kills:p.prologue.kills,need:PROLOGUE_KILLS,classId:p.prologue.classId,seen:[...p.prologue.seen]}:null;
// saved form: never the dream map itself (a reconnect is routed back in by the state), never the lent cooldowns
export function prologueRecord(realm,p,saved){
 if(!p.prologue)return saved;
 const out={...saved,prologue:{...p.prologue,seen:[...p.prologue.seen]}};
 if(p.room.map.id===PROLOGUE_MAP){const capital=realm.catalog.maps.find(m=>m.id===realm.catalog.capital);out.state={...out.state,mapId:capital.id,position:{...capital.spawn}};if(out.roleCooldowns)out.roleCooldowns={...out.roleCooldowns,values:out.roleCooldowns.values.map(()=>0)};}
 return out;
}
