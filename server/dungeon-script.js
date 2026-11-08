// Party dungeon room script, run by the realm every tick for rooms of a dungeon map (dungeons.js rooms[]).
// Rooms are areas of one map; content spawns from the run's state and a door moves the whole team to the next room.
import {MONSTER_TYPES,walkable} from '../combat-core.js';
import {dungeonById,monsterScale} from '../dungeons.js';
import {finishRun} from './dungeon-runs.js';

const TYPE=new Map(MONSTER_TYPES.map((t,i)=>[t.id,i]));
const near=(a,b,r)=>Math.hypot(a.x-b.x,a.z-b.z)<=r;
const LANTERN_REACH=1.5,EMPTY_RESET=60;
const inArea=(p,a)=>!!a&&p.x>=a.x&&p.x<=a.x+a.w&&p.z>=a.z&&p.z<=a.z+a.d;
export function spawnInRoom(room,typeId,at,scale){
 const t=TYPE.get(typeId),type=MONSTER_TYPES[t];let spot={x:at.x,z:at.z};
 search:for(let r=0;r<=6;r+=.5)for(let a=0;a<12;a++){const x=at.x+Math.cos(a/6*Math.PI)*r,z=at.z+Math.sin(a/6*Math.PI)*r;if(walkable(x,z,.28,room.map.nav)){spot={x,z};break search;}if(!r)break;}
 const hp=Math.max(1,Math.round(type.hp*scale.hp));
 const m={id:room.mobs.length,type:t,pack:null,leader:false,x:spot.x,z:spot.z,home:{...spot},hp,maxHp:hp,attackCD:0,root:0,dead:0,hit:0,aggro:true,step:0,power:scale.damage,rush:true};
 room.mobs.push(m);return m;
}
const despawn=m=>{if(m.hp>0){m.hp=0;m.dead=1e9;m.aggro=false;}};
export function teleport(p,at){Object.assign(p.world.player,{x:at.x,z:at.z,moving:false});p.world.path=[];}
const revive=p=>{const pl=p.world.player;if(pl.hp<=0){pl.hp=pl.maxHp;pl.down=0;p.world.status={};}};
const ring=(c,i,n,r=2.4)=>({x:c.x+Math.cos(i/n*Math.PI*2)*r,z:c.z+Math.sin(i/n*Math.PI*2)*r});
const mobsOf=(room,ids)=>ids.map(id=>room.mobs[id]).filter(Boolean);
const aliveOf=(room,ids)=>mobsOf(room,ids).filter(m=>m.hp>0);

export function dungeonRunView(run){
 const d=dungeonById(run.dungeon),r=d.rooms[run.roomIndex],s=run.state;
 return {run:run.id,dungeon:d.id,difficulty:run.difficulty,room:run.roomIndex,rooms:d.rooms.length,name:r.name,kind:r.kind,text:s.text??r.name,
  lanterns:r.kind==='lanterns'?(s.lit??[]).map(Boolean):null,phase:s.phase??null,gate:r.gate??null};
}
function say(realm,run,room,text){
 if(run.state.text===text)return;run.state.text=text;const view=dungeonRunView(run);
 for(const id of room.peers)realm.peers.get(id)?.world.emit('dungeonRun',view);
}
// A section wakes (spawns its monsters) the first time a living member walks into its area.
function setup(run,room,r,scale){
 const s={room:run.roomIndex,mobs:[],t:0,active:true};run.state=s;
 if(r.kind==='waves'){s.wave=0;spawnWave(room,r,0,scale,s);}
 if(r.kind==='lanterns'){s.lit=r.lanterns.map(()=>false);s.hold=r.lanterns.map(()=>0);s.spawnT=0;}
 if(r.kind==='miniboss'){s.boss=spawnInRoom(room,r.boss,r.center,scale).id;}
 if(r.kind==='boss'){s.wait=r.delay??0;s.addT=0;s.hellT=0;s.leaps=0;}
 return s;
}
function spawnWave(room,r,i,scale,s){
 const list=r.waves[i].flatMap(([type,count])=>Array.from({length:count},()=>type));
 s.mobs=list.map((type,k)=>spawnInRoom(room,type,ring(r.center,k,list.length,3),scale).id);
}
function reset(realm,run,room,peers,r){
 for(const m of room.mobs)despawn(m);
 run.state={};for(const p of peers){revive(p);teleport(p,r.start);}   
 for(const p of peers)p.world.notice('ทีมล้ม · เริ่มห้องนี้ใหม่');
}
export function runScript(realm,room,dt){
 const run=realm.dungeonRuns?.get(room.dungeonRun);if(!run||run.ended||run.roomId!==room.id)return;
 const d=dungeonById(run.dungeon),r=d.rooms[run.roomIndex],scale=monsterScale(run.difficulty,run.size);
 const peers=[...room.peers].map(id=>realm.peers.get(id)).filter(p=>p&&run.keys.has(p.key)&&!run.left.has(p.key));
 const here=peers.filter(p=>!p.suspended);
 let s=run.state.room===run.roomIndex?run.state:null;
 if(!here.length){if(s){s.empty=(s.empty??0)+dt;if(s.empty>EMPTY_RESET)reset(realm,run,room,peers,r);}return;}
 if(here.every(p=>p.world.player.hp<=0)){reset(realm,run,room,peers,r);return;}
 const standing=here.filter(p=>p.world.player.hp>0);
 // sections past the current one are sealed by their spirit gate: walking in sends you back
 for(const p of standing)for(let j=run.roomIndex+1;j<d.rooms.length;j++)if(inArea(p.world.player,d.rooms[j].area)){teleport(p,r.hold??r.start);p.world.notice('ประตูวิญญาณยังปิดอยู่ · เคลียร์ส่วนนี้ก่อน');break;}
 if(!s){if(!standing.some(p=>inArea(p.world.player,r.area))){say(realm,run,room,(run.roomIndex?'ประตูวิญญาณเปิดแล้ว · เดินต่อไปที่':'เดินไปที่')+r.name);return;}s=setup(run,room,r,scale);}
 s.empty=0;s.t+=dt;
 if(!s.open){
  if(r.kind==='waves'){
   if(!aliveOf(room,s.mobs).length){if(s.wave+1<r.waves.length){s.wave++;spawnWave(room,r,s.wave,scale,s);}else s.open=true;}
   say(realm,run,room,s.open?'':'ระลอก '+(s.wave+1)+'/'+r.waves.length);
  }else if(r.kind==='lanterns'){
   r.lanterns.forEach((l,i)=>{if(!s.lit[i]&&standing.some(p=>near(p.world.player,l,LANTERN_REACH))){s.hold[i]+=dt;if(s.hold[i]>=r.holdSeconds)s.lit[i]=true;}});
   s.spawnT+=dt;if(s.spawnT>=r.spawn.every){s.spawnT=0;if(aliveOf(room,s.mobs).length<r.spawn.max)s.mobs.push(spawnInRoom(room,r.spawn.type,ring(r.center,s.mobs.length,6,5),scale).id);}
   if(s.lit.every(Boolean)){for(const m of mobsOf(room,s.mobs))despawn(m);s.open=true;}
   say(realm,run,room,s.open?'':'จุดตะเกียง '+s.lit.filter(Boolean).length+'/'+r.lanterns.length);
  }else if(r.kind==='miniboss'){
   const chief=room.mobs[s.boss];
   if(!s.summoned&&chief.hp>0&&chief.hp<=chief.maxHp*r.summonAt){s.summoned=true;const [type,n]=r.summon;for(let i=0;i<n;i++)s.mobs.push(spawnInRoom(room,type,ring(chief,i,n,2.5),scale).id);}
   if(chief.hp<=0){for(const m of mobsOf(room,s.mobs))despawn(m);s.open=true;}
   say(realm,run,room,s.open?'':'ปราบ'+MONSTER_TYPES[chief.type].name);
  }else if(r.kind==='boss'){bossRoom(realm,run,room,r,s,scale,dt);if(run.ended)return;}
 }
 // cleared: the gate opens at once, fallen members get up where they lie, and the next section waits for the team
 if(s.open&&run.roomIndex+1<d.rooms.length){
  for(const p of peers)revive(p);
  run.roomIndex++;run.state={};say(realm,run,room,'ประตูวิญญาณเปิดแล้ว · เดินต่อไปที่'+d.rooms[run.roomIndex].name);
 }
}
function bossRoom(realm,run,room,r,s,scale,dt){
 const hell=run.difficulty==='hell';
 if(s.wait>0){s.wait-=dt;say(realm,run,room,r.name);if(s.wait<=0){s.boss=spawnInRoom(room,r.boss,r.center,scale).id;s.phase=1;}return;}
 let boss=room.mobs[s.boss];
 if(s.phase===1&&boss.hp<=boss.maxHp*r.at){
  const at={x:boss.x,z:boss.z};despawn(boss);
  const head=spawnInRoom(room,r.phase2,at,scale);head.hp=head.maxHp=Math.max(1,Math.round(head.maxHp*.5));s.boss=head.id;s.phase=2;boss=head;
  for(const id of room.peers)realm.peers.get(id)?.world.notice('หัวของแม่กระสือหลุดลอยขึ้นกลางห้อง!');
 }
 s.addT+=dt;if(s.addT>=r.adds.every){s.addT=0;if(aliveOf(room,s.mobs).filter(m=>MONSTER_TYPES[m.type].id===r.adds.type).length<r.adds.max)s.mobs.push(spawnInRoom(room,r.adds.type,ring(r.center,s.mobs.length,8,4),scale).id);}
 if(hell&&r.hellAdds){s.hellT+=dt;if(s.hellT>=r.hellAdds.every){s.hellT=0;if(aliveOf(room,s.mobs).filter(m=>MONSTER_TYPES[m.type].id===r.hellAdds.type).length<r.hellAdds.max)s.mobs.push(spawnInRoom(room,r.hellAdds.type,ring(r.center,s.mobs.length,8,5),scale).id);}
  // hell: the krasue form charges twice in a row (the second leap comes .6 s after the first)
  if(s.phase===2){const fresh=boss.leapCD>3.9&&!(s.prevLeap>3.9);if(fresh&&++s.leaps%2===1)boss.leapCD=.6;s.prevLeap=boss.leapCD;}}
 say(realm,run,room,(s.phase===2?'ร่างกระสือ · ':'')+'ปราบ'+MONSTER_TYPES[room.mobs[s.boss].type].name.replace(/ \(.*\)$/,''));
 if(s.phase===2&&boss.hp<=0){for(const m of mobsOf(room,s.mobs))despawn(m);finishRun(realm,run,room);}
}
