import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
import {LocalStore} from '../server/storage.js';import {createHost} from '../server/host.js';
import {levelStart} from '../experience.js';import {ITEMS} from '../items.js';import {petAccountAction} from '../pet-account.js';
const nav={zones:[{x:-30,z:-30,w:60,d:60}],obstacles:[],props:[]},catalog={capital:'field',maps:[{id:'field',name:'Field',safe:true,nav,spawn:{x:0,z:0},mobs:[],npcs:[],portals:[]}]};
test('character previews are owner scoped, read-only, and equal the actual realm stats/equipment',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'ayo-preview240-'));const store=await new LocalStore(dir).init();
 const a=await store.createLocal({name:'PreviewHero'}),b=await store.createLocal({name:'OtherHero'}),r=store.rows.get(a.uid);
 r.character.classId='boxer';r.state.mapId='field';r.state.traveler.baseXp=levelStart(99);r.stats={str:80,agi:60,vit:20,int:1,dex:30,luk:25};r.rebirth=3;
 const weapon=Object.entries(ITEMS).find(([,v])=>v.kind==='gear'&&v.slot==='weapon'&&v.classes?.includes('boxer')&&v.atk>0)[0];r.gear={weapon};r.equipment={version:1,weapon:'boxer-weapon-crafted',outfit:'boxer-outfit-crimson'};
 let pets=petAccountAction(null,{type:'petGrant',gems:0,pet:'garuda-dawn',requestId:'preview-grant'}).state;r.petCollection=petAccountAction(pets,{type:'petEquip',pet:'garuda-dawn',requestId:'preview-equip'}).state;
 const host=await createHost({mode:'local',store,catalog,origins:['http://localhost'],prologue:false});await new Promise(f=>host.server.listen(0,'127.0.0.1',f));
 const endpoint='http://127.0.0.1:'+host.server.address().port+'/character/previews';const get=token=>fetch(endpoint+'?uid='+b.uid,{headers:{origin:'http://localhost',Authorization:'Bearer '+token}});
 try{
  assert.equal((await get('invalid')).status,401);
  const before=JSON.stringify([...store.rows]),lease=JSON.stringify([...store.leases]);
  let response=await get(a.token),data=await response.json();assert.match(response.headers.get('cache-control'),/no-store/);assert.equal(data.characters.length,1);assert.equal(data.characters[0].character.name,'PreviewHero');
  const offline=data.characters[0];assert.equal(offline.stats.str,80);assert(offline.derived.atk>0);assert.equal(offline.equipment.outfit,'boxer-outfit-crimson');assert(!('localTokenHash' in offline));assert(!('bag' in offline));
  assert.equal(JSON.stringify([...store.rows]),before);assert.equal(JSON.stringify([...store.leases]),lease);assert.equal(host.realm.peers.size,0);
  const p=host.realm.join({uid:a.uid,serverId:'server-1',slotId:'slot-1',record:r,send(){}});
  data=await (await get(a.token)).json();assert.deepEqual(data.characters[0].derived,p.derived);assert.deepEqual(data.characters[0].gear,p.gear);assert.deepEqual(data.characters[0].equipment,p.equipment);assert.equal(data.characters[0].source,'live');assert.equal(host.realm.peers.size,1);
  assert.deepEqual(offline.derived,p.derived,'saved character calculation matches realm before transient changes');
  p.stats.str=81;host.realm.refreshStats(p);data=await (await get(a.token)).json();assert.equal(data.characters[0].stats.str,81);assert.deepEqual(data.characters[0].derived,p.derived);
  assert.equal((await (await get(b.token)).json()).characters[0].character.name,'OtherHero');
 }finally{await host.close();if(!path.resolve(dir).startsWith(path.resolve(os.tmpdir())+path.sep+'ayo-preview240-'))throw Error('temp path');await rm(dir,{recursive:true,force:true});}
});
import {FirebaseStore} from '../server/storage.js';
test('Firebase preview reads only the authenticated owner and distrusts new writable mirrors',async()=>{
 const refs=[],ref=p=>({path:p,collection:n=>ref(p+'/'+n),doc:n=>ref(p+'/'+n)});
 const character={name:'NewHero',gender:'male',classId:'boxer'},mirror={character,state:{mapId:'field',traveler:{baseXp:9999999}},gear:{weapon:'forged'},stats:{str:99},updatedAt:new (class {toMillis(){return Date.now();}})(),serverId:'server-1'};
 const db={collection:n=>ref(n),getAll:async(...r)=>{refs.push(...r.map(x=>x.path));return r.map((v,i)=>({exists:i===1,data:()=>mirror}));}};
 const rows=await new FirebaseStore(db).characterPreviews('owner-a');assert.equal(rows.length,1);assert.equal(rows[0].record.character.classId,'novice');assert.equal(rows[0].record.stats,undefined);assert.equal(rows[0].record.gear,undefined);assert.equal(rows[0].record.state.traveler.baseXp,0);
 assert.equal(refs.length,10);assert(refs.every(r=>r.startsWith('players/owner-a/characters/')||r.startsWith('multiplayerProfiles/owner-a/characters/')));
});
