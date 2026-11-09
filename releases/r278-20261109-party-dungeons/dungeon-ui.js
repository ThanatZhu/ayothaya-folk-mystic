// Party dungeon window (owner 8–9 Nov 2026): pick a dungeon and difficulty, enter solo or as a party, find players,
// answer ready checks, trade shards for a rainbow piece; inside a dungeon a small tracker shows the room goal.
import {openHudPanel} from './hud-panels.js';
import {DUNGEONS,DIFFICULTY,SHARDS_PER_PIECE,CHESTS_PER_DAY,dungeonByMap} from './dungeons.js';
import {dungeonActions,oddsText,errorText} from './dungeon-window-state.js';
import {DUNGEON_SLOTS,dungeonPieceId} from './gear-sets.js';
import {itemDef} from './items.js?v=107';
import {baseProgress} from './experience.js';
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;};
const SLOT_NAME={head:'หมวก',armor:'เสื้อ',garment:'ผ้าคลุม',shoes:'รองเท้า'};
export function createDungeonUI({game,map,worldUI,bagUI}){
 const css=el('link');css.rel='stylesheet';css.href='dungeon-ui.css?v=1';document.head.append(css);
 const send=data=>game.world.market?.('dungeon',data);
 let selected=DUNGEONS[0].id,difficulty='normal',queue=null,info=null,ready=null,leaving=null,storySeen=new Set(),runView=null;
 // ---- HUD button
 const button=el('button');button.id='menu-dungeon';button.type='button';button.setAttribute('aria-label','เปิดหน้าดันเจี้ยนปาร์ตี้');
 const icon=el('i');icon.setAttribute('aria-hidden','true');const art=el('img','dungeon-menu-art');art.src='assets/dungeon-krasue/menu.webp';art.alt='';icon.append(art);
 button.append(icon,el('span','','ดันเจี้ยน'));document.getElementById('game-menu')?.append(button);
 // ---- window
 const dialog=el('dialog');dialog.id='dungeon-window';dialog.setAttribute('aria-labelledby','dungeon-title');
 dialog.innerHTML='<header class="dungeon-header"><h2 id="dungeon-title">ดันเจี้ยนปาร์ตี้</h2><button type="button" id="dungeon-close" aria-label="ปิดหน้าดันเจี้ยน">×</button></header><div class="dungeon-body"><nav class="dungeon-list" id="dungeon-list"></nav><section class="dungeon-detail" id="dungeon-detail"></section></div>';
 (document.getElementById('game-shell')??document.body).append(dialog);const $=id=>dialog.querySelector('#'+id);
 const level=()=>baseProgress(game.world).level,bag=()=>bagUI?.bag?.()??{items:{}},shards=d=>bag().items?.[d.shard]??0;
 function render(){
  const list=$('dungeon-list');list.replaceChildren();
  for(const d of DUNGEONS){const b=el('button','dungeon-card'+(d.id===selected?' on':'')+(level()<d.level?' locked':''));b.type='button';
   const img=el('img');img.src=d.cover;img.alt='';b.append(img,el('strong','',d.name),el('small','',level()<d.level?'🔒 Lv.'+d.level:'Lv.'+d.level));
   b.onclick=()=>{selected=d.id;render();};list.append(b);}
  const d=DUNGEONS.find(x=>x.id===selected),acts=dungeonActions({level:level(),dungeon:d,online:!!game.online,queue,inRun:!!info?.inRun||!!map.dungeon});
  const detail=$('dungeon-detail');detail.replaceChildren();
  const cover=el('div','dungeon-cover');const big=el('img');big.src=d.cover;big.alt='';cover.append(big,el('h3','',d.name),el('span','','Lv.'+d.level+' · ปาร์ตี้ 1–5 คน'));detail.append(cover);
  const diffs=el('div','dungeon-difficulty');for(const [key,v] of Object.entries(DIFFICULTY)){const b=el('button',key===difficulty?'on':'',v.name);b.type='button';b.onclick=()=>{difficulty=key;render();};diffs.append(b);}detail.append(diffs);
  const used=info?.used?.[d.id]??0,drops=el('div','dungeon-drops');
  drops.append(el('p','','หีบหลังเคลียร์: ชุด'+d.name+' 1 ชิ้น · '+oddsText(difficulty)),el('p','','เศษดันต่อรอบ: '+DIFFICULTY[difficulty].shards+' · ได้ทุกรอบ'),el('p','dungeon-chests','หีบวันนี้ เหลือ '+Math.max(0,CHESTS_PER_DAY-used)+'/'+CHESTS_PER_DAY));
  const icons=el('div','dungeon-icons');for(const slot of DUNGEON_SLOTS){const it=itemDef(dungeonPieceId(d.set,slot));const i=el('img');i.src=it?.image??'';i.alt=it?.name??'';i.title=it?.name??'';icons.append(i);}
  const shardIcon=el('img');shardIcon.src=itemDef(d.shard)?.image??'';shardIcon.alt='';shardIcon.title=itemDef(d.shard)?.name??'';icons.append(shardIcon);drops.append(icons);detail.append(drops);
  const actions=el('div','dungeon-actions');
  const enter=el('button','dungeon-enter','เข้าดัน');enter.type='button';enter.disabled=!acts.enter.on;enter.title=acts.enter.reason??'';enter.onclick=()=>send({action:'enter',dungeon:d.id,difficulty});
  const find=el('button','dungeon-find',acts.queue.cancel?'ยกเลิกหาคน':'หาคน');find.type='button';find.disabled=!acts.queue.on;find.onclick=()=>send(acts.queue.cancel?{action:'unqueue'}:{action:'queue',dungeon:d.id,difficulty});
  // a seat is reserved but you are not inside (the trip in failed or you were sent away): go back in, or give it up
  if(info?.inRun&&!map.dungeon){enter.textContent='กลับเข้าดัน';enter.disabled=false;enter.title='';enter.onclick=()=>worldUI.dungeonTravel?.(d.map);
   const quit=el('button','dungeon-find','ออกจากรอบนี้');quit.type='button';quit.onclick=()=>{if(confirm('ออกจากรอบดันนี้? ออกแล้วกลับเข้ารอบนี้ไม่ได้'))send({action:'leave'});};actions.append(enter,quit);}
  else actions.append(enter,find);if(acts.enter.reason)actions.append(el('small','dungeon-reason',acts.enter.reason));
  if(queue?.state==='waiting')actions.append(el('small','dungeon-reason','กำลังหาคน · '+DIFFICULTY[queue.difficulty]?.name));detail.append(actions);
  const have=shards(d),ex=el('div','dungeon-exchange');ex.append(el('h4','','แลกชุดดันสีรุ้ง · มีเศษ '+have.toLocaleString()+'/'+SHARDS_PER_PIECE));
  const row=el('div','dungeon-exchange-row');for(const slot of DUNGEON_SLOTS){const b=el('button','',SLOT_NAME[slot]);b.type='button';b.disabled=have<SHARDS_PER_PIECE||!game.online;b.onclick=()=>send({action:'exchange',dungeon:d.id,slot});row.append(b);}
  ex.append(row);detail.append(ex);
 }
 function show(){game.clearInput();openHudPanel(dialog);send({action:'info'});render();}
 button.onclick=()=>dialog.open?dialog.close():show();
 $('dungeon-close').onclick=()=>dialog.close();dialog.addEventListener('close',()=>{game.clearInput();button.focus({preventScroll:true});});
 // ---- ready check and queue offer
 const pop=el('div','dungeon-pop');pop.hidden=true;(document.getElementById('game-shell')??document.body).append(pop);
 function popUp(text,buttons,seconds=0){pop.replaceChildren(el('p','',text));const row=el('div','dungeon-pop-row');for(const [label,fn] of buttons){const b=el('button','',label);b.type='button';b.onclick=()=>{pop.hidden=true;fn();};row.append(b);}pop.append(row);pop.hidden=false;
  if(seconds){const timer=el('small','dungeon-pop-timer');pop.append(timer);const end=performance.now()+seconds*1000;const tick=()=>{if(pop.hidden)return;const left=Math.max(0,Math.ceil((end-performance.now())/1000));timer.textContent=left+' วิ';if(left)requestAnimationFrame(tick);else pop.hidden=true;};tick();}}
 // ---- tracker inside a dungeon
 const tracker=el('div','dungeon-tracker');tracker.hidden=!map.dungeon;const goal=el('p','dungeon-goal',dungeonByMap(map.id)?.name??'');const out=el('button','dungeon-leave','ออกจากดัน');out.type='button';
 out.onclick=()=>{if(leaving){worldUI.dungeonTravel?.(leaving);return;}if(confirm('ออกจากดันเจี้ยน? ออกแล้วกลับเข้ารอบนี้ไม่ได้'))send({action:'leave'});};
 tracker.append(goal,out);(document.getElementById('game-shell')??document.body).append(tracker);
 function story(kind){const d=dungeonByMap(map.id);if(!d||storySeen.has(kind))return;storySeen.add(kind);
  dispatchEvent(new CustomEvent('quest-cinematic-request',{detail:{scene:{id:'dungeon-'+d.id+'-'+kind,title:d.name,art:{src:d.cover,panels:1,frames:d.story[kind].map(()=>[0,0,960,400])},captions:d.story[kind]}}}));}
 function goHome(mapId,delay){leaving=mapId;out.textContent='กลับทันที';setTimeout(()=>worldUI.dungeonTravel?.(mapId),delay);}
 game.onEvent(e=>{
  if(e.type==='dungeonInfo'){info=e;if(dialog.open)render();}
  else if(e.type==='dungeonQueue'){queue=e.state==='waiting'||e.state==='offer'?e:null;if(e.state==='offer')popUp('หาคนได้ '+e.size+' คนแล้ว · เข้าเลยไหม',[['เข้าเลย',()=>send({action:'accept'})],['รอต่อ',()=>{}]]);if(dialog.open)render();}
  else if(e.type==='dungeonReady'){ready=e;const d=DUNGEONS.find(x=>x.id===e.dungeon);popUp(e.leader+' ชวนเข้า '+(d?.name??'ดันเจี้ยน')+' · '+(DIFFICULTY[e.difficulty]?.name??''),[['พร้อม',()=>send({action:'ready',yes:true})],['ไม่พร้อม',()=>send({action:'ready',yes:false})]],e.seconds);}
  else if(e.type==='dungeonEnter'){pop.hidden=true;if(dialog.open)dialog.close();game.world.notice('กำลังเข้าดันเจี้ยน…');worldUI.dungeonTravel?.(e.map);}
  else if(e.type==='dungeonError')game.world.notice(errorText(e.reason));
  else if(e.type==='dungeonExit'){if(map.dungeon)goHome(e.mapId,300);else{game.world.notice('ออกจากรอบดันแล้ว');send({action:'info'});}}
  else if(e.type==='dungeonEnded'){game.world.notice(e.cleared?'เคลียร์ดันเจี้ยนแล้ว! · กลับอัตโนมัติใน 15 วินาที':'รอบนี้จบแล้ว · กำลังพากลับ');goHome(e.mapId,e.cleared?15000:2000);}
  else if(e.type==='dungeonReward'){const piece=e.piece?itemDef(e.piece)?.name:null;game.world.notice('ได้เศษดัน '+e.shards+(piece?' · '+piece:'')+(e.chest?' · หีบวันนี้เหลือ '+e.chestsLeft:' · หีบวันนี้ครบแล้ว'));}
  else if(e.type==='dungeonExchanged'){game.world.notice('แลกได้ '+(itemDef(e.item)?.name??'ชุดรุ้ง'));if(dialog.open)render();}
  else if(e.type==='dungeonRun'){runView=e;tracker.hidden=false;goal.textContent=e.name+(e.text&&e.text!==e.name?' · '+e.text:'');
   if(e.room===0)story('enter');if(e.kind==='boss')story('boss');}
 });
 if(map.dungeon)setTimeout(()=>send({action:'info'}),1500);   // the room goal after a reload
 return {open:show};
}
