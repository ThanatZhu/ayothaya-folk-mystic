// 0.114.1 audit fixes: inherited object keys are never items, and a fresh client mirror can't import progress.
import test from 'node:test';
import assert from 'node:assert/strict';
import {ITEMS,itemDef} from '../items.js';
import {buyFromStall} from '../market.js';
import {buyFromShop,sellToShop,tradePerks} from '../market-board.js';
import {FirebaseStore,MIRROR_CUTOFF} from '../server/storage.js';
import {initialSave} from '../realm-state.js';

const loot=Object.keys(ITEMS).find(id=>ITEMS[id].kind==='loot');
test('prototype keys like constructor are not items anywhere in the market',()=>{
 for(const id of ['constructor','toString','valueOf','hasOwnProperty'])assert.equal(itemDef(id),null);
 const seller={coins:5,items:{[loot]:3}},buyer={coins:0,items:{}},perks=tradePerks(0);
 assert.throws(()=>buyFromStall(seller,{items:{[loot]:{count:3,price:10}}},buyer,'constructor',1),/not-sold/);
 const shop=kind=>({kind,status:'open',createdAt:0,expiresAt:1e15,items:{[loot]:{count:3,price:10}},escrow:30,pouch:{coins:0,items:{}}});
 assert.throws(()=>buyFromShop(shop('sell'),buyer,'constructor',1,perks),/not-sold/);
 assert.throws(()=>sellToShop(shop('buy'),seller,'constructor',1,perks),/not-wanted/);
});

class Stamp{constructor(ms){this.ms=ms;}toMillis(){return this.ms;}}
// Minimal Firestore stand-in: enough for acquire()'s transaction.
function db(){
 const docs=new Map(),ref=p=>({path:p,collection:c=>({doc:d=>ref(p+'/'+c+'/'+d)})});
 return {docs,collection:c=>({doc:d=>ref(c+'/'+d)}),runTransaction:async fn=>{const w=[],r=await fn({get:async x=>({exists:docs.has(x.path),data:()=>{const v=docs.get(x.path);return {...structuredClone({...v,updatedAt:null}),updatedAt:v.updatedAt};}}),set:(x,d)=>w.push(()=>docs.set(x.path,d)),update:(x,d)=>w.push(()=>docs.set(x.path,{...docs.get(x.path),...d})),delete:x=>w.push(()=>docs.delete(x.path))});w.forEach(f=>f());return r;}};
}
test('a first join ignores level, class and map written to the mirror after the cutoff',async()=>{
 const d=db(),store=new FirebaseStore(d),ts=ms=>new Stamp(ms),hacked=()=>{const s=initialSave();s.traveler.baseXp=99999999;s.traveler.jobXp=5000000;s.mapId='mill-cellar';return s;};
 const row=at=>({serverId:'server-1',revision:7,updatedAt:ts(at),character:{name:'ทดสอบ',gender:'male',classId:'shaman',jobId:'yantra-master',appearance:{outfit:'indigo',hair:'braid',hairColor:'black',eyes:'brown',beard:'none',tattoo:'none',garment:'cloak'}},state:hacked()});
 await store.renewAuthority();
 d.docs.set('players/u1/characters/slot-1',row(MIRROR_CUTOFF+1));
 const s=await store.acquire({uid:'u1',serverId:'server-1',slotId:'slot-1'},'L');
 assert.deepEqual(s.record.state,initialSave());assert.equal(s.record.character.classId,'novice');assert.equal(s.record.character.jobId,undefined);
 assert.equal(s.record.character.name,'ทดสอบ');assert.equal(s.record.character.appearance.outfit,'indigo');
 d.docs.set('players/u2/characters/slot-1',row(MIRROR_CUTOFF-1));
 const old=await store.acquire({uid:'u2',serverId:'server-1',slotId:'slot-1'},'L');
 assert.equal(old.record.state.traveler.baseXp,99999999);assert.equal(old.record.character.classId,'shaman');
});
