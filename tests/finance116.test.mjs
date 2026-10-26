import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {LocalStore} from '../server/storage.js';
import {createHost} from '../server/host.js';
import {cleanFinance} from '../server/finance.js';

const catalog=JSON.parse(await readFile(new URL('../maps/world.json',import.meta.url),'utf8')),origin='http://127.0.0.1:8870';
async function hosted(){
 const directory=await mkdtemp(path.join(tmpdir(),'finance116-')),store=await new LocalStore(directory).init();
 const host=await createHost({mode:'local',store,catalog,origins:[origin]});await new Promise(r=>host.server.listen(0,'127.0.0.1',r));
 const url='http://127.0.0.1:'+host.server.address().port;
 const api=async(p,body)=>{const r=await fetch(url+p,{method:body?'POST':'GET',headers:{Origin:origin,'Content-Type':'application/json'},body:body&&JSON.stringify(body)});return {status:r.status,data:await r.json()};};
 return {api,store,close:async()=>{await host.close();await rm(directory,{recursive:true,force:true});}};
}
const tx=(id,amount)=>({id,type:'expense',date:'2026-10-26',title:'DigitalOcean',payer:'Chok',amount,slip:{type:'image/jpeg',size:9,name:'a.jpg',at:'x'}});

test('two browsers share one book; a save from an old revision is refused with the newer book', async()=>{
 const {api,close}=await hosted();
 try{
  assert.equal((await api('/admin/finance')).data.books,null,'nothing saved yet');
  const first=await api('/admin/finance',{baseRev:0,costs:[{id:'c1',name:'DO',thb:170}],ledger:[tx('t1',170)]});
  assert.equal(first.status,200);assert.equal(first.data.books.rev,1);
  const other=await api('/admin/finance');assert.deepEqual(other.data.books.ledger.map(r=>r.id),['t1'],'a second browser reads the same rows');
  const late=await api('/admin/finance',{baseRev:0,costs:[],ledger:[]});
  assert.equal(late.status,409);assert.equal(late.data.books.rev,1,'stale save gets the current book back, nothing lost');
  const next=await api('/admin/finance',{baseRev:1,costs:[],ledger:[tx('t1',170),tx('t2',250)]});assert.equal(next.data.books.rev,2);
 }finally{await close();}
});

test('slips round-trip; bad ids, types and junk rows are rejected', async()=>{
 const {api,close}=await hosted();
 try{
  const data=Buffer.from('fake-jpeg-bytes').toString('base64');
  assert.equal((await api('/admin/finance/slip',{id:'t1',type:'image/jpeg',data})).status,200);
  assert.deepEqual((await api('/admin/finance/slip?id=t1')).data,{type:'image/jpeg',data});
  assert.equal((await api('/admin/finance/slip',{id:'../x',type:'image/jpeg',data})).status,400);
  assert.equal((await api('/admin/finance/slip',{id:'t2',type:'text/html',data})).status,400);
  assert.equal((await api('/admin/finance/slip-delete',{id:'t1'})).status,200);
  assert.equal((await api('/admin/finance/slip?id=t1')).status,404);
  assert.equal((await api('/admin/finance',{baseRev:0,costs:[],ledger:[{id:'t1',evil:{nested:true}}]})).status,400);
 }finally{await close();}
});

test('rows keep plain values only and duplicate ids collapse', () => {
 const doc=cleanFinance({costs:[],ledger:[tx('a',1),tx('a',2),{id:'b',note:'x'.repeat(900)}]});
 assert.deepEqual(doc.ledger.map(r=>r.id),['a','b']);assert.equal(doc.ledger[1].note.length,500);
 assert.throws(()=>cleanFinance({costs:[],ledger:[{id:'c',amount:Infinity}]}),/finance-invalid/);
});
