import {pickGroundLoot} from '../server/ground-loot.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import catalog from '../maps/world.json' with {type:'json'};
import {WORLD_MAP_BOSSES,CHAPTER2_MONSTERS,WORLD_BOSS_RESPAWN} from '../chapter2-monsters.js';
import {MONSTER_TYPES,CombatWorld,walkable,findPath} from '../combat-core.js';
import {ITEMS,DROPS,rollLoot,normalizeBag} from '../items.js';
import {craft,recipeFor} from '../crafting.js';
import {RealmServer} from '../server/realm.js';
import {MapBossClock} from '../server/map-bosses.js';
import {monsterFrame} from '../monster-catalog.js';
import {LocalStore,FirebaseStore} from '../server/storage.js';
import {createHost} from '../server/host.js';
import {initialSave} from '../realm-state.js';
const type=id=>MONSTER_TYPES.find(t=>t.id===id);
function setup(){
 let time=Date.UTC(2026,9,24,3),uid=0;const realm=new RealmServer({catalog,now:()=>time});
 const join=(mapId='bamboo-grove',channel=1,serverId='server-1')=>{
  const state=initialSave();state.mapId=mapId;
  return realm.join({uid:'boss-test-'+uid++,serverId,slotId:'slot-1',channel,record:{character:{name:'ผู้ทดสอบ',gender:'male',classId:'swordsman'},state},send:()=>{}});
 };
 const boss=p=>p.room.mobs.find(m=>type(WORLD_MAP_BOSSES.find(b=>b.mapId===p.room.map.id).id)===MONSTER_TYPES[m.type]);
 const kill=p=>{const m=boss(p);Object.assign(p.world.player,{x:m.x+1,z:m.z});realm.hurt(p,m,m.hp+1);return m;};
 return {realm,join,boss,kill,advance:ms=>time+=ms,now:()=>time};
}

test('online monster deltas carry both alternating gait and the strike pose',()=>{
 const s=setup(),p=s.join(),m=s.boss(p);Object.assign(p.world.player,{x:m.x+1,z:m.z});
 Object.assign(m,{moving:true,step:0,windup:0,strike:0,hit:0});
 const copy={...s.realm.mobDelta(p).find(v=>v.id===m.id)};assert.equal(monsterFrame(copy,0),1);
 m.step=.8;Object.assign(copy,s.realm.mobDelta(p).find(v=>v.id===m.id));assert.equal(monsterFrame(copy,0),2);
 m.strike=.24;Object.assign(copy,s.realm.mobDelta(p).find(v=>v.id===m.id));assert.equal(monsterFrame(copy,0),4);
 m.strike=0;m.moving=false;Object.assign(copy,s.realm.mobDelta(p).find(v=>v.id===m.id));assert.equal(monsterFrame(copy,0),0);
});
test('all nine field bosses have the exact 500k ladder, one reachable spawn and one-hour respawn',()=>{
 assert.equal(WORLD_MAP_BOSSES.length,9);assert.equal(WORLD_BOSS_RESPAWN,3600);assert.equal(CHAPTER2_MONSTERS.length,29);
 for(const [i,b] of WORLD_MAP_BOSSES.entries()){
  assert.equal(type(b.id).hp,500000*(i+1));assert.equal(type(b.id).respawn,3600);assert.ok(type(b.id).worldBoss);
  const map=catalog.maps.find(m=>m.id===b.mapId),spawns=map.mobs.filter(([,,t])=>MONSTER_TYPES[t].worldBoss);
  assert.equal(spawns.length,1);assert.equal(MONSTER_TYPES[spawns[0][2]].id,b.id);
  assert.ok(findPath(map.spawn,{x:spawns[0][0],z:spawns[0][1]},map.nav).length);
  assert.ok(Math.hypot(spawns[0][0]-map.spawn.x,spawns[0][1]-map.spawn.z)>=14);
  if(i>=4){const sim=new CombatWorld(map);assert.equal(sim.mobs.length,56);for(const m of sim.mobs)assert.ok(walkable(m.x,m.z,.32,map.nav));}
 }
 for(const map of catalog.maps.filter(m=>m.safe||m.instance))assert.equal(map.mobs.filter(([,,i])=>MONSTER_TYPES[i].worldBoss).length,0);
 for(let i=5;i<9;i++){
  const previous=CHAPTER2_MONSTERS.filter(m=>m.mapId===WORLD_MAP_BOSSES[i-1].mapId&&!m.boss&&!m.elite);
  const next=CHAPTER2_MONSTERS.filter(m=>m.mapId===WORLD_MAP_BOSSES[i].mapId&&!m.boss&&!m.elite);
  assert.ok(Math.min(...next.map(m=>m.level))>Math.max(...previous.map(m=>m.level)));
  assert.ok(Math.min(...next.map(m=>m.hp))>Math.max(...previous.map(m=>m.hp)));
 }
});
test('new loot is baggable, wearable and craftable; every new monster has a complete drop table',()=>{
 const icons=[];
 for(const b of WORLD_MAP_BOSSES){
  for(const id of [b.material,b.accessory]){assert.ok(ITEMS[id]);icons.push(ITEMS[id].icon);}
  assert.ok(DROPS[b.id].items.some(([id,chance,n])=>id===b.material&&chance===1&&n===5));
  assert.ok(DROPS[b.id].items.some(([id,chance])=>id===b.accessory&&chance===.08));
  assert.ok(rollLoot(b.id,()=>0).items.some(i=>i.id.split('!')[0]===b.accessory),'drop keeps its valid base gear ID when an affix is rolled');
  const recipe=recipeFor(b.accessory),bag=normalizeBag({coins:recipe.coins,items:recipe.needs});
  const made=craft(bag,b.accessory);assert.equal(made.bag.items[b.accessory],1);assert.equal(made.bag.coins,0);
 }
 assert.equal(new Set(icons).size,18);assert.ok(icons.every(n=>n>=0&&n<24));
 for(const t of CHAPTER2_MONSTERS)for(const [id,chance] of DROPS[t.id].items){assert.ok(ITEMS[id]);assert.ok(chance>0&&chance<=1);}
});
test('all 29 production monsters have authored eight-pose assets with shared scale',async()=>{
 for(const m of CHAPTER2_MONSTERS){
  const meta=JSON.parse(await readFile(new URL('../assets/monsters-chapter2/animations/'+m.id+'.json',import.meta.url),'utf8'));
  assert.equal(meta.frames.length,8);assert.equal(meta.bodyHeight,m.bodyHeight);assert.ok(meta.frames.every(f=>f.clipRows.length>0));
  await readFile(new URL('../assets/monsters-chapter2/animations/'+meta.source,import.meta.url));
 }
});
test('death deadline survives empty rooms, respects exact wall time and is independent per CH/realm',()=>{
 const s=setup(),p=s.join(),killed=s.kill(p);assert.equal(killed.hp,0);assert.equal(killed.dead,3600);
 collectGround(s.realm,p);assert.ok(p.bag.items['relic-bamboo']>=5,'guaranteed material paid once');
 s.realm.leave(p.id);assert.equal(s.realm.rooms.size,0);
 const again=s.join();assert.equal(s.boss(again).hp,0);assert.equal(s.boss(s.join('bamboo-grove',2)).hp,2500000);assert.equal(s.boss(s.join('bamboo-grove',1,'server-2')).hp,2500000);
 s.advance(3599999);s.realm.step(.05);assert.equal(s.boss(again).hp,0,'must not respawn one millisecond early');
 s.advance(1);s.realm.step(.05);assert.equal(s.boss(again).hp,2500000);
 s.kill(again);assert.equal(s.realm.mapBosses.remaining(again.room),3600,'new hour begins at second death');
});
test('persisted deadlines survive a fresh server object and do not pay duplicate loot',async()=>{
 const s=setup(),p=s.join('naga-cave');s.kill(p);
 const dir=await mkdtemp(fileURLToPath(new URL('../outputs/boss-clock-',import.meta.url))),store=await new LocalStore(dir).init();
 s.realm.mapBosses.onChange=rows=>store.saveMapBosses(rows);await s.realm.mapBosses.flush();
 const saved=await (await new LocalStore(dir).init()).loadMapBosses(),fresh=new RealmServer({catalog,now:s.now});
 fresh.mapBosses.restore(saved);
 const state=initialSave();state.mapId='naga-cave';
 const joined=fresh.join({uid:'restored',serverId:'server-1',slotId:'slot-1',channel:1,record:{character:{name:'ผู้กลับมา',gender:'male',classId:'swordsman'},state},send:()=>{}});
 const boss=joined.room.mobs.find(m=>MONSTER_TYPES[m.type].worldBoss);
 assert.equal(boss.hp,0);assert.equal(boss.dead,3600);assert.equal(joined.bag.items['relic-naga'],undefined);
 fresh.hurt(joined,boss,1e9);assert.equal(joined.bag.items['relic-naga'],undefined);
});
test('rapid kills serialize the latest timer state, retry a failed write and hold the down pose',async()=>{
 const s=setup(),a=s.join(),b=s.join('ruined-temple');let snapshots=[],resolve;
 s.realm.mapBosses.onChange=async rows=>{snapshots.push(rows);if(snapshots.length===1)await new Promise(r=>resolve=r);};
 s.kill(a);await new Promise(r=>setImmediate(r));s.kill(b);resolve();await s.realm.mapBosses.flush();assert.equal(snapshots.at(-1).length,2);
 const clock=s.realm.mapBosses;let attempts=0;clock.onChange=async()=>{if(attempts++===0)throw new Error('temporary-test-failure');};
 clock.dirty=true;await assert.rejects(clock.persist(),/temporary/);assert.equal(clock.dirty,true);await clock.persist();assert.equal(clock.dirty,false);
});
test('Firebase timer writes require the active authority',async()=>{
 const docs=new Map(),ref=(c,d)=>({key:c+'/'+d,get:async()=>({exists:docs.has(c+'/'+d),data:()=>docs.get(c+'/'+d)})}),db={collection:c=>({doc:d=>ref(c,d)}),runTransaction:fn=>fn({get:async r=>({exists:docs.has(r.key),data:()=>docs.get(r.key)}),set:(r,data)=>docs.set(r.key,data)})};
 const store=new FirebaseStore(db);docs.set('multiplayerRuntime/authority',{id:'other-host',expires:Date.now()+60000});
 await assert.rejects(store.saveMapBosses([]),/authority-lost/);
 docs.set('multiplayerRuntime/authority',{id:store.authorityId,expires:Date.now()+60000});await store.saveMapBosses([{nextAt:123}]);
 assert.deepEqual(await store.loadMapBosses(),[{nextAt:123}]);
});
test('back-office endpoint returns all nine bosses and rejects invalid scope',async()=>{
 const dir=await mkdtemp(fileURLToPath(new URL('../outputs/boss-admin-',import.meta.url))),store=await new LocalStore(dir).init(),host=await createHost({mode:'local',store,catalog});
 await new Promise(r=>host.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+host.server.address().port;
 try{
  const r=await fetch(base+'/admin/map-bosses?serverId=server-1&channel=2'),data=await r.json();assert.equal(r.status,200);assert.equal(data.bosses.length,9);assert.equal(data.bosses[8].hp,4500000);assert.ok(data.bosses.every(b=>b.channel===2&&b.drops.length>0));
  assert.equal((await fetch(base+'/admin/map-bosses?channel=6')).status,400);
  assert.equal((await (await fetch(base+'/health')).json()).mapBossSchema,1);
 }finally{await host.close();}
});
test('admin summons appear in the chosen channel and never reset natural boss timers',()=>{
 const s=setup(),a=s.join('rice-fields',1),b=s.join('rice-fields',2);s.kill(a);const deadline=s.realm.mapBosses.remaining(a.room);
 const i=MONSTER_TYPES.findIndex(t=>t.id==='underwater-naga-guardian');
 s.realm.summonBoss({mapId:'rice-fields',channel:2,typeId:i,x:20,z:20});
 assert.equal(a.room.mobs.filter(m=>m.summoned).length,0);const extra=b.room.mobs.find(m=>m.summoned);assert.ok(extra&&extra.type===i);
 s.realm.hurt(b,extra,extra.hp+1);assert.equal(s.realm.mapBosses.remaining(a.room),deadline);assert.equal(s.realm.mapBosses.remaining(b.room),0);
 assert.throws(()=>s.realm.summonBoss({mapId:'rice-fields',channel:6}),/bad-channel/);
});

const collectGround=(realm,p)=>{for(const d of [...(p.room.groundLoot?.values()??[])])if(d.ownerKey===p.key){Object.assign(p.world.player,{x:d.x,z:d.z});assert.equal(pickGroundLoot(realm,p,d.id),null);}};
