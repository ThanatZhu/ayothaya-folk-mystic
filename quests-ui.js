// 0.60 "ภารกิจ" window: daily bounty board (claim in a town) and the card album. Online the realm server owns both;
// offline guests keep them in localStorage and pay out through the same 'reward' / experience events.
import {itemDef} from './items.js?v=107';
import {MONSTER_TYPES} from './combat-core.js?v=109.4';
import {awardExperience} from './experience.js?v=105.3';
import {dailyBounties,normalizeBounty,bountyDefeat,bountyClaim,normalizeAlbum,albumAdd,ALBUM_CARDS,ALBUM_MILESTONES,WEEKLY,normalizeWeekly} from './bounty.js?v=107';
import {iconStyle} from './bag-ui.js?v=107';
import {openHudPanel} from './hud-panels.js?v=34';
const $=id=>document.getElementById(id);
const icon=(id,c='item-icon')=>`<i class="${c}" style="${iconStyle(id)}"></i>`;
const TIER=['ง่าย','กลาง','ยาก','หัวหน้า'];

export function createQuestsUI({game,account,map,bagUI}){
 const world=game.world,slot=(account?.serverId??'local')+':'+(account?.slotId??'guest');
 const load=k=>{try{return JSON.parse(localStorage.getItem(k+slot));}catch{return null;}},keep=(k,v)=>{try{localStorage.setItem(k+slot,JSON.stringify(v));}catch{}};
 let localBounty=load('ayothaya-bounty:'),localAlbum=normalizeAlbum(load('ayothaya-album:')),tab='bounty',shown='';
 const bounty=()=>normalizeBounty(game.online?world.bounty:localBounty,Date.now()),album=()=>normalizeAlbum(game.online?world.album:localAlbum);
 game.onEvent(e=>{
  if(game.online){if(e.type==='album')world.notice(`สมุดการ์ดครบ ${e.count} ใบ · ได้รับรางวัล!`);return;}
  if(e.type==='defeat'){const mob=world.mobs.find(m=>m.id===e.id),id=mob&&MONSTER_TYPES[mob.type]?.id;if(id){const r=bountyDefeat(localBounty,Date.now(),id,mob.leader);if(r.changed){localBounty=r.state;keep('ayothaya-bounty:',localBounty);}}}
  if(e.type==='drop'){const cards=e.items.map(i=>i.id).filter(id=>itemDef(id)?.kind==='card');if(cards.length){const r=albumAdd(localAlbum,cards);if(r.added){localAlbum=r.album;keep('ayothaya-album:',localAlbum);
   for(const m of r.milestones){world.notice(`สมุดการ์ดครบ ${m.count} ใบ · ได้รับรางวัล!`);world.emit('reward',m.reward);}}}}
 });
 function claim(i){
  if(!map.safe)return world.notice('รับรางวัลค่าหัวได้ในเมือง');
  if(game.online)return world.market?.('bountyClaim',{index:i});
  try{const r=bountyClaim(localBounty,Date.now(),i);localBounty=r.state;keep('ayothaya-bounty:',localBounty);world.emit('experience',awardExperience(world,r.reward.baseXp,r.reward.jobXp));world.emit('reward',{coins:r.reward.coins,items:[]});world.notice('รับรางวัลค่าหัวแล้ว');}
  catch(e){world.notice(e.message==='bounty-unfinished'?'ยังล่าไม่ครบ':'รับรางวัลไปแล้ว');}
  render(true);
 }
 const menu=document.createElement('button');menu.id='menu-quests';menu.type='button';menu.title='ภารกิจ';menu.setAttribute('aria-label','ภารกิจประจำวัน และสมุดการ์ด');
 menu.innerHTML='<i>'+icon('card-straw','item-icon menu-item-icon')+'</i><span>ภารกิจ</span>';
 const nav=$('game-menu');if(nav)nav.insertBefore(menu,$('menu-players')??null);
 const dialog=document.createElement('dialog');dialog.id='quests-window';dialog.setAttribute('aria-labelledby','quests-title');
 dialog.innerHTML='<header><h2 id="quests-title">ภารกิจ</h2><button class="mp-icon" id="quests-close" aria-label="ปิด">×</button></header><div class="social-tabs" role="tablist"><button role="tab" data-qt="bounty">กระดานค่าหัววันนี้</button><button role="tab" data-qt="weekly">รายสัปดาห์</button><button role="tab" data-qt="album">สมุดการ์ด</button></div><div id="quests-body"></div>';
 ($('game-shell')??document.body).append(dialog);
 const open=t=>{tab=t??tab;game.clearInput();openHudPanel(dialog);render(true);};
 menu.onclick=()=>dialog.open?dialog.close():open();
 dialog.querySelector('#quests-close').onclick=()=>dialog.close();
 dialog.querySelectorAll('[data-qt]').forEach(b=>b.onclick=()=>{tab=b.dataset.qt;render(true);});
 bagUI.talkHooks.push(n=>{$('npc-bounty')?.remove();if(n.name!=='ขุนอินทร์')return;const b=document.createElement('button');b.id='npc-bounty';b.type='button';b.textContent='📜 กระดานค่าหัวประจำวัน';b.onclick=()=>{$('close-npc').click();open('bounty');};$('close-npc').before(b);});
 function render(force=false){
  if(!dialog.open)return;const s=bounty(),al=album(),wk=normalizeWeekly(world.weekly,Date.now()),sig=JSON.stringify([tab,s,al,wk]);if(!force&&sig===shown)return;shown=sig;
  dialog.querySelectorAll('[data-qt]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.qt===tab)));
  const body=$('quests-body');
  if(tab==='bounty'){
   body.innerHTML=`<p class="social-note">ค่าหัวเปลี่ยนทุกวันตอนเที่ยงคืน · ล่าได้ทุกแผนที่ · รับรางวัลในเมือง${map.safe?'':' (ตอนนี้อยู่นอกเมือง)'}</p><ul class="social-list">`+dailyBounties(Date.now()).map((b,i)=>{
    const n=Math.min(s.progress[i],b.count),done=n>=b.count;
    return `<li class="${s.claimed[i]?'':done?'on':''}"><div><strong>[${TIER[b.tier]}] ล้ม${b.name} ×${b.count}</strong><small>${n}/${b.count} · รางวัล ${b.reward.baseXp} EXP · ${b.reward.coins} เบี้ย</small></div>${s.claimed[i]?'<span class="claimed">รับแล้ว ✔</span>':`<button type="button" data-claim="${i}" ${done&&map.safe?'':'disabled'}>รับรางวัล</button>`}</li>`;}).join('')+'</ul>';
   body.querySelectorAll('[data-claim]').forEach(b=>b.onclick=()=>claim(+b.dataset.claim));
  }else if(tab==='weekly'){
   // 0.102 weekly quests (online): reset every Monday, claimed in a town
   const loot=r=>[r.coins.toLocaleString('th-TH')+' เบี้ย',...r.items.map(i=>itemDef(i.id).name+' ×'+i.count)].join(' · ');
   body.innerHTML=game.online?`<p class="social-note">ภารกิจใหม่ทุกวันจันทร์ · นับจากทุกแผนที่ · รับรางวัลในเมือง${map.safe?'':' (ตอนนี้อยู่นอกเมือง)'}</p><ul class="social-list">`+WEEKLY.map((q,i)=>{const n=Math.min(wk.progress[i],q.count),done=n>=q.count;
    return `<li class="${wk.claimed[i]?'':done?'on':''}"><div><strong>${q.name}</strong><small>${n}/${q.count} · รางวัล ${loot(q.reward)}</small></div>${wk.claimed[i]?'<span class="claimed">รับแล้ว ✔</span>':`<button type="button" data-wclaim="${i}" ${done&&map.safe?'':'disabled'}>รับรางวัล</button>`}</li>`;}).join('')+'</ul>':'<p class="social-note">ภารกิจรายสัปดาห์ใช้ได้เมื่อเล่นออนไลน์</p>';
   body.querySelectorAll('[data-wclaim]').forEach(b=>b.onclick=()=>{if(!map.safe)return world.notice('รับรางวัลได้ในเมือง');world.market?.('weeklyClaim',{index:+b.dataset.wclaim});});
  }else{
   const next=ALBUM_MILESTONES.find(m=>al.length<m.count);
   body.innerHTML=`<p class="social-note">สะสมการ์ดแล้ว ${al.length}/${ALBUM_CARDS.length} ใบ${next?` · ครบ ${next.count} ใบ รับ ${next.reward.coins} เบี้ย + ${next.reward.items.map(i=>itemDef(i.id).name).join(', ')}`:' · ครบทุกรางวัลแล้ว'}</p><div class="album-grid">`+
    ALBUM_CARDS.map(id=>`<span class="${al.includes(id)?'got':''}" title="${al.includes(id)?itemDef(id).name:'ยังไม่พบ'}">${icon(id)}</span>`).join('')+'</div>';
  }
 }
 return {update(){render();}};
}
