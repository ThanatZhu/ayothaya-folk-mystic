import {MONSTER_TYPES} from './combat-core.js?v=novice174';
import {openHudPanel} from './hud-panels.js?v=34';
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;};
export function createAutoTargetUI({game}){
 const world=game.world,dialog=el('dialog');dialog.id='auto-target-window';dialog.setAttribute('aria-labelledby','auto-target-title');
 dialog.innerHTML='<header><div><small>AUTO BATTLE</small><h2 id="auto-target-title">เลือกเป้าหมายออโต้</h2></div><button type="button" id="auto-target-gear" aria-label="ตั้งค่าสกิลออโต้">⚙</button><button type="button" id="auto-target-close" aria-label="ปิดเลือกเป้าหมาย">×</button></header><nav class="auto-target-tabs" aria-label="ชนิดเป้าหมาย"><button type="button" data-target-tab="monsters" aria-pressed="true">มอนสเตอร์</button><button type="button" data-target-tab="players" aria-pressed="false">ผู้เล่น</button></nav><p id="auto-target-help"></p><div id="auto-target-list"></div><footer><span id="auto-target-state" role="status"></span><button type="button" id="auto-target-stop">หยุด AUTO</button></footer>';
 (document.getElementById('game-shell')??document.body).append(dialog);const $=id=>dialog.querySelector('#'+id);let tab='monsters',timer=0,signature='';
 const legalPlayers=()=>[...(world.foe?[world.foe]:[]),...(world.rivals??[])].filter(p=>p.pvp&&p.hp>0&&p.id!=='war:stone');
 function choose(target){game.clearInput();world.setAuto(true,null,target);dialog.close();}
 function row(label,sub,target,{type=null,player=false}={}){
  const b=el('button','auto-target-choice');b.type='button';b.dataset.target=JSON.stringify(target);b.setAttribute('aria-pressed',String(world.auto&&JSON.stringify(world.autoTarget)===JSON.stringify(target)));
  const art=el('i',player?'auto-target-player':'auto-target-monster');art.setAttribute('aria-hidden','true');if(type?.chapter2Art){const image=el('img');image.alt='';image.src='assets/admin127/monsters/'+type.id+'.webp';art.append(image);}else art.textContent=player?'♟':target.kind==='monsters'?'All':'';
  const text=el('span');text.append(el('strong','',label),el('small','',sub));b.append(art,text,el('b','auto-target-radio',''));b.onclick=()=>choose(target);return b;
 }
 function draw(){
  const types=[...new Set(world.mobs.map(m=>m.type))],players=legalPlayers(),sig=JSON.stringify([tab,world.auto,world.autoTarget,types,types.map(i=>world.mobs.filter(m=>m.type===i&&m.hp>0).length),players.map(p=>[p.id,p.name])]);if(signature===sig)return;signature=sig;
  for(const b of dialog.querySelectorAll('[data-target-tab]'))b.setAttribute('aria-pressed',String(b.dataset.targetTab===tab));
  $('auto-target-state').textContent=world.auto?'AUTO เปิด':'AUTO ปิด';$('auto-target-stop').disabled=!world.auto;
  const list=$('auto-target-list');list.replaceChildren();
  if(tab==='monsters'){
   $('auto-target-help').textContent='เลือกชนิดมอนสเตอร์ในแผนที่นี้ แล้วเริ่มออโต้';list.append(row('ทุกมอนสเตอร์','ล่าเฉพาะมอนสเตอร์ ไม่เปลี่ยนไปโจมตีผู้เล่น',{kind:'monsters'}));
   for(const index of types){const type=MONSTER_TYPES[index];if(!type)continue;const count=world.mobs.filter(m=>m.type===index&&m.hp>0).length;list.append(row(type.name,`Lv.${type.level??1} · ${count>0?'พบ '+count+' ตัว':'รอเกิดใหม่'}`,{kind:'type',type:index},{type}));}
   if(!types.length)list.append(el('p','auto-target-empty','แผนที่นี้ยังไม่มีมอนสเตอร์ให้ล่า'));
  }else{
   $('auto-target-help').textContent='เลือกคู่ดวลหรือศัตรูในสงครามตามกติกาของพื้นที่';for(const p of players)list.append(row(p.name??p.id,'ล็อคผู้เล่นนี้เป็นเป้าหมาย',{kind:'entity',id:p.id},{player:true}));
   if(!players.length)list.append(el('p','auto-target-empty','ยังไม่มีผู้เล่นที่สามารถต่อสู้ได้ในขณะนี้'));
  }
 }
 function open(){game.clearInput();signature='';draw();openHudPanel(dialog);clearInterval(timer);timer=setInterval(draw,500);}
 game.autoPicker=open;const auto=document.getElementById('auto-attack');auto?.setAttribute('aria-haspopup','dialog');auto?.setAttribute('aria-controls',dialog.id);
 $('auto-target-close').onclick=()=>dialog.close();$('auto-target-gear').onclick=()=>{dialog.close();dispatchEvent(new Event('open-auto-settings'));};$('auto-target-stop').onclick=()=>{world.setAuto(false);dialog.close();};
 for(const b of dialog.querySelectorAll('[data-target-tab]'))b.onclick=()=>{tab=b.dataset.targetTab;draw();};dialog.addEventListener('close',()=>clearInterval(timer));
 return {open,dialog};
}
