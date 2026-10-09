import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {character,validEntry,initialSave,guestKey} from '../realm-state.js';
import {createRealmStore} from '../realm-store.js';
const catalog=JSON.parse(fs.readFileSync(new URL('../maps/world.json',import.meta.url)));
function memory(){const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)};}
const hero={name:'มะลิ',gender:'female',classId:'shaman'};
test('character validation accepts Thai and rejects markup and unavailable classes',()=>{
 assert.deepEqual(character({...hero,name:' มะลิ '}),hero);
 assert.throws(()=>character({...hero,name:'<script>'}));assert.throws(()=>character({...hero,name:' '}));
 assert.throws(()=>character({...hero,gender:'bad'}));assert.throws(()=>character({...hero,classId:'unknown'}));
});
test('entry belongs to both the selected server and account',()=>{
 const entry={owner:'alice',serverId:'server-1'};
 assert.equal(validEntry(entry,'alice','server-1'),true);assert.equal(validEntry(entry,'bob','server-1'),false);
 assert.equal(validEntry(entry,'alice','server-2'),false);assert.equal(validEntry({owner:'alice',serverId:'other'},'alice','other'),false);
});
test('guest realms remain separate across creation, save and reload',async()=>{
 const storage=memory(),store=createRealmStore({catalog,storage});
 const one=await store.create('server-1',hero),two=await store.create('server-2',{...hero,name:'ขุนไกร',gender:'male'});
 const state=initialSave();state.traveler.kills=8;state.mapId='lavo';await store.save('server-1',one,state);
 const reloaded=createRealmStore({catalog,storage});assert.equal((await reloaded.load('server-1')).state.traveler.kills,8);
 assert.equal((await reloaded.load('server-2')).state.traveler.kills,0);assert.equal((await reloaded.load('server-2')).character.name,'ขุนไกร');
 await assert.rejects(store.create('server-1',hero),/character-exists/);
 await assert.rejects(store.save('server-1',one,state),/save-conflict/);assert.equal(two.revision,1);
});
test('legacy progress migrates only to first realm and original stays intact',async()=>{
 const storage=memory(),legacy=initialSave();legacy.traveler.kills=21;storage.setItem('ayothaya-guest-v1',JSON.stringify(legacy));
 const store=createRealmStore({catalog,storage});assert.equal((await store.create('server-1',hero)).state.traveler.kills,21);
 assert.equal((await store.create('server-2',hero)).state.traveler.kills,0);
 assert.equal(JSON.parse(storage.getItem('ayothaya-guest-v1')).traveler.kills,21);
});
test('broken save and storage failures do not silently create a new character',async()=>{
 const storage=memory();storage.setItem(guestKey('server-1'),'{broken');
 await assert.rejects(createRealmStore({catalog,storage}).load('server-1'));
 assert.throws(()=>createRealmStore({owner:'someone',catalog,storage}),/account-changed/);
});
test('cloud adapter scopes saves by UID and realm and rejects stale revisions',async()=>{
 const docs=new Map(),reads=[];const snapshot=r=>({exists:()=>docs.has(r),data:()=>docs.get(r)});
 const connection={auth:{currentUser:{uid:'alice'}},db:{},sdk:{doc:(_, ...path)=>path.join('/'),getDocFromServer:async r=>{reads.push(r);return snapshot(r);},serverTimestamp:()=>123,
  runTransaction:async(_,fn)=>fn({get:async r=>snapshot(r),set:(r,v)=>docs.set(r,v)})}};
 const a=createRealmStore({catalog,connection,owner:'alice'}),first=await a.create('server-1',hero);
 await a.create('server-2',{...hero,name:'แก้ว'});const state=initialSave();state.traveler.kills=4;
 await a.save('server-1',first,state);await assert.rejects(a.save('server-1',first,state),/save-conflict/);
 assert.equal((await a.load('server-1')).state.traveler.kills,4);assert.equal((await a.load('server-2')).state.traveler.kills,0);
 assert.ok(reads.every(r=>r.startsWith('players/alice/saves/')));
 connection.sdk.getDocFromServer=async()=>{throw new Error('offline');};await assert.rejects(a.load('server-1'),/offline/);
});
