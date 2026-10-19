// 0.85 balance overrides. The admin dashboard edits balance-data.js; every module that owns game numbers patches
// its own definitions with it when it loads (items.js, classes.js, combat-core.js), so the browser and the realm
// server always agree. Only the listed numeric fields can change, each within a sane range.
import BALANCE from './balance-data.js';
export {BALANCE};
export const FIELDS={
 classes:{damage:[1,9999],delay:[.1,5],range:[.5,12]},
 skills:{damage:[0,99999],heal:[0,99999],cost:[0,999],cd:[0,120],range:[0,20],radius:[0,12],duration:[0,120]},
 items:{atk:[0,9999],matk:[0,9999],def:[0,9999],level:[1,99],buy:[0,9999999],sell:[0,9999999],tokens:[0,99999],hp:[0,99999],mp:[0,99999],heal:[0,99999]},
 monsters:{hp:[1,9999999],damage:[0,99999],speed:[0,10],baseXp:[0,9999999],jobXp:[0,9999999],level:[1,99],respawn:[1,3600],reach:[.3,20]},
};
export const monsterKey=(m,i)=>m.id??'m'+i;
// Original values before any override, so the dashboard can show what changed and reset it.
export const BASELINE={};
export function patch(group,key,target){
 const over=BALANCE[group]?.[key];if(!over||!target)return target;
 for(const [field,value] of Object.entries(over)){
  const range=FIELDS[group][field];if(!range||typeof value!=='number'||!Number.isFinite(value))continue;
  const id=group+'.'+key+'.'+field;if(!(id in BASELINE))BASELINE[id]=target[field]??null;
  target[field]=Math.min(range[1],Math.max(range[0],value));
 }
 return target;
}
// Check a whole override document from the dashboard before it is written to disk.
export function cleanBalance(doc){
 const out={classes:{},skills:{},items:{},monsters:{}};
 for(const group of Object.keys(out))for(const [key,fields] of Object.entries(doc?.[group]??{})){
  if(typeof key!=='string'||key.length>40||!fields||typeof fields!=='object')continue;
  for(const [field,value] of Object.entries(fields)){const r=FIELDS[group][field];if(r&&typeof value==='number'&&Number.isFinite(value)){(out[group][key]??={})[field]=Math.min(r[1],Math.max(r[0],value));}}
 }
 return out;
}
