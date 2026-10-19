// 0.99 tutorial coach: a gold arrow and a tip bubble point at the next thing to press for the current story step.
// Each guide lists targets from the LAST action back to the FIRST; the first one on screen wins, so the arrow moves
// along by itself as the player opens the bag, picks the item, and so on. It lives in a popover so it can sit above
// modal windows (the bag, the skill tree). Off switch: the × on the bubble, or the toggle in the quest tracker.
import {STARTER_WEAPON} from './story-quests.js?v=98';

const OFF='ayothaya-coach-off';
const menu=(id,text)=>[{sel:'#'+id,text},{sel:'#menu-toggle',text:'เปิดเมนู'},{sel:'#menu-more',text:'เปิดเมนูเพิ่มเติม'}];
function guide(step,{world,weapon,walking}){
 if(!step||walking)return []; // the auto-walk is already heading there
 if(step.type==='talk'||step.type==='enter')return document.getElementById('npc-dialog')?.hidden===false?[]:[{sel:'#quest-go',text:'กด ▶ เดินไป ตัวละครจะเดินไปเอง'}];
 if(step.type==='defeat')return world.auto?[]:world.targetId!==null&&world.targetId!==undefined?[{sel:'#attack',text:'กดโจมตี (Space) หรือเปิด AUTO'}]:[{sel:'#quest-go',text:'กด ▶ เดินไปหามอนสเตอร์'}];
 if(step.type==='level')return world.auto?[]:[{sel:'#auto-attack',text:'เปิด AUTO ให้ตัวละครล่าเก็บเลเวล'}];
 switch(step.action){
  case 'equip':return [{sel:'#bag-detail [data-act="wear"]',text:'กด สวมใส่'},{sel:`#bag-grid [data-id="${weapon}"]`,text:'แตะอาวุธที่ได้รับ'},...menu('menu-bag','เปิดกระเป๋า')];
  case 'skill':return [{sel:'#skill-window .skill-node>button:not(:disabled)',text:'กด + เพื่ออัปสกิล (ใช้ 1 แต้ม)'},{sel:'#skill-window[open] .skill-hint',text:'ยังไม่มีแต้มสกิล · ล่ามอนให้ Job เลเวลขึ้น (1 เลเวล = 1 แต้ม) แล้วกลับมาที่นี่'},...menu('menu-skills','เปิดหน้าสกิล')];
  case 'auto':return [{sel:'#auto-attack',text:'กด AUTO ให้ตัวละครล่าเอง'}];
  case 'refine':return [{sel:'#refine-list button[data-slot]:not(:disabled)',text:'กด ตีบวก (+1 ถึง +4 ไม่แตก)'},{sel:'#npc-refine',text:'เลือก ตีบวกอาวุธ / เกราะ'},{sel:'#quest-go',text:'กด ▶ เดินไปหาครูแสนดาบ'}];
  case 'card':return [{sel:'#status-window [data-slotcard="weapon"]',text:'กด ใส่การ์ด'},...menu('menu-status','เปิดหน้าสถานะ')];
  case 'craft':return [{sel:'#craft-list button[data-out]:not(:disabled)',text:'กด ทำ'},{sel:'#craft-window[open] .refine-note',text:'วัตถุดิบยังไม่พอ · ล่ามอนเก็บของดรอป (ฟางมัด 3 = ยาแดง 2 ขวด)'},{sel:'#bag-craft',text:'กด ⚒ คราฟต์'},...menu('menu-bag','เปิดกระเป๋า')];
  case 'pet':return [{sel:'#bag-detail [data-act="hatch"]',text:'กด ฟักไข่'},{sel:'#bag-grid [data-id^="egg-"]',text:'แตะไข่ที่ได้'},{sel:'#bag-detail [data-act="tame"]',text:'กด ล่อสัตว์ (เลือกมอนตัวเล็กเป็นเป้าก่อน)'},{sel:'#bag-grid [data-id="pet-lure"]',text:'แตะข้าวเหนียวล่อสัตว์'},...menu('menu-bag','เลือกมอนตัวเล็ก แล้วเปิดกระเป๋า')];
  case 'shop':return [{sel:'#shop-window .deal',text:'กด ซื้อ หรือ ขาย'},{sel:'#npc-shop',text:'เปิดร้านค้า'},{sel:'#quest-go',text:'กด ▶ เดินไปหาแม่บัว'}];
  case 'guild':return menu('menu-social','เปิด สังคม แล้วไปที่แท็บกิลด์');
  case 'duel':return menu('menu-players','เปิดรายชื่อผู้เล่น แล้วกด ท้าดวล');
 }
 return [];
}
// On screen and not under a closed dialog or a hidden ancestor.
const shown=el=>{if(!el)return false;const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&r.bottom>0&&r.right>0&&r.top<innerHeight&&r.left<innerWidth&&el.checkVisibility?.({checkVisibilityCSS:true})!==false;};

export function createCoach({game,account,objective,paused=()=>false}){
 const world=game.world;let off=false;try{off=localStorage.getItem(OFF)==='1';}catch{}
 const el=document.createElement('div');el.id='coach';el.setAttribute('popover','manual');el.setAttribute('aria-live','polite');
 el.innerHTML='<i class="coach-ring"></i><b class="coach-arrow" aria-hidden="true">▼</b><p class="coach-tip"><span></span><button type="button" aria-label="ปิดลูกศรแนะนำ">×</button></p>';
 document.body.append(el);
 const ring=el.querySelector('.coach-ring'),arrow=el.querySelector('.coach-arrow'),tip=el.querySelector('.coach-tip'),text=tip.querySelector('span');
 const popover=typeof el.showPopover==='function';
 const show=on=>{if(popover){if(on&&!el.matches(':popover-open'))el.showPopover();if(!on&&el.matches(':popover-open'))el.hidePopover();}el.hidden=!on;};
 tip.querySelector('button').onclick=()=>api.setOff(true);
 let lastTop=null,lastText='';
 const api={
  get off(){return off;},
  setOff(v){off=v;try{localStorage.setItem(OFF,v?'1':'0');}catch{}if(off)show(false);},
  update(){
   const obj=objective();
   if(off||!obj||paused()){show(false);return;}
   const weapon=STARTER_WEAPON[account?.character?.classId??world.profession?.id]??'wrap-novice';
   const pick=guide(obj.step,{world,weapon,walking:game.walking}).map(g=>({...g,node:document.querySelector(g.sel)})).find(g=>shown(g.node));
   if(!pick){show(false);return;}
   // a modal opened after the coach covers it: re-show so the coach is the newest top-layer element again
   const top=[...document.querySelectorAll('dialog[open]')].at(-1)??null;
   if(popover&&top!==lastTop&&el.matches(':popover-open'))el.hidePopover();lastTop=top;
   show(true);
   const r=pick.node.getBoundingClientRect(),below=r.top<90;
   Object.assign(ring.style,{left:r.left-6+'px',top:r.top-6+'px',width:r.width+12+'px',height:r.height+12+'px'});
   arrow.textContent=below?'▲':'▼';arrow.classList.toggle('below',below);
   arrow.style.left=r.left+r.width/2+'px';arrow.style.top=(below?r.bottom+8:r.top-34)+'px';
   if(pick.text!==lastText){lastText=pick.text;text.textContent=pick.text;}
   const tw=Math.min(260,innerWidth-24),tx=Math.min(Math.max(12,r.left+r.width/2-tw/2),innerWidth-tw-12);
   Object.assign(tip.style,{left:tx+'px',width:tw+'px',top:(below?r.bottom+40:Math.max(8,r.top-84))+'px'});
  },
 };
 return api;
}
