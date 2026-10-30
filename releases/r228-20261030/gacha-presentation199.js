import {AMULETS,AMULET_TIERS,AMULET_PITY,amuletAtTier} from './amulets.js';
import {PREMIUM_PETS,petAtStars} from './premium-pets.js';
import {itemDef} from './items.js';
import {iconStyle} from './bag-ui.js?v=surfaces222';
import {createGachaOverlay,createGachaHistory} from './gacha-overlay199.js?v=202';
const node=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text)n.textContent=text;return n;};
export function presentAmuletBanner({root,dialog,onTier}){
 root.dataset.presentation='banner';
 const details=createGachaOverlay({root,dialog,title:'รายละเอียดพระเครื่อง',label:'ดูสเตตัส'});
 details.body.append(root.querySelector('.amulet-inspect'),root.querySelector('.amulet-odds'));
 const note=root.querySelector('.amulet-cultural');details.body.append(note);
 root.querySelector('.amulet-intro>div').append(details.button);
 const choices=root.querySelector('.amulet-rainbow-tag');choices.className='gacha-tier-preview';choices.replaceChildren();choices.setAttribute('role','group');choices.setAttribute('aria-label','ระดับพระที่ต้องการดู');
 for(const tier of AMULET_TIERS){const b=node('button','',tier.name);b.type='button';b.dataset.bannerTier=tier.id;b.onclick=()=>onTier(tier.id);choices.append(b);}
 const layout=root.querySelector('.amulet-layout');layout.append(node('span','gacha-preview-caption','ตัวอย่างของรางวัล · แตะไอเท็มเพื่อดูสเตตัส'));
 for(const b of root.querySelectorAll('[data-amulet]')){const a=AMULETS.find(a=>a.id===b.dataset.amulet);b.title=a.name;b.querySelector('img').src='assets/gacha-banner199/amulet-'+a.art+'.webp';b.addEventListener('click',()=>details.show());}
 const actions=root.querySelector('.amulet-actions');actions.firstElementChild.classList.add('gacha-legacy-wallet');
 const copy=node('div','gacha-footer-copy'),pity=root.querySelector('.amulet-pity'),tools=node('div','gacha-tools');
 copy.append(pity,tools);actions.prepend(copy);
 const count=node('span','gacha-pity-count');pity.append(count);pity.prepend(node('span','gacha-pity-title','การันตีรุ้งภายใน '+AMULET_PITY+' ครั้ง'));
 const history=createGachaHistory({root,dialog,describe:r=>({name:itemDef(r.id).name,art:itemDef(r.id).image,style:iconStyle(r.id)})});tools.append(history.button);
 return {details,history,render(selected,tier){
  const index=AMULETS.findIndex(a=>a.id===selected);
  for(const [i,b]of [...root.querySelectorAll('[data-amulet]')].entries()){
   const offset=[0,1,-1,2,-2][(i-index+AMULETS.length)%AMULETS.length];b.style.setProperty('--fan-offset',offset);b.style.setProperty('--fan-distance',Math.abs(offset));b.style.zIndex=String(10-Math.abs(offset));
  }
  root.querySelectorAll('[data-banner-tier]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.bannerTier===tier)));
  const progress=pity.querySelector('progress');count.textContent=progress.value+' / '+progress.max;
 }};
}
export function presentPetBanner({root,dialog}){
 root.dataset.presentation='banner';
 const intro=root.querySelector('.summon-intro');intro.querySelector('small').textContent='AYOTHAYA · HIMMAPAN';intro.querySelector('h3').textContent='สายใยหิมพานต์';intro.querySelector('p').textContent='อัญเชิญเพื่อนร่วมผจญภัย · มีสัตว์เลี้ยง '+PREMIUM_PETS.length+' แบบในตู้';
 const scene=root.querySelector('.summon-scene'),art=node('div','gacha-featured-pets');
 const details=createGachaOverlay({root,dialog,title:'ข้อมูลสัตว์เลี้ยง'});
 for(const pet of PREMIUM_PETS.filter(p=>p.tier==='S')){
  const b=node('button');b.type='button';b.setAttribute('aria-label',pet.name);const image=node('img');image.src=petAtStars(pet.id).art;image.alt=pet.name;b.append(image);art.append(b);
  b.onclick=()=>{const p=petAtStars(pet.id);details.body.replaceChildren(node('h3','',p.name));const img=node('img','gacha-pet-detail-art');img.src=p.art;img.alt=p.name;details.body.append(img,node('p','','ระดับ '+p.tier),node('h4','',p.skill.name),node('p','',p.skill.tip));const stats=node('ul');for(const [key,value]of Object.entries(p.bonus))stats.append(node('li','',key.toUpperCase()+' +'+value));details.body.append(stats);details.show();};
 }
 art.append(node('span','gacha-preview-caption','ตัวอย่างของรางวัล · แตะไอเท็มเพื่อดูสเตตัส'));scene.append(art);
 const tools=node('div','gacha-tools'),history=createGachaHistory({root,dialog,describe:r=>{const p=petAtStars(r.id);return {name:p.name,art:p.art};}});
 tools.append(history.button);root.querySelector('.summon-rates').append(tools);
 return {history};
}
