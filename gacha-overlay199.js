const overlays=new WeakMap();
const node=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text)n.textContent=text;return n;};
export function createGachaOverlay({root,dialog,title,label=title,onShow=()=>{}}){
 const button=node('button','gacha-secondary',label);button.type='button';button.setAttribute('aria-expanded','false');
 const panel=node('section','gacha-overlay');panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label',title);
 const card=node('div','gacha-overlay-card'),head=node('header'),heading=node('h3','',title),closeButton=node('button','gacha-overlay-close','×'),body=node('div','gacha-overlay-body');
 closeButton.type='button';closeButton.setAttribute('aria-label','ปิด');head.append(heading,closeButton);card.append(head,body);panel.append(card);root.append(panel);
 let previous,motion,generation=0;
 const cardMotion=(frames,duration)=>matchMedia('(prefers-reduced-motion: reduce)').matches||document.documentElement.dataset.motion==='off'?null:card.animate(frames,{duration,easing:'cubic-bezier(.22,1,.36,1)',fill:'both'});
 const peers=overlays.get(dialog)??new Set();overlays.set(dialog,peers);
 function close({focus=true}={}){const ticket=++generation;motion?.cancel();button.setAttribute('aria-expanded','false');if(focus&&dialog.open&&!root.hidden)(previous?.isConnected?previous:button).focus({preventScroll:true});if(!focus||panel.hidden){panel.hidden=true;return;}panel.inert=true;panel.setAttribute('aria-modal','false');motion=cardMotion([{opacity:1,transform:'none'},{opacity:0,transform:'translateY(4px) scale(.985)'}],140);if(!motion){panel.hidden=true;return;}motion.finished.then(()=>{if(ticket===generation){panel.hidden=true;motion.cancel();}},()=>{});}
 const control={button,panel,body,show,close};peers.add(control);
 function show(){++generation;motion?.cancel();for(const other of peers)if(other!==control)other.close({focus:false});previous=document.activeElement;onShow(body);panel.inert=false;panel.setAttribute('aria-modal','true');panel.hidden=false;button.setAttribute('aria-expanded','true');motion=cardMotion([{opacity:0,transform:'translateY(6px) scale(.98)'},{opacity:1,transform:'none'}],200);const entering=motion;if(entering)entering.finished.then(()=>{if(motion===entering)entering.cancel();},()=>{});closeButton.focus({preventScroll:true});}
 button.onclick=show;closeButton.onclick=()=>close();panel.addEventListener('click',e=>{if(e.target===panel)close();});
 panel.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();return;}if(e.key!=='Tab')return;const all=[...panel.querySelectorAll('button:not(:disabled),a[href],input,select,[tabindex="0"]')].filter(n=>n.getClientRects().length),first=all[0],last=all.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}});
 dialog.addEventListener('close',()=>close({focus:false}));
 new MutationObserver(()=>{if(root.hidden)close({focus:false});}).observe(root,{attributes:true,attributeFilter:['hidden']});
 return control;
}
export function createGachaHistory({root,dialog,describe}){
 const entries=new Map();
 const overlay=createGachaOverlay({root,dialog,title:'ประวัติการสุ่ม',onShow(body){
  body.replaceChildren(node('p','gacha-history-note','ผลสุ่มที่ยืนยันแล้วในหน้านี้ · เมื่อออกจากเกมรายการนี้จะเริ่มใหม่'));
  if(!entries.size){body.append(node('p','','ยังไม่มีรายการสุ่มในหน้านี้'));return;}
  for(const entry of [...entries.values()].reverse()){
   const row=node('article','gacha-history-entry'),time=node('time','',entry.at.toLocaleTimeString(globalThis.I18N?.locale??'th-TH',{hour:'2-digit',minute:'2-digit'})),list=node('ul');
   for(const result of entry.results){const item=describe(result),li=node('li'),img=node(item.art?'img':'i');if(item.art){img.src=item.art;img.alt='';img.loading='lazy';}else{img.className='item-icon';img.style.cssText=item.style??'';}li.append(img,node('span','',item.name),node('b','','×'+(result.count??1)));list.append(li);}
   row.append(time,list);body.append(row);
  }
 }});
 return {...overlay,record(id,results){if(!id||entries.has(id))return;entries.set(id,{at:new Date(),results:results.map(r=>({...r}))});if(entries.size>20)entries.delete(entries.keys().next().value);}};
}
