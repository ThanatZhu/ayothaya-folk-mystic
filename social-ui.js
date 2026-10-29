// Friends and guild window (0.47). Online only: the realm server owns both lists.
// Whisper: "/w ชื่อ ข้อความ" in chat, or the กระซิบ button here (multiplayer-ui.js sends it).
import {emblemId} from './items.js?v=107';
import {GUILD_COST,EMBLEMS,GUILD_LEVELS,GUILD_UPGRADES,GUILD_RITE,GUILD_GOAL,NOTICE_MAX,DONATE_MIN} from './social.js?v=101';
import {iconStyle} from './bag-ui.js?v=surfaces222';
import {openHudPanel} from './hud-panels.js?v=34';

const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';');
const icon=(id,c='item-icon')=>`<i class="${c}" style="${iconStyle(id)}"></i>`;
export const emblemIcon=(n,c='item-icon small')=>icon(emblemId(n),c);

export function createSocialUI({game,account,worldUI=null,map=null,hall=null}){
 if(!document.querySelector('link[data-social-ui]')){const css=document.createElement('link');css.rel='stylesheet';css.href='social-ui.css?v=guild162';css.dataset.socialUi='';document.head.append(css);}
 const world=game.world,cmd=(type,data)=>world.market?.(type,data);
 let tab='friends',gtab='home',friends=[],guild=null,guildAt=0,asks=[],pick=1,shown='';const hereHall=!!map?.guildHall;
 let guildPane='find',searchDraft='',searchQuery='',createDraft='',directory=[],directoryTotal=0,directoryMore=false,directoryLoaded=false,searching=false;const applying=new Set();
 const menu=document.createElement('button');menu.id='menu-social';menu.type='button';menu.title='เพื่อน · กิลด์';menu.setAttribute('aria-label','เพื่อน และ กิลด์');
 menu.innerHTML='<i>'+icon('friend','item-icon menu-item-icon')+'</i><span>สังคม</span>';
 const nav=$('game-menu');if(nav)nav.insertBefore(menu,$('menu-players')??null);
 const dialog=document.createElement('dialog');dialog.id='social-window';dialog.setAttribute('aria-labelledby','social-title');
 dialog.innerHTML='<header><h2 id="social-title">เพื่อน · กิลด์</h2><button class="mp-icon" id="social-close" aria-label="ปิด">×</button></header><div class="social-tabs" role="tablist"><button role="tab" data-tab="friends">เพื่อน</button><button role="tab" data-tab="guild">กิลด์</button></div><div id="social-asks"></div><div id="social-body"></div>';
 ($('game-shell')??document.body).append(dialog);
 const open=()=>{game.clearInput();openHudPanel(dialog);if(game.online){cmd('friendList');cmd('guildInfo');}render(true);};
 menu.onclick=()=>dialog.open?dialog.close():open();
 dialog.querySelector('#social-close').onclick=()=>dialog.close();
 dialog.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;render(true);if(tab==='guild'&&(!guild||gtab==='find')&&!directoryLoaded&&!searching)searchGuilds();});
 // 1.01 the hall NPC in the capital (role guild-hall) walks members to their guild hall.
 if(worldUI){const prev=worldUI.afterTalk;worldUI.afterTalk=n=>{prev?.(n);$('npc-guild-hall')?.remove();if(n.role!=='guild-hall')return;
  const b=document.createElement('button');b.id='npc-guild-hall';b.type='button';b.innerHTML=icon('guild-flag','item-icon small')+' ไปทุ่งชุมพลของกิลด์';
  b.onclick=()=>{$('close-npc')?.click();if(!game.online)world.notice('ทุ่งชุมพลของกิลด์ต้องเข้าโหมดออนไลน์');else if(!guild)world.notice('ต้องเป็นสมาชิกกิลด์ก่อน · ก่อตั้งหรือรับคำเชิญได้ที่หน้าสังคม');else worldUI.guildHall();};$('close-npc')?.before(b);};}
 const whisper=name=>{dialog.close();const input=$('online-text');if(!input)return;input.value='/w '+name+' ';input.focus();};

 game.onEvent(e=>{
  if(e.type==='friends'){friends=e.list;render(true);}
  if(e.type==='guild'){if(!guild&&e.guild){gtab='home';guildPane='find';}guild=e.guild;if(guild)pick=guild.emblem;guildAt=Date.now();hall?.guildUpgrades?.(guild?.upgrades??{});render(true);}
  if(e.type==='guildDirectory'&&e.query===searchQuery){directory=e.list;directoryTotal=e.total;directoryMore=e.more;directoryLoaded=true;searching=false;render(true);}
  if(e.type==='guildApplication'){applying.delete(e.guild);for(const row of directory)if(row.id===e.guild)row.applied=!!e.pending;render(true);}
  if(e.type==='guildHallExit')worldUI?.travelTo?.('ayutthaya'); // 1.01 no longer a member: out of the hall
  if(e.type==='friendAsk')asks.push({kind:'friend',from:e.from,text:`<b>${esc(e.name)}</b> ขอเป็นเพื่อน`});
  if(e.type==='guildAsk')asks.push({kind:'guild',guild:e.guild,text:`<b>${esc(e.from)}</b> ชวนเข้ากิลด์ ${emblemIcon(e.emblem)}<b>${esc(e.name)}</b>`});
  if(e.type==='friendAsk'||e.type==='guildAsk'){if(!dialog.open)open();else render(true);}
 });

 function searchGuilds(){searchQuery=searchDraft.normalize('NFC').replace(/[\u0000-\u001f<>]/g,'').trim().slice(0,32);searching=true;render(true);cmd('guildSearch',{query:searchQuery});}
 function render(force=false){
  const active=document.activeElement,id=active?.id,inside=active&&$('social-body')?.contains(active),value=inside&&'value'in active?active.value:null,start=active?.selectionStart,end=active?.selectionEnd;
  try{renderContent(force);}finally{if(inside&&id){const next=$(id);if(next&&next!==active){if(value!==null)next.value=value;next.focus({preventScroll:true});if(typeof start==='number')try{next.setSelectionRange(start,end);}catch{}}}}
 }
 function renderDirectory(body){
  body.innerHTML=`<div class="guild-directory-head"><div><h3>ค้นหากิลด์</h3><p>หาเพื่อนร่วมทาง ล่าบอส และออกศึกด้วยกัน</p></div><button type="button" id="guild-create-open" ${guild?'disabled title="ต้องออกจากกิลด์ปัจจุบันก่อน"':''}>สร้างกิลด์</button></div>`+
   `<form class="social-add guild-search" id="guild-search-form"><label for="guild-search">ชื่อกิลด์</label><input id="guild-search" type="search" maxlength="32" value="${esc(searchDraft)}" placeholder="พิมพ์ชื่อกิลด์ หรือบางส่วนของชื่อ" aria-label="ค้นหากิลด์"><button type="submit">ค้นหา</button></form>`+
   `<p class="social-note" role="status">${searching?'กำลังค้นหากิลด์…':!directoryLoaded?'กดค้นหาเพื่อดูรายชื่อกิลด์':directoryTotal?'พบ '+directoryTotal+' กิลด์'+(directoryMore?' · แสดง 24 กิลด์แรก พิมพ์ชื่อให้เจาะจงขึ้น':''):'ไม่พบกิลด์ ลองค้นหาชื่ออื่นหรือสร้างกิลด์ใหม่'}</p>`+
   `<ul class="guild-directory-list">${directory.map(g=>`<li><div class="guild-result-head">${emblemIcon(g.emblem,'item-icon big')}<div><strong>${esc(g.name)}</strong><small>Lv.${g.level} · สมาชิก ${g.members}/${g.seats}</small></div></div><p class="guild-result-leader">หัวหน้า ${esc(g.leader)} · ออนไลน์ ${g.online} คน</p><p class="guild-result-notice">${g.notice?esc(g.notice):'ยังไม่มีประกาศกิลด์'}</p>${g.applied?'<p class="guild-result-status">รอการอนุมัติ</p>':''}<button type="button" data-guild-apply="${esc(g.id)}" data-pending="${!!g.applied}" ${guild||(!g.applied&&g.members>=g.seats)||applying.has(g.id)?'disabled':''}>${guild?'มีกิลด์แล้ว':g.applied?'ยกเลิกคำขอ':g.members>=g.seats?'สมาชิกเต็ม':applying.has(g.id)?'กำลังส่ง…':'ขอเข้ากิลด์'}</button></li>`).join('')}</ul>`;
  body.querySelector('#guild-search').oninput=e=>{searchDraft=e.target.value;};body.querySelector('#guild-search-form').onsubmit=e=>{e.preventDefault();searchGuilds();};
  body.querySelector('#guild-create-open').onclick=()=>{guildPane='create';render(true);$('guild-name')?.focus();};
  body.querySelectorAll('[data-guild-apply]').forEach(b=>b.onclick=()=>{const id=b.dataset.guildApply;applying.add(id);render(true);cmd('guildApply',{guild:id,cancel:!!directory.find(g=>g.id===id)?.applied});});
 }
 function renderContent(force=false){
  if(!dialog.open)return;
  const sig=JSON.stringify([tab,gtab,guildPane,friends,guild,asks.length,pick,game.online,directory,directoryTotal,searching,[...applying]]);if(!force&&sig===shown)return;shown=sig;
  dialog.dataset.socialTab=tab;
  dialog.querySelectorAll('[data-tab]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.tab===tab)));
  $('social-asks').innerHTML=asks.map((a,i)=>`<p class="social-ask" data-i="${i}">${a.text}<button type="button" class="mp-primary" data-ok="1">ยอมรับ</button><button type="button" data-ok="">ปฏิเสธ</button></p>`).join('');
  $('social-asks').querySelectorAll('[data-ok]').forEach(b=>b.onclick=()=>{const i=+b.closest('[data-i]').dataset.i,a=asks[i],accept=!!b.dataset.ok;asks.splice(i,1);
   if(a.kind==='friend')cmd('friendAnswer',{from:a.from,accept});else cmd('guildAnswer',{guild:a.guild,accept});render(true);});
  const body=$('social-body');
  if(!game.online){body.innerHTML='<p class="social-note">เพื่อน กระซิบ และกิลด์ ต้องเข้าโหมดออนไลน์</p>';return;}
  if(tab==='friends'){
   body.innerHTML=`<form class="social-add" id="friend-form"><input id="friend-name" maxlength="24" placeholder="ชื่อตัวละครที่ออนไลน์อยู่" aria-label="ชื่อเพื่อน"><button type="submit">เพิ่มเพื่อน</button></form>`+
    `<ul class="social-list">${friends.map(f=>`<li class="${f.online?'on':''}" data-name="${esc(f.name)}"><i class="dot"></i><div><strong>${esc(f.name)}</strong><small>${f.online?esc(f.map):'ออฟไลน์'}</small></div><button type="button" data-a="whisper" ${f.online?'':'disabled'}>${icon('whisper','item-icon small')}กระซิบ</button><button type="button" data-a="remove" aria-label="ลบเพื่อน">ลบ</button></li>`).join('')||'<li class="empty">ยังไม่มีเพื่อน · พิมพ์ชื่อผู้เล่นที่ออนไลน์เพื่อส่งคำขอ</li>'}</ul>`;
   body.querySelector('#friend-form').onsubmit=e=>{e.preventDefault();const n=body.querySelector('#friend-name').value.trim();if(n)cmd('friendAdd',{name:n});};
   body.querySelectorAll('[data-a]').forEach(b=>b.onclick=()=>{const n=b.closest('li').dataset.name;if(b.dataset.a==='whisper')whisper(n);else cmd('friendRemove',{name:n});});
   return;
  }
  const emblems=Array.from({length:EMBLEMS},(_,i)=>`<button type="button" id="guild-emblem-${i+1}" class="emblem${i+1===pick?' on':''}" data-e="${i+1}" aria-label="ตรากิลด์ ${i+1}" aria-pressed="${i+1===pick}">${emblemIcon(i+1,'item-icon')}</button>`).join('');
  if((!guild&&guildPane!=='create')||(guild&&gtab==='find')){renderDirectory(body);if(guild){const back=document.createElement('button');back.className='guild-back';back.type='button';back.textContent='กลับกิลด์ของฉัน';back.onclick=()=>{gtab='home';render(true);};body.prepend(back);}return;}
  if(!guild){
   body.innerHTML=`<button type="button" class="guild-back" id="guild-create-back">กลับไปค้นหากิลด์</button><div class="guild-create-layout"><section class="guild-create-info">${emblemIcon(pick,'item-icon guild-create-preview')}<h3>สร้างกิลด์ของคุณ</h3><p>ตั้งชื่อ เลือกตรา แล้วชวนเพื่อนมาออกเดินทางด้วยกัน</p><p class="guild-create-fee">ค่าธรรมเนียม ${GUILD_COST.toLocaleString('th-TH')} เบี้ย</p></section><section class="guild-create-fields"><form class="social-add" id="guild-form"><label for="guild-name">ชื่อกิลด์ (2–16 ตัวอักษร)</label><input id="guild-name" maxlength="16" minlength="2" required value="${esc(createDraft)}" placeholder="ตั้งชื่อกิลด์ของคุณ"><button type="submit">ยืนยันสร้างกิลด์</button></form><p class="social-note">เลือกตรากิลด์</p><div class="emblem-grid">${emblems}</div></section></div>`;
   body.querySelector('#guild-create-back').onclick=()=>{guildPane='find';render(true);if(!directoryLoaded)searchGuilds();};
   body.querySelector('#guild-name').oninput=e=>{createDraft=e.target.value;};
   body.querySelector('#guild-form').onsubmit=e=>{e.preventDefault();cmd('guildCreate',{name:createDraft.trim(),emblem:pick});};
   body.querySelectorAll('[data-e]').forEach(b=>b.onclick=()=>{pick=+b.dataset.e;render(true);});
   return;
  }
  // 1.01 guild page: overview (level, notice, daily goal, rite, hall), members (ranks, contribution), treasury and upgrades.
  const me=account?.character?.name??null,mine=guild.members.find(m=>m.name===me),rank=mine?.rank??'member',leader=rank==='leader',staff=leader||rank==='deputy';
  const lead=guild.members.find(m=>m.leader)?.name,num=n=>Number(n??0).toLocaleString('th-TH'),bar=(v,max)=>`<i class="guild-bar"><b style="width:${Math.min(100,max?v/max*100:100).toFixed(1)}%"></b></i>`;
  const RANK={leader:'♛ หัวหน้า',deputy:'★ รองหัวหน้า',member:'สมาชิก'},riteLeft=Math.max(0,guild.rite-Math.floor((Date.now()-guildAt)/1000));
  const head=`<div class="guild-head">${emblemIcon(guild.emblem,'item-icon big')}<div><strong>${esc(guild.name)} <span class="guild-lv">Lv.${guild.level}</span></strong><small>หัวหน้า ${esc(lead)} · สมาชิก ${guild.members.length}/${guild.seats}</small>${bar(guild.exp-(GUILD_LEVELS[guild.level-1]??0),guild.next?guild.next-(GUILD_LEVELS[guild.level-1]??0):0)}<small class="num">${guild.next?`EXP ${num(guild.exp)} / ${num(guild.next)}`:'ระดับสูงสุด'}</small></div></div>`+
   `<div class="social-tabs guild-tabs" role="tablist">${[['home','ภาพรวม'],['members','สมาชิก'],['treasury','คลัง · อัปเกรด'],['find','ค้นหากิลด์']].map(([k,t])=>`<button role="tab" data-gtab="${k}" aria-selected="${gtab===k}">${t}</button>`).join('')}</div>`;
  let page='';
  if(gtab==='home'){
   page=`<section class="guild-card notice"><h3>📜 กระดานประกาศ</h3><p>${guild.notice?esc(guild.notice):'<span class="muted">ยังไม่มีประกาศ</span>'}</p>`+
    (staff?`<form class="social-add" id="guild-notice"><input id="notice-text" maxlength="${NOTICE_MAX}" value="${esc(guild.notice)}" placeholder="ประกาศถึงสมาชิก (ไม่เกิน ${NOTICE_MAX} ตัว)" aria-label="ประกาศกิลด์"><button type="submit">บันทึก</button></form>`:'')+`</section>`+
    `<section class="guild-card"><h3>🏯 ทุ่งชุมพล · หอกิลด์</h3><p>ลานรวมพลข้างวัด ที่ไพร่พลอโยธยามาชุมนุม รับน้ำพระพุทธมนต์ และรอฤกษ์ยามก่อนเคลื่อนทัพ · เข้าได้เฉพาะสมาชิก</p><button type="button" id="guild-hall"${hereHall?' disabled':''}>${hereHall?'อยู่ที่ทุ่งชุมพลแล้ว':'ไปทุ่งชุมพล'}</button></section>`+
    `<section class="guild-card"><h3>⚔️ เป้าหมายวันนี้ · ล่ามอนสเตอร์ร่วมกัน</h3>${bar(guild.goal.kills,guild.goal.need)}<p class="num">${num(Math.min(guild.goal.kills,guild.goal.need))} / ${num(guild.goal.need)} ตัว ${guild.goal.done?'· <b class="ok">สำเร็จแล้ว ✓</b>':`· สำเร็จได้ กิลด์ EXP +${GUILD_GOAL.exp} · คลัง +${num(GUILD_GOAL.treasury)}`}</p></section>`+
    `<section class="guild-card"><h3>🪷 ${GUILD_RITE.name}</h3><p>EXP +${GUILD_RITE.exp*100}% ทั้งกิลด์ ${GUILD_RITE.minutes} นาที · ใช้คลัง ${num(GUILD_RITE.cost)} เบี้ย · กิลด์ Lv.${GUILD_RITE.level}+</p>`+
    (riteLeft>0?`<p class="ok">กำลังมีผล · เหลืออีกราว ${Math.ceil(riteLeft/60)} นาที</p>`:staff?`<button type="button" id="guild-rite"${guild.level<GUILD_RITE.level||guild.treasury<GUILD_RITE.cost?' disabled':''}>ประกอบพิธี</button>`:'<p class="muted">หัวหน้าหรือรองหัวหน้าเป็นผู้ประกอบพิธี</p>')+`</section>`+
    (game.world.war?`<p class="social-note">🏯 ป้อมโรงสี · ผู้ครอง: ${esc(game.world.war.owner??'ยังไม่มี')} · กิลด์วอร์ ${esc(game.world.war.next)} ที่โรงสีใต้เงาจันทร์ · ทำลายศิลาราชสีห์เพื่อยึดป้อม</p><p class="social-note">อันดับ 1: ผู้ครองป้อมเมื่อจบ · อันดับ 2–3: ดาเมจต่อศิลาราชสีห์สูงสุดในกิลด์ที่เหลือ · เท่ากันดูจำนวนยึดป้อมและล้มคู่ต่อสู้ · สมาชิกที่ร่วมรบทุกคนใน 3 อันดับแรกได้รับเศษตราพิชิตอโยธยา สุ่มคนละ 1–3 เศษ ทางจดหมาย</p>${(game.world.war.rankings??[]).length?`<ol class="social-note">${game.world.war.rankings.map(g=>`<li>${esc(g.name)} · ดาเมจศิลา ${num(g.damage)}</li>`).join('')}</ol>`:''}`:'');
  }else if(gtab==='members'){
   const list=[...guild.members].sort((a,b)=>({leader:0,deputy:1,member:2}[a.rank]-{leader:0,deputy:1,member:2}[b.rank])||b.contrib-a.contrib);
   const manage=m=>{if(m.name===me||!staff)return '';if(!leader)return m.rank==='member'?'<button type="button" data-a="kick">เชิญออก</button>':'';
    return `<select data-a="manage" aria-label="จัดการ ${esc(m.name)}"><option value="">จัดการ</option>${m.rank==='deputy'?'<option value="member">ลดเป็นสมาชิก</option>':'<option value="deputy">ตั้งเป็นรองหัวหน้า</option>'}<option value="leader">มอบตำแหน่งหัวหน้า</option><option value="kick">เชิญออกจากกิลด์</option></select>`;};
   page=(staff?`<form class="social-add" id="guild-invite"><input id="invite-name" maxlength="24" placeholder="ชื่อผู้เล่นที่จะชวน" aria-label="ชวนเข้ากิลด์"><button type="submit">ชวนเข้ากิลด์</button></form>`:'')+
    `<p class="social-note">เรียงตามยศ แล้วตามแต้มช่วยกิลด์ (บริจาค 10 เบี้ย = 1 แต้ม · ล่ามอน 1 ตัว = 1 แต้ม)</p>`+
    `<ul class="social-list">${list.map(m=>`<li class="${m.online?'on':''}" data-name="${esc(m.name)}"><i class="dot"></i><div><strong>${esc(m.name)}</strong><small>${RANK[m.rank]} · ${m.online?esc(m.map):'ออฟไลน์'}</small></div><b class="contrib num" title="แต้มช่วยกิลด์">${num(m.contrib)}</b>${m.name!==me&&m.online?'<button type="button" data-a="whisper">กระซิบ</button>':''}${manage(m)}</li>`).join('')}</ul>`+
    (leader?`<details class="guild-emblem"><summary>เปลี่ยนตรากิลด์</summary><div class="emblem-grid">${emblems}</div></details>`:'');
  }else{
   page=`<section class="guild-card"><h3>💰 คลังกิลด์</h3><p class="treasury num">${num(guild.treasury)} เบี้ย</p><form class="social-add" id="guild-donate"><input id="donate-coins" type="number" inputmode="numeric" min="${DONATE_MIN}" step="100" value="1000" aria-label="จำนวนเบี้ยที่บริจาค"><button type="submit">บริจาค</button></form><p class="muted">ขั้นต่ำ ${num(DONATE_MIN)} เบี้ย · ทุก 10 เบี้ยได้กิลด์ EXP 1 และแต้มช่วยกิลด์ 1</p></section>`+
    Object.entries(GUILD_UPGRADES).map(([id,u])=>{const t=guild.upgrades[id]??0,max=t>=u.costs.length;
     return `<section class="guild-card upgrade"><h3>${esc(u.name)} <span class="tier">${'◆'.repeat(t)}${'◇'.repeat(u.costs.length-t)}</span></h3><p>${esc(u.text)} · ปรากฏที่ทุ่งชุมพล</p>`+
      (max?'<p class="ok">สร้างครบทุกขั้นแล้ว</p>':`<p class="muted">ขั้น ${t+1}: ${num(u.costs[t])} เบี้ยจากคลัง · ต้องการกิลด์ Lv.${u.levels[t]}</p>`+(leader?`<button type="button" data-up="${id}"${guild.level<u.levels[t]||guild.treasury<u.costs[t]?' disabled':''}>สร้างขั้น ${t+1}</button>`:''))+`</section>`;}).join('');
  }
  const applications=staff&&guild.applications?.length?`<section class="guild-card guild-applications"><h3>คำขอเข้ากิลด์ (${guild.applications.length})</h3><ul class="social-list">${guild.applications.map(a=>`<li><div><strong>${esc(a.name)}</strong><small>Lv.${a.level}</small></div><button type="button" data-application="${esc(a.id)}" data-accept="true">รับเข้ากิลด์</button><button type="button" data-application="${esc(a.id)}" data-accept="false">ปฏิเสธ</button></li>`).join('')}</ul></section>`:'';
  body.innerHTML=head+`<div class="guild-page guild-page-${gtab}">`+applications+page+'</div>'+`<div class="social-actions"><span>คุยในกิลด์: แท็บ <b>กิลด์</b> ในแชต</span><button type="button" id="guild-leave">ออกจากกิลด์</button></div>`;
  body.querySelectorAll('[data-gtab]').forEach(b=>b.onclick=()=>{gtab=b.dataset.gtab;render(true);if(gtab==='find')searchGuilds();});
  body.querySelectorAll('[data-application]').forEach(b=>b.onclick=()=>cmd('guildApplicationAnswer',{application:b.dataset.application,accept:b.dataset.accept==='true'}));
  body.querySelector('#guild-invite')?.addEventListener('submit',e=>{e.preventDefault();const n=body.querySelector('#invite-name').value.trim();if(n)cmd('guildInvite',{name:n});});
  body.querySelector('#guild-notice')?.addEventListener('submit',e=>{e.preventDefault();cmd('guildNotice',{text:body.querySelector('#notice-text').value});});
  body.querySelector('#guild-donate')?.addEventListener('submit',e=>{e.preventDefault();const n=Math.floor(+body.querySelector('#donate-coins').value);if(n>=DONATE_MIN&&confirm('บริจาค '+num(n)+' เบี้ยเข้าคลังกิลด์?'))cmd('guildDonate',{coins:n});});
  body.querySelector('#guild-rite')?.addEventListener('click',()=>{if(confirm(GUILD_RITE.name+' ใช้คลัง '+num(GUILD_RITE.cost)+' เบี้ย?'))cmd('guildRite');});
  body.querySelector('#guild-hall')?.addEventListener('click',()=>{dialog.close();worldUI?.guildHall?.();});
  body.querySelectorAll('[data-up]').forEach(b=>b.onclick=()=>{const u=GUILD_UPGRADES[b.dataset.up];if(confirm('สร้าง'+u.name+' ด้วยเบี้ยจากคลัง?'))cmd('guildUpgrade',{id:b.dataset.up});});
  body.querySelectorAll('[data-a]').forEach(b=>{const n=b.closest('li')?.dataset.name;
   if(b.dataset.a==='manage')b.onchange=()=>{const v=b.value;b.value='';if(v==='kick'){if(confirm('เชิญ '+n+' ออกจากกิลด์?'))cmd('guildKick',{name:n});}else if(v&&(v!=='leader'||confirm('มอบตำแหน่งหัวหน้ากิลด์ให้ '+n+'? คุณจะเป็นรองหัวหน้าแทน')))cmd('guildRank',{name:n,rank:v});};
   else b.onclick=()=>{if(b.dataset.a==='whisper')whisper(n);else if(confirm('เชิญ '+n+' ออกจากกิลด์?'))cmd('guildKick',{name:n});};});
  body.querySelectorAll('[data-e]').forEach(b=>b.onclick=()=>cmd('guildEmblem',{emblem:+b.dataset.e}));
  body.querySelector('#guild-leave').onclick=()=>{if(confirm('ออกจากกิลด์ '+guild.name+'?'))cmd('guildLeave');};
 }
 return {update(){render();}};
}
