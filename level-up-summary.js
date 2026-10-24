import {ITEMS} from './items.js?v=107';
import {earnedStatPoints} from './character-stats.js?v=107';
export function levelUpSummary(level,classId){
 if(!Number.isInteger(level)||level<2||level>99)return null;
 return {level,points:earnedStatPoints(level)-earnedStatPoints(level-1),
  items:Object.values(ITEMS).filter(it=>it.kind==='gear'&&it.level===level&&(!it.classes||it.classes.includes(classId)))};
}
