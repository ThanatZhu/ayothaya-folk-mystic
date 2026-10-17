// Append-only IDs preserve existing saves and test fixtures (legacy IDs 0–3).
export const FRONTIER_MONSTERS=[
 {id:'straw',name:'หุ่นฟางหลง',hp:52,speed:.85,damage:5,baseXp:14,jobXp:9,level:2,sheet:'field-monsters',row:0,height:1.65},
 {id:'rat',name:'หนูยุ้งข้าว',hp:38,speed:1.7,damage:4,baseXp:11,jobXp:7,level:1,sheet:'field-monsters',row:1,height:1.05},
 {id:'hopper',name:'ตั๊กแตนเกราะ',hp:70,speed:1.3,damage:6,baseXp:20,jobXp:12,level:5,sheet:'field-monsters',row:2,height:1.2},
 {id:'monkey',name:'ลูกลิงฉกของ',hp:100,speed:1.9,damage:8,baseXp:35,jobXp:21,level:10,sheet:'orchard-monsters',row:0,height:1.4},
 {id:'vine',name:'เถาวัลย์พันขา',hp:125,speed:.7,damage:9,baseXp:42,jobXp:25,level:13,sheet:'orchard-monsters',row:1,height:1.5},
 {id:'lantern',name:'โคมหลงทาง',hp:145,speed:1.1,damage:11,baseXp:52,jobXp:31,level:17,sheet:'orchard-monsters',row:2,height:1.6},
 {id:'rat-chief',name:'พญาหนูยุ้งข้าว',hp:420,speed:1.2,damage:15,baseXp:170,jobXp:95,level:12,sheet:'elite-monsters',row:0,height:2.15,elite:true,respawn:40},
 {id:'monkey-chief',name:'วานรเจ้าเล่ห์',hp:650,speed:1.65,damage:18,baseXp:260,jobXp:150,level:22,sheet:'elite-monsters',row:1,height:2.2,elite:true,respawn:45},
 {id:'mill-keeper',name:'เจ้าหุ่นฟางพันเชือก',hp:1500,speed:.75,damage:24,baseXp:700,jobXp:420,level:25,sheet:'elite-monsters',row:2,height:3.3,boss:true,respawn:70,reach:2.6,windup:.85},
 // 0.49: party-dungeon boss (ใต้ถุนโรงสีต้องสาป, never respawns inside the instance) and the timed MVP of โรงสีใต้เงาจันทร์.
 // Own art since 0.54: assets/frontier38/boss-monsters (re-gridded from the ChatGPT bosses49 hand-off).
 {id:'lantern-lord',name:'เจ้าโคมวิญญาณ',hp:3200,speed:.9,damage:26,baseXp:1200,jobXp:700,level:26,sheet:'boss-monsters',row:0,height:3.2,boss:true,respawn:70,reach:2.4,windup:.8},
 {id:'straw-king',name:'ราชาหุ่นฟางเพลิง',hp:7000,speed:.8,damage:34,baseXp:2600,jobXp:1500,level:30,sheet:'boss-monsters',row:1,height:4.4,boss:true,mvp:true,respawn:3600,reach:3,windup:.9}
];
// Presentation timing is independent of frame rate and authoritative world position.
export function monsterFrame(m,time){
 if(m.hp<=0)return 7;
 if(m.hit>0)return m.hit>.14?5:6;
 if(m.windup>0)return 3;
 if(m.strike>0)return 4;
 if(m.moving)return 1+(Math.floor((m.step??time*7)*1.4)%2);
 return 0;
}
export function markMonsterHit(m,source){
 const dx=m.x-source.x,dz=m.z-source.z,d=Math.hypot(dx,dz)||1;
 m.hit=.34;m.recoil={x:dx/d,z:dz/d};m.aggro=true;
}
// 0.58 behaviours (shared by the offline world and the realm server), set per monster in MONSTER_BEHAVIOUR:
//  aoe: the wind-up ends in a burst around the monster ('burst' outcome, every player inside is hit; step out to dodge)
//  skirmish: after landing a hit it runs away for a moment · leap: jumps in when the target is 3–6 away
//  enrage: below 40% HP it moves faster and winds up sooner
export const MONSTER_BEHAVIOUR={lantern:{aoe:2.2,windup:.9},monkey:{skirmish:1.4},'monkey-chief':{skirmish:1.2,enrage:true},hopper:{leap:true},
 'rat-chief':{enrage:true},'mill-keeper':{aoe:2.8,enrage:true},'lantern-lord':{aoe:3.2,windup:1,enrage:true},'straw-king':{aoe:3.4,windup:1.1,enrage:true}};
export function advanceMonster(m,target,type,dt,nav,{moveBody,lineClear}){
 m.hit=Math.max(0,m.hit-dt);m.root=Math.max(0,m.root-dt);m.attackCD=Math.max(0,m.attackCD-dt);m.strike=Math.max(0,(m.strike??0)-dt);m.moving=false;
 m.flee=Math.max(0,(m.flee??0)-dt);m.leapCD=Math.max(0,(m.leapCD??0)-dt);
 const b=MONSTER_BEHAVIOUR[type.id]??{},rage=b.enrage&&m.hp>0&&m.hp<m.maxHp*.4;
 if(rage&&!m.enraged){m.enraged=true;m.justEnraged=true;}if(m.hp>=m.maxHp*.4)m.enraged=false;
 if(m.hp<=0){m.dead-=dt;if(m.dead<=0){Object.assign(m,{...m.home,hp:m.maxHp,aggro:false,root:0,hit:0,windup:0,strike:0,attackCD:1});return 'respawn';}return;}
 if(!target||Math.hypot(m.x-m.home.x,m.z-m.home.z)>9)m.aggro=false;
 if(m.hit>.26&&!(m.windup>0))return;
 const goal=m.aggro&&target?target:m.home,dx=goal.x-m.x,dz=goal.z-m.z,d=Math.hypot(dx,dz),reach=type.reach??1.35;
 if(m.windup>0){m.windup=Math.max(0,m.windup-dt*(rage?1.4:1));if(m.windup===0){m.strike=.24;m.attackCD=rage?1:1.4;if(b.aoe)return 'burst';if(target&&Math.hypot(m.x-target.x,m.z-target.z)<=reach&&lineClear(m,target,nav)){if(b.skirmish)m.flee=b.skirmish;return 'hit';}}return;}
 const speed=type.speed*(rage?1.35:1);
 if(m.flee>0&&target&&m.root===0){const away=Math.hypot(m.x-target.x,m.z-target.z)||1;moveBody(m,(m.x-target.x)/away*speed*1.2*dt,(m.z-target.z)/away*speed*1.2*dt,nav);m.step+=dt*9;m.moving=true;return;}
 if(b.leap&&m.aggro&&target&&m.root===0&&m.leapCD===0&&d>3&&d<6&&lineClear(m,target,nav)){moveBody(m,dx/d*(d-reach*.8),dz/d*(d-reach*.8),nav);m.leapCD=4;m.attackCD=Math.min(m.attackCD,.3);return 'leap';}
 if(m.aggro&&target&&d<=reach&&m.attackCD===0&&lineClear(m,target,nav)){m.windup=b.windup??type.windup??.45;return;}
 if(m.root===0&&d>(m.aggro?reach*.76:.12)){const step=Math.min(d,speed*dt);moveBody(m,dx/d*step,dz/d*step,nav);m.step+=dt*7;m.moving=true;}
}
