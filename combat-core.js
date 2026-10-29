import {normalizeAutoTarget,autoTargetAllows,autoRankAllows} from './auto-targets.js?v=auto202';
import {skillHit} from './skill-critical.js';
import {tickPetEffects,petIncoming,petBlessing} from './pet-combat.js?v=petbuild220';
import {createRoleCombat,stepRoleMonsters} from './role-combat.js?v=farm213';
import {patch,monsterKey} from './balance.js';
import {normalizeAuto,pickAutoSkill,advanceAutoSequence} from './auto-play.js?v=auto202';
import {activeEmote,canonicalAction,EMOTE_ACTIONS,movementSpeed} from './character-action-state.js?v=life1';
import {FRONTIER_MONSTERS,markMonsterHit,advanceMonster,MONSTER_BEHAVIOUR} from './monster-catalog.js?v=farm212';
import {skillTrack} from './skill-choreography.js?v=novice174';
import {basicTiming} from './combat-timing.js';
import {affinityMultiplier,affinityOf,CLASS_SKILL_ELEMENT} from './affinity.js?v=02';
import {awardExperience,deathPenalty,baseProgress} from './experience.js?v=105.3';
import {AILMENTS,rollAilment,held} from './ailments.js?v=01';
import {advanceStats,advanceSkills} from './advancement.js?v=73';
import {getClass,classSkills} from './classes.js?v=novice174';
import {scaledSkill} from './skill-progress.js?v=novice174';
import {PROLOGUE_BOSS} from './prologue.js?v=2';
import {monsterDef,monsterMdef,monsterFlee,monsterHit as monsterHitStat,defFactor,hitChance,dodgeChance,magicMonster,CRIT_MULT} from './combat-formulas.js';
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
MONSTER_TYPES.push(...FRONTIER_MONSTERS,PROLOGUE_BOSS);
MONSTER_TYPES.forEach((m,i)=>patch('monsters',monsterKey(m,i),m)); // 0.85 admin balance overrides
// 0.52 pacing: AUTO looks for monsters within 14 of where it was switched on (was 8); towns are walked 30% faster.
// 1.12 owner: reach is measured to the monster's edge, not its centre, so a big boss is hit from its body's edge.
// Body radius from the drawn height: a normal monster ~0.4 m, the straw king 1.1 m.
export const bodyRadius=m=>m?.pvp?.35:Math.min(1.1,Math.max(.25,(MONSTER_TYPES[m?.type]?.height??1.5)*.25));
export const reachTo=(p,m)=>distance(p,m)-bodyRadius(m);
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
 if(nav.circle&&Math.hypot(x-nav.circle.x,z-nav.circle.z)>nav.circle.radius-r)return false;
 const g=nav.grid;if(g){ // every cell the body's bounding square touches must be open
  const i0=Math.round((x-r-g.x0)/g.cell),i1=Math.round((x+r-g.x0)/g.cell),j0=Math.round((z-r-g.z0)/g.cell),j1=Math.round((z+r-g.z0)/g.cell);
  for(let j=j0;j<=j1;j++){const row=g.rows[j];if(!row)return false;for(let i=i0;i<=i1;i++)if((row[i]??'.')==='.')return false;}
 }
 if(!nav.zones.some(b=>x>=b.x+r&&x<=b.x+b.w-r&&z>=b.z+r&&z<=b.z+b.d-r))return false;
 for(const b of nav.obstacles){if(x>b.x-r&&x<b.x+b.w+r&&z>b.z-r&&z<b.z+b.d+r)return false;}
 return !nav.props.some(([px,pz,pr])=>Math.hypot(x-px,z-pz)<r+pr);
}
// 0.109.4 wind wing: a random walkable spot on the map, zones picked by area so big fields get most landings.
export function randomSpot(nav=DEFAULT_NAV,rand=Math.random,tries=300){
 const zones=nav.zones??[],total=zones.reduce((n,z)=>n+z.w*z.d,0);if(!total)return null;
 for(let t=0;t<tries;t++){let r=rand()*total,z=zones[0];for(const c of zones){if(r<c.w*c.d){z=c;break;}r-=c.w*c.d;}
  const x=z.x+rand()*z.w,y=z.z+rand()*z.d;if(walkable(x,y,.28,nav))return {x,z:y};}
 return null;
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
// 0.112.2 the frontline (sword-and-shield) line soaks percent-of-HP boss hits with its DEF; Master jobs keep the class id
export const TANK_CLASSES=new Set(['swordsman']);
export function monsterHit(world,raw,rand=Math.random,monsterId=null){
 // 0.103 dodge from FLEE against this monster's HIT; magic monsters (lanterns) go through MDEF instead of DEF
 const p=world.player,d=world.derived,t=monsterId?MONSTER_TYPES.find(x=>x.id===monsterId):null;
 const dodge=d?(t&&d.fleeStat!=null?Math.min(.75,dodgeChance(d.fleeStat,monsterHitStat(t),d.total?.luk??1)+(d.fleeBonus??0)):d.flee):0;
 if(d&&rand()<dodge*(world.status?.blind?.5:1))return 0;
 // 0.112.2 percent bosses (Straw King): a tank takes pctHit.tank of its max HP minus its DEF; anyone else a random
 // min..max share of max HP that DEF and element resist do not touch. A guard shield still cuts it like any hit.
 if(t?.pctHit&&d){const h=t.pctHit,cut=p.shield>0?.35:1,tank=TANK_CLASSES.has(world.profession?.id);
  return Math.max(1,Math.round((tank?p.maxHp*h.tank-(d.def??0):p.maxHp*(h.min+rand()*(h.max-h.min)))*cut*(1-(d.dmgReduce??0))));}
 const base=p.shield>0?Math.ceil(raw*.35):raw,resist=d&&monsterId?1-Math.min(.8,d.resist?.[affinityOf(monsterId).element]??0):1;
 const guard=d?(magicMonster(t)?(d.mdef??0):(d.def??0)):0;
 return d?Math.max(1,Math.round(base*resist*100/(100+guard*4)*(1-(d.dmgReduce??0)))):base;
}
// 0.117 mantra set: skills cost less MP
export const skillCost=(world,s)=>Math.round((s?.cost??0)*(1-(world.derived?.mpCut??0)));
// Grid A* routes auto-chase around houses. Manual movement always overrides it.
export function findPath(start,goal,nav=DEFAULT_NAV){
 const cell=distance(start,goal)>30?1:.5,key=(x,z)=>`${x},${z}`,startX=Math.round(start.x/cell),startZ=Math.round(start.z/cell);
 // 0.114.2 binary heap on (f, newest first among ties): pops in exactly the order the old sort+pop did, without
 // re-sorting the whole open list every step (a far walk used to cost up to ~1.4 s of server time).
 const open=[],before=(a,b)=>a.f<b.f||(a.f===b.f&&a.n>b.n);let seq=0;
 const push=node=>{node.n=seq++;let i=open.push(node)-1;while(i){const p=(i-1)>>1;if(!before(open[i],open[p]))break;[open[i],open[p]]=[open[p],open[i]];i=p;}};
 const pop=()=>{const top=open[0],last=open.pop();if(open.length){open[0]=last;let i=0;for(;;){const l=2*i+1,r=l+1;let m=i;if(l<open.length&&before(open[l],open[m]))m=l;if(r<open.length&&before(open[r],open[m]))m=r;if(m===i)break;[open[i],open[m]]=[open[m],open[i]];i=m;}}return top;};
 const cells=new Map(),open_=(x,z)=>{const k=x+','+z;let v=cells.get(k);if(v===undefined)cells.set(k,v=walkable(x*cell,z*cell,.32,nav));return v;};
 push({x:startX,z:startZ,g:0,f:0,parent:null});const best=new Map([[key(startX,startZ),0]]);let end=null;
 for(let iterations=0;open.length&&iterations<6000;iterations++){
  const cur=pop();
  if(best.get(key(cur.x,cur.z))<cur.g)continue;
  const from=cur.parent?{x:cur.x*cell,z:cur.z*cell}:start;
  if(Math.hypot(cur.x*cell-goal.x,cur.z*cell-goal.z)<.7&&walkLineClear(from,goal,nav)){end=cur;break;}
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
   const x=cur.x+dx,z=cur.z+dz;
   // Cheap pure checks first; the swept body test is the expensive one.
   if(!open_(x,z))continue;
   if(dx&&dz&&(!open_(cur.x+dx,cur.z)||!open_(cur.x,cur.z+dz)))continue;
   const g=cur.g+Math.hypot(dx,dz),k=key(x,z);if(g>=(best.get(k)??Infinity))continue;
   if(!walkLineClear(from,{x:x*cell,z:z*cell},nav))continue;
   best.set(k,g);push({x,z,g,f:g+Math.hypot(x-goal.x/cell,z-goal.z/cell),parent:cur});
  }
 }
 const path=[];while(end?.parent){path.push({x:end.x*cell,z:end.z*cell});end=end.parent;}return path.reverse();
}
export function lineClear(a,b,nav=DEFAULT_NAV){
 const n=Math.max(1,Math.ceil(distance(a,b)/.18));
 for(let i=1;i<n;i++){const f=i/n;if(!walkable(a.x+(b.x-a.x)*f,a.z+(b.z-a.z)*f,.05,nav))return false;}return true;
}
// Sight/projectiles can pass a narrow gap, but walking must clear the whole body.
// Half a movement substep keeps bridge edges in the sweep, including both ends.
export function walkLineClear(a,b,nav=DEFAULT_NAV){
 const n=Math.max(1,Math.ceil(distance(a,b)/.06));
 for(let i=0;i<=n;i++){const f=i/n;if(!walkable(a.x+(b.x-a.x)*f,a.z+(b.z-a.z)*f,.28,nav))return false;}return true;
}
// 0.63 packs: on maps with packs:true each mobs entry is a camp of 4-5 of that monster around the point
// (bosses stay alone). Deterministic, so the realm server and every client build identical ids.
const PACK=[[0,0],[2.2,.7],[-1.8,1.6],[-.9,-2.2],[2,-1.6]];
// 0.64 camp leader (slot 0): 3x HP, 2x EXP, 3 loot rolls, 3x respawn time, drawn 35% larger. Members give 0.6x EXP.
export const LEADER={hp:3,xp:2,loot:3,respawn:3,scale:1.35,member:.6};
export const mobXp=m=>m.leader?LEADER.xp:m.pack!==undefined?LEADER.member:1;
export const mobRespawn=m=>(MONSTER_TYPES[m.type].respawn??12)*(m.leader?LEADER.respawn:1);
// 0.122 spread out (tester: "two groups on one spot"): each camp monster gets its own home 6–14 m around the camp
// point, at least 3 m from every other monster, and a doubled camp gets its own point at least 12 m from every camp
// instead of 3–7 m beside the original. Seeded random, so the realm server and every client still build identical
// spots and ids. Tight ground falls back to 3–8 m, then 1.5–20 m (1.5 m apart), and only then to the old pack shape.
export const SPREAD={min:6,max:14,gap:3,campGap:12};
const seeded=seed=>()=>{seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};
const special=T=>!T||T.boss||T.elite||T.mvp||T.worldBoss||T.sheet==='elite-monsters';
export function packSpawns(mobs,{packs=false,nav=DEFAULT_NAV,mobPopulation=1}={}){
 const rand=seeded(mobs.reduce((h,[x,z,t],i)=>Math.imul(h^Math.round(x*10)^Math.round(z*10)<<8^t<<16^i,2654435761)|0,mobs.length+1));
 const spots=mobs.map(([x,z])=>({x,z})),free=(x,z,gap)=>walkable(x,z,.4,nav)&&spots.every(p=>Math.hypot(x-p.x,z-p.z)>=gap);
 const place=(cx,cz)=>{
  for(const [lo,hi,gap] of [[SPREAD.min,SPREAD.max,SPREAD.gap],[3,8,1.5],[1.5,20,1.5]])for(let t=0;t<90;t++){
   const a=rand()*Math.PI*2,r=Math.sqrt(lo*lo+rand()*(hi*hi-lo*lo)),x=cx+Math.cos(a)*r,z=cz+Math.sin(a)*r;
   if(free(x,z,gap)){spots.push({x,z});return [x,z];}
  }
  return null;
 };
 const packed=(cx,cz,k)=>{const [dx,dz]=PACK[k%PACK.length];for(const f of [1,.6,.3])if(walkable(cx+dx*f,cz+dz*f,.4,nav))return [cx+dx*f,cz+dz*f];return [cx,cz];};
 const base=!packs?mobs.map(s=>[...s]):mobs.flatMap(([x,z,type],i)=>special(MONSTER_TYPES[type])?[[x,z,type,i]]:
  Array.from({length:4+i%2},(_,k)=>[...(place(x,z)??packed(x,z,k)),type,i,k===0]));
 if(mobPopulation!==2)return base;
 // Duplicate complete ordinary camps after packing, so odd camp sizes still
 // double exactly. Original spawn IDs stay stable; copied camps get new IDs.
 const groups=new Map(),centers=mobs.map(([x,z])=>({x,z})),extra=[];
 for(const [i,s]of base.entries()){
  if(special(MONSTER_TYPES[s[2]]))continue;
  const key=s[3]===undefined?'single-'+i:'pack-'+s[3],at=s[3]===undefined?s:mobs[s[3]];
  if(!groups.has(key))groups.set(key,{center:{x:at[0],z:at[1]},members:[]});groups.get(key).members.push(s);
 }
 for(const g of groups.values()){
  let c=null;
  for(const [lo,hi,gap] of [[SPREAD.campGap*1.6,SPREAD.campGap*2.4,SPREAD.campGap],[SPREAD.campGap,SPREAD.campGap*1.6,SPREAD.campGap*.7],[SPREAD.campGap*.5,SPREAD.campGap*3,SPREAD.campGap*.5]]){
   for(let t=0;t<40&&!c;t++){const a=rand()*Math.PI*2,r=lo+rand()*(hi-lo),x=g.center.x+Math.cos(a)*r,z=g.center.z+Math.sin(a)*r;if(walkable(x,z,.4,nav)&&centers.every(p=>Math.hypot(x-p.x,z-p.z)>=gap))c={x,z};}
   if(c)break;
  }
  c??=g.center;centers.push(c);
  for(const [k,s] of g.members.entries()){const copy=[...(place(c.x,c.z)??packed(c.x,c.z,k+1)),...s.slice(2)];if(copy[3]!==undefined)copy[3]+=base.length;extra.push(copy);}
 }
 return [...base,...extra];
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
  this.autoConfig=normalizeAuto(null);this.autoCast=0;this.autoIdle=0;this.foe=null;this.rivals=[];this.food=null;this.targetId=null;this.auto=false;this.anchor={x:0,z:0};this.cooldowns=this.skills.map(()=>0);this.skillLevels=this.skills.map(s=>s.reserved||s.master?0:1);this.events=[];this.path=[];this.pathTimer=0;this.manualGrace=0;this.kills=0;this.baseXp=0;this.jobXp=0;this.jobId=config.jobId??'';this.time=0;this.status={};this.poisonTick=0;this.merc=null;this.roleCombat=config.roleSkills===true?createRoleCombat(this,{moveBody,lineClear,types:MONSTER_TYPES}):null;if(this.roleCombat){this.skills=this.roleCombat.skills;this.cooldowns=this.skills.map(()=>0);this.skillLevels=this.skills.map(s=>s.reserved||s.master?0:1);}
 }
 // 0.61 hired mercenary: attacks your target (or, on AUTO, the nearest monster) within 6, every 1.4 s, 10 + 2·level damage.
 hire(seconds,contract=null){this.merc={...contract,left:seconds,cd:0};}
 mercStep(dt){
  const c=this.merc,p=this.player;if(!c)return;c.left-=dt;c.cd=Math.max(0,c.cd-dt);
  if(c.left<=0){this.merc=null;this.notice('ทหารรับจ้างหมดสัญญาแล้ว');return;}
  if(p.hp<=0||this.safe||this.foe||this.rivals.length){c.pending=null;return;}
  if(c.pending){const hit=c.pending;hit.left-=dt;if(hit.left<=0){c.pending=null;const m=this.mobs.find(m=>m.id===hit.id&&m.hp>0);if(m&&distance(m,p)<=6&&lineClear(p.x,p.z,m.x,m.z,this.nav)){this.emit('mercHit',{id:m.id,x:m.x,z:m.z});this.hurt(m,c.power,'#cfe8ff');}}return;}
  if(c.cd>0)return;
  const chosen=this.target,m=chosen&&this.mobs.includes(chosen)?chosen:(this.auto?this.nearest(6):null);if(!m||!this.mobs.includes(m)||distance(m,p)>6||!lineClear(p.x,p.z,m.x,m.z,this.nav))return;
  c.cd=c.interval??1.4;this.emit('merc',{x:m.x,z:m.z});
  if(c.id)c.pending={id:m.id,left:.25};else this.hurt(m,10+2*baseProgress(this).level,'#cfe8ff');
 }
 // 0.93 duel: the opponent stands in as one more target (the server keeps its position and HP in step with the real player).
 // 0.95 guild war: rivals are enemy-guild players and the guardian stone, kept in step by the server the same way.
 foes(){return this.foe||this.rivals.length?[...this.mobs,...(this.foe?[this.foe]:[]),...this.rivals]:this.mobs;}
 get target(){return this.foes().find(m=>m.id===this.targetId&&m.hp>0)??null;}
 // the prologue lends a Novice another class's skills for a while (realm only; the saved character never changes)
 setProfession(classId,jobId=''){this.profession=advanceStats(getClass(classId),jobId);this.jobId=jobId;this.roleCombat=createRoleCombat(this,{moveBody,lineClear,types:MONSTER_TYPES});this.skills=this.roleCombat.skills;this.cooldowns=this.skills.map(()=>0);this.skillLevels=this.skills.map(s=>s.reserved||s.master?0:1);}
 emit(type,extra={}){if(type==='cast'||type==='playerHit')this.clearEmote();this.events.push({type,...(['damage','miss'].includes(type)&&this.roleCombat?{synced:true,...this.damageContext}:{}),...extra});}
 clearEmote(){this.emote=null;}
 setEmote(action){
  const name=canonicalAction(action);if(!EMOTE_ACTIONS.includes(name)||this.player.hp<=0)return false;
  if(name==='idle'){this.clearEmote();return true;}
  this.emote={name,time:this.time};this.auto=false;this.path=[];this.pathTimer=0;this.player.moving=false;this.player.running=false;return true;
 }
 // 0.48 ailments: blind and curse weaken every hit; stun/sleep stop acting; silence stops skills.
 // One movement rule for authority and prediction; sprint is an explicit modifier and never changes default pace.
 walkSpeed(run=false){return movementSpeed(this.profession.speed*(1+(this.derived?.moveSpeed??0))*(this.status?.curse?.6:1)*(this.status?.slow?.5:1)*(this.safe?TOWN_PACE:1),run);}
 weakness(){return (this.status.blind?.7:1)*(this.status.curse?.75:1);}
 inflict(name){if(!name||!AILMENTS[name])return;const fresh=!this.status[name];this.status[name]=AILMENTS[name].time;if(fresh)this.notice(AILMENTS[name].name+'! · '+AILMENTS[name].text);}
 // One monster blow, shared by the offline world and the realm server: damage, ailment roll, or going down (+ death penalty).
 // 0.111 boss ground slam: knock the player back (always; it is the ground that throws you) and hit hard unless dodged.
 // ponytail: damage floor is a share of max HP before DEF, so very high DEF still shrinks it; tune pct per boss.
 takeSlam(type,m,s){
  const p=this.player,dx=p.x-m.x,dz=p.z-m.z,d=Math.hypot(dx,dz)||1;if(p.hp<=0||d>s.radius)return false;
  this.knock={vx:dx/d*s.push/.35,vz:dz/d*s.push/.35,t:.35};this.path=[];this.emit('knock',{...this.knock,x:p.x,z:p.z});
  const hit=this.takeMonsterHit(type,Math.max(type.damage*s.power,p.maxHp*s.pct),m);if(p.hp<=0)this.knock=null;return hit;
 }
 knockStep(dt){const k=this.knock;if(!k)return false;moveBody(this.player,k.vx*Math.min(dt,k.t),k.vz*Math.min(dt,k.t),this.nav);if((k.t-=dt)<=0)this.knock=null;return true;}
 takeMonsterHit(type,raw=type.damage,source=null){
  const p=this.player,baseDamage=monsterHit(this,raw,Math.random,type.id),damage=this.roleCombat?this.roleCombat.incoming(baseDamage,source):petIncoming(this,baseDamage);if(!damage){this.emit('dodge',{x:p.x,z:p.z});return false;}
  p.hp=Math.max(0,p.hp-damage);this.calm=0;this.emit('playerHit',{x:p.x,z:p.z,amount:damage});delete this.status.sleep;
  if(p.hp>0){this.inflict(rollAilment(type.id));return true;}
  this.fall();return true;
 }
 fall(){const p=this.player;  p.down=this.roleCombat?20:3;this.auto=false;this.targetId=null;this.path=[];p.moving=false;p.running=false;this.status={};
  const lost=deathPenalty(this);this.notice('หมดแรง · เลือกจุดเกิดหรือรอเพื่อนชุบชีวิต'+(lost?' · Base EXP -'+lost:''));}
 respawn(here=true){
  const p=this.player;if(p.hp>0)return false;
  this.auto=false;this.targetId=null;this.path=[];this.status={};this.knock=null;this.basicPending=null;this.legacyPending=null;
  if(this.roleCombat)this.roleCombat.state.pending=null;
  Object.assign(p,here?{}:this.spawn,{hp:p.maxHp,mp:p.maxMp,down:0,shield:0,moving:false,running:false});
  this.notice('คืนขวัญแล้ว · พร้อมออกเดินทาง');return true;
 }
 // 0.58 combo: a skill on a rooted monster hits 30% harder.
 // 0.103 skill damage also passes the monster's DEF (MDEF for magic classes); duels and war targets are handled elsewhere
 guardOf(mob,magic){if(!mob||mob.pvp)return 1;const t=MONSTER_TYPES[mob.type];return defFactor((magic?monsterMdef(t):monsterDef(t))*(mob.petArmor?.left>0?1-mob.petArmor.power:1)*(1-(this.derived?.armorPen??0)));}
 power(n,mob=null){const combo=mob?.root>0&&mob.hp>0;if(combo)this.emit('combo',{x:mob.x,z:mob.z});return Math.round(n*(this.derived?.skillPower??1)*(mob?this.affinity(mob,false)*this.guardOf(mob,!!this.derived?.magic):1)*(combo?1.3:1));}
 // 0.44 element + size (affinity.js). Basic attacks: weapon element, physical. Skills: class element; magic classes ignore size.
 affinity(mob,basic){if(mob.pvp)return this.weakness();const d=this.derived,cls=this.profession.id,magic=d?.magic??(cls==='shaman'||cls==='acolyte');
  const element=basic?(d?.weaponElement??'neutral'):(CLASS_SKILL_ELEMENT[cls]??d?.weaponElement??'neutral');
  const id=MONSTER_TYPES[mob.type]?.id,a=affinityOf(id),card=1+(d?.vsSize?.[a.size]??0)+(d?.vsElement?.[a.element]??0);
  return affinityMultiplier({element,physical:basic||!magic,classId:cls},id)*card*this.weakness();}
 // 0.43 status/gear: max HP/MP and the multipliers above. null keeps the pre-0.43 numbers.
 applyDerived(d){this.derived=d;if(!d)return;const p=this.player;p.maxHp=Math.round(d.maxHp*(1+(this.roleCombat?.mods().maxHp??0)));p.maxMp=d.maxMp;p.hp=Math.min(p.hp,p.maxHp);p.mp=Math.min(p.mp,p.maxMp);}
 notice(text){this.emit('notice',{text});}
 select(id){const mob=this.foes().find(m=>m.id===id&&m.hp>0);if(!mob)return;this.targetId=id;this.path=[];this.pathTimer=0;this.emit('select',{id});}
 nearest(range=AUTO_RANGE){return this.foes().filter(m=>m.hp>0&&this.prey(m)&&distance(m,this.player)<=range&&(!this.auto||distance(m,this.anchor)<=AUTO_RANGE)).sort((a,b)=>distance(a,this.player)-distance(b,this.player))[0]??null;}
 // 0.91 explicit on/off (the button and quests send the state they want, so two quick taps can no longer cross).
 // 0.99.7 hunt = a monster type index: AUTO started by a quest only goes after that kind (cleared by any other switch).
 bodyRadius(m){return bodyRadius(m);}
 autoDamageAllows(m){return !this.auto||autoRankAllows(this.autoConfig,m,MONSTER_TYPES);}
 prey(m){return !this.auto||(autoTargetAllows(this.autoTarget,m,this.hunt)&&this.autoDamageAllows(m));}
 setAuto(on,hunt=null,target=null){const filter=normalizeAutoTarget(target);if(on&&filter?.kind==='entity'&&!this.foes().some(m=>m.id===filter.id&&m.hp>0)){this.notice('เป้าหมายนี้ไม่อยู่หรือไม่สามารถต่อสู้ได้');return false;}if(on&&filter?.kind==='type'&&!MONSTER_TYPES[filter.type]||on&&filter?.kind==='types'&&filter.types.some(t=>!MONSTER_TYPES[t]))return false;const ok=on===this.auto?true:this.toggleAuto();this.hunt=this.auto&&Number.isInteger(hunt)?hunt:null;this.autoTarget=this.auto?filter:null;if(this.auto&&filter?.kind==='entity')this.select(filter.id);return ok;}
 toggleAuto(){this.autoRotation=null;this.autoSkillReach=null;this.hunt=null;this.autoTarget=null;if(this.safe){this.notice('ทุกเมืองเป็นเขตปลอดภัย · ออกนอกเมืองเพื่อพบมอนสเตอร์');return false;}if(this.player.hp<=0){this.notice('รอกลับถึงลานก่อน');return false;}this.auto=!this.auto;this.anchor={x:this.player.x,z:this.player.z};this.path=[];this.pathTimer=0;this.notice(this.auto?'AUTO เปิด · เดินเองเพื่อหยุดไล่':'AUTO ปิด');return this.auto;}
 hurt(mob,damage,color='#fff0a6'){
  if(!mob||mob.hp<=0||mob.pvp||!this.autoDamageAllows(mob))return;this.calm=0;damage=Math.min(mob.hp,Math.round((this.roleCombat?.outgoing(mob,damage)??damage)*petBlessing(this)));mob.hp=Math.max(0,mob.hp-damage);markMonsterHit(mob,this.player);rallyPack(this.mobs,mob);
  this.emit('damage',{id:mob.id,x:mob.x,z:mob.z,amount:damage,color,magic:!!this.derived?.magic,crit:color==='#ffd27a',...this.damageContext}); // Keep the hit's critical flag and cast identity.
  if(mob.hp===0){mob.dead=mobRespawn(mob);mob.aggro=false;this.kills++;const reward=MONSTER_TYPES[mob.type];const rate=(this.expRate??1)*mobXp(mob);this.emit('experience',awardExperience(this,Math.round(reward.baseXp*rate),Math.round(reward.jobXp*rate)));this.emit('defeat',{id:mob.id,x:mob.x,z:mob.z});if(this.targetId===mob.id){this.targetId=null;this.path=[];}}
 }
 // 0.68 a point in front of the player (toward `toward` when given): where an attack or skill lands with no target.
 airPoint(range,toward=null){const p=this.player;if(toward){const dx=toward.x-p.x,dz=toward.z-p.z;if(Math.hypot(dx,dz)>.01)p.face={x:dx,z:dz};}const n=Math.hypot(p.face.x,p.face.z)||1;return {x:p.x+p.face.x/n*range,z:p.z+p.face.z/n*range};}
 basicAttack(quiet=false){
  if(this.roleCombat?.state.pending||this.basicPending||this.legacyPending)return false;
  this.clearEmote();const p=this.player;if(p.hp<=0||p.attackCD>0||held(this.status))return false;
  let m=this.target;if(!m){m=this.nearest(this.profession.range);if(m)this.select(m.id);}
  const air=!m||reachTo(p,m)>this.profession.range||!lineClear(p,m,this.nav);if(air&&(quiet||this.safe))return false;
  const timing=basicTiming(this.profession.id,this.profession.delay*(this.derived?.delay??1)),castId=++this.castSerial|| (this.castSerial=1);
  p.attackCD=timing.period;const to=air?this.airPoint(Math.min(this.profession.range,2.4),m):{x:m.x,z:m.z};p.face={x:to.x-p.x,z:to.z-p.z};
  this.emit('cast',{skillIndex:null,castId,timing,from:{x:p.x,z:p.z},to,color:this.profession.color,kind:this.profession.kind,air});
  if(!air){if(this.roleCombat)this.basicPending={target:m,left:timing.impacts[0],castId};else this.basicHit(m,castId);}
  return true;
 }
 basicHit(m,castId){
  const p=this.player;if(!m||m.hp<=0||p.hp<=0||held(this.status)||reachTo(p,m)>this.profession.range+.35||!lineClear(p,m,this.nav)){this.emit('castCancel',{castId});return;}
  const d=this.derived,crit=!!d&&Math.random()<d.crit,magic=!!d?.magic,t=MONSTER_TYPES[m.type];
  this.damageContext={castId,hitIndex:0,source:'basic'};
  try{if(d&&!magic&&!m.pvp&&d.hit!=null&&Math.random()>=hitChance(d.hit,monsterFlee(t))){this.emit('miss',{id:m.id,x:m.x,z:m.z});return;}
   this.hurt(m,Math.max(1,Math.round((this.profession.damage+(d?.basicBonus??0))*(crit?d.critMult??CRIT_MULT:1)*this.affinity(m,!magic)*(crit?1:this.guardOf(m,magic)))),crit?'#ffd27a':magic?'#c9a8ff':undefined);
  }finally{this.damageContext=null;}
 }
 skill(index){
  if(this.basicPending||this.legacyPending)return false;
  if(this.skills[index]?.reserved)return false;
  if(this.roleCombat&&!this.roleCombat.legacy)return this.roleCombat.cast(index);
  if(Number.isInteger(index)&&this.skills[index])this.clearEmote();
  const level=this.skillLevels[index]??1;if(this.skills[index]&&level<1){this.notice('ยังไม่ได้เรียนสกิลนี้');return false;}
  const s=scaledSkill(this.skills[index],level),p=this.player;if(!s||s.reserved||p.hp<=0||held(this.status))return false;
  if(this.status.silence){this.notice('ใบ้ · ใช้สกิลไม่ได้');return false;}
  if(this.cooldowns[index]>0){this.notice('สกิลยังไม่พร้อม');return false;}
  const cost=skillCost(this,s);if(p.mp<cost){this.notice('มานาไม่พอ');return false;}
  let m=this.target;
  let air=null;
  if(s.range&&this.safe){this.notice('เขตปลอดภัย · ออกนอกเมืองเพื่อใช้สกิลโจมตี');return false;}
  if(s.range){const hit=m&&reachTo(p,m)<=s.range&&lineClear(p,m,this.nav)?m:this.nearest(s.range);
   // 0.68 no target in range: the skill is cast at the air in front of you (area skills still hit what is there).
   if(hit&&lineClear(p,hit,this.nav)){m=hit;this.select(m.id);p.face={x:m.x-p.x,z:m.z-p.z};}else{air=this.airPoint(Math.min(s.range,4),m);m=null;}}
  const from={x:p.x,z:p.z};
  p.mp-=cost;this.cooldowns[index]=s.cd*(1-(this.derived?.cdr??0));
  const release=()=>{
  if(s.type==='heal'){p.hp=Math.min(p.maxHp,p.hp+(s.heal??48));this.emit('heal',{x:p.x,z:p.z,amount:s.heal??48,color:s.color});}
  else if(s.type==='shield'){p.shield=s.duration??8;this.notice(s.name+' · ลดความเสียหาย '+p.shield+' วินาที');}
  else if(s.type==='mana'){p.mp=Math.min(p.maxMp,p.mp+48);this.notice(s.name+' · มานา +48');}
  else if(s.type==='dash'){const n=Math.hypot(p.face.x,p.face.z)||1;moveBody(p,p.face.x/n*2.8,p.face.z/n*2.8,this.nav);this.manualGrace=.7;this.path=[];}
  else if(s.type==='nova'){this.foes().filter(v=>v.hp>0&&distance(v,p)<=s.radius&&lineClear(p,v,this.nav)).forEach(v=>skillHit(this,v,this.power(s.damage,v),s.color));}
  else if(s.type==='area'){const c=m??air;this.foes().filter(v=>v.hp>0&&distance(v,c)<=s.radius&&lineClear(c,v,this.nav)).forEach(v=>skillHit(this,v,this.power(s.damage,v),s.color));}
  // 0.111.3 bosses take the damage but are never rooted or pushed back
  else if(m){skillHit(this,m,this.power(s.damage,m),s.color);const firm=MONSTER_TYPES[m.type]?.boss;if(s.type==='root'&&!firm)m.root=3.5;if(s.type==='push'&&!firm){const n=distance(p,m)||1;moveBody(m,(m.x-p.x)/n*1.8,(m.z-p.z)/n*1.8,this.nav);}}
  };
  const event={skillIndex:index,from,to:m?{x:m.x,z:m.z}:air??{x:p.x,z:p.z},air:!!air,color:s.color,kind:s.type,radius:s.radius??1};
  if(this.roleCombat){const track=skillTrack(this.profession.id,index),scale=Math.max(1,(track?.strikes[0]??.42)*(track?.duration??.6)/.25,(track?.duration??.6)/.7),duration=(track?.duration??.6)/scale,timing={duration,impacts:[(track?.strikes[0]??.42)*duration]},castId=++this.castSerial||(this.castSerial=1);
   this.legacyPending={castId,left:timing.impacts[0],release:()=>{if(m&&(m.hp<=0||!lineClear(p,m,this.nav)||(s.range&&reachTo(p,m)>s.range+.35))){this.emit('castCancel',{castId});return;}this.damageContext={castId,source:'skill',hitIndex:0};try{release();}finally{this.damageContext=null;}}};this.emit('cast',{...event,castId,timing});
  }else{release();this.emit('cast',event);}return true;
 }
 update(dt,input={x:0,z:0,attack:false},{monsters=true}={}){
  dt=Math.min(.05,Math.max(0,dt));this.time+=dt;tickPetEffects(this,dt);const p=this.player;
  this.emote=activeEmote(this.emote,this.time);if(Math.hypot(input.x,input.z)>.08||input.attack||this.auto||p.hp<=0)this.clearEmote();
  p.attackCD=Math.max(0,p.attackCD-dt);if(p.attackCD<1e-8)p.attackCD=0;p.shield=Math.max(0,p.shield-dt);p.mp=Math.min(p.maxMp,p.mp+3.2*dt*(this.derived?.mpRegen??1));
  this.cooldowns=this.cooldowns.map(t=>Math.max(0,t-dt));this.manualGrace=Math.max(0,this.manualGrace-dt);this.pathTimer-=dt;
  for(const k in this.status){this.status[k]-=dt;if(this.status[k]<=0)delete this.status[k];}
  if(this.food&&(this.food.left-=dt)<=0){this.food=null;this.notice('ฤทธิ์อาหารหมดแล้ว');}
  if(this.status.poison&&!this.roleDebuffs?.poison&&p.hp>1&&(this.poisonTick+=dt)>=1){this.poisonTick=0;const n=Math.min(p.hp-1,Math.max(1,Math.round(p.maxHp*.03)));p.hp-=n;this.emit('playerHit',{x:p.x,z:p.z,amount:n});}
  const stop=held(this.status),wantsRun=input.run===true&&Math.hypot(input.x,input.z)>.08,speed=this.walkSpeed(wantsRun);
  if(this.basicPending){const c=this.basicPending;if(p.hp<=0||held(this.status)){this.emit('castCancel',{castId:c.castId});this.basicPending=null;}else if((c.left-=dt)<=1e-8){this.basicPending=null;this.basicHit(c.target,c.castId);}}
  if(this.legacyPending){const c=this.legacyPending;if(p.hp<=0||held(this.status)||this.status.silence){this.emit('castCancel',{castId:c.castId});this.legacyPending=null;}else if((c.left-=dt)<=1e-8){this.legacyPending=null;c.release();p.attackCD=Math.max(p.attackCD,.16);}}
  this.mercStep(dt);this.roleCombat?.step(dt,input);if(monsters&&this.roleCombat)stepRoleMonsters(this.mobs,dt,()=>this);
  if(p.hp<=0){p.moving=false;p.running=false;p.down=Math.max(0,(p.down??0)-dt);return;}
  // 0.100.11 HP comes back on its own: towns 4 % of max HP a second, the field 1 % a second after 6 s out of combat
  this.calm=this.status.poison?0:(this.calm??0)+dt;
  if(p.hp>0&&p.hp<p.maxHp&&(this.safe||this.calm>6))p.hp=Math.min(p.maxHp,p.hp+Math.max(8,p.maxHp*(this.safe?.04:.01))*dt);
  const ox=p.x,oz=p.z,knocked=this.knockStep(dt),manual=!stop&&!knocked&&Math.hypot(input.x,input.z)>.08;
  if(manual){const n=Math.max(1,Math.hypot(input.x,input.z));moveBody(p,input.x/n*speed*dt,input.z/n*speed*dt,this.nav);p.face={x:input.x,z:input.z};this.path=[];this.manualGrace=.8;}
  if(input.attack)this.basicAttack(true);
  if(this.auto&&!stop&&!knocked&&!manual&&this.manualGrace===0){
   // 0.122 a kind picked in the AUTO window (or a quest hunt) is looked for across the whole map: with the 30 m limit
   // a picked kind living further away left the hero standing among other monsters until AUTO switched off.
   const seek=['type','types','entity'].includes(this.autoTarget?.kind)||Number.isInteger(this.hunt)?Infinity:AUTO_SEEK;
   let m=this.target;if(!m||!this.prey(m)||distance(m,this.anchor)>AUTO_RANGE+1||distance(m,p)>seek+2){m=this.nearest(AUTO_RANGE);
    // 0.91 nothing left near where AUTO was switched on (e.g. turned on at the respawn yard): take the closest monster
    // within 30 m of the player and move the hunting spot there.
    if(!m){m=this.foes().filter(x=>x.hp>0&&this.prey(x)&&distance(x,p)<=seek).sort((a,b)=>distance(a,p)-distance(b,p))[0]??null;if(m)this.anchor={x:m.x,z:m.z};}
    this.targetId=m?.id??null;this.path=[];}
   // 0.97 nothing to hunt within 30 m for 25 s: AUTO switches itself off and says why, so the button never shows on while idle.
   // A picked kind that lives on this map is waited for (respawn) instead.
   const waits=seek===Infinity&&this.foes().some(x=>this.prey(x));
   if(m||waits)this.autoIdle=0;else if((this.autoIdle+=dt)>25){this.auto=false;this.autoIdle=0;this.notice('ปิด AUTO · ไม่พบมอนสเตอร์ในระยะ 30 ม.');}
   if(m){
    // 0.90 AUTO casts the skills ticked in the skill window when they are ready and in reach (one try every 0.5 s).
    this.autoCast=Math.max(0,this.autoCast-dt);
    if(this.autoCast===0&&!this.basicPending&&!this.legacyPending&&lineClear(p,m,this.nav)){this.roleGround=null;const i=this.roleCombat&&!this.roleCombat.legacy?this.roleCombat.autoIndex(this.autoConfig):pickAutoSkill(this,this.autoConfig,scaledSkill);if(i>=0&&this.skill(i)){this.autoCast=.5;advanceAutoSequence(this,this.autoConfig,i);}}
    const attackReach=this.autoConfig.rotation==='sequence'?Math.min(this.profession.range,this.autoSkillReach??Infinity):this.profession.range;
    if(reachTo(p,m)<=attackReach-.1&&lineClear(p,m,this.nav)){this.path=[];this.basicAttack(true);}
    else{
     // 0.99.11 open ground (nothing between us): walk straight at it and skip the grid search, which is the costly part
     if(this.pathTimer<=0){this.path=walkLineClear(p,m,this.nav)?[{x:m.x,z:m.z}]:findPath(p,m,this.nav);this.pathTimer=.65;}
     while(this.path.length&&distance(p,this.path[0])<.16)this.path.shift();
     const next=this.path[0];if(next){const d=distance(p,next)||1;const step=Math.min(d,speed*dt);p.face={x:(next.x-p.x)/d,z:(next.z-p.z)/d};moveBody(p,p.face.x*step,p.face.z*step,this.nav);}
    }
   }
  }
  p.moving=Math.hypot(p.x-ox,p.z-oz)>.001;p.running=p.moving&&manual&&wantsRun;
  if(!monsters)return; // Shared-room servers advance each monster exactly once per tick.
  const level=baseProgress(this).level; // 0.122 territory: a monster 15+ levels above attacks on approach
  for(const m of this.mobs){
   const baseType=MONSTER_TYPES[m.type],type=m.roleStatus?.slow||m.petSlow>0?{...baseType,speed:baseType.speed*(baseType.boss?.8:.5)}:baseType,decoy=m.roleStatus?.decoy,aim=decoy?{...p,x:p.x+1.2,hp:1}:this.status?.stealth>0&&!baseType.boss?null:p,outcome=advanceMonster(m,aim,type,dt,this.nav,{moveBody,lineClear,level});
   if(outcome==='respawn')this.emit('respawn',{id:m.id});
   if(m.justEnraged){m.justEnraged=false;this.notice(type.name+' โกรธจัด! · เร็วและแรงขึ้น');}
   if(outcome==='burst'&&Math.hypot(p.x-m.x,p.z-m.z)<=MONSTER_BEHAVIOUR[type.id].aoe&&this.takeMonsterHit(type,type.damage,m)&&p.hp===0){this.mobs.forEach(v=>v.aggro=false);break;}
   if(outcome==='slam'&&this.takeSlam(type,m,MONSTER_BEHAVIOUR[type.id].slam)&&p.hp===0){this.mobs.forEach(v=>v.aggro=false);break;}
   if(outcome==='hit'&&!m.roleStatus?.decoy){
    if(this.takeMonsterHit(type,type.damage,m)&&p.hp===0){this.mobs.forEach(v=>v.aggro=false);break;}
   }
  }
 }
}

// Online client prediction: move our own character every frame with the server's movement rule (moveBody + class speed)
// so walking is immediate and smooth. Server snapshots (10 Hz) only correct drift: snap on big jumps (dash, respawn),
// ease onto the server position whenever we are not steering (stopping, auto-pathing).
export function predictMove(world,server,dt,dir,{pendingStop=false,inputAge=0}={}){
 const p=world.player;if(p.hp<=0||!server)return;
 const ox=p.x,oz=p.z,knocked=world.knockStep(dt),manual=!knocked&&!held(world.status)&&Math.hypot(dir.x,dir.z)>.08,speed=world.walkSpeed(dir.run===true);
 if(Math.hypot(dir.x,dir.z)>.08||dir.attack)world.clearEmote();
 if(manual){const n=Math.max(1,Math.hypot(dir.x,dir.z));moveBody(p,dir.x/n*speed*dt,dir.z/n*speed*dt,world.nav);p.face={x:dir.x,z:dir.z};}

 const ex=server.x-p.x,ez=server.z-p.z,error=Math.hypot(ex,ez);
 // In-flight input can legitimately put us ahead of an older snapshot.
 // When switching from run to walk, an in-flight snapshot still belongs to
 // the faster stride. Do not shrink its legitimate lead to the new pace yet.
 const transitSpeed=Math.max(speed,world.walkSpeed(server.running===true));
 const snapDistance=manual?Math.max(2.5,transitSpeed*(Math.min(.75,Math.max(0,inputAge))+.1+dt)):2.5;
 if(error>snapDistance&&(!pendingStop||!server.moving||knocked)){p.x=server.x;p.z=server.z;}
 else if(!manual&&(!pendingStop||knocked)&&error>.002){const f=1-Math.exp(-dt*10);p.x+=ex*f;p.z+=ez*f;if(server.moving)p.face=server.face;}
 // Old walking snapshots must not pull a released player backwards. Once the
 // stop is acknowledged, settling an idle position must not restart the walk art.
 p.moving=Math.hypot(p.x-ox,p.z-oz)>.001&&(manual||!pendingStop&&server.moving);
 p.running=p.moving&&(manual?dir.run===true:server.running===true);
}
