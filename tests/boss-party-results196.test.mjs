import test from 'node:test';
import assert from 'node:assert/strict';
import {recordBossDamage,finishBossDamage,bossResultGroups} from '../boss-results.js';
import {RealmServer} from '../server/realm.js';
import {MONSTER_TYPES} from '../combat-core.js';
import {initialSave} from '../realm-state.js';

const peer=(id,partyId=null)=>({id,key:'private:'+id,partyId,character:{name:id,classId:'swordsman'}});
const room=()=>({id:'room',map:{id:'field',name:'Field'},peers:new Set(['A','B','C','D'])});
const mob={id:1},boss={id:'boss',name:'Boss'};
test('party damage competes with solo damage; shares and DPS use one encounter clock',()=>{
 const r=room(),a=peer('A','team'),b=peer('B','team'),c=peer('C'),d=peer('D','team'),party={id:'team',leaderName:'A',members:[a,b,d]};
 recordBossDamage(r,mob,a,400,0,party);recordBossDamage(r,mob,c,500,2);recordBossDamage(r,mob,b,100,8,party);
 const out=finishBossDamage(r,mob,boss,10);
 assert.equal(out.rows[0].name,'C','individual MVP stays individual');
 assert.deepEqual(out.groups.map(g=>[g.kind,g.name,g.damage,g.share,g.dps]),[['party','ปาร์ตี้ของ A',500,.5,50],['solo','C',500,.5,50]]);
 assert.deepEqual(out.groups[0].members.map(m=>[m.name,m.damage,m.dps]),[['A',400,40],['B',100,10],['D',0,0]]);
 assert.equal(out.groups[1].members.length,1);assert.equal(out.groups[1].partyId,null);
 assert.equal(out.groups.reduce((n,g)=>n+g.damage,0),out.total);
 assert.equal(r.damageEncounters.size,0);assert.ok(!JSON.stringify(out).includes('private:'));
 assert.equal(finishBossDamage(r,mob,boss,11),null,'duplicate finish cannot reuse damage');
});
test('changing party cannot transfer old hits; a one-member party remains expandable',()=>{
 const r=room(),a=peer('A');
 recordBossDamage(r,mob,a,100,0);a.partyId='team1';recordBossDamage(r,mob,a,200,1);a.partyId='team2';recordBossDamage(r,mob,a,300,2);
 const out=finishBossDamage(r,mob,boss,10);
 assert.equal(out.rows[0].damage,600);
 assert.deepEqual(out.groups.map(g=>[g.partyId,g.damage]),[['team2',300],['team1',200],[null,100]]);
 assert.equal(out.groups[2].name,'A');assert.equal(out.groups[2].kind,'solo');
 assert.ok(out.groups.every(g=>g.members[0].id==='A'));
});
test('identical names, reconnect, disconnect, simultaneous bosses and respawn keep correct credit',()=>{
 const r=room(),a=peer('A','team'),b=peer('B','team');b.character.name=a.character.name;
 recordBossDamage(r,mob,a,10,0);recordBossDamage(r,mob,b,20,0);recordBossDamage(r,{id:2},a,7,0);
 r.peers.delete('A');const returned={...a,id:'A2'};r.peers.add('A2');recordBossDamage(r,mob,returned,30,1);
 r.peers.delete('B');const out=finishBossDamage(r,mob,boss,2),members=out.groups[0].members;
 assert.deepEqual(members.map(m=>[m.id,m.damage,m.connected]),[['A2',40,true],['B',20,false]]);
 assert.equal(finishBossDamage(r,{id:2},boss,2).total,7);
 recordBossDamage(r,mob,returned,3,10);assert.equal(finishBossDamage(r,mob,boss,10).total,3);
 assert.ok(!JSON.stringify(out).includes('private:'));
});
test('invalid damage does not create an encounter; group DPS is rounded after aggregation',()=>{
 const r=room(),a=peer('A','team'),b=peer('B','team');
 for(const damage of [0,-1,NaN,Infinity])recordBossDamage(r,mob,a,damage,0);
 assert.equal(r.damageEncounters,undefined);
 recordBossDamage(r,mob,a,1,0);recordBossDamage(r,mob,b,1,0);
 const out=finishBossDamage(r,mob,boss,3);assert.equal(out.groups[0].dps,1);assert.equal(out.rows.reduce((n,m)=>n+m.dps,0),0);
});
test('old individual-only reports remain individual rows without invented parties',()=>{
 const rows=[{rank:1,id:'p',name:'Solo',damage:50,share:1,dps:10,classId:'rogue',connected:true}];
 const groups=bossResultGroups({rows});assert.equal(groups[0].kind,'solo');assert.equal(groups[0].name,'Solo');assert.deepEqual(groups[0].members,rows);
 assert.deepEqual(bossResultGroups({groups:[],rows}),[]);
});
test('real authority snapshots party roster, includes support at zero, caps overkill, and separates solo',()=>{
 const nav={zones:[{x:-40,z:-40,w:80,d:80}],obstacles:[],props:[]},map={id:'field',name:'Field',nav,spawn:{x:0,z:0},mobs:[]};
 const realm=new RealmServer({catalog:{capital:'field',maps:[map]},now:()=>1000000});
 const join=name=>realm.join({uid:name,slotId:'slot-1',serverId:'server-1',record:{character:{name,gender:'male',classId:'swordsman'},state:initialSave()},send(){}});
 const a=join('Leader'),b=join('Member'),support=join('Support'),solo=join('Solo'),watcher=join('Watcher');
 for(const p of [a,b,support])p.partyId='test-party';realm.parties.set('test-party',{id:'test-party',leader:a.id,members:new Set([a.id,b.id,support.id])});
 realm.summonBoss({mapId:'field',count:1,x:2,z:0});const target=a.room.mobs.find(m=>m.summoned);assert.ok(MONSTER_TYPES[target.type].boss);target.hp=target.maxHp=1000;
 realm.hurt(a,target,400);realm.clock+=10;realm.hurt(solo,target,450);realm.hurt(b,target,99999);
 const out=a.room.events.find(e=>e.type==='bossResult');assert.equal(out.total,1000);
 assert.equal(out.groups[0].kind,'party');assert.equal(out.groups[0].damage,550);assert.equal(out.groups[0].dps,55);
 assert.equal(out.groups[0].name,'ปาร์ตี้ของ Leader');assert.equal(out.groups[0].members.find(m=>m.id===support.id).damage,0);
 assert.equal(out.groups[1].name,'Solo');assert.ok(!out.groups.some(g=>g.members.some(m=>m.id===watcher.id)));
 assert.ok(!JSON.stringify(out).includes('slot-1'));
});
