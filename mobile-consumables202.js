// Review component only: intentionally not mounted by the production game until placement approval.
import {consumableChoices,consumableCategory} from './rapid-consumables202.js';
import {itemDef} from './items.js?v=class-reward192';
import {iconStyle} from './bag-ui.js?v=class-reward192';
const labels={hp:'HP',mp:'MP',cure:'แก้สถานะ'},categories=Object.keys(labels);
export function createMobileConsumables202({game,bag=()=>game.world.bag,use=id=>game.world.useItem?.(id),placement='left'}){
 const css=document.createElement('link');css.rel='stylesheet';css.href='./mobile-consumables202.css';document.head.append(css);
 const node=document.createElement('section');node.id='mobile-consumables202';node.setAttribute('aria-label','ยาใช้ด่วน');node.dataset.placement=placement;
 const buttons=new Map(),assigned={};let signature='';
 const picker=document.createElement('dialog');picker.id='mobile-consumable-picker202';picker.innerHTML='<header><h2>เลือกยาใช้ด่วน</h2><button type="button" aria-label="ปิดเลือกยา">×</button></header><div class="rapid-item-choices"></div>';
 document.body.append(node,picker);picker.querySelector('header button').onclick=()=>picker.close();
 function choose(category){const list=picker.querySelector('.rapid-item-choices');list.replaceChildren();for(const id of consumableChoices(bag(),category)){const b=document.createElement('button');b.type='button';b.innerHTML='<i style="'+iconStyle(id)+'"></i><span></span>';b.querySelector('span').textContent=itemDef(id).name+' ×'+bag().items[id];b.onclick=()=>{assigned[category]=id;signature='';refresh();picker.close();};list.append(b);}if(!list.children.length)list.textContent='ยังไม่มียาประเภทนี้ในกระเป๋า';picker.showModal();}
 for(const category of categories){const slot=document.createElement('div'),b=document.createElement('button');slot.className='rapid-slot202';b.type='button';b.className='rapid-use202';b.dataset.rapid=category;b.innerHTML='<i aria-hidden="true"></i><b></b><span>'+labels[category]+'</span>';b.onclick=e=>{e.stopPropagation();const id=b.dataset.item;if(id)use(id);signature='';refresh();};slot.append(b);node.append(slot);buttons.set(category,b);}
 function refresh(){
  const items=bag()?.items??{},dead=game.world.player.hp<=0,sig=JSON.stringify([items,dead]);if(sig!==signature){signature=sig;for(const [category,b]of buttons){const id=assigned[category]&&consumableCategory(assigned[category])===category?assigned[category]:consumableChoices({items},category)[0];if(id&&!assigned[category])assigned[category]=id;const count=items[id]??0;b.dataset.item=id??'';b.querySelector('i').style.cssText=id?iconStyle(id):'';b.querySelector('b').textContent=count;b.disabled=dead||!count;b.setAttribute('aria-label',id?itemDef(id).name+' คงเหลือ '+count:labels[category]+' ยังไม่มียา');}}
  const j=document.getElementById('joystick')?.getBoundingClientRect(),width=innerWidth,height=innerHeight,portrait=height>width;
  const groupWidth=140,groupHeight=68;
  let x,y;
  if(portrait){x=placement==='left'?20:Math.max(20,(width-groupWidth)/2);y=(j?.y??height-140)-groupHeight-18;}
  else if(placement==='left'){x=width<760?180:(j?.right??140)+8;y=width<760?height-180:Math.min(height-groupHeight-40,(j?.y??height-130)+10);}
  else{x=(width-groupWidth)/2;y=height-180;}
  node.style.left=Math.max(8,Math.min(width-groupWidth-8,x))+'px';node.style.top=Math.max(80,Math.min(height-groupHeight-8,y))+'px';
 }
 const timer=setInterval(refresh,150);addEventListener('resize',refresh);refresh();
 return {node,picker,choose,setPlacement(value){placement=value;node.dataset.placement=value;refresh();},refresh,dispose(){clearInterval(timer);removeEventListener('resize',refresh);node.remove();picker.remove();css.remove();}};
}
