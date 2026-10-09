import {getClass,classSkills} from './classes.js';
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
 {name:'หมูป่าหลงทาง',hp:78,speed:1.1,damage:7},
 {name:'ภูตมอส',hp:60,speed:.9,damage:6},
 {name:'คางคกใบบัว',hp:65,speed:1,damage:6},
 {name:'ไหผีจอมซน',hp:90,speed:.8,damage:8}
];
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
export function walkable(x,z,r=.28,nav=DEFAULT_NAV){
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
// Grid A* routes auto-chase around houses. Manual movement always overrides it.
export function findPath(start,goal,nav=DEFAULT_NAV){
 const cell=.5,key=(x,z)=>`${x},${z}`,startX=Math.round(start.x/cell),startZ=Math.round(start.z/cell);
 const open=[{x:startX,z:startZ,g:0,f:0,parent:null}],best=new Map([[key(startX,startZ),0]]);let end=null;
 for(let iterations=0;open.length&&iterations<6000;iterations++){
  open.sort((a,b)=>b.f-a.f);const cur=open.pop();
  if(best.get(key(cur.x,cur.z))<cur.g)continue;
  if(Math.hypot(cur.x*cell-goal.x,cur.z*cell-goal.z)<.7){end=cur;break;}
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
   const x=cur.x+dx,z=cur.z+dz;
   if(!walkable(x*cell,z*cell,.32,nav))continue;
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
export class CombatWorld{
 constructor(config={}){
  this.profession=getClass(config.classId??'shaman');this.skills=classSkills(this.profession.id,SKILLS);
  this.nav=config.nav??DEFAULT_NAV;this.spawn=config.spawn??{x:-1.8,z:1.2};this.safe=!!config.safe;
  this.player={...this.spawn,hp:140,maxHp:140,mp:100,maxMp:100,shield:0,attackCD:0,down:0,moving:false,face:{x:1,z:0}};
  this.mobs=(config.mobs??[[2,.3,0],[5,1,1],[1,-3.6,2],[-3.7,-2.9,3],[5.3,-5.2,1],[-6.5,1.8,0]]).map(([x,z,type],id)=>({id,type,x,z,home:{x,z},hp:MONSTER_TYPES[type].hp,maxHp:MONSTER_TYPES[type].hp,attackCD:0,root:0,dead:0,hit:0,aggro:false,step:0}));
  this.targetId=null;this.auto=false;this.anchor={x:0,z:0};this.cooldowns=SKILLS.map(()=>0);this.events=[];this.path=[];this.pathTimer=0;this.manualGrace=0;this.kills=0;this.time=0;
 }
 get target(){return this.mobs.find(m=>m.id===this.targetId&&m.hp>0)??null;}
 emit(type,extra={}){this.events.push({type,...extra});}
 notice(text){this.emit('notice',{text});}
 select(id){const mob=this.mobs.find(m=>m.id===id&&m.hp>0);if(!mob)return;this.targetId=id;this.path=[];this.pathTimer=0;this.emit('select',{id});}
 nearest(range=8){return this.mobs.filter(m=>m.hp>0&&distance(m,this.player)<=range&&(!this.auto||distance(m,this.anchor)<=8)).sort((a,b)=>distance(a,this.player)-distance(b,this.player))[0]??null;}
 toggleAuto(){if(this.safe){this.notice('เมืองหลวงเป็นเขตสงบ');return false;}if(this.player.hp<=0){this.notice('รอกลับถึงลานก่อน');return false;}this.auto=!this.auto;this.anchor={x:this.player.x,z:this.player.z};this.path=[];this.pathTimer=0;this.notice(this.auto?'AUTO เปิด · เดินเองเพื่อหยุดไล่':'AUTO ปิด');return this.auto;}
 hurt(mob,damage,color='#fff0a6'){
  if(!mob||mob.hp<=0)return;mob.hp=Math.max(0,mob.hp-damage);mob.hit=.16;mob.aggro=true;
  this.emit('damage',{id:mob.id,x:mob.x,z:mob.z,amount:damage,color});
  if(mob.hp===0){mob.dead=8;mob.aggro=false;this.kills++;this.emit('defeat',{id:mob.id,x:mob.x,z:mob.z});if(this.targetId===mob.id){this.targetId=null;this.path=[];}}
 }
 basicAttack(quiet=false){
  const p=this.player;if(p.hp<=0||p.attackCD>0)return false;
  let m=this.target;if(!m){m=this.nearest(this.profession.range);if(m)this.select(m.id);}
  if(!m){if(!quiet)this.notice('เลือกมอนสเตอร์ หรือเข้าใกล้ก่อนโจมตี');return false;}
  if(distance(p,m)>this.profession.range||!lineClear(p,m,this.nav)){if(!quiet)this.notice('เข้าใกล้เป้าหมายอีกนิด หรือเปิด AUTO');return false;}
  p.attackCD=this.profession.delay;p.face={x:m.x-p.x,z:m.z-p.z};this.emit('cast',{from:{x:p.x,z:p.z},to:{x:m.x,z:m.z},color:this.profession.color,kind:this.profession.kind});this.hurt(m,this.profession.damage);return true;
 }
 skill(index){
  const s=this.skills[index],p=this.player;if(!s||p.hp<=0)return false;
  if(this.cooldowns[index]>0){this.notice('สกิลยังไม่พร้อม');return false;}
  if(p.mp<s.cost){this.notice('มานาไม่พอ');return false;}
  let m=this.target;
  if(s.range){m=m??this.nearest(s.range);if(!m||distance(p,m)>s.range||!lineClear(p,m,this.nav)){this.notice('เลือกมอนสเตอร์ในระยะสกิล');return false;}this.select(m.id);p.face={x:m.x-p.x,z:m.z-p.z};}
  p.mp-=s.cost;this.cooldowns[index]=s.cd;
  if(s.type==='heal'){p.hp=Math.min(p.maxHp,p.hp+(s.heal??48));this.emit('heal',{x:p.x,z:p.z,amount:s.heal??48,color:s.color});}
  else if(s.type==='shield'){p.shield=s.duration??8;this.notice(s.name+' · ลดความเสียหาย '+p.shield+' วินาที');}
  else if(s.type==='mana'){p.mp=Math.min(p.maxMp,p.mp+48);this.notice(s.name+' · มานา +48');}
  else if(s.type==='dash'){const n=Math.hypot(p.face.x,p.face.z)||1;moveBody(p,p.face.x/n*2.8,p.face.z/n*2.8,this.nav);this.manualGrace=.7;this.path=[];}
  else if(s.type==='nova'){this.mobs.filter(v=>v.hp>0&&distance(v,p)<=s.radius&&lineClear(p,v,this.nav)).forEach(v=>this.hurt(v,s.damage,s.color));}
  else if(s.type==='area'){this.mobs.filter(v=>v.hp>0&&distance(v,m)<=s.radius&&lineClear(m,v,this.nav)).forEach(v=>this.hurt(v,s.damage,s.color));}
  else{this.hurt(m,s.damage,s.color);if(s.type==='root')m.root=3.5;if(s.type==='push'){const n=distance(p,m)||1;moveBody(m,(m.x-p.x)/n*1.8,(m.z-p.z)/n*1.8,this.nav);}}
  this.emit('cast',{from:{x:p.x,z:p.z},to:m?{x:m.x,z:m.z}:{x:p.x,z:p.z},color:s.color,kind:s.type,radius:s.radius??1});return true;
 }
 update(dt,input={x:0,z:0,attack:false}){
  dt=Math.min(.05,Math.max(0,dt));this.time+=dt;const p=this.player;
  p.attackCD=Math.max(0,p.attackCD-dt);p.shield=Math.max(0,p.shield-dt);p.mp=Math.min(p.maxMp,p.mp+3.2*dt);
  this.cooldowns=this.cooldowns.map(t=>Math.max(0,t-dt));this.manualGrace=Math.max(0,this.manualGrace-dt);this.pathTimer-=dt;
  if(p.hp<=0){p.down-=dt;if(p.down<=0){Object.assign(p,{...this.spawn,hp:p.maxHp,mp:p.maxMp,shield:0});this.notice('กลับถึงลานแล้ว · ลองใหม่ได้เลย');}return;}
  if(this.safe)p.hp=Math.min(p.maxHp,p.hp+8*dt);
  const ox=p.x,oz=p.z,manual=Math.hypot(input.x,input.z)>.08;
  if(manual){const n=Math.max(1,Math.hypot(input.x,input.z));moveBody(p,input.x/n*this.profession.speed*dt,input.z/n*this.profession.speed*dt,this.nav);p.face={x:input.x,z:input.z};this.path=[];this.manualGrace=.8;}
  if(input.attack)this.basicAttack(true);
  if(this.auto&&!manual&&this.manualGrace===0){
   let m=this.target;if(!m||distance(m,this.anchor)>9||distance(m,p)>10){m=this.nearest(8);this.targetId=m?.id??null;this.path=[];}
   if(m){
    if(distance(p,m)<=this.profession.range-.1&&lineClear(p,m,this.nav)){this.path=[];this.basicAttack(true);}
    else{
     if(this.pathTimer<=0){this.path=findPath(p,m,this.nav);this.pathTimer=.65;}
     while(this.path.length&&distance(p,this.path[0])<.16)this.path.shift();
     const next=this.path[0];if(next){const d=distance(p,next)||1;const step=Math.min(d,this.profession.speed*dt);p.face={x:(next.x-p.x)/d,z:(next.z-p.z)/d};moveBody(p,p.face.x*step,p.face.z*step,this.nav);}
    }
   }
  }
  p.moving=Math.hypot(p.x-ox,p.z-oz)>.001;
  for(const m of this.mobs){
   m.hit=Math.max(0,m.hit-dt);m.root=Math.max(0,m.root-dt);m.attackCD=Math.max(0,m.attackCD-dt);
   if(m.hp<=0){m.dead-=dt;if(m.dead<=0){Object.assign(m,{x:m.home.x,z:m.home.z,hp:m.maxHp,aggro:false,root:0,attackCD:1});this.emit('respawn',{id:m.id});}continue;}
   const type=MONSTER_TYPES[m.type];
   if(m.aggro&&distance(m,m.home)>6){m.aggro=false;}
   const goal=m.aggro?p:m.home,d=distance(m,goal);
   if(m.root===0&&d>(m.aggro?1.05:.12)){const speed=type.speed*dt;moveBody(m,(goal.x-m.x)/d*speed,(goal.z-m.z)/d*speed,this.nav);m.step+=dt*7;}
   if(m.aggro&&distance(m,p)<1.35&&lineClear(m,p,this.nav)&&m.attackCD===0){
    m.attackCD=1.4;const damage=p.shield>0?Math.ceil(type.damage*.35):type.damage;p.hp=Math.max(0,p.hp-damage);this.emit('playerHit',{x:p.x,z:p.z,amount:damage});
    if(p.hp===0){p.down=3;this.auto=false;this.targetId=null;this.path=[];p.moving=false;this.mobs.forEach(v=>v.aggro=false);this.notice('หมดแรง · กลับลานใน 3 วินาที');break;}
   }
  }
 }
}
