import {REBIRTH_MONSTER_SPECS} from './rebirth-content196.js';
import {CHAPTER2_MONSTERS,CHAPTER2_BEHAVIOUR} from './chapter2-monsters.js';
// Append-only IDs preserve existing saves and test fixtures (legacy IDs 0–3).
export const FRONTIER_MONSTERS=[
 {id:'straw',name:'หุ่นฟางหลง',hp:133,speed:.85,damage:10,baseXp:40,jobXp:26,level:12,sheet:'field-monsters',row:0,height:1.65},
 {id:'rat',name:'หนูยุ้งข้าว',hp:100,speed:1.7,damage:8,baseXp:32,jobXp:20,level:10,sheet:'field-monsters',row:1,height:1.05},
 {id:'hopper',name:'ตั๊กแตนเกราะ',hp:194,speed:1.3,damage:13,baseXp:53,jobXp:32,level:15,sheet:'field-monsters',row:2,height:1.2},
 {id:'monkey',name:'ลูกลิงฉกของ',hp:325,speed:1.9,damage:19,baseXp:77,jobXp:46,level:20,sheet:'orchard-monsters',row:0,height:1.4},
 {id:'vine',name:'เถาวัลย์พันขา',hp:422,speed:.7,damage:23,baseXp:93,jobXp:55,level:23,sheet:'orchard-monsters',row:1,height:1.5},
 {id:'lantern',name:'โคมหลงทาง',hp:532,speed:1.1,damage:27,baseXp:110,jobXp:66,level:26,sheet:'orchard-monsters',row:2,height:1.6},
 {id:'rat-chief',name:'พญาหนูยุ้งข้าว',hp:1026,speed:1.2,damage:29,baseXp:327,jobXp:183,level:20,sheet:'elite-monsters',row:0,height:2.15,elite:true,respawn:40},
 {id:'monkey-chief',name:'วานรเจ้าเล่ห์',hp:1173,speed:1.65,damage:37,baseXp:401,jobXp:231,level:30,sheet:'elite-monsters',row:1,height:2.2,elite:true,respawn:45},
 {id:'mill-keeper',name:'เจ้าหุ่นฟางพันเชือก',hp:3366,speed:.75,damage:62,baseXp:1278,jobXp:767,level:38,sheet:'elite-monsters',row:2,height:3.3,boss:true,respawn:70,reach:2.6,windup:.85},
 // 0.49: party-dungeon boss (ใต้ถุนโรงสีต้องสาป, never respawns inside the instance) and the timed MVP of โรงสีใต้เงาจันทร์.
 // Own art since 0.54: assets/frontier38/boss-monsters (re-gridded from the ChatGPT bosses49 hand-off).
 // 0.123 owner: ใต้ถุนโรงสี has no boss now; clearing it rolls this table once a day (clearReward)
 {id:'lantern-lord',clearReward:'mill-cellar',name:'เจ้าโคมวิญญาณ',hp:8108,speed:.9,damage:75,baseXp:2411,jobXp:1406,level:42,sheet:'boss-monsters',row:0,height:3.2,boss:true,respawn:70,reach:2.4,windup:.8},
 {id:'straw-king',name:'ราชาหุ่นฟางเพลิง',hp:7000,speed:.8,damage:34,baseXp:2600,jobXp:1500,level:30,sheet:'boss-monsters',row:1,height:4.4,boss:true,mvp:true,respawn:3600,reach:3,windup:.9,pctHit:{tank:.2,min:.2,max:.3}},
 // 0.60 บึงบัวต้องมนตร์ (Lv. 25–35): stronger variants drawn with existing rows, larger.
 {id:'marsh-rat',name:'หนูบึงยักษ์',hp:1108,speed:1.8,damage:45,baseXp:190,jobXp:109,level:38,sheet:'field-monsters',row:1,height:1.45},
 {id:'bog-hopper',name:'ตั๊กแตนหนองน้ำ',hp:1286,speed:1.4,damage:50,baseXp:213,jobXp:120,level:41,sheet:'field-monsters',row:2,height:1.6},
 {id:'lotus-vine',name:'เถาบัวพันขา',hp:1412,speed:.8,damage:54,baseXp:229,jobXp:131,level:43,sheet:'orchard-monsters',row:1,height:1.9},
 {id:'bog-lantern',name:'โคมผีบึง',hp:1544,speed:1.15,damage:58,baseXp:245,jobXp:143,level:45,sheet:'orchard-monsters',row:2,height:2},
 {id:'marsh-ape',name:'พญาวานรบึง',hp:2640,speed:1.7,damage:81,baseXp:986,jobXp:559,level:47,sheet:'elite-monsters',row:1,height:2.7,elite:true,respawn:60},
 // 0.102 ร่างทรง (awakened): the old camp bosses return at Lv.60–95, one per field map, every 30 minutes, announced server-wide
 {id:'rat-chief-awakened',name:'ร่างทรงพญาหนูยุ้งข้าว',hp:20000,speed:1.4,damage:90,baseXp:1200,jobXp:700,level:60,sheet:'elite-monsters',row:0,height:3,boss:true,awakened:true,respawn:1800,reach:2.2,windup:.8},
 {id:'monkey-chief-awakened',name:'ร่างทรงวานรเจ้าเล่ห์',hp:30000,speed:1.9,damage:115,baseXp:1600,jobXp:900,level:70,sheet:'elite-monsters',row:1,height:3.1,boss:true,awakened:true,respawn:1800,reach:2.2,windup:.8},
 {id:'mill-keeper-awakened',name:'ร่างทรงเจ้าหุ่นฟางพันเชือก',hp:45000,speed:.9,damage:150,baseXp:2200,jobXp:1300,level:82,sheet:'elite-monsters',row:2,height:4.2,boss:true,awakened:true,respawn:1800,reach:3,windup:.9},
 {id:'marsh-ape-awakened',name:'ร่างทรงพญาวานรบึง',hp:60000,speed:1.9,damage:190,baseXp:3000,jobXp:1800,level:95,sheet:'elite-monsters',row:1,height:3.6,boss:true,awakened:true,respawn:1800,reach:2.4,windup:.8}
];
FRONTIER_MONSTERS.push(...CHAPTER2_MONSTERS);
// 0.123 owner: the first farm map is Lv.10–22 and every map after it steps up (docs: maps/world.json levels). Maps that
// shared a monster with an easier one get a local variant: same art, behaviour and drops, its own level and stats.
// Append-only (spawns point at catalog indices). Stats follow one curve: HP 0.75L²+25, damage L(0.8+0.5(L-10)/36),
// EXP 0.12L²+2L(46-L)/36, meeting the chapter-2 formula at Lv.46; elites and bosses keep their old ratio to it.
export const MAP_VARIANTS=[
 {variantOf:'straw',id:'mill-straw',name:'หุ่นฟางโรงสี',level:29,hp:656,damage:31,baseXp:128,jobXp:82},
 {variantOf:'vine',id:'mill-vine',name:'เถาวัลย์โรงสี',level:32,hp:793,damage:35,baseXp:148,jobXp:88},
 {variantOf:'lantern',id:'mill-lantern',name:'โคมโรงสีจันทร์',level:35,hp:944,damage:40,baseXp:168,jobXp:100},
 {variantOf:'vine',id:'cellar-vine',name:'เถาวัลย์ใต้ถุน',level:34,hp:892,damage:39,baseXp:161,jobXp:96},
 {variantOf:'lantern',id:'cellar-lantern',name:'โคมใต้ถุนโรงสี',level:37,hp:1052,damage:43,baseXp:183,jobXp:109},
 {variantOf:'rat-chief',id:'cellar-rat-chief',name:'พญาหนูใต้ถุน',level:38,hp:3499,damage:71,baseXp:809,jobXp:452},
 {variantOf:'monkey-chief',id:'cellar-monkey-chief',name:'วานรใต้ถุน',level:40,hp:2052,damage:56,baseXp:611,jobXp:353},
 // the prologue's five tutorial kills keep the old Lv.1–2 field monsters
 {variantOf:'straw',id:'vision-straw',name:'หุ่นฟางหลง',level:2,hp:52,damage:5,baseXp:14,jobXp:9},
 {variantOf:'rat',id:'vision-rat',name:'หนูยุ้งข้าว',level:1,hp:38,damage:4,baseXp:11,jobXp:7}
];
for(const spec of REBIRTH_MONSTER_SPECS){const art=FRONTIER_MONSTERS.find(m=>m.id===spec.proxyId);if(!art)throw Error('Missing rebirth art proxy '+spec.proxyId);FRONTIER_MONSTERS.push({...spec,sheet:art.sheet,row:art.row,chapter2Art:art.chapter2Art,artProxy:spec.proxyId});}
for(const v of MAP_VARIANTS)FRONTIER_MONSTERS.push({...FRONTIER_MONSTERS.find(m=>m.id===v.variantOf),...v});
// Presentation timing is independent of frame rate and authoritative world position.
export function monsterFrame(m,time){
 if(m.hp<=0)return 7;
 if(m.hit>0&&!m.armor)return m.hit>.14?5:6;
 if(m.windup>0)return 3;
 if(m.strike>0)return 4;
 if(m.moving)return 1+(Math.floor((m.step??time*7)*1.4)%2);
 return 0;
}
export function markMonsterHit(m,source){
 m.aggro=true;m.pressure=(m.pressure??0)+1;m.engaged=ENGAGED;
 // 0.111 bosses wear super armor: a short flash, no hurt pose, no recoil and no lost turn, so a party can't stun-lock them.
 if(m.armor){m.hit=.12;m.recoil=null;return;}
 const dx=m.x-source.x,dz=m.z-source.z,d=Math.hypot(dx,dz)||1;
 m.hit=.34;m.recoil={x:dx/d,z:dz/d};
}
// 0.58 behaviours (shared by the offline world and the realm server), set per monster in MONSTER_BEHAVIOUR:
//  aoe: the wind-up ends in a burst around the monster ('burst' outcome, every player inside is hit; step out to dodge)
//  skirmish: after landing a hit it hops back (0.123: at most SKIRMISH_HOP s, it used to run off for 1–1.4 s) · leap: jumps in when the target is 3–6 away
//  enrage: below 40% HP it moves faster and winds up sooner
//  slam (0.111 bosses): after `hits` hits taken it answers with a ground slam: a wider red ring, then everyone inside
//   is hit for max(damage×power, maxHp×pct) and knocked `push` m away from it ('slam' outcome). `cd` s between slams.
const slam=(radius,push,power,pct,hits,cd)=>({radius,push,power,pct,hits,cd,windup:1.15});
export const MONSTER_BEHAVIOUR={'bog-hopper':{leap:true},'bog-lantern':{aoe:2.4,windup:.9},'marsh-ape':{skirmish:1.2,enrage:true},lantern:{aoe:2.2,windup:.9},monkey:{skirmish:1.4},'monkey-chief':{skirmish:1.2,enrage:true},hopper:{leap:true},
 'rat-chief':{enrage:true},'mill-keeper':{aoe:2.8,enrage:true,slam:slam(4.2,3.2,1.5,.08,9,7)},'lantern-lord':{aoe:3.2,windup:1,enrage:true,slam:slam(4.6,3.4,1.6,.1,8,6.5)},'straw-king':{aoe:3.4,windup:1.1,enrage:true,slam:slam(5,4,1.8,.12,7,6)},
 'rat-chief-awakened':{enrage:true,slam:slam(4,3.2,1.4,.08,9,7)},'monkey-chief-awakened':{skirmish:1.2,enrage:true,slam:slam(4.2,3.4,1.5,.09,8,6.5)},'mill-keeper-awakened':{aoe:3.2,windup:1,enrage:true,slam:slam(4.6,3.6,1.6,.1,8,6.5)},'marsh-ape-awakened':{skirmish:1.2,enrage:true,slam:slam(4.6,3.8,1.6,.1,8,6)}};
export const BOSS_SIGHT=10,BOSS_GIVE_UP=25;
Object.assign(MONSTER_BEHAVIOUR,CHAPTER2_BEHAVIOUR);
for(const v of MAP_VARIANTS)if(MONSTER_BEHAVIOUR[v.variantOf])MONSTER_BEHAVIOUR[v.id]=MONSTER_BEHAVIOUR[v.variantOf];
for(const m of REBIRTH_MONSTER_SPECS)MONSTER_BEHAVIOUR[m.id]=m.boss?{enrage:true,slam:slam(5,3,1.4,.08,9,8)}:m.elite?{enrage:true}:{};
// 0.122 territory and strolling (owner-approved numbers): a monster 15+ levels above the player attacks anyone who
// comes within 5 m of it while inside its 9 m leash; an idle ordinary monster strolls within 4 m of home at 40% speed,
// resting 3–7 s between walks. `level` is the target player's base level (null: no territory check).
// 0.123 a monster hit in the last ENGAGED seconds keeps fighting out to `chase` m from home (owner: they walked off mid-fight)
export const ENGAGED=5,SKIRMISH_HOP=.5;
export const TERRITORY={gap:15,range:5,leash:9,chase:20},STROLL={radius:4,pace:.4,rest:[3,7],timeout:6};
export function advanceMonster(m,target,type,dt,nav,{moveBody,lineClear,level=null}){
 m.hit=Math.max(0,m.hit-dt);m.root=Math.max(0,m.root-dt);m.attackCD=Math.max(0,m.attackCD-dt);m.strike=Math.max(0,(m.strike??0)-dt);m.moving=false;
 m.flee=Math.max(0,(m.flee??0)-dt);m.engaged=Math.max(0,(m.engaged??0)-dt);m.leapCD=Math.max(0,(m.leapCD??0)-dt);
 m.slamCD=Math.max(0,(m.slamCD??0)-dt);m.pressure=Math.max(0,(m.pressure??0)-dt*.4);if(type.boss)m.armor=true;
 const b=MONSTER_BEHAVIOUR[type.id]??{},rage=b.enrage&&m.hp>0&&m.hp<m.maxHp*.4;
 if(rage&&!m.enraged){m.enraged=true;m.justEnraged=true;}if(m.hp>=m.maxHp*.4)m.enraged=false;
 if(m.hp<=0){m.dead-=dt;if(m.dead<=0){Object.assign(m,{...m.home,hp:m.maxHp,aggro:false,root:0,hit:0,windup:0,strike:0,attackCD:1,slamming:false,pressure:0});return 'respawn';}return;}
 // 0.111.3 a boss is a boss: it picks a fight with anyone within BOSS_SIGHT, chases without the 9 m leash and only gives
 // up (walking home) once its target is past BOSS_GIVE_UP; other monsters keep the old wait-until-hit + leash rule.
 if(type.boss){if(!target)m.aggro=false;else{const td=Math.hypot(m.x-target.x,m.z-target.z);if(td<=BOSS_SIGHT)m.aggro=true;else if(td>BOSS_GIVE_UP)m.aggro=false;}}
 else{
  if(!m.aggro&&target&&Number.isFinite(level)&&(type.level??1)-level>=TERRITORY.gap&&Math.hypot(m.x-target.x,m.z-target.z)<=TERRITORY.range&&Math.hypot(target.x-m.home.x,target.z-m.home.z)<=TERRITORY.leash)m.aggro=true;
  if(!target||Math.hypot(m.x-m.home.x,m.z-m.home.z)>(m.engaged>0?TERRITORY.chase:TERRITORY.leash))m.aggro=false;
 }
 if(m.hit>.26&&!(m.windup>0))return;
 let goal=m.aggro&&target?target:m.home;
 const strolling=!(m.aggro&&target)&&!type.boss&&Math.hypot(m.x-m.home.x,m.z-m.home.z)<=STROLL.radius+1;
 if(!strolling)m.stroll=null;
 else{
  m.rest=Math.max(0,(m.rest??STROLL.rest[0]*Math.random())-dt);
  if(!m.stroll&&m.rest===0){const a=Math.random()*Math.PI*2,r=Math.sqrt(Math.random())*STROLL.radius;m.stroll={x:m.home.x+Math.cos(a)*r,z:m.home.z+Math.sin(a)*r,left:STROLL.timeout};}
  if(m.stroll){m.stroll.left-=dt;if(m.stroll.left<=0||Math.hypot(m.stroll.x-m.x,m.stroll.z-m.z)<=.2){m.stroll=null;m.rest=STROLL.rest[0]+Math.random()*(STROLL.rest[1]-STROLL.rest[0]);}}
  goal=m.stroll??m;
 }
 const dx=goal.x-m.x,dz=goal.z-m.z,d=Math.hypot(dx,dz),reach=type.reach??1.35;
 // Hit often enough, a boss drops whatever it was winding up and answers with a slam (enraged: sooner, every 2/3 of the cooldown).
 if(b.slam&&m.aggro&&target&&m.slamCD===0&&!m.slamming&&m.pressure>=b.slam.hits*(rage?.6:1)){m.slamming=true;m.windup=b.slam.windup;m.pressure=0;m.slamCD=b.slam.cd*(rage?.67:1);return;}
 if(m.windup>0){m.windup=Math.max(0,m.windup-dt*(rage?1.4:1));if(m.windup===0){m.strike=.24;m.attackCD=rage?1:1.4;if(m.slamming){m.slamming=false;return 'slam';}if(b.aoe)return 'burst';if(target&&Math.hypot(m.x-target.x,m.z-target.z)<=reach&&lineClear(m,target,nav)){if(b.skirmish)m.flee=Math.min(b.skirmish,SKIRMISH_HOP);return 'hit';}}return;}
 const speed=type.speed*(rage?1.35:1);
 if(m.flee>0&&target&&m.root===0){const away=Math.hypot(m.x-target.x,m.z-target.z)||1;moveBody(m,(m.x-target.x)/away*speed*1.2*dt,(m.z-target.z)/away*speed*1.2*dt,nav);m.step+=dt*9;m.moving=true;return;}
 if(b.leap&&m.aggro&&target&&m.root===0&&m.leapCD===0&&d>3&&d<6&&lineClear(m,target,nav)){moveBody(m,dx/d*(d-reach*.8),dz/d*(d-reach*.8),nav);m.leapCD=4;m.attackCD=Math.min(m.attackCD,.3);return 'leap';}
 if(m.aggro&&target&&d<=reach&&m.attackCD===0&&lineClear(m,target,nav)){m.windup=b.windup??type.windup??.45;return;}
 if(m.root===0&&d>(m.aggro?reach*.76:.12)){const step=Math.min(d,speed*(goal===m.stroll?STROLL.pace:1)*dt);moveBody(m,dx/d*step,dz/d*step,nav);m.step+=dt*7;m.moving=true;}
}
