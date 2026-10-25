import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {depositAlbumCard,normalizeAlbumState} from '../card-album.js';
import {ALBUM_CARDS} from '../bounty.js';
import {MAX_COINS,ITEMS,normalizeBag} from '../items.js';
import {RealmServer} from '../server/realm.js';
import {initialSave} from '../realm-state.js';
const empty=()=>normalizeAlbumState(null);
test('only an exact monster card in the bag can be deposited; consumes one copy without mutating input',()=>{
 const bag={coins:0,items:{'card-rat':3}},state=empty(),r=depositAlbumCard(state,bag,'card-rat');
 assert.equal(r.bag.items['card-rat'],2);assert.deepEqual(r.state.album,['card-rat']);assert.deepEqual(bag.items,{'card-rat':3});assert.deepEqual(state.album,[]);
 for(const card of ['hp-small','card-rat+0','__proto__',null,{},['card-rat']])assert.throws(()=>depositAlbumCard(state,bag,card),/album-card/);
 assert.throws(()=>depositAlbumCard(state,{items:{}},'card-rat'),/album-owned/);
 assert.throws(()=>depositAlbumCard(r.state,r.bag,'card-rat'),/album-deposited/);
 assert.equal(depositAlbumCard(state,{items:{'card-rat':1}},'card-rat').bag.items['card-rat'],undefined);
});
test('legacy discoveries are not deposits; paid rewards stay paid across migration and reload',()=>{
 const legacy={album:ALBUM_CARDS.slice(0,6)},s=normalizeAlbumState(legacy);assert.deepEqual(s.album,[]);assert.deepEqual(s.albumRewards,[3,6]);
 let record=s,bag={coins:0,items:Object.fromEntries(ALBUM_CARDS.slice(0,6).map(id=>[id,1]))};
 for(const id of ALBUM_CARDS.slice(0,6)){const r=depositAlbumCard(record,bag,id);record=r.state;bag=r.bag;assert.deepEqual(r.milestones,[]);}
 assert.equal(bag.coins,0);assert.deepEqual(normalizeAlbumState(JSON.parse(JSON.stringify(record))),record);
});
test('milestones award once and only on explicit deposits',()=>{
 let state=empty(),bag={coins:0,items:Object.fromEntries(ALBUM_CARDS.slice(0,3).map(id=>[id,2]))},r;
 for(const id of ALBUM_CARDS.slice(0,3)){r=depositAlbumCard(state,bag,id);state=r.state;bag=r.bag;}
 assert.equal(bag.coins,500);assert.equal(bag.items['hp-large'],5);assert.deepEqual(state.albumRewards,[3]);assert.deepEqual(r.milestones.map(m=>m.count),[3]);
 assert.throws(()=>depositAlbumCard(state,bag,ALBUM_CARDS[2]),/album-deposited/);assert.equal(bag.coins,500);
});
test('full bag, full reward stack and coin cap reject the entire deposit without consuming the card',()=>{
 const state={...empty(),album:ALBUM_CARDS.slice(0,2)},id=ALBUM_CARDS[2];
 const filler=Object.keys(ITEMS).filter(x=>x!==id&&x!=='hp-large'&&normalizeBag({items:{[x]:1}}).items[x]).slice(0,39);
 for(const bag of [{coins:0,items:{[id]:2,...Object.fromEntries(filler.map(x=>[x,1]))}},{coins:0,items:{[id]:1,'hp-large':999}},{coins:MAX_COINS,items:{[id]:1}}]){
  const before=structuredClone(bag);assert.throws(()=>depositAlbumCard(state,bag,id),/album-full|album-coins/);assert.deepEqual(bag,before);assert.equal(state.album.length,2);
 }
 const bag={items:{[id]:1,...Object.fromEntries(filler.map(x=>[x,1]))}},r=depositAlbumCard(state,bag,id);assert.equal(Object.keys(r.bag.items).length,40);assert.equal(r.bag.items['hp-large'],5);
});
test('authoritative server: loot does not count; deposit ignores client count; repeat and trade cannot consume again; persists across rejoin',()=>{
 const catalog=JSON.parse(readFileSync(new URL('../maps/world.json',import.meta.url))),realm=new RealmServer({catalog}),original={character:{name:'AlbumQA',gender:'male',classId:'novice'},state:initialSave(),album:ALBUM_CARDS.slice(0,3)},sent=[];
 const p=realm.join({uid:'album',serverId:'server-1',slotId:'slot-1',record:original,send:m=>sent.push(m)});
 assert.deepEqual(p.album,[]);realm.grantLoot(p,{items:[{id:'card-rat',count:2}],coins:0});assert.deepEqual(p.album,[]);
 const command=data=>realm.receive(p.id,{type:'albumDeposit',seq:p.seq+1,...data});
 assert.equal(command({card:'card-rat',count:999,album:ALBUM_CARDS}),true);assert.equal(p.bag.items['card-rat'],1);assert.deepEqual(p.album,['card-rat']);
 assert.equal(command({card:'card-rat'}),false);assert.equal(p.bag.items['card-rat'],1);
 realm.grantLoot(p,{items:[{id:'card-straw',count:1}],coins:0});p.trade={locked:true};assert.equal(command({card:'card-straw'}),false);assert.equal(p.bag.items['card-straw'],1);p.trade=null;
 assert.deepEqual(realm.snapshot(p).self.album,['card-rat']);assert.equal(realm.snapshot(p).self.albumSchema,2);
 const saved=realm.record(p,original);realm.leave(p.id);const p2=realm.join({uid:'album',serverId:'server-1',slotId:'slot-1',record:JSON.parse(JSON.stringify(saved)),send:()=>{}});
 assert.deepEqual(p2.album,['card-rat']);assert.equal(p2.bag.items['card-rat'],1);assert.deepEqual(p2.albumRewards,[3]);
});
