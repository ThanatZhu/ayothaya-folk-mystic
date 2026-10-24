import {dialogueFor,sameObjective} from './story-dialogue.js?v=story123';

// Reading/asking never mutates progress; only the explicit final response calls complete.
export function createStoryDialogue({game,worldUI,objective,state,complete}){
 const dialog=document.createElement('dialog');dialog.id='story-scene';dialog.setAttribute('aria-labelledby','story-scene-name');
 dialog.innerHTML='<header><div><small id="story-scene-chapter"></small><h2 id="story-scene-name"></h2></div><button type="button" id="story-scene-close" aria-label="ปิดบทสนทนา">×</button></header><div class="story-scene-scroll"><h3 id="story-scene-title"></h3><p id="story-scene-text" aria-live="polite"></p><div id="story-scene-question"><button type="button" id="story-scene-ask" aria-controls="story-scene-answer"></button><p id="story-scene-answer" hidden></p></div><p id="story-scene-goal" hidden></p></div><footer><span id="story-scene-page"></span><div><button type="button" id="story-scene-back">ย้อนอ่าน</button><button type="button" id="story-scene-next"></button></div></footer>';
 (document.getElementById('game-shell')??document.body).append(dialog);
 if(!document.querySelector('link[data-story-scene]')){const css=document.createElement('link');css.rel='stylesheet';css.href='story-dialogue.css?v=story123';css.dataset.storyScene='';document.head.append(css);}
 const $=id=>dialog.querySelector('#story-scene-'+id);let active=null,page=0,sent=false;
 function close(){if(dialog.open)dialog.close();active=null;game.clearInput();worldUI.endTalk();}
 function render(){
  if(!active)return;const {data,obj}=active,last=page===data.pages.length-1;
  $('text').textContent=data.pages[page];$('page').textContent=(page+1)+' / '+data.pages.length;
  $('back').disabled=page===0;$('next').textContent=last?data.accept:'อ่านต่อ';$('next').disabled=sent;
  $('ask').textContent=data.question;$('answer').textContent=data.answer;$('answer').hidden=true;$('ask').setAttribute('aria-expanded','false');
  $('goal').hidden=!last;$('goal').textContent=obj.step.hint;$('text').parentElement.scrollTop=0;
 }
 $('close').onclick=close;dialog.addEventListener('cancel',e=>{e.preventDefault();close();});dialog.addEventListener('close',()=>{if(dialog.open)return;active=null;game.clearInput();worldUI.endTalk();});
 $('ask').onclick=()=>{const show=$('answer').hidden;$('answer').hidden=!show;$('ask').setAttribute('aria-expanded',String(show));};
 $('back').onclick=()=>{if(page>0){page--;render();}};
 $('next').onclick=()=>{
  if(!active||sent)return;
  if(page<active.data.pages.length-1){page++;render();$('next').focus();return;}
  if(!sameObjective(state(),active.index)){close();return;}
  sent=true;$('next').disabled=true;const n=active.n,index=active.index;complete(n,index);close();
 };
 return {
  open(n){const obj=objective(),data=dialogueFor(obj);if(!data)return false;
   if(dialog.open)close();active={obj,data,n,index:{quest:state().quest,step:state().step}};page=0;sent=false;
   game.cancelWalk?.();game.clearInput();game.world.setAuto?.(false);
   $('chapter').textContent=obj.quest.chapter??'บทที่ 1 · ประทีปที่ดับพร้อมกัน';$('name').textContent=n.name;$('title').textContent=obj.quest.title;
   render();dialog.showModal();$('next').focus();return true;
  },
  update(){if(active&&(!sameObjective(state(),active.index)||game.world.player.hp<=0||Math.hypot(game.world.player.x-active.n.x,game.world.player.z-active.n.z)>4))close();},
  get isOpen(){return dialog.open;}
 };
}
