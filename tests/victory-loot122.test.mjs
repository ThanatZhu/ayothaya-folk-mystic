import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {mergeBossLoot,rareDrop,bossCard,involves} from '../boss-results.js';
import {pickGroundLoot} from '../server/ground-loot.js';
import {RealmServer} from '../server/realm.js';
import {MONSTER_TYPES} from '../combat-core.js';
import {ITEMS,bagCap,normalizeBag} from '../items.js';
import {initialSave} from '../realm-state.js';

const nav={zones:[{x:-40,z:-40,w:80,d:80}],obstacles:[],props:[]},map={id:'field',name:'Field',nav,spawn:{x:0,z:0},mobs:[]};
function world(){
 const realm=new RealmServer({catalog:{capital:'field',maps:[map]},now:()=>1000000});
 const join=name=>realm.join({uid:'uid-'+name,slotId:'slot-1',serverId:'server-1',record:{character:{name,gender:'female',classId:'hunter'},state:initialSave()},send(){}});
 return {realm,join};
}
function summon(realm,p){realm.summonBoss({mapId:'field',count:1,x:2,z:0});const boss=p.room.mobs.filter(m=>m.summoned&&m.hp>0).at(-1);boss.hp=boss.maxHp=500;return boss;}
const withRandom=(value,fn)=>{const real=Math.random;Math.random=()=>value;try{return fn();}finally{Math.random=real;}};
const reports=p=>p.room.events.filter(e=>e.type==='bossResult').map(r=>p.room.events.filter(e=>e.type==='bossLoot').reduce((a,e)=>mergeBossLoot(a,e),r));
const collect=(realm,p)=>{for(const d of [...p.room.groundLoot.values()]){Object.assign(p.world.player,{x:d.x,z:d.z});assert.equal(pickGroundLoot(realm,p,d.id),null);}};

test('the report carries what really landed in bags: MVP ember and rolled drops, no private ids (0.122)',()=>{
 const {realm,join}=world(),a=join('Kaew'),b=join('Mali');
 const boss=summon(realm,a);
 withRandom(0,()=>{realm.hurt(a,boss,300);realm.hurt(b,boss,999);});
 assert.ok(reports(a)[0].rewards.every(r=>r.status==='ground'));collect(realm,a);
 const [report]=reports(a);assert.ok(report,'report sent');assert.ok(Array.isArray(report.rewards));
 const ember=report.rewards.find(r=>r.itemId==='king-ember');assert.equal(ember.playerId,a.id);assert.equal(ember.status,'received');
 for(const row of report.rewards){
  assert.ok(rareDrop(row.itemId),row.itemId+' is rare');
  if(row.status==='received')assert.ok((realm.peers.get(row.playerId).bag.items[row.itemId]??0)>=row.count,row.itemId+' is in the bag');
 }
 assert.equal(report.rows[0].gender,'female');
 assert.ok(!JSON.stringify(report).includes('uid-')&&!JSON.stringify(report).includes('slot-1'));
 // the report goes out after the grants, once
 assert.equal(reports(a).length,1);
});

test('a full bag sends the drop to one "bag full" mail; lost only when the mailbox is full too',()=>{
 const {realm,join}=world(),a=join('Full');
 const baggable=Object.keys(normalizeBag({coins:0,items:Object.fromEntries(Object.keys(ITEMS).filter(id=>id!=='king-ember'&&ITEMS[id].kind!=='gear').map(id=>[id,1]))},999).items);
 a.bag={coins:0,items:Object.fromEntries(baggable.slice(0,bagCap(a.bag)).map(id=>[id,1]))};assert.equal(Object.keys(a.bag.items).length,bagCap(a.bag));
 const boss=summon(realm,a);
 withRandom(.99999,()=>realm.hurt(a,boss,999));
 collect(realm,a);
 const ember=reports(a)[0].rewards.find(r=>r.itemId==='king-ember');
 assert.equal(ember.status,'mailed');assert.equal(a.bag.items['king-ember'],undefined);
 const mails=a.mailbox.messages.filter(m=>m.id.startsWith('bagfull-'));assert.equal(mails.length,1);
 assert.deepEqual(mails[0].attachments.items.find(i=>i.id==='king-ember'),{id:'king-ember',count:1});
 // a second overflow tops up the same mail instead of filling the inbox
 realm.grantLoot(a,{coins:0,items:[{id:'king-ember',count:2},{id:'hp-small',count:3}]});
 const again=a.mailbox.messages.filter(m=>m.id.startsWith('bagfull-'));assert.equal(again.length,1);
 assert.equal(again[0].attachments.items.find(i=>i.id==='king-ember').count,3);assert.equal(again[0].readAt,0);
 // the mail is part of the saved record
 assert.ok(realm.record(a,{}).mailbox.messages.some(m=>m.id===again[0].id));
 const quiet=[];realm.grantLoot(a,{coins:5,items:[{id:'hp-small',count:3}]},null,{encounterId:'x',rows:quiet});assert.deepEqual(quiet,[],'non-rare loot is not listed');
 // mailbox full (claimed overflow mail gone, 200 letters): the drop is lost and says so
 a.mailbox={v:1,messages:Array.from({length:200},(_,i)=>({id:'gift-'+String(i).padStart(4,'0')+'-xxxx',title:'t',body:'b',sender:'s',attachments:{},serverId:'all',createdAt:1,readAt:0,claimedAt:0})),broadcastRead:{},deleted:{},broadcastDeleted:{}};
 const rows=[];realm.grantLoot(a,{coins:0,items:[{id:'king-ember',count:1}]},null,{encounterId:'y',rows});
 assert.equal(rows[0].status,'lost');assert.equal(a.mailbox.messages.length,200);
});

test('a ground reward waits for a mail action, then resolves its original boss receipt after pickup',()=>{
 const {realm,join}=world(),a=join('Busy');a.mailMutationBusy=true;
 const boss=summon(realm,a);withRandom(.99999,()=>realm.hurt(a,boss,999));
 const report=reports(a)[0],pending=report.rewards.find(r=>r.itemId==='king-ember');
 assert.equal(pending.status,'ground');assert.equal(a.bag.items?.['king-ember'],undefined);
 const drop=[...a.room.groundLoot.values()].find(d=>d.loot.items.some(i=>i.id==='king-ember'));
 Object.assign(a.world.player,{x:drop.x,z:drop.z});assert.equal(pickGroundLoot(realm,a,drop.id),'busy');
 a.mailMutationBusy=false;assert.equal(pickGroundLoot(realm,a,drop.id),null);
 const update=a.room.events.find(e=>e.type==='bossLoot'&&e.grantId===pending.grantId);
 assert.ok(update);assert.equal(update.encounterId,report.encounterId);assert.equal(update.rows[0].status,'received');
 const merged=mergeBossLoot(report,update);assert.equal(merged.rewards.find(r=>r.itemId==='king-ember').status,'received');
 assert.equal(a.bag.items['king-ember'],1);
});
test('direct reward grants queued behind mail retain their pending receipt confirmation',()=>{
 const {realm,join}=world(),a=join('Direct');a.mailMutationBusy=true;
 const receipt={encounterId:'direct',rows:[]};realm.grantLoot(a,{coins:0,items:[{id:'king-ember',count:1}]},null,receipt);
 assert.equal(receipt.rows[0].status,'pending');a.mailMutationBusy=false;
 for(const gift of a.mailLootQueue)realm.grantLoot(a,gift.loot,gift.at,gift.receipt);
 assert.equal(a.bag.items['king-ember'],1);assert.equal(a.room.events.find(e=>e.type==='bossLoot').rows[0].status,'received');
});

test('two bosses dying back to back keep separate reports and rewards',()=>{
 const {realm,join}=world(),a=join('First'),b=join('Second');
 const one=summon(realm,a),two=summon(realm,a);assert.notEqual(one.id,two.id);
 withRandom(.99999,()=>{realm.hurt(a,one,999);realm.hurt(b,two,999);});
 const [r1,r2]=reports(a);assert.notEqual(r1.encounterId,r2.encounterId);
 assert.deepEqual(r1.rewards.map(r=>r.playerId),[a.id]);assert.deepEqual(r2.rewards.map(r=>r.playerId),[b.id]);
 assert.ok(MONSTER_TYPES[one.type].boss&&MONSTER_TYPES[two.type].boss);
});

test('every boss has a card: 6 painted, 9 world-boss cards, 4 awakened auras; unknown ids fall back to the sprite',()=>{
 // rat/monkey/marsh chiefs are elites (no report) but their awakened forms are bosses and reuse the painted card
 const painted=['mill-keeper','lantern-lord','straw-king','rat-chief','monkey-chief','marsh-ape'];
 // rebirth draft bosses (rb-*) have no card yet and show their sprite
 const all=MONSTER_TYPES.filter(t=>t.boss).map(t=>t.id),bosses=all.filter(id=>!id.startsWith('rb-')),cards=[...new Set([...painted,...bosses])].map(bossCard);
 assert.equal(bosses.length,16);for(const id of all.filter(id=>id.startsWith('rb-')))assert.equal(bossCard(id).src,null,id);
 assert.equal(cards.filter(c=>c.src?.startsWith('assets/victory/')&&!c.awakened).length,6);
 assert.equal(cards.filter(c=>c.src?.startsWith('assets/cards147/')).length,9);
 assert.equal(cards.filter(c=>c.awakened&&c.src?.startsWith('assets/victory/')).length,4);
 for(const c of cards)assert.ok(existsSync(new URL('../'+c.src,import.meta.url)),c.src);
 assert.equal(bossCard('no-such-boss').src,null);
});

test('the pop-up is for fighters, zero-damage party members and drop recipients only',()=>{
 const result={groups:[{kind:'party',members:[{id:'a',damage:9},{id:'z',damage:0}]}],rewards:[{playerId:'r'}]};
 for(const id of ['a','z','r'])assert.ok(involves(result,id),id);
 assert.ok(!involves(result,'passer-by'));assert.ok(!involves(result,null));
});
