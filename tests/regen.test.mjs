import test from 'node:test';
import assert from 'node:assert/strict';
import {CombatWorld} from '../combat-core.js';
const idle=(w,s)=>{for(let t=0;t<s;t+=.05)w.update(.05,{x:0,z:0,attack:false});};
test('HP comes back on its own: fast in town, slowly in the field once out of combat',()=>{
 const town=new CombatWorld({classId:'swordsman'});town.safe=true;town.player.maxHp=2000;town.player.hp=100;idle(town,5);
 assert.ok(town.player.hp>=100+2000*.04*5-1,'town: 4 % of max HP a second');
 const field=new CombatWorld({classId:'swordsman'});field.safe=false;field.mobs.forEach(m=>{m.hp=0;m.dead=999;});field.player.maxHp=2000;field.player.hp=100;
 field.takeMonsterHit({damage:1,id:'none'});const hit=field.player.hp;idle(field,5);assert.equal(Math.round(field.player.hp),Math.round(hit),'no regen right after a hit');
 idle(field,5);assert.ok(field.player.hp>hit+2000*.01*3,'field: 1 % a second after 6 s calm');
});
