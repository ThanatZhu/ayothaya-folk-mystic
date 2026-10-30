import{dodgeChance}from'./combat-formulas.js';
// Keep the existing 35% PvP scale and shield/reduction rules. Magic uses MDEF and cannot be dodged.
export function pvpDamage(attacker,target,raw,scale,random=Math.random){
 if(!Number.isFinite(raw)||raw<=0)return 0;const d=target.derived,source=attacker.derived,context=attacker.damageContext??{},magic=context.magic??!!source?.magic,criticalBasic=context.source==='basic'&&context.crit;
 const amount=Math.max(1,Math.round(raw*scale));if(!d)return target.player.shield>0?Math.ceil(amount*.35):amount;
 const dodge=magic||criticalBasic?0:d.fleeStat!=null&&source?.hit!=null?dodgeChance(d.fleeStat,source.hit,d.total?.luk??1):d.flee??0;
 if(random()<Math.min(.75,Math.max(0,dodge))*(target.status?.blind?.5:1))return 0;
 const guard=criticalBasic?0:Math.max(0,(magic?d.mdef:d.def)??0)*(1-Math.min(.8,Math.max(0,source?.armorPen??0)));
 return Math.max(1,Math.round(amount*(target.player.shield>0?.35:1)*100/(100+guard*4)*(1-Math.min(.8,Math.max(0,d.dmgReduce??0)))));
}
const controlled=new Set(['stun','sleep','fear','root','silence']);
export function pvpControlDuration(world,key,seconds){
 if(!controlled.has(key))return seconds;const now=world.time??0,s=world.pvpControl??={stacks:0,resetAt:0,immuneUntil:0};
 if(now>=s.resetAt)s.stacks=0;if(now<s.immuneUntil)return 0;const duration=Math.min(2,Math.max(0,seconds))/2**Math.min(2,s.stacks);
 s.stacks++;s.resetAt=now+8;if(s.stacks>=3)s.immuneUntil=now+Math.max(duration,...[...controlled].map(k=>world.status?.[k]??0))+3;return duration;
}
