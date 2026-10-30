// Reuse the exact in-game portraits and measured atlas cells; no substitute artwork.
import {applySkillArt} from './skill-art.js?v=icons117';
import {monsterPortrait as portrait} from './portraits.js?v=surfaces222';
export async function paintAdminMonsters(root){return Promise.all([...root.querySelectorAll('[data-monster-art]')].map(async el=>{try{el.src=await portrait(Number(el.dataset.monsterArt));el.dataset.artState='ready';}catch(e){el.dataset.artState='error';console.warn('Monster portrait unavailable',e.message);}}));}
export function paintAdminSkills(root,classId,definitions=null){const nodes=[...root.querySelectorAll('[data-skill-art]')];return applySkillArt(nodes,classId,nodes.map(n=>Number(n.dataset.skillArt)),definitions);}
