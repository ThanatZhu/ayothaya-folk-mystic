import {fieldAdventurers,adventurerAt,adventurerViews,adventurerContract,ADVENTURER_TIME} from '../field-adventurers177.js';
import {ARENA_MAP,arenaReservation,arenaView,arenaCommand,cleanArenaRooms,leaveArena,finishArena} from './arena-rooms166.js';
import {checkWalk,startWalk,setWalkPace,cancelWalk,walkInput,walkView,walkSave} from './auto-walk.js';
import {normalizeAutoTarget} from '../auto-targets.js';
import {publicBossDirectory} from './boss-directory.js';
import {recordBossDamage,finishBossDamage} from '../boss-results.js';
import {warBoardKey,warRound,warContribution,warRankings,finishWarRound} from '../guild-war-rewards.js';
import {normalizeMailbox,inboxSummary} from '../mailbox.js';
import {normalizePetAccount,activePremiumPet,publicPetAccount} from '../pet-account.js';
import {castPremiumPet,petIncoming,petBlessing,PET_SKILL_ERRORS} from '../pet-combat.js';
import {normalizeRoleSkills,upgradeRoleSkill,ROLE_MARK} from '../role-skill-progress.js';
import {stepRoleMonsters} from '../role-combat.js';
import {MapBossClock} from './map-bosses.js';
import {normalizeAuto,pickPotion} from '../auto-play.js';
import {activeEmote,canonicalAction,EMOTE_ACTIONS} from '../character-action-state.js';
import {markMonsterHit,advanceMonster,MONSTER_BEHAVIOUR} from '../monster-catalog.js';
import {normalizeEquipment} from '../equipment.js';
import {randomUUID} from 'node:crypto';
import {CombatWorld,monsterHit,MONSTER_TYPES,moveBody,lineClear,walkable,rallyPack,LEADER,mobXp,mobRespawn,randomSpot} from '../combat-core.js';
import {awardExperience,baseProgress,levelGifts,migrateXp,XP_CURVE} from '../experience.js';
import {refineGear} from '../refine.js';
import {STORAGE_SLOTS,STORAGE_NPC,normalizeStorage,normalizeOffer,moveOffer,hasOffer,swapOffers,normalizeStall,buyFromStall} from '../market.js';
import {MARKET_ZONE,SHOP_DURATION,inMarket,tradePerks,taxOf,openShop,buyFromShop,sellToShop,collectShop,recordPrice,browseMarket,marketOptions,marketDay,priceKey,publicShop,shopIsOpen,closeInactiveShop,shopHasClaims,shopHasListings} from '../market-board.js';
import {REBIRTH_MAX,rebirthStatBonus,normalizeStats,normalizeGear,raiseStat,equipGear,unequipGear,dropInvalidGear,deriveStats,statPoints,insertCard,combatPower} from '../character-stats.js';
import {restoreTraveler,serializeTraveler,warpCost} from '../world-state.js';
import {character,isServer,isSlot,CHANNELS,normalizeChannel} from '../realm-state.js';
import {logJoin,logLeave,logChannel,logChat,logMvp,logTrade,logMarket,logGuild,logLevelUp} from './dashboard-log.js';
import {normalizeSkills,upgradeSkill,availablePoints,SLOTS} from '../skill-progress.js';
import {normalizeStory,storyEvent,rewardItems} from '../story-quests.js';
import {gearLook,GRADES} from '../gear-sets.js';
import {FRIEND_MAX,GUILD_COST,SOCIAL_ERRORS,cleanName,validGuildName,validEmblem,normalizeFriends,GUILD_HALL,DEPUTY_MAX,DONATE_MIN,DONATE_MAX,GUILD_LEVELS,guildLevel,GUILD_UPGRADES,GUILD_RITE,GUILD_GOAL,guildSeats,cleanNotice,GUILD_SEARCH_LIMIT,GUILD_APPLICATION_MAX,GUILD_APPLICATION_LIMIT,GUILD_APPLICATION_TTL} from '../social.js';
import {claimDaily,thaiDay} from '../daily.js';
import {normalizeAlbumState,depositAlbumCard,ALBUM_ERRORS} from '../card-album.js';
import {normalizeBounty,bountyDefeat,bountyClaim,normalizeWeekly,weeklyDefeat,weeklyClaim} from '../bounty.js';
import {activeEvent,expRate,surge,surgeOn} from '../events.js';
// 0.49: the timed MVP returns an hour after it falls (first one 5 min after boot); dungeon clear pays once per Thai day.
export const MERC_COST=200,MERC_TIME=1200;
export const MVP_INTERVAL=3600e3,MVP_FIRST=300e3,DUNGEON_REWARD={coins:800,items:[{id:'lek-lai',count:1},{id:'green-herb',count:3},{id:'hp-large',count:3}]};
import {consumeRevival} from '../revival-item.js';
import {normalizeBag,expandBag,addLoot,rollLoot,buy,sell,discard,useItem,foodBuff,SHOPS,ITEM_ERRORS,itemDef,RARITY_NAME} from '../items.js';
import {craft} from '../crafting.js';
import {WAR,warWindow,warLabel} from '../guild-war.js';
import {ARENA,arenaWeek,arenaDay,arenaEnds,byPoints} from '../arena.js';
import {TRIAL} from '../city-life-data.js';
import {advanceReady} from '../advancement.js';
import {WEATHERS} from '../weather.js';
const SERVER_IDS=['server-1','server-2'],SERVER_NAME={'server-1':'เซิร์ฟ 1','server-2':'เซิร์ฟ 2'};
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const integer=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
const copy=v=>structuredClone(v);
// 0.99.11 bandwidth: each player gets only the monsters within MOB_VIEW m, and of those only the fields that changed since
// that player last got them (the client merges monsters with Object.assign). Server-only timers stay home; positions are
// rounded to 1 cm, other numbers to 0.1, and the respawn countdown to whole seconds.
const PLAYER_STATIC=['character','equipment','partyId','pet','stall','guild','rebirth'],MOB_VIEW=50,MOB_SKIP=new Set(['home','attackCD','leapCD','flee','justEnraged','pressure','slamCD']);
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
const WALK_FREE_MS=5;
// 0.119 observer: an invisible, untargetable spectator for allowed e-mails (guild-war streams). It may only move and look around.
const OBSERVER_OK=new Set(['input','walkTo','walkPace','walkCancel','switchChannel','ping','bossDirectory','arenaRooms','leaderboard','guildInfo','friendList','storyCheck','inspect','returnToSpawn','respawn','observer']);
const allowed=new Set(['observer','arenaRooms','walkTo','walkPace','walkCancel','bossDirectory','switchChannel','storyCheck','craft','duel','duelQuit','input','skill','attack','select','auto','autoConfig','emote','chat','invite','answer','leaveParty','kick','leader','ping','upgradeSkill','questTalk','useItem','buy','sell','bagExpand','discard','statUp','equip','unequip','refine','insertCard','storageOpen','store','retrieve','tradeRequest','tradeAnswer','tradeOffer','tradeLock','inspect','tradeConfirm','tradeCancel','tradeList','stallOpen','stallClose','stallList','stallBuy','leaderboard','shopOpen','shopClose','shopCollect','shopBuy','shopSell','shopMine','shopList','marketSearch','friendList','friendAdd','friendAnswer','friendRemove','guildInfo','guildSearch','guildApply','guildApplicationAnswer','guildCreate','guildInvite','guildAnswer','guildLeave','guildKick','guildEmblem','guildDonate','guildRank','guildNotice','guildUpgrade','guildRite','bubble','petSkill','bountyClaim','albumDeposit','weeklyClaim','rebirth','hire','selectAlly','returnToSpawn','respawn']);
// 0.90 AUTO drinks the best potion when HP / MP falls under the player's threshold (same 0.8 s gap as a manual use).
function autoPotionFor(realm,p){
 const w=p.world;if(!w.auto||w.player.hp<=0||realm.now()-(p.itemAt??0)<800)return;
 const id=pickPotion(p.bag,w.player,w.autoConfig);if(!id)return;
 try{const r=useItem(p.bag,id,w.player,w.status);p.itemAt=realm.now();w.player.hp=r.hp;w.player.mp=r.mp;w.status=r.status;realm.setBag(p,r.bag);w.emit('used',{item:id});}catch{}
}
export class RealmServer{
 petCast(p,automatic=false){
  const pet=activePremiumPet(p.petCollection),w=p.world;if(!pet)throw Error('pet-not-equipped');if(p.petCollection.readyAt>this.now())throw Error('pet-cooldown');
  if(automatic){const k=pet.skill.kind;if(['lotusCleanse','riceHeal'].includes(k)&&w.player.hp>w.player.maxHp*.75&&!w.status.poison)return false;if(k==='waterMana'&&w.player.mp>w.player.maxMp*.65)return false;if(!w.target&&['moonBarrier','roarGuard','jadeShell'].includes(k))return false;}
  castPremiumPet(w,pet,{lineClear,types:MONSTER_TYPES});p.petCollection.readyAt=this.now()+pet.skill.cooldown*1000;p.saveNow=true;return true;
 }
 autoPotion(p){autoPotionFor(this,p);}
 constructor({catalog,capacity=50,now=()=>Date.now(),warAlways=false,runEnabled=false,roleSkills=false,spiritCompanions=false}={}){this.roleSkills=roleSkills===true;this.spiritCompanions=spiritCompanions===true;this.wars=new Map();this.warAlways=warAlways;this.runEnabled=runEnabled===true;this.arenaPairs=new Map();this.onAnnounce=null;this.catalog=catalog;this.capacity=capacity;this.now=now;this.peers=new Map();this.rooms=new Map();this.parties=new Map();this.invites=new Map();this.guilds=new Map();this.guildsDirty=new Set();this.onGuild=null;this.leaders=new Map();this.onLeaders=null;this.leadersDirty=new Set();this.shops=new Map();this.onShop=null;this.prices=new Map();this.onPrices=null;this.pricesDirty=new Set();this.mvps=new Map();this.born=now();this.clock=0;this.tickId=0;this.logs=[];this.mapBosses=new MapBossClock({now});}
 channelCounts(mapId){return CHANNELS.map(c=>{let n=0;for(const p of this.peers.values())if((!p.suspended||(p.resumeUntil&&p.resumeUntil>this.now()))&&(p.channel??1)===c.id&&(!mapId||p.room?.map?.id===mapId)&&!p.observer)n++;return {channel:c.id,name:c.name,subtitle:c.subtitle,players:n};});}
 join({uid,serverId,slotId,channel,record,send,canObserve=false}){
  if(!uid||!isServer(serverId)||!isSlot(slotId))throw new Error('invalid-identity');
  let existing=[...this.peers.values()].find(p=>p.uid===uid);
  // A suspended copy of another character, or one past its resume window, is dropped so the new login can enter.
  if(existing?.suspended&&(existing.resumeUntil<this.now()||existing.serverId!==serverId||existing.slotId!==slotId)){this.leave(existing.id);existing=null;}
  if(existing){
   if(!existing.suspended||existing.resumeUntil<this.now()||existing.serverId!==serverId||existing.slotId!==slotId)throw new Error('already-online');
   existing.suspended=false;existing.resumeUntil=0;existing.send=send;existing.seq=0;existing.inputSeq=0;existing.appliedInputSeq=0;existing.known=new Set();existing.input={x:0,z:0,attack:false};existing.inputAt=this.now();
   send({type:'welcome',id:existing.id,room:existing.room.id,channel:existing.channel??1,capacity:this.capacity,history:copy(existing.room.history),snapshot:(existing.bagSent=0,existing.mobRoom=null,existing.sentSig=null,this.snapshot(existing))});this.social(existing.room);return existing;
  }
  const hero=character(record.character),capital=this.catalog.maps.find(m=>m.id===this.catalog.capital);
  let map=this.catalog.maps.find(m=>m.id===record.state.mapId)??capital;
  const arena=map.id===ARENA_MAP?arenaReservation(this,uid+':'+slotId):null;
  const arenaEvicted=map.id===ARENA_MAP&&!arena;if(arenaEvicted)map=capital;
  // 1.01 each guild has its own hall room; someone no longer in a guild (kicked while offline) wakes up in the capital.
  const hallGuild=map.guildHall?[...this.guilds.values()].find(g=>g.serverId===serverId&&g.members.some(x=>x.key===uid+':'+slotId)):null,evicted=map.guildHall&&!hallGuild;
  if(evicted)map=capital;
  // A party that travelled keeps its seat for a minute (0.49), so it can walk into the same dungeon instance together.
  const party=[...this.parties.values()].find(v=>v.pending?.has(uid));
  const hasChannel=channel!==undefined&&channel!==null;let ch=hasChannel?normalizeChannel(channel):(serverId==='server-2'?2:1);const makeRoomId=c=>arena?`${serverId}:ch${arena.channel}:${map.id}:${arena.id}`:hasChannel?`${serverId}:ch${c}:${map.id}${map.instance?':'+(party?.id??'solo-'+uid):''}${hallGuild?':'+hallGuild.id:''}`:serverId+':'+map.id+(map.instance?':'+(party?.id??'solo-'+uid):'')+(hallGuild?':'+hallGuild.id:'');let roomId=makeRoomId(ch);if(arena)ch=arena.channel;
  let room=this.rooms.get(roomId);if(room&&room.peers.size>=this.capacity&&hasChannel&&!map.instance&&!hallGuild){const alt=CHANNELS.find(c=>(this.rooms.get(makeRoomId(c.id))?.peers.size??0)<this.capacity);if(alt){ch=alt.id;roomId=makeRoomId(ch);room=this.rooms.get(roomId);}}if(room&&room.peers.size>=this.capacity)throw new Error('room-full');
  if(!room){const simulation=new CombatWorld({...map});room={id:roomId,map,serverId,channel:typeof hasChannel==='boolean'&&hasChannel?ch:null,peers:new Set(),mobs:simulation.mobs,events:[],history:[],contributors:new Map()};this.rooms.set(roomId,room);this.wakeMvp(room);}
  const world=new CombatWorld({...map,classId:hero.classId,jobId:hero.jobId,roleSkills:this.roleSkills});if(this.spiritCompanions)world.spiritCompanion=true;restoreTraveler(world,record.state.traveler);if(record.xpCurve!==XP_CURVE)world.baseXp=migrateXp(world.baseXp);world.mobs=room.mobs;
  const skills=this.roleSkills?normalizeRoleSkills(record.skills,hero.classId):normalizeSkills(record.skills,hero.classId);world.skillLevels=[...skills[hero.classId]];if(this.roleSkills&&record.skills?.[ROLE_MARK]&&record.roleCooldowns?.version===1){const saved=record.roleCooldowns,elapsed=Math.max(0,(this.now()-saved.at)/1000);if(Array.isArray(saved.values)&&saved.values.length===SLOTS)world.cooldowns=saved.values.map(n=>Math.max(0,Math.min(120,Number.isFinite(n)?n:0)-elapsed));if(saved.down>0){world.player.hp=0;world.player.down=Math.max(0,saved.down-elapsed);}}
  const position=record.state.position;if(position&&!evicted&&!arenaEvicted&&!world.roleRespawn&&walkable(position.x,position.z,.32,map.nav))Object.assign(world.player,position);
  const peer={canObserve:canObserve===true,observer:false,roleSkillBackup:record.roleSkillBackup??(this.roleSkills&&!record.skills?.[ROLE_MARK]?copy(record.skills??{}):null),id:randomUUID(),uid,serverId,slotId,channel:ch,character:hero,training:copy(record.training??null),skills,settings:copy(record.state.settings??{}),story:normalizeStory(record.story),world,room,send,seq:0,known:new Set(),input:{x:0,z:0,attack:false},inputAt:this.now(),partyId:null,bucket:40,chatAt:-Infinity,inviteAt:-Infinity,actionAt:-Infinity,emote:null};
  peer.equipment=normalizeEquipment(record.equipment,hero.classId);
  peer.bag=normalizeBag(record.bag);peer.bagVersion=1;peer.bagSent=0;peer.itemAt=-Infinity;
  peer.key=uid+':'+slotId;peer.tradeXp=Number.isSafeInteger(record.trade?.xp)&&record.trade.xp>0?record.trade.xp:0;if(map.id===MARKET_ZONE.mapId)peer.world.emit('shops',{list:this.shopList(serverId)});
  peer.friends=normalizeFriends(record.friends);peer.guildId=[...this.guilds.values()].find(g=>g.serverId===serverId&&g.members.some(x=>x.key===peer.key))?.id??null;if(peer.guildId)world.emit('guild',{guild:this.guildView(this.guilds.get(peer.guildId),peer.key)}); // 1.01 hall props + NPC know the guild at once
  peer.daily=record.daily??null;peer.weekly=record.weekly??null;peer.rebirth=Math.min(REBIRTH_MAX,Math.max(0,record.rebirth|0));peer.bubbleAt=-Infinity;peer.dungeonDay=record.dungeonDay??null;peer.pet=null;peer.mailbox=normalizeMailbox(record.mailbox);peer.petCollection=normalizePetAccount(record.petCollection);peer.bounty=record.bounty??null;Object.assign(peer,normalizeAlbumState(record));
  if(party){party.pending.delete(uid);party.members.add(peer.id);peer.partyId=party.id;if(party.leaderPending===uid||!party.members.has(party.leader)){party.leader=peer.id;if(party.leaderPending===uid)party.leaderPending=null;}}
  peer.storage=normalizeStorage(record.storage);peer.trade=null;peer.stall=null;peer.saveNow=false;
  peer.stats=normalizeStats(record.stats);peer.gear=normalizeGear(record.gear);peer.statSig='';peer.gearAt=-Infinity;this.refreshStats(peer);if(world.roleRespawn){world.player.hp=world.player.maxHp;world.player.mp=world.player.maxMp;}
  world.hurt=(mob,damage,color)=>this.hurt(peer,mob,damage,color);world.roleOwnerId=peer.id;world.roleResolveOwner=id=>this.peers.get(id)?.room===peer.room?this.peers.get(id).world:null;world.roleEnemy=m=>{const id=String(m.id).split(':').at(-1),other=this.peers.get(id);return other?.room===peer.room&&world.foes().some(e=>e.id===m.id)?other.world:null;};world.roleAllies=()=>[...peer.room.peers].map(id=>this.peers.get(id)).filter(a=>a&&!a.suspended&&(a===peer||!a.observer)&&(a===peer||peer.partyId&&a.partyId===peer.partyId)&&(!peer.duel&&!a.duel||a===peer)&&(!world.rivals.some(r=>r.id==='war:'+a.id))).map(a=>({id:a.id,world:a.world,player:a.world.player}));
  if(arena){const seat=arena.members.findIndex(m=>m.key===peer.key);Object.assign(world.player,{x:seat?5:-5,z:0});arena.members[seat].until=this.now()+120000;}
  peer.identityReceipts=copy(record.identityReceipts??[]);
  this.peers.set(peer.id,peer);if(record.walkRoute?.mapId===map.id){try{startWalk(peer,record.walkRoute,this.runEnabled);}catch{}} room.peers.add(peer.id);
  if(this.roleSkills&&!record.skills?.[ROLE_MARK]&&hero.classId!=='novice')world.notice('อัปเดตสกิลประจำอาชีพแล้ว · คืนแต้มสกิลเดิมให้จัดใหม่ที่เมนูสกิล');
  this.storyProgress(peer,{type:'enter',mapId:map.id});this.storyCheck(peer);this.arenaClaim(peer);
  // 0.48 daily login: first join of the Thai day grants the next reward of the 7-day cycle.
  const daily=claimDaily(peer.daily,this.now());if(daily){peer.daily=daily.daily;this.grantLoot(peer,daily.reward);peer.saveNow=true;world.emit('daily',{streak:daily.streak,reward:daily.reward});}
  logJoin(this.logs,this.now(),hero.name,ch,map.id);
  send({type:'welcome',id:peer.id,room:roomId,channel:ch,capacity:this.capacity,history:copy(room.history),snapshot:this.snapshot(peer)});this.social(room);return peer;
 }
 leave(id,{travel=false}={}){
  const p=this.peers.get(id);if(!p)return;
  leaveArena(this,p);this.endTrade(p,'อีกฝ่ายออกไปแล้ว');p.stall=null;if(!travel)logLeave(this.logs,this.now(),p.character.name,p.channel??1,p.room?.map?.id);
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
  // an observer's other commands are dropped without a chat line, so a stream shows nothing of the mode
  if(p.observer&&!OBSERVER_OK.has(m.type))return false;
  if(m.type==='observer'){if(!p.canObserve)return this.error(p,'observer-not-allowed');this.setObserver(p,m.on===true);return true;}
  if(m.seq<=p.seq)return m.type==='input'?false:this.error(p,'stale-command');p.seq=m.seq;
  if(p.bucket<1)return this.error(p,'rate-limit');p.bucket--;
  const w=p.world,now=this.now();
  if(m.type==='arenaRooms'){try{p.send({type:'arenaChanged',id:m.id,...arenaCommand(this,p,m)});return true;}catch(e){p.send({type:'arenaError',id:m.id,code:e.message});return false;}}
  if(m.type==='bossDirectory'){if(now-(p.bossDirectoryAt??-Infinity)<1000)return true;p.bossDirectoryAt=now;p.send({type:'events',events:[publicBossDirectory(this,p,MONSTER_TYPES)]});return true;}
  if(m.type==='ping'){p.send({type:'pong',stamp:typeof m.stamp==='number'?m.stamp:0});return true;}
  if(m.type==='petSkill'){try{this.petCast(p);return true;}catch(e){return this.itemFail(p,e.message);}}
  if(m.type==='storyCheck'){this.storyCheck(p);return true;}
  if(m.type==='switchChannel'){
   if(p.room.map.id===ARENA_MAP||p.room.map.instance||p.room.map.guildHall||p.duel)return false;
   const nextCh=normalizeChannel(m.channel);if(nextCh===(p.channel??1)&&p.room.channel===nextCh)return true;
   const nextId=`${p.serverId}:ch${nextCh}:${p.room.map.id}`;
   let nextRoom=this.rooms.get(nextId);if(nextRoom&&nextRoom.peers.size>=this.capacity)return this.error(p,'room-full');
   if(!nextRoom){const sim=new CombatWorld({...p.room.map});nextRoom={id:nextId,map:p.room.map,serverId:p.serverId,channel:nextCh,peers:new Set(),mobs:sim.mobs,events:[],history:[],contributors:new Map()};this.rooms.set(nextId,nextRoom);this.wakeMvp(nextRoom);}
   this.endTrade(p,'ย้ายแนล');p.stall=null;
   const oldRoom=p.room;oldRoom.peers.delete(p.id);oldRoom.contributors.forEach(s=>s.delete(p.id));
   if(!oldRoom.peers.size)this.rooms.delete(oldRoom.id);else this.social(oldRoom);
   const prevCh=p.channel??1;p.channel=nextCh;p.room=nextRoom;p.world.mobs=nextRoom.mobs;p.world.targetId=null;p.known=new Set();p.playerSent=new Map();p.mobRoom=null;p.sentSig=null;nextRoom.peers.add(p.id);
   logChannel(this.logs,now,p.character.name,prevCh,nextCh,p.room.map.id);
   p.send({type:'channelSwitched',room:nextId,channel:nextCh,history:copy(nextRoom.history),snapshot:this.snapshot(p)});this.social(nextRoom);return true;
  }
  if(m.type==='refine'){
   const attempt=typeof m.attempt==='string'&&m.attempt.length<=80?m.attempt:null;
   const reject=code=>{w.emit('refineRejected',{attempt,slot:m.slot,code});return this.itemFail(p,code);};
   const npc=typeof m.npc==='string'?p.room.map.npcs?.find(n=>n.name===m.npc):null;
   if(!npc||!SHOPS[npc.name]?.refine||SHOPS[npc.name].mapId!==p.room.map.id||distance(npc,w.player)>3.6)return reject('refine-far');
   if(now-p.gearAt<600)return reject('gear-rate');p.gearAt=now;
   let r;try{r=refineGear(p.bag,p.gear,m.slot,{lekLai:m.lekLai===true,guard:m.guard===true});}catch(e){return reject(e.message);}
   const item=p.gear[m.slot],before=itemDef(item)?.name;p.gear=r.gear;this.setBag(p,r.bag);this.refreshStats(p);
   const shout=refineAnnouncement(p.character.name,r,before,itemDef(r.gear[m.slot])?.name);if(shout)this.worldSay(p.serverId,{actor:null,name:'ประกาศ',text:shout});
   w.emit('refined',{attempt,item,upgradedItem:r.gear[m.slot],slot:m.slot,result:r.result,level:r.level,chance:r.chance});this.storyCheck(p);return true;
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
   let r;try{r=craft(p.bag,m.item,m.times,Math.random,p.character);}catch(e){return this.itemFail(p,e.message);}
   this.setBag(p,r.bag);w.emit('crafted',{item:m.item,count:r.made});this.storyProgress(p,{type:'do',action:'craft'});if(r.items.some(i=>{const it=itemDef(i.id);return it?.slot==='weapon'&&it.grade===0&&!it.rainbow&&it.classes?.includes(p.character.classId);}))this.storyProgress(p,{type:'do',action:'craftWeapon'});
   // 0.117 a rainbow boss-set piece is announced to the channel
   if(itemDef(m.item)?.rainbow)this.announce(p.serverId,`🌈 ${p.character.name} คราฟ ${itemDef(m.item).name} สำเร็จ`);return true;
  }
  if(m.type==='duel'){if(p.room.map.id===ARENA_MAP)return this.error(p,'arena-not-ready');
   const t=this.peers.get(m.target);if(!t||t===p||t.suspended||t.room!==p.room||p.room.map.safe)return this.error(p,'duel-invalid');
   if(p.duel||t.duel)return this.error(p,'duel-busy');if(distance(t.world.player,w.player)>DUEL.range||t.world.player.hp<=0||w.player.hp<=0)return this.error(p,'duel-far');
   if(t.duelAsk?.to===p.id&&t.duelAsk.until>now){this.startDuel(t,p);return true;}
   if(now-p.inviteAt<2000)return this.error(p,'invite-rate');p.inviteAt=now;
   p.duelAsk={to:t.id,until:now+DUEL.ask};t.send({type:'duelAsk',from:p.id,name:p.character.name,expires:now+DUEL.ask});w.notice('ส่งคำท้าดวลถึง '+t.character.name+' แล้ว');return true;
  }
  if(m.type==='duelQuit'){if(p.duel)this.endDuel(this.peers.get(p.duel.foe),p,'ยอมแพ้');return true;}
  // 0.108.1 tap a player -> see what they wear: only someone on the same map, at most a few times a second
  if(m.type==='inspect'){const o=this.peers.get(m.target);if(!o||o.room!==p.room||o.suspended)return this.error(p,'inspect-gone');
   if(now-(p.inspectAt??-Infinity)<300)return true;p.inspectAt=now;const level=this.who(o).level;
   w.emit('inspect',{id:o.id,name:o.character.name,classId:o.character.classId,jobId:o.character.jobId??null,gender:o.character.gender,level,
    reborn:o.rebirth??0,guild:this.guildTag(o),gear:normalizeGear(o.gear),power:combatPower(o.derived,level)});return true;}
  if(m.type.startsWith('trade'))return this.tradeCommand(p,m);
  if(m.type.startsWith('stall'))return this.stallCommand(p,m);
  if(m.type.startsWith('shop')||m.type==='marketSearch')return this.marketCommand(p,m);
  if(m.type.startsWith('friend')||m.type.startsWith('guild'))return this.socialCommand(p,m);
  if(m.type==='hire'){
   if(p.trade)return this.itemFail(p,'trade-busy');
   if(w.player.hp<=0||p.duel||p.room.map.pvpArena||p.room.map.id===ARENA_MAP||p.room.map.guildHall)return this.itemFail(p,'hire-unavailable');
   if(m.adventurer!==undefined){
    const def=fieldAdventurers(p.room.map).find(n=>n.id===m.adventurer);if(!def)return this.itemFail(p,'hire-unavailable');
    const npc=adventurerAt(def,now/1000);if(distance(npc,w.player)>3.6||!lineClear(w.player.x,w.player.z,npc.x,npc.z,w.nav))return this.itemFail(p,'hire-far');
    if(w.merc)return this.itemFail(p,'hire-active');if(p.bag.coins<def.cost)return this.itemFail(p,'no-coins');
    const b=normalizeBag(p.bag);b.coins-=def.cost;this.setBag(p,b);w.hire(ADVENTURER_TIME,adventurerContract(def));w.emit('hired',{id:def.id});w.notice('จ้างนักผจญภัยแล้ว · 20 นาที · ช่วยเฉพาะแผนที่นี้');return true;
   }
   const npc=p.room.map.npcs?.find(n=>n.name==='ครูแสนดาบ');if(!npc||distance(npc,w.player)>3.6)return this.itemFail(p,'hire-far');
   if(w.merc)return this.itemFail(p,'hire-active');if(p.bag.coins<MERC_COST)return this.itemFail(p,'no-coins');
   const b=normalizeBag(p.bag);b.coins-=MERC_COST;this.setBag(p,b);w.hire(MERC_TIME);w.notice('จ้างทหารรับจ้างแล้ว · 20 นาที');return true;
  }
  if(m.type==='albumDeposit'){
   if(p.trade)return this.itemFail(p,'trade-busy');
   if(p.mailMutationBusy)return this.error(p,'server-busy');
   let r;try{r=depositAlbumCard(p,p.bag,m.card);}catch(e){return this.itemFail(p,e.message);}
   Object.assign(p,r.state);this.setBag(p,r.bag);p.saveNow=true;
   w.notice('ฝากการ์ดแล้ว · '+itemDef(m.card).name);
   for(const milestone of r.milestones)w.emit('album',{count:milestone.count});
   if(r.reward.coins||r.reward.items.length)w.emit('loot',r.reward);
   return true;
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
   p.saveNow=true;w.notice('เกิดใหม่ครั้งที่ '+p.rebirth+' · กลับสู่ Lv.1 พร้อมแต้มสเตตัสโบนัส +'+p.rebirth*40+' · ทุกค่าสถานะถาวร +'+rebirthStatBonus(p.rebirth));
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
   p.gear=r.gear;this.setBag(p,r.bag);this.refreshStats(p);w.emit('carded',{slot:m.slot,card:m.card});this.storyCheck(p);return true;
  }
  if(m.type==='statUp'||m.type==='equip'||m.type==='unequip'){
   const rateKey=m.type==='statUp'?'statAt':'gearAt',gap=m.type==='statUp'?100:200;
   if(now-(p[rateKey]??-Infinity)<gap)return this.itemFail(p,'gear-rate');p[rateKey]=now;
   const who=this.who(p);
   try{
    if(m.type==='statUp')p.stats=raiseStat(p.stats,m.stat,who.level,who.reborn);
    else{const r=m.type==='equip'?equipGear(p.bag,p.gear,m.item,who):unequipGear(p.bag,p.gear,m.slot);p.gear=r.gear;this.setBag(p,r.bag);if(m.type==='equip')w.notice('สวมใส่ '+itemDef(m.item).name);}
   }catch(e){return this.itemFail(p,e.message);}
   this.refreshStats(p);this.storyCheck(p);return true;
  }
  if(m.type==='useItem'){
   if(now-p.itemAt<800)return this.itemFail(p,'item-rate');
   // 0.109.4 wind wing (like RO's Fly Wing): a random walkable spot on this map, not in instances, the guild hall,
   // the war map while the war is on, or a duel; the client snaps to the jump on the next snapshot
   if(itemDef(m.item)?.kind==='wing'){
    const map=p.room.map;if((p.bag.items?.[m.item]??0)<1)return this.itemFail(p,'no-item');
    if(w.player.hp<=0)return this.itemFail(p,'defeated');if(w.status?.stun||w.status?.sleep)return this.itemFail(p,'held');
    if(map.instance||map.guildHall||p.duel||(this.wars.get(p.serverId)?.active&&map.id===WAR.map))return this.itemFail(p,'wing-blocked');
    const spot=randomSpot(w.nav);if(!spot)return this.itemFail(p,'not-usable');
    const b=normalizeBag(p.bag);b.items[m.item]--;if(!b.items[m.item])delete b.items[m.item];p.itemAt=now;this.setBag(p,b);
    Object.assign(w.player,spot,{moving:false});w.path=[];w.notice('ปีกเหินลมพาวาร์ปไปจุดใหม่');w.emit('used',{item:m.item});return true;
   }
   let r;try{r=useItem(p.bag,m.item,w.player,w.status);}catch(e){return this.itemFail(p,e.message);}
   p.itemAt=now;w.player.hp=r.hp;w.player.mp=r.mp;w.status=r.status;this.setBag(p,r.bag);if(r.food){w.food=r.food;w.notice('อิ่มอร่อย · '+itemDef(m.item).text);}w.emit('used',{item:m.item});return true;
  }
  if(m.type==='discard'){
   // Items offered in a locked trade stay put; equipped gear lives in p.gear, not the bag, so it cannot be thrown away.
   if(p.trade?.locked)return this.itemFail(p,'trade-locked');
   try{this.setBag(p,discard(p.bag,m.item,m.count));}catch(e){return this.itemFail(p,e.message);}
   w.notice('ทิ้ง '+(itemDef(m.item)?.name??m.item)+' ×'+m.count+' แล้ว');return true;
  }
  // 0.109.6 bag expansion is a service at a shop that offers it (Mae Bua), standing next to her like buying
  if(m.type==='bagExpand'){
   const npc=typeof m.npc==='string'?p.room.map.npcs?.find(n=>n.name===m.npc):null,shop=npc&&SHOPS[npc.name];
   if(!shop?.expand||shop.mapId!==p.room.map.id||distance(npc,w.player)>3.6)return this.itemFail(p,'shop-too-far');
   try{this.setBag(p,expandBag(p.bag));}catch(e){return this.itemFail(p,e.message);}
   w.notice('ขยายกระเป๋าแล้ว · '+p.bag.slots+' ช่อง');this.storyProgress(p,{type:'do',action:'shop'});return true;
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
   if(m.expected&&(m.expected.quest!==p.story.quest||m.expected.step!==p.story.step))return false;
   // Story talk only counts next to that NPC in this room; the shared rules decide whether it advances anything.
   const npc=typeof m.npc==='string'?p.room.map.npcs?.find(n=>n.name===m.npc):null;
   if(!npc||distance(npc,w.player)>3.6)return this.error(p,'quest-too-far');
   return this.storyProgress(p,{type:'talk',npc:npc.name,mapId:p.room.map.id});
  }
  if(m.type==='upgradeSkill'){
   try{p.skills=w.roleCombat&&!w.roleCombat.legacy?upgradeRoleSkill(p.skills,p.character.classId,m.index,this.progress(p)):upgradeSkill(p.skills,p.character.classId,m.index,this.progress(p));}catch(e){return this.error(p,e.message);}
   w.skillLevels=[...p.skills[p.character.classId]];this.storyCheck(p);return true;
  }
  // 0.114.2 route planning is the costliest command: after an expensive plan, further taps wait (newest wins) for ten
  // times what it cost, so one client can't spend more than ~10% of the server on paths. Cheap plans never wait.
  if(m.type==='walkTo'){try{checkWalk(p,m);}catch(e){p.send({type:'walkError',id:m.id,code:e.message});return false;}
   if(this.now()<(p.walkAt??0)){p.walkQueued=m;return true;}return this.walkNow(p,m);}
  if(m.type==='walkPace'){try{return setWalkPace(p,m,this.runEnabled);}catch(e){p.send({type:'walkError',id:m.id,code:e.message});return false;}}
  if(m.type==='walkCancel'){if(m.id===p.walkQueued?.id)p.walkQueued=null;if(m.id===p.walkRoute?.id)cancelWalk(p);return true;}
  if(m.type==='input'){
   if(!Number.isFinite(m.x)||!Number.isFinite(m.z)||Math.abs(m.x)>1||Math.abs(m.z)>1||typeof m.attack!=='boolean'||(m.run!==undefined&&typeof m.run!=='boolean'))return this.error(p,'invalid-input');
   // The host owns the sprint gate; bare realms stay closed by default.
   // Client capability flags and hand-written input packets cannot unlock it.
   const distance=Math.hypot(m.x,m.z),n=Math.max(1,distance);if(distance>.08)cancelWalk(p);p.input={x:m.x/n,z:m.z/n,attack:m.attack&&!p.observer,run:this.runEnabled&&m.run===true&&distance>.08};p.inputAt=now;p.inputSeq=m.seq;if(distance>.08||m.attack)w.clearEmote();return true;
  }
  if(m.type==='returnToSpawn'){if(w.player.hp<=0){let bag;try{bag=consumeRevival(p.bag,w.player);}catch{w.notice('ต้องมียันต์คืนขวัญ 1 ชิ้น');return false;}cancelWalk(p);p.input={x:0,z:0,attack:false,run:false};this.setBag(p,bag);w.respawn(false);p.saveNow=true;}return true;}
  if(m.type==='respawn'){
   if(typeof m.id!=='string'||m.id.length>50)return false;
   if(m.destination!=='here'||w.player.hp>0){p.send({type:'respawnError',id:m.id,code:'respawn-invalid'});return false;}
   let bag;try{bag=consumeRevival(p.bag,w.player);}catch(e){p.send({type:'respawnError',id:m.id,code:e.message});return false;}
   cancelWalk(p);p.input={x:0,z:0,attack:false,run:false};this.setBag(p,bag);w.respawn(true);p.saveNow=true;
   p.send({type:'snapshot',...this.snapshot(p)});p.send({type:'respawned',id:m.id});return true;
  }
  if(m.type==='selectAlly'){const ally=w.roleAllies?.().find(a=>a.id===m.target);if(!ally)return this.error(p,'invalid-target');w.supportTargetId=ally.id;return true;}
  if(m.type==='autoConfig'){w.autoConfig=normalizeAuto(m);return true;} // 0.90 skills + potion thresholds for AUTO
  if(['skill','attack','select','auto','emote'].includes(m.type)){
   if(m.type!=='auto'){if(now-p.actionAt<70)return this.error(p,'action-rate');p.actionAt=now;} // 0.97 the AUTO switch is a state, never dropped behind a swing
   if(m.type==='select'){if(!integer(m.target,0,9999))return this.error(p,'invalid-target');w.select(m.target);return true;}
   if(m.type==='skill'){if(!integer(m.index,0,SLOTS-1))return this.error(p,'invalid-skill');if(w.roleCombat&&m.roleSchema!==1)return this.error(p,'client-update-required');if(w.roleCombat){w.roleGround=Number.isFinite(m.point?.x)&&Number.isFinite(m.point?.z)?{x:m.point.x,z:m.point.z,hp:1}:null;}return w.skill(m.index);}
   if(m.type==='attack')return w.basicAttack();
   if(m.type==='auto'){const target=normalizeAutoTarget(m.target);if(m.target!=null&&!target)return this.error(p,'invalid-auto-target');if(typeof m.on==='boolean')w.setAuto(m.on,m.hunt,target);else w.toggleAuto();this.storyCheck(p);return true;}
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
   if(m.channel==='whisper'){const o=this.byName(p,cleanName(m.to));if(!o)return this.itemFail(p,'whisper-offline');p.chatAt=now;const message={type:'chat',id:randomUUID(),actor:p.id,name:p.character.name,to:o.character.name,text,channel:'whisper',time:now};p.send(message);o.send(message);this.evidence?.(p,'chat',{channel:'whisper',text,to:{uid:o.uid,name:o.character.name}});return true;}
   // World: everyone online on this server, any map; its own slower cooldown so one player cannot flood it.
   if(m.channel==='world'){if(now-(p.worldAt??-Infinity)<WORLD_CHAT_COOLDOWN)return this.error(p,'world-rate');p.chatAt=p.worldAt=now;this.worldSay(p.serverId,{actor:p.id,name:p.character.name,text});this.evidence?.(p,'chat',{channel:'world',text});return true;}
   if(m.channel==='guild'){const g=this.guildOf(p);if(!g)return this.itemFail(p,'guild-none');p.chatAt=now;const message={type:'chat',id:randomUUID(),actor:p.id,name:p.character.name,text,channel:'guild',time:now};for(const x of g.members)this.online(x.key,g.serverId)?.send(message);this.evidence?.(p,'chat',{channel:'guild',text,guild:g.name??g.id});return true;}
   const party=this.parties.get(p.partyId);if(m.channel==='party'&&!party)return this.error(p,'no-party');p.chatAt=now;
   const message={type:'chat',id:randomUUID(),actor:p.id,name:p.character.name,text,channel:m.channel,time:now};
   for(const pid of party&&m.channel==='party'?party.members:p.room.peers)this.peers.get(pid)?.send(message);
   this.evidence?.(p,'chat',{channel:m.channel,text});
   if(m.channel==='room'){p.room.history.push(message);if(p.room.history.length>40)p.room.history.shift();logChat(this.logs,now,p.channel??1,p.room.map.id,p.character.name,text);}return true;
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
 // Invisible to everyone else and outside every fight: no party, no auto, no target, nothing in progress.
 setObserver(p,on){
  p.observer=on;const w=p.world;
  if(on){if(p.partyId)this.leaveParty(p);w.auto=false;w.targetId=null;w.path=[];if(w.roleCombat)w.roleCombat.state.pending=null;p.input={x:0,z:0,attack:false,run:false};w.rivals=[];}
  if(!on)w.notice('ปิดโหมดผู้ชม · กลับมาเล่นตามปกติ');this.social(p.room);
 }
 leaveParty(p){
  const party=this.parties.get(p?.partyId);if(!party)return;p.partyId=null;party.members.delete(p.id);
  if(party.members.size+(party.pending?.size??0)<2){for(const id of party.members)this.peers.get(id).partyId=null;this.parties.delete(party.id);}
  else if(party.leader===p.id)party.leader=party.members.values().next().value;
 }
 // 0.99.14 the roster covers the whole channel (every map of the server), so a party can be formed across maps;
 // here = on the viewer's map (duels, trades and shared EXP still need the same map)
 social(room){const all=[...this.peers.values()].filter(a=>a.serverId===room.serverId&&a.room&&!a.observer&&(room.channel?a.channel===room.channel:!a.room.channel));const channels=this.channelCounts();for(const p of all){const party=this.parties.get(p.partyId);p.send({type:'social',channel:p.channel??1,channels,players:all.map(a=>({id:a.id,name:a.character.name,classId:a.character.classId,partyId:a.partyId,map:a.room.map.name,here:a.room===p.room})),party:party?{id:party.id,leader:party.leader,members:[...party.members]}:null});}}
 // ---- 0.95 weekly guild war (guild-war.js). One war state per channel; the stone is shared by everyone there.
 warState(serverId){let s=this.wars.get(serverId);if(!s){s={active:false,holder:null,stone:{id:'war:stone',pvp:true,name:WAR.stone.name,x:WAR.stone.x,z:WAR.stone.z,hp:WAR.stone.hp,maxHp:WAR.stone.hp}};this.wars.set(serverId,s);}return s;}
 castleOwner(serverId){return [...this.guilds.values()].find(g=>g.serverId===serverId&&g.castle)??null;}
 warTick(){
  const w=warWindow(this.now(),this.warAlways);
  for(const serverId of new Set([...SERVER_IDS,...[...this.peers.values()].map(p=>p.serverId)])){
   const s=this.warState(serverId),key=warBoardKey(serverId),saved=this.leaders.get(key);
   // A restart after closing time must settle the saved participants, too.
   if(!s.active&&saved?.active&&(!w.active||saved.active.id!==String(w.startsAt))){const result=finishWarRound(saved,saved.active,serverId,this.now()),owner=this.castleOwner(serverId),winner=this.guilds.get(saved.active.holder);if(owner&&owner!==winner){owner.castle=false;this.guildChanged(owner);}if(winner&&!winner.castle){winner.castle=true;this.guildChanged(winner);}this.leaders.set(key,result.board);this.leadersDirty.add(key);this.onWarRewards?.(key);}
   if(!w.active&&w.nextAt>this.now()&&w.nextAt-this.now()<=15*6e4&&s.reminded!==w.nextAt){s.reminded=w.nextAt;this.herald(serverId,`⏰ อีก 15 นาทีกิลด์วอร์เริ่ม! · ${warLabel(this.now())} ที่โรงสีใต้เงาจันทร์`);}
   if(w.active&&!s.active){const board=this.leaders.get(key)??{},owner=this.castleOwner(serverId),round=warRound(board,w.startsAt,owner?.id??null);if(owner)round.guilds[owner.id]??={id:owner.id,name:owner.name,damage:0,captures:0,kills:0};s.active=true;s.round=round;s.holder=round.holder;s.stone.hp=s.stone.maxHp;this.leaders.set(key,{...board,active:round});this.leadersDirty.add(key);this.herald(serverId,`⚔️ กิลด์วอร์เริ่มแล้ว! · ไปที่${this.catalog.maps.find(m=>m.id===WAR.map)?.name??WAR.map} ทำลาย${WAR.stone.name}เพื่อยึด${WAR.name} · ${WAR.minutes} นาที`);}
   if(!w.active&&s.active){s.active=false;this.warEnd(serverId,s);}
  }
  for(const p of this.peers.values())this.warRivals(p);
 }
 // Enemy-guild players in the war map (and the stone, unless your guild holds it) become targets for this player.
 warRivals(p){
  const s=this.wars.get(p.serverId),w=p.world,g=s?.active&&p.room.map.id===WAR.map&&!p.suspended&&!p.observer?this.guildOf(p):null;
  if(!g){if(w.rivals.length){if(String(w.targetId).startsWith('war:'))w.targetId=null;w.rivals=[];}return;}
  const list=s.holder===g.id?[]:[s.stone];p.rivalCache??=new Map();
  for(const id of p.room.peers){const a=this.peers.get(id);if(a===p||a.suspended||a.observer||!this.guildOf(a)||a.guildId===g.id)continue;
   let v=p.rivalCache.get(a.id);if(!v){v={id:'war:'+a.id,pvp:true,name:a.character.name,classId:a.character.classId,gender:a.character.gender};p.rivalCache.set(a.id,v);}
   Object.assign(v,{x:a.world.player.x,z:a.world.player.z,hp:a.world.player.hp,maxHp:a.world.player.maxHp,guild:this.guildOf(a)?.name??''});list.push(v);}
  w.rivals=list;
 }
 warHit(p,mob,damage,color){
  const s=this.wars.get(p.serverId),guild=this.guildOf(p);if(!s?.active||!guild||p.observer||p.suspended||!p.world.rivals.includes(mob))return;
  const contribution=(player,options)=>{warContribution(s.round,player,this.guildOf(player),options);this.leadersDirty.add(warBoardKey(p.serverId));};
  if(mob===s.stone){const amount=Math.min(mob.hp,Math.round(damage*petBlessing(p.world)));mob.hp-=amount;p.world.emit('damage',{id:mob.id,x:mob.x,z:mob.z,amount,color,magic:!!p.world.derived?.magic,synced:!!p.world.roleCombat,...p.world.damageContext});
   contribution(p,{damage:amount});if(mob.hp>0)return;const g=guild;s.holder=g.id;if(s.round)s.round.holder=g.id;contribution(p,{capture:true});mob.hp=mob.maxHp;
   for(const id of p.room.peers){const a=this.peers.get(id);if(a.world.targetId===mob.id)a.world.targetId=null;}
   this.announce(p.serverId,`🏯 กิลด์ ${g.name} ยึด${WAR.name}ได้! · ${p.character.name} ทำลาย${WAR.stone.name}`);return;}
  const a=this.peers.get(mob.id.slice(4)),v=a?.world.player;if(!v||v.hp<=0)return;
  const rawAmount=monsterHit(a.world,Math.max(1,Math.round(damage*WAR.scale))),amount=a.world.roleCombat?a.world.roleCombat.incoming(rawAmount,{...p.world.player,id:'war:'+p.id,pvp:true,secondary:!!p.world.roleSecondary}):petIncoming(a.world,rawAmount);if(!amount){a.world.emit('dodge',{x:v.x,z:v.z});return;}
  v.hp=Math.max(0,v.hp-amount);mob.hp=v.hp;p.world.emit('damage',{id:mob.id,x:v.x,z:v.z,amount,color,magic:!!p.world.derived?.magic,synced:!!p.world.roleCombat,...p.world.damageContext});a.world.emit('playerHit',{x:v.x,z:v.z,amount});
  contribution(p,{});contribution(a,{});if(v.hp>0)return;contribution(p,{kill:true}); // knocked out: back to the map's start in 3 s, no EXP loss
  v.down=3;Object.assign(a.world,{auto:false,targetId:null,path:[],status:{}});
  a.world.notice('ถูก '+p.character.name+' ล้มในกิลด์วอร์ · กลับจุดเกิดใน 3 วินาที');p.world.notice('⚔️ ล้ม '+a.character.name+' ได้!');
 }
 warEnd(serverId,s){
  if(s.round){s.round.holder=s.holder;const key=warBoardKey(serverId),result=finishWarRound(this.leaders.get(key),s.round,serverId,this.now());if(result.changed){this.leaders.set(key,result.board);this.leadersDirty.add(key);if(result.board.last.rankings.length)this.herald(serverId,'🏆 อันดับกิลด์วอร์ · '+result.board.last.rankings.map(g=>g.rank+'. '+g.name).join(' · '));this.onWarRewards?.(key);}}
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
  return {rows:rows.slice(0,10).map(([k,v],i)=>{const look=this.leaders.get(p.serverId)?.[k]??v;return {rank:i+1,me:k===p.key,name:v.name,classId:look.classId,gender:look.gender,jobId:look.jobId,appearance:look.appearance,equipment:look.equipment,level:look.level,points:v.points,wins:v.wins,losses:v.losses,draws:v.draws};}),me:mine<0?null:{rank:mine+1,points:rows[mine][1].points},last:a.last,endsAt:arenaEnds(this.now())};}
 warView(p){
  const s=this.wars.get(p.serverId),owner=this.castleOwner(p.serverId),here=p.room.map.id===WAR.map;
  return {active:!!s?.active,next:warLabel(this.now()),owner:owner?.name??null,holder:s?.active&&s.holder?this.guilds.get(s.holder)?.name??null:null,rankings:s?.active?warRankings(s.round).slice(0,3):this.leaders.get(warBoardKey(p.serverId))?.last?.rankings??[],
   stone:s?.active&&here?{hp:s.stone.hp,maxHp:s.stone.maxHp}:null,left:s?.active?Math.max(0,Math.ceil((warWindow(this.now(),this.warAlways).endsAt-this.now())/1000)):0,rivals:here?p.world.rivals:[]};
 }
 startDuel(a,b){
  const until=this.now()+DUEL.time;
  for(const [x,y] of [[a,b],[b,a]]){const v=x.world.player;x.duelAsk=null;x.duel={foe:y.id,until};v.hp=v.maxHp;v.mp=v.maxMp;x.world.auto=false;
   x.world.foe={id:'duel:'+y.id,pvp:true,name:y.character.name,classId:y.character.classId,gender:y.character.gender,x:0,z:0,hp:1,maxHp:1};this.duelSync(x);x.world.targetId=x.world.foe.id;x.world.path=[];
   x.world.notice('⚔️ เริ่มประลองกับ '+y.character.name+' · 90 วินาที · เดินห่างเกิน 20 ม. = เสมอ');}
 }
 // Copies the opponent's position and HP onto the stand-in target; false when the bout has to stop.
 duelSync(p){const y=this.peers.get(p.duel?.foe);if(!y||y.suspended||y.room!==p.room||y.duel?.foe!==p.id)return false;Object.assign(p.world.foe,{x:y.world.player.x,z:y.world.player.z,hp:y.world.player.hp,maxHp:y.world.player.maxHp});return true;}
 duelTick(p){
  const y=this.peers.get(p.duel.foe);if(!this.duelSync(p)){this.endDuel(p,y?.duel?.foe===p.id?y:null,'อีกฝ่ายออกจากพื้นที่');return;}
  if(p.world.player.hp<=0)return this.endDuel(y,p,'หมดแรงกลางสนาม');
  if(distance(p.world.player,y.world.player)>(p.room.map.id===ARENA_MAP?25:DUEL.range))return this.endDuel(p,y,'ห่างกันเกินไป',true);
  if(this.now()>p.duel.until){const share=a=>a.world.player.hp/a.world.player.maxHp,a=share(p),b=share(y);return a===b?this.endDuel(p,y,'หมดเวลา',true):a>b?this.endDuel(p,y,'หมดเวลา · เลือดเหลือมากกว่า'):this.endDuel(y,p,'หมดเวลา · เลือดเหลือมากกว่า');}
 }
 // Ends a bout: no death and no EXP loss; the loser keeps 1 HP. draw=true when nobody won.
 endDuel(winner,loser,reason,draw=false){
  for(const x of [winner,loser]){if(!x?.duel)continue;if(x.world.targetId===x.world.foe?.id)x.world.targetId=null;x.duel=null;x.world.foe=null;}
  const names=[winner,loser].map(x=>x?.character.name??'อีกฝ่าย'),room=(winner??loser)?.room;
  finishArena(this,winner,loser,draw,reason);this.arenaScore(winner,loser,draw);for(const x of [winner,loser])if(x)this.storyProgress(x,{type:'do',action:'duel'});
  if(draw){for(const x of [winner,loser])x?.world.notice('🤝 ประลองเสมอ · '+reason);return;}
  winner?.world.notice('🏆 ชนะการประลอง! · '+reason);loser?.world.notice('💢 แพ้การประลอง · '+reason);
  for(const id of room?.peers??[]){const a=this.peers.get(id);if(a!==winner&&a!==loser)a.world.notice('⚔️ '+names[0]+' ชนะ '+names[1]+' ในการประลอง');}
 }
 duelHit(p,mob,damage,color){
  const y=this.peers.get(p.duel?.foe);if(!y||mob.id!=='duel:'+y.id)return;const v=y.world.player;
  const rawAmount=monsterHit(y.world,Math.max(1,Math.round(damage*DUEL.scale))),amount=y.world.roleCombat?y.world.roleCombat.incoming(rawAmount,{...p.world.player,id:'duel:'+p.id,pvp:true,secondary:!!p.world.roleSecondary}):petIncoming(y.world,rawAmount);if(!amount){y.world.emit('dodge',{x:v.x,z:v.z});return;}
  if(!p.duel||!y.duel)return;v.hp=Math.max(1,v.hp-amount);mob.hp=v.hp;p.world.emit('damage',{id:mob.id,x:v.x,z:v.z,amount,color,magic:!!p.world.derived?.magic,synced:!!p.world.roleCombat,...p.world.damageContext});y.world.emit('playerHit',{x:v.x,z:v.z,amount});
  if(v.hp===1)this.endDuel(p,y,'น็อก '+y.character.name);
 }
 hurt(p,mob,damage,color='#fff0a6'){
  if(p.levelMutationBusy||!Number.isFinite(damage)||damage<=0)return;damage=p.world.roleCombat?.outgoing(mob,damage)??damage;
  if(mob?.pvp)return String(mob.id).startsWith('war:')?this.warHit(p,mob,damage,color):this.duelHit(p,mob,damage,color);
  if(!mob||mob.hp<=0||p.room.map.safe)return;
  if(MONSTER_TYPES[mob.type]?.worldBoss&&!mob.summoned&&this.mapBosses.remaining(p.room)>0){mob.hp=0;mob.dead=this.mapBosses.remaining(p.room);return;}
  if(!Number.isFinite(damage)||damage<=0)return;
  const amount=Math.min(mob.hp,Math.round(damage*petBlessing(p.world)));mob.hp-=amount;markMonsterHit(mob,p.world.player);rallyPack(p.room.mobs,mob);
  let contributors=p.room.contributors.get(mob.id);if(!contributors){contributors=new Set();p.room.contributors.set(mob.id,contributors);}contributors.add(p.id);
  if(MONSTER_TYPES[mob.type]?.boss)recordBossDamage(p.room,mob,p,amount,this.clock);
  if(mob.summoned){const all=(p.room.bossDamage??=new Map()),d=all.get(mob.id)??new Map();all.set(mob.id,d);d.set(p.id,(d.get(p.id)??0)+amount);} // each summoned boss keeps its own damage table
  else if(MONSTER_TYPES[mob.type].mvp){const d=(p.room.mvpDamage??=new Map());d.set(p.id,(d.get(p.id)??0)+amount);}
  p.world.emit('damage',{id:mob.id,x:mob.x,z:mob.z,amount,color,magic:!!p.world.derived?.magic,crit:color==='#ffd27a',synced:!!p.world.roleCombat,...p.world.damageContext});
  if(mob.hp>0)return;mob.dead=p.room.map.instance?1e9:mobRespawn(mob);mob.aggro=false;
  if(mob.summoned)this.summonDown(p.room,mob);else if(MONSTER_TYPES[mob.type].mvp)this.mvpDown(p.room,mob);
  if(MONSTER_TYPES[mob.type].worldBoss&&!mob.summoned){this.mapBosses.killed(p.room,mob,MONSTER_TYPES);const type=MONSTER_TYPES[mob.type];logMvp(this.logs,this.now(),type.name,p.room.channel??1,p.room.map.id,p.character.name);this.announce(p.serverId,'👑 '+type.name+' ถูกปราบที่ '+p.room.map.name+' · CH '+(p.room.channel??1)+' · เกิดใหม่อีก 60 นาที');}
  if(MONSTER_TYPES[mob.type]?.boss){const result=finishBossDamage(p.room,mob,MONSTER_TYPES[mob.type],this.clock);if(result)p.room.events.push({...result,at:this.clock,actor:p.id});}
  if(p.room.map.instance&&MONSTER_TYPES[mob.type].boss)this.dungeonClear(p.room);
  const eligible=new Set([...contributors].filter(id=>{const a=this.peers.get(id);return a?.room===p.room&&!a.suspended&&a.world.player.hp>0&&distance(a.world.player,mob)<=18;}));
  for(const id of [...eligible]){const party=this.parties.get(this.peers.get(id).partyId);for(const member of party?.members??[]){const a=this.peers.get(member);if(a?.room===p.room&&!a.suspended&&a.world.player.hp>0&&distance(a.world.player,mob)<=18)eligible.add(member);}}
  const reward=MONSTER_TYPES[mob.type],ids=[...eligible].sort(),rate=expRate(this.now(),p.room.map.id)*mobXp(mob),event=activeEvent(this.now()),rolls=(mob.leader?LEADER.loot:1)*(surgeOn(this.now(),p.room.map.id)?2:1); // 0.50 event/weekend EXP + token drops
  ids.forEach((id,i)=>{const a=this.peers.get(id),gx=1+this.guildBonus(a).exp;a.world.kills++;this.guildKill(a);if(a.training&&!a.training.bossDone&&(a.training.boss??TRIAL[a.training.tier]?.boss)===reward.id){a.training={...a.training,bossDone:true};a.saveNow=true;a.world.notice('⚔️ ล้มบอสบททดสอบแล้ว! · กลับไปส่งบททดสอบที่ลานครู');}const split=n=>Math.floor(n/ids.length)+(i<n%ids.length?1:0);a.world.emit('experience',awardExperience(a.world,Math.round(split(Math.round(reward.baseXp*rate))*gx),Math.round(split(Math.round(reward.jobXp*rate))*gx)));a.world.emit('defeat',{id:mob.id,x:mob.x,z:mob.z});this.storyProgress(a,{type:'defeat',monster:reward.id,mapId:p.room.map.id});a.weekly=weeklyDefeat(a.weekly,this.now(),{leader:!!mob.leader,boss:!!reward.boss});{const bd=bountyDefeat(a.bounty,this.now(),reward.id,mob.leader);if(bd.changed)a.bounty=bd.state;}{const loot=rollLoot(reward.id,Math.random,event,rolls,gearLook(a.character.classId,a.character.gender));loot.coins=Math.round(loot.coins*(1+(a.derived?.coinPct??0)+this.guildBonus(a).coins));this.grantLoot(a,loot,mob);}});
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
  cleanArenaRooms(this);
  for(const p of this.peers.values())if(p.suspended&&p.resumeUntil&&p.resumeUntil<this.now())this.leave(p.id);
  for(const [id,v] of this.invites)if(v.expires<this.now())this.invites.delete(id);
  for(const party of [...this.parties.values()])for(const [uid,until] of party.pending??[])if(until<this.now()){party.pending.delete(uid);if(party.members.size+party.pending.size<2){for(const id of party.members){const a=this.peers.get(id);a.partyId=null;this.social(a.room);}this.parties.delete(party.id);}}
  if(this.tickId%20===1){this.expireShops();for(const p of this.peers.values())this.expireStall(p);this.flushMarketBrowsers();}
  this.warTick();
  if(this.tickId%20===0)for(const p of this.peers.values())if(!p.suspended)this.storyCheck(p);
  if(this.tickId%1200===1)for(const id of SERVER_IDS)this.arena(id); // weekly rollover even when quiet
  for(const p of this.peers.values()){if(p.suspended)continue;p.bucket=Math.min(40,p.bucket+dt*25);if(this.now()-p.inputAt>350)p.input={x:0,z:0,attack:false};if(p.duel)this.duelTick(p);if(p.walkQueued&&this.now()>=p.walkAt)this.walkNow(p,p.walkQueued);p.world.update(dt,walkInput(p,dt),{monsters:false});p.appliedInputSeq=p.inputSeq??0;if(!p.mailMutationBusy)this.autoPotion(p);if(!p.petMutationBusy&&p.petCollection.auto&&p.world.auto){try{this.petCast(p,true);}catch{}}}
  for(const room of this.rooms.values()){
   if(this.roleSkills)stepRoleMonsters(room.mobs,dt,id=>this.peers.get(id)?.room===room?this.peers.get(id).world:null);
   // 0.99.11 the living players of the room once per tick; each monster just takes the closest (no per-monster sort)
   const alive=[...room.peers].map(id=>this.peers.get(id)).filter(p=>!p.suspended&&!p.observer&&p.world.player.hp>0);
   const levels=new Map(alive.map(p=>[p,baseProgress(p.world).level])); // 0.122 territory aggro (monster-catalog.js)
   for(const m of room.mobs){
    m.petSlow=Math.max(0,(m.petSlow??0)-dt);if(m.petArmor)m.petArmor.left=Math.max(0,m.petArmor.left-dt);if(m.hp<=0){m.petSlow=0;delete m.petArmor;}
    let target=null,near=Infinity;for(const p of alive){const d=distance(p.world.player,m);if(d<near){near=d;target=p;}}
    let type=MONSTER_TYPES[m.type];if(m.roleStatus?.slow||m.petSlow>0)type={...type,speed:type.speed*(type.boss?.8:.5)};
    const taunter=this.peers.get(m.roleStatus?.taunt?.owner);if(taunter?.room===room&&taunter.world.player.hp>0&&distance(taunter.world.player,m)<15)target=taunter;
    if(type.mvp&&m.hp<=0&&!m.summoned)m.dead=(this.mvpState(room.serverId).nextAt-this.now())/1000; // wall-clock timer, shared by every room of the channel
    if(type.worldBoss&&!m.summoned){const left=this.mapBosses.remaining(room);if(left>0){m.hp=0;m.dead=left;room.contributors.delete(m.id);continue;}if(m.hp<=0)m.dead=0;}
    const decoyOwner=this.peers.get(m.roleStatus?.decoy?.owner);if(decoyOwner?.room===room)target={world:{player:{...decoyOwner.world.player,x:decoyOwner.world.player.x+1.2,hp:1},takeMonsterHit(){}}};
    const result=advanceMonster(m,target?.world.player,type,dt,room.map.nav,{moveBody,lineClear,level:levels.get(target)??null});
    if(result==='respawn'){room.damageEncounters?.delete(m.id);room.contributors.delete(m.id);if(type.worldBoss)this.announce(room.serverId,'👑 บอสประจำแมพ '+type.name+' ปรากฏที่ '+room.map.name+' · CH '+(room.channel??1));else if(type.mvp)this.announce(room.serverId,`👑 MVP ${type.name} ปรากฏตัวที่ ${room.map.name}!`);else if(type.awakened)this.announce(room.serverId,`⚡ ${type.name} (Lv.${type.level}) ตื่นขึ้นที่ ${room.map.name}!`);}
    if(m.justEnraged){m.justEnraged=false;for(const id of room.peers)this.peers.get(id).world.notice(type.name+' โกรธจัด! · เร็วและแรงขึ้น');}
    if(result==='burst')for(const id of room.peers){const a=this.peers.get(id);if(!a.suspended&&!a.observer&&a.world.player.hp>0&&distance(a.world.player,m)<=MONSTER_BEHAVIOUR[type.id].aoe)a.world.takeMonsterHit(type,type.damage,m);}
    if(result==='slam')for(const id of room.peers){const a=this.peers.get(id);if(!a.suspended&&!a.observer&&a.world.player.hp>0)a.world.takeSlam(type,m,MONSTER_BEHAVIOUR[type.id].slam);}
    if(result==='hit'&&target){
     target.world.takeMonsterHit(type,type.damage,m);
    }
   }
   for(const id of room.peers){const p=this.peers.get(id);for(const event of p.world.events.splice(0)){const e={...event,actor:id,at:this.clock};if(e.type==='cast'&&e.skillIndex!=null&&p.room.map.id===WAR.map&&this.wars.get(p.serverId)?.active){warContribution(this.wars.get(p.serverId).round,p,this.guildOf(p));this.leadersDirty.add(warBoardKey(p.serverId));}if(e.type.startsWith('spirit'))for(const key of ['launchAt','impactAt','spawnedAt','endsAt'])if(Number.isFinite(e[key]))e[key]+=this.clock-p.world.time; /* 1.10.2 server time of the event: clients place the swing on their timeline */if(e.type==='experience'){if(e.baseUp)logLevelUp(this.logs,this.now(),p.character.name,p.channel??1,p.room?.map?.id??'ayothaya',e.baseLevel,'base');if(e.jobUp)logLevelUp(this.logs,this.now(),p.character.name,p.channel??1,p.room?.map?.id??'ayothaya',e.jobLevel,'job');}if(e.type==='experience'&&e.baseUp&&!e.levelGiftsGranted)for(const g of levelGifts(e.baseFrom,e.baseLevel)){p.world.notice(`ของขวัญ Lv.${g.level} · ${g.text}`);this.grantLoot(p,{coins:g.coins,items:g.items.map(i=>({...i}))});p.saveNow=true;}if(['notice','experience','defeat','select','story','loot','used','trade','refined','refineRejected','carded','stored','tradeAsk','tradeState','tradeEnd','stalls','stallSold','leaderboard','shops','shopsClosed','shopMine','marketResults','friends','friendAsk','guild','guildAsk','guildDirectory','guildApplication','daily','mvp','dungeonClear','tamed','album','crafted','hired'].includes(e.type)||p.observer)p.send({type:'events',events:[e]});else room.events.push(e);}}
   if(this.tickId%2===0){this.broadcasting=true;const events=copy(room.events);for(const id of room.peers){const p=this.peers.get(id);p.send({type:'snapshot',...this.snapshot(p,{delta:true}),events});}this.broadcasting=false;room.events=[];}
  }
 }
 storyProgress(p,event){
  const r=storyEvent(p.story,event);if(!r.changed)return false;p.story=r.state;
  p.world.emit('story',{npc:event.npc??null,say:r.say??null,completed:r.completed?.title??null,story:r.state});
  if(r.reward){p.world.emit('experience',awardExperience(p.world,r.reward.baseXp,r.reward.jobXp));this.grantLoot(p,{coins:r.reward.coins??0,items:rewardItems(r.reward,p.character.classId,p.character.gender)});p.saveNow=true;}
  return true;
 }
 // 0.98 tutorial steps that are already true (wearing a weapon, a refined or carded piece, a class, a level, AUTO on,
 // a guild) finish on their own; checked once a second and right after joining.
 storyContext(p){const g=p.gear??{},worn=Object.values(g).filter(Boolean).map(id=>itemDef(id));
  return {level:this.who(p).level,weapon:!!g.weapon,refined:worn.some(d=>d?.refine>0),carded:worn.some(d=>d?.card),job:p.character.classId!=='novice',
   skilled:(p.world.skillLevels??[]).reduce((n,v)=>n+v,0)>(p.character.classId==='novice'?2:0), // 0.119 class skills start at zero
   auto:!!p.world.auto,guild:!!this.guildOf(p)};}
 storyCheck(p){for(let i=0;i<30&&this.storyProgress(p,{type:'check',ctx:this.storyContext(p)});i++);}
 // ---- 0.70 central market: consignment shops (open while the owner is offline), buying stores, search, tax, prices.
 shopList(serverId){return [...this.shops.values()].filter(s=>s.serverId===serverId&&shopIsOpen(s,this.now())).map(publicShop);}
 shopsChanged(serverId,closedIds=[]){this.marketChanged(serverId);const list=this.shopList(serverId);for(const p of this.peers.values())if(p.serverId===serverId&&!p.suspended){if(p.room.map.id===MARKET_ZONE.mapId)p.world.emit('shops',{list});if(closedIds.length)p.world.emit('shopsClosed',{ids:closedIds});}}
 marketChanged(serverId){(this.marketDirty??=new Set()).add(serverId);}
 marketStalls(serverId){return [...this.peers.values()].filter(o=>o.serverId===serverId&&o.stall&&!o.suspended).map(o=>({owner:o.id,name:o.character.name,...o.stall,mapId:o.room.map.id}));}
 sendMarketResults(p,input){
  const data=browseMarket([...this.shops.values()].filter(s=>s.serverId===p.serverId),this.marketStalls(p.serverId),input,this.prices.get(p.serverId)??{},this.now());
  // Keep sell-form reference-price warnings for the owner's inventory without sending every historical item or day bucket.
  const prices=this.prices.get(p.serverId)??{};for(const item of Object.keys(p.bag?.items??{})){const key=priceKey(item),r=prices[key];if(r)data.prices[key]={last:r.last,avg:r.avg,n:r.n,t:r.t};}
  if(p.marketBrowse===input)p.marketBrowse.page=data.page;
  if(Number.isSafeInteger(input.requestId))data.requestId=input.requestId;
  const signature=JSON.stringify(data);if(signature===p.marketBrowseSignature)return;
  p.marketBrowseSignature=signature;p.world.emit('marketResults',data);
 }
 flushMarketBrowsers(){
  const viewers=[...this.peers.values()].filter(p=>p.marketBrowse&&!p.suspended),servers=new Set(viewers.map(p=>p.serverId));this.marketStallSignatures??=new Map();
  // Detect live-stall changes (including movement/disconnect) once per second. No client polling or idle broadcasts.
  for(const id of servers){const signature=JSON.stringify([marketDay(this.now()),this.marketStalls(id)]);if(signature!==this.marketStallSignatures.get(id)){this.marketChanged(id);this.marketStallSignatures.set(id,signature);}}
  for(const p of viewers)if(this.marketDirty?.has(p.serverId))this.sendMarketResults(p,p.marketBrowse);
  this.marketDirty?.clear();for(const id of this.marketStallSignatures.keys())if(!servers.has(id))this.marketStallSignatures.delete(id);
 }
 saveShop(shop,deleted=false){
  if(!this.onShop)return Promise.resolve();this.shopWrites??=new Map();const saved=copy(shop),task=(this.shopWrites.get(shop.id)??Promise.resolve()).catch(()=>{}).then(()=>this.onShop(saved,deleted));this.shopWrites.set(shop.id,task);
  task.catch(e=>console.error('shop-save',e.message)).finally(()=>{if(this.shopWrites.get(shop.id)===task)this.shopWrites.delete(shop.id);});return task;
 }
 async flushShops(){await Promise.allSettled([...(this.shopWrites?.values()??[])]);}
 expireShops(now=this.now()){
  const servers=new Map(),owners=new Set();
  for(const [id,s] of this.shops){const next=closeInactiveShop(s,now),remove=next.status==='closed'&&!shopHasClaims(next);if(next===s&&!remove)continue;
   if(remove)this.shops.delete(id);else this.shops.set(id,next);this.saveShop(next,remove);if(!servers.has(s.serverId))servers.set(s.serverId,[]);servers.get(s.serverId).push(id);owners.add(s.ownerKey);
  }
  for(const [serverId,ids] of servers)this.shopsChanged(serverId,ids);
  for(const p of this.peers.values())if(!p.suspended&&owners.has(p.key))p.world.emit('shopMine',{shops:this.mine(p),perks:tradePerks(p.tradeXp)});
 }
 expireStall(p,now=this.now()){
  if(!p.stall)return;const expired=Number.isFinite(p.stall.expiresAt)&&p.stall.expiresAt<=now;
  if(expired||!shopHasListings(p.stall)){p.stall=null;if(expired)p.world.notice('แผงครบ 24 ชั่วโมงแล้ว · ตั้งร้านใหม่เพื่อขายต่อ');}
 }
 traded(serverId,peers,item,coins,count){for(const a of peers)if(a)a.tradeXp=Math.min(1e9,(a.tradeXp??0)+coins);const prices=this.prices.get(serverId)??{};this.prices.set(serverId,recordPrice(prices,item,Math.round(coins/count),this.now(),count));this.pricesDirty.add(serverId);this.marketChanged(serverId);}
 mine(p){return [...this.shops.values()].filter(s=>s.ownerKey===p.key).map(s=>({...publicShop(s),pouch:s.pouch,escrow:s.escrow,log:s.log}));}
 marketCommand(p,m){
  const w=p.world,perks=tradePerks(p.tradeXp),fail=c=>this.itemFail(p,c),now=this.now();
  this.expireShops(now);for(const peer of this.peers.values())this.expireStall(peer,now);
  if(m.type==='marketSearch'){
   if(m.close===true){delete p.marketBrowse;delete p.marketBrowseSignature;return true;}
   const options={...marketOptions(m),...(Number.isSafeInteger(m.requestId)?{requestId:m.requestId}:{})};
   p.marketBrowse=m.watch===true?options:null;delete p.marketBrowseSignature;this.sendMarketResults(p,options);return true;
  }
  if(m.type==='shopMine'){w.emit('shopMine',{shops:this.mine(p),perks});return true;}
  if(m.type==='shopList'){w.emit('shops',{list:this.shopList(p.serverId)});return true;}
  if(m.type==='shopOpen'){
   let r;try{r=openShop({bag:p.bag,req:m.shop,perks,owner:{key:p.key,name:p.character.name,serverId:p.serverId},x:w.player.x,z:w.player.z,mapId:p.room.map.id,now,id:randomUUID(),existing:[...this.shops.values()].filter(s=>s.serverId===p.serverId)});}catch(e){return fail(e.message);}
   this.setBag(p,r.bag);this.shops.set(r.shop.id,r.shop);p.saveNow=true;this.saveShop(r.shop);this.shopsChanged(p.serverId);
   w.notice((r.shop.kind==='buy'?'เปิดร้านรับซื้อ ':'เปิดร้านค้าง ')+r.shop.title+' แล้ว · เปิดได้ 24 ชั่วโมงแม้ออกจากเกม');w.emit('shopMine',{shops:this.mine(p),perks});return true;}
  const shop=this.shops.get(m.shop);if(!shop||shop.serverId!==p.serverId)return fail('stall-none');
  if(m.type==='shopCollect'||m.type==='shopClose'){if(shop.ownerKey!==p.key)return fail('stall-none');
   let r;try{r=collectShop(shop,p.bag,{close:m.type==='shopClose'});}catch(e){return fail(e.message);}
   p.tradeXp=Math.min(1e9,(p.tradeXp??0)+(shop.xpOwed??0));if(r.shop)r.shop.xpOwed=0;
   this.setBag(p,r.bag);p.saveNow=true;if(r.shop){this.shops.set(shop.id,r.shop);this.saveShop(r.shop);}else{this.shops.delete(shop.id);this.saveShop(shop,true);this.shopsChanged(p.serverId,[shop.id]);}
   w.notice((m.type==='shopClose'?'ปิดร้านแล้ว':'รับของจากร้านแล้ว')+(r.coins?' · เบี้ย +'+r.coins:''));w.emit('shopMine',{shops:this.mine(p),perks});return true;}
  if(p.room.map.id!==MARKET_ZONE.mapId||Math.hypot(w.player.x-shop.x,w.player.z-shop.z)>4.5)return fail('shop-far');
  if(shop.ownerKey===p.key)return fail('stall-self');
  const owner=[...this.peers.values()].find(o=>o.key===shop.ownerKey&&!o.suspended),ownerPerks=tradePerks(owner?.tradeXp??0);
  let r;try{r=m.type==='shopBuy'?buyFromShop(shop,p.bag,m.item,m.count,ownerPerks,{who:p.character.name,now}):m.type==='shopSell'?sellToShop(shop,p.bag,m.item,m.count,tradePerks(p.tradeXp),{who:p.character.name,now}):null;}catch(e){return fail(e.message);}
  if(!r)return false;
  r.shop.xpOwed=(shop.xpOwed??0)+(r.cost??r.pay); // the owner's trade experience is paid out when they collect
  this.setBag(p,r.bag);p.saveNow=true;this.shops.set(shop.id,r.shop);this.saveShop(r.shop);this.traded(p.serverId,[p],m.item,r.cost??r.pay,m.count);
  this.evidence?.(p,m.type==='shopBuy'?'market-shop-buy':'market-shop-sell',{shop:{id:shop.id,owner:shop.ownerName},item:m.item,count:m.count,coins:r.cost??r.pay,tax:r.tax??0});
  owner?.world.emit('stallSold',{item:m.item,count:m.count,coins:(r.cost??r.pay)-r.tax,buyer:p.character.name});
  owner?.world.emit('shopMine',{shops:this.mine(owner),perks:tradePerks(owner.tradeXp)});
  w.notice((m.type==='shopBuy'?'ซื้อจากร้าน ':'ขายให้ร้าน ')+shop.ownerName+' แล้ว'+(r.tax?' · ภาษี '+r.tax+' เบี้ย':''));
  this.shopsChanged(p.serverId,r.shop.status==='closed'?[shop.id]:[]);return true;
 }
 setBag(p,bag){p.bag=bag;p.bagVersion++;if(p.stall){p.stall={...p.stall,...normalizeStall(p.stall,bag,tradePerks(p.tradeXp).slots)};this.expireStall(p);}}
 // ---- 0.46 player trade: both lock, both confirm, then one atomic swap and an immediate save of both.
 partner(p){const o=p.trade&&this.peers.get(p.trade.with);return o&&o.trade?.with===p.id?o:null;}
 sendTrade(a,b){for(const [x,y] of [[a,b],[b,a]])x.world.emit('tradeState',{partner:{id:y.id,name:y.character.name},mine:x.trade.offer,theirs:y.trade.offer,myLock:x.trade.locked,theirLock:y.trade.locked,myOk:x.trade.ok,theirOk:y.trade.ok});}
 endTrade(p,why){const o=this.partner(p);for(const x of [p,o].filter(Boolean)){x.trade=null;x.world.emit('tradeEnd',{reason:why});}}
 tradeCommand(p,m){
  const w=p.world,near=o=>o&&o.room===p.room&&!o.suspended&&!o.mailMutationBusy&&distance(o.world.player,w.player)<=6;
  if(m.type==='tradeList'){w.emit('tradeAsk',{list:[...p.room.peers].filter(id=>id!==p.id&&!this.peers.get(id)?.observer).map(id=>{const o=this.peers.get(id);return {id,name:o.character.name,near:near(o)};})});return true;}
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
   this.evidence?.(p,'trade',{with:{uid:o.uid,name:o.character.name,ip:o.ip??null},gave:p.trade.offer,got:o.trade.offer});
   logTrade(this.logs,this.now(),p.character.name,o.character.name,p.channel??1);
   for(const x of [p,o]){x.trade=null;x.world.emit('tradeEnd',{reason:'แลกของสำเร็จ',done:true});}return true;}
  return false;
 }
 // ---- 0.46 vending: a stall lists items from the owner's bag at fixed prices; city only; closes if the owner walks off.
 stallCommand(p,m){
  const w=p.world;
  for(const peer of this.peers.values())this.expireStall(peer);
  if(m.type==='stallOpen'){if(!p.room.map.safe)return this.itemFail(p,'stall-city');if(!inMarket(p.room.map.id,w.player.x,w.player.z))return this.itemFail(p,'shop-zone');p.stall={...normalizeStall(m.stall,p.bag,tradePerks(p.tradeXp).slots),x:w.player.x,z:w.player.z,createdAt:this.now(),expiresAt:this.now()+SHOP_DURATION};
   if(!Object.keys(p.stall.items).length){p.stall=null;return this.itemFail(p,'no-item');}w.notice('เปิดแผง '+p.stall.title+' แล้ว');return true;}
  if(m.type==='stallClose'){p.stall=null;w.notice('ปิดแผงแล้ว');return true;}
  if(m.type==='stallList'){w.emit('stalls',{list:[...p.room.peers].map(id=>this.peers.get(id)).filter(o=>o.stall&&o!==p).map(o=>({owner:o.id,name:o.character.name,title:o.stall.title,items:o.stall.items,x:o.stall.x,z:o.stall.z}))});return true;}
  if(m.type==='stallBuy'){const o=this.peers.get(m.owner);if(!o?.stall||o.suspended||o.mailMutationBusy||o.room!==p.room)return this.itemFail(p,'stall-none');if(o===p)return this.itemFail(p,'stall-self');
   let r;try{r=buyFromStall(o.bag,o.stall,p.bag,m.item,m.count,tradePerks(o.tradeXp).slots);}catch(e){return this.itemFail(p,e.message);}
   {const tax=taxOf(r.cost,tradePerks(o.tradeXp));r.net=r.cost-tax;r.sellerBag={...r.sellerBag,coins:r.sellerBag.coins-tax};this.traded(p.serverId,[p,o],m.item,r.cost,m.count);}
   const nextStall={...o.stall,...r.stall};this.setBag(o,r.sellerBag);this.setBag(p,r.buyerBag);o.stall=shopHasListings(nextStall)?nextStall:null;p.saveNow=o.saveNow=true;
   logMarket(this.logs,this.now(),p.character.name,o.character.name,m.item,m.count,r.cost);
   this.evidence?.(p,'market-stall',{seller:{uid:o.uid,name:o.character.name},item:m.item,count:m.count,coins:r.cost,tax:r.cost-r.net});
   o.world.emit('stallSold',{item:m.item,count:m.count,coins:r.net,buyer:p.character.name});w.notice('ซื้อจากแผง '+o.character.name+' แล้ว');
   this.stallCommand(p,{type:'stallList'});return true;}
  return false;
 }
 walkNow(p,m){
  p.walkQueued=null;const t=performance.now();
  try{startWalk(p,m,this.runEnabled);return true;}catch(e){p.send({type:'walkError',id:m.id,code:e.message});return false;}
  finally{const cost=performance.now()-t;p.walkAt=cost>WALK_FREE_MS?this.now()+cost*10:0;}
 }
 who(p){return {classId:p.character.classId,level:baseProgress(p.world).level,reborn:p.rebirth??0};}
 // Status + worn gear → combat numbers; cheap no-op unless level, class, stats or gear changed.
 // 0.72 leaderboard: best combat power per character (offline characters keep their last entry); top 200 kept.
 rank(p){const power=combatPower(p.derived,this.who(p).level),board=this.leaders.get(p.serverId)??{},old=board[p.key];
  const look={name:p.character.name,classId:p.character.classId,gender:p.character.gender,jobId:p.character.jobId??'',appearance:copy(p.character.appearance??{}),equipment:normalizeEquipment(p.equipment,p.character.classId)};
  const next={...look,level:this.who(p).level,power};
  if(old&&JSON.stringify({...old,t:undefined})===JSON.stringify({...next,t:undefined}))return;
  board[p.key]={...next,t:this.now()};
  const keep=Object.entries(board).sort((a,b)=>b[1].power-a[1].power).slice(0,200);this.leaders.set(p.serverId,Object.fromEntries(keep));this.leadersDirty.add(p.serverId);}
 leaderboard(p){
  // Refresh online cosmetics too: changing clothes does not change combat power.
  for(const peer of this.peers.values())if(peer.serverId===p.serverId)this.rank(peer);
  const rows=Object.entries(this.leaders.get(p.serverId)??{}).sort((a,b)=>b[1].power-a[1].power);
  const mine=rows.findIndex(([k])=>k===p.key);return {rows:rows.slice(0,10).map(([k,v],i)=>({rank:i+1,me:k===p.key,...v})),me:mine<0?null:{rank:mine+1,...rows[mine][1]},arena:this.arenaView(p)};}

 refreshStats(p){
  const who=this.who(p),pet=activePremiumPet(p.petCollection)?.bonus??{},food=foodBuff(p.world),sig=JSON.stringify([who,p.stats,p.gear,pet,food]);if(sig===p.statSig)return;
  const fit=dropInvalidGear(p.bag,p.gear,who);if(JSON.stringify(fit.gear)!==JSON.stringify(p.gear)){p.gear=fit.gear;this.setBag(p,fit.bag);}
  p.statSig=JSON.stringify([who,p.stats,p.gear,pet,food]);p.derived=deriveStats({...who,stats:p.stats,gear:p.gear,pet,food});p.world.applyDerived(p.derived);this.rank(p);
 }
 itemFail(p,code){p.world.emit('notice',{text:ALBUM_ERRORS[code]??PET_SKILL_ERRORS[code]??ITEM_ERRORS[code]??SOCIAL_ERRORS[code]??code});return false;}
 // ---- 0.49 timed MVP and party dungeon.
 mvpState(serverId){let s=this.mvps.get(serverId);if(!s){s={nextAt:this.born+MVP_FIRST};this.mvps.set(serverId,s);}return s;}
 // A fresh room hides its MVP until the server-wide timer is due, so leaving and re-entering cannot reset it.
 wakeMvp(room){const wait=(this.mvpState(room.serverId).nextAt-this.now())/1000;for(const m of room.mobs)if(MONSTER_TYPES[m.type].mvp&&wait>0){m.hp=0;m.dead=wait;}this.mapBosses.wake(room,MONSTER_TYPES);}
 // 0.109.7 back-office weather: an override per realm (all outdoor maps, or one map) for some minutes; clients get the
 // time left with every snapshot and fall back to the clock-rolled weather when it runs out or is cleared.
 setWeather({serverId='server-1',weather,minutes=30,mapId=null}={}){
  this.weatherOverrides??=new Map();
  if(weather==='auto'){this.weatherOverrides.delete(serverId);return null;}
  if(!WEATHERS[weather])throw new Error('bad-weather');
  const mins=Math.min(24*60,Math.max(1,Math.round(Number(minutes)||30)));
  if(mapId!==null&&!this.catalog.maps.some(m=>m.id===mapId&&!m.instance))throw new Error('bad-map');
  const o={id:weather,mapId,until:this.now()+mins*60e3};this.weatherOverrides.set(serverId,o);return this.weatherState(serverId);
 }
 weatherState(serverId){const o=this.weatherOverrides?.get(serverId);if(!o)return null;const left=o.until-this.now();
  if(left<=0){this.weatherOverrides.delete(serverId);return null;}return {id:o.id,mapId:o.mapId,left};}
 mvpInfo(serverId){const s=this.mvpState(serverId),type=MONSTER_TYPES.find(t=>t.mvp),map=this.catalog.maps.find(m=>m.mobs?.some(([,,t])=>MONSTER_TYPES[t]?.mvp));
  return type&&map?{name:type.name,map:map.name,in:Math.max(0,Math.ceil((s.nextAt-this.now())/1000))}:null;}
 // 0.109.8 back-office world boss: a one-off boss on any outdoor field map; it does not respawn and does not touch the
 // timed MVP's clock. Top damage gets the MVP prize, the whole realm hears about it.
 summonBoss({serverId='server-1',mapId,channel=null,typeId=null,count=1,x=null,z=null}={}){
  const map=this.catalog.maps.find(m=>m.id===mapId);if(!map||map.instance||map.guildHall||map.safe)throw new Error('bad-map');
  const t=typeId===null||typeId===undefined||typeId===''?MONSTER_TYPES.findIndex(x=>x.mvp):Number(typeId),type=MONSTER_TYPES[t];
  if(!type?.boss)throw new Error('bad-boss');
  const ch=channel===null?null:Number(channel);if(ch!==null&&(!Number.isInteger(ch)||ch<1||ch>5))throw new Error('bad-channel');
  const legacy=serverId+':'+map.id,roomId=ch!==null?serverId+':ch'+ch+':'+map.id:this.rooms.has(legacy)?legacy:this.rooms.has(serverId+':ch1:'+map.id)?serverId+':ch1:'+map.id:legacy;let room=this.rooms.get(roomId);
  if(!room){const simulation=new CombatWorld({...map});room={id:roomId,map,serverId,channel:ch,peers:new Set(),mobs:simulation.mobs,events:[],history:[],contributors:new Map()};this.rooms.set(roomId,room);this.wakeMvp(room);}
  // 0.109.9 any number (up to 20 per call, 60 alive per map), at a chosen spot or random; a chosen spot snaps to the nearest
  // walkable ground, and a group spreads in a ring around it
  const n=Math.min(20,Math.max(1,Math.round(Number(count)||1)));
  if(room.mobs.filter(m=>m.summoned&&m.hp>0).length+n>60)throw new Error('boss-many');
  const near=(cx,cz)=>{for(let r=0;r<=8;r+=.5)for(let a=0;a<16;a++){const x=cx+Math.cos(a/8*Math.PI)*r,z=cz+Math.sin(a/8*Math.PI)*r;if(walkable(x,z,.28,map.nav))return {x,z};if(!r)break;}return null;};
  let at=null;if(Number.isFinite(x)&&Number.isFinite(z)){at=near(x,z);if(!at)throw new Error('bad-spot');}
  const placed=[];
  for(let i=0;i<n;i++){
   const spot=at?(i?near(at.x+Math.cos(i*2.4)*2.2,at.z+Math.sin(i*2.4)*2.2)??at:at):randomSpot(map.nav)??map.spawn,hp=type.hp;
   room.mobs.push({id:room.mobs.length,type:t,pack:null,leader:false,x:spot.x,z:spot.z,home:{x:spot.x,z:spot.z},hp,maxHp:hp,attackCD:0,root:0,dead:0,hit:0,aggro:false,step:0,summoned:true});placed.push(spot);
  }
  this.announce(serverId,`👑 บอสโลก ${type.name}${n>1?' ×'+n:''} ปรากฏตัวที่ ${map.name}!`);
  return {name:type.name,map:map.name,count:n,x:Math.round(placed[0].x),y:Math.round(-placed[0].z)};
 }
 summonDown(room,mob){
  const type=MONSTER_TYPES[mob.type];mob.dead=1e9;
  const damage=[...(room.bossDamage?.get(mob.id)??[])].filter(([id])=>this.peers.get(id)?.room===room).sort((a,b)=>b[1]-a[1]);room.bossDamage?.delete(mob.id);
  const winner=damage[0]&&this.peers.get(damage[0][0]);
  if(winner){this.grantLoot(winner,{coins:0,items:[{id:'king-ember',count:1}]});winner.saveNow=true;winner.world.emit('mvp',{name:type.name});}
  this.herald(room.serverId,winner?`👑 ${winner.character.name} ปราบบอสโลก ${type.name} ได้!`:`บอสโลก ${type.name} ถูกปราบแล้ว`);
 }
 mvpDown(room,mob){
  const s=this.mvpState(room.serverId),type=MONSTER_TYPES[mob.type];s.nextAt=this.now()+MVP_INTERVAL;mob.dead=MVP_INTERVAL/1000;
  const damage=[...(room.mvpDamage??[])].filter(([id])=>this.peers.get(id)?.room===room).sort((a,b)=>b[1]-a[1]);room.mvpDamage=new Map();
  const winner=damage[0]&&this.peers.get(damage[0][0]);
  if(winner){this.grantLoot(winner,{coins:0,items:[{id:'king-ember',count:1}]});winner.saveNow=true;winner.world.emit('mvp',{name:type.name});}
  logMvp(this.logs,this.now(),type.name,room.channel??1,room.map.id,winner?.character?.name);
  this.herald(room.serverId,winner?`👑 ${winner.character.name} ได้ MVP ${type.name}! · กลับมาอีกใน 60 นาที`:`${type.name} ถูกปราบแล้ว · กลับมาอีกใน 60 นาที`);
 }
 worldSay(serverId,{actor,name,text}){logChat(this.logs,this.now(),'โลก','all',name,text);const message={type:'chat',id:randomUUID(),actor,name,text,channel:'world',time:this.now()};for(const o of this.peers.values())if(o.serverId===serverId&&!o.suspended)o.send(message);}
 announce(serverId,text){const message={type:'chat',id:randomUUID(),actor:null,name:'ประกาศ',text,channel:'system',time:this.now()};for(const o of this.peers.values())if(o.serverId===serverId&&!o.suspended)o.send(message);}
 dungeonClear(room){
  const today=thaiDay(this.now());
  for(const id of room.peers){const a=this.peers.get(id);if(a.suspended)continue;
   if(a.dungeonDay===today){a.world.notice('ล้างดันเจี้ยนสำเร็จ · วันนี้รับรางวัลไปแล้ว (รีเซ็ตเที่ยงคืน)');continue;}
   a.dungeonDay=today;this.grantLoot(a,structuredClone(DUNGEON_REWARD));a.saveNow=true;a.world.emit('dungeonClear',{reward:DUNGEON_REWARD,map:room.map.name});}
 }
 // ---- 0.47 friends (mutual, kept in each private profile) and guilds (one shared doc each, persisted by the host via onGuild).
 online(key,serverId=null){for(const o of this.peers.values())if(o.key===key&&(!serverId||o.serverId===serverId)&&!o.suspended)return o;return null;}
 byName(p,name){for(const o of this.peers.values())if(o!==p&&o.serverId===p.serverId&&!o.suspended&&o.character.name===name)return o;return null;}
 guildOf(p){const g=p.guildId&&this.guilds.get(p.guildId);return g&&g.serverId===p.serverId&&g.members.some(x=>x.key===p.key)?g:null;}
 guildTag(p){const g=this.guildOf(p);return g?{name:g.name,emblem:g.emblem,...(g.castle?{castle:true}:{})}:null;}
 renamed(p){
  this.rank(p);
  for(const g of this.guilds.values()){const m=g.serverId===p.serverId&&g.members.find(m=>m.key===p.key);if(m&&m.name!==p.character.name){m.name=p.character.name;this.guildChanged(g);}}
  for(const shop of this.shops.values())if(shop.serverId===p.serverId&&shop.ownerKey===p.key&&shop.ownerName!==p.character.name){shop.ownerName=p.character.name;this.onShop?.(shop,false);}
  for(const other of this.peers.values())if(other.serverId===p.serverId)for(const f of other.friends)if(f.key===p.key)f.name=p.character.name;
  const board=this.leaders.get('arena:'+p.serverId);if(board?.rows?.[p.key]){board.rows[p.key].name=p.character.name;this.leadersDirty.add('arena:'+p.serverId);}
  this.social(p.room);
 }
 sendFriends(p){p.world.emit('friends',{list:p.friends.map(f=>{const o=this.online(f.key);return {name:o?.character.name??this.leaders.get(p.serverId)?.[f.key]?.name??f.name,online:!!o,map:o?.room.map.name??null};})});}
 guildView(g,viewerKey=null){if(!g)return null;const exp=g.exp??0,level=guildLevel(exp),goal=this.guildGoal(g);
  return {name:g.name,emblem:g.emblem,level,exp,...(viewerKey&&g.members.some(x=>x.key===viewerKey)&&['leader','deputy'].includes(this.guildRank(g,viewerKey))?{applications:this.guildApplications(g).map(a=>({id:a.id,name:a.name,level:a.level,classId:a.classId,at:a.at}))}:{}),next:GUILD_LEVELS[level]??null,treasury:g.treasury??0,notice:g.notice??'',upgrades:{flag:0,armory:0,stable:0,...g.upgrades},seats:guildSeats(g),
   rite:Math.max(0,Math.ceil(((g.rite??0)-this.now())/1000)),goal:{kills:goal.kills,need:GUILD_GOAL.kills,done:goal.done},
   members:g.members.map(x=>{const o=this.online(x.key,g.serverId);return {name:x.name,leader:x.key===g.leader,rank:this.guildRank(g,x.key),contrib:x.contrib??0,online:!!o,map:o?.room.map.name??null};})};}
 guildChanged(g){this.guildsDirty.delete(g);this.onGuild?.(g,false);for(const x of g.members){const o=this.online(x.key,g.serverId);if(o){o.guildId=g.id;o.world.emit('guild',{guild:this.guildView(g,o.key)});}}}
 guildChat(g,text){const message={type:'chat',id:randomUUID(),actor:null,name:'กิลด์',text,channel:'guild',time:this.now()};for(const x of g.members)this.online(x.key,g.serverId)?.send(message);}
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
 guildApplications(g){return (Array.isArray(g.applications)?g.applications:[]).filter(a=>a&&typeof a.id==='string'&&typeof a.key==='string'&&typeof a.name==='string'&&Number.isFinite(a.at)&&this.now()-a.at<GUILD_APPLICATION_TTL);}
 clearGuildApplications(key,serverId,except=null){for(const g of this.guilds.values())if(g.serverId===serverId&&g.id!==except&&this.guildApplications(g).some(a=>a.key===key)){g.applications=this.guildApplications(g).filter(a=>a.key!==key);this.guildChanged(g);}}
 sendGuildDirectory(p,query=''){
  const q=cleanName(query).slice(0,32),find=q.toLocaleLowerCase(),matches=[...this.guilds.values()].filter(g=>g.serverId===p.serverId&&g.name.toLocaleLowerCase().includes(find));
  matches.sort((a,b)=>Number(b.name.toLocaleLowerCase().startsWith(find))-Number(a.name.toLocaleLowerCase().startsWith(find))||guildLevel(b.exp??0)-guildLevel(a.exp??0)||a.name.localeCompare(b.name,'th'));
  p.world.emit('guildDirectory',{query:q,total:matches.length,more:matches.length>GUILD_SEARCH_LIMIT,list:matches.slice(0,GUILD_SEARCH_LIMIT).map(g=>({id:g.id,name:g.name,emblem:g.emblem,level:guildLevel(g.exp??0),members:g.members.length,seats:guildSeats(g),leader:g.members.find(x=>x.key===g.leader)?.name??'',online:g.members.filter(x=>{const o=this.online(x.key,p.serverId);return !!o;}).length,notice:g.notice??'',applied:this.guildApplications(g).some(a=>a.key===p.key)}))});
 }
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
  if(m.type==='guildSearch'){if(m.query!==undefined&&typeof m.query!=='string')return fail('bad-count');this.sendGuildDirectory(p,m.query);return true;}
  if(m.type==='guildApply'){
   const reject=c=>{w.emit('guildApplication',{guild:m.guild,ok:false,pending:false});return fail(c);},target=this.guilds.get(m.guild);
   if(!target||target.serverId!==p.serverId)return reject('guild-missing');
   // 0.114.2 each apply/cancel is a guild write: 10 at once, then one back every 6 s, so toggling can't burn the quota.
   const now=this.now();p.guildApplyBudget=Math.min(10,(p.guildApplyBudget??10)+(now-(p.guildApplyAt??now))/6000);p.guildApplyAt=now;if(p.guildApplyBudget<1)return reject('rate-limit');
   if(m.cancel===true){const requests=this.guildApplications(target);if(requests.some(a=>a.key===p.key)){target.applications=requests.filter(a=>a.key!==p.key);this.guildChanged(target);p.guildApplyBudget--;}w.emit('guildApplication',{guild:target.id,ok:true,pending:false});return true;}
   if(g)return reject('guild-already');if(target.members.length>=guildSeats(target))return reject('guild-full');
   const requests=this.guildApplications(target);
   if(!requests.some(a=>a.key===p.key)){
    if(requests.length>=GUILD_APPLICATION_MAX)return reject('guild-applications-full');
    if([...this.guilds.values()].filter(x=>x.serverId===p.serverId&&this.guildApplications(x).some(a=>a.key===p.key)).length>=GUILD_APPLICATION_LIMIT)return reject('guild-application-limit');
    requests.push({id:randomUUID(),key:p.key,name:p.character.name,level:baseProgress(w).level,classId:p.character.classId,at:this.now()});target.applications=requests;this.guildChanged(target);p.guildApplyBudget--;
   }
   w.emit('guildApplication',{guild:target.id,ok:true,pending:true});w.notice('ส่งคำขอเข้ากิลด์ '+target.name+' แล้ว รอหัวหน้าหรือรองหัวหน้าอนุมัติ');return true;
  }
  if(m.type==='guildApplicationAnswer'){
   if(!g)return fail('guild-none');if(!staff)return fail('guild-rank');if(typeof m.accept!=='boolean')return fail('bad-count');
   const requests=this.guildApplications(g),a=requests.find(a=>a.id===m.application);if(!a)return fail('guild-application-missing');
   const o=this.online(a.key,p.serverId),remove=()=>{g.applications=requests.filter(x=>x!==a);};
   if(!m.accept){remove();this.guildChanged(g);if(o?.serverId===p.serverId){o.world.emit('guildApplication',{guild:g.id,ok:true,pending:false});o.world.notice('กิลด์ '+g.name+' ไม่รับคำขอเข้าร่วม');}return true;}
   if([...this.guilds.values()].some(x=>x.serverId===p.serverId&&x.members.some(m=>m.key===a.key))){remove();this.guildChanged(g);return fail('guild-target');}
   if(g.members.length>=guildSeats(g))return fail('guild-full');
   remove();this.clearGuildApplications(a.key,p.serverId,g.id);g.members.push({key:a.key,name:a.name});this.guildChanged(g);this.guildChat(g,a.name+' เข้าร่วมกิลด์');if(o?.serverId===p.serverId){o.world.emit('guildApplication',{guild:g.id,ok:true,pending:false});o.world.notice('เข้าร่วมกิลด์ '+g.name+' แล้ว');}return true;
  }
  if(m.type==='guildInfo'){w.emit('guild',{guild:this.guildView(g,p.key)});return true;}
  if(m.type==='guildCreate'){if(g)return fail('guild-already');const name=validGuildName(m.name);if(!name)return fail('guild-name');if(!validEmblem(m.emblem))return fail('bad-count');
   if([...this.guilds.values()].some(x=>x.serverId===p.serverId&&x.name.toLowerCase()===name.toLowerCase()))return fail('guild-taken');
   if(p.bag.coins<GUILD_COST)return fail('no-coins');const b=normalizeBag(p.bag);b.coins-=GUILD_COST;this.setBag(p,b);p.saveNow=true;
   const ng={id:randomUUID(),serverId:p.serverId,name,emblem:m.emblem,leader:p.key,members:[{key:p.key,name:p.character.name}],created:this.now()};
   logGuild(this.logs,this.now(),p.character.name,name);
   this.clearGuildApplications(p.key,p.serverId);this.guilds.set(ng.id,ng);this.guildChanged(ng);w.notice('ก่อตั้งกิลด์ '+name+' แล้ว');return true;}
  if(m.type==='guildInvite'){if(!g)return fail('guild-none');if(!staff)return fail('guild-rank');if(g.members.length>=guildSeats(g))return fail('guild-full');
   const o=this.byName(p,cleanName(m.name));if(!o)return fail('whisper-offline');if(this.guildOf(o))return fail('guild-target');
   o.guildAsk=g.id;o.world.emit('guildAsk',{guild:g.id,name:g.name,emblem:g.emblem,from:p.character.name});w.notice('ส่งคำเชิญเข้ากิลด์ถึง '+o.character.name+' แล้ว');return true;}
  if(m.type==='guildAnswer'){const ng=this.guilds.get(m.guild);if(!ng||p.guildAsk!==ng.id)return fail('guild-invite');p.guildAsk=null;
   if(!m.accept)return true;if(g)return fail('guild-already');if(ng.members.length>=guildSeats(ng))return fail('guild-full');
   this.clearGuildApplications(p.key,p.serverId,ng.id);ng.applications=this.guildApplications(ng).filter(a=>a.key!==p.key);ng.members.push({key:p.key,name:p.character.name});this.guildChanged(ng);this.guildChat(ng,p.character.name+' เข้าร่วมกิลด์');return true;}
  if(m.type==='guildLeave'||m.type==='guildKick'){if(!g)return fail('guild-none');if(m.type==='guildKick'&&!staff)return fail('guild-rank');
   const gone=m.type==='guildLeave'?g.members.find(x=>x.key===p.key):g.members.find(x=>x.name===m.name&&x.key!==p.key);if(!gone)return fail('guild-none');
   // A deputy may only remove plain members; the leader may remove anyone.
   if(m.type==='guildKick'&&rank==='deputy'&&this.guildRank(g,gone.key)!=='member')return fail('guild-rank');
   g.members=g.members.filter(x=>x!==gone);
   const o=this.online(gone.key,g.serverId);if(o){o.guildId=null;o.world.emit('guild',{guild:null});o.world.notice(m.type==='guildLeave'?'ออกจากกิลด์แล้ว':'ถูกเชิญออกจากกิลด์ '+g.name);this.guildEvict(o);}
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
  if(p.mailMutationBusy){(p.mailLootQueue??=[]).push({loot:copy(loot),at:at?copy(at):null});return;}
  if(!loot.coins&&!loot.items.length)return;
  const r=addLoot(p.bag,loot);this.setBag(p,r.bag);
  p.world.emit('loot',{coins:r.coins,items:r.added,lost:r.lost,x:at?.x??null,z:at?.z??null});
  // 0.64 a purple or gold drop from a monster is announced to the whole channel.
  // 0.117 graded gear: only orange and red grades (not an affix bump) are announced, with the grade's name.
  const loud=d=>d?.graded?(d.grade??0)>=3:d?.rarity>=3;
  const best=at?r.added.map(i=>itemDef(i.id)).filter(loud).sort((a,b)=>b.rarity-a.rarity)[0]:null;
  if(best)this.announce(p.serverId,`✦ ${p.character.name} ได้ ${best.name} [${best.graded?GRADES[best.grade??0].name:RARITY_NAME[best.rarity]}] ที่ ${p.room.map.name}`);

 }
 progress(p){return {classId:p.character.classId,jobId:p.character.jobId??'',jobXp:p.world.jobXp};}
 emoteView(p){const emote=activeEmote(p.world.emote,p.world.time);return emote?{name:emote.name,time:this.clock-Math.max(0,p.world.time-emote.time)}:null;}
 snapshot(p,{delta=false}={}){
  this.refreshStats(p);
  this.expireStall(p);if(p.stall&&Math.hypot(p.world.player.x-p.stall.x,p.world.player.z-p.stall.z)>3){p.stall=null;p.world.notice('เดินออกจากแผง · ปิดแผงแล้ว');}
  const publicPlayer=a=>({id:a.id,character:a.character,equipment:a.equipment,player:a.world.player,emote:this.emoteView(a),partyId:a.partyId});
  const visible=[...p.room.peers].map(id=>this.peers.get(id)).filter(a=>a!==p&&!a.observer&&(distance(a.world.player,p.world.player)<45||a.partyId&&a.partyId===p.partyId)),seen=new Set(visible.map(a=>a.id)),round=n=>Math.round(n*1000)/1000;
  // 0.99.11 during the snapshot broadcast each player's public entry is built and cloned once, then shared by every viewer
  const entry=a=>{if(!this.broadcasting||a.entryTick!==this.tickId){const v=a.world.player;a.entryTick=this.tickId;a.entry=copy({id:a.id,equipment:a.equipment,player:{x:round(v.x),z:round(v.z),hp:v.hp,maxHp:v.maxHp,down:Math.max(0,Math.ceil(v.down??0)),moving:v.moving,running:v.running===true,face:{x:round(v.face.x),z:round(v.face.z)}},emote:this.emoteView(a),partyId:a.partyId,connected:!a.suspended,pet:activePremiumPet(a.petCollection)?.id??null,stall:a.stall?.title??null,guild:this.guildTag(a),rebirth:a.rebirth??0});a.entryKeys=Object.fromEntries(PLAYER_STATIC.map(k=>[k,JSON.stringify(a.entry[k]??null)]));}return a.entry;};
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
  const prev=p.sentSig??={},nextSig={character:JSON.stringify(p.character),equipment:JSON.stringify(p.equipment),training:JSON.stringify(p.training),skillLevels:JSON.stringify(p.world.skillLevels),skillPoints:availablePoints(p.skills,this.progress(p)),story:JSON.stringify(p.story),bounty:JSON.stringify(normalizeBounty(p.bounty,this.now())),weekly:JSON.stringify(normalizeWeekly(p.weekly,this.now())),album:JSON.stringify([p.album,p.albumRewards]),pet:JSON.stringify(p.pet),mailbox:JSON.stringify(inboxSummary(p.mailbox,this.mailAnnouncements??[],p.serverId)),petCollection:JSON.stringify(publicPetAccount(p.petCollection)),mvp:JSON.stringify(this.mvpInfo(p.serverId)),stall:p.stall?.title??null,guild:JSON.stringify(this.guildTag(p)),stats:JSON.stringify([p.stats,p.gear,p.statSig])};
  const chg=k=>!delta||prev[k]!==nextSig[k];
  const sp={...p.world.player,x:round(p.world.player.x),z:round(p.world.player.z),face:{x:round(p.world.player.face.x),z:round(p.world.player.face.z)}};
  const self={observer:p.observer===true,canObserve:p.canObserve===true,id:p.id,mapId:p.room.map.id,arenaRoom:p.room.map.id===ARENA_MAP?arenaView(this,p).mine:null,walkSchema:1,walkRunSchema:this.runEnabled?1:0,walkRoute:walkView(p),inputAck:p.appliedInputSeq??0,player:sp,emote:this.emoteView(p),partyId:p.partyId,cooldowns:p.world.cooldowns.map(round),kills:p.world.kills,baseXp:p.world.baseXp,jobXp:p.world.jobXp,targetId:p.world.targetId,auto:p.world.auto,autoTarget:p.world.autoTarget??null,hunt:p.world.hunt??null,war:this.warView(p),duel:p.duel?{foe:p.world.foe,left:Math.max(0,Math.ceil((p.duel.until-this.now())/1000))}:null,adventurerSchema:1,adventurers:adventurerViews(p.room.map,this.now()/1000),mercenary:p.world.merc?.id?adventurerContract(p.world.merc):null,merc:p.world.merc?Math.ceil(p.world.merc.left):0,rebirth:p.rebirth??0,status:p.world.status,roleSchema:this.roleSkills?1:0,spiritCompanionSchema:this.spiritCompanions?1:0,supportTargetId:p.world.supportTargetId??p.id,supportRoster:p.world.roleAllies?.().map(a=>({id:a.id,name:this.peers.get(a.id)?.character.name??p.character.name,x:a.player.x,z:a.player.z,hp:a.player.hp,maxHp:a.player.maxHp,down:a.player.down})),rolePets:p.world.roleCombat?.state.pets.map(a=>({kind:a.kind,x:a.x,z:a.z,left:a.left,power:a.power})),food:p.world.food?.left>0?{id:p.world.food.id,left:Math.ceil(p.world.food.left)}:null,...(chg('character')?{character:p.character}:{}),...(chg('equipment')?{equipment:p.equipment}:{}),...(chg('training')?{training:p.training}:{}),...(chg('skillLevels')?{skillLevels:p.world.skillLevels}:{}),...(chg('skillPoints')?{skillPoints:nextSig.skillPoints}:{}),...(chg('story')?{story:p.story}:{}),...(chg('bounty')?{bounty:normalizeBounty(p.bounty,this.now())}:{}),...(chg('weekly')?{weekly:normalizeWeekly(p.weekly,this.now())}:{}),...(chg('album')?{album:p.album,albumRewards:p.albumRewards,albumSchema:2}:{}),...(chg('pet')?{pet:p.pet}:{}),...(chg('mailbox')?{mailbox:inboxSummary(p.mailbox,this.mailAnnouncements??[],p.serverId)}:{}),...(chg('petCollection')?{petCollection:publicPetAccount(p.petCollection)}:{}),...(chg('mvp')?{mvp:this.mvpInfo(p.serverId)}:{}),...(chg('stall')?{stall:nextSig.stall}:{}),...(chg('guild')?{guild:this.guildTag(p)}:{}),...(chg('stats')?{stats:p.stats,gear:p.gear,statPoints:statPoints(p.stats,this.who(p).level,p.rebirth??0),derived:p.derived}:{}),...(p.bagSent!==p.bagVersion?(p.bagSent=p.bagVersion,{bag:p.bag}):{})};
  Object.assign(prev,nextSig);
  return {...copy({tick:this.tickId,time:round(this.clock),weather:this.weatherState(p.serverId),self,roleFields:[...p.room.peers].flatMap(id=>{const a=this.peers.get(id);return !a||a.suspended?[]:(a.world.roleCombat?.state.fields??[]).filter(f=>distance(f,p.world.player)<35).map(f=>({owner:id,x:f.x,z:f.z,left:round(f.left),radius:f.radius,kind:f.kind,skillId:f.skillId}));}),rolePets:[...p.room.peers].flatMap(id=>{const a=this.peers.get(id);return !a||a.suspended?[]:(a.world.roleCombat?.state.pets??[]).filter(t=>distance(t,p.world.player)<25).map(t=>({owner:id,id:t.id,kind:t.kind,skillId:t.skillId,tier:t.tier,spawnedAt:Number.isFinite(t.spawnedAt)?t.spawnedAt+this.clock-a.world.time:undefined,endsAt:Number.isFinite(t.endsAt)?t.endsAt+this.clock-a.world.time:undefined,maxLeft:t.maxLeft,attackAt:Number.isFinite(t.attackAt)?t.attackAt+this.clock-a.world.time:null,targetId:t.targetId,face:t.face?{x:round(t.face.x),z:round(t.face.z)}:null,x:round(t.x),z:round(t.z),attacking:t.tick>.85,left:round(t.left)}));})}),players,mobs:copy(this.mobDelta(p))};
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
 travelDestination(p,id,{warp=false,respawn=false}={}){
  if(respawn){
   const destination=this.catalog.maps.find(m=>m.id===id);
   if(p.world.player.hp>0||id!==this.catalog.capital||!destination)throw Error('respawn-invalid');
   if((this.rooms.get(p.serverId+':'+id)?.peers.size??0)>=this.capacity)throw Error('room-full');
   cancelWalk(p);this.endTrade(p,'อีกฝ่ายเดินทางไปแล้ว');p.stall=null;p.world.clearEmote();
   p.input={x:0,z:0,attack:false,run:false};return destination;
  }
  const portal=p.room.map.portals?.find(v=>v.to===id&&distance(v,p.world.player)<2.6);
  const destination=this.catalog.maps.find(m=>m.id===id);
  if(id===ARENA_MAP){const room=arenaReservation(this,p.key);if(!destination||!room||p.duel||p.trade||p.world.player.hp<=0)throw Error('arena-not-ready');return destination;}
  if(p.room.map.id===ARENA_MAP&&id===this.catalog.capital){if(p.duel)this.endDuel(this.peers.get(p.duel.foe),p,'ออกจากสนาม');return destination;}
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
 record(p,original){this.rank(p);return {...copy(original),identityReceipts:copy(p.identityReceipts??[]),walkRoute:walkSave(p),character:copy(p.character),equipment:normalizeEquipment(p.equipment,p.character.classId),training:copy(p.training),skills:copy(p.skills),roleSkillBackup:copy(p.roleSkillBackup??original.roleSkillBackup??null),...(this.roleSkills?{roleCooldowns:{version:1,at:this.now(),values:p.world.cooldowns.map(v=>Math.max(0,v)),down:p.world.player.hp<=0?p.world.player.down:0}}:{}),story:copy(p.story),bag:copy(p.bag),storage:copy(p.storage),friends:copy(p.friends),daily:copy(p.daily),dungeonDay:p.dungeonDay,bounty:copy(p.bounty),weekly:copy(p.weekly),rebirth:p.rebirth??0,xpCurve:XP_CURVE,album:copy(p.album),albumRewards:copy(p.albumRewards),albumSchema:2,trade:{xp:p.tradeXp??0},pet:null,mailbox:copy(p.mailbox),petCollection:copy(p.petCollection),stats:copy(p.stats),gear:copy(p.gear),state:{...copy(original.state),settings:copy(p.settings),mapId:p.room.map.id,position:{x:p.world.player.x,z:p.world.player.z},traveler:serializeTraveler(p.world)}};}
}
