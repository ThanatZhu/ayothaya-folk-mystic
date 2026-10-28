import {SLOTS} from './skill-progress.js?v=novice174';
import {normalizeAuto} from './auto-play.js?v=auto202';

export function swapSkillSlots(order,from,to){
 if(!Array.isArray(order)||order.length!==SLOTS||new Set(order).size!==SLOTS||order.some(k=>!Number.isInteger(k)||k<0||k>=SLOTS))return null;
 if(!Number.isInteger(from)||!Number.isInteger(to)||from<0||to<0||from>=SLOTS||to>=SLOTS)return null;
 const next=[...order];[next[from],next[to]]=[next[to],next[from]];return next;
}
// AUTO priority follows the visible hotbar; moving a skill preserves its on/off state.
export function orderedAutoConfig(order,raw){
 const config=normalizeAuto(raw),enabled=new Set(config.skills);
 if(config.rotation==='sequence')return config;
 return {...config,skills:order.filter(k=>enabled.has(k))};
}
export function moveAutoSkill(raw,from,to){
 const cfg=normalizeAuto(raw),skills=[...cfg.skills];
 if(!Number.isInteger(from)||!Number.isInteger(to)||from<0||to<0||from>=skills.length||to>=skills.length)return cfg;
 skills.splice(to,0,skills.splice(from,1)[0]);return {...cfg,skills,rotation:'sequence'};
}
