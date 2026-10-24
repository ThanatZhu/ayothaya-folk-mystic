import {placeCoachTip} from './coach-layout.js?v=walk149';
// 0.99 tutorial coach: a gold arrow and a tip bubble point at the next thing to press for the current story step.
// Each guide lists targets from the LAST action back to the FIRST; the first one on screen wins, so the arrow moves
// along by itself as the player opens the bag, picks the item, and so on. It lives in a popover so it can sit above
// modal windows (the bag, the skill tree). Off switch: the × on the bubble, or the toggle in the quest tracker.
import {STARTER_WEAPON} from './story-quests.js?v=98';

const OFF='ayothaya-coach-off';
const menu=(id,text)=>[{sel:'#'+id,text},{sel:'#menu-toggle',text:'เปิดเมนู'},{sel:'#menu-more',text:'เปิดเมนูเพิ่มเติม'}];
// 0.104 a bag item may sit off the grid's scroll area or under another tab: point at the item if it shows, otherwise
// at its category tab first (cat/label match bag-ui TABS); `reveal` scrolls it into view once its own tab is open.
const bagItem=(sel,text,cat,label)=>[{sel:`#bag-grid ${sel}`,text,reveal:`#bag-tabs [data-cat="${cat}"][aria-selected="true"]`},
 {sel:`#bag-tabs [data-cat="${cat}"][aria-selected="false"]`,text:`แตะแท็บ ${label} ก่อน`}];
function guide(step,{world,weapon,walking}){
 if(!step||walking)return []; // the auto-walk is already heading there
 if(step.type==='talk'||step.type==='enter')return document.getElementById('npc-dialog')?.hidden===false?[]:[{sel:'#quest-go',text:'กด ▶ เดินไป ตัวละครจะเดินไปเอง'}];
 if(step.type==='defeat')return world.auto?[]:world.targetId!==null&&world.targetId!==undefined?[{sel:'#attack',text:'กดโจมตี (Space) หรือเปิด AUTO'}]:[{sel:'#quest-go',text:'กด ▶ เดินไปหามอนสเตอร์'}];
 if(step.type==='level')return world.auto?[]:[{sel:'#auto-attack',text:'เปิด AUTO ให้ตัวละครล่าเก็บเลเวล'}];
 switch(step.action){
  case 'equip':return [{sel:'#bag-detail [data-act="wear"]',text:'กด สวมใส่'},...bagItem(`[data-id^="${weapon}"]`,'แตะอาวุธที่ได้รับ','gear','อุปกรณ์'),...menu('menu-bag','เปิดกระเป๋า')];
  case 'skill':return [{sel:'#skill-window .skill-node>button:not(:disabled)',text:'กด + เพื่ออัปสกิล (ใช้ 1 แต้ม)'},{sel:'#skill-window[open] .skill-hint',text:'ยังไม่มีแต้มสกิล · ล่ามอนให้ Job เลเวลขึ้น (1 เลเวล = 1 แต้ม) แล้วกลับมาที่นี่'},...menu('menu-skills','เปิดหน้าสกิล')];
  case 'auto':return [{sel:'#auto-attack',text:'กด AUTO ให้ตัวละครล่าเอง'}];
  case 'refine':return [{sel:'#refine-go:not(:disabled)',text:'กด ตีบวก (+1 ถึง +4 ไม่แตก)'},{sel:'#refine-list button[data-slot]:not(:disabled)',text:'เลือกอุปกรณ์ที่จะตีบวก'},{sel:'#npc-refine',text:'เลือก ตีบวกอุปกรณ์'},{sel:'#quest-go',text:'กด ▶ เดินไปหาครูแสนดาบ'}];
  case 'card':return [{sel:'#status-window [data-slotcard="weapon"]',text:'กด ใส่การ์ด'},...menu('menu-status','เปิดหน้าสถานะ')];
  case 'craft':return [{sel:'#craft-list button[data-out]:not(:disabled)',text:'กด ทำ'},{sel:'#craft-window[open] .refine-note',text:'วัตถุดิบยังไม่พอ · ล่ามอนเก็บของดรอป (ฟางมัด 3 = ยาแดง 2 ขวด)'},{sel:'#bag-craft',text:'กด ⚒ คราฟต์'},...menu('menu-bag','เปิดกระเป๋า')];
  case 'shop':return [{sel:'#shop-list button.deal:not(:disabled)',text:'กด ซื้อ หรือ ขาย',reveal:'#shop-window[open]'},{sel:'.shop-tabs [data-tab="sell"]',text:'แตะแท็บ ขาย ก่อน'},{sel:'#npc-shop',text:'เปิดร้านค้า'},{sel:'#quest-go',text:'กด ▶ เดินไปหาแม่บัว'}];
  case 'guild':return menu('menu-social','เปิด สังคม แล้วไปที่แท็บกิลด์');
  case 'duel':return menu('menu-players','เปิดรายชื่อผู้เล่น แล้วกด ท้าดวล');
 }
 return [];
}
// On screen, not under a closed dialog or a hidden ancestor, and not scrolled out of a scrolling box (the bag grid):
// a clipped item still has an on-screen rect, which used to put the ring outside the bag.
const clipped=el=>{const r=el.getBoundingClientRect(),cy=r.top+r.height/2,cx=r.left+r.width/2;
 for(let p=el.parentElement;p&&p!==document.body;p=p.parentElement){const o=getComputedStyle(p);if(!/auto|scroll|hidden|clip/.test(o.overflowY+o.overflowX))continue;
  const b=p.getBoundingClientRect();if(cy<b.top||cy>b.bottom||cx<b.left||cx>b.right)return true;}return false;};
const shown=el=>{if(!el)return false;const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&r.bottom>0&&r.right>0&&r.top<innerHeight&&r.left<innerWidth&&el.checkVisibility?.({checkVisibilityCSS:true})!==false&&!clipped(el);};

export function createCoach({game,account,objective,paused=()=>false}){
 const world=game.world;let off=false;try{off=localStorage.getItem(OFF)==='1';}catch{}
 const el=document.createElement('div');el.id='coach';el.setAttribute('popover','manual');el.setAttribute('aria-live','polite');
 el.innerHTML='<i class="coach-ring"></i><b class="coach-arrow" aria-hidden="true">▼</b><p class="coach-tip"><span></span><button type="button" aria-label="ปิดลูกศรแนะนำ">×</button></p>';
 document.body.append(el);
 const ring=el.querySelector('.coach-ring'),arrow=el.querySelector('.coach-arrow'),tip=el.querySelector('.coach-tip'),text=tip.querySelector('span');
 const popover=typeof el.showPopover==='function';
 const show=on=>{if(popover){if(on&&!el.matches(':popover-open'))el.showPopover();if(!on&&el.matches(':popover-open'))el.hidePopover();}el.hidden=!on;};
 tip.querySelector('button').onclick=()=>api.setOff(true);
 tip.onclick=e=>{if(e.target.closest('button'))return;const obj=objective();if(!obj)return;const weapon=STARTER_WEAPON[account?.character?.classId??world.profession?.id]??'wrap-novice';const steps=guide(obj.step,{world,weapon,walking:game.walking}).map(g=>({...g,node:document.querySelector(g.sel)}));const pick=steps.find(g=>shown(g.node));if(pick?.node)pick.node.click();};
 let lastTop=null,lastText='',lastLayout='';
 const api={
  get off(){return off;},
  setOff(v){off=v;try{localStorage.setItem(OFF,v?'1':'0');}catch{}if(off)show(false);},
  update(){
   const obj=objective();
   if(off||!obj||paused()){show(false);return;}
   const weapon=STARTER_WEAPON[account?.character?.classId??world.profession?.id]??'wrap-novice';
   const steps=guide(obj.step,{world,weapon,walking:game.walking}).map(g=>({...g,node:document.querySelector(g.sel)}));
   // the item's own tab is open but the item is scrolled away: bring it into view instead of pointing elsewhere
   for(const g of steps)if(g.reveal&&g.node&&!shown(g.node)&&document.querySelector(g.reveal))g.node.scrollIntoView({block:'nearest'});
   const pick=steps.find(g=>shown(g.node));
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
   const layout=[r.left,r.top,r.width,r.height,innerWidth,innerHeight,pick.text,top?.id,document.getElementById('quest-tracker')?.getBoundingClientRect().height].join(':');if(layout===lastLayout)return;lastLayout=layout;
   const tw=Math.min(260,innerWidth-24);tip.style.width=tw+'px';tip.style.visibility='hidden';tip.hidden=false;
   const measured=tip.getBoundingClientRect(),q=document.getElementById('quest-tracker'),quest=shown(q)?q.getBoundingClientRect():null;
   const obstacles=[...document.querySelectorAll('button,input,textarea,select')].filter(n=>n!==tip.querySelector('button')&&!el.contains(n)&&shown(n)).map(n=>n.getBoundingClientRect());
   const pos=placeCoachTip({target:r,quest,width:tw,height:measured.height,viewportWidth:innerWidth,viewportHeight:innerHeight,obstacles});
   tip.hidden=!pos;if(pos)Object.assign(tip.style,{left:pos.left+'px',top:pos.top+'px',visibility:'visible'});

  },
 };
 return api;
}
