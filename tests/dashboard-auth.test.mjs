import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import path from 'node:path';
import {LocalStore,FirebaseStore} from '../server/storage.js';import {createHost} from '../server/host.js';

const catalog=JSON.parse(await readFile(new URL('../maps/world.json',import.meta.url),'utf8')),origin='http://127.0.0.1:8870';
async function hosted(options){
 const host=await createHost({catalog,origins:[origin],...options});await new Promise(r=>host.server.listen(0,'127.0.0.1',r));
 const url='http://127.0.0.1:'+host.server.address().port;
 const call=async(p,headers={})=>{const r=await fetch(url+p,{headers:{Origin:origin,...headers}});return {status:r.status};};
 return {call,close:()=>host.close()};
}

test('/dashboard is admin-gated in production, /health stays public', async()=>{
 const db={collection:()=>({get:async()=>({docs:[]}),doc:()=>({get:async()=>({exists:false,data:()=>null}),set:async()=>{},delete:async()=>{}})}),runTransaction:async fn=>fn({get:r=>r.get(),set:()=>{},delete:()=>{}})};
 const store=Object.assign(Object.create(FirebaseStore.prototype),{db,authorityUntil:Infinity,renewAuthority:async()=>{},releaseAuthority:async()=>{}});
 const authenticate=async token=>{if(token==='admin')return {uid:'u1',email:'chokkungfn@gmail.com',email_verified:true};if(token==='user')return {uid:'u2',email:'someone@gmail.com',email_verified:true};throw Object.assign(Error('bad'),{code:'auth/argument-error'});};
 const h=await hosted({mode:'firebase',store,authenticate});
 try{
  assert.equal((await h.call('/dashboard')).status,401,'no token rejected');
  assert.equal((await h.call('/dashboard',{Authorization:'Bearer user'})).status,403,'non-admin rejected');
  assert.equal((await h.call('/dashboard',{Authorization:'Bearer admin'})).status,200,'admin allowed');
  assert.equal((await h.call('/health')).status,200,'health stays public');
 }finally{await h.close();}
});

test('/dashboard trusts the loopback origin in local dev', async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'dash-auth-')),store=await new LocalStore(directory).init();
 const h=await hosted({mode:'local',store});
 try{assert.equal((await h.call('/dashboard')).status,200,'local dev needs no token');}
 finally{await h.close();await rm(directory,{recursive:true,force:true});}
});
