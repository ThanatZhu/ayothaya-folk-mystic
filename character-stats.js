// Ragnarok-style status (STR AGI VIT INT DEX LUK) and stat-bearing gear (weapon / armor / accessory).
// Pure rules shared by the client (offline guests + UI) and the realm server. Gear lives in the bag until
// equipped; it is separate from the cosmetic look in equipment.js, so costumes stay free choices.
import {BAG_SLOTS,normalizeBag,itemDef} from './items.js?v=03';

export const STATS=['str','agi','vit','int','dex','luk'];
export const STAT_LABEL={str:'STR',agi:'AGI',vit:'VIT',int:'INT',dex:'DEX',luk:'LUK'};
export const STAT_HINT={str:'พลังโจมตีกายภาพ',agi:'ความเร็วโจมตี · หลบหลีก',vit:'HP · ลดความเสียหาย',int:'พลังเวท · MP',dex:'ความแม่นยำ · พลังธนู · ความเร็ว',luk:'คริติคอล · โชค'};
export const STAT_MAX=99,GEAR_SLOTS=['weapon','armor','accessory'];
const MAGIC=new Set(['shaman','acolyte']),RANGED=new Set(['hunter']);

export function normalizeStats(stats){
 const s=stats&&typeof stats==='object'?stats:{},out={};
 for(const k of STATS)out[k]=Number.isSafeInteger(s[k])?Math.min(Math.max(s[k],1),STAT_MAX):1;
 return out;
}
// Cost to raise a stat from x to x+1 (Ragnarok curve: 2 points up to 10, then +1 every 10).
export const raiseCost=x=>Math.floor((x-1)/10)+2;
// Points earned by Base Level L: 3 + floor(level/5) for every level gained after 1.
export function earnedStatPoints(level){let n=0;for(let l=2;l<=level;l++)n+=3+Math.floor(l/5);return n;}
export function spentStatPoints(stats){const s=normalizeStats(stats);let n=0;for(const k of STATS)for(let x=1;x<s[k];x++)n+=raiseCost(x);return n;}
export const statPoints=(stats,level)=>earnedStatPoints(level)-spentStatPoints(stats);

export function raiseStat(stats,stat,level){
 if(!STATS.includes(stat))throw new Error('bad-stat');
 const s=normalizeStats(stats);if(s[stat]>=STAT_MAX)throw new Error('stat-max');
 if(statPoints(s,level)<raiseCost(s[stat]))throw new Error('no-stat-points');
 return {...s,[stat]:s[stat]+1};
}

export function normalizeGear(gear){
 const g=gear&&typeof gear==='object'?gear:{},out={};
 for(const slot of GEAR_SLOTS){const id=g[slot];out[slot]=itemDef(id)?.kind==='gear'&&itemDef(id).slot===slot?id:null;}
 return out;
}
export function canWear(id,{classId,level}){
 const it=itemDef(id);if(it?.kind!=='gear')return 'not-gear';
 if(it.classes&&!it.classes.includes(classId))return 'wrong-class';
 if((it.level??1)>level)return 'low-level';
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
 if(!(g[slot] in b.items)&&Object.keys(b.items).length>=BAG_SLOTS)throw new Error('bag-full');
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
export function deriveStats({level=1,classId='novice',stats,gear}){
 const s=normalizeStats(stats),g=normalizeGear(gear),worn=GEAR_SLOTS.map(k=>g[k]&&itemDef(g[k])).filter(Boolean);
 // Refine: weapons +max(2, 8% of base) ATK/MATK per level, armor +1 DEF per level.
 const up=(it,k)=>(it[k]??0)?(it[k]+it.refine*Math.max(2,Math.round(it[k]*.08))):0;
 const add=k=>worn.reduce((n,it)=>n+(it.bonus?.[k]??0),0),S={};for(const k of STATS)S[k]=s[k]+add(k);
 const atkStat=RANGED.has(classId)?S.dex:S.str;
 const weaponAtk=worn.reduce((n,it)=>n+up(it,'atk'),0),weaponMatk=worn.reduce((n,it)=>n+up(it,'matk'),0);
 const atk=atkStat-1+Math.floor(atkStat/10)**2+weaponAtk,matk=Math.round((S.int-1)*1.5)+Math.floor(S.int/7)**2+weaponMatk;
 const magic=MAGIC.has(classId);
 return {
  total:S,magic,atk,matk,
  maxHp:Math.round((140+(level-1)*12)*(1+(S.vit-1)*.02)),
  maxMp:Math.round((100+(level-1)*5)*(1+(S.int-1)*.02)),
  def:worn.reduce((n,it)=>n+(it.def?it.def+it.refine:0),0)+Math.floor((S.vit-1)/2),
  weaponElement:worn.find(it=>it.slot==='weapon')?.element??'neutral',
  basicBonus:magic?Math.round(matk*.5):atk,
  skillPower:1+(magic?matk:atk)/40,
  flee:Math.min(.5,(S.agi-1)*.008+(S.luk-1)*.002),
  crit:Math.min(.4,.01+(S.luk-1)*.004),
  delay:Math.max(.55,1-(S.agi-1)*.006-(S.dex-1)*.002),
  mpRegen:1+(S.int-1)*.02,
 };
}
// Monster hit after defence: hyperbolic so defence never makes you immune.
export const incomingDamage=(raw,def)=>Math.max(1,Math.round(raw*100/(100+def*4)));
