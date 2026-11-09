import test from 'node:test';
import assert from 'node:assert/strict';
import {createLedger,GOLD_SOURCES,GOLD_SINKS} from '../server/economy-ledger.js';
const gold=opts=>createLedger({sources:GOLD_SOURCES,sinks:GOLD_SINKS,...opts});
test('gold ledger books by its own reasons',()=>{
 const g=gold();g.record(500,'mail');g.record(-120,'gacha');
 const d=g.publicView().days[0];
 assert.deepEqual(d.in,{mail:500});assert.deepEqual(d.out,{gacha:120});assert.equal(d.net,380);
 assert.throws(()=>g.record(10,'monster'),/econ-reason/);
});
test('coin ledger is unchanged',()=>{
 const c=createLedger();c.record(5,'monster');
 assert.throws(()=>c.record(-5,'gacha'),/econ-reason/);
 assert.equal(c.publicView().pending,null);
});
test('pending survives save and load',()=>{
 const g=gold();g.setHeld(900,3,250);
 const v=gold({saved:g.toJSON()}).publicView();
 assert.equal(v.held,900);assert.equal(v.characters,3);assert.equal(v.pending,250);
});
test('host books a premium purchase as gold sink shop',async t=>{
 const {mkdtemp,rm}=await import('node:fs/promises'),os=await import('node:os'),path=await import('node:path'),{WebSocket}=await import('ws');
 const {LocalStore}=await import('../server/storage.js'),{createHost}=await import('../server/host.js');
 const nav={zones:[{x:-40,z:-40,w:80,d:80}],obstacles:[],props:[]},catalog={capital:'field',maps:[{id:'field',name:'Field',nav,spawn:{x:0,z:0},mobs:[],npcs:[]}]};
 const directory=await mkdtemp(path.join(os.tmpdir(),'ayothaya-goldbook-')),store=await new LocalStore(directory).init(),account=await store.createLocal({name:'GoldBook'});
 const row=store.rows.get(account.uid);row.state.mapId='field';row.petCollection={balance:2000};await store.flush();
 const host=await createHost({mode:'local',store,catalog,serveStatic:false,origins:['http://localhost']});await new Promise(r=>host.server.listen(0,'127.0.0.1',r));
 const port=host.server.address().port,ws=new WebSocket('ws://127.0.0.1:'+port+'/realtime',{origin:'http://localhost'});
 t.after(async()=>{ws.terminate();await host.close();await rm(directory,{recursive:true,force:true});});
 const next=type=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('timeout '+type)),5000);ws.on('message',function on(raw){const m=JSON.parse(raw);if(m.type===type){clearTimeout(timer);ws.off('message',on);resolve(m);}});});
 await new Promise(r=>ws.once('open',r));const welcome=next('welcome');ws.send(JSON.stringify({type:'join',token:account.token,serverId:'server-1',slotId:'slot-1'}));await welcome;
 const changed=next('shopChanged');ws.send(JSON.stringify({type:'premiumBuy',id:'gold-book-0001',sku:'break-guard',quantity:1,seq:1}));await changed;
 const view=await (await fetch('http://127.0.0.1:'+port+'/economy')).json();
 assert.equal(view.gold.days[0].out.shop,100);assert.equal(view.gold.days[0].net,-100);assert.ok(!JSON.stringify(view.gold).includes('GoldBook'));
});
