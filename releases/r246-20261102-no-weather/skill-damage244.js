// Shared by the authoritative combat engine and skill descriptions.
// Migrate the existing balance n * (1 + ATK / 40) into explicit
// ATK * coefficient + flat damage, without counting gear or main stats twice.
// A power unit contributes 2.5% ATK/MATK and 1 flat damage.
const nonnegative=n=>Number.isFinite(n)?Math.max(0,n):0;
export function skillDamageFormula(power,magic=false){
 const n=nonnegative(power);
 return {stat:magic?'matk':'atk',attackPercent:n*2.5,flatDamage:n};
}
export function skillDamageBase(formula,derived){
 const attack=nonnegative(derived?.[formula.stat]);
 return attack*nonnegative(formula.attackPercent)/100+nonnegative(formula.flatDamage);
}
const DIRECT=new Set(['riposte','cleave','break','brand','execute','line','drill','chainLine','phalanx','interrupt','bind','massBind','uppercut','flock','push','pull','retreatShot','meteor','peck','mark','cone','ambush','jab','combo','comboFinish','comboBurst','leap','backstab','slow','detonatePoison','curse','detonateCurse','soulWave','curseWave','holy','purify']);
const FIELD=new Set(['zone','wall','storm','trap','rain','thorns','holyField','mine']);
const SUMMON=new Set(['summon','greatSummon','spirit','greatSpirit']);
const MAGIC=new Set(['shaman','acolyte']);
const number=n=>Number(n.toFixed(2)).toLocaleString('en-US',{maximumFractionDigits:2});
export function skillDamageText(skill,derived,classId,hitCount=1){
 if(!skill||skill.passive||skill.reserved)return null;
 const type=skill.type??skill.kind;
 const magic=derived?.magic??MAGIC.has(classId);
 let power;
 if(SUMMON.has(type))power=type.startsWith('great')?48:28;
 else if(DIRECT.has(type)||FIELD.has(type)||type==='poison'||type==='venom')power=skill.roleSkillId?skill.power:skill.damage;
 else if(!skill.roleSkillId&&skill.damage>0)power=skill.damage;
 else return null; // Healing, shields and % buffs are not attack damage.
 if(!Number.isFinite(power)||power<=0)return null;
 // Persistent fields and stored poison use the per-release share in role-combat.
 // Direct multi-hit skills display the total before per-hit rounding.
 const hits=Math.max(1,Number.isFinite(hitCount)?hitCount:1);
 if(FIELD.has(type)||type==='poison'||type==='venom')power/=hits;
 const formula=skillDamageFormula(power,magic);
 const expression=f=>`${number(f.attackPercent)}% ${f.stat.toUpperCase()} + ${number(f.flatDamage)}`;
 if(type==='poison'||type==='venom')return `ดาเมจแรก ${expression(skillDamageFormula(power*.5,magic))} · พิษต่อครั้ง ${expression(formula)} · ก่อนโบนัส เกราะและคริติคอล`;
 const label=SUMMON.has(type)?'ดาเมจอัญเชิญต่อครั้ง':FIELD.has(type)?'ดาเมจพื้นที่ต่อครั้ง':hits>1?'ดาเมจพื้นฐานรวมทุกฮิต':'ดาเมจพื้นฐานสกิล';
 const estimate=derived?` ≈ ${number(Math.round(skillDamageBase(formula,derived)))}`:'';
 return `${label} ${expression(formula)}${estimate} · ก่อนโบนัส เกราะและคริติคอล`;
}
