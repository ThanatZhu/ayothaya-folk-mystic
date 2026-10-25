import {paintIcon,skillById} from './assets/skills-next/catalog.js?v=icons117';
import {paintSkillRegion,clearSkillIcon} from './assets/skills-next/icon-renderer.js';
import {isClass} from './classes.js?v=novice174';
import {MASTER_FROM,BASE_SLOTS,isMaster} from './skill-progress.js?v=novice174';
export const skillAtlas=id=>{if(!isClass(id))throw new Error('invalid-class');return new URL('./assets/skills/'+id+'-21.png',import.meta.url).href;};
const requests=new WeakMap();
export async function applySkillArt(buttons,classId,order=null,definitions=null){ // order[i] = skill shown on button i (0.90 hotbar)
 const request={};buttons.forEach(button=>requests.set(button,request));
 if(definitions?.some(s=>s.roleSkillId)){return Promise.all(buttons.map((button,i)=>{const slot=order?.[i]??i,definition=definitions[slot],art=button.querySelector('strong');if(!art)return;art.textContent='';if(definition?.roleSkillId){art.classList.toggle('master-art',slot>=10);return paintIcon(art,skillById(definition.roleSkillId));}else clearSkillIcon(art);}));}
 const image=new Image(),url=skillAtlas(classId);image.src=url;
 try{await image.decode();}catch{return;}
 // Hunter's source atlas has a slightly higher row divider; sample its actual bounds.
 const split=classId==='hunter'?375/793:.5;
 return Promise.all(buttons.map((button,i)=>{
  if(requests.get(button)!==request)return false;
  const slot=order?.[i]??i,k=isMaster(slot)?MASTER_FROM[slot-BASE_SLOTS]:slot,icon=button.querySelector('strong'),row=k<5?0:1; // a Master skill wears its parent's art
  if(!icon)return;const x=Math.round((k%5)*image.width/5),right=Math.round((k%5+1)*image.width/5),y=row?Math.round(image.height*split):0,bottom=row?image.height:Math.round(image.height*split);
  icon.classList.toggle('master-art',isMaster(slot));
  delete icon.dataset.skillIcon;
  icon.classList.add('skill-art');icon.setAttribute('aria-hidden','true');
  return paintSkillRegion(icon,url,{rect:[x+2,y+2,right-x-4,bottom-y-4],width:image.width,height:image.height});
 }));
}
