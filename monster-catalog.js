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
 // Both reuse existing sprite rows at a larger size until their own art lands.
 {id:'lantern-lord',name:'เจ้าโคมวิญญาณ',hp:3200,speed:.9,damage:26,baseXp:1200,jobXp:700,level:26,sheet:'orchard-monsters',row:2,height:3.2,boss:true,respawn:70,reach:2.4,windup:.8},
 {id:'straw-king',name:'ราชาหุ่นฟางเพลิง',hp:7000,speed:.8,damage:34,baseXp:2600,jobXp:1500,level:30,sheet:'elite-monsters',row:2,height:4.4,boss:true,mvp:true,respawn:3600,reach:3,windup:.9}
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
export function advanceMonster(m,target,type,dt,nav,{moveBody,lineClear}){
 m.hit=Math.max(0,m.hit-dt);m.root=Math.max(0,m.root-dt);m.attackCD=Math.max(0,m.attackCD-dt);m.strike=Math.max(0,(m.strike??0)-dt);m.moving=false;
 if(m.hp<=0){m.dead-=dt;if(m.dead<=0){Object.assign(m,{...m.home,hp:m.maxHp,aggro:false,root:0,hit:0,windup:0,strike:0,attackCD:1});return 'respawn';}return;}
 if(!target||Math.hypot(m.x-m.home.x,m.z-m.home.z)>9)m.aggro=false;
 if(m.hit>.26&&!(m.windup>0))return;
 const goal=m.aggro&&target?target:m.home,dx=goal.x-m.x,dz=goal.z-m.z,d=Math.hypot(dx,dz),reach=type.reach??1.35;
 if(m.windup>0){m.windup=Math.max(0,m.windup-dt);if(m.windup===0){m.strike=.24;m.attackCD=1.4;if(target&&Math.hypot(m.x-target.x,m.z-target.z)<=reach&&lineClear(m,target,nav))return 'hit';}return;}
 if(m.aggro&&target&&d<=reach&&m.attackCD===0&&lineClear(m,target,nav)){m.windup=type.windup??.45;return;}
 if(m.root===0&&d>(m.aggro?reach*.76:.12)){const step=Math.min(d,type.speed*dt);moveBody(m,dx/d*step,dz/d*step,nav);m.step+=dt*7;m.moving=true;}
}
