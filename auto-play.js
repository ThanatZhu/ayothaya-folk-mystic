// 0.90 AUTO helpers shared by the browser and the realm server (owner: AUTO also casts skills and drinks potions,
// set from the AUTO gear panel). Pure functions: the caller owns the world, the bag and the timing.
import {ITEMS} from './items.js?v=107';
import {SLOTS} from './skill-progress.js?v=101';
export const AUTO_DEFAULT={skills:[0],hp:40,mp:0};
const SELF=new Set(['heal','shield','mana','focus','blessing']);
// Clean a config from the client: skill slots 0-14 (unique; 10-14 are Master skills), potion thresholds 0-90 % (0 = off).
export function normalizeAuto(raw){
 const skills=Array.isArray(raw?.skills)?[...new Set(raw.skills.filter(i=>Number.isInteger(i)&&i>=0&&i<SLOTS))]:AUTO_DEFAULT.skills;
 const pct=v=>Number.isFinite(v)?Math.max(0,Math.min(90,Math.round(v))):0;
 return {skills,hp:raw&&'hp' in raw?pct(raw.hp):AUTO_DEFAULT.hp,mp:raw&&'mp' in raw?pct(raw.mp):AUTO_DEFAULT.mp};
}
// The first chosen skill that is learned, off cooldown, affordable and useful right now; -1 = none.
// Self skills wait for a reason: recover under 60 % HP, guard when unshielded, focus under 40 % MP.
export function pickAutoSkill(world,cfg,scaled){
 const p=world.player,m=world.target;if(!cfg?.skills?.length||p.hp<=0)return -1;
 for(const i of cfg.skills){
  const base=world.skills[i],level=world.skillLevels?.[i]??1;if(!base||level<1||world.cooldowns[i]>0)continue;
  const s=scaled(base,level);if(!s||p.mp<(s.cost??0))continue;
  if(s.type==='heal'){if(p.hp<p.maxHp*.6)return i;continue;}
  if(s.type==='shield'){if(!(p.shield>0)&&m)return i;continue;}
  if(s.type==='mana'||s.type==='focus'){if(p.mp<p.maxMp*.4)return i;continue;}
  if(SELF.has(s.type)||s.type==='dash')continue;
  if(!m||m.hp<=0)continue;
  const reach=s.range??s.radius??world.profession.range;if(Math.hypot(m.x-p.x,m.z-p.z)-(world.bodyRadius?.(m)??0)<=reach)return i; /* 1.12 reach to the body edge */
 }
 return -1;
}
// Best potion for the threshold that fired: the strongest one in the bag that restores that bar.
export function pickPotion(bag,player,cfg){
 const items=bag?.items??{},have=id=>(items[id]??0)>0&&ITEMS[id]?.kind==='potion'&&!ITEMS[id].buff; // food is eaten by hand
 const best=key=>Object.keys(items).filter(id=>have(id)&&(ITEMS[id][key]??0)>0).sort((a,b)=>ITEMS[b][key]-ITEMS[a][key])[0]??null;
 if(cfg?.hp&&player.hp>0&&player.hp<player.maxHp*cfg.hp/100)return best('hp');
 if(cfg?.mp&&player.hp>0&&player.mp<player.maxMp*cfg.mp/100)return best('mp');
 return null;
}
