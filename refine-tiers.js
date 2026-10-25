// Refinement milestones belong to each item, independently of its rarity/crafting tier.
export const REFINE_MAX=20;
export const REFINE_TIERS=Object.freeze([5,10,15,20].map((level,i)=>Object.freeze({tier:i+1,level,percent:level})));
export const refineTier=level=>Number.isInteger(level)&&level>0?Math.min(4,Math.floor(level/5)):0;
export const refinePercent=level=>refineTier(level)*5;
export const roundGearStat=n=>Math.round((n+Number.EPSILON)*100)/100;
export function effectiveGearStats(item){
 const level=item?.refine??0,multiplier=1+refinePercent(level)/100;
 const attack=k=>(item?.[k]??0)?item[k]+level*Math.max(2,Math.round(item[k]*.08)):0;
 return {atk:roundGearStat(attack('atk')*multiplier),matk:roundGearStat(attack('matk')*multiplier),
  def:roundGearStat(((item?.def??0)+(item&&item.slot!=='weapon'?level:0))*multiplier),mdef:roundGearStat((item?.mdef??0)*multiplier),
  bonus:Object.fromEntries(Object.entries(item?.bonus??{}).map(([k,n])=>[k,roundGearStat(n*multiplier)]))};
}
export function gearStatText(item){
 const s=effectiveGearStats(item);
 return [...['atk','matk','def','mdef'].filter(k=>s[k]).map(k=>k.toUpperCase()+' +'+s[k]),...Object.entries(s.bonus).filter(([,n])=>n).map(([k,n])=>k.toUpperCase()+' +'+n)].join(' · ');
}
