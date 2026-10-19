import test from 'node:test';
import assert from 'node:assert/strict';
import {RealmServer} from '../server/realm.js';
import {initialSave} from '../realm-state.js';
import {WAR,warWindow} from '../guild-war.js';
const map={id:WAR.map,name:'โรงสี',safe:false,nav:{zones:[{x:-40,z:-40,w:80,d:80}],obstacles:[],props:[]},spawn:{x:0,z:30},mobs:[]};
const saturday=Date.UTC(2026,9,24,13,5); // Sat 24 Oct 2026, 20:05 Thai time
test('the war window is Saturday 20:00–20:30 Thai time',()=>{
 assert.equal(warWindow(saturday).active,true);assert.equal(warWindow(saturday+30*6e4).active,false);assert.equal(warWindow(saturday-6*864e5).active,false);
});
test('rival guilds fight, the stone changes hands, and the holder owns the fort when time runs out',()=>{
 let time=saturday-10*6e4;const realm=new RealmServer({catalog:{capital:WAR.map,maps:[map]},now:()=>time}),chat=[];
 const join=(uid,cls)=>realm.join({uid,serverId:'server-1',slotId:'slot-1',record:{character:{name:'hero-'+uid,gender:'male',classId:cls},state:initialSave(),bag:{coins:0,items:{}}},send:m=>{if(m.type==='chat')chat.push(m.text);}});
 const a=join('a','swordsman'),b=join('b','swordsman'),c=join('c','swordsman');
 const guild=(name,...ps)=>{const g={id:name,serverId:'server-1',name,emblem:1,leader:ps[0].key,members:ps.map(p=>({key:p.key,name:p.character.name}))};realm.guilds.set(g.id,g);ps.forEach(p=>p.guildId=g.id);return g;};
 guild('ช้าง',a,c);guild('เสือ',b);
 for(const p of [a,b,c])Object.assign(p.world.player,{x:WAR.stone.x+1,z:WAR.stone.z});
 realm.step(.05);assert.equal(a.world.rivals.length,0,'no war before 20:00');
 time=saturday;realm.step(.05);assert.ok(chat.some(t=>t.includes('กิลด์วอร์เริ่ม')));
 assert.deepEqual(a.world.rivals.map(v=>v.id).sort(),['war:'+b.id,'war:stone'].sort(),'enemy + stone, never a guildmate');
 const hp=b.world.player.hp;realm.hurt(a,a.world.rivals.find(v=>v.id==='war:'+b.id),100);assert.ok(b.world.player.hp<=hp);
 const stone=realm.warState('server-1').stone;stone.hp=10;realm.hurt(b,b.world.rivals.find(v=>v.id==='war:stone'),50);
 assert.equal(realm.warState('server-1').holder,'เสือ');assert.equal(stone.hp,stone.maxHp);realm.step(.05);
 assert.ok(!b.world.rivals.some(v=>v.id==='war:stone'),'holders defend, they cannot hit their own stone');
 b.world.player.hp=1;realm.hurt(a,a.world.rivals.find(v=>v.id==='war:'+b.id),500);if(b.world.player.hp===0)assert.equal(b.world.player.down,3);
 time=saturday+30*6e4;realm.step(.05);
 assert.equal(realm.guilds.get('เสือ').castle,true);assert.ok(b.bag.items['break-guard']>=1);assert.ok(chat.some(t=>t.includes('ครอง')));
 assert.equal(a.world.rivals.length,0);assert.deepEqual(realm.guildTag(b),{name:'เสือ',emblem:1,castle:true});
});
