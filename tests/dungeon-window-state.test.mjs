import test from 'node:test';import assert from 'node:assert/strict';
import {dungeonActions,oddsText,errorText} from '../dungeon-window-state.js';
import {dungeonById} from '../dungeons.js';

const D=dungeonById('krasue');
test('who may press เข้าดัน and หาคน',()=>{
 assert.deepEqual(dungeonActions({level:34,dungeon:D,online:true}).enter,{on:false,reason:'เลเวลไม่ถึง'});
 assert.equal(dungeonActions({level:35,dungeon:D,online:true}).enter.on,true);
 const member={members:['a','b'],leader:'b'};
 assert.deepEqual(dungeonActions({level:40,dungeon:D,party:member,selfId:'a',online:true}).enter,{on:false,reason:'หัวหน้าปาร์ตี้เป็นคนกดเข้า'});
 assert.equal(dungeonActions({level:40,dungeon:D,party:member,selfId:'b',online:true}).enter.on,true);
 const queued=dungeonActions({level:40,dungeon:D,online:true,queue:{state:'waiting'}});
 assert.equal(queued.enter.on,false);assert.equal(queued.queue.cancel,true);assert.equal(queued.queue.on,true);
 const inside=dungeonActions({level:40,dungeon:D,online:true,inRun:true});assert.equal(inside.enter.on,false);assert.equal(inside.queue.on,false);assert.equal(inside.enter.reason,'อยู่ในดันแล้ว');
 assert.equal(dungeonActions({level:40,dungeon:D,online:false}).enter.reason,'ต้องเข้าโหมดออนไลน์');
 const full={members:['a','b','c','d','e'],leader:'a'};assert.equal(dungeonActions({level:40,dungeon:D,party:full,selfId:'a',online:true}).queue.on,false);
});
test('drop odds and errors read in Thai',()=>{
 assert.equal(oddsText('hell'),'ม่วง 50% · ส้ม 40% · แดง 10%');
 assert.equal(errorText('dungeon-level'),'เลเวลไม่ถึง');assert.equal(errorText('whatever'),'เข้าดันไม่สำเร็จ');
});
