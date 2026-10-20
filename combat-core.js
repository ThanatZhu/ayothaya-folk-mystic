import {patch,monsterKey} from './balance.js';
import {normalizeAuto,pickAutoSkill} from './auto-play.js';
import {activeEmote,canonicalAction,EMOTE_ACTIONS,movementSpeed} from './character-action-state.js?v=life1';
import {FRONTIER_MONSTERS,markMonsterHit,advanceMonster,MONSTER_BEHAVIOUR} from './monster-catalog.js?v=38';
import {affinityMultiplier,affinityOf,CLASS_SKILL_ELEMENT} from './affinity.js?v=02';
import {awardExperience,deathPenalty,baseProgress} from './experience.js?v=73';
import {AILMENTS,rollAilment,held} from './ailments.js?v=01';
import {advanceStats,advanceSkills} from './advancement.js?v=73';
import {getClass,classSkills} from './classes.js?v=101';
import {scaledSkill} from './skill-progress.js?v=101';
// Engine-independent movement, collision, targeting and combat rules.
export const SKILLS=[
 {key:'1',name:'ลูกไฟวิญญาณ',short:'ลูกไฟ',icon:'✦',cost:8,cd:2,range:6,damage:24,type:'bolt',color:'#70ead9'},
 {key:'2',name:'อัคคีอาคม',short:'อัคคี',icon:'♨',cost:15,cd:5,range:5,damage:32,type:'area',radius:2,color:'#ffb359'},
 {key:'3',name:'สายสิญจน์ผูกจิต',short:'ผูกจิต',icon:'⌘',cost:12,cd:6,range:6,damage:12,type:'root',color:'#f1e3a2'},
 {key:'4',name:'ผลักวิญญาณ',short:'ผลัก',icon:'»',cost:12,cd:5,range:4,damage:18,type:'push',color:'#a4dcef'},
 {key:'5',name:'สมานกาย',short:'ฟื้นกาย',icon:'+',cost:18,cd:9,type:'heal',color:'#a1e49c'},
 {key:'6',name:'เกราะอาคม',short:'เกราะ',icon:'◇',cost:15,cd:10,type:'shield',color:'#e6d294'},
 {key:'7',name:'ยันต์ปราบภูต',short:'ยันต์',icon:'๙',cost:20,cd:8,range:6,damage:48,type:'bolt',color:'#ecda9b'},
 {key:'8',name:'ก้าวพริบตา',short:'ก้าว',icon:'↗',cost:6,cd:4,type:'dash',color:'#a6e5e4'},
 {key:'9',name:'รวมจิต',short:'รวมจิต',icon:'◎',cost:0,cd:18,type:'mana',color:'#85bcec'},
 {key:'0',name:'วงอาคมพิทักษ์',short:'วงอาคม',icon:'✺',cost:35,cd:15,damage:62,type:'nova',radius:4,color:'#d8adf4'}
];
export const MONSTER_TYPES=[
 {name:'หมูป่าหลงทาง',hp:78,speed:1.1,damage:7,baseXp:10,jobXp:6},
 {name:'ภูตมอส',hp:60,speed:.9,damage:6,baseXp:12,jobXp:8},
 {name:'คางคกใบบัว',hp:65,speed:1,damage:6,baseXp:14,jobXp:7},
 {name:'ไหผีจอมซน',hp:90,speed:.8,damage:8,baseXp:18,jobXp:12}
];
MONSTER_TYPES.push(...FRONTIER_MONSTERS);
MONSTER_TYPES.forEach((m,i)=>patch('monsters',monsterKey(m,i),m)); // 0.85 admin balance overrides
// 0.52 pacing: AUTO looks for monsters within 14 of where it was switched on (was 8); towns are walked 30% faster.
export const AUTO_RANGE=14,AUTO_SEEK=30,TOWN_PACE=1.3;
export const OBSTACLES=[
 {x:-7.2,z:-11.5,w:6.4,d:7.3}, // north house, veranda and staircase
 {x:7.2,z:-8.2,w:5.8,d:7.4}, // east house and steps
 {x:-11,z:-4.2,w:3.8,d:3.4}, // shrine
 {x:9.7,z:1.65,w:3.5,d:2.6}, // shop
 {x:-12.1,z:-8.4,w:2.8,d:2.8}, // sacred tree roots
 {x:-13.4,z:-12.3,w:2,d:2},
];
const props=[[-3,2.5,.26],[2.5,3.7,.26],[-7.1,-3.1,.28],[7,-5.6,.28],
 [-4.3,-1.8,.36],[4.7,-2.2,.36],[9,2.5,.4], // NPCs
 [-6.4,-6.3,.55],[-1.6,-6.3,.5],[7.6,-3.4,.6],[-11.2,-.8,.55],[-7.4,-2.2,.45]];
export const DEFAULT_NAV={zones:[{x:-13.1,z:-11.6,w:26.2,d:15.9},{x:-1.7,z:3.7,w:2.4,d:3.65}],obstacles:OBSTACLES,props};
// 0.62: Blender v2 scenes bake a walk grid (scripts/bake-nav-v2.py): '.' blocked, 'a'+k = floor k*5 cm high.
// 0.101 bilinear between the four nearest open cells (blocked ones drop out), so stairs and ramps rise smoothly.
export function groundHeight(nav,x,z){
 const g=nav?.grid;if(!g)return 0;const u=(x-g.x0)/g.cell,v=(z-g.z0)/g.cell,i=Math.floor(u),j=Math.floor(v),fu=u-i,fv=v-j;let sum=0,weight=0;
 for(const [di,dj,w] of [[0,0,(1-fu)*(1-fv)],[1,0,fu*(1-fv)],[0,1,(1-fu)*fv],[1,1,fu*fv]]){const c=g.rows[j+dj]?.[i+di]??'.';if(c!=='.'&&w>0){sum+=w*(c.charCodeAt(0)-97)*.05;weight+=w;}}
 return weight?sum/weight:0;
}
export function walkable(x,z,r=.28,nav=DEFAULT_NAV){
 const g=nav.grid;if(g){ // every cell the body's bounding square touches must be open
  const i0=Math.round((x-r-g.x0)/g.cell),i1=Math.round((x+r-g.x0)/g.cell),j0=Math.round((z-r-g.z0)/g.cell),j1=Math.round((z+r-g.z0)/g.cell);
  for(let j=j0;j<=j1;j++){const row=g.rows[j];if(!row)return false;for(let i=i0;i<=i1;i++)if((row[i]??'.')==='.')return false;}
 }
 if(!nav.zones.some(b=>x>=b.x+r&&x<=b.x+b.w-r&&z>=b.z+r&&z<=b.z+b.d-r))return false;
 for(const b of nav.obstacles){if(x>b.x-r&&x<b.x+b.w+r&&z>b.z-r&&z<b.z+b.d+r)return false;}
 return !nav.props.some(([px,pz,pr])=>Math.hypot(x-px,z-pz)<r+pr);
}
export function moveBody(body,dx,dz,nav=DEFAULT_NAV){
 const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.12)),sx=dx/steps,sz=dz/steps;
 for(let i=0;i<steps;i++){
  if(walkable(body.x+sx,body.z+sz,.28,nav)){body.x+=sx;body.z+=sz;}
  else if(walkable(body.x+sx,body.z,.28,nav)){body.x+=sx;}
  else if(walkable(body.x,body.z+sz,.28,nav)){body.z+=sz;}
 }
}
export function screenDirection(horizontal,vertical,azimuth){
 const len=Math.hypot(horizontal,vertical),scale=len>1?1/len:1;
 return {x:(Math.cos(azimuth)*horizontal-Math.sin(azimuth)*vertical)*scale,z:(-Math.sin(azimuth)*horizontal-Math.cos(azimuth)*vertical)*scale};
}
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
// 0.43: a monster hit after guard, AGI/LUK dodge and DEF (world.derived from character-stats.js). 0 = dodged.
export function monsterHit(world,raw,rand=Math.random,monsterId=null){
 const p=world.player,d=world.derived;if(d&&rand()<d.flee*(world.status?.blind?.5:1))return 0;
 const base=p.shield>0?Math.ceil(raw*.35):raw,resist=d&&monsterId?1-Math.min(.8,d.resist?.[affinityOf(monsterId).element]??0):1;
 return d?Math.max(1,Math.round(base*resist*100/(100+d.def*4))):base;
}
// Grid A* routes auto-chase around houses. Manual movement always overrides it.
export function findPath(start,goal,nav=DEFAULT_NAV){
 const cell=distance(start,goal)>30?1:.5,key=(x,z)=>`${x},${z}`,startX=Math.round(start.x/cell),startZ=Math.round(start.z/cell);
 const open=[{x:startX,z:startZ,g:0,f:0,parent:null}],best=new Map([[key(startX,startZ),0]]);let end=null;
 for(let iterations=0;open.length&&iterations<6000;iterations++){
  open.sort((a,b)=>b.f-a.f);const cur=open.pop();
  if(best.get(key(cur.x,cur.z))<cur.g)continue;
  if(Math.hypot(cur.x*cell-goal.x,cur.z*cell-goal.z)<.7){end=cur;break;}
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
   const x=cur.x+dx,z=cur.z+dz;
   if(!walkable(x*cell,z*cell,.32,nav))continue;
   if(cell===1&&!lineClear({x:cur.x*cell,z:cur.z*cell},{x:x*cell,z:z*cell},nav))continue;
   if(dx&&dz&&(!walkable((cur.x+dx)*cell,cur.z*cell,.32,nav)||!walkable(cur.x*cell,(cur.z+dz)*cell,.32,nav)))continue;
   const g=cur.g+Math.hypot(dx,dz),k=key(x,z);if(g>=(best.get(k)??Infinity))continue;
   best.set(k,g);open.push({x,z,g,f:g+Math.hypot(x-goal.x/cell,z-goal.z/cell),parent:cur});
  }
 }
 const path=[];while(end?.parent){path.push({x:end.x*cell,z:end.z*cell});end=end.parent;}return path.reverse();
}
export function lineClear(a,b,nav=DEFAULT_NAV){
 const n=Math.max(1,Math.ceil(distance(a,b)/.18));
 for(let i=1;i<n;i++){const f=i/n;if(!walkable(a.x+(b.x-a.x)*f,a.z+(b.z-a.z)*f,.05,nav))return false;}return true;
}
// 0.63 packs: on maps with packs:true each mobs entry is a camp of 4-5 of that monster around the point
// (bosses stay alone). Deterministic, so the realm server and every client build identical ids.
const PACK=[[0,0],[2.2,.7],[-1.8,1.6],[-.9,-2.2],[2,-1.6]];
// 0.64 camp leader (slot 0): 3x HP, 2x EXP, 3 loot rolls, 3x respawn time, drawn 35% larger. Members give 0.6x EXP.
export const LEADER={hp:3,xp:2,loot:3,respawn:3,scale:1.35,member:.6};
export const mobXp=m=>m.leader?LEADER.xp:m.pack!==undefined?LEADER.member:1;
export const mobRespawn=m=>(MONSTER_TYPES[m.type].respawn??12)*(m.leader?LEADER.respawn:1);
export function packSpawns(mobs,{packs=false,nav=DEFAULT_NAV}={}){
 if(!packs)return mobs;
 return mobs.flatMap(([x,z,type],i)=>{const T=MONSTER_TYPES[type];return T?.boss||T?.elite||T?.sheet==='elite-monsters'?[[x,z,type,i]]:PACK.slice(0,4+i%2).map(([dx,dz],k)=>{
  for(const f of [1,.6,.3])if(walkable(x+dx*f,z+dz*f,.4,nav))return [x+dx*f,z+dz*f,type,i,k===0];return [x,z,type,i,k===0];});});
}
// A struck monster calls up to two idle packmates within 6 m, so camps fight together.
export function rallyPack(mobs,mob){
 if(mob.pack===undefined)return;let n=0;
 for(const m of mobs)if(n<2&&m!==mob&&m.pack===mob.pack&&m.hp>0&&!m.aggro&&Math.hypot(m.x-mob.x,m.z-mob.z)<6){m.aggro=true;n++;}
}
export class CombatWorld{
 constructor(config={}){
  this.profession=advanceStats(getClass(config.classId??'shaman'),config.jobId);this.skills=advanceSkills(classSkills(this.profession.id,SKILLS).map((s,i)=>patch('skills',this.profession.id+':'+i,{...s})),this.profession.id,config.jobId);
  this.nav=config.nav??DEFAULT_NAV;this.spawn=config.spawn??{x:-1.8,z:1.2};this.safe=!!config.safe;
  this.player={...this.spawn,hp:140,maxHp:140,mp:100,maxMp:100,shield:0,attackCD:0,down:0,moving:false,running:false,face:{x:1,z:0}};this.emote=null;
  this.mobs=(this.safe?[]:packSpawns(config.mobs??[[2,.3,0],[5,1,1],[1,-3.6,2],[-3.7,-2.9,3],[5.3,-5.2,1],[-6.5,1.8,0]],config)).map(([x,z,type,pack,leader],id)=>({id,type,pack,leader:!!leader,x,z,home:{x,z},hp:MONSTER_TYPES[type].hp*(leader?LEADER.hp:1),maxHp:MONSTER_TYPES[type].hp*(leader?LEADER.hp:1),attackCD:0,root:0,dead:0,hit:0,aggro:false,step:0}));
  this.autoConfig=normalizeAuto(null);this.autoCast=0;this.autoIdle=0;this.foe=null;this.rivals=[];this.food=null;this.targetId=null;this.auto=false;this.anchor={x:0,z:0};this.cooldowns=this.skills.map(()=>0);this.skillLevels=this.skills.map(s=>s.master?0:1);this.events=[];this.path=[];this.pathTimer=0;this.manualGrace=0;this.kills=0;this.baseXp=0;this.jobXp=0;this.jobId=config.jobId??'';this.time=0;this.status={};this.poisonTick=0;this.merc=null;
 }
 // 0.61 hired mercenary: attacks your target (or, on AUTO, the nearest monster) within 6, every 1.4 s, 10 + 2·level damage.
 hire(seconds){this.merc={left:seconds,cd:0};}
 mercStep(dt){
  const c=this.merc,p=this.player;if(!c)return;c.left-=dt;c.cd=Math.max(0,c.cd-dt);
  if(c.left<=0){this.merc=null;this.notice('ทหารรับจ้างหมดสัญญาแล้ว');return;}
  if(c.cd>0||p.hp<=0||this.safe)return;
  const m=this.target??(this.auto?this.nearest(6):null);if(!m||distance(m,p)>6)return;
  c.cd=1.4;this.emit('merc',{x:m.x,z:m.z});this.hurt(m,10+2*baseProgress(this).level,'#cfe8ff');
 }
 // 0.93 duel: the opponent stands in as one more target (the server keeps its position and HP in step with the real player).
 // 0.95 guild war: rivals are enemy-guild players and the guardian stone, kept in step by the server the same way.
 foes(){return this.foe||this.rivals.length?[...this.mobs,...(this.foe?[this.foe]:[]),...this.rivals]:this.mobs;}
 get target(){return this.foes().find(m=>m.id===this.targetId&&m.hp>0)??null;}
 emit(type,extra={}){if(type==='cast'||type==='playerHit')this.clearEmote();this.events.push({type,...extra});}
 clearEmote(){this.emote=null;}
 setEmote(action){
  const name=canonicalAction(action);if(!EMOTE_ACTIONS.includes(name)||this.player.hp<=0)return false;
  if(name==='idle'){this.clearEmote();return true;}
  this.emote={name,time:this.time};this.auto=false;this.path=[];this.pathTimer=0;this.player.moving=false;this.player.running=false;return true;
 }
 // 0.48 ailments: blind and curse weaken every hit; stun/sleep stop acting; silence stops skills.
 // One movement rule for authority and prediction; sprint is an explicit modifier and never changes default pace.
 walkSpeed(run=false){return movementSpeed(this.profession.speed*(this.status?.curse?.6:1)*(this.safe?TOWN_PACE:1),run);}
 weakness(){return (this.status.blind?.7:1)*(this.status.curse?.75:1);}
 inflict(name){if(!name||!AILMENTS[name])return;const fresh=!this.status[name];this.status[name]=AILMENTS[name].time;if(fresh)this.notice(AILMENTS[name].name+'! · '+AILMENTS[name].text);}
 // One monster blow, shared by the offline world and the realm server: damage, ailment roll, or going down (+ death penalty).
 takeMonsterHit(type){
  const p=this.player,damage=monsterHit(this,type.damage,Math.random,type.id);if(!damage){this.emit('dodge',{x:p.x,z:p.z});return false;}
  p.hp=Math.max(0,p.hp-damage);this.calm=0;this.emit('playerHit',{x:p.x,z:p.z,amount:damage});delete this.status.sleep;
  if(p.hp>0){this.inflict(rollAilment(type.id));return true;}
  p.down=3;this.auto=false;this.targetId=null;this.path=[];p.moving=false;p.running=false;this.status={};
  const lost=deathPenalty(this);this.notice('หมดแรง · กลับลานใน 3 วินาที'+(lost?' · Base EXP -'+lost:''));return true;
 }
 // 0.58 combo: a skill on a rooted monster hits 30% harder.
 power(n,mob=null){const combo=mob?.root>0&&mob.hp>0;if(combo)this.emit('combo',{x:mob.x,z:mob.z});return Math.round(n*(this.derived?.skillPower??1)*(mob?this.affinity(mob,false):1)*(combo?1.3:1));}
 // 0.44 element + size (affinity.js). Basic attacks: weapon element, physical. Skills: class element; magic classes ignore size.
 affinity(mob,basic){if(mob.pvp)return this.weakness();const d=this.derived,cls=this.profession.id,magic=d?.magic??(cls==='shaman'||cls==='acolyte');
  const element=basic?(d?.weaponElement??'neutral'):(CLASS_SKILL_ELEMENT[cls]??d?.weaponElement??'neutral');
  const id=MONSTER_TYPES[mob.type]?.id,a=affinityOf(id),card=1+(d?.vsSize?.[a.size]??0)+(d?.vsElement?.[a.element]??0);
  return affinityMultiplier({element,physical:basic||!magic,classId:cls},id)*card*this.weakness();}
 // 0.43 status/gear: max HP/MP and the multipliers above. null keeps the pre-0.43 numbers.
 applyDerived(d){this.derived=d;if(!d)return;const p=this.player;p.maxHp=d.maxHp;p.maxMp=d.maxMp;p.hp=Math.min(p.hp,p.maxHp);p.mp=Math.min(p.mp,p.maxMp);}
 notice(text){this.emit('notice',{text});}
 select(id){const mob=this.foes().find(m=>m.id===id&&m.hp>0);if(!mob)return;this.targetId=id;this.path=[];this.pathTimer=0;this.emit('select',{id});}
 nearest(range=AUTO_RANGE){return this.foes().filter(m=>m.hp>0&&this.prey(m)&&distance(m,this.player)<=range&&(!this.auto||distance(m,this.anchor)<=AUTO_RANGE)).sort((a,b)=>distance(a,this.player)-distance(b,this.player))[0]??null;}
 // 0.91 explicit on/off (the button and quests send the state they want, so two quick taps can no longer cross).
 // 0.99.7 hunt = a monster type index: AUTO started by a quest only goes after that kind (cleared by any other switch).
 prey(m){return this.hunt==null||m.type===this.hunt;}
 setAuto(on,hunt=null){const ok=on===this.auto?true:this.toggleAuto();this.hunt=this.auto&&Number.isInteger(hunt)?hunt:null;return ok;}
 toggleAuto(){this.hunt=null;if(this.safe){this.notice('ทุกเมืองเป็นเขตปลอดภัย · ออกนอกเมืองเพื่อพบมอนสเตอร์');return false;}if(this.player.hp<=0){this.notice('รอกลับถึงลานก่อน');return false;}this.auto=!this.auto;this.anchor={x:this.player.x,z:this.player.z};this.path=[];this.pathTimer=0;this.notice(this.auto?'AUTO เปิด · เดินเองเพื่อหยุดไล่':'AUTO ปิด');return this.auto;}
 hurt(mob,damage,color='#fff0a6'){
  if(!mob||mob.hp<=0||mob.pvp)return;this.calm=0;mob.hp=Math.max(0,mob.hp-damage);markMonsterHit(mob,this.player);rallyPack(this.mobs,mob);
  this.emit('damage',{id:mob.id,x:mob.x,z:mob.z,amount:damage,color});
  if(mob.hp===0){mob.dead=mobRespawn(mob);mob.aggro=false;this.kills++;const reward=MONSTER_TYPES[mob.type];const rate=(this.expRate??1)*mobXp(mob);this.emit('experience',awardExperience(this,Math.round(reward.baseXp*rate),Math.round(reward.jobXp*rate)));this.emit('defeat',{id:mob.id,x:mob.x,z:mob.z});if(this.targetId===mob.id){this.targetId=null;this.path=[];}}
 }
 // 0.68 a point in front of the player (toward `toward` when given): where an attack or skill lands with no target.
 airPoint(range,toward=null){const p=this.player;if(toward){const dx=toward.x-p.x,dz=toward.z-p.z;if(Math.hypot(dx,dz)>.01)p.face={x:dx,z:dz};}const n=Math.hypot(p.face.x,p.face.z)||1;return {x:p.x+p.face.x/n*range,z:p.z+p.face.z/n*range};}
 basicAttack(quiet=false){
  this.clearEmote();const p=this.player;if(p.hp<=0||p.attackCD>0||held(this.status))return false;
  let m=this.target;if(!m){m=this.nearest(this.profession.range);if(m)this.select(m.id);}
  // 0.68 no target in reach: swing at the air (auto-chase still uses AUTO / walking to the target).
  if(!m||distance(p,m)>this.profession.range||!lineClear(p,m,this.nav)){if(quiet||this.safe)return false;p.attackCD=this.profession.delay*(this.derived?.delay??1);this.emit('cast',{skillIndex:null,from:{x:p.x,z:p.z},to:this.airPoint(Math.min(this.profession.range,2.4),m),color:this.profession.color,kind:this.profession.kind,air:true});return true;}
  p.attackCD=this.profession.delay*(this.derived?.delay??1);p.face={x:m.x-p.x,z:m.z-p.z};this.emit('cast',{skillIndex:null,from:{x:p.x,z:p.z},to:{x:m.x,z:m.z},color:this.profession.color,kind:this.profession.kind});{const d=this.derived,crit=!!d&&Math.random()<d.crit;// 0.102.1 a magic class's basic hit is magic damage: class element, no size penalty, violet number
   const magic=!!d?.magic;this.hurt(m,Math.max(1,Math.round((this.profession.damage+(d?.basicBonus??0))*(crit?1.5:1)*this.affinity(m,!magic))),crit?'#ffd27a':magic?'#c9a8ff':undefined);}return true;
 }
 skill(index){
  if(Number.isInteger(index)&&this.skills[index])this.clearEmote();
  const level=this.skillLevels[index]??1;if(this.skills[index]&&level<1){this.notice('ยังไม่ได้เรียนสกิลนี้');return false;}
  const s=scaledSkill(this.skills[index],level),p=this.player;if(!s||p.hp<=0||held(this.status))return false;
  if(this.status.silence){this.notice('ใบ้ · ใช้สกิลไม่ได้');return false;}
  if(this.cooldowns[index]>0){this.notice('สกิลยังไม่พร้อม');return false;}
  if(p.mp<s.cost){this.notice('มานาไม่พอ');return false;}
  let m=this.target;
  let air=null;
  if(s.range&&this.safe){this.notice('เขตปลอดภัย · ออกนอกเมืองเพื่อใช้สกิลโจมตี');return false;}
  if(s.range){const hit=m&&distance(p,m)<=s.range&&lineClear(p,m,this.nav)?m:this.nearest(s.range);
   // 0.68 no target in range: the skill is cast at the air in front of you (area skills still hit what is there).
   if(hit&&lineClear(p,hit,this.nav)){m=hit;this.select(m.id);p.face={x:m.x-p.x,z:m.z-p.z};}else{air=this.airPoint(Math.min(s.range,4),m);m=null;}}
  const from={x:p.x,z:p.z};
  p.mp-=s.cost;this.cooldowns[index]=s.cd;
  if(s.type==='heal'){p.hp=Math.min(p.maxHp,p.hp+(s.heal??48));this.emit('heal',{x:p.x,z:p.z,amount:s.heal??48,color:s.color});}
  else if(s.type==='shield'){p.shield=s.duration??8;this.notice(s.name+' · ลดความเสียหาย '+p.shield+' วินาที');}
  else if(s.type==='mana'){p.mp=Math.min(p.maxMp,p.mp+48);this.notice(s.name+' · มานา +48');}
  else if(s.type==='dash'){const n=Math.hypot(p.face.x,p.face.z)||1;moveBody(p,p.face.x/n*2.8,p.face.z/n*2.8,this.nav);this.manualGrace=.7;this.path=[];}
  else if(s.type==='nova'){this.foes().filter(v=>v.hp>0&&distance(v,p)<=s.radius&&lineClear(p,v,this.nav)).forEach(v=>this.hurt(v,this.power(s.damage,v),s.color));}
  else if(s.type==='area'){const c=m??air;this.foes().filter(v=>v.hp>0&&distance(v,c)<=s.radius&&lineClear(c,v,this.nav)).forEach(v=>this.hurt(v,this.power(s.damage,v),s.color));}
  else if(m){this.hurt(m,this.power(s.damage,m),s.color);if(s.type==='root')m.root=3.5;if(s.type==='push'){const n=distance(p,m)||1;moveBody(m,(m.x-p.x)/n*1.8,(m.z-p.z)/n*1.8,this.nav);}}
  this.emit('cast',{skillIndex:index,from,to:s.type==='dash'?{x:p.x,z:p.z}:m?{x:m.x,z:m.z}:air??{x:p.x,z:p.z},air:!!air,color:s.color,kind:s.type,radius:s.radius??1});return true;
 }
 update(dt,input={x:0,z:0,attack:false},{monsters=true}={}){
  dt=Math.min(.05,Math.max(0,dt));this.time+=dt;const p=this.player;
  this.emote=activeEmote(this.emote,this.time);if(Math.hypot(input.x,input.z)>.08||input.attack||this.auto||p.hp<=0)this.clearEmote();
  p.attackCD=Math.max(0,p.attackCD-dt);p.shield=Math.max(0,p.shield-dt);p.mp=Math.min(p.maxMp,p.mp+3.2*dt*(this.derived?.mpRegen??1));
  this.cooldowns=this.cooldowns.map(t=>Math.max(0,t-dt));this.manualGrace=Math.max(0,this.manualGrace-dt);this.pathTimer-=dt;
  for(const k in this.status){this.status[k]-=dt;if(this.status[k]<=0)delete this.status[k];}
  if(this.food&&(this.food.left-=dt)<=0){this.food=null;this.notice('ฤทธิ์อาหารหมดแล้ว');}
  if(this.status.poison&&p.hp>1&&(this.poisonTick+=dt)>=1){this.poisonTick=0;const n=Math.min(p.hp-1,Math.max(1,Math.round(p.maxHp*.03)));p.hp-=n;this.emit('playerHit',{x:p.x,z:p.z,amount:n});}
  const stop=held(this.status),wantsRun=input.run===true&&Math.hypot(input.x,input.z)>.08,speed=this.walkSpeed(wantsRun);
  this.mercStep(dt);
  if(p.hp<=0){p.moving=false;p.running=false;p.down-=dt;if(p.down<=0){Object.assign(p,{...this.spawn,hp:p.maxHp,mp:p.maxMp,shield:0});this.notice('กลับถึงลานแล้ว · ลองใหม่ได้เลย');}return;}
  // 0.100.11 HP comes back on its own: towns 4 % of max HP a second, the field 1 % a second after 6 s out of combat
  this.calm=this.status.poison?0:(this.calm??0)+dt;
  if(p.hp>0&&p.hp<p.maxHp&&(this.safe||this.calm>6))p.hp=Math.min(p.maxHp,p.hp+Math.max(8,p.maxHp*(this.safe?.04:.01))*dt);
  const ox=p.x,oz=p.z,manual=!stop&&Math.hypot(input.x,input.z)>.08;
  if(manual){const n=Math.max(1,Math.hypot(input.x,input.z));moveBody(p,input.x/n*speed*dt,input.z/n*speed*dt,this.nav);p.face={x:input.x,z:input.z};this.path=[];this.manualGrace=.8;}
  if(input.attack)this.basicAttack(true);
  if(this.auto&&!stop&&!manual&&this.manualGrace===0){
   let m=this.target;if(!m||!this.prey(m)||distance(m,this.anchor)>AUTO_RANGE+1||distance(m,p)>AUTO_SEEK+2){m=this.nearest(AUTO_RANGE);
    // 0.91 nothing left near where AUTO was switched on (e.g. turned on at the respawn yard): take the closest monster
    // within 30 m of the player and move the hunting spot there.
    if(!m){m=this.mobs.filter(x=>x.hp>0&&this.prey(x)&&distance(x,p)<=AUTO_SEEK).sort((a,b)=>distance(a,p)-distance(b,p))[0]??null;if(m)this.anchor={x:m.x,z:m.z};}
    this.targetId=m?.id??null;this.path=[];}
   // 0.97 nothing to hunt within 30 m for 25 s: AUTO switches itself off and says why, so the button never shows on while idle.
   if(m)this.autoIdle=0;else if((this.autoIdle+=dt)>25){this.auto=false;this.autoIdle=0;this.notice('ปิด AUTO · ไม่พบมอนสเตอร์ในระยะ 30 ม.');}
   if(m){
    // 0.90 AUTO casts the skills ticked in the skill window when they are ready and in reach (one try every 0.5 s).
    this.autoCast=Math.max(0,this.autoCast-dt);
    if(this.autoCast===0&&lineClear(p,m,this.nav)){const i=pickAutoSkill(this,this.autoConfig,scaledSkill);if(i>=0){this.autoCast=.5;this.skill(i);}}
    if(distance(p,m)<=this.profession.range-.1&&lineClear(p,m,this.nav)){this.path=[];this.basicAttack(true);}
    else{
     // 0.99.11 open ground (nothing between us): walk straight at it and skip the grid search, which is the costly part
     if(this.pathTimer<=0){this.path=lineClear(p,m,this.nav)?[{x:m.x,z:m.z}]:findPath(p,m,this.nav);this.pathTimer=.65;}
     while(this.path.length&&distance(p,this.path[0])<.16)this.path.shift();
     const next=this.path[0];if(next){const d=distance(p,next)||1;const step=Math.min(d,speed*dt);p.face={x:(next.x-p.x)/d,z:(next.z-p.z)/d};moveBody(p,p.face.x*step,p.face.z*step,this.nav);}
    }
   }
  }
  p.moving=Math.hypot(p.x-ox,p.z-oz)>.001;p.running=p.moving&&manual&&wantsRun;
  if(!monsters)return; // Shared-room servers advance each monster exactly once per tick.
  for(const m of this.mobs){
   const type=MONSTER_TYPES[m.type],outcome=advanceMonster(m,p,type,dt,this.nav,{moveBody,lineClear});
   if(outcome==='respawn')this.emit('respawn',{id:m.id});
   if(m.justEnraged){m.justEnraged=false;this.notice(type.name+' โกรธจัด! · เร็วและแรงขึ้น');}
   if(outcome==='burst'&&Math.hypot(p.x-m.x,p.z-m.z)<=MONSTER_BEHAVIOUR[type.id].aoe&&this.takeMonsterHit(type)&&p.hp===0){this.mobs.forEach(v=>v.aggro=false);break;}
   if(outcome==='hit'){
    if(this.takeMonsterHit(type)&&p.hp===0){this.mobs.forEach(v=>v.aggro=false);break;}
   }
  }
 }
}

// Online client prediction: move our own character every frame with the server's movement rule (moveBody + class speed)
// so walking is immediate and smooth. Server snapshots (10 Hz) only correct drift: snap on big jumps (dash, respawn),
// ease onto the server position whenever we are not steering (stopping, auto-pathing).
export function predictMove(world,server,dt,dir){
 const p=world.player;if(!server||p.hp<=0)return;
 const manual=!held(world.status)&&Math.hypot(dir.x,dir.z)>.08,ox=p.x,oz=p.z,speed=world.walkSpeed(dir.run===true);
 if(Math.hypot(dir.x,dir.z)>.08||dir.attack)world.clearEmote();
 if(manual){const n=Math.max(1,Math.hypot(dir.x,dir.z));moveBody(p,dir.x/n*speed*dt,dir.z/n*speed*dt,world.nav);p.face={x:dir.x,z:dir.z};}
 const ex=server.x-p.x,ez=server.z-p.z,error=Math.hypot(ex,ez);
 if(error>2.5){p.x=server.x;p.z=server.z;}
 else if(!manual&&error>.002){const f=1-Math.exp(-dt*10);p.x+=ex*f;p.z+=ez*f;if(server.moving)p.face=server.face;}
 p.moving=Math.hypot(p.x-ox,p.z-oz)>.001;p.running=p.moving&&(manual?dir.run===true:server.running===true);
}
