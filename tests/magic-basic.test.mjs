import test from 'node:test';
import assert from 'node:assert/strict';
import {deriveStats} from '../character-stats.js';
import {CombatWorld} from '../combat-core.js';
test('magic classes hit with full MATK on basic attacks, as magic (violet numbers)',()=>{
 const mage=deriveStats({level:50,classId:'shaman',stats:{int:40}}),fighter=deriveStats({level:50,classId:'swordsman',stats:{str:40}});
 assert.equal(mage.basicBonus,mage.matk);assert.ok(mage.matk>0);assert.equal(fighter.basicBonus,fighter.atk);
 const w=new CombatWorld({classId:'shaman'});w.safe=false;w.applyDerived(mage);const m=w.mobs[0];Object.assign(w.player,{x:m.x+1,z:m.z});w.select(m.id);
 const hits=[];w.events.length=0;w.basicAttack(true);for(const e of w.events)if(e.type==='damage')hits.push(e);
 assert.ok(hits.length&&hits[0].amount>=mage.matk*.5,'damage comes from MATK');assert.ok(['#c9a8ff','#ffd27a'].includes(hits[0].color));
});
