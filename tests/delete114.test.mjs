import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {LocalStore} from '../server/storage.js';
import {createHost} from '../server/host.js';
import {createRealmStore} from '../realm-store.js';
const catalog=JSON.parse(await readFile(new URL('../maps/world.json',import.meta.url),'utf8'));
test('a player deletes their own character: token required, origin checked, refused while in a game',async()=>{
 const base=path.resolve('.local-multiplayer');await mkdir(base,{recursive:true});const directory=await mkdtemp(path.join(base,'delete114-')),store=await new LocalStore(directory).init(),origin='http://127.0.0.1:8871';
 const host=await createHost({mode:'local',store,catalog,origins:[origin]});await new Promise(r=>host.server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${host.server.address().port}/character/delete`;
 const del=(token,o=origin,slotId='slot-1')=>fetch(url,{method:'POST',headers:{origin:o,authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify({slotId})});
 try{
  const one=await store.createLocal({name:'ลบได้'});
  assert.equal((await del('nope')).status,401);
  assert.equal((await del(one.token,'http://evil.test')).status,403);
  assert.equal((await del(one.token,origin,'slot-9')).status,400);
  store.leases.set(one.uid,{id:'x',expires:Date.now()+60000});assert.equal((await del(one.token)).status,409);store.leases.delete(one.uid);
  assert.equal((await del(one.token)).status,200);assert.equal(store.rows.has(one.uid),false);
  assert.equal((await del(one.token)).status,401); // the token died with the character
 }finally{await host.close();assert.ok(path.resolve(directory).startsWith(base+path.sep));await rm(directory,{recursive:true,force:true});}
});
test('browser saves: deleting slot 1 also drops the old per-server key so it is not migrated back',async()=>{
 const mem=new Map(),storage={getItem:k=>mem.get(k)??null,setItem:(k,v)=>mem.set(k,String(v)),removeItem:k=>mem.delete(k)};
 const store=createRealmStore({owner:'guest',catalog,storage});
 const row=await store.create('server-1',{name:'ทดสอบลบ',gender:'male'});
 mem.set('ayothaya-character-v1:server-1',mem.get('ayothaya-character-v2:slot-1')); // what an old browser save looks like
 await store.remove(row);assert.deepEqual(await store.list(),[]);
});
