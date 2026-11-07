// Coloured shadow behind a character: one for the weapon's grade, one for a complete armour set.
// Pure rules, shared by the client and the realm server, so everyone sees the same colours.
import {itemDef} from './items.js';
import {GRADES,SET_SLOTS} from './gear-sets.js';

const gradeColor=item=>item.rainbow?'rainbow':item.graded?GRADES[item.grade??0].color:null;
export function gearShadow(gear){
 const weapon=itemDef(gear?.weapon),worn=SET_SLOTS.map(slot=>itemDef(gear?.[slot]));
 let set=null;
 if(worn.every(Boolean)){
  const [first]=worn;
  if(first.bossSet&&worn.every(item=>item.bossSet===first.bossSet))set='rainbow';
  // Same family, as the set bonus counts it. Mixed grades show the lowest one: the set is only as good as its weakest piece.
  else if(first.set&&worn.every(item=>item.set?.family===first.set.family))set=GRADES[Math.min(...worn.map(item=>item.grade??0))].color;
 }
 return {weapon:weapon?gradeColor(weapon):null,set};
}
