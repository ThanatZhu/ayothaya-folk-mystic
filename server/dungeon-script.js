// Party dungeon room script, run by the realm every tick for rooms of a dungeon map (dungeons.js rooms[]).
// Rooms are areas of one map; content spawns from the run's state and a door moves the whole team to the next room.
import {MONSTER_TYPES,walkable} from '../combat-core.js';
import {dungeonById,monsterScale} from '../dungeons.js';
import {finishRun,dungeonReservation} from './dungeon-runs.js';

const TYPE=new Map(MONSTER_TYPES.map((t,i)=>[t.id,i]));
const near=(a,b,r)=>Math.hypot(a.x-b.x,a.z-b.z)<=r;
const LANTERN_REACH=3,EMPTY_RESET=60;
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
// Room 2 objects (owner 10 Nov): krasue lanterns are lit, takhian stumps cut, saiyadam pots broken.
const objectOf=r=>({name:r.object?.name??'ตะเกียง',verb:r.object?.verb??'จุด',mode:r.mode??'call'});
// The tide and hellfire ignore DEF and dodge: a share of max HP, so the room has to be played, not tanked.
function hazard(p,share){const w=p.world,pl=w.player;if(pl.hp<=0)return;const n=Math.max(1,Math.round(pl.maxHp*share));pl.hp=Math.max(0,pl.hp-n);w.emit('playerHit',{x:pl.x,z:pl.z,amount:n});if(pl.hp<=0)w.fall();}

export function dungeonRunView(run){
 const d=dungeonById(run.dungeon),r=d.rooms[run.roomIndex],s=run.state;
 return {run:run.id,dungeon:d.id,difficulty:run.difficulty,room:run.roomIndex,rooms:d.rooms.length,name:r.name,kind:r.kind,text:s.text??r.name,
  lanterns:r.kind==='lanterns'?(s.lit??[]).map(Boolean):null,object:r.kind==='lanterns'?objectOf(r):null,phase:s.phase??null,gate:r.gate??null};
}
function say(realm,run,room,text){
 if(run.state.text===text)return;run.state.text=text;const view=dungeonRunView(run);
 for(const id of room.peers)realm.peers.get(id)?.world.emit('dungeonRun',view);
}
// A section wakes (spawns its monsters) the first time a living member walks into its area.
function setup(run,room,r,scale){
 const s={room:run.roomIndex,mobs:[],t:0,active:true};run.state=s;
 if(r.kind==='waves'){s.wave=0;spawnWave(room,r,0,scale,s);}
 if(r.kind==='lanterns'){s.lit=r.lanterns.map(()=>false);s.spawnT=0;}
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
   let extra='';
   if(r.tide&&!s.open){const left=Math.ceil(r.tide.seconds-s.t);
    if(left>0)extra=' · น้ำขึ้นใน '+left+' วิ';
    else{extra=' · น้ำท่วมลาน! ปราบให้หมดเร็ว';s.tideT=(s.tideT??0)+dt;while(s.tideT>=1){s.tideT-=1;for(const p of standing)if(inArea(p.world.player,r.area))hazard(p,r.tide.pct);}}}
   if(r.fire&&!s.open)hellfire(realm,room,r,s,standing,dt);
   say(realm,run,room,s.open?'':'ระลอก '+(s.wave+1)+'/'+r.waves.length+extra);
  }else if(r.kind==='lanterns'){
   // owner 9 Nov: a lantern is lit with a button beside it and calls one wave; the next lantern waits for that wave to fall
   const o=objectOf(r),lit=s.lit.filter(Boolean).length,wave=aliveOf(room,s.mobs).length>0;
   if(o.mode==='break'&&lit<r.lanterns.length){s.spawnT+=dt;if(s.spawnT>=r.spawn.every){s.spawnT=0;const left=r.lanterns.filter((_,i)=>!s.lit[i]);if(aliveOf(room,s.mobs).length<r.spawn.max)s.mobs.push(spawnInRoom(room,r.spawn.type,left[Math.floor(s.t*7)%left.length],scale).id);}}
   if(lit===r.lanterns.length&&!wave)s.open=true;
   say(realm,run,room,s.open?'':o.verb+o.name+' '+lit+'/'+r.lanterns.length+(o.mode==='break'?(lit===r.lanterns.length?' · ปราบภูตที่เหลือ':' · เดินไปที่'+o.name+'แล้วกด'+o.verb):wave?' · ปราบมอนระลอกนี้ก่อน':' · เดินไปที่'+o.name+'แล้วกด'+o.verb));
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
  if(r.phase2){const at={x:boss.x,z:boss.z};despawn(boss);
   const head=spawnInRoom(room,r.phase2,at,scale);head.hp=head.maxHp=Math.max(1,Math.round(head.maxHp*.5));s.boss=head.id;boss=head;}
  else if(r.summon){const [type,n]=r.summon;for(let i=0;i<n;i++)s.mobs.push(spawnInRoom(room,type,ring(boss,i,n,2.5),scale).id);}
  s.phase=2;if(r.phase2Text)for(const id of room.peers)realm.peers.get(id)?.world.notice(r.phase2Text);
 }
 s.addT+=dt;if(s.addT>=r.adds.every){s.addT=0;if(aliveOf(room,s.mobs).filter(m=>MONSTER_TYPES[m.type].id===r.adds.type).length<r.adds.max)s.mobs.push(spawnInRoom(room,r.adds.type,ring(r.center,s.mobs.length,8,4),scale).id);}
 if(hell&&r.hellAdds){s.hellT+=dt;if(s.hellT>=r.hellAdds.every){s.hellT=0;if(aliveOf(room,s.mobs).filter(m=>MONSTER_TYPES[m.type].id===r.hellAdds.type).length<r.hellAdds.max)s.mobs.push(spawnInRoom(room,r.hellAdds.type,ring(r.center,s.mobs.length,8,5),scale).id);}
  // hell: the krasue form charges twice in a row (the second leap comes .6 s after the first)
  if(s.phase===2){const fresh=boss.leapCD>3.9&&!(s.prevLeap>3.9);if(fresh&&++s.leaps%2===1)boss.leapCD=.6;s.prevLeap=boss.leapCD;}}
 say(realm,run,room,(s.phase===2&&r.phase2Label?r.phase2Label+' · ':'')+'ปราบ'+MONSTER_TYPES[room.mobs[s.boss].type].name.replace(/ \(.*\)$/,''));
 if(boss.hp<=0&&(s.phase===2||!r.phase2)){for(const m of mobsOf(room,s.mobs))despawn(m);finishRun(realm,run,room,boss);}
}
// Hellfire (dungeon 80 room 2): every few seconds a burst is marked under each member in the room, then erupts.
function hellfire(realm,room,r,s,standing,dt){
 const f=r.fire;s.fireT=(s.fireT??0)+dt;s.bursts??=[];
 if(s.fireT>=f.every){s.fireT=0;for(const p of standing.slice(0,5))if(inArea(p.world.player,r.area)){const b={x:p.world.player.x,z:p.world.player.z,at:s.t+f.warn};s.bursts.push(b);
  for(const id of room.peers)realm.peers.get(id)?.world.emit('dungeonHazard',{x:b.x,z:b.z,r:f.radius,warn:f.warn});}}
 for(const b of s.bursts.filter(b=>b.at<=s.t))for(const p of standing)if(near(p.world.player,b,f.radius))hazard(p,f.pct);
 s.bursts=s.bursts.filter(b=>b.at>s.t);
}
// The lantern button (owner 9 Nov): a living member beside an unlit lantern, with no wave standing, lights it and calls the next wave.
export function lightLantern(realm,p,index){
 const run=dungeonReservation(realm,p.key);if(!run||run.roomId!==p.room.id)throw Error('dungeon-no-lantern');
 const d=dungeonById(run.dungeon),r=d.rooms[run.roomIndex];if(r.kind!=='lanterns')throw Error('dungeon-no-lantern');
 const i=Number(index);if(!Number.isInteger(i)||!r.lanterns[i])throw Error('dungeon-no-lantern');
 if(p.world.player.hp<=0||!near(p.world.player,r.lanterns[i],LANTERN_REACH))throw Error('dungeon-far');
 const room=p.room,scale=monsterScale(run.difficulty,run.size);let s=run.state.room===run.roomIndex?run.state:setup(run,room,r,scale);
 if(s.lit[i])throw Error('dungeon-lit');
 const o=objectOf(r);
 if(o.mode==='break'){s.lit[i]=true;for(const id of room.peers)realm.peers.get(id)?.world.notice(o.verb+o.name+'แตกแล้ว '+s.lit.filter(Boolean).length+'/'+r.lanterns.length);return true;}
 if(aliveOf(room,s.mobs).length)throw Error('dungeon-wave');
 s.lit[i]=true;const list=r.lanternWaves[Math.min(r.lanternWaves.length-1,s.lit.filter(Boolean).length-1)].flatMap(([type,count])=>Array.from({length:count},()=>type));
 s.mobs=list.map((type,k)=>spawnInRoom(room,type,ring(r.lanterns[i],k,list.length,3.5),scale).id);
 for(const id of room.peers)realm.peers.get(id)?.world.notice(o.verb+o.name+'แล้ว '+s.lit.filter(Boolean).length+'/'+r.lanterns.length+' · '+MONSTER_TYPES[TYPE.get(list[0])].name+'โผล่มา!');
 return true;
}
