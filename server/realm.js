import {normalizeAuto,pickPotion} from '../auto-play.js';
import {activeEmote,canonicalAction,EMOTE_ACTIONS} from '../character-action-state.js';
import {markMonsterHit,advanceMonster,MONSTER_BEHAVIOUR} from '../monster-catalog.js';
import {normalizeEquipment} from '../equipment.js';
import {randomUUID} from 'node:crypto';
import {CombatWorld,monsterHit,MONSTER_TYPES,moveBody,lineClear,walkable,rallyPack,LEADER,mobXp,mobRespawn} from '../combat-core.js';
import {awardExperience,baseProgress,levelGifts,migrateXp,XP_CURVE} from '../experience.js';
import {refineGear} from '../refine.js';
import {STORAGE_SLOTS,STORAGE_NPC,normalizeStorage,normalizeOffer,moveOffer,hasOffer,swapOffers,normalizeStall,buyFromStall} from '../market.js';
import {MARKET_ZONE,inMarket,tradePerks,taxOf,openShop,buyFromShop,sellToShop,collectShop,recordPrice,searchMarket,publicShop} from '../market-board.js';
import {REBIRTH_MAX,normalizeStats,normalizeGear,raiseStat,equipGear,unequipGear,dropInvalidGear,deriveStats,statPoints,insertCard,combatPower} from '../character-stats.js';
import {restoreTraveler,serializeTraveler,warpCost} from '../world-state.js';
import {character,isServer,isSlot} from '../realm-state.js';
import {normalizeSkills,upgradeSkill,availablePoints,SLOTS} from '../skill-progress.js';
import {normalizeStory,storyEvent,rewardItems} from '../story-quests.js';
import {FRIEND_MAX,GUILD_COST,SOCIAL_ERRORS,cleanName,validGuildName,validEmblem,normalizeFriends,GUILD_HALL,DEPUTY_MAX,DONATE_MIN,DONATE_MAX,GUILD_LEVELS,guildLevel,GUILD_UPGRADES,GUILD_RITE,GUILD_GOAL,guildSeats,cleanNotice} from '../social.js';
import {claimDaily,thaiDay} from '../daily.js';
import {normalizeBounty,bountyDefeat,bountyClaim,normalizeAlbum,albumAdd,normalizeWeekly,weeklyDefeat,weeklyClaim} from '../bounty.js';
import {PETS,normalizePet,tame,hatch,feedPet,returnPet,petTick,petBonus} from '../pets.js';
import {activeEvent,expRate,surge,surgeOn} from '../events.js';
// 0.49: the timed MVP returns an hour after it falls (first one 5 min after boot); dungeon clear pays once per Thai day.
export const MERC_COST=200,MERC_TIME=1200;
export const MVP_INTERVAL=3600e3,MVP_FIRST=300e3,DUNGEON_REWARD={coins:800,items:[{id:'lek-lai',count:1},{id:'green-herb',count:3},{id:'hp-large',count:3}]};
import {normalizeBag,addLoot,rollLoot,buy,sell,discard,useItem,foodBuff,SHOPS,ITEM_ERRORS,itemDef,RARITY_NAME} from '../items.js';
import {craft} from '../crafting.js';
import {WAR,warWindow,warLabel} from '../guild-war.js';
import {ARENA,arenaWeek,arenaDay,arenaEnds,byPoints} from '../arena.js';
import {TRIAL} from '../city-life-data.js';
import {advanceReady} from '../advancement.js';
const SERVER_IDS=['server-1','server-2'],SERVER_NAME={'server-1':'เซิร์ฟ 1','server-2':'เซิร์ฟ 2'};
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const integer=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
const copy=v=>structuredClone(v);
// 0.99.11 bandwidth: each player gets only the monsters within MOB_VIEW m, and of those only the fields that changed since
// that player last got them (the client merges monsters with Object.assign). Server-only timers stay home; positions are
// rounded to 1 cm, other numbers to 0.1, and the respawn countdown to whole seconds.
const PLAYER_STATIC=['equipment','partyId','pet','stall','guild','rebirth'],MOB_VIEW=50,MOB_SKIP=new Set(['home','attackCD','leapCD','step','strike','flee','justEnraged']);
const mobValue=(k,v)=>typeof v!=='number'?v:k==='x'||k==='z'?Math.round(v*100)/100:k==='dead'?Math.ceil(v):Math.round(v*10)/10;
// 0.93 duels: a challenge lasts 20 s, a bout 90 s; players hit each other for 35% of their monster damage (then the
// target's dodge, shield and DEF apply as for a monster blow). Walking 20 m apart ends the bout as a draw.
export const DUEL={ask:20000,time:90000,range:20,scale:.35};
export const WORLD_CHAT_COOLDOWN=8000;
// World announcements for refines: only the rare ones (success at +7 or more, or a piece of +6 or more breaking),
// so the common +1..+6 do not bury world chat.
export const REFINE_ANNOUNCE=7;
export function refineAnnouncement(who,r,before,after){
 if(r.result==='success'&&r.level>=REFINE_ANNOUNCE)return `📣 ${who} ตีบวก ${after} สำเร็จ!`;
 if(r.result==='broken'&&r.level+1>=REFINE_ANNOUNCE)return `💥 ${who} ตีบวก ${before} → +${r.level+1} ล้มเหลว อุปกรณ์แตก!`;
 return null;
}
const allowed=new Set(['craft','duel','duelQuit','input','skill','attack','select','auto','autoConfig','emote','chat','invite','answer','leaveParty','kick','leader','ping','upgradeSkill','questTalk','useItem','buy','sell','discard','statUp','equip','unequip','refine','insertCard','storageOpen','store','retrieve','tradeRequest','tradeAnswer','tradeOffer','tradeLock','tradeConfirm','tradeCancel','tradeList','stallOpen','stallClose','stallList','stallBuy','leaderboard','shopOpen','shopClose','shopCollect','shopBuy','shopSell','shopMine','shopList','marketSearch','friendList','friendAdd','friendAnswer','friendRemove','guildInfo','guildCreate','guildInvite','guildAnswer','guildLeave','guildKick','guildEmblem','guildDonate','guildRank','guildNotice','guildUpgrade','guildRite','bubble','tame','hatch','petFeed','petReturn','bountyClaim','weeklyClaim','rebirth','hire']);
// 0.90 AUTO drinks the best potion when HP / MP falls under the player's threshold (same 0.8 s gap as a manual use).
function autoPotionFor(realm,p){
 const w=p.world;if(!w.auto||w.player.hp<=0||realm.now()-(p.itemAt??0)<800)return;
 const id=pickPotion(p.bag,w.player,w.autoConfig);if(!id)return;
 try{const r=useItem(p.bag,id,w.player,w.status);p.itemAt=realm.now();w.player.hp=r.hp;w.player.mp=r.mp;w.status=r.status;realm.setBag(p,r.bag);w.emit('used',{item:id});}catch{}
}
export class RealmServer{
 autoPotion(p){autoPotionFor(this,p);}
 constructor({catalog,capacity=50,now=()=>Date.now(),warAlways=false,runEnabled=false}={}){this.wars=new Map();this.warAlways=warAlways;this.runEnabled=runEnabled===true;this.arenaPairs=new Map();this.onAnnounce=null;this.catalog=catalog;this.capacity=capacity;this.now=now;this.peers=new Map();this.rooms=new Map();this.parties=new Map();this.invites=new Map();this.guilds=new Map();this.guildsDirty=new Set();this.onGuild=null;this.leaders=new Map();this.onLeaders=null;this.leadersDirty=new Set();this.shops=new Map();this.onShop=null;this.prices=new Map();this.onPrices=null;this.pricesDirty=new Set();this.mvps=new Map();this.born=now();this.clock=0;this.tickId=0;}
 join({uid,serverId,slotId,record,send}){
  if(!uid||!isServer(serverId)||!isSlot(slotId))throw new Error('invalid-identity');
  let existing=[...this.peers.values()].find(p=>p.uid===uid);
  // A suspended copy of another character, or one past its resume window, is dropped so the new login can enter.
  if(existing?.suspended&&(existing.resumeUntil<this.now()||existing.serverId!==serverId||existing.slotId!==slotId)){this.leave(existing.id);existing=null;}
  if(existing){
   if(!existing.suspended||existing.resumeUntil<this.now()||existing.serverId!==serverId||existing.slotId!==slotId)throw new Error('already-online');
   existing.suspended=false;existing.resumeUntil=0;existing.send=send;existing.seq=0;existing.known=new Set();existing.input={x:0,z:0,attack:false};existing.inputAt=this.now();
   send({type:'welcome',id:existing.id,room:existing.room.id,capacity:this.capacity,history:copy(existing.room.history),snapshot:(existing.bagSent=0,existing.mobRoom=null,this.snapshot(existing))});this.social(existing.room);return existing;
  }
  const hero=character(record.character),capital=this.catalog.maps.find(m=>m.id===this.catalog.capital);
  let map=this.catalog.maps.find(m=>m.id===record.state.mapId)??capital;
  // 1.01 each guild has its own hall room; someone no longer in a guild (kicked while offline) wakes up in the capital.
  const hallGuild=map.guildHall?[...this.guilds.values()].find(g=>g.serverId===serverId&&g.members.some(x=>x.key===uid+':'+slotId)):null,evicted=map.guildHall&&!hallGuild;
  if(evicted)map=capital;
  // A party that travelled keeps its seat for a minute (0.49), so it can walk into the same dungeon instance together.
  const party=[...this.parties.values()].find(v=>v.pending?.has(uid));
  const roomId=serverId+':'+map.id+(map.instance?':'+(party?.id??'solo-'+uid):'')+(hallGuild?':'+hallGuild.id:'');
  let room=this.rooms.get(roomId);if(room&&room.peers.size>=this.capacity)throw new Error('room-full');
  if(!room){const simulation=new CombatWorld({...map});room={id:roomId,map,serverId,peers:new Set(),mobs:simulation.mobs,events:[],history:[],contributors:new Map()};this.rooms.set(roomId,room);this.wakeMvp(room);}
  const world=new CombatWorld({...map,classId:hero.classId,jobId:hero.jobId});restoreTraveler(world,record.state.traveler);if(record.xpCurve!==XP_CURVE)world.baseXp=migrateXp(world.baseXp);world.mobs=room.mobs;
  const skills=normalizeSkills(record.skills,hero.classId);world.skillLevels=[...skills[hero.classId]];
  const position=record.state.position;if(position&&!evicted&&walkable(position.x,position.z,.32,map.nav))Object.assign(world.player,position);
  const peer={id:randomUUID(),uid,serverId,slotId,character:hero,training:copy(record.training??null),skills,settings:copy(record.state.settings??{}),story:normalizeStory(record.story),world,room,send,seq:0,known:new Set(),input:{x:0,z:0,attack:false},inputAt:this.now(),partyId:null,bucket:40,chatAt:-Infinity,inviteAt:-Infinity,actionAt:-Infinity,emote:null};
  peer.equipment=normalizeEquipment(record.equipment,hero.classId);
  peer.bag=normalizeBag(record.bag);peer.bagVersion=1;peer.bagSent=0;peer.itemAt=-Infinity;
  peer.key=uid+':'+slotId;peer.tradeXp=Number.isSafeInteger(record.trade?.xp)&&record.trade.xp>0?record.trade.xp:0;if(map.id===MARKET_ZONE.mapId)peer.world.emit('shops',{list:this.shopList(serverId)});
  peer.friends=normalizeFriends(record.friends);peer.guildId=[...this.guilds.values()].find(g=>g.serverId===serverId&&g.members.some(x=>x.key===peer.key))?.id??null;if(peer.guildId)world.emit('guild',{guild:this.guildView(this.guilds.get(peer.guildId))}); // 1.01 hall props + NPC know the guild at once
  peer.daily=record.daily??null;peer.weekly=record.weekly??null;peer.rebirth=Math.min(REBIRTH_MAX,Math.max(0,record.rebirth|0));peer.bubbleAt=-Infinity;peer.dungeonDay=record.dungeonDay??null;peer.pet=normalizePet(record.pet);peer.bounty=record.bounty??null;peer.album=normalizeAlbum(record.album);
  if(party){party.pending.delete(uid);party.members.add(peer.id);peer.partyId=party.id;if(party.leaderPending===uid||!party.members.has(party.leader)){party.leader=peer.id;if(party.leaderPending===uid)party.leaderPending=null;}}
  peer.storage=normalizeStorage(record.storage);peer.trade=null;peer.stall=null;peer.saveNow=false;
  peer.stats=normalizeStats(record.stats);peer.gear=normalizeGear(record.gear);peer.statSig='';peer.gearAt=-Infinity;this.refreshStats(peer);
  world.hurt=(mob,damage,color)=>this.hurt(peer,mob,damage,color);
  this.peers.set(peer.id,peer);room.peers.add(peer.id);
  this.storyProgress(peer,{type:'enter',mapId:map.id});this.storyCheck(peer);this.arenaClaim(peer);
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
 suspend(id){const p=this.peers.get(id);if(!p)return;this.endTrade(p,'อีกฝ่ายหลุดการเชื่อมต่อ');p.stall=null;p.suspended=true;p.resumeUntil=this.now()+20000;p.input={x:0,z:0,attack:false,run:false};p.world.auto=false;p.world.clearEmote();p.world.player.moving=false;p.world.player.running=false;this.social(p.room);}
 error(p,code){p.send({type:'error',code});return false;}
 receive(id,m){
  const p=this.peers.get(id);if(!p||p.suspended)return false;
  if(!m||typeof m!=='object'||Array.isArray(m)||!allowed.has(m.type)||!integer(m.seq,1,Number.MAX_SAFE_INTEGER))return this.error(p,'invalid-message');
  if(m.seq<=p.seq)return m.type==='input'?false:this.error(p,'stale-command');p.seq=m.seq;
  if(p.bucket<1)return this.error(p,'rate-limit');p.bucket--;
  const w=p.world,now=this.now();
  if(m.type==='ping'){p.send({type:'pong',stamp:typeof m.stamp==='number'?m.stamp:0});return true;}
  if(m.type==='refine'){
   const npc=typeof m.npc==='string'?p.room.map.npcs?.find(n=>n.name===m.npc):null;
   if(!npc||!SHOPS[npc.name]?.refine||SHOPS[npc.name].mapId!==p.room.map.id||distance(npc,w.player)>3.6)return this.itemFail(p,'refine-far');
   if(now-p.gearAt<600)return this.itemFail(p,'gear-rate');p.gearAt=now;
   let r;try{r=refineGear(p.bag,p.gear,m.slot,{lekLai:m.lekLai===true,guard:m.guard===true});}catch(e){return this.itemFail(p,e.message);}
   const before=itemDef(p.gear[m.slot])?.name;p.gear=r.gear;this.setBag(p,r.bag);this.refreshStats(p);
   const shout=refineAnnouncement(p.character.name,r,before,itemDef(r.gear[m.slot])?.name);if(shout)this.worldSay(p.serverId,{actor:null,name:'ประกาศ',text:shout});
   w.emit('refined',{slot:m.slot,result:r.result,level:r.level,chance:r.chance});return true;
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
  if(m.type==='craft'){
   if(now-(p.craftAt??-Infinity)<300)return this.itemFail(p,'craft-rate');p.craftAt=now;
   let r;try{r=craft(p.bag,m.item,m.times);}catch(e){return this.itemFail(p,e.message);}
   this.setBag(p,r.bag);w.emit('crafted',{item:m.item,count:r.made});this.storyProgress(p,{type:'do',action:'craft'});return true;
  }
  if(m.type==='duel'){
   const t=this.peers.get(m.target);if(!t||t===p||t.suspended||t.room!==p.room||p.room.map.safe)return this.error(p,'duel-invalid');
   if(p.duel||t.duel)return this.error(p,'duel-busy');if(distance(t.world.player,w.player)>DUEL.range||t.world.player.hp<=0||w.player.hp<=0)return this.error(p,'duel-far');
   if(t.duelAsk?.to===p.id&&t.duelAsk.until>now){this.startDuel(t,p);return true;}
   if(now-p.inviteAt<2000)return this.error(p,'invite-rate');p.inviteAt=now;
   p.duelAsk={to:t.id,until:now+DUEL.ask};t.send({type:'duelAsk',from:p.id,name:p.character.name,expires:now+DUEL.ask});w.notice('ส่งคำท้าดวลถึง '+t.character.name+' แล้ว');return true;
  }
  if(m.type==='duelQuit'){if(p.duel)this.endDuel(this.peers.get(p.duel.foe),p,'ยอมแพ้');return true;}
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
     w.emit('tamed',{ok:r.ok,egg:PETS[id].egg,x:mob.x,z:mob.z});if(r.ok)this.storyProgress(p,{type:'do',action:'pet'});}
    else if(m.type==='hatch'){const r=hatch(p.bag,p.pet,m.item);this.setBag(p,r.bag);p.pet=r.pet;p.saveNow=true;this.storyProgress(p,{type:'do',action:'pet'});}
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
  // 0.102 weekly quests: claimed in a town like the daily bounties; rewards are cowries and items
  // 0.102 rebirth at Base Lv.99 in a town: Base level back to 1, stat points refunded (+40 for each rebirth),
  // class, job, skills, gear and bag kept; gear level limits no longer apply. Up to REBIRTH_MAX times.
  if(m.type==='rebirth'){
   if(!p.room.map.safe)return this.itemFail(p,'rebirth-town');
   if(baseProgress(w).level<99)return this.itemFail(p,'rebirth-level');
   if((p.rebirth??0)>=REBIRTH_MAX)return this.itemFail(p,'rebirth-max');
   p.rebirth=(p.rebirth??0)+1;w.baseXp=0;p.stats=normalizeStats(null);p.statSig=null;this.refreshStats(p);w.player.hp=w.player.maxHp;w.player.mp=w.player.maxMp;
   p.saveNow=true;w.notice('เกิดใหม่ครั้งที่ '+p.rebirth+' · กลับสู่ Lv.1 พร้อมแต้มสเตตัสโบนัส +'+p.rebirth*40);
   this.announce(p.serverId,'🌟 '+p.character.name+' เกิดใหม่เป็นครั้งที่ '+p.rebirth+'!');return true;
  }
  if(m.type==='weeklyClaim'){
   if(!p.room.map.safe)return this.itemFail(p,'bounty-town');
   let r;try{r=weeklyClaim(p.weekly,now,m.index);}catch(e){return this.itemFail(p,e.message);}
   p.weekly=r.state;this.grantLoot(p,{coins:r.reward.coins,items:r.reward.items.map(i=>({...i}))});p.saveNow=true;w.notice('รับรางวัลภารกิจรายสัปดาห์แล้ว');return true;
  }
  if(m.type==='leaderboard'){w.emit('leaderboard',this.leaderboard(p));return true;}
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
    if(m.type==='statUp')p.stats=raiseStat(p.stats,m.stat,who.level,who.reborn);
    else{const r=m.type==='equip'?equipGear(p.bag,p.gear,m.item,who):unequipGear(p.bag,p.gear,m.slot);p.gear=r.gear;this.setBag(p,r.bag);if(m.type==='equip')w.notice('สวมใส่ '+itemDef(m.item).name);}
   }catch(e){return this.itemFail(p,e.message);}
   this.refreshStats(p);return true;
  }
  if(m.type==='useItem'){
   if(now-p.itemAt<800)return this.itemFail(p,'item-rate');
   let r;try{r=useItem(p.bag,m.item,w.player,w.status);}catch(e){return this.itemFail(p,e.message);}
   p.itemAt=now;w.player.hp=r.hp;w.player.mp=r.mp;w.status=r.status;this.setBag(p,r.bag);if(r.food){w.food=r.food;w.notice('อิ่มอร่อย · '+itemDef(m.item).text);}w.emit('used',{item:m.item});return true;
  }
  if(m.type==='discard'){
   // Items offered in a locked trade stay put; equipped gear lives in p.gear, not the bag, so it cannot be thrown away.
   if(p.trade?.locked)return this.itemFail(p,'trade-locked');
   try{this.setBag(p,discard(p.bag,m.item,m.count));}catch(e){return this.itemFail(p,e.message);}
   w.notice('ทิ้ง '+(itemDef(m.item)?.name??m.item)+' ×'+m.count+' แล้ว');return true;
  }
  if(m.type==='buy'||m.type==='sell'){
   // Trading only next to that shop's NPC in its own map; the shared rules check coins, stock and bag room.
   const npc=typeof m.npc==='string'?p.room.map.npcs?.find(n=>n.name===m.npc):null,shop=npc&&SHOPS[npc.name];
   if(!shop||shop.mapId!==p.room.map.id||distance(npc,w.player)>3.6)return this.itemFail(p,'shop-too-far');
   const qty=m.count??1;
   try{const before=p.bag.coins,next=m.type==='buy'?buy(p.bag,npc.name,m.item,qty):sell(p.bag,m.item,qty),spent=m.type==='buy'?before-next.coins:0,off=Math.floor(spent*tradePerks(p.tradeXp).npcDiscount);this.setBag(p,off?{...next,coins:next.coins+off}:next);}catch(e){return this.itemFail(p,e.message);}
   w.emit('trade',{kind:m.type,item:m.item,count:qty,coins:p.bag.coins});this.storyProgress(p,{type:'do',action:'shop'});return true;
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
   if(!Number.isFinite(m.x)||!Number.isFinite(m.z)||Math.abs(m.x)>1||Math.abs(m.z)>1||typeof m.attack!=='boolean'||(m.run!==undefined&&typeof m.run!=='boolean'))return this.error(p,'invalid-input');
   // The host owns the sprint gate; bare realms stay closed by default.
   // Client capability flags and hand-written input packets cannot unlock it.
   const distance=Math.hypot(m.x,m.z),n=Math.max(1,distance);p.input={x:m.x/n,z:m.z/n,attack:m.attack,run:this.runEnabled&&m.run===true&&distance>.08};p.inputAt=now;if(distance>.08||m.attack)w.clearEmote();return true;
  }
  if(m.type==='autoConfig'){w.autoConfig=normalizeAuto(m);return true;} // 0.90 skills + potion thresholds for AUTO
  if(['skill','attack','select','auto','emote'].includes(m.type)){
   if(m.type!=='auto'){if(now-p.actionAt<70)return this.error(p,'action-rate');p.actionAt=now;} // 0.97 the AUTO switch is a state, never dropped behind a swing
   if(m.type==='select'){if(!integer(m.target,0,9999))return this.error(p,'invalid-target');w.select(m.target);return true;}
   if(m.type==='skill'){if(!integer(m.index,0,SLOTS-1))return this.error(p,'invalid-skill');return w.skill(m.index);}
   if(m.type==='attack')return w.basicAttack();
   if(m.type==='auto'){if(typeof m.on==='boolean')w.setAuto(m.on,m.hunt);else w.toggleAuto();return true;}
   const name=canonicalAction(m.name);if(!EMOTE_ACTIONS.includes(name))return this.error(p,'invalid-emote');
   if(!w.setEmote(name))return this.error(p,'invalid-emote');
   // Clear the last held input too: a sit command cannot keep steering until its next packet.
   p.input={x:0,z:0,attack:false,run:false};p.inputAt=now;p.room.events.push({type:'emote',actor:p.id,name,time:this.clock});return true;
  }
  if(m.type==='chat'){
   if(now-p.chatAt<1200)return this.error(p,'chat-rate');
   if(typeof m.text!=='string'||!['room','party','guild','whisper','world'].includes(m.channel))return this.error(p,'invalid-chat');
   const text=m.text.normalize('NFC').replace(/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g,'').trim();
   if(!text||text.length>240)return this.error(p,'invalid-chat');
   // 0.47 whisper: one named player on this server, wherever they are; guild: every online member.
   if(m.channel==='whisper'){const o=this.byName(p,cleanName(m.to));if(!o)return this.itemFail(p,'whisper-offline');p.chatAt=now;const message={type:'chat',id:randomUUID(),actor:p.id,name:p.character.name,to:o.character.name,text,channel:'whisper',time:now};p.send(message);o.send(message);return true;}
   // World: everyone online on this server, any map; its own slower cooldown so one player cannot flood it.
   if(m.channel==='world'){if(now-(p.worldAt??-Infinity)<WORLD_CHAT_COOLDOWN)return this.error(p,'world-rate');p.chatAt=p.worldAt=now;this.worldSay(p.serverId,{actor:p.id,name:p.character.name,text});return true;}
   if(m.channel==='guild'){const g=this.guildOf(p);if(!g)return this.itemFail(p,'guild-none');p.chatAt=now;const message={type:'chat',id:randomUUID(),actor:p.id,name:p.character.name,text,channel:'guild',time:now};for(const x of g.members)this.online(x.key)?.send(message);return true;}
   const party=this.parties.get(p.partyId);if(m.channel==='party'&&!party)return this.error(p,'no-party');p.chatAt=now;
   const message={type:'chat',id:randomUUID(),actor:p.id,name:p.character.name,text,channel:m.channel,time:now};
   for(const pid of party&&m.channel==='party'?party.members:p.room.peers)this.peers.get(pid)?.send(message);
   if(m.channel==='room'){p.room.history.push(message);if(p.room.history.length>40)p.room.history.shift();}return true;
  }
  if(m.type==='invite'){
   const target=this.peers.get(m.target);if(!target||target===p||target.serverId!==p.serverId||target.partyId)return this.error(p,'invalid-invite');
   const party=this.parties.get(p.partyId);if(party&&(party.leader!==p.id||party.members.size>=5))return this.error(p,'party-full-or-leader');
   if(now-p.inviteAt<2000)return this.error(p,'invite-rate');p.inviteAt=now;
   const invitation={id:randomUUID(),from:p.id,to:target.id,expires:now+30000};this.invites.set(invitation.id,invitation);
   target.send({type:'invite',id:invitation.id,from:p.id,name:p.character.name,expires:invitation.expires});return true;
  }
  if(m.type==='answer'){
   const invite=this.invites.get(m.invite),leader=this.peers.get(invite?.from);
   if(!invite||invite.to!==p.id||invite.expires<now||!leader||leader.serverId!==p.serverId||typeof m.accept!=='boolean')return this.error(p,'expired-invite');
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
 // 0.99.14 the roster covers the whole channel (every map of the server), so a party can be formed across maps;
 // here = on the viewer's map (duels, trades and shared EXP still need the same map)
 social(room){const all=[...this.peers.values()].filter(a=>a.serverId===room.serverId&&a.room);for(const p of all){const party=this.parties.get(p.partyId);p.send({type:'social',players:all.map(a=>({id:a.id,name:a.character.name,classId:a.character.classId,partyId:a.partyId,map:a.room.map.name,here:a.room===p.room})),party:party?{id:party.id,leader:party.leader,members:[...party.members]}:null});}}
 // ---- 0.95 weekly guild war (guild-war.js). One war state per channel; the stone is shared by everyone there.
 warState(serverId){let s=this.wars.get(serverId);if(!s){s={active:false,holder:null,stone:{id:'war:stone',pvp:true,name:WAR.stone.name,x:WAR.stone.x,z:WAR.stone.z,hp:WAR.stone.hp,maxHp:WAR.stone.hp}};this.wars.set(serverId,s);}return s;}
 castleOwner(serverId){return [...this.guilds.values()].find(g=>g.serverId===serverId&&g.castle)??null;}
 warTick(){
  const w=warWindow(this.now(),this.warAlways);
  for(const serverId of new Set([...SERVER_IDS,...[...this.peers.values()].map(p=>p.serverId)])){
   const s=this.warState(serverId);
   if(!w.active&&w.nextAt>this.now()&&w.nextAt-this.now()<=15*6e4&&s.reminded!==w.nextAt){s.reminded=w.nextAt;this.herald(serverId,`⏰ อีก 15 นาทีกิลด์วอร์เริ่ม! · ${warLabel(this.now())} ที่โรงสีใต้เงาจันทร์`);}
   if(w.active&&!s.active){s.active=true;s.holder=this.castleOwner(serverId)?.id??null;s.stone.hp=s.stone.maxHp;this.herald(serverId,`⚔️ กิลด์วอร์เริ่มแล้ว! · ไปที่${this.catalog.maps.find(m=>m.id===WAR.map)?.name??WAR.map} ทำลาย${WAR.stone.name}เพื่อยึด${WAR.name} · ${WAR.minutes} นาที`);}
   if(!w.active&&s.active){s.active=false;this.warEnd(serverId,s);}
  }
  for(const p of this.peers.values())this.warRivals(p);
 }
 // Enemy-guild players in the war map (and the stone, unless your guild holds it) become targets for this player.
 warRivals(p){
  const s=this.wars.get(p.serverId),w=p.world,g=s?.active&&p.room.map.id===WAR.map&&!p.suspended?this.guildOf(p):null;
  if(!g){if(w.rivals.length){if(String(w.targetId).startsWith('war:'))w.targetId=null;w.rivals=[];}return;}
  const list=s.holder===g.id?[]:[s.stone];p.rivalCache??=new Map();
  for(const id of p.room.peers){const a=this.peers.get(id);if(a===p||a.suspended||!this.guildOf(a)||a.guildId===g.id)continue;
   let v=p.rivalCache.get(a.id);if(!v){v={id:'war:'+a.id,pvp:true,name:a.character.name};p.rivalCache.set(a.id,v);}
   Object.assign(v,{x:a.world.player.x,z:a.world.player.z,hp:a.world.player.hp,maxHp:a.world.player.maxHp,guild:this.guildOf(a)?.name??''});list.push(v);}
  w.rivals=list;
 }
 warHit(p,mob,damage,color){
  const s=this.wars.get(p.serverId);if(!s?.active||!p.world.rivals.includes(mob))return;
  if(mob===s.stone){const amount=Math.min(mob.hp,damage);mob.hp-=amount;p.world.emit('damage',{id:mob.id,x:mob.x,z:mob.z,amount,color});
   if(mob.hp>0)return;const g=this.guildOf(p);s.holder=g.id;mob.hp=mob.maxHp;
   for(const id of p.room.peers){const a=this.peers.get(id);if(a.world.targetId===mob.id)a.world.targetId=null;}
   this.announce(p.serverId,`🏯 กิลด์ ${g.name} ยึด${WAR.name}ได้! · ${p.character.name} ทำลาย${WAR.stone.name}`);return;}
  const a=this.peers.get(mob.id.slice(4)),v=a?.world.player;if(!v||v.hp<=0)return;
  const amount=monsterHit(a.world,Math.max(1,Math.round(damage*WAR.scale)));if(!amount){a.world.emit('dodge',{x:v.x,z:v.z});return;}
  v.hp=Math.max(0,v.hp-amount);mob.hp=v.hp;p.world.emit('damage',{id:mob.id,x:v.x,z:v.z,amount,color});a.world.emit('playerHit',{x:v.x,z:v.z,amount});
  if(v.hp>0)return; // knocked out: back to the map's start in 3 s, no EXP loss
  v.down=3;Object.assign(a.world,{auto:false,targetId:null,path:[],status:{}});
  a.world.notice('ถูก '+p.character.name+' ล้มในกิลด์วอร์ · กลับจุดเกิดใน 3 วินาที');p.world.notice('⚔️ ล้ม '+a.character.name+' ได้!');
 }
 warEnd(serverId,s){
  const prev=this.castleOwner(serverId),g=s.holder&&this.guilds.get(s.holder);
  if(prev&&prev!==g){prev.castle=false;this.guildChanged(prev);}
  if(!g){this.herald(serverId,'🏯 กิลด์วอร์จบแล้ว · ไม่มีกิลด์ใดยึด'+WAR.name+'ได้');return;}
  g.castle=true;this.guildChanged(g);this.herald(serverId,`👑 กิลด์ ${g.name} ครอง${WAR.name}สัปดาห์นี้! · สงครามครั้งหน้า ${warLabel(this.now())}`);
  for(const x of g.members){const o=this.online(x.key);if(o?.serverId===serverId){this.grantLoot(o,structuredClone(WAR.reward));o.saveNow=true;o.world.notice('👑 หีบสงครามของผู้ครองป้อม · ได้รับรางวัลแล้ว');}}
 }
 herald(serverId,text){this.announce(serverId,text);this.onAnnounce?.('**['+(SERVER_NAME[serverId]??serverId)+']** '+text);}
 // ---- 0.96 weekly duel tournament (arena.js), stored beside the power board as leaders['arena:'+serverId].
 arena(serverId){const id='arena:'+serverId,week=arenaWeek(this.now());let a=this.leaders.get(id);if(!a||a.week!==week)a=this.arenaRollover(serverId,a,week);return a;}
 arenaRollover(serverId,old,week){
  const top=Object.entries(old?.rows??{}).filter(([,v])=>v.points>0).sort(byPoints).slice(0,3),prizes={...(old?.prizes??{})};
  top.forEach(([k],i)=>{prizes[k]={place:i+1,week:old.week};});
  const a={week,rows:{},last:top.map(([,v],i)=>({place:i+1,name:v.name,classId:v.classId,points:v.points,wins:v.wins})),prizes};
  this.leaders.set('arena:'+serverId,a);this.leadersDirty.add('arena:'+serverId);this.arenaPairs.clear();
  if(top.length)this.herald(serverId,'🏆 ผลทัวร์นาเมนต์ประลองประจำสัปดาห์ · '+a.last.map(x=>['🥇','🥈','🥉'][x.place-1]+' '+x.name+' '+x.points+' แต้ม').join(' · '));
  for(const p of this.peers.values())if(p.serverId===serverId)this.arenaClaim(p,a);
  return a;
 }
 arenaClaim(p,a=this.arena(p.serverId)){
  const z=a.prizes?.[p.key];if(!z)return;delete a.prizes[p.key];this.leadersDirty.add('arena:'+p.serverId);
  this.grantLoot(p,structuredClone(ARENA.prizes[z.place-1]));p.saveNow=true;p.world.notice('🏆 รางวัลทัวร์นาเมนต์ประลอง อันดับ '+z.place+' · ได้รับแล้ว');
 }
 arenaScore(w,l,draw){
  if(!w||!l||w.uid===l.uid)return;const a=this.arena(w.serverId),pair=[w.key,l.key].sort().join('|')+'|'+arenaDay(this.now()),n=this.arenaPairs.get(pair)??0;
  if(n>=ARENA.pairDaily){for(const x of [w,l])x.world.notice('คู่นี้นับแต้มทัวร์นาเมนต์ครบ '+ARENA.pairDaily+' ครั้งของวันนี้แล้ว');return;}
  this.arenaPairs.set(pair,n+1);
  const row=x=>a.rows[x.key]??={name:x.character.name,classId:x.character.classId,points:0,wins:0,losses:0,draws:0,t:this.now()};
  if(draw){for(const x of [w,l]){row(x).points+=ARENA.draw;row(x).draws++;row(x).t=this.now();x.world.notice('ทัวร์นาเมนต์ +'+ARENA.draw+' แต้ม (เสมอ)');}}
  else{row(w).points+=ARENA.win;row(w).wins++;row(w).t=this.now();row(l).losses++;w.world.notice('ทัวร์นาเมนต์ +'+ARENA.win+' แต้ม · รวม '+row(w).points);}
  this.leadersDirty.add('arena:'+w.serverId);
 }
 arenaView(p){const a=this.arena(p.serverId),rows=Object.entries(a.rows).sort(byPoints),mine=rows.findIndex(([k])=>k===p.key);
  return {rows:rows.slice(0,30).map(([k,v],i)=>({rank:i+1,me:k===p.key,name:v.name,classId:v.classId,points:v.points,wins:v.wins,losses:v.losses,draws:v.draws})),me:mine<0?null:{rank:mine+1,points:rows[mine][1].points},last:a.last,endsAt:arenaEnds(this.now())};}
 warView(p){
  const s=this.wars.get(p.serverId),owner=this.castleOwner(p.serverId),here=p.room.map.id===WAR.map;
  return {active:!!s?.active,next:warLabel(this.now()),owner:owner?.name??null,holder:s?.active&&s.holder?this.guilds.get(s.holder)?.name??null:null,
   stone:s?.active&&here?{hp:s.stone.hp,maxHp:s.stone.maxHp}:null,left:s?.active?Math.max(0,Math.ceil((warWindow(this.now(),this.warAlways).endsAt-this.now())/1000)):0,rivals:here?p.world.rivals:[]};
 }
 startDuel(a,b){
  const until=this.now()+DUEL.time;
  for(const [x,y] of [[a,b],[b,a]]){const v=x.world.player;x.duelAsk=null;x.duel={foe:y.id,until};v.hp=v.maxHp;v.mp=v.maxMp;x.world.auto=false;
   x.world.foe={id:'duel:'+y.id,pvp:true,name:y.character.name,x:0,z:0,hp:1,maxHp:1};this.duelSync(x);x.world.targetId=x.world.foe.id;x.world.path=[];
   x.world.notice('⚔️ เริ่มประลองกับ '+y.character.name+' · 90 วินาที · เดินห่างเกิน 20 ม. = เสมอ');}
 }
 // Copies the opponent's position and HP onto the stand-in target; false when the bout has to stop.
 duelSync(p){const y=this.peers.get(p.duel?.foe);if(!y||y.suspended||y.room!==p.room||y.duel?.foe!==p.id)return false;Object.assign(p.world.foe,{x:y.world.player.x,z:y.world.player.z,hp:y.world.player.hp,maxHp:y.world.player.maxHp});return true;}
 duelTick(p){
  const y=this.peers.get(p.duel.foe);if(!this.duelSync(p)){this.endDuel(p,y?.duel?.foe===p.id?y:null,'อีกฝ่ายออกจากพื้นที่');return;}
  if(p.world.player.hp<=0)return this.endDuel(y,p,'หมดแรงกลางสนาม');
  if(distance(p.world.player,y.world.player)>DUEL.range)return this.endDuel(p,y,'ห่างกันเกินไป',true);
  if(this.now()>p.duel.until){const share=a=>a.world.player.hp/a.world.player.maxHp,a=share(p),b=share(y);return a===b?this.endDuel(p,y,'หมดเวลา',true):a>b?this.endDuel(p,y,'หมดเวลา · เลือดเหลือมากกว่า'):this.endDuel(y,p,'หมดเวลา · เลือดเหลือมากกว่า');}
 }
 // Ends a bout: no death and no EXP loss; the loser keeps 1 HP. draw=true when nobody won.
 endDuel(winner,loser,reason,draw=false){
  for(const x of [winner,loser]){if(!x?.duel)continue;if(x.world.targetId===x.world.foe?.id)x.world.targetId=null;x.duel=null;x.world.foe=null;}
  const names=[winner,loser].map(x=>x?.character.name??'อีกฝ่าย'),room=(winner??loser)?.room;
  this.arenaScore(winner,loser,draw);for(const x of [winner,loser])if(x)this.storyProgress(x,{type:'do',action:'duel'});
  if(draw){for(const x of [winner,loser])x?.world.notice('🤝 ประลองเสมอ · '+reason);return;}
  winner?.world.notice('🏆 ชนะการประลอง! · '+reason);loser?.world.notice('💢 แพ้การประลอง · '+reason);
  for(const id of room?.peers??[]){const a=this.peers.get(id);if(a!==winner&&a!==loser)a.world.notice('⚔️ '+names[0]+' ชนะ '+names[1]+' ในการประลอง');}
 }
 duelHit(p,mob,damage,color){
  const y=this.peers.get(p.duel?.foe);if(!y||mob.id!=='duel:'+y.id)return;const v=y.world.player;
  const amount=monsterHit(y.world,Math.max(1,Math.round(damage*DUEL.scale)));if(!amount){y.world.emit('dodge',{x:v.x,z:v.z});return;}
  v.hp=Math.max(1,v.hp-amount);mob.hp=v.hp;p.world.emit('damage',{id:mob.id,x:v.x,z:v.z,amount,color});y.world.emit('playerHit',{x:v.x,z:v.z,amount});
  if(v.hp===1)this.endDuel(p,y,'น็อก '+y.character.name);
 }
 hurt(p,mob,damage,color='#fff0a6'){
  if(mob?.pvp)return String(mob.id).startsWith('war:')?this.warHit(p,mob,damage,color):this.duelHit(p,mob,damage,color);
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
  ids.forEach((id,i)=>{const a=this.peers.get(id),gx=1+this.guildBonus(a).exp;a.world.kills++;this.guildKill(a);if(a.training&&!a.training.bossDone&&(a.training.boss??TRIAL[a.training.tier]?.boss)===reward.id){a.training={...a.training,bossDone:true};a.saveNow=true;a.world.notice('⚔️ ล้มบอสบททดสอบแล้ว! · กลับไปส่งบททดสอบที่ลานครู');}const split=n=>Math.floor(n/ids.length)+(i<n%ids.length?1:0);a.world.emit('experience',awardExperience(a.world,Math.round(split(Math.round(reward.baseXp*rate))*gx),Math.round(split(Math.round(reward.jobXp*rate))*gx)));a.world.emit('defeat',{id:mob.id,x:mob.x,z:mob.z});this.storyProgress(a,{type:'defeat',monster:reward.id,mapId:p.room.map.id});a.weekly=weeklyDefeat(a.weekly,this.now(),{leader:!!mob.leader,boss:!!reward.boss});{const bd=bountyDefeat(a.bounty,this.now(),reward.id,mob.leader);if(bd.changed)a.bounty=bd.state;}{const loot=rollLoot(reward.id,Math.random,event,rolls);loot.coins=Math.round(loot.coins*(1+(a.derived?.coinPct??0)+this.guildBonus(a).coins));this.grantLoot(a,loot,mob);}});
  p.room.contributors.delete(mob.id);
  for(const id of p.room.peers){const a=this.peers.get(id);if(a.world.targetId===mob.id){a.world.targetId=null;a.world.path=[];}}
 }
 step(dt=.05){
  dt=Math.max(0,Math.min(.05,dt));this.clock+=dt;this.tickId++;
  if(this.tickId%1200===0&&this.onLeaders)for(const id of this.leadersDirty){this.leadersDirty.delete(id);Promise.resolve(this.onLeaders(id,this.leaders.get(id))).catch(e=>console.error('leader-save',e.message));}
  if(this.tickId%1200===0&&this.onPrices)for(const id of this.pricesDirty){this.pricesDirty.delete(id);Promise.resolve(this.onPrices(id,this.prices.get(id))).catch(e=>console.error('price-save',e.message));}
  if(this.tickId%1200===0)for(const g of this.guildsDirty){this.guildsDirty.delete(g);if(this.guilds.get(g.id)===g)this.onGuild?.(g,false);} // 1.01 kill counts, once a minute
  {const s=surge(this.now()); // 0.64 announce each field surge once, on every channel
   if(s.active&&this.surgeSlot!==s.slot){this.surgeSlot=s.slot;const name=this.catalog.maps.find(m=>m.id===s.map)?.name??s.map;for(const id of new Set([...this.peers.values()].map(p=>p.serverId)))this.announce(id,`🔥 ฝูงคลั่งที่ ${name}! · EXP ×2 และดรอป ×2 อีก 5 นาที`);}}
  for(const p of this.peers.values())if(p.suspended&&p.resumeUntil&&p.resumeUntil<this.now())this.leave(p.id);
  for(const [id,v] of this.invites)if(v.expires<this.now())this.invites.delete(id);
  for(const party of [...this.parties.values()])for(const [uid,until] of party.pending??[])if(until<this.now()){party.pending.delete(uid);if(party.members.size+party.pending.size<2){for(const id of party.members){const a=this.peers.get(id);a.partyId=null;this.social(a.room);}this.parties.delete(party.id);}}
  this.warTick();
  if(this.tickId%20===0)for(const p of this.peers.values())if(!p.suspended)this.storyCheck(p);
  if(this.tickId%1200===1)for(const id of SERVER_IDS)this.arena(id); // weekly rollover even when quiet
  for(const p of this.peers.values()){if(p.suspended)continue;petTick(p.pet,dt);p.bucket=Math.min(40,p.bucket+dt*25);if(this.now()-p.inputAt>350)p.input={x:0,z:0,attack:false};if(p.duel)this.duelTick(p);p.world.update(dt,p.input,{monsters:false});this.autoPotion(p);}
  for(const room of this.rooms.values()){
   // 0.99.11 the living players of the room once per tick; each monster just takes the closest (no per-monster sort)
   const alive=[...room.peers].map(id=>this.peers.get(id)).filter(p=>!p.suspended&&p.world.player.hp>0);
   for(const m of room.mobs){
    let target=null,near=Infinity;for(const p of alive){const d=distance(p.world.player,m);if(d<near){near=d;target=p;}}
    const type=MONSTER_TYPES[m.type];
    if(type.mvp&&m.hp<=0)m.dead=(this.mvpState(room.serverId).nextAt-this.now())/1000; // wall-clock timer, shared by every room of the channel
    const result=advanceMonster(m,target?.world.player,type,dt,room.map.nav,{moveBody,lineClear});
    if(result==='respawn'){room.contributors.delete(m.id);if(type.mvp)this.announce(room.serverId,`👑 MVP ${type.name} ปรากฏตัวที่ ${room.map.name}!`);else if(type.awakened)this.announce(room.serverId,`⚡ ${type.name} (Lv.${type.level}) ตื่นขึ้นที่ ${room.map.name}!`);}
    if(m.justEnraged){m.justEnraged=false;for(const id of room.peers)this.peers.get(id).world.notice(type.name+' โกรธจัด! · เร็วและแรงขึ้น');}
    if(result==='burst')for(const id of room.peers){const a=this.peers.get(id);if(!a.suspended&&a.world.player.hp>0&&distance(a.world.player,m)<=MONSTER_BEHAVIOUR[type.id].aoe)a.world.takeMonsterHit(type);}
    if(result==='hit'&&target){
     target.world.takeMonsterHit(type);
    }
   }
   for(const id of room.peers){const p=this.peers.get(id);for(const event of p.world.events.splice(0)){const e={...event,actor:id};if(e.type==='experience'&&e.baseUp)for(const g of levelGifts(e.baseFrom,e.baseLevel)){p.world.notice(`ของขวัญ Lv.${g.level} · ${g.text}`);this.grantLoot(p,{coins:g.coins,items:g.items.map(i=>({...i}))});p.saveNow=true;}if(['notice','experience','defeat','select','story','loot','used','trade','refined','carded','stored','tradeAsk','tradeState','tradeEnd','stalls','stallSold','leaderboard','shops','shopMine','marketResults','friends','friendAsk','guild','guildAsk','daily','mvp','dungeonClear','tamed','album','crafted'].includes(e.type))p.send({type:'events',events:[e]});else room.events.push(e);}}
   if(this.tickId%2===0){this.broadcasting=true;const events=copy(room.events);for(const id of room.peers){const p=this.peers.get(id);p.send({type:'snapshot',...this.snapshot(p),events});}this.broadcasting=false;room.events=[];}
  }
 }
 storyProgress(p,event){
  const r=storyEvent(p.story,event);if(!r.changed)return false;p.story=r.state;
  p.world.emit('story',{npc:event.npc??null,say:r.say??null,completed:r.completed?.title??null,story:r.state});
  if(r.reward){p.world.emit('experience',awardExperience(p.world,r.reward.baseXp,r.reward.jobXp));this.grantLoot(p,{coins:r.reward.coins??0,items:rewardItems(r.reward,p.character.classId)});p.saveNow=true;}
  return true;
 }
 // 0.98 tutorial steps that are already true (wearing a weapon, a refined or carded piece, a class, a level, AUTO on,
 // a guild) finish on their own; checked once a second and right after joining.
 storyContext(p){const g=p.gear??{},worn=Object.values(g).filter(Boolean).map(id=>itemDef(id));
  return {level:this.who(p).level,weapon:!!g.weapon,refined:worn.some(d=>d?.refine>0),carded:worn.some(d=>d?.card),job:p.character.classId!=='novice',
   skilled:(p.world.skillLevels??[]).reduce((n,v)=>n+v,0)>2,auto:!!p.world.auto,guild:!!this.guildOf(p)};}
 storyCheck(p){for(let i=0;i<30&&this.storyProgress(p,{type:'check',ctx:this.storyContext(p)});i++);}
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
 setBag(p,bag){p.bag=bag;p.bagVersion++;if(p.stall)p.stall={...p.stall,...normalizeStall(p.stall,bag,tradePerks(p.tradeXp).slots)};}
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
   {const tax=taxOf(r.cost,tradePerks(o.tradeXp));r.net=r.cost-tax;r.sellerBag={...r.sellerBag,coins:r.sellerBag.coins-tax};this.traded(p.serverId,[p,o],m.item,r.cost,m.count);}
   this.setBag(o,r.sellerBag);this.setBag(p,r.buyerBag);o.stall={...o.stall,...r.stall};p.saveNow=o.saveNow=true;
   o.world.emit('stallSold',{item:m.item,count:m.count,coins:r.net,buyer:p.character.name});w.notice('ซื้อจากแผง '+o.character.name+' แล้ว');
   this.stallCommand(p,{type:'stallList'});return true;}
  return false;
 }
 who(p){return {classId:p.character.classId,level:baseProgress(p.world).level,reborn:p.rebirth??0};}
 // Status + worn gear → combat numbers; cheap no-op unless level, class, stats or gear changed.
 // 0.72 leaderboard: best combat power per character (offline characters keep their last entry); top 200 kept.
 rank(p){const power=combatPower(p.derived,this.who(p).level),board=this.leaders.get(p.serverId)??{},old=board[p.key];
  if(old&&old.power===power&&old.level===this.who(p).level&&old.name===p.character.name)return;
  board[p.key]={name:p.character.name,classId:p.character.classId,gender:p.character.gender,level:this.who(p).level,power,t:this.now()};
  const keep=Object.entries(board).sort((a,b)=>b[1].power-a[1].power).slice(0,200);this.leaders.set(p.serverId,Object.fromEntries(keep));this.leadersDirty.add(p.serverId);}
 leaderboard(p){const rows=Object.entries(this.leaders.get(p.serverId)??{}).sort((a,b)=>b[1].power-a[1].power);
  const mine=rows.findIndex(([k])=>k===p.key);return {rows:rows.slice(0,50).map(([k,v],i)=>({rank:i+1,me:k===p.key,...v})),me:mine<0?null:{rank:mine+1,...rows[mine][1]},arena:this.arenaView(p)};}
 refreshStats(p){
  const who=this.who(p),pet=petBonus(p.pet),food=foodBuff(p.world),sig=JSON.stringify([who,p.stats,p.gear,pet,food]);if(sig===p.statSig)return;
  const fit=dropInvalidGear(p.bag,p.gear,who);if(JSON.stringify(fit.gear)!==JSON.stringify(p.gear)){p.gear=fit.gear;this.setBag(p,fit.bag);}
  p.statSig=JSON.stringify([who,p.stats,p.gear,pet,food]);p.derived=deriveStats({...who,stats:p.stats,gear:p.gear,pet,food});p.world.applyDerived(p.derived);this.rank(p);
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
  this.herald(room.serverId,winner?`👑 ${winner.character.name} ได้ MVP ${type.name}! · กลับมาอีกใน 60 นาที`:`${type.name} ถูกปราบแล้ว · กลับมาอีกใน 60 นาที`);
 }
 worldSay(serverId,{actor,name,text}){const message={type:'chat',id:randomUUID(),actor,name,text,channel:'world',time:this.now()};for(const o of this.peers.values())if(o.serverId===serverId&&!o.suspended)o.send(message);}
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
 guildTag(p){const g=this.guildOf(p);return g?{name:g.name,emblem:g.emblem,...(g.castle?{castle:true}:{})}:null;}
 sendFriends(p){p.world.emit('friends',{list:p.friends.map(f=>{const o=this.online(f.key);return {name:f.name,online:!!o,map:o?.room.map.name??null};})});}
 guildView(g){if(!g)return null;const exp=g.exp??0,level=guildLevel(exp),goal=this.guildGoal(g);
  return {name:g.name,emblem:g.emblem,level,exp,next:GUILD_LEVELS[level]??null,treasury:g.treasury??0,notice:g.notice??'',upgrades:{flag:0,armory:0,stable:0,...g.upgrades},seats:guildSeats(g),
   rite:Math.max(0,Math.ceil(((g.rite??0)-this.now())/1000)),goal:{kills:goal.kills,need:GUILD_GOAL.kills,done:goal.done},
   members:g.members.map(x=>{const o=this.online(x.key);return {name:x.name,leader:x.key===g.leader,rank:this.guildRank(g,x.key),contrib:x.contrib??0,online:!!o,map:o?.room.map.name??null};})};}
 guildChanged(g){this.guildsDirty.delete(g);this.onGuild?.(g,false);for(const x of g.members){const o=this.online(x.key);if(o){o.guildId=g.id;o.world.emit('guild',{guild:this.guildView(g)});}}}
 guildChat(g,text){const message={type:'chat',id:randomUUID(),actor:null,name:'กิลด์',text,channel:'guild',time:this.now()};for(const x of g.members)this.online(x.key)?.send(message);}
 // ---- 1.01 guild progression. Ranks: leader > deputy > member; every rule below is checked here, never on the client.
 guildRank(g,key){return key===g.leader?'leader':g.members.find(x=>x.key===key)?.rank==='deputy'?'deputy':'member';}
 guildGoal(g){const day=thaiDay(this.now());if(g.goal?.day!==day)g.goal={day,kills:0,done:false};return g.goal;}
 // Guild EXP (and the member's contribution) with a guild-chat line on level up. Returns true on level up.
 guildGain(g,exp,member){const before=guildLevel(g.exp??0);g.exp=Math.min(GUILD_LEVELS.at(-1),(g.exp??0)+exp);if(member)member.contrib=(member.contrib??0)+exp;
  const after=guildLevel(g.exp);if(after>before)this.guildChat(g,`🎉 กิลด์ขึ้นเป็นระดับ ${after}!`);return after>before;}
 guildBonus(p){const g=this.guildOf(p);if(!g)return {exp:0,coins:0};const u=g.upgrades??{};
  return {exp:(u.flag??0)*GUILD_UPGRADES.flag.exp+((g.rite??0)>this.now()?GUILD_RITE.exp:0),coins:(u.armory??0)*GUILD_UPGRADES.armory.coins};}
 // Every member kill: 1 guild EXP + 1 contribution, and one step of the shared daily goal. Saved once a minute.
 guildKill(p){const g=this.guildOf(p);if(!g)return;const goal=this.guildGoal(g),up=this.guildGain(g,1,g.members.find(x=>x.key===p.key));goal.kills++;
  if(!goal.done&&goal.kills>=GUILD_GOAL.kills){goal.done=true;g.treasury=(g.treasury??0)+GUILD_GOAL.treasury;this.guildGain(g,GUILD_GOAL.exp);this.guildChat(g,`⚔️ เป้าหมายวันนี้สำเร็จ! ล่าครบ ${GUILD_GOAL.kills} ตัว · กิลด์ EXP +${GUILD_GOAL.exp} · คลัง +${GUILD_GOAL.treasury} เบี้ย`);this.guildChanged(g);}
  else if(up)this.guildChanged(g);else this.guildsDirty.add(g);}
 // Someone who is no longer a member is sent out of the hall (the client travels them to the capital).
 guildEvict(o){if(o?.room.map.guildHall){o.world.emit('guildHallExit',{});o.world.notice('ออกจากทุ่งชุมพล · ไม่ได้เป็นสมาชิกกิลด์นี้แล้ว');}}
 socialCommand(p,m){
  const w=p.world,fail=c=>this.itemFail(p,c),g=this.guildOf(p),rank=g?this.guildRank(g,p.key):null,staff=rank==='leader'||rank==='deputy';
  if(m.type==='friendList'){this.sendFriends(p);return true;}
  if(m.type==='friendAdd'){const o=this.byName(p,cleanName(m.name));if(!o)return fail('whisper-offline');if(o.key===p.key)return fail('friend-self');
   if(p.friends.some(f=>f.key===o.key))return fail('friend-already');if(p.friends.length>=FRIEND_MAX)return fail('friend-full');
   (p.friendAsks??=new Set()).add(o.key);o.world.emit('friendAsk',{from:p.id,name:p.character.name});w.notice('ส่งคำขอเป็นเพื่อนถึง '+o.character.name+' แล้ว');return true;}
  if(m.type==='friendAnswer'){const o=this.peers.get(m.from);if(!o||!o.friendAsks?.has(p.key))return fail('friend-none');o.friendAsks.delete(p.key);
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
  if(m.type==='guildInvite'){if(!g)return fail('guild-none');if(!staff)return fail('guild-rank');if(g.members.length>=guildSeats(g))return fail('guild-full');
   const o=this.byName(p,cleanName(m.name));if(!o)return fail('whisper-offline');if(this.guildOf(o))return fail('guild-target');
   o.guildAsk=g.id;o.world.emit('guildAsk',{guild:g.id,name:g.name,emblem:g.emblem,from:p.character.name});w.notice('ส่งคำเชิญเข้ากิลด์ถึง '+o.character.name+' แล้ว');return true;}
  if(m.type==='guildAnswer'){const ng=this.guilds.get(m.guild);if(!ng||p.guildAsk!==ng.id)return fail('guild-invite');p.guildAsk=null;
   if(!m.accept)return true;if(g)return fail('guild-already');if(ng.members.length>=guildSeats(ng))return fail('guild-full');
   ng.members.push({key:p.key,name:p.character.name});this.guildChanged(ng);this.guildChat(ng,p.character.name+' เข้าร่วมกิลด์');return true;}
  if(m.type==='guildLeave'||m.type==='guildKick'){if(!g)return fail('guild-none');if(m.type==='guildKick'&&!staff)return fail('guild-rank');
   const gone=m.type==='guildLeave'?g.members.find(x=>x.key===p.key):g.members.find(x=>x.name===m.name&&x.key!==p.key);if(!gone)return fail('guild-none');
   // A deputy may only remove plain members; the leader may remove anyone.
   if(m.type==='guildKick'&&rank==='deputy'&&this.guildRank(g,gone.key)!=='member')return fail('guild-rank');
   g.members=g.members.filter(x=>x!==gone);
   const o=this.online(gone.key);if(o){o.guildId=null;o.world.emit('guild',{guild:null});o.world.notice(m.type==='guildLeave'?'ออกจากกิลด์แล้ว':'ถูกเชิญออกจากกิลด์ '+g.name);this.guildEvict(o);}
   if(!g.members.length){this.guilds.delete(g.id);this.guildsDirty.delete(g);this.onGuild?.(g,true);return true;}
   if(g.leader===gone.key){const next=g.members.find(x=>x.rank==='deputy')??g.members[0];g.leader=next.key;delete next.rank;}
   this.guildChanged(g);this.guildChat(g,gone.name+(m.type==='guildLeave'?' ออกจากกิลด์':' ถูกเชิญออกจากกิลด์'));return true;}
  if(m.type==='guildEmblem'){if(!g)return fail('guild-none');if(rank!=='leader')return fail('guild-leader');if(!validEmblem(m.emblem))return fail('bad-count');g.emblem=m.emblem;this.guildChanged(g);return true;}
  // Leader only: make someone deputy / member, or hand leadership over (the old leader becomes a deputy).
  if(m.type==='guildRank'){if(!g)return fail('guild-none');if(rank!=='leader')return fail('guild-leader');
   const t=g.members.find(x=>x.name===m.name&&x.key!==p.key);if(!t||!['deputy','member','leader'].includes(m.rank))return fail('guild-none');
   if(m.rank==='deputy'&&t.rank!=='deputy'&&g.members.filter(x=>x.rank==='deputy').length>=DEPUTY_MAX)return fail('guild-deputies');
   if(m.rank==='leader'){g.leader=t.key;delete t.rank;g.members.find(x=>x.key===p.key).rank='deputy';}else if(m.rank==='deputy')t.rank='deputy';else delete t.rank;
   this.guildChanged(g);this.guildChat(g,t.name+(m.rank==='leader'?' เป็นหัวหน้ากิลด์คนใหม่':m.rank==='deputy'?' เป็นรองหัวหน้ากิลด์':' เป็นสมาชิกกิลด์'));return true;}
  if(m.type==='guildNotice'){if(!g)return fail('guild-none');if(!staff)return fail('guild-rank');if(typeof m.text!=='string')return fail('bad-count');
   g.notice=cleanNotice(m.text);this.guildChanged(g);if(g.notice)this.guildChat(g,'📜 ประกาศใหม่: '+g.notice);return true;}
  // Donations: เบี้ย leave the bag for the treasury; 10 เบี้ย = 1 guild EXP and 1 contribution point.
  if(m.type==='guildDonate'){if(!g)return fail('guild-none');const n=m.coins;if(!Number.isSafeInteger(n)||n<DONATE_MIN||n>DONATE_MAX)return fail('bad-count');if(p.bag.coins<n)return fail('no-coins');
   const b=normalizeBag(p.bag);b.coins-=n;this.setBag(p,b);p.saveNow=true;g.treasury=(g.treasury??0)+n;
   this.guildGain(g,Math.floor(n/10),g.members.find(x=>x.key===p.key));this.guildChanged(g);this.guildChat(g,`${p.character.name} บริจาค ${n.toLocaleString('th-TH')} เบี้ยเข้าคลังกิลด์`);return true;}
  if(m.type==='guildUpgrade'){if(!g)return fail('guild-none');if(rank!=='leader')return fail('guild-leader');if(!Object.hasOwn(GUILD_UPGRADES,m.id))return fail('bad-count');const u=GUILD_UPGRADES[m.id];
   const tier=g.upgrades?.[m.id]??0;if(tier>=u.costs.length)return fail('guild-max');if(guildLevel(g.exp??0)<u.levels[tier])return fail('guild-level');if((g.treasury??0)<u.costs[tier])return fail('guild-treasury');
   g.treasury-=u.costs[tier];g.upgrades={...g.upgrades,[m.id]:tier+1};this.guildChanged(g);this.guildChat(g,`🏯 สร้าง${u.name} ขั้น ${tier+1} ที่ทุ่งชุมพลแล้ว · ${u.text}`);return true;}
  if(m.type==='guildRite'){if(!g)return fail('guild-none');if(!staff)return fail('guild-rank');if((g.rite??0)>this.now())return fail('guild-rite');
   if(guildLevel(g.exp??0)<GUILD_RITE.level)return fail('guild-level');if((g.treasury??0)<GUILD_RITE.cost)return fail('guild-treasury');
   g.treasury-=GUILD_RITE.cost;g.rite=this.now()+GUILD_RITE.minutes*6e4;this.guildChanged(g);this.guildChat(g,`🪷 ${p.character.name} ประกอบ${GUILD_RITE.name} · EXP +${GUILD_RITE.exp*100}% ทั้งกิลด์ ${GUILD_RITE.minutes} นาที`);return true;}
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
 emoteView(p){const emote=activeEmote(p.world.emote,p.world.time);return emote?{name:emote.name,time:this.clock-Math.max(0,p.world.time-emote.time)}:null;}
 snapshot(p){
  this.refreshStats(p);
  if(p.stall&&Math.hypot(p.world.player.x-p.stall.x,p.world.player.z-p.stall.z)>3){p.stall=null;p.world.notice('เดินออกจากแผง · ปิดแผงแล้ว');}
  const publicPlayer=a=>({id:a.id,character:a.character,equipment:a.equipment,player:a.world.player,emote:this.emoteView(a),partyId:a.partyId});
  const visible=[...p.room.peers].map(id=>this.peers.get(id)).filter(a=>a!==p&&(distance(a.world.player,p.world.player)<45||a.partyId&&a.partyId===p.partyId)),seen=new Set(visible.map(a=>a.id)),round=n=>Math.round(n*1000)/1000;
  // 0.99.11 during the snapshot broadcast each player's public entry is built and cloned once, then shared by every viewer
  const entry=a=>{if(!this.broadcasting||a.entryTick!==this.tickId){const v=a.world.player;a.entryTick=this.tickId;a.entry=copy({id:a.id,equipment:a.equipment,player:{x:round(v.x),z:round(v.z),hp:v.hp,maxHp:v.maxHp,moving:v.moving,running:v.running===true,face:{x:round(v.face.x),z:round(v.face.z)}},emote:this.emoteView(a),partyId:a.partyId,connected:!a.suspended,pet:a.pet?.id??null,stall:a.stall?.title??null,guild:this.guildTag(a),rebirth:a.rebirth??0});a.entryKeys=Object.fromEntries(PLAYER_STATIC.map(k=>[k,JSON.stringify(a.entry[k]??null)]));}return a.entry;};
  // a player already on this viewer's screen gets its position every time and its look (gear, party, pet, stall, guild)
  // only when that changed; the client merges entries into the remote player's state
  const sent=p.playerSent??=new Map();
  const players=visible.map(a=>{const e=entry(a);
   if(!p.known.has(a.id)){sent.set(a.id,{...a.entryKeys});return {...e,character:copy(a.character)};}
   // Posture is current state, including null cancellation, so every observer can recover without a transient event.
   const last=sent.get(a.id)??{},d={id:e.id,player:e.player,emote:e.emote,connected:e.connected};sent.set(a.id,last);
   for(const k of PLAYER_STATIC)if(last[k]!==a.entryKeys[k]){last[k]=a.entryKeys[k];d[k]=e[k];}
   return d;});
  p.known=seen;
  return {...copy({tick:this.tickId,time:this.clock,self:{...publicPlayer(p),training:p.training,cooldowns:p.world.cooldowns,kills:p.world.kills,baseXp:p.world.baseXp,jobXp:p.world.jobXp,targetId:p.world.targetId,auto:p.world.auto,war:this.warView(p),duel:p.duel?{foe:p.world.foe,left:Math.max(0,Math.ceil((p.duel.until-this.now())/1000))}:null,skillLevels:p.world.skillLevels,skillPoints:availablePoints(p.skills,this.progress(p)),story:p.story,merc:p.world.merc?Math.ceil(p.world.merc.left):0,bounty:normalizeBounty(p.bounty,this.now()),weekly:normalizeWeekly(p.weekly,this.now()),rebirth:p.rebirth??0,album:p.album,status:p.world.status,pet:p.pet,mvp:this.mvpInfo(p.serverId),stall:p.stall?.title??null,guild:this.guildTag(p),stats:p.stats,gear:p.gear,statPoints:statPoints(p.stats,this.who(p).level,p.rebirth??0),derived:p.derived,...(p.bagSent!==p.bagVersion?(p.bagSent=p.bagVersion,{bag:p.bag}):{})}}),players,mobs:copy(this.mobDelta(p))};
 }
 mobDelta(p){
  if(p.mobRoom!==p.room.id){p.mobRoom=p.room.id;p.mobSeen=new Map();}
  const out=[],me=p.world.player;
  for(const m of p.room.mobs){
   if(distance(m,me)>MOB_VIEW)continue;
   let last=p.mobSeen.get(m.id),d=null;if(!last)p.mobSeen.set(m.id,last={});
   for(const k in m){if(MOB_SKIP.has(k))continue;const v=mobValue(k,m[k]),key=v!==null&&typeof v==='object'?JSON.stringify(v):v;if(last[k]!==key){last[k]=key;(d??={id:m.id})[k]=v;}}
   if(d)out.push(d);
  }
  return out;
 }
 travelDestination(p,id,{warp=false}={}){
  const portal=p.room.map.portals?.find(v=>v.to===id&&distance(v,p.world.player)<2.6);
  const destination=this.catalog.maps.find(m=>m.id===id);
  // 0.46 ธูปกลับเมือง: from any map straight to the capital, spending one incense.
  // 0.99.11 the job-full card rides a maxed, not-yet-advanced player home for free (no incense)
  const jobRecall=!p.character.jobId&&!p.training&&advanceReady(p.world,p.character.classId,'').job.maxed;
  const recall=!portal&&id===this.catalog.capital&&p.room.map.id!==id&&((p.bag.items['return-incense']??0)>0||jobRecall);
  const townHop=!portal&&p.room.map.safe&&p.room.map.portals?.some(v=>v.to===id); // 0.53 town gates need no walk
  // 1.01 guild hall: members only, free, from anywhere outside a duel or the running guild war.
  const hall=destination?.guildHall===true;
  if(hall){if(!this.guildOf(p))throw new Error('guild-hall');if(p.duel||(this.wars.get(p.serverId)?.active&&p.room.map.id===WAR.map))throw new Error('guild-busy');warp=false;}
  const fare=warp?warpCost(this.catalog,p.room.map.id,id):null;if(warp&&fare===null)throw new Error('travel-invalid');
  if(warp&&p.bag.coins<fare)throw new Error('no-coins');
  if((!portal&&!recall&&!townHop&&!warp&&!hall)||!destination||p.world.player.hp<=0)throw new Error('travel-invalid');
  if((this.rooms.get(p.serverId+':'+id)?.peers.size??0)>=this.capacity)throw new Error('room-full');
  if(warp){const b=normalizeBag(p.bag);b.coins-=fare;this.setBag(p,b);}
  else if(recall&&!jobRecall){const b=normalizeBag(p.bag);b.items['return-incense']--;if(!b.items['return-incense'])delete b.items['return-incense'];this.setBag(p,b);}
  this.endTrade(p,'อีกฝ่ายเดินทางไปแล้ว');p.stall=null;p.world.clearEmote();p.world.player.running=false;
  return destination;
 }
 record(p,original){return {...copy(original),character:copy(p.character),equipment:normalizeEquipment(p.equipment,p.character.classId),training:copy(p.training),skills:copy(p.skills),story:copy(p.story),bag:copy(p.bag),storage:copy(p.storage),friends:copy(p.friends),daily:copy(p.daily),dungeonDay:p.dungeonDay,bounty:copy(p.bounty),weekly:copy(p.weekly),rebirth:p.rebirth??0,xpCurve:XP_CURVE,album:copy(p.album),trade:{xp:p.tradeXp??0},pet:copy(p.pet),stats:copy(p.stats),gear:copy(p.gear),state:{...copy(original.state),settings:copy(p.settings),mapId:p.room.map.id,position:{x:p.world.player.x,z:p.world.player.z},traveler:serializeTraveler(p.world)}};}
}
