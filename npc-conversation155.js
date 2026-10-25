import {paintNPCPortrait} from './npc-portrait155.js?v=155';
export function loadConversationStyle(){if(document.querySelector('link[data-conversation155]'))return;const css=document.createElement('link');css.rel='stylesheet';css.href='./npc-conversation155.css?v=155';css.dataset.conversation155='';document.head.append(css);}
// Existing service hooks insert before #close-npc; keep that button inside the actions column.
export function createNPCConversation({game,onClose}){
 loadConversationStyle();const panel=document.getElementById('npc-dialog');panel.classList.add('npc-conversation');panel.tabIndex=-1;
 const name=document.getElementById('npc-name'),text=document.getElementById('npc-text'),leave=document.getElementById('close-npc');
 panel.replaceChildren();panel.innerHTML='<figure class="npc-speaker"><canvas width="320" height="360" aria-label="ภาพผู้พูด"></canvas></figure><section class="npc-copy"><header class="npc-heading"></header><div class="npc-reading"></div><small class="npc-key-hint">Space / แตะเพื่ออ่านต่อ</small></section><aside class="npc-actions"></aside><button type="button" class="npc-x" aria-label="ปิดบทสนทนา">×</button>';
 const head=panel.querySelector('.npc-heading'),reading=panel.querySelector('.npc-reading'),actions=panel.querySelector('.npc-actions'),canvas=panel.querySelector('canvas'),role=document.createElement('small');
 head.append(name,role);reading.append(text);actions.append(leave);leave.textContent='ลาก่อน';
 const back=document.createElement('button'),next=document.createElement('button'),ask=document.createElement('button'),answer=document.createElement('p'),replay=document.createElement('button');
 back.type=next.type=ask.type=replay.type='button';back.textContent='ย้อนอ่าน';replay.textContent='ดูคัตซีน';next.className='npc-primary';answer.className='npc-answer';
 next.id='npc-story-next';back.id='npc-story-back';ask.id='npc-story-ask';replay.id='npc-story-cinematic';
 actions.prepend(next,back,ask,replay);reading.append(answer);let active=null,page=0,sent=false;
 function render(){const d=active?.reply;const pages=d?.pages??[active?.n.text??''];text.textContent=pages[page]??'';text.dataset.page=String(page);reading.scrollTop=0;answer.hidden=true;
  next.hidden=!d;back.hidden=!d||page===0;ask.hidden=!d?.question;replay.hidden=!d?.play;next.disabled=sent;next.textContent=page<pages.length-1?'อ่านต่อ':d?.accept??'รับภารกิจ';ask.textContent=d?.question??'';
  panel.querySelector('.npc-key-hint').textContent=pages.length>1?`${page+1} / ${pages.length} · Space / แตะเพื่ออ่านต่อ`:'Space / แตะเพื่ออ่านต่อ';
 }
 function advance(){if(!active||sent)return;const d=active.reply;if(!d)return;if(d.valid&&!d.valid()){onClose();return;}
  if(page<d.pages.length-1){page++;render();return;}
  // Space and tapping only reveal/read; accepting a quest always requires the explicitly labelled button.
 }
 next.onclick=()=>{if(!active||sent)return;const d=active.reply;if(d?.valid&&!d.valid()){onClose();return;}if(page<d.pages.length-1){advance();return;}sent=true;next.disabled=true;d?.complete?.();onClose();};
 back.onclick=()=>{if(page>0){page--;render();}};ask.onclick=()=>{answer.textContent=active?.reply?.answer??'';answer.hidden=!answer.hidden;};replay.onclick=()=>active?.reply?.play?.();
 panel.addEventListener('close',()=>{if(!panel.open&&active)onClose();});
 text.onclick=advance;panel.querySelector('.npc-x').onclick=()=>leave.click();panel.addEventListener('cancel',e=>{e.preventDefault();onClose();});
 panel.addEventListener('keydown',e=>{if(e.code!=='Space'||e.repeat||e.target.closest('input,select,textarea'))return;e.preventDefault();e.stopImmediatePropagation();advance();},true);
 return {open(n,reply){active={n,reply:reply&&typeof reply==='object'?reply:null};page=0;sent=false;name.textContent=n.name;role.textContent=n.title??n.role??'';canvas.setAttribute('aria-label',n.name);paintNPCPortrait(canvas,n);render();panel.hidden=false;panel.showModal();panel.focus({preventScroll:true});},close(){active=null;if(panel.open)panel.close();panel.hidden=true;},update(){if(active&&(game.world.player.hp<=0||Math.hypot(game.world.player.x-active.n.x,game.world.player.z-active.n.z)>4||active.reply?.valid&&!active.reply.valid()))onClose();}};
}
