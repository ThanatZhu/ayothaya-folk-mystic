// Ragnarok-style status (STR AGI VIT INT DEX LUK) and stat-bearing gear (weapon / armor / accessory).
// Pure rules shared by the client (offline guests + UI) and the realm server. Gear lives in the bag until
// equipped; it is separate from the cosmetic look in equipment.js, so costumes stay free choices.
import {BAG_SLOTS,bagCap,ITEMS,normalizeBag,itemDef,composeId} from './items.js?v=107';
import {dodgeChance,monsterHit} from './combat-formulas.js';

export const STATS=['str','agi','vit','int','dex','luk'];
export const STAT_LABEL={str:'STR',agi:'AGI',vit:'VIT',int:'INT',dex:'DEX',luk:'LUK'};
export const STAT_HINT={str:'พลังโจมตีกายภาพ',agi:'ความเร็วโจมตี · หลบหลีก',vit:'HP · ลดความเสียหาย',int:'พลังเวท · MP',dex:'ความแม่นยำ · พลังธนู · ความเร็ว',luk:'คริติคอล · โชค'};
// 0.85 six gear slots (owner request): saves from before keep their three, the new ones start empty.
export const STAT_MAX=99,GEAR_SLOTS=['weapon','head','armor','garment','shoes','accessory'];
const MAGIC=new Set(['shaman','acolyte']),RANGED=new Set(['hunter']);

export function normalizeStats(stats){
 const s=stats&&typeof stats==='object'?stats:{},out={};
 for(const k of STATS)out[k]=Number.isSafeInteger(s[k])?Math.min(Math.max(s[k],1),STAT_MAX):1;
 return out;
}
// Cost to raise a stat from x to x+1 (Ragnarok curve: 2 points up to 10, then +1 every 10).
export const raiseCost=x=>Math.floor((x-1)/10)+2;
// Points earned by Base Level L: 3 + floor(level/5) for every level gained after 1.
// 0.102 rebirth: each one (up to REBIRTH_MAX) adds REBIRTH_POINTS on top of what the levels earn
export const REBIRTH_POINTS=40,REBIRTH_MAX=10;
// 0.104 each rebirth also adds REBIRTH_STAT to every final stat, past STAT_MAX; the allocated values stay capped at 99
export const REBIRTH_STAT=2,rebirthStatBonus=n=>Math.min(REBIRTH_MAX,Math.max(0,n|0))*REBIRTH_STAT;
// 0.103.2 the title shown above a reborn character's name (index = times reborn)
export const REBIRTH_RANKS=['','ผู้จุติ','ยอดฝีมือ','ขุนพล','จอมยุทธ์','ปรมาจารย์','ผู้วิเศษ','เทพยุทธ์','มหาเทพ','ราชันย์','ตำนานอโยธยา'];
export const rebirthRank=n=>REBIRTH_RANKS[Math.min(REBIRTH_MAX,Math.max(0,n|0))]??'';
export function earnedStatPoints(level,reborn=0){let n=0;for(let l=2;l<=level;l++)n+=3+Math.floor(l/5);return n+Math.min(REBIRTH_MAX,Math.max(0,reborn|0))*REBIRTH_POINTS;}
export function spentStatPoints(stats){const s=normalizeStats(stats);let n=0;for(const k of STATS)for(let x=1;x<s[k];x++)n+=raiseCost(x);return n;}
export const statPoints=(stats,level,reborn=0)=>earnedStatPoints(level,reborn)-spentStatPoints(stats);

export function raiseStat(stats,stat,level,reborn=0){
 if(!STATS.includes(stat))throw new Error('bad-stat');
 const s=normalizeStats(stats);if(s[stat]>=STAT_MAX)throw new Error('stat-max');
 if(statPoints(s,level,reborn)<raiseCost(s[stat]))throw new Error('no-stat-points');
 return {...s,[stat]:s[stat]+1};
}

export function normalizeGear(gear){
 const g=gear&&typeof gear==='object'?gear:{},out={};
 for(const slot of GEAR_SLOTS){const id=g[slot];out[slot]=itemDef(id)?.kind==='gear'&&itemDef(id).slot===slot?id:null;}
 return out;
}
export function canWear(id,{classId,level,reborn=0}){
 const it=itemDef(id);if(it?.kind!=='gear')return 'not-gear';
 if(it.classes&&!it.classes.includes(classId))return 'wrong-class';
 // a reborn character keeps wearing the gear it earned before going back to Lv.1
 if(!reborn&&(it.level??1)>level)return 'low-level';
 return null;
}
// Equip from the bag; whatever was in that slot goes back into the bag.
export function equipGear(bag,gear,id,who){
 const why=canWear(id,who);if(why)throw new Error(why);
 const b=normalizeBag(bag),g=normalizeGear(gear),slot=itemDef(id).slot;
 if(!b.items[id])throw new Error('no-item');
 b.items[id]--;if(!b.items[id])delete b.items[id];
 if(g[slot])b.items[g[slot]]=(b.items[g[slot]]??0)+1;
 g[slot]=id;return {bag:b,gear:g};
}
export function unequipGear(bag,gear,slot){
 const b=normalizeBag(bag),g=normalizeGear(gear);
 if(!GEAR_SLOTS.includes(slot)||!g[slot])throw new Error('slot-empty');
 if(!(g[slot] in b.items)&&Object.keys(b.items).length>=bagCap(b))throw new Error('bag-full');
 b.items[g[slot]]=(b.items[g[slot]]??0)+1;g[slot]=null;return {bag:b,gear:g};
}
// Gear that no longer fits (class change, e.g. Novice → Swordsman) goes back to the bag.
export function dropInvalidGear(bag,gear,who){
 let b=normalizeBag(bag),g=normalizeGear(gear);
 for(const slot of GEAR_SLOTS)if(g[slot]&&canWear(g[slot],who)){b.items[g[slot]]=(b.items[g[slot]]??0)+1;g[slot]=null;}
 return {bag:b,gear:g};
}

// Everything combat needs, from level + class + stats + worn gear. At Lv1 with no stats/gear it equals the
// pre-0.43 numbers (140 HP, 100 MP, class damage, no defence), so existing balance is the floor.
// 0.72 combat power for the leaderboard: one number from damage per second, survivability, evasion and level.
export function combatPower(d,level=1){
 if(!d)return 0;const dmg=Math.max(d.atk??0,d.matk??0)*(1+(d.crit??0)*.5)/Math.max(.5,d.delay??1);
 return Math.round(dmg*6+(d.maxHp??0)*.6+(d.maxMp??0)*.2+(d.def??0)*12+(d.flee??0)*1500+level*25);
}
export function deriveStats({level=1,classId='novice',stats,gear,pet=null,food=null,reborn=0}){
 const s=normalizeStats(stats),g=normalizeGear(gear),worn=GEAR_SLOTS.map(k=>g[k]&&itemDef(g[k])).filter(Boolean);
 // Refine: weapons +max(2, 8% of base) ATK/MATK per level, armor +1 DEF per level.
 const up=(it,k)=>(it[k]??0)?(it[k]+it.refine*Math.max(2,Math.round(it[k]*.08))):0;
 const cards=worn.map(it=>it.card&&ITEMS[it.card]?.effect).filter(Boolean),sum=f=>cards.reduce((n,e)=>n+(f(e)??0),0);
 const add=k=>worn.reduce((n,it)=>n+(it.bonus?.[k]??0),0)+sum(e=>e.bonus?.[k])+(pet?.[k]??0)+(food?.[k]??0),S={}; // pet: loyal pet bonus (0.50); food: meal buff (0.94)
 const rebirthBonus=rebirthStatBonus(reborn);for(const k of STATS)S[k]=s[k]+rebirthBonus+add(k);
 const atkStat=RANGED.has(classId)?S.dex:S.str;
 const weaponAtk=worn.reduce((n,it)=>n+up(it,'atk'),0),weaponMatk=worn.reduce((n,it)=>n+up(it,'matk'),0);
 // 0.103 status ATK: the main stat (STR, or DEX for ranged) plus small help from the other one and from LUK
 const sideStat=RANGED.has(classId)?S.str:S.dex;
 const atk=Math.round((atkStat-1+Math.floor(atkStat/10)**2+Math.floor(sideStat/5)+Math.floor(S.luk/3)+weaponAtk)*(1+sum(e=>e.atkPct))),matk=Math.round((S.int-1)*1.5)+Math.floor(S.int/7)**2+weaponMatk;
 const magic=MAGIC.has(classId);
 return {
  total:S,rebirthBonus,magic,atk,matk,
  maxHp:Math.round((140+(level-1)*12)*(1+(S.vit-1)*.02)*(1+sum(e=>e.hpPct))),
  maxMp:Math.round((100+(level-1)*5)*(1+(S.int-1)*.02)),
  def:worn.reduce((n,it)=>n+(it.def?it.def+it.refine:0),0)+Math.floor((S.vit-1)/2)+sum(e=>e.def),
  weaponElement:worn.find(it=>it.slot==='weapon')?.element??'neutral',
  // 0.102.1 magic classes hit with their full MATK on basic attacks too (owner)
  basicBonus:magic?matk:atk,
  skillPower:1+(magic?matk:atk)/40,
  // 0.103 HIT (DEX) against monster FLEE, FLEE (AGI) against monster HIT, MDEF (INT) against magic blows;
  // flee = the dodge chance against a monster of the same level, for the status window
  hit:level+S.dex+Math.floor(S.luk/3)+sum(e=>e.hit),fleeStat:level+S.agi+Math.floor(S.luk/5),
  mdef:Math.floor((S.int-1)/2)+worn.reduce((n,it)=>n+(it.mdef??0),0)+sum(e=>e.mdef),
  flee:Math.min(.75,dodgeChance(level+S.agi+Math.floor(S.luk/5),monsterHit({level}),S.luk)+sum(e=>e.flee)),
  crit:Math.min(.4,.01+(S.luk-1)*.004+sum(e=>e.crit)),
  delay:Math.max(.5,(1-(S.agi-1)*.006-(S.dex-1)*.002)*(1-sum(e=>e.delay))),
  // card specials: extra damage vs size/element, damage taken from an element, coin bonus
  vsSize:cards.reduce((o,e)=>{for(const k in e.vsSize??{})o[k]=(o[k]??0)+e.vsSize[k];return o;},{}),
  vsElement:cards.reduce((o,e)=>{for(const k in e.vsElement??{})o[k]=(o[k]??0)+e.vsElement[k];return o;},{}),
  resist:cards.reduce((o,e)=>{for(const k in e.resist??{})o[k]=(o[k]??0)+e.resist[k];return o;},{}),
  coinPct:sum(e=>e.coinPct),
  mpRegen:1+(S.int-1)*.02,
 };
}
// Slot a card into a worn piece (permanent, like Ragnarok). The card leaves the bag.
export function insertCard(bag,gear,slot,cardId){
 const b=normalizeBag(bag),g=normalizeGear(gear),card=ITEMS[cardId],worn=g[slot]&&itemDef(g[slot]);
 if(card?.kind!=='card')throw new Error('not-card');if(!worn)throw new Error('slot-empty');
 if(card.slot!==slot)throw new Error('card-slot');if(worn.slots===0)throw new Error('no-card-slot');if(worn.card)throw new Error('slot-full');
 if(!b.items[cardId])throw new Error('no-item');
 b.items[cardId]--;if(!b.items[cardId])delete b.items[cardId];
 g[slot]=composeId(worn.base,worn.refine,cardId,worn.affix);return {bag:b,gear:g};
}
// Monster hit after defence: hyperbolic so defence never makes you immune.
export const incomingDamage=(raw,def)=>Math.max(1,Math.round(raw*100/(100+def*4)));
