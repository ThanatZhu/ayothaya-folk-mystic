// Refining +1..+10 at ครูแสนดาบ (0.44). The refine level travels with the item as an id suffix ("sword-iron+5"),
// so a refined piece keeps its level in the bag. +1..+4 are safe; from +5 a failure breaks the item (Ragnarok).
import {normalizeBag,itemDef,composeId} from './items.js?v=107';
import {normalizeGear} from './character-stats.js?v=107';

export const REFINE_MAX=10;
export const REFINE_RATE=[1,1,1,1,.9,.7,.5,.3,.2,.1]; // chance to reach +1 … +10
export const REFINE_SLOTS={weapon:'อาวุธ',head:'หมวก',armor:'เสื้อเกราะ',garment:'ผ้าคลุม',shoes:'รองเท้า',accessory:'เครื่องประดับ'};
export const REFINE_ORE={weapon:'iron-ore',head:'laterite',armor:'laterite',garment:'laterite',shoes:'laterite',accessory:'laterite'};
export const refineCost=next=>next*100; // coins
export const LEK_LAI_BONUS=.2;

export const withRefine=(base,level,card=null,affix=null)=>composeId(base,level,card,affix);

// All six worn equipment slots refine. Weapons use iron ore; other slots use laterite.
// lekLai: spend one เหล็กไหล for +20% success.
// guard: spend one ยันต์กันแตก (only used from +5, where a failure would break the item) to keep it at its level.
export function refineGear(bag,gear,slot,{lekLai=false,guard=false,rand=Math.random}={}){
 const g=normalizeGear(gear),b=normalizeBag(bag),id=g[slot];
 if(!Object.hasOwn(REFINE_ORE,slot)||!id)throw new Error('not-refinable');
 const def=itemDef(id);if(def.refine>=REFINE_MAX)throw new Error('refine-max');
 const next=def.refine+1,ore=REFINE_ORE[slot],cost=refineCost(next);
 if(!b.items[ore])throw new Error('no-ore');
 if(lekLai&&!b.items['lek-lai'])throw new Error('no-lek-lai');
 const guarded=guard&&next>=5;if(guarded&&!b.items['break-guard'])throw new Error('no-break-guard');
 if(b.coins<cost)throw new Error('no-coins');
 b.coins-=cost;b.items[ore]--;if(!b.items[ore])delete b.items[ore];
 if(lekLai){b.items['lek-lai']--;if(!b.items['lek-lai'])delete b.items['lek-lai'];}
 const chance=Math.min(1,REFINE_RATE[next-1]+(lekLai?LEK_LAI_BONUS:0));
 if(rand()<chance){g[slot]=withRefine(def.base,next,def.card,def.affix);return {bag:b,gear:g,result:'success',level:next,chance};}
 if(next<5)return {bag:b,gear:g,result:'failed',level:def.refine,chance};
 if(guarded){b.items['break-guard']--;if(!b.items['break-guard'])delete b.items['break-guard'];return {bag:b,gear:g,result:'guarded',level:def.refine,chance};}
 g[slot]=null;return {bag:b,gear:g,result:'broken',level:def.refine,chance};
}
