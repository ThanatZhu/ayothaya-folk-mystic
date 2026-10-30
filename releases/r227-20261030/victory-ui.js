// 0.122 Victory screen after a boss kill (ROX-inspired, our own art): crest + fight time, the boss card, MVP (top
// individual damage) with crown, rare drops the authority really handed out, and the party/solo ranking. Pops up once
// per encounter for the people in the report only, closes itself after 8 s unless the player starts using it.
import {bossResultGroups,mergeBossLoot,bossCard,involves} from './boss-results.js?v=surfaces222';
import {bossRanking,format} from './boss-results-ui.js?v=surfaces222';
import {classPortrait,monsterPortrait} from './portraits.js?v=surfaces222';
import {className} from './classes.js?v=novice174';
import {MONSTER_TYPES} from './combat-core.js?v=surfaces222';
import {itemDef} from './items.js?v=class-reward192';
import {iconStyle} from './bag-ui.js?v=surfaces222';

const el=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!=null)node.textContent=text;return node;};
export const AUTO_CLOSE=8000;
const mmss=s=>{const t=Math.max(0,Math.round(s));return Math.floor(t/60)+':'+String(t%60).padStart(2,'0');};
const RARITY_GLOW=['','','#73b8ff','#c79bff','#ffd36b'];
export function createVictoryUI({game}){
 const css=el('link');css.rel='stylesheet';css.href='victory-ui.css?v=victory197';document.head.append(css);
 const root=el('section');root.id='victory-screen';root.hidden=true;root.setAttribute('role','dialog');root.setAttribute('aria-labelledby','victory-title');
 const backdrop=el('div','victory-backdrop'),stage=el('div','victory-stage');
 const crest=el('header','victory-crest'),emblem=el('img');emblem.src='assets/victory/victory-emblem.webp';emblem.alt='';emblem.decoding='async';
 const word=el('strong','','ชนะ!');word.id='victory-title';const time=el('p','victory-time');crest.append(emblem,word,time);
 const card=el('figure','victory-card'),cardImg=el('img'),cardName=el('figcaption');cardImg.alt='';card.append(cardImg,cardName);
 const panel=el('div','victory-panel'),tabs=el('nav','victory-tabs'),rewardsTab=el('button','','รางวัล'),rankTab=el('button','','อันดับ');
 for(const [b,name] of [[rewardsTab,'rewards'],[rankTab,'ranking']]){b.type='button';b.dataset.tab=name;b.setAttribute('role','tab');}tabs.setAttribute('role','tablist');tabs.append(rewardsTab,rankTab);
 const rewards=el('section','victory-rewards'),ranking=el('section','victory-ranking boss-result-table');rewards.setAttribute('role','tabpanel');ranking.setAttribute('role','tabpanel');
 const close=el('button','victory-close','×');close.type='button';close.setAttribute('aria-label','ปิด');
 panel.append(tabs,rewards,ranking);stage.append(crest,card,panel,close);root.append(backdrop,stage);
 document.body.append(root); // above the coach tips and HUD layers, which live outside #game-shell's stacking
 // the ranking reuses the report's look; its stylesheet is normally loaded by the boss browser
 if(!document.querySelector('link[href^="boss-results-ui.css"]')){const rank=el('link');rank.rel='stylesheet';rank.href='boss-results-ui.css?v=victory197';document.head.append(rank);}

 const seen=new Set(),queue=[];let current=null,tab='rewards',timer=0;
 function stopTimer(){clearTimeout(timer);timer=0;}
 function shut(){stopTimer();root.hidden=true;document.body.classList.remove('victory-open');current=null;game.clearInput?.();const next=queue.shift();if(next)show(next);}
 function setTab(name){tab=name;rewardsTab.setAttribute('aria-selected',String(name==='rewards'));rankTab.setAttribute('aria-selected',String(name==='ranking'));rewards.hidden=name!=='rewards';ranking.hidden=name!=='ranking';}
 function drawCard(result){
  const {awakened,src}=bossCard(result.bossId);card.dataset.awakened=String(awakened);cardName.textContent=result.bossName;
  const index=MONSTER_TYPES.findIndex(t=>t.id===result.bossId),sprite=()=>{card.dataset.sprite='true';if(index<0){cardImg.removeAttribute('src');return;}monsterPortrait(index).then(url=>{if(current===result)cardImg.src=url;}).catch(()=>cardImg.removeAttribute('src'));};
  card.dataset.sprite='false';cardImg.onerror=()=>{cardImg.onerror=null;sprite();};
  if(src)cardImg.src=src;else sprite();
 }
 function drawRewards(result){
  rewards.replaceChildren();
  const mvp=bossResultGroups(result).flatMap(g=>g.members).sort((a,b)=>b.damage-a.damage)[0]??result.rows?.[0];
  if(mvp){
   const box=el('div','victory-mvp'),face=el('div','victory-face'),portrait=el('img'),crown=el('img','victory-crown');portrait.alt='';crown.src='assets/victory/mvp-crown.webp';crown.alt='';
   classPortrait(mvp.classId,mvp.gender).then(url=>{portrait.src=url;}).catch(()=>{});face.append(portrait,crown);
   const who=el('div','victory-mvp-text'),name=el('strong','',mvp.name);name.dataset.i18nSkip='';
   who.append(el('small','','MVP · ผู้ทำดาเมจสูงสุด'),name,el('span','',className(mvp.classId)+' · '+format(mvp.damage)+' DMG'));
   box.append(face,who);rewards.append(box);
  }
  rewards.append(el('h3','','ของหายากที่ดรอป'));
  const rows=result.rewards??[];
  if(!rows.length){rewards.append(el('p','victory-empty','ไม่มีของหายากดรอปในการต่อสู้นี้'));return;}
  const list=el('ul','victory-drops');
  rows.forEach((row,i)=>{
   const def=itemDef(row.itemId),item=el('li','victory-drop');item.dataset.status=row.status;item.style.setProperty('--delay',(i*140)+'ms');item.style.setProperty('--glow',RARITY_GLOW[def?.rarity??0]||'transparent');
   const icon=el('i','victory-icon');icon.setAttribute('style',iconStyle(row.itemId));icon.setAttribute('aria-hidden','true');
   const text=el('div','victory-drop-text'),winner=el('small','',row.name);winner.dataset.i18nSkip='';
   text.append(el('strong','',(def?.name??row.itemId)+' ×'+row.count),winner);
   const note={ground:'ตกอยู่บนพื้น · รอเก็บ',expired:'หมดเวลาเก็บ',pending:'รอยืนยันจากเซิร์ฟเวอร์',mailed:'กระเป๋าเต็ม · ส่งไปที่จดหมาย',lost:'กระเป๋าเต็ม · ไม่ได้รับ'}[row.status];if(note)text.append(el('em','',note));
   item.append(icon,text);list.append(item);
  });
  rewards.append(list);
 }
 function draw(){
  const result=current;if(!result)return;
  time.textContent='ระยะเวลาต่อสู้ '+mmss(result.duration);
  drawCard(result);drawRewards(result);ranking.replaceChildren(...bossRanking(result,game.world.networkSelfId));setTab(tab);
 }
 function show(result){current=result;tab='rewards';draw();root.hidden=false;document.body.classList.add('victory-open');game.clearInput?.();stopTimer();timer=setTimeout(shut,AUTO_CLOSE);}
 // Using the panel (tabs, party rows, scrolling) keeps it open; a tap on the empty backdrop, × or Escape closes it.
 panel.addEventListener('pointerdown',e=>{e.stopPropagation();stopTimer();});
 card.addEventListener('pointerdown',e=>e.stopPropagation());
 for(const b of [rewardsTab,rankTab])b.onclick=e=>{e.stopPropagation();setTab(b.dataset.tab);};
 close.onclick=e=>{e.stopPropagation();shut();};
 backdrop.addEventListener('click',shut);stage.addEventListener('click',e=>{if(e.target===stage)shut();});
 // capture: Escape closes this first instead of also opening the game menu underneath
 addEventListener('keydown',e=>{if(!root.hidden&&e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();shut();}},true);
 game.onEvent(event=>{
  if(event.type==='bossLoot'){
   if(current&&current.encounterId===event.encounterId){current=mergeBossLoot(current,event);draw();}
   for(let i=0;i<queue.length;i++)queue[i]=mergeBossLoot(queue[i],event);return;
  }
  if(event.type!=='bossResult'||!Array.isArray(event.rows)||seen.has(event.encounterId))return;
  seen.add(event.encounterId);
  if(game.world.observer||!involves(event,game.world.networkSelfId))return;
  if(current)queue.push(event);else show(event);
 });
 return {root,show,close:shut,get current(){return current;}};
}
