import {isClass} from './classes.js?v=73';
export const skillAtlas=id=>{if(!isClass(id))throw new Error('invalid-class');return new URL('./assets/skills/'+id+'-21.png',import.meta.url).href;};
export async function applySkillArt(buttons,classId,order=null){ // order[i] = skill shown on button i (0.90 hotbar)
 const image=new Image(),url=skillAtlas(classId);image.src=url;
 try{await image.decode();}catch{return;}
 // Hunter's source atlas has a slightly higher row divider; sample its actual bounds.
 const split=classId==='hunter'?375/793:.5;
 buttons.forEach((button,i)=>{
  const k=order?.[i]??i,icon=button.querySelector('strong'),row=k<5?0:1,h=row?1-split:split;
  icon.classList.add('skill-art');icon.setAttribute('aria-hidden','true');
  icon.style.backgroundImage=`url("${url}")`;icon.style.backgroundSize=`500% ${100/h}%`;
  icon.style.backgroundPosition=`${k%5*25}% ${row?100:0}%`;
 });
}
