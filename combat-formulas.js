// 0.103 damage rules shared by the game, the realm server and the back office (owner, 2026-10-21).
// Physical: ATK against the monster's DEF; magic: MATK against MDEF. Crits ignore DEF.
// HIT/FLEE: a physical hit can miss; a monster's blow can be dodged. Magic always lands.
// Monster DEF/MDEF/FLEE/HIT come from its level unless the monster sets its own.
export const monsterDef=t=>t?.def??Math.round((t?.level??1)*.5);
export const monsterMdef=t=>t?.mdef??Math.round((t?.level??1)*.4);
export const monsterFlee=t=>t?.flee??Math.round((t?.level??1)*.6);
export const monsterHit=t=>t?.hit??Math.round((t?.level??1)*1.5+20);
// What fraction of a hit gets through a defence value (0 → all of it, 100 → half).
export const defFactor=def=>100/(100+Math.max(0,def));
export const CRIT_MULT=1.5;
// Chance a physical attack lands: 90% + HIT − monster FLEE, never below 30% or above 100%.
export const hitChance=(hit,flee)=>Math.min(1,Math.max(.3,(90+hit-flee)/100));
// Chance to dodge a monster blow: from FLEE against the monster's HIT (5–70%), plus LUK's perfect dodge.
export const dodgeChance=(flee,mHit,luk=1)=>Math.min(.75,Math.max(.05,Math.min(.7,(flee-mHit+20)/100))+Math.max(0,luk-1)*.001);
// Skill multiplier from its base damage: damage + ATK × (damage/40), i.e. "damage/40 × 100 % of ATK" on top of its flat part.
export const skillPct=damage=>(damage??0)/40;
// Spirit lanterns strike with magic, so the player's MDEF (INT) takes those blows instead of DEF.
export const magicMonster=t=>t?.magic??/lantern/.test(t?.id??'');
