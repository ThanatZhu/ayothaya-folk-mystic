import {mobileHudScale208} from './mobile-hud-scale208.js';
// Mobile quick-use buttons, placed below the right menu as approved by the owner.
import {consumableChoices,consumableCategory} from './rapid-consumables202.js';
import {itemDef} from './items.js?v=class-reward192';
import {iconStyle} from './bag-ui.js?v=surfaces222';
const labels={hp:'HP',mp:'MP',cure:'แก้สถานะ'},categories=Object.keys(labels);
export function createMobileConsumables202({game,bag=()=>game.world.bag,use=id=>game.world.useItem?.(id),placement='top-right',storageKey=null}){
 const css=document.createElement('link');css.rel='stylesheet';css.href='./mobile-consumables202.css?v=potion206';document.head.append(css);
 const node=document.createElement('section');node.id='mobile-consumables202';node.setAttribute('aria-label','ยาใช้ด่วน');node.dataset.placement=placement;
 const buttons=new Map(),assigned={};let signature='';
 if(storageKey)try{const saved=JSON.parse(localStorage.getItem(storageKey));for(const category of categories)if(consumableCategory(saved?.[category])===category)assigned[category]=saved[category];}catch{}
 const picker=document.createElement('dialog');picker.id='mobile-consumable-picker202';picker.innerHTML='<header><h2>เลือกยาใช้ด่วน</h2><button type="button" aria-label="ปิดเลือกยา">×</button></header><div class="rapid-item-choices"></div>';
 document.body.append(node,picker);picker.querySelector('header button').onclick=()=>picker.close();
 function choose(category){const list=picker.querySelector('.rapid-item-choices');list.replaceChildren();for(const id of consumableChoices(bag(),category)){const b=document.createElement('button');b.type='button';b.innerHTML='<i style="'+iconStyle(id)+'"></i><span></span>';b.querySelector('span').textContent=itemDef(id).name+' ×'+bag().items[id];b.onclick=()=>{assigned[category]=id;if(storageKey)try{localStorage.setItem(storageKey,JSON.stringify(assigned));}catch{}signature='';refresh();picker.close();};list.append(b);}if(!list.children.length)list.textContent='ยังไม่มียาประเภทนี้ในกระเป๋า';picker.showModal();}
 for(const category of categories){const slot=document.createElement('div'),b=document.createElement('button');slot.className='rapid-slot202';b.type='button';b.className='rapid-use202';b.dataset.rapid=category;b.innerHTML='<i aria-hidden="true"></i><b></b><span>'+labels[category]+'</span>';b.onclick=e=>{e.stopPropagation();const id=b.dataset.item;if(id)use(id);signature='';refresh();};slot.append(b);node.append(slot);buttons.set(category,b);}
 function refresh(){
  const items=bag()?.items??{},dead=game.world.player.hp<=0,sig=JSON.stringify([items,dead]);if(sig!==signature){signature=sig;for(const [category,b]of buttons){const id=assigned[category]&&(items[assigned[category]]??0)>0&&consumableCategory(assigned[category])===category?assigned[category]:consumableChoices({items},category)[0];const count=items[id]??0;b.dataset.item=id??'';b.querySelector('i').style.cssText=id?iconStyle(id):'';b.querySelector('b').textContent=count;b.disabled=dead||!count;b.setAttribute('aria-label',id?itemDef(id).name+' คงเหลือ '+count:labels[category]+' ยังไม่มียา');}}
  const j=document.getElementById('joystick')?.getBoundingClientRect(),width=innerWidth,height=innerHeight,portrait=height>width;
  const scale=document.body.classList.contains('mobile-play')?mobileHudScale208({width,height}):1;node.style.zoom=scale;const groupWidth=132*scale,groupHeight=52*scale;
  let x,y;
  if(placement==='top-right'){
   const anchors=['mobile-bag-shortcut','menu-toggle'].map(id=>document.getElementById(id)).filter(n=>n&&n.getBoundingClientRect().width>0&&getComputedStyle(n).visibility!=='hidden').map(n=>n.getBoundingClientRect());
   x=(anchors.length?Math.min(width-8,Math.max(...anchors.map(r=>r.right))+2):width-8)-groupWidth;y=anchors.length?Math.max(...anchors.map(r=>r.bottom))+4:Math.min(144,height*.36);
   // Short landscape screens can bring the skill arc up under the menu. Slide the
   // row left only as much as needed, preserving the approved vertical anchor.
   const blockers=[...document.querySelectorAll('#skills .skill:not([hidden]),#attack,#skill-bank,#auto-control,#mobile-target-next,#emote-open,#run-toggle,#quest-tracker')].filter(n=>{const r=n.getBoundingClientRect(),style=getComputedStyle(n);return r.width>0&&style.display!=='none'&&style.visibility!=='hidden';}).map(n=>n.getBoundingClientRect());
   const collides=left=>blockers.some(r=>left<r.right&&left+groupWidth>r.left&&y<r.bottom&&y+groupHeight>r.top);
   const limit=Math.max(8,width*.3);while(x>limit&&collides(x))x-=8;
  }
  else if(portrait){x=placement==='left'?20:Math.max(20,(width-groupWidth)/2);y=(j?.y??height-140)-groupHeight-18;}
  else if(placement==='left'){x=width<760?180:(j?.right??140)+8;y=width<760?height-180:Math.min(height-groupHeight-40,(j?.y??height-130)+10);}
  else{x=(width-groupWidth)/2;y=height-180;}
  node.style.left=Math.max(8,Math.min(width-groupWidth-8,x))/scale+'px';node.style.top=Math.max(60,Math.min(height-groupHeight-8,y))/scale+'px';
 }
 const configure=e=>{if(categories.includes(e.detail))choose(e.detail);};addEventListener('configure-mobile-consumable202',configure);
 const timer=setInterval(refresh,150);addEventListener('resize',refresh);refresh();
 return {node,picker,choose,setPlacement(value){placement=value;node.dataset.placement=value;refresh();},refresh,dispose(){clearInterval(timer);removeEventListener('resize',refresh);removeEventListener('configure-mobile-consumable202',configure);node.remove();picker.remove();css.remove();}};
}
