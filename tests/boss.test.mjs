import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {RealmServer,MVP_INTERVAL,MVP_FIRST,DUNGEON_REWARD} from '../server/realm.js';
import {initialSave} from '../realm-state.js';
import {MONSTER_TYPES} from '../combat-core.js';

const catalog=JSON.parse(fs.readFileSync(new URL('../maps/world.json',import.meta.url)));
function world(){
 let time=Date.UTC(2026,9,16,3);const realm=new RealmServer({catalog,now:()=>time});const sent=new Map();
 const join=(name,mapId)=>{const state=initialSave();state.mapId=mapId;const box=[];const p=realm.join({uid:'u-'+name,serverId:'server-1',slotId:'slot-1',record:{character:{name,gender:'male',classId:'swordsman'},state,daily:{day:'2026-10-16',streak:1}},send:m=>box.push(m)});sent.set(p.id,box);return p;};
 const travel=(p,to)=>{realm.leave(p.id,{travel:true});return join(p.character.name,to);};
 return {realm,join,travel,sent,tick:ms=>{time+=ms;},now:()=>time};
}
const party=(realm,a,b)=>{const id='party-test';realm.parties.set(id,{id,leader:a.id,members:new Set([a.id,b.id])});a.partyId=b.partyId=id;};

test('a party keeps together across travel and shares one dungeon instance; another party gets its own', () => {
 const {realm,join,travel}=world(),a=join('เอ','moonlit-mill'),b=join('บี','moonlit-mill'),c=join('ซี','moonlit-mill');
 party(realm,a,b);
 // both leave before either arrives (the real order when two players step through the portal together)
 realm.leave(a.id,{travel:true});realm.leave(b.id,{travel:true});
 const a2=join('เอ','mill-cellar'),b2=join('บี','mill-cellar'),c2=travel(c,'mill-cellar');
 assert.equal(a2.partyId,'party-test');assert.equal(b2.partyId,'party-test');
 assert.equal(a2.room,b2.room,'same instance');assert.notEqual(a2.room,c2.room,'solo player gets a separate instance');
 assert.equal(realm.parties.get('party-test').leader,a2.id,'leader restored');
 assert.equal(a2.room.mobs.length,42);   // 0.123 camps of 4–5, no boss
});

test('instance monsters stay down; the last monster clears the dungeon and pays every member once per Thai day', () => {
 const {realm,join,travel}=world(),a=join('เอ','moonlit-mill'),b=join('บี','moonlit-mill');party(realm,a,b);
 const a2=travel(a,'mill-cellar'),b2=travel(b,'mill-cellar');
 const mob=a2.room.mobs[0];Object.assign(a2.world.player,{x:mob.x+1,z:mob.z});realm.hurt(a2,mob,99999);assert.ok(mob.dead>1e8,'no respawn inside');
 assert.ok(!a2.room.mobs.some(m=>MONSTER_TYPES[m.type].boss),'no dungeon boss');
 const rest=a2.room.mobs.filter(m=>m.hp>0),boss=rest.pop(),coins=b2.bag.coins;
 for(const m of rest){Object.assign(a2.world.player,{x:m.x+1,z:m.z});realm.hurt(a2,m,99999);}assert.ok(!b2.world.events.some(e=>e.type==='dungeonClear'),'not cleared while one is left');
 Object.assign(a2.world.player,{x:boss.x+1,z:boss.z});Object.assign(b2.world.player,{x:boss.x+2,z:boss.z});realm.hurt(a2,boss,99999);
 assert.ok(b2.bag.coins>=coins+DUNGEON_REWARD.coins,'member is paid');assert.equal(b2.dungeonDay,'2026-10-16');assert.ok(b2.saveNow);
 assert.ok(b2.world.events.some(e=>e.type==='dungeonClear'));
 const again=b2.bag.coins;boss.hp=boss.maxHp;realm.hurt(a2,boss,99999);
 assert.ok(b2.bag.coins-again<DUNGEON_REWARD.coins,'second clear the same day pays no bonus');
});

test('the MVP waits for the server-wide timer, crowns the top damage dealer and announces it', () => {
 const {realm,join,tick,sent}=world(),a=join('เอ','moonlit-mill'),b=join('บี','moonlit-mill');
 const mvp=a.room.mobs.find(m=>MONSTER_TYPES[m.type].mvp);
 assert.equal(mvp.hp,0,'hidden until due');assert.ok(Math.abs(mvp.dead-MVP_FIRST/1000)<1);
 assert.equal(realm.snapshot(a).self.mvp.in,MVP_FIRST/1000);
 tick(MVP_FIRST);for(let i=0;i<30;i++)realm.step(.05);
 assert.equal(mvp.hp,mvp.maxHp,'spawned');assert.ok(sent.get(b.id).some(m=>m.type==='chat'&&m.text.includes('ปรากฏตัว')));
 Object.assign(a.world.player,{x:mvp.x+1,z:mvp.z});Object.assign(b.world.player,{x:mvp.x+2,z:mvp.z});
 realm.hurt(b,mvp,100);realm.hurt(a,mvp,mvp.hp+1000);
 assert.equal(a.bag.items['king-ember'],1,'top damage wins MVP');assert.equal(b.bag.items['king-ember'],undefined);
 assert.ok(sent.get(b.id).some(m=>m.channel==='system'&&m.text.includes('เอ ได้ MVP')));
 assert.equal(realm.snapshot(a).self.mvp.in,MVP_INTERVAL/1000);
 // leaving and coming back does not reset the timer
 realm.leave(a.id);realm.leave(b.id);const c=join('ซี','moonlit-mill');assert.equal(c.room.mobs.find(m=>MONSTER_TYPES[m.type].mvp).hp,0);
});

test('a party seat expires after a minute', () => {
 const {realm,join,tick}=world(),a=join('เอ','moonlit-mill'),b=join('บี','moonlit-mill');party(realm,a,b);
 realm.leave(a.id,{travel:true});tick(61000);realm.step(.05);
 assert.equal(realm.parties.size,0);assert.equal(b.partyId,null);
});
