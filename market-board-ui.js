// 0.70 ตลาดกลาง: search every shop and stall on the server, open consignment / buying shops that stay open while
// you are offline, collect proceeds, and see shop signs on the market street. Every action is a realm command.
import * as THREE from 'three';
import {ITEMS,ITEM_ERRORS,itemDef} from './items.js?v=70';
import {TRADABLE} from './market.js?v=70';
import {MARKET_ZONE,tradePerks,priceHint,priceKey,inMarket} from './market-board.js?v=70';
import {iconStyle} from './bag-ui.js?v=64';
import {openHudPanel} from './hud-panels.js?v=34';

const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';');
const icon=(id,c='item-icon')=>`<i class="${c}" style="${iconStyle(id)}"></i>`;
const money=n=>(n??0).toLocaleString('th-TH')+' เบี้ย';
const when=t=>t?new Date(t).toLocaleString('th-TH',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):'';

export function createMarketBoardUI({game,map,scene,camera,bagUI}){
 const world=game.world,cmd=(type,data)=>world.market?.(type,data),fail=c=>world.notice(ITEM_ERRORS[c]??c);
 let tab='search',results={query:'',rows:[],prices:{}},mine={shops:[],perks:tradePerks(0)},shops=[],kind='sell',shown='';
 const dialog=document.createElement('dialog');dialog.id='market-board';dialog.setAttribute('aria-labelledby','board-title');
 dialog.innerHTML=`<header><h2 id="board-title">ตลาดกลาง</h2><button class="mp-icon" id="board-close" aria-label="ปิดตลาดกลาง">×</button></header>
  <nav class="board-tabs" role="tablist"><button type="button" data-tab="search">ค้นหาของ</button><button type="button" data-tab="open">เปิดร้าน</button><button type="button" data-tab="mine">ร้านของฉัน</button></nav><div id="board-body"></div>`;
 ($('game-shell')??document.body).append(dialog);
 dialog.querySelector('#board-close').onclick=()=>dialog.close();
 dialog.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;if(tab==='mine')cmd('shopMine');render(true);});
 function open(t='search'){if(!game.online)return world.notice('ตลาดกลางต้องเข้าโหมดออนไลน์');tab=t;cmd('shopMine');openHudPanel(dialog);render(true);}
 // Entry points: a button beside the bag's market bar, the M-key world map is untouched.
 const entry=document.createElement('button');entry.type='button';entry.id='open-market-board';entry.innerHTML=icon('market-stalls','item-icon small')+'ตลาดกลาง';
 entry.onclick=()=>{$('bag-window')?.close();open();};
 const bar=document.querySelector('#bag-window .market-bar');(bar??$('bag-window'))?.append(entry);

 // ---- shop signs on the market street (capital only)
 const signs=new Map(),labels=$('world-labels'),point=new THREE.Vector3();
 function sign(s){
  const c=document.createElement('canvas');c.width=320;c.height=96;const g=c.getContext('2d');
  g.fillStyle=s.kind==='buy'?'#1f3d52ee':'#163a2eee';g.strokeStyle='#d5b472';g.lineWidth=5;g.beginPath();g.roundRect(4,4,312,88,16);g.fill();g.stroke();
  g.fillStyle='#ffe5ab';g.font='bold 30px Mali,Tahoma';g.textAlign='left';const t=(s.kind==='buy'?'รับซื้อ · ':'')+s.title;g.fillText(t,160-g.measureText(t).width/2,46);
  g.fillStyle='#cfe0d4';g.font='22px Mali,Tahoma';const o=s.ownerName;g.fillText(o,160-g.measureText(o).width/2,78);
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false}));sp.scale.set(2.6,.78,1);sp.position.set(s.x,2.4,s.z);sp.renderOrder=5;
  const post=new THREE.Mesh(new THREE.CylinderGeometry(.05,.07,2.1,8),new THREE.MeshLambertMaterial({color:'#6b4a2a'}));post.position.set(s.x,1.05,s.z);
  const mat=new THREE.Mesh(new THREE.CircleGeometry(.9,24),new THREE.MeshBasicMaterial({color:s.kind==='buy'?'#4f86b0':'#c9a35a',transparent:true,opacity:.35,depthWrite:false}));mat.rotation.x=-Math.PI/2;mat.position.set(s.x,.08,s.z);
  const btn=document.createElement('button');btn.type='button';btn.className='npc-label shop-label';btn.textContent='🛒 '+s.title;btn.onclick=()=>visit(s.id);labels?.append(btn);
  scene.add(sp,post,mat);return {sp,post,mat,btn,tex};
 }
 function syncSigns(){
  if(map.id!==MARKET_ZONE.mapId)return;
  for(const [id,v] of signs)if(!shops.some(s=>s.id===id)){scene.remove(v.sp,v.post,v.mat);v.tex.dispose();v.btn.remove();signs.delete(id);}
  for(const s of shops)if(!signs.has(s.id))signs.set(s.id,sign(s));
 }
 // Walk to a shop, then open its counter.
 let counter=null;
 function visit(id){const s=shops.find(v=>v.id===id);if(!s)return;
  if(Math.hypot(world.player.x-s.x,world.player.z-s.z)<4){counter=id;tab='shop';openHudPanel(dialog);render(true);return;}
  game.walkTo({x:s.x,z:s.z},{radius:2.2,kind:'npc',onArrive:()=>visit(id),onFail:()=>world.notice('ไปที่ร้านไม่ได้')});}

 game.onEvent(e=>{
  if(e.type==='shops'){shops=e.list;syncSigns();render(true);}
  if(e.type==='shopMine'){mine={shops:e.shops,perks:e.perks};render(true);}
  if(e.type==='marketResults'){results=e;render(true);}
 });

 const listRow=(id,r,btn)=>`<li data-id="${esc(id)}">${icon(id)}<div><strong>${esc(itemDef(id)?.name)}</strong><small>${money(r.price)} · เหลือ ${r.count}</small></div>${btn}</li>`;
 const qty=max=>`<span class="qty"><button type="button" data-q="-1" aria-label="ลด">−</button><output>1</output><button type="button" data-q="1" data-max="${max}" aria-label="เพิ่ม">+</button></span>`;
 const wireQty=body=>body.querySelectorAll('.qty').forEach(q=>{const out=q.querySelector('output'),max=+q.querySelector('[data-max]').dataset.max;q.querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>{out.value=String(Math.min(max,Math.max(1,+out.value+ +b.dataset.q)));});});
 function render(force=false){
  if(!dialog.open)return;const bag=bagUI.bag(),sig=JSON.stringify([tab,kind,results,mine,shops,counter,bag]);if(!force&&sig===shown)return;shown=sig;
  dialog.querySelectorAll('[data-tab]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.tab===tab)));
  const body=$('board-body'),perks=mine.perks??tradePerks(0);
  if(tab==='search'){
   body.innerHTML=`<form class="board-search"><input id="board-q" maxlength="30" placeholder="พิมพ์ชื่อของ เช่น ฟันหนู" value="${esc(results.query)}" aria-label="ชื่อของที่ต้องการค้นหา"><button type="submit" class="mp-primary">ค้นหา</button></form>
    <p class="market-note">ค้นทุกร้านค้างและแผงในเซิร์ฟนี้ · ร้านขายเรียงจากถูกไปแพง ร้านรับซื้อเรียงจากให้ราคาดีสุด</p>
    <ul class="market-list board-results">${results.rows.map((r,i)=>{const p=results.prices?.[priceKey(r.item)];return `<li>${icon(r.item)}<div><strong>${r.kind==='buy'?'รับซื้อ ':''}${esc(itemDef(r.item)?.name)}</strong><small>${money(r.price)} · ${r.count} ชิ้น · ${esc(r.name)}${r.live?' (ออนไลน์)':''}${p?` · ราคากลาง ${money(p.avg)}`:''}</small></div><button type="button" data-go="${i}">เดินไป</button></li>`;}).join('')||'<li class="empty">'+(results.query?'ไม่พบของชิ้นนี้ในตลาด':'ยังไม่ได้ค้นหา')+'</li>'}</ul>`;
   body.querySelector('form').onsubmit=e=>{e.preventDefault();const q=body.querySelector('#board-q').value.trim();if(q)cmd('marketSearch',{query:q});};
   body.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>{const r=results.rows[+b.dataset.go];
    if(r.mapId!==map.id)return world.notice('ร้านนี้อยู่ที่อยุธยา · เดินทางไปก่อน');dialog.close();
    if(r.shop)visit(r.shop);else game.walkTo({x:r.x,z:r.z},{radius:2,kind:'npc',onArrive:()=>{cmd('stallList');$('bag-window');world.notice('ถึงแผง '+r.name+' แล้ว · เปิดกระเป๋า > ตลาด เพื่อซื้อ');}});});
  }
  if(tab==='open'){
   const here=inMarket(map.id,world.player.x,world.player.z),list=kind==='sell'?Object.entries(bag.items).filter(([id])=>TRADABLE(id)):[];
   body.innerHTML=`<p class="market-note">ร้านค้างเปิดต่อแม้ออกจากเกม · ตั้งได้ที่${MARKET_ZONE.name} (${here?'คุณอยู่ในเขตตลาดแล้ว':'ยังไม่อยู่ในเขตตลาด'}) · ภาษีขาย ${Math.round(perks.tax*1000)/10}% · สูงสุด ${perks.slots} ชนิด · ${perks.shops} ร้าน</p>
    <div class="board-kind"><button type="button" data-kind="sell" aria-pressed="${kind==='sell'}">ร้านขายของ</button><button type="button" data-kind="buy" aria-pressed="${kind==='buy'}">ร้านรับซื้อ</button></div>
    <label class="market-coin">ชื่อร้าน <input id="shop-title" maxlength="24" placeholder="${kind==='buy'?'รับซื้อของ':'ร้านค้าง'}"></label>
    ${kind==='sell'?`<ul class="market-list">${list.map(([id,n])=>`<li data-id="${esc(id)}"><input type="checkbox" aria-label="ขาย ${esc(itemDef(id)?.name)}">${icon(id)}<div><strong>${esc(itemDef(id)?.name)}</strong><small>มี ${n}${(()=>{const p=results.prices?.[priceKey(id)];return p?' · ราคากลาง '+money(p.avg):''})()}</small></div><input class="shop-count" type="number" min="1" max="${n}" value="${n}" aria-label="จำนวน"><input class="shop-price" type="number" min="1" value="10" aria-label="ราคาต่อชิ้น"></li>`).join('')||'<li class="empty">ไม่มีของที่ขายได้ในกระเป๋า</li>'}</ul>`
     :`<p class="market-note">ใส่ชื่อของที่อยากรับซื้อ จำนวน และราคาต่อชิ้น · ร้านจะกันเบี้ยไว้ตามยอดรวม</p><div class="board-want"><input id="want-item" placeholder="ชื่อของ เช่น ฟางมัดเรืองแสง" aria-label="ชื่อของที่รับซื้อ"><input id="want-count" type="number" min="1" value="10" aria-label="จำนวน"><input id="want-price" type="number" min="1" value="5" aria-label="ราคาต่อชิ้น"></div>`}
    <div class="market-actions"><button type="button" class="mp-primary" id="shop-open">เปิดร้านตรงนี้</button></div>`;
   body.querySelectorAll('[data-kind]').forEach(b=>b.onclick=()=>{kind=b.dataset.kind;render(true);});
   body.querySelector('#shop-open').onclick=()=>{
    const title=body.querySelector('#shop-title').value.trim(),items={};let warn='';
    if(kind==='sell'){body.querySelectorAll('li[data-id]').forEach(li=>{if(li.querySelector('[type=checkbox]').checked){const id=li.dataset.id,price=Math.floor(+li.querySelector('.shop-price').value);items[id]={count:Math.floor(+li.querySelector('.shop-count').value),price};const h=priceHint(results.prices,id,price);if(h)warn=itemDef(id)?.name+(h==='high'?' แพงกว่าราคากลางมาก':' ถูกกว่าราคากลางมาก');}});}
    else{const q=body.querySelector('#want-item').value.trim();const id=findItem(q);if(!id)return world.notice('ไม่พบของชื่อนี้');items[id]={count:Math.floor(+body.querySelector('#want-count').value),price:Math.floor(+body.querySelector('#want-price').value)};}
    if(!Object.keys(items).length)return world.notice('เลือกของก่อน');
    if(warn&&!confirm('ระวัง: '+warn+' · ยืนยันเปิดร้าน?'))return;
    cmd('shopOpen',{shop:{kind,title,items}});
   };
  }
  if(tab==='mine'){
   body.innerHTML=`<p class="market-note">ทักษะการค้า Lv.${perks.level} · ${money(perks.xp)}${perks.next?' / '+money(perks.next):''} · ร้านค้าง ${perks.shops} · ${perks.slots} ชนิด/ร้าน · ภาษี ${Math.round(perks.tax*1000)/10}% · ส่วนลดร้าน NPC ${Math.round(perks.npcDiscount*100)}%</p>`+
    (mine.shops.length?mine.shops.map(s=>`<section class="market-stall" data-shop="${esc(s.id)}"><h3>${s.kind==='buy'?'รับซื้อ · ':''}${esc(s.title)} <small>${s.kind==='buy'?'เบี้ยที่กันไว้ '+money(s.escrow):''}</small></h3>
     <ul class="market-list">${Object.entries(s.items).map(([id,r])=>listRow(id,r,'')).join('')||'<li class="empty">ขายหมดแล้ว</li>'}</ul>
     <p class="market-note">รอรับ: ${money(s.pouch?.coins)}${Object.entries(s.pouch?.items??{}).map(([id,n])=>' · '+esc(itemDef(id)?.name)+' ×'+n).join('')}</p>
     <details><summary>ประวัติการขาย (${s.log?.length??0})</summary><ul class="board-log">${(s.log??[]).map(l=>`<li>${when(l.t)} · ${esc(l.who)} ${l.kind==='sold'?'ซื้อ':'ขายให้'} ${esc(itemDef(l.item)?.name)} ×${l.count} · ${money(l.coins)}</li>`).join('')||'<li>ยังไม่มี</li>'}</ul></details>
     <div class="market-actions"><button type="button" data-a="shopCollect">รับของ/เบี้ย</button><button type="button" data-a="shopClose">ปิดร้าน</button></div></section>`).join(''):'<p class="market-note">ยังไม่มีร้านค้าง · ไปที่แท็บ "เปิดร้าน"</p>');
   body.querySelectorAll('[data-a]').forEach(b=>b.onclick=()=>cmd(b.dataset.a,{shop:b.closest('[data-shop]').dataset.shop}));
  }
  if(tab==='shop'){
   const s=shops.find(v=>v.id===counter);if(!s){body.innerHTML='<p class="market-note">ร้านนี้ปิดแล้ว</p>';return;}
   body.innerHTML=`<h3>${s.kind==='buy'?'รับซื้อ · ':''}${esc(s.title)} <small>· ${esc(s.ownerName)}</small></h3><ul class="market-list">${Object.entries(s.items).map(([id,r])=>{const have=bag.items[id]??0,max=s.kind==='buy'?Math.min(r.count,have):r.count;
    return listRow(id,r,max>0?qty(max)+`<button type="button" class="mp-primary deal">${s.kind==='buy'?'ขายให้':'ซื้อ'}</button>`:`<small>${s.kind==='buy'?'ไม่มีของ':'หมด'}</small>`);}).join('')||'<li class="empty">ร้านว่าง</li>'}</ul>`;
   wireQty(body);
   body.querySelectorAll('.deal').forEach(b=>b.onclick=()=>{const li=b.closest('li');cmd(s.kind==='buy'?'shopSell':'shopBuy',{shop:s.id,item:li.dataset.id,count:+li.querySelector('output').value});});
  }
 }
 // A buying store names a base item: exact name first, then the first tradable item whose name contains the text.
 const findItem=q=>{if(!q)return null;const ids=Object.keys(ITEMS).filter(TRADABLE);return ids.find(id=>ITEMS[id].name===q)??ids.find(id=>ITEMS[id].name.includes(q))??null;};
 return {update(){
  if(tab==='shop'&&dialog.open){const s=shops.find(v=>v.id===counter);if(s&&Math.hypot(world.player.x-s.x,world.player.z-s.z)>5)dialog.close();}
  for(const [id,v] of signs){const s=shops.find(x=>x.id===id);if(!s)continue;const d=Math.hypot(world.player.x-s.x,world.player.z-s.z);point.set(s.x,2.9,s.z).project(camera);
   v.btn.style.transform=`translate(-50%,-100%) translate(${(point.x*.5+.5)*innerWidth}px,${(-point.y*.5+.5)*innerHeight}px)`;v.btn.style.visibility=d<30&&Math.abs(point.x)<1.1&&Math.abs(point.y)<1.1?'visible':'hidden';}
  if(tab!=='open')render(); // the open-shop form is never redrawn while the player is typing in it
 },open};
}
