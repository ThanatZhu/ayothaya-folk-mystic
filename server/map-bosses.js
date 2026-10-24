import {WORLD_MAP_BOSSES,WORLD_BOSS_RESPAWN} from '../chapter2-monsters.js';
// A wall-clock deadline per realm/channel/map, independent of ephemeral room lifetimes.
export class MapBossClock{
 constructor({now=()=>Date.now()}={}){this.now=now;this.rows=new Map();this.onChange=null;this.queue=Promise.resolve();this.revision=0;this.dirty=false;this.saving=false;}
 key(serverId,channel,mapId){return serverId+':'+(channel??1)+':'+mapId;}
 restore(rows=[]){
  this.rows.clear();
  for(const r of rows)if(['server-1','server-2'].includes(r.serverId)&&Number.isInteger(r.channel)&&r.channel>=1&&r.channel<=5&&WORLD_MAP_BOSSES.some(b=>b.mapId===r.mapId&&b.id===r.bossId)&&Number.isSafeInteger(r.nextAt)&&r.nextAt>=0){
   this.rows.set(this.key(r.serverId,r.channel,r.mapId),{serverId:r.serverId,channel:r.channel,mapId:r.mapId,bossId:r.bossId,nextAt:r.nextAt,kills:Math.max(0,Math.floor(r.kills||0))});
  }
 }
 remaining(room){return Math.max(0,((this.rows.get(this.key(room.serverId,room.channel,room.map.id))?.nextAt??0)-this.now())/1000);}
 wake(room,types){const left=this.remaining(room);if(left>0)for(const m of room.mobs)if(types[m.type]?.worldBoss&&!m.summoned){m.hp=0;m.dead=left;}}
 killed(room,mob,types){
  const type=types[mob.type],b=WORLD_MAP_BOSSES.find(b=>b.mapId===room.map.id&&b.id===type?.id);
  if(!b||mob.summoned)return;
  const key=this.key(room.serverId,room.channel,room.map.id),old=this.rows.get(key);
  this.rows.set(key,{serverId:room.serverId,channel:room.channel??1,mapId:room.map.id,bossId:b.id,nextAt:this.now()+WORLD_BOSS_RESPAWN*1000,kills:(old?.kills??0)+1});
  mob.dead=WORLD_BOSS_RESPAWN;
  this.revision++;this.dirty=true;this.persist();
 }
 persist(){
  if(!this.onChange||!this.dirty||this.saving)return this.queue;
  const revision=this.revision,snapshot=[...this.rows.values()].map(r=>({...r}));this.saving=true;
  this.queue=this.queue.catch(()=>{}).then(()=>this.onChange(snapshot)).then(()=>{if(this.revision===revision)this.dirty=false;}).finally(()=>{this.saving=false;});
  this.queue.catch(e=>console.error('map-boss-save',e.message));return this.queue;
 }
 async flush(){await this.queue;if(this.onChange&&this.dirty){await this.persist();if(this.dirty)await this.flush();}}
 overview(catalog,types,rooms,serverId,channel=1){
  return WORLD_MAP_BOSSES.filter(b=>catalog.maps.some(m=>m.id===b.mapId&&!m.safe&&!m.instance)).map(b=>{
   const type=types.find(t=>t.id===b.id),nextAt=this.rows.get(this.key(serverId,channel,b.mapId))?.nextAt??0;
   const live=[...rooms.values()].filter(r=>r.serverId===serverId&&(r.channel??1)===channel&&r.map.id===b.mapId).flatMap(r=>r.mobs).find(m=>types[m.type]?.id===b.id&&!m.summoned);
   return {...b,hp:type?.hp??b.hp,damage:type?.damage,level:type?.level??b.level,nextAt,in:Math.max(0,Math.ceil((nextAt-this.now())/1000)),alive:live?live.hp>0:nextAt<=this.now(),currentHp:live?.hp??null,channel,serverId};
  });
 }
}
