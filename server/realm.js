import {markMonsterHit,advanceMonster,MONSTER_BEHAVIOUR} from '../monster-catalog.js';
import {normalizeEquipment} from '../equipment.js';
import {randomUUID} from 'node:crypto';
import {CombatWorld,MONSTER_TYPES,moveBody,lineClear,walkable,rallyPack,LEADER,mobXp,mobRespawn} from '../combat-core.js';
import {awardExperience,baseProgress,levelGifts} from '../experience.js';
import {refineGear} from '../refine.js';
import {STORAGE_SLOTS,STORAGE_NPC,normalizeStorage,normalizeOffer,moveOffer,hasOffer,swapOffers,normalizeStall,buyFromStall} from '../market.js';
import {MARKET_ZONE,inMarket,tradePerks,taxOf,openShop,buyFromShop,sellToShop,collectShop,recordPrice,searchMarket,publicShop} from '../market-board.js';
import {normalizeStats,normalizeGear,raiseStat,equipGear,unequipGear,dropInvalidGear,deriveStats,statPoints,insertCard} from '../character-stats.js';
import {restoreTraveler,serializeTraveler,warpCost} from '../world-state.js';
import {character,isServer,isSlot} from '../realm-state.js';
import {normalizeSkills,upgradeSkill,availablePoints} from '../skill-progress.js';
import {normalizeStory,storyEvent} from '../story-quests.js';
import {FRIEND_MAX,GUILD_MAX,GUILD_COST,SOCIAL_ERRORS,cleanName,validGuildName,validEmblem,normalizeFriends} from '../social.js';
import {claimDaily,thaiDay} from '../daily.js';
import {normalizeBounty,bountyDefeat,bountyClaim,normalizeAlbum,albumAdd} from '../bounty.js';
import {PETS,normalizePet,tame,hatch,feedPet,returnPet,petTick,petBonus} from '../pets.js';
import {activeEvent,expRate,surge,surgeOn} from '../events.js';
// 0.49: the timed MVP returns an hour after it falls (first one 5 min after boot); dungeon clear pays once per Thai day.
export const MERC_COST=200,MERC_TIME=1200;
export const MVP_INTERVAL=3600e3,MVP_FIRST=300e3,DUNGEON_REWARD={coins:800,items:[{id:'lek-lai',count:1},{id:'green-herb',count:3},{id:'hp-large',count:3}]};
import {normalizeBag,addLoot,rollLoot,buy,sell,useItem,SHOPS,ITEM_ERRORS,itemDef,RARITY_NAME} from '../items.js';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const integer=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
const copy=v=>structuredClone(v);
const allowed=new Set(['input','skill','attack','select','auto','emote','chat','invite','answer','leaveParty','kick','leader','ping','upgradeSkill','questTalk','useItem','buy','sell','statUp','equip','unequip','refine','insertCard','storageOpen','store','retrieve','tradeRequest','tradeAnswer','tradeOffer','tradeLock','tradeConfirm','tradeCancel','tradeList','stallOpen','stallClose','stallList','stallBuy','shopOpen','shopClose','shopCollect','shopBuy','shopSell','shopMine','shopList','marketSearch','friendList','friendAdd','friendAnswer','friendRemove','guildInfo','guildCreate','guildInvite','guildAnswer','guildLeave','guildKick','guildEmblem','bubble','tame','hatch','petFeed','petReturn','bountyClaim','hire']);
export class RealmServer{
 constructor({catalog,capacity=50,now=()=>Date.now()}={}){this.catalog=catalog;this.capacity=capacity;this.now=now;this.peers=new Map();this.rooms=new Map();this.parties=new Map();this.invites=new Map();this.guilds=new Map();this.onGuild=null;this.shops=new Map();this.onShop=null;this.prices=new Map();this.onPrices=null;this.pricesDirty=new Set();this.mvps=new Map();this.born=now();this.clock=0;this.tickId=0;}
 join({uid,serverId,slotId,record,send}){
  if(!uid||!isServer(serverId)||!isSlot(slotId))throw new Error('invalid-identity');
  let existing=[...this.peers.values()].find(p=>p.uid===uid);
  // A suspended copy of another character, or one past its resume window, is dropped so the new login can enter.
  if(existing?.suspended&&(existing.resumeUntil<this.now()||existing.serverId!==serverId||existing.slotId!==slotId)){this.leave(existing.id);existing=null;}
  if(existing){
   if(!existing.suspended||existing.resumeUntil<this.now()||existing.serverId!==serverId||existing.slotId!==slotId)throw new Error('already-online');
   existing.suspended=false;existing.resumeUntil=0;existing.send=send;existing.seq=0;existing.known=new Set();existing.input={x:0,z:0,attack:false};existing.inputAt=this.now();
   send({type:'welcome',id:existing.id,room:existing.room.id,capacity:this.capacity,history:copy(existing.room.history),snapshot:(existing.bagSent=0,this.snapshot(existing))});this.social(existing.room);return existing;
  }
  const hero=character(record.character),map=this.catalog.maps.find(m=>m.id===record.state.mapId)??this.catalog.maps.find(m=>m.id===this.catalog.capital);
  // A party that travelled keeps its seat for a minute (0.49), so it can walk into the same dungeon instance together.
  const party=[...this.parties.values()].find(v=>v.pending?.has(uid));
  const roomId=serverId+':'+map.id+(map.instance?':'+(party?.id??'solo-'+uid):'');
  let room=this.rooms.get(roomId);if(room&&room.peers.size>=this.capacity)throw new Error('room-full');
  if(!room){const simulation=new CombatWorld({...map});room={id:roomId,map,serverId,peers:new Set(),mobs:simulation.mobs,events:[],history:[],contributors:new Map()};this.rooms.set(roomId,room);this.wakeMvp(room);}
  const world=new CombatWorld({...map,classId:hero.classId,jobId:hero.jobId});restoreTraveler(world,record.state.traveler);world.mobs=room.mobs;
  const skills=normalizeSkills(record.skills,hero.classId);world.skillLevels=[...skills[hero.classId]];
  const position=record.state.position;if(position&&walkable(position.x,position.z,.32,map.nav))Object.assign(world.player,position);
  const peer={id:randomUUID(),uid,serverId,slotId,character:hero,training:copy(record.training??null),skills,settings:copy(record.state.settings??{}),story:normalizeStory(record.story),world,room,send,seq:0,known:new Set(),input:{x:0,z:0,attack:false},inputAt:this.now(),partyId:null,bucket:40,chatAt:-Infinity,inviteAt:-Infinity,actionAt:-Infinity,emote:null};
  peer.equipment=normalizeEquipment(record.equipment,hero.classId);
  peer.bag=normalizeBag(record.bag);peer.bagVersion=1;peer.bagSent=0;peer.itemAt=-Infinity;
  peer.key=uid+':'+slotId;peer.tradeXp=Number.isSafeInteger(record.trade?.xp)&&record.trade.xp>0?record.trade.xp:0;if(map.id===MARKET_ZONE.mapId)peer.world.emit('shops',{list:this.shopList(serverId)});
  peer.friends=normalizeFriends(record.friends);peer.guildId=[...this.guilds.values()].find(g=>g.serverId===serverId&&g.members.some(x=>x.key===peer.key))?.id??null;
  peer.daily=record.daily??null;peer.bubbleAt=-Infinity;peer.dungeonDay=record.dungeonDay??null;peer.pet=normalizePet(record.pet);peer.bounty=record.bounty??null;peer.album=normalizeAlbum(record.album);
  if(party){party.pending.delete(uid);party.members.add(peer.id);peer.partyId=party.id;if(party.leaderPending===uid||!party.members.has(party.leader)){party.leader=peer.id;if(party.leaderPending===uid)party.leaderPending=null;}}
  peer.storage=normalizeStorage(record.storage);peer.trade=null;peer.stall=null;peer.saveNow=false;
  peer.stats=normalizeStats(record.stats);peer.gear=normalizeGear(record.gear);peer.statSig='';peer.gearAt=-Infinity;this.refreshStats(peer);
  world.hurt=(mob,damage,color)=>this.hurt(peer,mob,damage,color);
  this.peers.set(peer.id,peer);room.peers.add(peer.id);
  this.storyProgress(peer,{type:'enter',mapId:map.id});
  // 0.48 daily login: first join of the Thai day grants the next reward of the 7-day cycle.
  const daily=claimDaily(peer.daily,this.now());if(daily){peer.daily=daily.daily;this.grantLoot(peer,daily.reward);peer.saveNow=true;world.emit('daily',{streak:daily.streak,reward:daily.reward});}
  send({type:'welcome',id:peer.id,room:roomId,capacity:this.capacity,history:copy(room.history),snapshot:this.snapshot(peer)});this.social(room);return peer;
 }
 leave(id,{travel=false}={}){
  const p=this.peers.get(id);if(!p)return;
  this.endTrade(p,'อีกฝ่ายออกไปแล้ว');p.stall=null;
  const party=travel&&this.parties.get(p.partyId);
  if(party){party.members.delete(id);(party.pending??=new Map()).set(p.uid,this.now()+60000);if(party.leader===id){party.leaderPending??=p.uid;if(party.members.size)party.leader=party.members.values().next().value;}p.partyId=null;}
  else this.leaveParty(p);this.peers.delete(id);p.room.peers.delete(id);
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
  if(m.type.startsWith('shop')||m.type==='marketSearch')return this.marketCommand(p,m);
  if(m.type.startsWith('friend')||m.type.startsWith('guild'))return this.socialCommand(p,m);
  // 0.50 pets: lure a selected tameable monster, hatch the egg, feed it, or send it back into its egg.
  if(['tame','hatch','petFeed','petReturn'].includes(m.type)){
   if(now-p.itemAt<800)return this.itemFail(p,'item-rate');p.itemAt=now;
   try{
    if(m.type==='tame'){const mob=p.room.mobs.find(x=>x.id===m.target);if(!mob||distance(mob,w.player)>8)throw new Error('not-tameable');
     const id=MONSTER_TYPES[mob.type].id,r=tame(p.bag,id,mob);this.setBag(p,r.bag);
     if(r.ok){mob.hp=0;mob.dead=p.room.map.instance?1e9:MONSTER_TYPES[mob.type].respawn??12;mob.aggro=false;p.room.contributors.delete(mob.id);p.saveNow=true;}
     w.emit('tamed',{ok:r.ok,egg:PETS[id].egg,x:mob.x,z:mob.z});}
    else if(m.type==='hatch'){const r=hatch(p.bag,p.pet,m.item);this.setBag(p,r.bag);p.pet=r.pet;p.saveNow=true;}
    else if(m.type==='petFeed'){const r=feedPet(p.bag,p.pet);this.setBag(p,r.bag);p.pet=r.pet;}
    else{const r=returnPet(p.bag,p.pet);this.setBag(p,r.bag);p.pet=null;p.saveNow=true;}
   }catch(e){return this.itemFail(p,e.message);}
   this.refreshStats(p);return true;
  }
  if(m.type==='hire'){
   const npc=p.room.map.npcs?.find(n=>n.name==='ครูแสนดาบ');if(!npc||distance(npc,w.player)>3.6)return this.itemFail(p,'hire-far');
   if(w.merc)return this.itemFail(p,'hire-active');if(p.bag.coins<MERC_COST)return this.itemFail(p,'no-coins');
   const b=normalizeBag(p.bag);b.coins-=MERC_COST;this.setBag(p,b);w.hire(MERC_TIME);w.notice('จ้างทหารรับจ้างแล้ว · 20 นาที');return true;
  }
  if(m.type==='bountyClaim'){
   if(!p.room.map.safe)return this.itemFail(p,'bounty-town');
   let r;try{r=bountyClaim(p.bounty,now,m.index);}catch(e){return this.itemFail(p,e.message);}
   p.bounty=r.state;w.emit('experience',awardExperience(w,r.reward.baseXp,r.reward.jobXp));this.grantLoot(p,{coins:r.reward.coins,items:[]});p.saveNow=true;w.notice('รับรางวัลค่าหัวแล้ว');return true;
  }
  if(m.type==='bubble'){if(!Number.isInteger(m.id)||m.id<1||m.id>24)return this.error(p,'invalid-emote');if(now-p.bubbleAt<1000)return false;p.bubbleAt=now;p.room.events.push({type:'bubble',actor:p.id,id:m.id});return true;}
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
   let r;try{r=useItem(p.bag,m.item,w.player,w.status);}catch(e){return this.itemFail(p,e.message);}
   p.itemAt=now;w.player.hp=r.hp;w.player.mp=r.mp;w.status=r.status;this.setBag(p,r.bag);w.emit('used',{item:m.item});return true;
  }
  if(m.type==='buy'||m.type==='sell'){
   // Trading only next to that shop's NPC in its own map; the shared rules check coins, stock and bag room.
   const npc=typeof m.npc==='string'?p.room.map.npcs?.find(n=>n.name===m.npc):null,shop=npc&&SHOPS[npc.name];
   if(!shop||shop.mapId!==p.room.map.id||distance(npc,w.player)>3.6)return this.itemFail(p,'shop-too-far');
   const qty=m.count??1;
   try{const before=p.bag.coins,next=m.type==='buy'?buy(p.bag,npc.name,m.item,qty):sell(p.bag,m.item,qty),spent=m.type==='buy'?before-next.coins:0,off=Math.floor(spent*tradePerks(p.tradeXp).npcDiscount);this.setBag(p,off?{...next,coins:next.coins+off}:next);}catch(e){return this.itemFail(p,e.message);}
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
   if(typeof m.text!=='string'||!['room','party','guild','whisper'].includes(m.channel))return this.error(p,'invalid-chat');
   const text=m.text.normalize('NFC').replace(/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g,'').trim();
   if(!text||text.length>240)return this.error(p,'invalid-chat');
   // 0.47 whisper: one named player on this server, wherever they are; guild: every online member.
   if(m.channel==='whisper'){const o=this.byName(p,cleanName(m.to));if(!o)return this.itemFail(p,'whisper-offline');p.chatAt=now;const message={type:'chat',id:randomUUID(),actor:p.id,name:p.character.name,to:o.character.name,text,channel:'whisper',time:now};p.send(message);o.send(message);return true;}
   if(m.channel==='guild'){const g=this.guildOf(p);if(!g)return this.itemFail(p,'guild-none');p.chatAt=now;const message={type:'chat',id:randomUUID(),actor:p.id,name:p.character.name,text,channel:'guild',time:now};for(const x of g.members)this.online(x.key)?.send(message);return true;}
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
  if(party.members.size+(party.pending?.size??0)<2){for(const id of party.members)this.peers.get(id).partyId=null;this.parties.delete(party.id);}
  else if(party.leader===p.id)party.leader=party.members.values().next().value;
 }
 social(room){for(const id of room.peers){const p=this.peers.get(id),party=this.parties.get(p.partyId);p.send({type:'social',players:[...room.peers].map(id=>{const a=this.peers.get(id);return {id,name:a.character.name,classId:a.character.classId,partyId:a.partyId};}),party:party?{id:party.id,leader:party.leader,members:[...party.members]}:null});}}
 hurt(p,mob,damage,color='#fff0a6'){
  if(!mob||mob.hp<=0||p.room.map.safe)return;
  const amount=Math.min(mob.hp,damage);mob.hp-=amount;markMonsterHit(mob,p.world.player);rallyPack(p.room.mobs,mob);
  let contributors=p.room.contributors.get(mob.id);if(!contributors){contributors=new Set();p.room.contributors.set(mob.id,contributors);}contributors.add(p.id);
  if(MONSTER_TYPES[mob.type].mvp){const d=(p.room.mvpDamage??=new Map());d.set(p.id,(d.get(p.id)??0)+amount);}
  p.world.emit('damage',{id:mob.id,x:mob.x,z:mob.z,amount,color});
  if(mob.hp>0)return;mob.dead=p.room.map.instance?1e9:mobRespawn(mob);mob.aggro=false;
  if(MONSTER_TYPES[mob.type].mvp)this.mvpDown(p.room,mob);
  if(p.room.map.instance&&MONSTER_TYPES[mob.type].boss)this.dungeonClear(p.room);
  const eligible=new Set([...contributors].filter(id=>{const a=this.peers.get(id);return a?.room===p.room&&!a.suspended&&a.world.player.hp>0&&distance(a.world.player,mob)<=18;}));
  for(const id of [...eligible]){const party=this.parties.get(this.peers.get(id).partyId);for(const member of party?.members??[]){const a=this.peers.get(member);if(a?.room===p.room&&!a.suspended&&a.world.player.hp>0&&distance(a.world.player,mob)<=18)eligible.add(member);}}
  const reward=MONSTER_TYPES[mob.type],ids=[...eligible].sort(),rate=expRate(this.now(),p.room.map.id)*mobXp(mob),event=activeEvent(this.now()),rolls=(mob.leader?LEADER.loot:1)*(surgeOn(this.now(),p.room.map.id)?2:1); // 0.50 event/weekend EXP + token drops
  ids.forEach((id,i)=>{const a=this.peers.get(id);a.world.kills++;const split=n=>Math.floor(n/ids.length)+(i<n%ids.length?1:0);a.world.emit('experience',awardExperience(a.world,split(Math.round(reward.baseXp*rate)),split(Math.round(reward.jobXp*rate))));a.world.emit('defeat',{id:mob.id,x:mob.x,z:mob.z});this.storyProgress(a,{type:'defeat',monster:reward.id,mapId:p.room.map.id});{const bd=bountyDefeat(a.bounty,this.now(),reward.id,mob.leader);if(bd.changed)a.bounty=bd.state;}{const loot=rollLoot(reward.id,Math.random,event,rolls);loot.coins=Math.round(loot.coins*(1+(a.derived?.coinPct??0)));this.grantLoot(a,loot,mob);}});
  p.room.contributors.delete(mob.id);
  for(const id of p.room.peers){const a=this.peers.get(id);if(a.world.targetId===mob.id){a.world.targetId=null;a.world.path=[];}}
 }
 step(dt=.05){
  dt=Math.max(0,Math.min(.05,dt));this.clock+=dt;this.tickId++;
  if(this.tickId%1200===0&&this.onPrices)for(const id of this.pricesDirty){this.pricesDirty.delete(id);Promise.resolve(this.onPrices(id,this.prices.get(id))).catch(e=>console.error('price-save',e.message));}
  {const s=surge(this.now()); // 0.64 announce each field surge once, on every channel
   if(s.active&&this.surgeSlot!==s.slot){this.surgeSlot=s.slot;const name=this.catalog.maps.find(m=>m.id===s.map)?.name??s.map;for(const id of new Set([...this.peers.values()].map(p=>p.serverId)))this.announce(id,`🔥 ฝูงคลั่งที่ ${name}! · EXP ×2 และดรอป ×2 อีก 5 นาที`);}}
  for(const p of this.peers.values())if(p.suspended&&p.resumeUntil&&p.resumeUntil<this.now())this.leave(p.id);
  for(const [id,v] of this.invites)if(v.expires<this.now())this.invites.delete(id);
  for(const party of [...this.parties.values()])for(const [uid,until] of party.pending??[])if(until<this.now()){party.pending.delete(uid);if(party.members.size+party.pending.size<2){for(const id of party.members){const a=this.peers.get(id);a.partyId=null;this.social(a.room);}this.parties.delete(party.id);}}
  for(const p of this.peers.values()){if(p.suspended)continue;petTick(p.pet,dt);p.bucket=Math.min(40,p.bucket+dt*25);if(this.now()-p.inputAt>350)p.input={x:0,z:0,attack:false};p.world.update(dt,p.input,{monsters:false});}
  for(const room of this.rooms.values()){
   for(const m of room.mobs){
    const candidates=[...room.peers].map(id=>this.peers.get(id)).filter(p=>!p.suspended&&p.world.player.hp>0).sort((a,b)=>distance(a.world.player,m)-distance(b.world.player,m));
    const target=candidates[0],type=MONSTER_TYPES[m.type];
    if(type.mvp&&m.hp<=0)m.dead=(this.mvpState(room.serverId).nextAt-this.now())/1000; // wall-clock timer, shared by every room of the channel
    const result=advanceMonster(m,target?.world.player,type,dt,room.map.nav,{moveBody,lineClear});
    if(result==='respawn'){room.contributors.delete(m.id);if(type.mvp)this.announce(room.serverId,`👑 MVP ${type.name} ปรากฏตัวที่ ${room.map.name}!`);}
    if(m.justEnraged){m.justEnraged=false;for(const id of room.peers)this.peers.get(id).world.notice(type.name+' โกรธจัด! · เร็วและแรงขึ้น');}
    if(result==='burst')for(const id of room.peers){const a=this.peers.get(id);if(!a.suspended&&a.world.player.hp>0&&distance(a.world.player,m)<=MONSTER_BEHAVIOUR[type.id].aoe)a.world.takeMonsterHit(type);}
    if(result==='hit'&&target){
     target.world.takeMonsterHit(type);
    }
   }
   for(const id of room.peers){const p=this.peers.get(id);for(const event of p.world.events.splice(0)){const e={...event,actor:id};if(e.type==='experience'&&e.baseUp)for(const g of levelGifts(e.baseFrom,e.baseLevel)){p.world.notice(`ของขวัญ Lv.${g.level} · ${g.text}`);this.grantLoot(p,{coins:g.coins,items:g.items.map(i=>({...i}))});p.saveNow=true;}if(['notice','experience','defeat','select','story','loot','used','trade','refined','carded','stored','tradeAsk','tradeState','tradeEnd','stalls','stallSold','shops','shopMine','marketResults','friends','friendAsk','guild','guildAsk','daily','mvp','dungeonClear','tamed','album'].includes(e.type))p.send({type:'events',events:[e]});else room.events.push(e);}}
   if(this.tickId%2===0){for(const id of room.peers){const p=this.peers.get(id);p.send({type:'snapshot',...this.snapshot(p),events:copy(room.events)});}room.events=[];}
  }
 }
 storyProgress(p,event){
  const r=storyEvent(p.story,event);if(!r.changed)return false;p.story=r.state;
  p.world.emit('story',{npc:event.npc??null,say:r.say??null,completed:r.completed?.title??null,story:r.state});
  if(r.reward){p.world.emit('experience',awardExperience(p.world,r.reward.baseXp,r.reward.jobXp));this.grantLoot(p,{coins:r.reward.coins??0,items:r.reward.items??[]});}
  return true;
 }
 // ---- 0.70 central market: consignment shops (open while the owner is offline), buying stores, search, tax, prices.
 shopList(serverId){return [...this.shops.values()].filter(s=>s.serverId===serverId).map(publicShop);}
 shopsChanged(serverId){const list=this.shopList(serverId);for(const p of this.peers.values())if(p.serverId===serverId&&!p.suspended&&p.room.map.id===MARKET_ZONE.mapId)p.world.emit('shops',{list});}
 saveShop(shop,deleted=false){if(this.onShop)Promise.resolve(this.onShop(shop,deleted)).catch(e=>console.error('shop-save',e.message));}
 traded(serverId,peers,item,coins,count){for(const a of peers)if(a)a.tradeXp=Math.min(1e9,(a.tradeXp??0)+coins);const prices=this.prices.get(serverId)??{};this.prices.set(serverId,recordPrice(prices,item,Math.round(coins/count),this.now()));this.pricesDirty.add(serverId);}
 mine(p){return [...this.shops.values()].filter(s=>s.ownerKey===p.key).map(s=>({...publicShop(s),pouch:s.pouch,escrow:s.escrow,log:s.log}));}
 marketCommand(p,m){
  const w=p.world,perks=tradePerks(p.tradeXp),fail=c=>this.itemFail(p,c),now=this.now();
  if(m.type==='marketSearch'){const stalls=[...this.peers.values()].filter(o=>o.serverId===p.serverId&&o.stall&&!o.suspended).map(o=>({owner:o.id,name:o.character.name,title:o.stall.title,items:o.stall.items,x:o.stall.x,z:o.stall.z,mapId:o.room.map.id}));
   w.emit('marketResults',{query:String(m.query??'').slice(0,30),rows:searchMarket([...this.shops.values()].filter(s=>s.serverId===p.serverId),stalls,m.query),prices:this.prices.get(p.serverId)??{}});return true;}
  if(m.type==='shopMine'){w.emit('shopMine',{shops:this.mine(p),perks});return true;}
  if(m.type==='shopList'){w.emit('shops',{list:this.shopList(p.serverId)});return true;}
  if(m.type==='shopOpen'){
   let r;try{r=openShop({bag:p.bag,req:m.shop,perks,owner:{key:p.key,name:p.character.name,serverId:p.serverId},x:w.player.x,z:w.player.z,mapId:p.room.map.id,now,id:randomUUID(),existing:[...this.shops.values()].filter(s=>s.serverId===p.serverId)});}catch(e){return fail(e.message);}
   this.setBag(p,r.bag);this.shops.set(r.shop.id,r.shop);p.saveNow=true;this.saveShop(r.shop);this.shopsChanged(p.serverId);
   w.notice((r.shop.kind==='buy'?'เปิดร้านรับซื้อ ':'เปิดร้านค้าง ')+r.shop.title+' แล้ว · เปิดต่อแม้ออกจากเกม');w.emit('shopMine',{shops:this.mine(p),perks});return true;}
  const shop=this.shops.get(m.shop);if(!shop||shop.serverId!==p.serverId)return fail('stall-none');
  if(m.type==='shopCollect'||m.type==='shopClose'){if(shop.ownerKey!==p.key)return fail('stall-none');
   let r;try{r=collectShop(shop,p.bag,{close:m.type==='shopClose'});}catch(e){return fail(e.message);}
   p.tradeXp=Math.min(1e9,(p.tradeXp??0)+(shop.xpOwed??0));if(r.shop)r.shop.xpOwed=0;
   this.setBag(p,r.bag);p.saveNow=true;if(r.shop){this.shops.set(shop.id,r.shop);this.saveShop(r.shop);}else{this.shops.delete(shop.id);this.saveShop(shop,true);this.shopsChanged(p.serverId);}
   w.notice((m.type==='shopClose'?'ปิดร้านแล้ว':'รับของจากร้านแล้ว')+(r.coins?' · เบี้ย +'+r.coins:''));w.emit('shopMine',{shops:this.mine(p),perks});return true;}
  if(p.room.map.id!==MARKET_ZONE.mapId||Math.hypot(w.player.x-shop.x,w.player.z-shop.z)>4.5)return fail('shop-far');
  if(shop.ownerKey===p.key)return fail('stall-self');
  const owner=[...this.peers.values()].find(o=>o.key===shop.ownerKey&&!o.suspended),ownerPerks=tradePerks(owner?.tradeXp??0);
  let r;try{r=m.type==='shopBuy'?buyFromShop(shop,p.bag,m.item,m.count,ownerPerks,{who:p.character.name,now}):m.type==='shopSell'?sellToShop(shop,p.bag,m.item,m.count,tradePerks(p.tradeXp),{who:p.character.name,now}):null;}catch(e){return fail(e.message);}
  if(!r)return false;
  r.shop.xpOwed=(shop.xpOwed??0)+(r.cost??r.pay); // the owner's trade experience is paid out when they collect
  this.setBag(p,r.bag);p.saveNow=true;this.shops.set(shop.id,r.shop);this.saveShop(r.shop);this.traded(p.serverId,[p],m.item,r.cost??r.pay,m.count);
  owner?.world.emit('stallSold',{item:m.item,count:m.count,coins:(r.cost??r.pay)-r.tax,buyer:p.character.name});
  w.notice((m.type==='shopBuy'?'ซื้อจากร้าน ':'ขายให้ร้าน ')+shop.ownerName+' แล้ว'+(r.tax?' · ภาษี '+r.tax+' เบี้ย':''));
  this.shopsChanged(p.serverId);return true;
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
  if(m.type==='stallOpen'){if(!p.room.map.safe)return this.itemFail(p,'stall-city');if(!inMarket(p.room.map.id,w.player.x,w.player.z))return this.itemFail(p,'shop-zone');p.stall={...normalizeStall(m.stall,p.bag,tradePerks(p.tradeXp).slots),x:w.player.x,z:w.player.z};
   if(!Object.keys(p.stall.items).length){p.stall=null;return this.itemFail(p,'no-item');}w.notice('เปิดแผง '+p.stall.title+' แล้ว');return true;}
  if(m.type==='stallClose'){p.stall=null;w.notice('ปิดแผงแล้ว');return true;}
  if(m.type==='stallList'){w.emit('stalls',{list:[...p.room.peers].map(id=>this.peers.get(id)).filter(o=>o.stall&&o!==p).map(o=>({owner:o.id,name:o.character.name,title:o.stall.title,items:o.stall.items,x:o.stall.x,z:o.stall.z}))});return true;}
  if(m.type==='stallBuy'){const o=this.peers.get(m.owner);if(!o?.stall||o.suspended||o.room!==p.room)return this.itemFail(p,'stall-none');if(o===p)return this.itemFail(p,'stall-self');
   let r;try{r=buyFromStall(o.bag,o.stall,p.bag,m.item,m.count,tradePerks(o.tradeXp).slots);}catch(e){return this.itemFail(p,e.message);}
   {const tax=taxOf(r.cost,tradePerks(o.tradeXp));r.sellerBag={...r.sellerBag,coins:r.sellerBag.coins-tax};this.traded(p.serverId,[p,o],m.item,r.cost,m.count);}
   this.setBag(o,r.sellerBag);this.setBag(p,r.buyerBag);o.stall={...o.stall,...r.stall};p.saveNow=o.saveNow=true;
   o.world.emit('stallSold',{item:m.item,count:m.count,coins:r.cost,buyer:p.character.name});w.notice('ซื้อจากแผง '+o.character.name+' แล้ว');
   this.stallCommand(p,{type:'stallList'});return true;}
  return false;
 }
 who(p){return {classId:p.character.classId,level:baseProgress(p.world).level};}
 // Status + worn gear → combat numbers; cheap no-op unless level, class, stats or gear changed.
 refreshStats(p){
  const who=this.who(p),pet=petBonus(p.pet),sig=JSON.stringify([who,p.stats,p.gear,pet]);if(sig===p.statSig)return;
  const fit=dropInvalidGear(p.bag,p.gear,who);if(JSON.stringify(fit.gear)!==JSON.stringify(p.gear)){p.gear=fit.gear;this.setBag(p,fit.bag);}
  p.statSig=JSON.stringify([who,p.stats,p.gear,pet]);p.derived=deriveStats({...who,stats:p.stats,gear:p.gear,pet});p.world.applyDerived(p.derived);
 }
 itemFail(p,code){p.world.emit('notice',{text:ITEM_ERRORS[code]??SOCIAL_ERRORS[code]??code});return false;}
 // ---- 0.49 timed MVP and party dungeon.
 mvpState(serverId){let s=this.mvps.get(serverId);if(!s){s={nextAt:this.born+MVP_FIRST};this.mvps.set(serverId,s);}return s;}
 // A fresh room hides its MVP until the server-wide timer is due, so leaving and re-entering cannot reset it.
 wakeMvp(room){const wait=(this.mvpState(room.serverId).nextAt-this.now())/1000;for(const m of room.mobs)if(MONSTER_TYPES[m.type].mvp&&wait>0){m.hp=0;m.dead=wait;}}
 mvpInfo(serverId){const s=this.mvpState(serverId),type=MONSTER_TYPES.find(t=>t.mvp),map=this.catalog.maps.find(m=>m.mobs?.some(([,,t])=>MONSTER_TYPES[t]?.mvp));
  return type&&map?{name:type.name,map:map.name,in:Math.max(0,Math.ceil((s.nextAt-this.now())/1000))}:null;}
 mvpDown(room,mob){
  const s=this.mvpState(room.serverId),type=MONSTER_TYPES[mob.type];s.nextAt=this.now()+MVP_INTERVAL;mob.dead=MVP_INTERVAL/1000;
  const damage=[...(room.mvpDamage??[])].filter(([id])=>this.peers.get(id)?.room===room).sort((a,b)=>b[1]-a[1]);room.mvpDamage=new Map();
  const winner=damage[0]&&this.peers.get(damage[0][0]);
  if(winner){this.grantLoot(winner,{coins:0,items:[{id:'king-ember',count:1}]});winner.saveNow=true;winner.world.emit('mvp',{name:type.name});}
  this.announce(room.serverId,winner?`👑 ${winner.character.name} ได้ MVP ${type.name}! · กลับมาอีกใน 60 นาที`:`${type.name} ถูกปราบแล้ว · กลับมาอีกใน 60 นาที`);
 }
 announce(serverId,text){const message={type:'chat',id:randomUUID(),actor:null,name:'ประกาศ',text,channel:'system',time:this.now()};for(const o of this.peers.values())if(o.serverId===serverId&&!o.suspended)o.send(message);}
 dungeonClear(room){
  const today=thaiDay(this.now());
  for(const id of room.peers){const a=this.peers.get(id);if(a.suspended)continue;
   if(a.dungeonDay===today){a.world.notice('ล้างดันเจี้ยนสำเร็จ · วันนี้รับรางวัลไปแล้ว (รีเซ็ตเที่ยงคืน)');continue;}
   a.dungeonDay=today;this.grantLoot(a,structuredClone(DUNGEON_REWARD));a.saveNow=true;a.world.emit('dungeonClear',{reward:DUNGEON_REWARD,map:room.map.name});}
 }
 // ---- 0.47 friends (mutual, kept in each private profile) and guilds (one shared doc each, persisted by the host via onGuild).
 online(key){for(const o of this.peers.values())if(o.key===key&&!o.suspended)return o;return null;}
 byName(p,name){for(const o of this.peers.values())if(o!==p&&o.serverId===p.serverId&&!o.suspended&&o.character.name===name)return o;return null;}
 guildOf(p){const g=p.guildId&&this.guilds.get(p.guildId);return g&&g.members.some(x=>x.key===p.key)?g:null;}
 guildTag(p){const g=this.guildOf(p);return g?{name:g.name,emblem:g.emblem}:null;}
 sendFriends(p){p.world.emit('friends',{list:p.friends.map(f=>{const o=this.online(f.key);return {name:f.name,online:!!o,map:o?.room.map.name??null};})});}
 guildView(g){return g?{name:g.name,emblem:g.emblem,members:g.members.map(x=>{const o=this.online(x.key);return {name:x.name,leader:x.key===g.leader,online:!!o,map:o?.room.map.name??null};})}:null;}
 guildChanged(g){this.onGuild?.(g,false);for(const x of g.members){const o=this.online(x.key);if(o){o.guildId=g.id;o.world.emit('guild',{guild:this.guildView(g)});}}}
 guildChat(g,text){const message={type:'chat',id:randomUUID(),actor:null,name:'กิลด์',text,channel:'guild',time:this.now()};for(const x of g.members)this.online(x.key)?.send(message);}
 socialCommand(p,m){
  const w=p.world,fail=c=>this.itemFail(p,c),g=this.guildOf(p);
  if(m.type==='friendList'){this.sendFriends(p);return true;}
  if(m.type==='friendAdd'){const o=this.byName(p,cleanName(m.name));if(!o)return fail('whisper-offline');if(o.key===p.key)return fail('friend-self');
   if(p.friends.some(f=>f.key===o.key))return fail('friend-already');if(p.friends.length>=FRIEND_MAX)return fail('friend-full');
   p.friendAsk=o.key;o.world.emit('friendAsk',{from:p.id,name:p.character.name});w.notice('ส่งคำขอเป็นเพื่อนถึง '+o.character.name+' แล้ว');return true;}
  if(m.type==='friendAnswer'){const o=this.peers.get(m.from);if(!o||o.friendAsk!==p.key)return fail('friend-none');o.friendAsk=null;
   if(!m.accept){o.world.notice(p.character.name+' ปฏิเสธคำขอเป็นเพื่อน');return true;}
   if(p.friends.length>=FRIEND_MAX||o.friends.length>=FRIEND_MAX)return fail('friend-full');
   for(const [x,y] of [[p,o],[o,p]]){if(!x.friends.some(f=>f.key===y.key))x.friends.push({key:y.key,name:y.character.name});x.saveNow=true;x.world.notice('เป็นเพื่อนกับ '+y.character.name+' แล้ว');this.sendFriends(x);}
   return true;}
  if(m.type==='friendRemove'){const n=p.friends.length;p.friends=p.friends.filter(f=>f.name!==m.name);if(p.friends.length===n)return fail('friend-none');p.saveNow=true;this.sendFriends(p);return true;}
  if(m.type==='guildInfo'){w.emit('guild',{guild:this.guildView(g)});return true;}
  if(m.type==='guildCreate'){if(g)return fail('guild-already');const name=validGuildName(m.name);if(!name)return fail('guild-name');if(!validEmblem(m.emblem))return fail('bad-count');
   if([...this.guilds.values()].some(x=>x.serverId===p.serverId&&x.name.toLowerCase()===name.toLowerCase()))return fail('guild-taken');
   if(p.bag.coins<GUILD_COST)return fail('no-coins');const b=normalizeBag(p.bag);b.coins-=GUILD_COST;this.setBag(p,b);p.saveNow=true;
   const ng={id:randomUUID(),serverId:p.serverId,name,emblem:m.emblem,leader:p.key,members:[{key:p.key,name:p.character.name}],created:this.now()};
   this.guilds.set(ng.id,ng);this.guildChanged(ng);w.notice('ก่อตั้งกิลด์ '+name+' แล้ว');return true;}
  if(m.type==='guildInvite'){if(!g)return fail('guild-none');if(g.leader!==p.key)return fail('guild-leader');if(g.members.length>=GUILD_MAX)return fail('guild-full');
   const o=this.byName(p,cleanName(m.name));if(!o)return fail('whisper-offline');if(this.guildOf(o))return fail('guild-target');
   o.guildAsk=g.id;o.world.emit('guildAsk',{guild:g.id,name:g.name,emblem:g.emblem,from:p.character.name});w.notice('ส่งคำเชิญเข้ากิลด์ถึง '+o.character.name+' แล้ว');return true;}
  if(m.type==='guildAnswer'){const ng=this.guilds.get(m.guild);if(!ng||p.guildAsk!==ng.id)return fail('guild-invite');p.guildAsk=null;
   if(!m.accept)return true;if(g)return fail('guild-already');if(ng.members.length>=GUILD_MAX)return fail('guild-full');
   ng.members.push({key:p.key,name:p.character.name});this.guildChanged(ng);this.guildChat(ng,p.character.name+' เข้าร่วมกิลด์');return true;}
  if(m.type==='guildLeave'||m.type==='guildKick'){if(!g)return fail('guild-none');if(m.type==='guildKick'&&g.leader!==p.key)return fail('guild-leader');
   const gone=m.type==='guildLeave'?g.members.find(x=>x.key===p.key):g.members.find(x=>x.name===m.name&&x.key!==p.key);if(!gone)return fail('guild-none');
   g.members=g.members.filter(x=>x!==gone);
   const o=this.online(gone.key);if(o){o.guildId=null;o.world.emit('guild',{guild:null});o.world.notice(m.type==='guildLeave'?'ออกจากกิลด์แล้ว':'ถูกเชิญออกจากกิลด์ '+g.name);}
   if(!g.members.length){this.guilds.delete(g.id);this.onGuild?.(g,true);return true;}
   if(g.leader===gone.key)g.leader=g.members[0].key;
   this.guildChanged(g);this.guildChat(g,gone.name+(m.type==='guildLeave'?' ออกจากกิลด์':' ถูกเชิญออกจากกิลด์'));return true;}
  if(m.type==='guildEmblem'){if(!g)return fail('guild-none');if(g.leader!==p.key)return fail('guild-leader');if(!validEmblem(m.emblem))return fail('bad-count');g.emblem=m.emblem;this.guildChanged(g);return true;}
  return false;
 }

 // Auto-loot: coins and items go straight into the bag; anything that does not fit is reported, not dropped.
 grantLoot(p,loot,at=null){
  if(!loot.coins&&!loot.items.length)return;
  const r=addLoot(p.bag,loot);this.setBag(p,r.bag);
  p.world.emit('loot',{coins:r.coins,items:r.added,lost:r.lost,x:at?.x??null,z:at?.z??null});
  // 0.64 a purple or gold drop from a monster is announced to the whole channel.
  const best=at?r.added.map(i=>itemDef(i.id)).filter(d=>d?.rarity>=3).sort((a,b)=>b.rarity-a.rarity)[0]:null;
  if(best)this.announce(p.serverId,`✦ ${p.character.name} ได้ ${best.name} [${RARITY_NAME[best.rarity]}] ที่ ${p.room.map.name}`);
  // 0.60 card album: first copy of each card is recorded; milestones pay out at once.
  const cards=r.added.filter(i=>itemDef(i.id)?.kind==='card').map(i=>i.id);
  if(cards.length){const al=albumAdd(p.album,cards);if(al.added){p.album=al.album;p.saveNow=true;for(const m of al.milestones){p.world.emit('album',{count:m.count});this.grantLoot(p,structuredClone(m.reward));}}}
 }
 progress(p){return {classId:p.character.classId,jobId:p.character.jobId??'',jobXp:p.world.jobXp};}
 snapshot(p){
  this.refreshStats(p);
  if(p.stall&&Math.hypot(p.world.player.x-p.stall.x,p.world.player.z-p.stall.z)>3){p.stall=null;p.world.notice('เดินออกจากแผง · ปิดแผงแล้ว');}
  const publicPlayer=a=>({id:a.id,character:a.character,equipment:a.equipment,player:a.world.player,emote:a.emote,partyId:a.partyId});
  const visible=[...p.room.peers].map(id=>this.peers.get(id)).filter(a=>a!==p&&(distance(a.world.player,p.world.player)<45||a.partyId&&a.partyId===p.partyId)),seen=new Set(visible.map(a=>a.id)),round=n=>Math.round(n*1000)/1000;
  const players=visible.map(a=>{const v=a.world.player,result={id:a.id,equipment:a.equipment,player:{x:round(v.x),z:round(v.z),hp:v.hp,maxHp:v.maxHp,moving:v.moving,face:{x:round(v.face.x),z:round(v.face.z)}},partyId:a.partyId,connected:!a.suspended,pet:a.pet?.id??null,stall:a.stall?.title??null,guild:this.guildTag(a)};if(!p.known.has(a.id))result.character=a.character;return result;});p.known=seen;
  return copy({tick:this.tickId,time:this.clock,self:{...publicPlayer(p),training:p.training,cooldowns:p.world.cooldowns,kills:p.world.kills,baseXp:p.world.baseXp,jobXp:p.world.jobXp,targetId:p.world.targetId,auto:p.world.auto,skillLevels:p.world.skillLevels,skillPoints:availablePoints(p.skills,this.progress(p)),story:p.story,merc:p.world.merc?Math.ceil(p.world.merc.left):0,bounty:normalizeBounty(p.bounty,this.now()),album:p.album,status:p.world.status,pet:p.pet,mvp:this.mvpInfo(p.serverId),stall:p.stall?.title??null,guild:this.guildTag(p),stats:p.stats,gear:p.gear,statPoints:statPoints(p.stats,this.who(p).level),derived:p.derived,...(p.bagSent!==p.bagVersion?(p.bagSent=p.bagVersion,{bag:p.bag}):{})},players,mobs:p.room.mobs});
 }
 travelDestination(p,id,{warp=false}={}){
  const portal=p.room.map.portals?.find(v=>v.to===id&&distance(v,p.world.player)<2.6);
  const destination=this.catalog.maps.find(m=>m.id===id);
  // 0.46 ธูปกลับเมือง: from any map straight to the capital, spending one incense.
  const recall=!portal&&id===this.catalog.capital&&p.room.map.id!==id&&(p.bag.items['return-incense']??0)>0;
  const townHop=!portal&&p.room.map.safe&&p.room.map.portals?.some(v=>v.to===id); // 0.53 town gates need no walk
  const fare=warp?warpCost(this.catalog,p.room.map.id,id):null;if(warp&&fare===null)throw new Error('travel-invalid');
  if(warp&&p.bag.coins<fare)throw new Error('no-coins');
  if((!portal&&!recall&&!townHop&&!warp)||!destination||p.world.player.hp<=0)throw new Error('travel-invalid');
  if((this.rooms.get(p.serverId+':'+id)?.peers.size??0)>=this.capacity)throw new Error('room-full');
  if(warp){const b=normalizeBag(p.bag);b.coins-=fare;this.setBag(p,b);}
  else if(recall){const b=normalizeBag(p.bag);b.items['return-incense']--;if(!b.items['return-incense'])delete b.items['return-incense'];this.setBag(p,b);}
  this.endTrade(p,'อีกฝ่ายเดินทางไปแล้ว');p.stall=null;
  return destination;
 }
 record(p,original){return {...copy(original),character:copy(p.character),equipment:normalizeEquipment(p.equipment,p.character.classId),training:copy(p.training),skills:copy(p.skills),story:copy(p.story),bag:copy(p.bag),storage:copy(p.storage),friends:copy(p.friends),daily:copy(p.daily),dungeonDay:p.dungeonDay,bounty:copy(p.bounty),album:copy(p.album),trade:{xp:p.tradeXp??0},pet:copy(p.pet),stats:copy(p.stats),gear:copy(p.gear),state:{...copy(original.state),settings:copy(p.settings),mapId:p.room.map.id,position:{x:p.world.player.x,z:p.world.player.z},traveler:serializeTraveler(p.world)}};}
}
