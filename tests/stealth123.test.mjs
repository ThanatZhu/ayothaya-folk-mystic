import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {RealmServer} from '../server/realm.js';
import {initialSave} from '../realm-state.js';
import {levelStart,XP_CURVE} from '../experience.js';
import {MONSTER_TYPES} from '../combat-core.js';
import {STEALTH_HIT} from '../role-combat.js';

const catalog=JSON.parse(readFileSync(new URL('../maps/world.json',import.meta.url),'utf8'));
test('stealth: normal monsters lose the hidden player, the next hit is stronger and reveals; bosses still see',()=>{
 const realm=new RealmServer({catalog,roleSkills:true,now:()=>Date.UTC(2026,9,28,6)}),st=initialSave();st.mapId='old-orchard';st.traveler={...st.traveler,baseXp:levelStart(30),jobXp:999999};
 const p=realm.join({uid:'r',serverId:'server-1',slotId:'slot-1',record:{xpCurve:XP_CURVE,character:{name:'Rogue',gender:'male',classId:'rogue',jobId:''},state:st},send(){}});
 const mob=p.room.mobs.find(m=>m.hp>0&&!MONSTER_TYPES[m.type].boss);Object.assign(p.world.player,{x:mob.x+1,z:mob.z});
 realm.hurt(p,mob,1);for(let i=0;i<10;i++)realm.step(.05);assert.equal(mob.aggro,true);
 p.world.status.stealth=4;for(let i=0;i<10;i++)realm.step(.05);assert.equal(mob.aggro,false,'the monster lost sight of the rogue');
 const other=realm.join({uid:'o',serverId:'server-1',slotId:'slot-1',record:{xpCurve:XP_CURVE,character:{name:'Friend',gender:'female',classId:'boxer',jobId:''},state:{...st}},send(){}});
 Object.assign(other.world.player,{x:p.world.player.x+2,z:p.world.player.z});for(let i=0;i<3;i++)realm.step(.05);
 assert.equal(realm.snapshot(other).players.find(e=>e.id===p.id)?.player.hidden,true,'others see the rogue as hidden');
 let hp=mob.hp;realm.hurt(p,mob,100);assert.equal(hp-mob.hp,100*STEALTH_HIT);assert.ok(!(p.world.status.stealth>0),'the hit reveals');
 hp=mob.hp;realm.hurt(p,mob,100);assert.equal(hp-mob.hp,100);
 const boss=p.room.mobs.find(m=>MONSTER_TYPES[m.type].boss&&m.hp>0);if(boss){Object.assign(boss,{x:p.world.player.x+2,z:p.world.player.z,aggro:true});p.world.status.stealth=4;realm.step(.05);assert.equal(boss.aggro,true,'bosses see through stealth');}
});
