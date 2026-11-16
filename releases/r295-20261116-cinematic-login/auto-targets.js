export function normalizeAutoTarget(raw){
 if(raw?.kind==='monsters')return {kind:'monsters'};
 if(raw?.kind==='type'&&Number.isInteger(raw.type)&&raw.type>=0)return {kind:'type',type:raw.type};
 if(raw?.kind==='types'&&Array.isArray(raw.types)&&raw.types.length>0&&raw.types.length<=256&&raw.types.every(n=>Number.isInteger(n)&&n>=0))return {kind:'types',types:[...new Set(raw.types)].sort((a,b)=>a-b)};
 if(raw?.kind==='entity'&&(Number.isInteger(raw.id)&&raw.id>=0||typeof raw.id==='string'&&/^(duel|war):[^\s]{1,100}$/.test(raw.id)))return {kind:'entity',id:raw.id};
 return null;
}
export function autoTargetAllows(filter,mob,hunt=null){
 if(filter?.kind==='monsters')return !mob.pvp;
 if(filter?.kind==='type')return !mob.pvp&&mob.type===filter.type;
 if(filter?.kind==='types')return !mob.pvp&&filter.types.includes(mob.type);
 if(filter?.kind==='entity')return mob.id===filter.id;
 return hunt==null||mob.type===hunt;
}
// Use the same MVP/Mini grouping as the public boss directory. PvP has its own rules.
export function autoMonsterRank(type){return type?.mvp||type?.worldBoss?'boss':type?.boss||type?.elite?'mini':'normal';}
export function autoRankAllows(config,mob,types){
 if(mob?.pvp)return true;
 const rank=autoMonsterRank(types?.[mob?.type]);
 return rank==='boss'?config?.bosses!==false:rank==='mini'?config?.minis!==false:true;
}
