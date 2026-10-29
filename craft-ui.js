// Crafting authority stays with the realm; this window only previews and sends a request.
import {ITEM_ERRORS,itemDef,normalizeBag} from './items.js?v=amulet-craft193';
import {RECIPES,CRAFT_GROUPS,craftable,craft} from './crafting.js?v=amulet-craft193';
import {craftRecipes,craftQuote,craftSources,craftRecipeLabel} from './craft-view176.js?v=surfaces222';
import {iconStyle} from './bag-ui.js?v=surfaces222';
import {openHudPanel} from './hud-panels.js?v=34';
import {recipeAllowed} from './weapon-crafting.js';
import {GRADES} from './gear-sets.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=n=>Number(n??0).toLocaleString('th-TH');
const icon=(id,cls='')=>`<i class="item-icon ${cls}" style="${iconStyle(id)}" aria-hidden="true"></i>`;
const failures=new Set(['no-recipe','no-material','no-coins','bag-full','bad-count','craft-rate','craft-locked'].map(k=>ITEM_ERRORS[k]));
export function createCraftUI({game,bagUI,catalog,account}){
 if(!document.querySelector('link[data-craft176]')){const css=document.createElement('link');css.rel='stylesheet';css.href='./craft176.css?v=amulet-craft193';css.dataset.craft176='';document.head.append(css);}
 const world=game.world,character=()=>({classId:world.profession.id,gender:account?.character?.gender}),dialog=document.createElement('dialog');dialog.id='craft-window';dialog.dataset.craft176='';dialog.setAttribute('aria-labelledby','craft-title');
 dialog.innerHTML=`<header><div><small>AYOTHAYA · CRAFTING</small><h2 id="craft-title">คราฟต์ไอเท็ม</h2></div><b class="coins" id="craft-coins"></b><button type="button" class="mp-icon" id="craft-close" aria-label="ปิดหน้าคราฟต์">×</button></header>
 <div class="craft176-tabs" role="tablist" aria-label="หมวดสูตรคราฟต์">${CRAFT_GROUPS.map(([id,name])=>`<button type="button" role="tab" data-group="${id}" aria-controls="craft-workspace">${name}</button>`).join('')}</div>
 <div id="craft-workspace" class="craft176-workspace"><section class="craft176-browser" aria-label="รายการสูตร"><label class="craft176-search"><span aria-hidden="true">⌕</span><input id="craft-search" type="search" placeholder="ค้นชื่อไอเท็ม…" aria-label="ค้นหาสูตรคราฟต์" autocomplete="off"></label><label class="craft176-filter"><input id="craft-ready" type="checkbox"><span>คราฟต์ได้</span><small id="craft-found"></small></label><ul id="craft-list" role="listbox" aria-label="เลือกสูตรคราฟต์"></ul><p id="craft-empty" hidden>ไม่พบสูตรที่ตรงกับการค้นหา</p></section>
 <section class="craft176-detail"><div class="craft176-preview" id="craft-preview"><div class="craft176-display"><i id="craft-output" class="item-icon craft176-hero-icon" aria-hidden="true"></i><span class="craft176-sparks" aria-hidden="true">✧ · ✦ · ✧</span></div><h3 id="craft-item-name"></h3><p id="craft-description"></p><b id="craft-output-count"></b><p id="craft-success" role="status" aria-live="polite"></p></div>
 <section class="craft176-materials" aria-label="วัตถุดิบ"><h3>วัตถุดิบที่ต้องใช้</h3><p class="craft176-source-hint">แตะวัตถุดิบเพื่อดูแหล่งหา</p><div id="craft-materials"></div><p id="craft-readiness"></p></section></section></div>
 <footer class="craft176-footer"><div class="craft176-quantity"><label for="craft-quantity">จำนวนครั้ง</label><div><button type="button" id="craft-minus" aria-label="ลดจำนวนคราฟต์">−</button><input id="craft-quantity" type="number" min="1" max="99" step="1" value="1" aria-label="จำนวนครั้งที่คราฟต์"><button type="button" id="craft-plus" aria-label="เพิ่มจำนวนคราฟต์">+</button><button type="button" id="craft-max">สูงสุด</button></div></div><div class="craft176-cost"><small>ค่าใช้จ่ายรวม</small><strong id="craft-total"></strong></div><div class="craft176-submit"><p id="craft-note" role="status" aria-live="polite"></p><button type="button" id="craft-make">คราฟต์</button></div></footer>`;
 (document.getElementById('game-shell')??document.body).append(dialog);
 const $=id=>dialog.querySelector('#'+id),list=$('craft-list'),input=$('craft-quantity');
 let group='potion',selected=null,query='',readyOnly=false,quantity=1,sourceId=null,shown='',listSig='',materialSig='',pending=null,lastSuccess=null;
 const bagNow=()=>normalizeBag(bagUI.bag()),message=(text,error=false)=>{$('craft-note').textContent=text;dialog.dataset.error=String(error);};
 function receipt(out,count){
  const name=itemDef(out).name;lastSuccess={out,count};$('craft-success').textContent='คราฟต์สำเร็จ · '+name+' ×'+number(count);world.notice('คราฟต์สำเร็จ · '+name+' ×'+number(count));
  if(dialog.open&&selected===out&&!matchMedia('(prefers-reduced-motion: reduce)').matches)$('craft-preview').animate([{transform:'translateY(0) scale(1)'},{transform:'translateY(-5px) scale(1.035)',offset:.4},{transform:'translateY(0) scale(1)'}],{duration:650,easing:'ease-out'});
  dialog.classList.remove('craft176-complete');void dialog.offsetWidth;dialog.classList.add('craft176-complete');
 }
 function settle(){if(!pending)return;const p=pending;pending=null;message('');receipt(p.out,p.made);render(true);}
 function make(){
  if(pending)return;const r=RECIPES.find(r=>r.out===selected),q=craftQuote(bagNow(),r,quantity,character());if(!q?.canCraft){message(ITEM_ERRORS[q?.reason]??'วัตถุดิบไม่พอ',true);return;}
  lastSuccess=null;$('craft-success').textContent='';dialog.classList.remove('craft176-complete');
  if(game.online){
   if(game.networkStatus!=='online'){message('กำลังเชื่อมต่อ · ลองอีกครั้ง',true);return;}
   pending={out:r.out,made:q.made,before:JSON.stringify(bagNow()),at:performance.now(),ack:false};
   if(!world.market?.('craft',{item:r.out,times:q.times})){pending=null;message('กำลังเชื่อมต่อ · ลองอีกครั้ง',true);}else message('กำลังคราฟต์…');render(true);return;
  }
  if(game.networkExpected){message('กำลังเชื่อมต่อ · ลองอีกครั้ง',true);return;}
  try{const result=craft(bagNow(),r.out,q.times,Math.random,character());bagUI.setLocal(result.bag);world.emit('storyDo',{action:'craft'});if(result.items.some(i=>{const it=itemDef(i.id);return it?.slot==='weapon'&&it.grade===0&&!it.rainbow&&it.classes?.includes(world.profession.id);}))world.emit('storyDo',{action:'craftWeapon'});message('');receipt(r.out,result.made);render(true);}
  catch(e){message(ITEM_ERRORS[e.message]??e.message,true);render(true);}
 }
 game.onEvent(e=>{
  if(e.type==='crafted'&&pending&&e.item===pending.out&&e.count===pending.made){pending.ack=true;render(true);}
  else if(e.type==='notice'&&pending&&failures.has(e.text)){pending=null;message(e.text,true);render(true);}
 });
 function select(out){if(selected===out)return;selected=out;quantity=1;sourceId=null;lastSuccess=null;$('craft-success').textContent='';dialog.classList.remove('craft176-complete');if(!pending)message('');render(true);}
 function chooseGroup(id){group=id;selected=null;quantity=1;sourceId=null;list.scrollTop=0;render(true);}
 $('craft-close').onclick=()=>dialog.close();$('craft-make').onclick=make;
 dialog.querySelectorAll('[data-group]').forEach(b=>b.onclick=()=>chooseGroup(b.dataset.group));
 dialog.querySelector('.craft176-tabs').onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const tabs=[...dialog.querySelectorAll('[data-group]')],i=tabs.findIndex(b=>b.dataset.group===group),n=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;chooseGroup(tabs[n].dataset.group);tabs[n].focus();};
 $('craft-search').oninput=e=>{query=e.target.value;render(true);};$('craft-ready').onchange=e=>{readyOnly=e.target.checked;selected=null;render(true);};
 list.onclick=e=>{const b=e.target.closest('[data-recipe]');if(b)select(b.dataset.recipe);};
 list.onkeydown=e=>{if(!['ArrowUp','ArrowDown','Home','End'].includes(e.key))return;e.preventDefault();const choices=[...list.querySelectorAll('[data-recipe]')];if(!choices.length)return;const i=choices.findIndex(b=>b.dataset.recipe===selected),n=e.key==='Home'?0:e.key==='End'?choices.length-1:Math.max(0,Math.min(choices.length-1,i+(e.key==='ArrowDown'?1:-1)));select(choices[n].dataset.recipe);list.querySelector(`[data-recipe="${choices[n].dataset.recipe}"]`)?.focus();};
 function setQuantity(n){quantity=n;render(true);}
 input.onchange=()=>setQuantity(input.value);$('craft-minus').onclick=()=>setQuantity(quantity-1);$('craft-plus').onclick=()=>setQuantity(quantity+1);$('craft-max').onclick=()=>setQuantity(craftQuote(bagNow(),RECIPES.find(r=>r.out===selected),quantity,character())?.max??1);
 $('craft-materials').onclick=e=>{
  if(e.target.closest('[data-source-back]')){sourceId=null;render(true);$('craft-materials').querySelector('[data-source]')?.focus();return;}
  const b=e.target.closest('[data-source]');if(b){sourceId=b.dataset.source;render(true);$('craft-materials').querySelector('[data-source-back]')?.focus();}
 };
 const open=document.createElement('button');open.type='button';open.id='bag-craft';open.textContent='⚒ คราฟต์';open.onclick=()=>{open.closest('dialog')?.close();openHudPanel(dialog);render(true);};document.getElementById('bag-coins')?.after(open);
 addEventListener('craft-weapon-tutorial',()=>{open.click();query='';$('craft-search').value='';readyOnly=false;$('craft-ready').checked=false;chooseGroup('gear');select('weapon-'+world.profession.id+'-one');});
 function materials(q){
  const sig=JSON.stringify([selected,q?.needs,sourceId]);if(sig===materialSig)return;materialSig=sig;
  if(sourceId){const rows=craftSources(sourceId,catalog);$('craft-materials').innerHTML=`<div class="craft176-sources"><button type="button" data-source-back>กลับไปดูวัตถุดิบ</button><h4>${icon(sourceId,'small')}${esc(itemDef(sourceId).name)}</h4><ul>${rows.map(s=>`<li><b>${s.kind==='drop'?'ดรอปจาก':s.kind==='shop'?'ซื้อ / แลกที่':s.kind==='event'?'กิจกรรม':'คราฟต์ในหมวด'} ${esc(s.name)}</b><small>${esc(s.kind==='event'?s.detail:s.kind==='drop'?(s.maps.join(' · ')||'ดูตำแหน่งในแผนที่'):s.kind==='shop'?[s.map,s.currency].filter(Boolean).join(' · '):'เปิดหมวดสูตรเพื่อดูวัตถุดิบ')}</small></li>`).join('')||'<li>ยังไม่มีข้อมูลแหล่งหาในตำรา</li>'}</ul></div>`;return;}
  $('craft-materials').innerHTML=(q?.needs??[]).map(n=>`<button type="button" class="craft176-material ${n.missing?'short':'ok'}" data-source="${esc(n.id)}" aria-label="แหล่งหา ${esc(itemDef(n.id).name)}">${icon(n.id,'small')}<span>${esc(itemDef(n.id).name)}<small>${n.missing?'ขาด '+number(n.missing)+' ชิ้น':'มีวัตถุดิบครบ'}</small></span><b>${number(n.have)} / ${number(n.need)}</b><em aria-hidden="true">${n.missing?'!':'✓'}</em></button>`).join('');
 }
 function render(force=false){
  if(!dialog.open)return;const bag=bagNow(),bagSig=JSON.stringify(bag);
  if(pending){if(pending.ack&&bagSig!==pending.before){settle();return;}if(performance.now()-pending.at>12000){pending=null;message('ยังไม่ได้รับผล · ตรวจในกระเป๋าก่อนทำซ้ำ',true);}else if(game.networkStatus!=='online'){pending=null;message('การเชื่อมต่อขาด · ตรวจในกระเป๋าก่อนทำซ้ำ',true);}}
  const sig=JSON.stringify([bag,character(),group,query,readyOnly,selected,quantity,sourceId,!!pending]);if(!force&&sig===shown)return;shown=sig;
  const rows=craftRecipes(bag,{classId:world.profession.id,gender:character().gender,group,query,readyOnly,translate:s=>globalThis.I18N?.t(s)??s});
  // Keep the selected recipe even when crafting consumes its last materials under the ready filter.
  const current=RECIPES.find(r=>r.out===selected&&r.group===group),valid=current&&recipeAllowed(itemDef(current.out),character())&&(!query||rows.some(r=>r.out===selected));
  if(!valid){selected=rows[0]?.out??null;quantity=1;sourceId=null;lastSuccess=null;}
  const r=RECIPES.find(r=>r.out===selected),q=craftQuote(bag,r,quantity,character());quantity=q?.times??1;
  $('craft-coins').innerHTML=icon('cowrie','small')+number(bag.coins)+' เบี้ย';
  dialog.querySelectorAll('[data-group]').forEach(b=>{const on=b.dataset.group===group;b.setAttribute('aria-selected',String(on));b.tabIndex=on?0:-1;});
  $('craft-found').textContent=number(rows.length)+' สูตร';$('craft-empty').hidden=rows.length>0;
  const ls=JSON.stringify([rows.map(r=>[r.out,craftable(bag,r)]),selected]);
  if(ls!==listSig){const scroll=list.scrollTop,focused=document.activeElement?.closest?.('[data-recipe]')?.dataset.recipe;listSig=ls;list.innerHTML=rows.map(r=>{const it=itemDef(r.out),ready=craftable(bag,r)>0,on=r.out===selected;return `<li role="presentation"><button type="button" role="option" aria-selected="${on}" tabindex="${on?0:-1}" data-recipe="${esc(r.out)}">${icon(r.out)}<span><strong>${esc(craftRecipeLabel(r))}</strong><small>${it.level?'Lv.'+it.level+' · ':''}${r.count>1?'ได้ '+r.count+' ชิ้นต่อครั้ง':'ได้ 1 ชิ้น'}</small></span><em class="${ready?'ok':'short'}" aria-label="${ready?'วัตถุดิบครบ':'ขาดวัตถุดิบ'}">${ready?'✓':'!'}</em></button></li>`;}).join('');list.scrollTop=scroll;if(focused)list.querySelector(`[data-recipe="${focused}"]`)?.focus({preventScroll:true});}
  $('craft-output').style.cssText=r?iconStyle(r.out):'';$('craft-output').hidden=!r;
  $('craft-item-name').textContent=r?craftRecipeLabel(r):'เลือกสูตรคราฟต์';$('craft-description').textContent=r?(itemDef(r.out).text??''):'';
  $('craft-item-name').style.color=r?.weaponGrade!=null?GRADES[r.weaponGrade].color:'';if(r?.weaponGrade!=null)$('craft-description').textContent+=' · ฟ้า → ม่วง → ส้ม → แดง · ใช้วัตถุดิบจากแมพช่วงเลเวลนี้'+(r.weaponGrade?' · ใช้อาวุธสีก่อนหน้าที่อยู่ในกระเป๋า ไม่ตีบวก ไม่ใส่การ์ด และไม่มีออปชันสุ่ม':' · คราฟต์เริ่มต้นได้สีฟ้าแน่นอน');
  $('craft-output-count').textContent=q?'ได้รับ '+number(q.made)+' ชิ้น · '+number(q.times)+' ครั้ง':'';
  $('craft-success').textContent=lastSuccess&&lastSuccess.out===selected?'คราฟต์สำเร็จ · '+itemDef(lastSuccess.out).name+' ×'+number(lastSuccess.count):'';
  materials(q);$('craft-readiness').className=q?.canCraft?'ok':'short';$('craft-readiness').textContent=!q?'':q.canCraft?'✓ วัตถุดิบครบ พร้อมคราฟต์':ITEM_ERRORS[q.reason]??q.reason;
  input.value=quantity;input.max=q?.max||1;input.disabled=!!pending||!q?.max;
  $('craft-minus').disabled=!!pending||quantity<=1;$('craft-plus').disabled=!!pending||!q||quantity>=q.max;$('craft-max').disabled=!!pending||!q?.max;
  $('craft-total').innerHTML=q?icon('cowrie','small')+number(q.cost)+' เบี้ย':'—';
  $('craft-make').disabled=!!pending||!q?.canCraft||game.networkExpected&&game.networkStatus!=='online';$('craft-make').textContent=pending?'กำลังคราฟต์…':q?'คราฟต์ '+number(q.made)+' ชิ้น':'คราฟต์';
  dialog.setAttribute('aria-busy',String(!!pending));
 }
 return {open:()=>open.click(),dialog,update(){if(pending&&!dialog.open&&pending.ack&&JSON.stringify(bagNow())!==pending.before){pending=null;lastSuccess=null;}render();}};
}
