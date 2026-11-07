import test from 'node:test';
import assert from 'node:assert/strict';
import {hitFeel,impactPush,deathFlight} from '../hit-feel.js';

test('a miss has no impact',()=>{
 assert.equal(hitFeel({amount:'MISS'}),null);
 assert.equal(hitFeel({amount:0}),null);
});
test('harder blows hang longer, shove further and shake more',()=>{
 const normal=hitFeel({amount:10,maxHp:1000}),heavy=hitFeel({amount:200,maxHp:1000}),crit=hitFeel({amount:10,maxHp:1000,crit:true});
 for(const key of ['stop','push','kick','flash']){assert.ok(normal[key]<=heavy[key],key);assert.ok(heavy[key]<=crit[key],key);}
 assert.ok(normal.stop<heavy.stop&&heavy.stop<crit.stop);
});
test('a target with unknown health still reads as a normal hit',()=>{
 assert.equal(hitFeel({amount:10}).kick,0);
});
test('a boss flashes but is not shoved and shows no hurt pose',()=>{
 const feel=hitFeel({amount:10,maxHp:1000,crit:true,armor:true});
 assert.equal(feel.push,0);assert.equal(feel.hurt,false);assert.ok(feel.kick>0);
 assert.equal(impactPush({at:0,push:0,stop:0},.2),0);
});
test('the shove goes out and comes all the way back',()=>{
 const impact={at:1,push:.3,stop:.04};
 assert.equal(impactPush(impact,.9),0);
 assert.ok(impactPush(impact,1.06)>.2);
 assert.ok(impactPush(impact,1.3)<.02);
 assert.equal(impactPush(impact,1.4),0);
 assert.equal(impactPush(null,1),0);
});
test('a defeated body lands back on the ground',()=>{
 assert.ok(deathFlight(.16).lift>.3);
 assert.ok(deathFlight(.32).lift<.001);
 assert.ok(deathFlight(.32).back>=deathFlight(.16).back);
 assert.equal(deathFlight(2).back,deathFlight(.32).back);
});
