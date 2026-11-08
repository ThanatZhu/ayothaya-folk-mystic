import test from 'node:test';import assert from 'node:assert/strict';
import {dungeonWorld} from './helpers/dungeon.mjs';

const names=n=>Array.from({length:n},(_,i)=>'คน'+'กขคงจฉชซฌญ'[i]);
const queue=(w,p,difficulty='normal')=>w.cmd(p,{action:'queue',dungeon:'krasue',difficulty});

test('five solo players are matched into one party with a ready check',()=>{
 const w=dungeonWorld(),ps=names(5).map(n=>w.join(n));ps.forEach(p=>queue(w,p));w.run(.1);
 const pid=ps[0].partyId;assert.ok(pid);assert.ok(ps.every(p=>p.partyId===pid));
 assert.equal(w.realm.parties.get(pid).leader,ps[0].id,'the oldest in the queue leads');
 assert.ok(ps.slice(1).every(p=>w.events(p,'dungeonReady').length===1));
 assert.equal(w.realm.dungeonQueue.size,0);
});
test('a party of 3 plus 2 solos match and the party leader stays leader',()=>{
 const w=dungeonWorld(),[a,b,c,d,e]=names(5).map(n=>w.join(n));w.party(a,b,c);
 queue(w,b);assert.equal(w.events(b,'dungeonError').at(-1)?.reason,'dungeon-not-leader');
 queue(w,a);queue(w,d);queue(w,e);w.run(.1);
 const pid=a.partyId;assert.ok([b,c,d,e].every(p=>p.partyId===pid));assert.equal(w.realm.parties.get(pid).leader,a.id);
});
test('a party of 4 and a party of 2 never make 6',()=>{
 const w=dungeonWorld(),ps=names(6).map(n=>w.join(n));w.party(...ps.slice(0,4));w.party(...ps.slice(4));
 queue(w,ps[0]);queue(w,ps[4]);w.run(.1);
 assert.equal(w.realm.dungeonQueue.size,2);assert.notEqual(ps[0].partyId,ps[4].partyId);
});
test('after 90 s two players get an offer and can go in as two',()=>{
 const w=dungeonWorld(),[a,b]=names(2).map(n=>w.join(n));queue(w,a);queue(w,b);
 w.run(89);assert.equal(w.events(a,'dungeonQueue').filter(e=>e.state==='offer').length,0);
 w.run(2);assert.equal(w.events(a,'dungeonQueue').filter(e=>e.state==='offer').at(-1)?.size,2);
 w.cmd(a,{action:'accept'});w.run(.1);
 assert.equal(a.partyId,b.partyId);assert.equal(w.events(b,'dungeonReady').length,1);
});
test('travelling or another difficulty keeps you out of a match',()=>{
 const w=dungeonWorld(),ps=names(5).map(n=>w.join(n));ps.slice(0,4).forEach(p=>queue(w,p));queue(w,ps[4],'hard');w.run(.1);
 assert.equal(w.realm.dungeonQueue.size,5);
 w.cmd(ps[0],{action:'unqueue'});assert.equal(w.realm.dungeonQueue.size,4);
 Object.assign(ps[1].world.player,{x:.5,z:-66});const moved=w.move(ps[1],'old-orchard');w.run(.1);assert.equal(w.realm.dungeonQueue.size,3,'travel leaves the queue');
 assert.ok(moved);
});
