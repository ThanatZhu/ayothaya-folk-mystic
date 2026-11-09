import test from 'node:test';import assert from 'node:assert/strict';
import {dungeonWorld} from './helpers/dungeon.mjs';

test('the realm counts coins made and spent by reason, and ignores coins moved between players',()=>{
 const w=dungeonWorld(),a=w.join('เอ'),b=w.join('บี'),books=()=>w.realm.econ.today();
 w.realm.grantLoot(a,{coins:300,items:[]},null,null,'monster');
 w.realm.setBag(a,{...a.bag,coins:a.bag.coins-50},'refine');
 w.realm.setBag(a,{...a.bag,coins:a.bag.coins-100},null);w.realm.setBag(b,{...b.bag,coins:b.bag.coins+100},null);
 w.realm.setBag(a,{...a.bag,coins:a.bag.coins+7});
 w.realm.econRecord(-9,'not-a-reason');
 assert.deepEqual(books().in,{monster:300,other:7});assert.deepEqual(books().out,{refine:50,other:9});
});
test('loot that waits for a busy mailbox keeps its reason',()=>{
 const w=dungeonWorld(),a=w.join('เอ');a.mailMutationBusy=true;
 w.realm.grantLoot(a,{coins:40,items:[]},null,null,'daily');a.mailMutationBusy=false;
 for(const g of a.mailLootQueue.splice(0))w.realm.grantLoot(a,g.loot,g.at,g.receipt??null,g.reason);
 assert.deepEqual(w.realm.econ.today().in,{daily:40});
});

import fs from 'node:fs';import {mkdtemp,writeFile,readFile} from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
import {LocalStore} from '../server/storage.js';import {createHost} from '../server/host.js';
test('the host loads the saved books, serves them publicly on /economy and saves them on shutdown',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'econ-')),catalog=JSON.parse(fs.readFileSync(new URL('../maps/world.json',import.meta.url)));
 const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok'}).format(new Date());
 await writeFile(path.join(dir,'economy.json'),JSON.stringify({days:[{day,in:{monster:900},out:{warp:100}}],held:5000,characters:3,heldAt:1}));
 const store=await new LocalStore(dir).init(),host=await createHost({mode:'local',store,catalog,origins:['http://127.0.0.1:4173']});
 await new Promise(r=>host.server.listen(0,'127.0.0.1',r));
 try{
  const r=await fetch('http://127.0.0.1:'+host.server.address().port+'/economy',{headers:{Origin:'https://someone-else.example'}});
  assert.equal(r.status,200);assert.equal(r.headers.get('access-control-allow-origin'),'*');
  const v=await r.json();assert.equal(v.days.at(-1).net,800);assert.equal(v.sources.monster.th,'ดรอปจากมอนสเตอร์');
  host.realm.econRecord(-50,'refine');
 }finally{await host.close();}
 const saved=JSON.parse(await readFile(path.join(dir,'economy.json'),'utf8'));assert.equal(saved.days.at(-1).out.refine,50);
});
