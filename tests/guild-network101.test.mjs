// 1.01 guild hall over real sockets: two members share one hall room, an outsider is refused, donations persist.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {WebSocket} from 'ws';
import {LocalStore} from '../server/storage.js';
import {createHost} from '../server/host.js';
import {GUILD_COST,GUILD_HALL} from '../social.js';
const catalog=JSON.parse(await readFile(new URL('../maps/world.json',import.meta.url),'utf8'));

test('two guild members enter the same private hall over the network; a non-member cannot', async () => {
 assert.ok(catalog.maps.find(m=>m.id===GUILD_HALL)?.guildHall,'world.json has the hall');
 const base=path.resolve('.local-multiplayer');await mkdir(base,{recursive:true});const directory=await mkdtemp(path.join(base,'guild101-')),store=await new LocalStore(directory).init(),origin='http://127.0.0.1:8871';
 const host=await createHost({mode:'local',store,catalog,origins:[origin]});await new Promise(r=>host.server.listen(0,'127.0.0.1',r));const port=host.server.address().port,clients=[];
 const wait=async(predicate,what='')=>{for(let i=0;i<250;i++){if(predicate())return;await new Promise(r=>setTimeout(r,20));}assert.fail('Timed out '+what);};
 const open=async token=>{const ws=new WebSocket(`ws://127.0.0.1:${port}/realtime`,{origin}),messages=[];let seq=0;clients.push(ws);ws.on('message',v=>messages.push(JSON.parse(v)));await new Promise((resolve,reject)=>{ws.once('open',resolve);ws.once('error',reject);});
  ws.send(JSON.stringify({type:'join',token,serverId:'server-1',slotId:'slot-1'}));await wait(()=>messages.some(m=>m.type==='welcome'),'welcome');
  return {ws,messages,welcome:messages.find(m=>m.type==='welcome'),cmd:(type,data={})=>ws.send(JSON.stringify({type,seq:++seq,...data})),
   events:type=>messages.filter(m=>m.type==='events').flatMap(m=>m.events).filter(e=>e.type===type)};};
 const travel=async(c,destination)=>{c.ws.send(JSON.stringify({type:'travel',id:'t-'+destination,destination}));await wait(()=>c.messages.some(m=>m.id==='t-'+destination),'travel');return c.messages.find(m=>m.id==='t-'+destination);};
 try{
  const one=await store.createLocal({name:'แม่ทัพหนึ่ง'}),two=await store.createLocal({name:'ทหารสอง'}),out=await store.createLocal({name:'คนนอก'});
  store.rows.get(one.uid).bag={coins:GUILD_COST+5000,items:{}};store.rows.get(two.uid).bag={coins:2000,items:{}};
  const a=await open(one.token),b=await open(two.token),c=await open(out.token);
  a.cmd('guildCreate',{name:'ทัพหน้า',emblem:7});await wait(()=>a.events('guild').some(e=>e.guild?.name==='ทัพหน้า'),'guild');
  await new Promise(r=>setTimeout(r,1100));a.cmd('guildInvite',{name:'ทหารสอง'});await wait(()=>b.events('guildAsk').length,'invite');
  b.cmd('guildAnswer',{guild:b.events('guildAsk')[0].guild,accept:true});await wait(()=>b.events('guild').some(e=>e.guild?.members.length===2),'join');
  const before=[...host.realm.peers.values()].find(p=>p.character.name==='ทหารสอง').bag.coins;
  await new Promise(r=>setTimeout(r,1100));b.cmd('guildDonate',{coins:1500});await wait(()=>a.events('guild').some(e=>e.guild?.treasury===1500),'donation seen by the leader');
  assert.equal(host.realm.guildOf([...host.realm.peers.values()].find(p=>p.character.name==='ทหารสอง')).members.find(m=>m.name==='ทหารสอง').contrib,150);
  // outsider: refused, stays put
  assert.equal((await travel(c,GUILD_HALL)).code,'guild-hall');
  // members: travel, reconnect, land in the same hall room
  for(const x of [a,b])assert.equal((await travel(x,GUILD_HALL)).type,'traveled');
  await wait(()=>[...host.realm.peers.values()].filter(p=>p.character.name!=='คนนอก').length===0,'travellers left');
  const a2=await open(one.token),b2=await open(two.token);
  assert.match(a2.welcome.room,/^server-1:guild-hall:/);assert.equal(a2.welcome.room,b2.welcome.room,'same guild, same hall');
  await wait(()=>a2.messages.some(m=>m.type==='snapshot'&&m.players?.some(p=>p.character?.name==='ทหารสอง'||p.id===b2.welcome.id)),'members see each other in the hall');
  assert.equal(store.rows.get(two.uid).bag.coins,before-1500,'donation saved');
 }finally{for(const x of clients)x.terminate();await host.close();assert.ok(path.resolve(directory).startsWith(base+path.sep));await rm(directory,{recursive:true,force:true});}
});
