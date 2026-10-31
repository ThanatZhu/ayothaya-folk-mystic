import {CRIT_MULT} from './combat-formulas.js';

// One roll per damaging impact, after the skill's own power/defence calculation.
// Keep cast/impact IDs so the authoritative hit and its animation stay together.
export function skillHit(world,target,amount,color,context={},random=Math.random){
 if(!target||target.hp<=0||!Number.isFinite(amount)||amount<=0)return;
 const d=world.derived,critical=!!d&&random()<Math.max(0,Math.min(1,d.crit??0));
 const multiplier=Number.isFinite(d?.critMult)?Math.max(1,d.critMult):CRIT_MULT;
 const previous=world.damageContext;
 world.damageContext={...previous,source:previous?.source??'skill',magic:!!d?.magic,...context,crit:critical};
 try{return world.hurt(target,Math.max(1,Math.round(amount*(critical?multiplier:1))),critical?'#ffd27a':color);}
 finally{world.damageContext=previous;}
}
