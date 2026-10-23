import {SLOTS} from './skill-progress.js?v=role116';
import {normalizeAuto} from './auto-play.js';

export function swapSkillSlots(order,from,to){
 if(!Array.isArray(order)||order.length!==SLOTS||new Set(order).size!==SLOTS||order.some(k=>!Number.isInteger(k)||k<0||k>=SLOTS))return null;
 if(!Number.isInteger(from)||!Number.isInteger(to)||from<0||to<0||from>=SLOTS||to>=SLOTS)return null;
 const next=[...order];[next[from],next[to]]=[next[to],next[from]];return next;
}
// AUTO priority follows the visible hotbar; moving a skill preserves its on/off state.
export function orderedAutoConfig(order,raw){
 const config=normalizeAuto(raw),enabled=new Set(config.skills);
 return {...config,skills:order.filter(k=>enabled.has(k))};
}
