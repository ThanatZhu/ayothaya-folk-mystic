import {paintIcon,skillById} from './assets/skills-next/catalog.js';
import {isClass} from './classes.js?v=112.1';
import {MASTER_FROM,BASE_SLOTS,isMaster} from './skill-progress.js?v=role116';
export const skillAtlas=id=>{if(!isClass(id))throw new Error('invalid-class');return new URL('./assets/skills/'+id+'-21.png',import.meta.url).href;};
export async function applySkillArt(buttons,classId,order=null,definitions=null){ // order[i] = skill shown on button i (0.90 hotbar)
 if(definitions?.some(s=>s.roleSkillId)){buttons.forEach((button,i)=>{const slot=order?.[i]??i,definition=definitions[slot],art=button.querySelector('strong');if(!art)return;art.textContent='';if(definition?.roleSkillId){paintIcon(art,skillById(definition.roleSkillId));art.classList.toggle('master-art',slot>=10);}else art.style.backgroundImage='none';});return;}
 const image=new Image(),url=skillAtlas(classId);image.src=url;
 try{await image.decode();}catch{return;}
 // Hunter's source atlas has a slightly higher row divider; sample its actual bounds.
 const split=classId==='hunter'?375/793:.5;
 buttons.forEach((button,i)=>{
  const slot=order?.[i]??i,k=isMaster(slot)?MASTER_FROM[slot-BASE_SLOTS]:slot,icon=button.querySelector('strong'),row=k<5?0:1,h=row?1-split:split; // a Master skill wears its parent's art
  icon.classList.toggle('master-art',isMaster(slot));
  icon.classList.add('skill-art');icon.setAttribute('aria-hidden','true');
  icon.style.backgroundImage=`url("${url}")`;icon.style.backgroundSize=`500% ${100/h}%`;
  icon.style.backgroundPosition=`${k%5*25}% ${row?100:0}%`;
 });
}
