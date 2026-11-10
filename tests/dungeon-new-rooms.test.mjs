import test from 'node:test';import assert from 'node:assert/strict';
import {dungeonWorld} from './helpers/dungeon.mjs';
import {dungeonReservation} from '../server/dungeon-runs.js';
import {MONSTER_TYPES} from '../combat-core.js';
import {dungeonById} from '../dungeons.js';

// Dungeons Lv.45/55/65/80 (owner 10 Nov): each middle room plays differently.
const idOf=m=>MONSTER_TYPES[m.type].id;
const live=p=>p.room.mobs.filter(m=>m.hp>0);
const killAll=(w,p)=>{for(const m of live(p)){m.hp=1;w.realm.hurt(p,m,1e6);}};
const at=(p,pt)=>Object.assign(p.world.player,{x:pt.x,z:pt.z});
const safe=p=>{p.world.player.maxHp=p.world.player.hp=1e9;};
const room2=(id,level)=>{const w=dungeonWorld(),[a]=w.enter([w.join('เอ',{level})],'normal',id),run=dungeonReservation(w.realm,a.key),D=dungeonById(id);run.roomIndex=1;run.state={};return {w,a,run,R:D.rooms};};

test('every new dungeon has its own map, story and five sections of rooms',()=>{
 for(const id of ['takhian','samut','saiyadam','pret']){const d=dungeonById(id);assert.ok(d,id);assert.equal(d.rooms.length,4);assert.equal(d.rooms.at(-1).kind,'boss');assert.equal(d.map,'dg-'+id);assert.ok(d.story.enter.length&&d.story.boss.length);}
});
test('takhian: each cursed stump is cut with the button and calls its own wave of root ghouls',()=>{
 const {w,a,run,R}=room2('takhian',50);safe(a);at(a,R[1].center);w.run(.1);
 const S=R[1].lanterns,beside=l=>({x:l.x+1.2,z:l.z});
 at(a,beside(S[0]));w.cmd(a,{action:'lantern',index:0});w.run(.1);
 assert.equal(run.state.lit[0],true);assert.ok(live(a).some(m=>idOf(m)==='dg45-root-ghoul'));
 assert.equal(w.events(a,'dungeonRun').at(-1).object.verb,'ฟัน');
 for(let i=1;i<4;i++){killAll(w,a);w.run(.1);at(a,beside(S[i]));w.cmd(a,{action:'lantern',index:i});w.run(.1);}
 killAll(w,a);w.run(.2);assert.equal(run.roomIndex,2);
});
test('samut: the tide floods the yard after its countdown and hurts whoever stands in it',()=>{
 const {w,a,run,R}=room2('samut',60);at(a,R[1].center);w.run(.1);
 const pl=a.world.player;pl.maxHp=pl.hp=10000;for(const m of live(a))m.attackCD=1e9;
 w.run(10);assert.equal(pl.hp,10000,'no flood before the countdown ends');assert.match(run.state.text,/น้ำขึ้นใน/);
 for(const m of live(a))m.attackCD=1e9;w.run(R[1].tide.seconds);for(const m of live(a))m.attackCD=1e9;
 const before=pl.hp;w.run(3);assert.ok(pl.hp<=before-1000,'about 5% of max HP a second: '+before+' → '+pl.hp);
});
test('saiyadam: pots keep sending imps until all four are broken, without waiting for the imps to fall',()=>{
 const {w,a,run,R}=room2('saiyadam',70);safe(a);at(a,R[1].center);w.run(.1);
 w.run(R[1].spawn.every+.2);assert.ok(live(a).some(m=>idOf(m)==='dg65-pot-imp'),'an imp climbs out');
 const P=R[1].lanterns,beside=l=>({x:l.x+1.2,z:l.z});
 for(let i=0;i<4;i++){at(a,beside(P[i]));w.cmd(a,{action:'lantern',index:i});assert.equal(run.state.lit[i],true,'pot '+i);}
 const count=live(a).length;w.run(R[1].spawn.every*2);assert.equal(live(a).length,count,'broken pots send no more imps');
 killAll(w,a);w.run(.2);assert.equal(run.roomIndex,2);
});
test('saiyadam: the sorcerer calls kuman thong at half HP, and the run clears when he falls',()=>{
 const w=dungeonWorld(),[a]=w.enter([w.join('เอ',{level:70})],'normal','saiyadam'),run=dungeonReservation(w.realm,a.key),R=dungeonById('saiyadam').rooms;
 run.roomIndex=3;run.state={};at(a,R[3].center);safe(a);w.run(3.3);
 const boss=live(a).find(m=>idOf(m)==='dg65-mor-phi');assert.ok(boss);
 boss.hp=Math.floor(boss.maxHp*.49);w.run(.1);assert.equal(live(a).filter(m=>idOf(m)==='dg65-kuman-thong').length,2);
 boss.hp=1;w.realm.hurt(a,boss,1e6);w.run(.1);
 assert.equal(dungeonReservation(w.realm,a.key),null);assert.equal(w.events(a,'dungeonEnded').at(-1)?.cleared,true);
});
test('pret: hellfire is marked under the team, then bursts on whoever stays in the circle',()=>{
 const {w,a,run,R}=room2('pret',85);at(a,R[1].center);w.run(.1);
 const pl=a.world.player;pl.maxHp=pl.hp=10000;for(const m of live(a))m.attackCD=1e9;
 w.run(R[1].fire.every+.1);const mark=w.events(a,'dungeonHazard').at(-1);assert.ok(mark,'a burst is marked');
 assert.ok(Math.hypot(mark.x-pl.x,mark.z-pl.z)<.5);for(const m of live(a))m.attackCD=1e9;
 w.run(R[1].fire.warn+.1);assert.ok(pl.hp<=10000-2000,'the burst lands: '+pl.hp);
});
