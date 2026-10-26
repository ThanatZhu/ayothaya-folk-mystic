import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {LocalStore,FirebaseStore} from '../server/storage.js';
import {createHost} from '../server/host.js';

const catalog=JSON.parse(await readFile(new URL('../maps/world.json',import.meta.url),'utf8')),origin='http://127.0.0.1:8870';
async function hosted(options){
 const host=await createHost({catalog,origins:[origin],...options});await new Promise(r=>host.server.listen(0,'127.0.0.1',r));
 const url='http://127.0.0.1:'+host.server.address().port;
 const call=async(p,body,headers={})=>{const r=await fetch(url+p,{method:body?'POST':'GET',headers:{Origin:origin,'Content-Type':'application/json',...headers},body:body&&JSON.stringify(body)});return {status:r.status,data:await r.json()};};
 return {call,close:()=>host.close()};
}

test('consent is recorded per account and read back on another device', async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'consent117-')),store=await new LocalStore(directory).init();
 const {call,close}=await hosted({mode:'local',store});
 try{
  assert.deepEqual((await call('/consent?uid=a')).data,{version:null,at:null});
  assert.equal((await call('/consent?uid=a',{version:'2026-10-27'})).status,200);
  const back=await call('/consent?uid=a');assert.equal(back.data.version,'2026-10-27');assert.ok(back.data.at>0);
  assert.equal((await call('/consent?uid=b')).data.version,null,'another account is not affected');
  assert.equal((await call('/consent?uid=a',{version:'yes please'})).status,400);
 }finally{await close();await rm(directory,{recursive:true,force:true});}
});

test('in production the uid comes only from a verified token', async()=>{
 const saved=[];const ref=(name,id)=>({get:async()=>({exists:false,data:()=>null}),set:async doc=>{saved.push({name,id,doc});},delete:async()=>{}});
 const db={collection:name=>({get:async()=>({docs:[]}),doc:id=>ref(name,id)}),runTransaction:async fn=>fn({get:r=>r.get(),set:(r,d)=>r.set(d),delete:()=>{}})};
 const store=Object.assign(Object.create(FirebaseStore.prototype),{db,authorityUntil:Infinity,renewAuthority:async()=>{},releaseAuthority:async()=>{}});
 const authenticate=async token=>{if(token!=='good')throw Object.assign(Error('bad'),{code:'auth/argument-error'});return {uid:'real-uid',email:'p@example.com'};};
 const h=await hosted({mode:'firebase',store,authenticate});
 try{
  assert.equal((await h.call('/consent?uid=spoofed',{version:'2026-10-27'})).status,401);
  assert.equal((await h.call('/consent?uid=spoofed',{version:'2026-10-27'},{Authorization:'Bearer good'})).status,200);
  assert.equal(saved.at(-1).id,'real-uid');assert.equal(saved.at(-1).name,'playerConsents');assert.equal(saved.at(-1).doc.email,'p@example.com');
 }finally{await h.close();}
});
