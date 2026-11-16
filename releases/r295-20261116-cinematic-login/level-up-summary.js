import {ITEMS} from './items.js?v=107';
import {earnedStatPoints} from './character-stats.js?v=107';
import {gearLook} from './gear-sets.js';
// 0.117 set pieces are listed for the class look only (acolyte: monk and nun unless the gender is known)
export function levelUpSummary(level,classId,gender){
 const looks=gender?[gearLook(classId,gender)]:[gearLook(classId,'male'),gearLook(classId,'female')];
 if(!Number.isInteger(level)||level<2||level>99)return null;
 return {level,points:earnedStatPoints(level)-earnedStatPoints(level-1),
  items:Object.values(ITEMS).filter(it=>it.kind==='gear'&&it.level===level&&(!it.classes||it.classes.includes(classId))&&(!it.look||looks.includes(it.look)))};
}
