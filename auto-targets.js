export function normalizeAutoTarget(raw){
 if(raw?.kind==='monsters')return {kind:'monsters'};
 if(raw?.kind==='type'&&Number.isInteger(raw.type)&&raw.type>=0)return {kind:'type',type:raw.type};
 if(raw?.kind==='entity'&&(Number.isInteger(raw.id)&&raw.id>=0||typeof raw.id==='string'&&/^(duel|war):[^\s]{1,100}$/.test(raw.id)))return {kind:'entity',id:raw.id};
 return null;
}
export function autoTargetAllows(filter,mob,hunt=null){
 if(filter?.kind==='monsters')return !mob.pvp;
 if(filter?.kind==='type')return !mob.pvp&&mob.type===filter.type;
 if(filter?.kind==='entity')return mob.id===filter.id;
 return hunt==null||mob.type===hunt;
}
