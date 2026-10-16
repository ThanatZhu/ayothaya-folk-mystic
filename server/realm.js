import {markMonsterHit,advanceMonster} from '../monster-catalog.js';
import {normalizeEquipment} from '../equipment.js';
import {randomUUID} from 'node:crypto';
import {CombatWorld,MONSTER_TYPES,moveBody,lineClear,walkable,monsterHit} from '../combat-core.js';
import {awardExperience,baseProgress} from '../experience.js';
import {refineGear} from '../refine.js';
import {STORAGE_SLOTS,STORAGE_NPC,normalizeStorage,normalizeOffer,moveOffer,hasOffer,swapOffers,normalizeStall,buyFromStall} from '../market.js';
import {normalizeStats,normalizeGear,raiseStat,equipGear,unequipGear,dropInvalidGear,deriveStats,statPoints,insertCard} from '../character-stats.js';
import {restoreTraveler,serializeTraveler} from '../world-state.js';
import {character,isServer,isSlot} from '../realm-state.js';
import {normalizeSkills,upgradeSkill,availablePoints} from '../skill-progress.js';
import {normalizeStory,storyEvent} from '../story-quests.js';
import {normalizeBag,addLoot,rollLoot,buy,sell,useItem,SHOPS,ITEM_ERRORS} from '../items.js';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const integer=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
const copy=v=>structuredClone(v);
const allowed=new Set(['input','skill','attack','select','auto','emote','chat','invite','answer','leaveParty','kick','leader','ping','upgradeSkill','questTalk','useItem','buy','sell','statUp','equip','unequip','refine','insertCard','storageOpen','store','retrieve','tradeRequest','tradeAnswer','tradeOffer','tradeLock','tradeConfirm','tradeCancel','tradeList','stallOpen','stallClose','stallList','stallBuy']);
export class RealmServer{
 constructor({catalog,capacity=50,now=()=>Date.now()}={}){this.catalog=catalog;this.capacity=capacity;this.now=now;this.peers=new Map();this.rooms=new Map();this.parties=new Map();this.invites=new Map();this.clock=0;this.tickId=0;}
 join({uid,serverId,slotId,record,send}){
  if(!uid||!isServer(serverId)||!isSlot(slotId))throw new Error('invalid-identity');
  const existing=[...this.peers.values()].find(p=>p.uid===uid);
  if(existing){
   if(!existing.suspended||existing.resumeUntil<this.now()||existing.serverId!==serverId||existing.slotId!==slotId)throw new Error('already-online');
   existing.suspended=false;existing.resumeUntil=0;existing.send=send;existing.seq=0;existing.known=new Set();existing.input={x:0,z:0,attack:false};existing.inputAt=this.now();
   send({type:'welcome',id:existing.id,room:existing.room.id,capacity:this.capacity,history:copy(existing.room.history),snapshot:(existing.bagSent=0,this.snapshot(existing))});this.social(existing.room);return existing;
  }
  const hero=character(record.character),map=this.catalog.maps.find(m=>m.id===record.state.mapId)??this.catalog.maps.find(m=>m.id===this.catalog.capital);
  const roomId=serverId+':'+map.id;
  let room=this.rooms.get(roomId);if(room&&room.peers.size>=this.capacity)throw new Error('room-full');
  if(!room){const simulation=new CombatWorld({...map});room={id:roomId,map,peers:new Set(),mobs:simulation.mobs,events:[],history:[],contributors:new Map()};this.rooms.set(roomId,room);}
  const world=new CombatWorld({...map,classId:hero.classId,jobId:hero.jobId});restoreTraveler(world,record.state.traveler);world.mobs=room.mobs;
  const skills=normalizeSkills(record.skills,hero.classId);world.skillLevels=[...skills[hero.classId]];
  const position=record.state.position;if(position&&walkable(position.x,position.z,.32,map.nav))Object.assign(world.player,position);
  const peer={id:randomUUID(),uid,serverId,slotId,character:hero,training:copy(record.training??null),skills,settings:copy(record.state.settings??{}),story:normalizeStory(record.story),world,room,send,seq:0,known:new Set(),input:{x:0,z:0,attack:false},inputAt:this.now(),partyId:null,bucket:40,chatAt:-Infinity,inviteAt:-Infinity,actionAt:-Infinity,emote:null};
  peer.equipment=normalizeEquipment(record.equipment,hero.classId);
  peer.bag=normalizeBag(record.bag);peer.bagVersion=1;peer.bagSent=0;peer.itemAt=-Infinity;
  peer.storage=normalizeStorage(record.storage);peer.trade=null;peer.stall=null;peer.saveNow=false;
  peer.stats=normalizeStats(record.stats);peer.gear=normalizeGear(record.gear);peer.statSig='';peer.gearAt=-Infinity;this.refreshStats(peer);
  world.hurt=(mob,damage,color)=>this.hurt(peer,mob,damage,color);
  this.peers.set(peer.id,peer);room.peers.add(peer.id);
  this.storyProgress(peer,{type:'enter',mapId:map.id});
  send({type:'welcome',id:peer.id,room:roomId,capacity:this.capacity,history:copy(room.history),snapshot:this.snapshot(peer)});this.social(room);return peer;
 }
 leave(id){
  const p=this.peers.get(id);if(!p)return;
  this.endTrade(p,'อีกฝ่ายออกไปแล้ว');p.stall=null;
  this.leaveParty(p);this.peers.delete(id);p.room.peers.delete(id);
  for(const [key,v] of this.invites)if(v.from===id||v.to===id)this.invites.delete(key);
  p.room.contributors.forEach(set=>set.delete(id));this.social(p.room);
  if(!p.room.peers.size)this.rooms.delete(p.room.id);
 }
 suspend(id){const p=this.peers.get(id);if(!p)return;this.endTrade(p,'อีกฝ่ายหลุดการเชื่อมต่อ');p.stall=null;p.suspended=true;p.resumeUntil=this.now()+20000;p.input={x:0,z:0,attack:false};p.world.auto=false;p.world.player.moving=false;this.social(p.room);}
 error(p,code){p.send({type:'error',code});return false;}
 receive(id,m){
  const p=this.peers.get(id);if(!p||p.suspended)return false;
  if(!m||typeof m!=='object'||Array.isArray(m)||!allowed.has(m.type)||!integer(m.seq,1,Number.MAX_SAFE_INTEGER))return this.error(p,'invalid-message');
  if(m.seq<=p.seq)return false;p.seq=m.seq;
  if(p.bucket<1)return this.error(p,'rate-limit');p.bucket--;
  const w=p.world,now=this.now();
  if(m.type==='ping'){p.send({type:'pong',stamp:typeof m.stamp==='number'?m.stamp:0});return true;}
  if(m.type==='refine'){
   const npc=typeof m.npc==='string'?p.room.map.npcs?.find(n=>n.name===m.npc):null;
   if(!npc||!SHOPS[npc.name]?.refine||SHOPS[npc.name].mapId!==p.room.map.id||distance(npc,w.player)>3.6)return this.itemFail(p,'refine-far');
   if(now-p.gearAt<600)return this.itemFail(p,'gear-rate');p.gearAt=now;
   let r;try{r=refineGear(p.bag,p.gear,m.slot,{lekLai:m.lekLai===true});}catch(e){return this.itemFail(p,e.message);}
   p.gear=r.gear;this.setBag(p,r.bag);this.refreshStats(p);w.emit('refined',{slot:m.slot,result:r.result,level:r.level,chance:r.chance});return true;
  }
  if(m.type==='storageOpen'||m.type==='store'||m.type==='retrieve'){
   const npc=p.room.map.npcs?.find(n=>n.name===STORAGE_NPC);
   if(!npc||m.npc!==STORAGE_NPC||distance(npc,w.player)>3.6)return this.itemFail(p,'storage-far');
   if(m.type==='storageOpen'){w.emit('stored',{storage:p.storage});return true;}
   const offer={coins:0,items:{[m.item]:m.count}};
   try{if(m.type==='store'){const [b,s]=moveOffer(p.bag,p.storage,offer,{toCap:STORAGE_SLOTS});this.setBag(p,b);p.storage=s;}
    else{const [s,b]=moveOffer(p.storage,p.bag,offer,{fromCap:STORAGE_SLOTS});p.storage=s;this.setBag(p,b);}}catch(e){return this.itemFail(p,e.message);}
   w.emit('stored',{storage:p.storage});return true;
  }
  if(m.type.startsWith('trade'))return this.tradeCommand(p,m);
  if(m.type.startsWith('stall'))return this.stallCommand(p,m);
  if(m.type==='insertCard'){
   if(now-p.gearAt<300)return this.itemFail(p,'gear-rate');p.gearAt=now;
   let r;try{r=insertCard(p.bag,p.gear,m.slot,m.card);}catch(e){return this.itemFail(p,e.message);}
   p.gear=r.gear;this.setBag(p,r.bag);this.refreshStats(p);w.emit('carded',{slot:m.slot,card:m.card});return true;
  }
  if(m.type==='statUp'||m.type==='equip'||m.type==='unequip'){
   if(now-p.gearAt<200)return this.itemFail(p,'gear-rate');p.gearAt=now;
   const who=this.who(p);
   try{
    if(m.type==='statUp')p.stats=raiseStat(p.stats,m.stat,who.level);
    else{const r=m.type==='equip'?equipGear(p.bag,p.gear,m.item,who):unequipGear(p.bag,p.gear,m.slot);p.gear=r.gear;this.setBag(p,r.bag);}
   }catch(e){return this.itemFail(p,e.message);}
   this.refreshStats(p);return true;
  }
  if(m.type==='useItem'){
   if(now-p.itemAt<800)return this.itemFail(p,'item-rate');
   let r;try{r=useItem(p.bag,m.item,w.player);}catch(e){return this.itemFail(p,e.message);}
   p.itemAt=now;w.player.hp=r.hp;w.player.mp=r.mp;this.setBag(p,r.bag);w.emit('used',{item:m.item});return true;
  }
  if(m.type==='buy'||m.type==='sell'){
   // Trading only next to that shop's NPC in its own map; the shared rules check coins, stock and bag room.
   const npc=typeof m.npc==='string'?p.room.map.npcs?.find(n=>n.name===m.npc):null,shop=npc&&SHOPS[npc.name];
   if(!shop||shop.mapId!==p.room.map.id||distance(npc,w.player)>3.6)return this.itemFail(p,'shop-too-far');
   const qty=m.count??1;
   try{this.setBag(p,m.type==='buy'?buy(p.bag,npc.name,m.item,qty):sell(p.bag,m.item,qty));}catch(e){return this.itemFail(p,e.message);}
   w.emit('trade',{kind:m.type,item:m.item,count:qty,coins:p.bag.coins});return true;
  }
  if(m.type==='questTalk'){
   // Story talk only counts next to that NPC in this room; the shared rules decide whether it advances anything.
   const npc=typeof m.npc==='string'?p.room.map.npcs?.find(n=>n.name===m.npc):null;
   if(!npc||distance(npc,w.player)>3.6)return this.error(p,'quest-too-far');
   return this.storyProgress(p,{type:'talk',npc:npc.name,mapId:p.room.map.id});
  }
  if(m.type==='upgradeSkill'){
   try{p.skills=upgradeSkill(p.skills,p.character.classId,m.index,this.progress(p));}catch(e){return this.error(p,e.message);}
   w.skillLevels=[...p.skills[p.character.classId]];return true;
  }
  if(m.type==='input'){
   if(!Number.isFinite(m.x)||!Number.isFinite(m.z)||Math.abs(m.x)>1||Math.abs(m.z)>1||typeof m.attack!=='boolean')return this.error(p,'invalid-input');
   const n=Math.max(1,Math.hypot(m.x,m.z));p.input={x:m.x/n,z:m.z/n,attack:m.attack};p.inputAt=now;return true;
  }
  if(['skill','attack','select','auto','emote'].includes(m.type)){
   if(now-p.actionAt<70)return this.error(p,'action-rate');p.actionAt=now;
   if(m.type==='select'){if(!integer(m.target,0,9999))return this.error(p,'invalid-target');w.select(m.target);return true;}
   if(m.type==='skill'){if(!integer(m.index,0,9))return this.error(p,'invalid-skill');return w.skill(m.index);}
   if(m.type==='attack')return w.basicAttack();
   if(m.type==='auto'){w.toggleAuto();return true;}
   if(!['bow','celebrate','rest','guard'].includes(m.name))return this.error(p,'invalid-emote');
   p.emote={name:m.name,time:this.clock};p.room.events.push({type:'emote',actor:p.id,name:m.name});return true;
  }
  if(m.type==='chat'){
   if(now-p.chatAt<1200)return this.error(p,'chat-rate');
   if(typeof m.text!=='string'||!['room','party'].includes(m.channel))return this.error(p,'invalid-chat');
   const text=m.text.normalize('NFC').replace(/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g,'').trim();
   if(!text||text.length>240)return this.error(p,'invalid-chat');
   const party=this.parties.get(p.partyId);if(m.channel==='party'&&!party)return this.error(p,'no-party');p.chatAt=now;
   const message={type:'chat',id:randomUUID(),actor:p.id,name:p.character.name,text,channel:m.channel,time:now};
   for(const pid of party&&m.channel==='party'?party.members:p.room.peers)this.peers.get(pid)?.send(message);
   if(m.channel==='room'){p.room.history.push(message);if(p.room.history.length>40)p.room.history.shift();}return true;
  }
  if(m.type==='invite'){
   const target=this.peers.get(m.target);if(!target||target===p||target.room!==p.room||target.partyId)return this.error(p,'invalid-invite');
   const party=this.parties.get(p.partyId);if(party&&(party.leader!==p.id||party.members.size>=5))return this.error(p,'party-full-or-leader');
   if(now-p.inviteAt<2000)return this.error(p,'invite-rate');p.inviteAt=now;
   const invitation={id:randomUUID(),from:p.id,to:target.id,expires:now+30000};this.invites.set(invitation.id,invitation);
   target.send({type:'invite',id:invitation.id,from:p.id,name:p.character.name,expires:invitation.expires});return true;
  }
  if(m.type==='answer'){
   const invite=this.invites.get(m.invite),leader=this.peers.get(invite?.from);
   if(!invite||invite.to!==p.id||invite.expires<now||!leader||leader.room!==p.room||typeof m.accept!=='boolean')return this.error(p,'expired-invite');
   this.invites.delete(invite.id);if(!m.accept)return true;if(p.partyId)return this.error(p,'already-in-party');
   let party=this.parties.get(leader.partyId);
   if(party&&(party.leader!==leader.id||party.members.size>=5))return this.error(p,'party-full-or-leader');
   if(!party){party={id:randomUUID(),leader:leader.id,members:new Set([leader.id])};this.parties.set(party.id,party);leader.partyId=party.id;}
   p.partyId=party.id;party.members.add(p.id);this.social(p.room);return true;
  }
  if(m.type==='leaveParty'){this.leaveParty(p);this.social(p.room);return true;}
  const party=this.parties.get(p.partyId);
  if(!party||party.leader!==p.id||!party.members.has(m.target)||m.target===p.id)return this.error(p,'not-party-leader');
  if(m.type==='kick')this.leaveParty(this.peers.get(m.target));else if(m.type==='leader')party.leader=m.target;
  this.social(p.room);return true;
 }
 leaveParty(p){
  const party=this.parties.get(p?.partyId);if(!party)return;p.partyId=null;party.members.delete(p.id);
  if(party.members.size<2){for(const id of party.members)this.peers.get(id).partyId=null;this.parties.delete(party.id);}
  else if(party.leader===p.id)party.leader=party.members.values().next().value;
 }
 social(room){for(const id of room.peers){const p=this.peers.get(id),party=this.parties.get(p.partyId);p.send({type:'social',players:[...room.peers].map(id=>{const a=this.peers.get(id);return {id,name:a.character.name,classId:a.character.classId,partyId:a.partyId};}),party:party?{id:party.id,leader:party.leader,members:[...party.members]}:null});}}
 hurt(p,mob,damage,color='#fff0a6'){
  if(!mob||mob.hp<=0||p.room.map.safe)return;
  const amount=Math.min(mob.hp,damage);mob.hp-=amount;markMonsterHit(mob,p.world.player);
  let contributors=p.room.contributors.get(mob.id);if(!contributors){contributors=new Set();p.room.contributors.set(mob.id,contributors);}contributors.add(p.id);
  p.world.emit('damage',{id:mob.id,x:mob.x,z:mob.z,amount,color});
  if(mob.hp>0)return;mob.dead=MONSTER_TYPES[mob.type].respawn??12;mob.aggro=false;
  const eligible=new Set([...contributors].filter(id=>{const a=this.peers.get(id);return a?.room===p.room&&!a.suspended&&a.world.player.hp>0&&distance(a.world.player,mob)<=18;}));
  for(const id of [...eligible]){const party=this.parties.get(this.peers.get(id).partyId);for(const member of party?.members??[]){const a=this.peers.get(member);if(a?.room===p.room&&!a.suspended&&a.world.player.hp>0&&distance(a.world.player,mob)<=18)eligible.add(member);}}
  const reward=MONSTER_TYPES[mob.type],ids=[...eligible].sort();
  ids.forEach((id,i)=>{const a=this.peers.get(id);a.world.kills++;const split=n=>Math.floor(n/ids.length)+(i<n%ids.length?1:0);a.world.emit('experience',awardExperience(a.world,split(reward.baseXp),split(reward.jobXp)));a.world.emit('defeat',{id:mob.id,x:mob.x,z:mob.z});this.storyProgress(a,{type:'defeat',monster:reward.id,mapId:p.room.map.id});{const loot=rollLoot(reward.id);loot.coins=Math.round(loot.coins*(1+(a.derived?.coinPct??0)));this.grantLoot(a,loot,mob);}});
  p.room.contributors.delete(mob.id);
  for(const id of p.room.peers){const a=this.peers.get(id);if(a.world.targetId===mob.id){a.world.targetId=null;a.world.path=[];}}
 }
 step(dt=.05){
  dt=Math.max(0,Math.min(.05,dt));this.clock+=dt;this.tickId++;
  for(const p of this.peers.values())if(p.suspended&&p.resumeUntil&&p.resumeUntil<this.now())this.leave(p.id);
  for(const [id,v] of this.invites)if(v.expires<this.now())this.invites.delete(id);
  for(const p of this.peers.values()){if(p.suspended)continue;p.bucket=Math.min(40,p.bucket+dt*25);if(this.now()-p.inputAt>350)p.input={x:0,z:0,attack:false};p.world.update(dt,p.input,{monsters:false});}
  for(const room of this.rooms.values()){
   for(const m of room.mobs){
    const candidates=[...room.peers].map(id=>this.peers.get(id)).filter(p=>!p.suspended&&p.world.player.hp>0).sort((a,b)=>distance(a.world.player,m)-distance(b.world.player,m));
    const target=candidates[0],type=MONSTER_TYPES[m.type];
    const result=advanceMonster(m,target?.world.player,type,dt,room.map.nav,{moveBody,lineClear});
    if(result==='respawn')room.contributors.delete(m.id);
    if(result==='hit'&&target){
     const w=target.world,p=w.player,amount=monsterHit(w,type.damage,Math.random,type.id);if(!amount){w.emit('dodge',{x:p.x,z:p.z});continue;}p.hp=Math.max(0,p.hp-amount);w.emit('playerHit',{x:p.x,z:p.z,amount});
     if(p.hp===0){p.down=3;w.auto=false;w.targetId=null;w.path=[];p.moving=false;w.notice('หมดแรง · กลับลานใน 3 วินาที');}
    }
   }
   for(const id of room.peers){const p=this.peers.get(id);for(const event of p.world.events.splice(0)){const e={...event,actor:id};if(['notice','experience','defeat','select','story','loot','used','trade','refined','carded','stored','tradeAsk','tradeState','tradeEnd','stalls','stallSold'].includes(e.type))p.send({type:'events',events:[e]});else room.events.push(e);}}
   if(this.tickId%2===0){for(const id of room.peers){const p=this.peers.get(id);p.send({type:'snapshot',...this.snapshot(p),events:copy(room.events)});}room.events=[];}
  }
 }
 storyProgress(p,event){
  const r=storyEvent(p.story,event);if(!r.changed)return false;p.story=r.state;
  p.world.emit('story',{npc:event.npc??null,say:r.say??null,completed:r.completed?.title??null,story:r.state});
  if(r.reward){p.world.emit('experience',awardExperience(p.world,r.reward.baseXp,r.reward.jobXp));this.grantLoot(p,{coins:r.reward.coins??0,items:r.reward.items??[]});}
  return true;
 }
 setBag(p,bag){p.bag=bag;p.bagVersion++;if(p.stall)p.stall={...p.stall,...normalizeStall(p.stall,bag)};}
 // ---- 0.46 player trade: both lock, both confirm, then one atomic swap and an immediate save of both.
 partner(p){const o=p.trade&&this.peers.get(p.trade.with);return o&&o.trade?.with===p.id?o:null;}
 sendTrade(a,b){for(const [x,y] of [[a,b],[b,a]])x.world.emit('tradeState',{partner:{id:y.id,name:y.character.name},mine:x.trade.offer,theirs:y.trade.offer,myLock:x.trade.locked,theirLock:y.trade.locked,myOk:x.trade.ok,theirOk:y.trade.ok});}
 endTrade(p,why){const o=this.partner(p);for(const x of [p,o].filter(Boolean)){x.trade=null;x.world.emit('tradeEnd',{reason:why});}}
 tradeCommand(p,m){
  const w=p.world,near=o=>o&&o.room===p.room&&!o.suspended&&distance(o.world.player,w.player)<=6;
  if(m.type==='tradeList'){w.emit('tradeAsk',{list:[...p.room.peers].filter(id=>id!==p.id).map(id=>{const o=this.peers.get(id);return {id,name:o.character.name,near:near(o)};})});return true;}
  if(m.type==='tradeRequest'){const o=this.peers.get(m.target);if(!near(o))return this.itemFail(p,'trade-far');if(o.trade||p.trade)return this.itemFail(p,'trade-busy');
   p.tradeAsk=o.id;o.world.emit('tradeAsk',{from:p.id,name:p.character.name});w.notice('ส่งคำขอแลกของถึง '+o.character.name+' แล้ว');return true;}
  if(m.type==='tradeAnswer'){const o=this.peers.get(m.from);if(!o||o.tradeAsk!==p.id)return this.itemFail(p,'trade-none');o.tradeAsk=null;
   if(!m.accept){o.world.notice(p.character.name+' ปฏิเสธการแลกของ');return true;}
   if(!near(o))return this.itemFail(p,'trade-far');if(o.trade||p.trade)return this.itemFail(p,'trade-busy');
   for(const [x,y] of [[p,o],[o,p]])x.trade={with:y.id,offer:normalizeOffer(null),locked:false,ok:false};this.sendTrade(p,o);return true;}
  const o=this.partner(p);if(!o)return this.itemFail(p,'trade-none');
  if(m.type==='tradeCancel'){this.endTrade(p,p.character.name+' ยกเลิกการแลก');return true;}
  if(!near(o)){this.endTrade(p,'อยู่ไกลกันเกินไป');return false;}
  if(m.type==='tradeOffer'){if(p.trade.locked)return this.itemFail(p,'trade-locked');const offer=normalizeOffer(m.offer);if(!hasOffer(p.bag,offer))return this.itemFail(p,'no-item');
   p.trade.offer=offer;p.trade.ok=o.trade.ok=false;this.sendTrade(p,o);return true;}
  if(m.type==='tradeLock'){p.trade.locked=true;this.sendTrade(p,o);return true;}
  if(m.type==='tradeConfirm'){if(!p.trade.locked||!o.trade.locked)return this.itemFail(p,'trade-wait');p.trade.ok=true;
   if(!o.trade.ok){this.sendTrade(p,o);return true;}
   let r;try{r=swapOffers(p.bag,p.trade.offer,o.bag,o.trade.offer);}catch(e){this.endTrade(p,'แลกไม่สำเร็จ · '+e.message);return false;}
   this.setBag(p,r[0]);this.setBag(o,r[1]);p.saveNow=o.saveNow=true;
   for(const x of [p,o]){x.trade=null;x.world.emit('tradeEnd',{reason:'แลกของสำเร็จ',done:true});}return true;}
  return false;
 }
 // ---- 0.46 vending: a stall lists items from the owner's bag at fixed prices; city only; closes if the owner walks off.
 stallCommand(p,m){
  const w=p.world;
  if(m.type==='stallOpen'){if(!p.room.map.safe)return this.itemFail(p,'stall-city');p.stall={...normalizeStall(m.stall,p.bag),x:w.player.x,z:w.player.z};
   if(!Object.keys(p.stall.items).length){p.stall=null;return this.itemFail(p,'no-item');}w.notice('เปิดแผง '+p.stall.title+' แล้ว');return true;}
  if(m.type==='stallClose'){p.stall=null;w.notice('ปิดแผงแล้ว');return true;}
  if(m.type==='stallList'){w.emit('stalls',{list:[...p.room.peers].map(id=>this.peers.get(id)).filter(o=>o.stall&&o!==p).map(o=>({owner:o.id,name:o.character.name,title:o.stall.title,items:o.stall.items,x:o.stall.x,z:o.stall.z}))});return true;}
  if(m.type==='stallBuy'){const o=this.peers.get(m.owner);if(!o?.stall||o.suspended||o.room!==p.room)return this.itemFail(p,'stall-none');if(o===p)return this.itemFail(p,'stall-self');
   let r;try{r=buyFromStall(o.bag,o.stall,p.bag,m.item,m.count);}catch(e){return this.itemFail(p,e.message);}
   this.setBag(o,r.sellerBag);this.setBag(p,r.buyerBag);o.stall={...o.stall,...r.stall};p.saveNow=o.saveNow=true;
   o.world.emit('stallSold',{item:m.item,count:m.count,coins:r.cost,buyer:p.character.name});w.notice('ซื้อจากแผง '+o.character.name+' แล้ว');
   this.stallCommand(p,{type:'stallList'});return true;}
  return false;
 }
 who(p){return {classId:p.character.classId,level:baseProgress(p.world).level};}
 // Status + worn gear → combat numbers; cheap no-op unless level, class, stats or gear changed.
 refreshStats(p){
  const who=this.who(p),sig=JSON.stringify([who,p.stats,p.gear]);if(sig===p.statSig)return;
  const fit=dropInvalidGear(p.bag,p.gear,who);if(JSON.stringify(fit.gear)!==JSON.stringify(p.gear)){p.gear=fit.gear;this.setBag(p,fit.bag);}
  p.statSig=JSON.stringify([who,p.stats,p.gear]);p.derived=deriveStats({...who,stats:p.stats,gear:p.gear});p.world.applyDerived(p.derived);
 }
 itemFail(p,code){p.world.emit('notice',{text:ITEM_ERRORS[code]??code});return false;}
 // Auto-loot: coins and items go straight into the bag; anything that does not fit is reported, not dropped.
 grantLoot(p,loot,at=null){
  if(!loot.coins&&!loot.items.length)return;
  const r=addLoot(p.bag,loot);this.setBag(p,r.bag);
  p.world.emit('loot',{coins:r.coins,items:r.added,lost:r.lost,x:at?.x??null,z:at?.z??null});
 }
 progress(p){return {classId:p.character.classId,jobId:p.character.jobId??'',jobXp:p.world.jobXp};}
 snapshot(p){
  this.refreshStats(p);
  if(p.stall&&Math.hypot(p.world.player.x-p.stall.x,p.world.player.z-p.stall.z)>3){p.stall=null;p.world.notice('เดินออกจากแผง · ปิดแผงแล้ว');}
  const publicPlayer=a=>({id:a.id,character:a.character,equipment:a.equipment,player:a.world.player,emote:a.emote,partyId:a.partyId});
  const visible=[...p.room.peers].map(id=>this.peers.get(id)).filter(a=>a!==p&&(distance(a.world.player,p.world.player)<45||a.partyId&&a.partyId===p.partyId)),seen=new Set(visible.map(a=>a.id)),round=n=>Math.round(n*1000)/1000;
  const players=visible.map(a=>{const v=a.world.player,result={id:a.id,equipment:a.equipment,player:{x:round(v.x),z:round(v.z),hp:v.hp,maxHp:v.maxHp,moving:v.moving,face:{x:round(v.face.x),z:round(v.face.z)}},partyId:a.partyId,connected:!a.suspended,stall:a.stall?.title??null};if(!p.known.has(a.id))result.character=a.character;return result;});p.known=seen;
  return copy({tick:this.tickId,time:this.clock,self:{...publicPlayer(p),training:p.training,cooldowns:p.world.cooldowns,kills:p.world.kills,baseXp:p.world.baseXp,jobXp:p.world.jobXp,targetId:p.world.targetId,auto:p.world.auto,skillLevels:p.world.skillLevels,skillPoints:availablePoints(p.skills,this.progress(p)),story:p.story,stall:p.stall?.title??null,stats:p.stats,gear:p.gear,statPoints:statPoints(p.stats,this.who(p).level),derived:p.derived,...(p.bagSent!==p.bagVersion?(p.bagSent=p.bagVersion,{bag:p.bag}):{})},players,mobs:p.room.mobs});
 }
 travelDestination(p,id){
  const portal=p.room.map.portals?.find(v=>v.to===id&&distance(v,p.world.player)<2.6);
  const destination=this.catalog.maps.find(m=>m.id===id);
  // 0.46 ธูปกลับเมือง: from any map straight to the capital, spending one incense.
  const recall=!portal&&id===this.catalog.capital&&p.room.map.id!==id&&(p.bag.items['return-incense']??0)>0;
  if((!portal&&!recall)||!destination||p.world.player.hp<=0)throw new Error('travel-invalid');
  if((this.rooms.get(p.serverId+':'+id)?.peers.size??0)>=this.capacity)throw new Error('room-full');
  if(recall){const b=normalizeBag(p.bag);b.items['return-incense']--;if(!b.items['return-incense'])delete b.items['return-incense'];this.setBag(p,b);}
  this.endTrade(p,'อีกฝ่ายเดินทางไปแล้ว');p.stall=null;
  return destination;
 }
 record(p,original){return {...copy(original),character:copy(p.character),equipment:normalizeEquipment(p.equipment,p.character.classId),training:copy(p.training),skills:copy(p.skills),story:copy(p.story),bag:copy(p.bag),storage:copy(p.storage),stats:copy(p.stats),gear:copy(p.gear),state:{...copy(original.state),settings:copy(p.settings),mapId:p.room.map.id,position:{x:p.world.player.x,z:p.world.player.z},traveler:serializeTraveler(p.world)}};}
}
