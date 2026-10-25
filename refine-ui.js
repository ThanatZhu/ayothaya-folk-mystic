import {refineTierBadge,refineTierTrack} from './refine-tier-ui.js';
import {refineTier,refinePercent,gearStatText} from './refine-tiers.js';
import {SHOPS,ITEM_ERRORS,itemDef,normalizeBag} from './items.js?v=tier167';
import {REFINE_RATE,REFINE_ORE,REFINE_SLOTS,REFINE_MAX,LEK_LAI_BONUS,refineCost,refineGear} from './refine.js?v=tier167';
import {createRefineSequence,forgePose,FORGE_DURATION} from './refine-sequence.js?v=136';
import {affinityOf,ELEMENT_NAME,SIZE_NAME} from './affinity.js?v=02';
import {MONSTER_TYPES} from './combat-core.js?v=role116';
import {iconStyle} from './bag-ui.js?v=107';
import {openHudPanel} from './hud-panels.js?v=34';

export function createRefineUI({game,map,bagUI,statusUI}){
 const world=game.world,sequence=createRefineSequence(),reduced=matchMedia('(prefers-reduced-motion:reduce)');let npc=null,selected='weapon',last=null,shown='';
 const style=document.createElement('link');style.rel='stylesheet';style.href='./refine-ui.css?v=tier167';document.head.append(style);
 const dialog=document.createElement('dialog');dialog.id='refine-window';dialog.setAttribute('aria-labelledby','refine-title');
 dialog.innerHTML=`<header><h2 id="refine-title">ตีบวกอุปกรณ์</h2><b class="coins" id="refine-coins"></b><button class="mp-icon" id="refine-close" aria-label="ปิดหน้าตีบวก">×</button></header>
  <div class="forge-layout"><section class="forge-left" aria-label="ช่างตีบวกและผลลัพธ์">
   <div class="forge-caption"><small>โรงตีอาวุธ</small><h3 id="forge-npc-name">ครูแสนดาบ</h3></div>
   <div id="forge-stage" data-phase="idle"><div class="forge-halo"></div><div id="forge-actor" role="img" aria-label="ช่างถือค้อนตีอุปกรณ์"></div><div id="forge-workpiece" aria-hidden="true"></div><div class="forge-sparks" aria-hidden="true">${Array.from({length:8},(_,i)=>`<i style="--spark:${i}"></i>`).join('')}</div></div>
   <div id="forge-progress" role="progressbar" aria-label="กำลังตีบวก" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" hidden><i></i></div>
   <div id="refine-result" role="status" aria-live="polite"></div><ol id="forge-tiers" aria-label="โบนัส Tier ของอุปกรณ์"></ol><small class="forge-tier-note">โบนัสเพิ่มเฉพาะสเตตัสของอุปกรณ์ชิ้นนี้ ไม่รวมการ์ด</small>
  </section><section class="forge-right" aria-labelledby="forge-equipment-title"><h3 id="forge-equipment-title">อุปกรณ์ของเรา</h3><p class="forge-select-note">เลือกอุปกรณ์ที่สวมอยู่ · ตีบวกได้ครบ 6 ช่อง</p><ul id="refine-list"></ul></section></div>
  <footer class="forge-footer"><div id="forge-selection"></div><div class="forge-materials"><label><input type="checkbox" id="refine-lek"> ใช้เหล็กไหล (+20% โอกาสสำเร็จ) <span id="refine-lek-have"></span></label><label><input type="checkbox" id="refine-guard"> ใช้ยันต์กันแตก <span id="refine-guard-have"></span></label></div><p class="refine-note">+1 ถึง +4 สำเร็จ 100% · ตั้งแต่ +5 ล้มเหลวแล้วอุปกรณ์จะแตกหายไป · ยันต์กันแตกถูกใช้เฉพาะเมื่อล้มเหลวตั้งแต่ +5</p><button type="button" id="refine-go" disabled>ตีบวกอุปกรณ์</button></footer>`;
 (document.getElementById('game-shell')??document.body).append(dialog);const $=id=>dialog.querySelector('#'+id);$('forge-actor').append($('forge-workpiece'),dialog.querySelector('.forge-sparks'));
 $('refine-close').onclick=()=>dialog.close();
 for(const id of ['refine-lek','refine-guard'])$(id).onchange=()=>render(true);
 bagUI.talkHooks.push(n=>{
  document.getElementById('npc-refine')?.remove();const shop=SHOPS[n.name];if(!shop?.refine||shop.mapId!==map.id)return;
  const b=document.createElement('button');b.id='npc-refine';b.type='button';b.innerHTML=`<i class="item-icon small" style="${iconStyle('refine-hammer')}"></i> ตีบวกอุปกรณ์`;
  b.onclick=()=>{npc=n;const g=statusUI.gear();if(!g[selected]&&!sequence.active)selected=Object.keys(REFINE_SLOTS).find(slot=>g[slot])??'weapon';document.getElementById('close-npc').click();openHudPanel(dialog);render(true);};document.getElementById('close-npc').before(b);
 });
 function present(result){
  last=result;dialog.setAttribute('aria-busy','false');$('forge-stage').classList.remove('impact');$('forge-stage').dataset.phase=result.code?'error':result.unconfirmed?'waiting':result.result;
  if(result.result)world.notice(result.result==='success'?'ตีบวกสำเร็จ · '+(itemDef(result.upgradedItem)?.name??REFINE_SLOTS[result.slot]):result.result==='broken'?'ตีบวกล้มเหลว · อุปกรณ์แตก':'ตีบวกล้มเหลว · อุปกรณ์ไม่แตก');
  else if(result.code&&!game.online)world.notice(ITEM_ERRORS[result.code]??result.code);
  render(true);
 }
 game.onEvent(e=>{if(game.online&&['refined','refineRejected'].includes(e.type)&&!sequence.receive(e)&&last?.unconfirmed&&e.attempt===last.attempt)present({...last,...e,unconfirmed:false});});
 function start(){
  if(sequence.active||last?.unconfirmed)return;const id=statusUI.gear()[selected];if(!id)return;
  const attempt=crypto.randomUUID(),lekLai=$('refine-lek').checked,guard=$('refine-guard').checked;
  if(!sequence.start({attempt,slot:selected,item:id},performance.now()))return;last=null;dialog.setAttribute('aria-busy','true');$('forge-stage').dataset.phase='working';game.clearInput();render(true);
  if(game.online){if(!world.refine?.(selected,npc?.name,lekLai,guard,attempt))sequence.receive({attempt,code:'refine-disconnected'});}
  else{try{const r=refineGear(bagUI.bag(),statusUI.gear(),selected,{lekLai,guard});bagUI.setLocal(r.bag);statusUI.setGear(r.gear);sequence.receive({...r,attempt,slot:selected,upgradedItem:r.gear[selected]});}catch(e){sequence.receive({attempt,code:e.message});}}
 }
 $('refine-go').onclick=start;
 function resultText(){
  if(sequence.active)return ['กำลังตีบวก…','รอช่างตีค้อนเสร็จจึงแสดงผล'];
  if(!last)return ['เลือกอุปกรณ์ทางด้านขวา','อาวุธใช้เศษเหล็กน้ำพี้ · เครื่องสวมใส่อื่นใช้ก้อนศิลาแลง'];
  if(last.code)return ['ตีบวกไม่ได้',ITEM_ERRORS[last.code]??(last.code==='refine-disconnected'?'การเชื่อมต่อขาดหาย กรุณาเชื่อมต่อใหม่':last.code)];
  if(last.unconfirmed)return ['ยังไม่ได้รับผลจากเซิร์ฟเวอร์','ตรวจอุปกรณ์หรือเชื่อมต่อใหม่ก่อนตีอีกครั้ง ระบบจะไม่ส่งคำสั่งซ้ำอัตโนมัติ'];
  const name=itemDef(last.item)?.name??REFINE_SLOTS[last.slot];
  return last.result==='success'?['ตีบวกสำเร็จ!',itemDef(last.upgradedItem)?.name??name]:last.result==='broken'?['อุปกรณ์แตก!',name+' · แตกและหายไปแล้ว']:['ยันต์กันแตกทำงาน',name+' · ระดับเดิม อุปกรณ์ไม่แตก'];
 }
 function render(force=false){
  if(!dialog.open)return;const busy=!!sequence.active,bag=normalizeBag(bagUI.bag()),gear=statusUI.gear(),lek=$('refine-lek').checked,guard=$('refine-guard').checked;
  const sig=JSON.stringify([busy?sequence.active.attempt:bag,busy?null:gear,selected,lek,guard,last]);if(!force&&sig===shown)return;shown=sig;
  $('forge-npc-name').textContent=npc?.name??'ครูแสนดาบ';$('refine-coins').textContent=bag.coins.toLocaleString('th-TH')+' เบี้ย';
  $('refine-lek-have').textContent='(มี '+(bag.items['lek-lai']??0)+')';$('refine-guard-have').textContent='(มี '+(bag.items['break-guard']??0)+')';
  for(const id of ['refine-lek','refine-guard'])$(id).disabled=busy||!!last?.unconfirmed;
  // The server can save immediately, but equipment artwork must not reveal the roll before the hammer.
  if(!busy||!$('refine-list').children.length)$('refine-list').innerHTML=Object.entries(REFINE_SLOTS).map(([slot,label])=>{
   const id=gear[slot],d=itemDef(id);return `<li><button type="button" class="forge-equipment" data-slot="${slot}" aria-pressed="${slot===selected}" ${!d?'disabled':''}>${d?`<i class="item-icon" style="${iconStyle(id)}"></i>`:'<i class="forge-empty">+</i>'}<span><small>${label}</small><strong>${d?.name??'ยังไม่ได้สวมอุปกรณ์'}</strong>${refineTierBadge(d)}<small>${d?(d.refine>=REFINE_MAX?'ตีบวกสูงสุดแล้ว':'+ '+(d.refine+1)+' · '+(slot==='weapon'?'เพิ่มพลังโจมตี':'DEF +1')):'สวมจากกระเป๋าก่อน'}</small></span><b class="forge-level">${d?'+'+d.refine:'—'}</b></button></li>`;
  }).join('');
  for(const b of $('refine-list').querySelectorAll('[data-slot]')){b.disabled=busy||!!last?.unconfirmed||!gear[b.dataset.slot];b.onclick=()=>{if(sequence.active)return;selected=b.dataset.slot;last=null;$('forge-stage').dataset.phase='idle';render(true);};}
  const id=busy?sequence.active.item:gear[selected],d=itemDef(id),next=d?d.refine+1:1,ore=REFINE_ORE[selected],chance=d&&next<=REFINE_MAX?Math.min(1,REFINE_RATE[next-1]+(lek?LEK_LAI_BONUS:0)):0;
  const reason=last?.unconfirmed?'รอยืนยันผลจากเซิร์ฟเวอร์':!d?'เลือกอุปกรณ์ก่อน':d.refine>=REFINE_MAX?'ตีบวกสูงสุด +20 แล้ว':!(bag.items[ore]>0)?'แร่ตีบวกไม่พอ':lek&&!bag.items['lek-lai']?'ไม่มีเหล็กไหล':guard&&next>=5&&!bag.items['break-guard']?'ไม่มียันต์กันแตก':bag.coins<refineCost(next)?'เบี้ยไม่พอ':null;
  const [headline,detail]=resultText();$('refine-result').replaceChildren();for(const [tag,text] of [['strong',headline],['span',detail]]){const node=document.createElement(tag);node.textContent=text;$('refine-result').append(node);}
  $('refine-result').className=last?.result?'refine-'+last.result:'';
  $('forge-workpiece').innerHTML=d?`<i class="item-icon big" style="${iconStyle(id)}"></i>`:'';
  $('forge-tiers').innerHTML=refineTierTrack(d?.refine??0);
  const target=d&&next<=REFINE_MAX?{...d,refine:next}:null;
  const tierChange=target&&refineTier(next)>refineTier(d.refine)?`<b class="forge-tier-unlock">ปลดล็อก Tier ${refineTier(next)} · สเตตัสอุปกรณ์ +${refinePercent(next)}%</b>`:'';
  $('forge-selection').innerHTML=d&&target?`<strong>${d.name} → +${next}</strong><span class="forge-stat-preview">${gearStatText(d)} → ${gearStatText(target)}</span>${tierChange}<span>โอกาสสำเร็จ ${Math.round(chance*100)}% · ${refineCost(next).toLocaleString('th-TH')} เบี้ย · ${itemDef(ore).name} 1 (มี ${bag.items[ore]??0})</span>`:d?`<strong>${d.name} · ตีบวกสูงสุด +20</strong>${refineTierBadge(d)}<span>${gearStatText(d)}</span>`:'<span>เลือกอุปกรณ์ที่สวมอยู่เพื่อตีบวก</span>';
  $('refine-go').disabled=busy||!!reason;$('refine-go').textContent=busy?'กำลังตีบวก…':reason??'ตีบวก +'+next;
  $('forge-progress').hidden=!busy;if(!busy){$('forge-actor').style.backgroundPosition='0% 0%';$('forge-progress').querySelector('i').style.width='0%';}
 }
 const badge=document.createElement('small');badge.id='target-affinity';document.getElementById('target-name')?.after(badge);let badgeFor=null;
 return {update(){
  const pending=sequence.active;if(pending){const elapsed=performance.now()-pending.at,pose=forgePose(elapsed),frame=reduced.matches?0:pose.frame;
   $('forge-actor').style.backgroundPosition=(frame%4/3*100)+'% '+(frame>=4?100:0)+'%';$('forge-stage').classList.toggle('impact',!reduced.matches&&pose.impact);
   const progress=Math.min(100,Math.floor(elapsed/FORGE_DURATION*100));$('forge-progress').setAttribute('aria-valuenow',String(progress));$('forge-progress').querySelector('i').style.width=progress+'%';
   if(elapsed>=FORGE_DURATION)$('forge-stage').dataset.phase='waiting';const result=sequence.tick(performance.now());if(result)present(result);
  }
  if(dialog.open&&npc&&Math.hypot(world.player.x-npc.x,world.player.z-npc.z)>4.5)dialog.close();render();
  const mob=world.mobs?.find(m=>m.id===world.targetId&&m.hp>0),id=mob&&MONSTER_TYPES[mob.type]?.id;
  if(id!==badgeFor){badgeFor=id;const a=id&&affinityOf(id);badge.textContent=a?`ธาตุ${ELEMENT_NAME[a.element]} · ตัว${SIZE_NAME[a.size]}`:'';}
 }};
}
