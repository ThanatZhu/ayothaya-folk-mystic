// 0.85 back-office dashboard: every tunable game number in one place (paths, skills, items, monsters).
// Edits are kept as overrides (balance.js FIELDS); "บันทึกเข้าเกม" posts them to the local dev server, which writes
// balance-data.js for the next deploy. Player data is not touched here.
import {ITEMS} from './items.js?v=94';
import {CLASSES,NOVICE,classSkills,className} from './classes.js?v=73';
import {multiplayerURL} from './multiplayer-config.js';
import {SKILLS,MONSTER_TYPES} from './combat-core.js?v=97';
import {BALANCE,BASELINE,FIELDS,monsterKey} from './balance.js';
import {SKILL_TREE,scaledSkill} from './skill-progress.js?v=87';

const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';');
const LABEL={damage:'พลัง',heal:'ฟื้นฟู',cost:'MP',cd:'คูลดาวน์',range:'ระยะ',radius:'รัศมี',duration:'นาน',delay:'หน่วง (วิ)',atk:'ATK',matk:'MATK',def:'DEF',level:'เลเวล',buy:'ราคาซื้อ',sell:'ราคาขาย',tokens:'เหรียญงาน',hp:'HP',mp:'MP',speed:'ความเร็ว',baseXp:'Base EXP',jobXp:'Job EXP',respawn:'เกิดใหม่ (วิ)',reach:'ระยะตี'};
const KIND={potion:'ยา',gear:'อุปกรณ์',card:'การ์ด',loot:'วัตถุดิบ',scroll:'ม้วน',egg:'ไข่',lure:'เหยื่อ',petfood:'อาหารสัตว์'};
const paths=[NOVICE,...CLASSES];
let draft=JSON.parse(JSON.stringify(BALANCE));for(const g of Object.keys(FIELDS))draft[g]??={};
let tab='skills',classId='swordsman',query='',kind='all',tableView='compare';
// players tab state (declared up here: the first render may already be on that tab)
const LOCAL=['127.0.0.1','localhost'].includes(location.hostname),API=LOCAL?'':multiplayerURL().replace(/^ws/,'http').replace(/\/realtime$/,'');
let players=null,picked=null,adminMsg='',fbConn=null,fbWarm=null;
let search='',basket=[],giftCoins=0,refreshTimer=0;
const QUICK=[['coins',1000],['coins',10000],['hp-small',10],['mp-small',10],['hp-large',5],['return-incense',5],['lek-lai',1],['break-guard',1]];
const itemName=id=>ITEMS[id]?.name??id;
try{const s=JSON.parse(localStorage.getItem('ayo-admin-view'));if(s){tab=s.tab??tab;classId=s.classId??classId;}}catch{}

// Original value (code) and the value in effect for one field.
const original=(group,key,field,current)=>{const id=group+'.'+key+'.'+field;return id in BASELINE?BASELINE[id]:current;};
const skillBase=(cid,slot)=>classSkills(cid,SKILLS)[slot];
function rowsFor(){
 if(tab==='classes')return paths.map(c=>({group:'classes',key:c.id,title:c.name,sub:c.role??'',src:c}));
 if(tab==='skills')return skillBase&&classSkills(classId,SKILLS).map((s,i)=>({group:'skills',key:classId+':'+i,title:s.key+' · '+s.name,sub:s.type,src:s,skill:true}));
 if(tab==='items')return Object.entries(ITEMS).filter(([id,it])=>it.kind!=='ui'&&it.kind!=='reserved'&&(kind==='all'||it.kind===kind)&&(!query||(it.name+id).toLowerCase().includes(query))).map(([id,it])=>({group:'items',key:id,title:it.name,sub:(KIND[it.kind]??it.kind)+' · '+id,src:it}));
 return MONSTER_TYPES.map((m,i)=>({group:'monsters',key:monsterKey(m,i),title:m.name,sub:(m.boss?'บอส · ':m.elite?'อีลิท · ':'')+monsterKey(m,i),src:m})).filter(r=>!query||(r.title+r.key).toLowerCase().includes(query));
}
const round=v=>typeof v==='number'?Math.round(v*1000)/1000:v;
const value=(r,f)=>{const o=draft[r.group][r.key]?.[f];if(o!==undefined)return o;return round(r.skill?r.src[f]:original(r.group,r.key,f,r.src[f]));};
const base=(r,f)=>r.skill?r.src[f]:original(r.group,r.key,f,r.src[f]);
function columns(rows){const fields=Object.keys(FIELDS[rows[0]?.group??'skills']);return fields.filter(f=>rows.some(r=>base(r,f)!=null||draft[r.group][r.key]?.[f]!==undefined));}
function count(){return Object.values(draft).reduce((n,g)=>n+Object.values(g).reduce((m,f)=>m+Object.keys(f).length,0),0);}
function set(r,f,v){
 const b=base(r,f);if(v===''||v===null||Number(v)===b){if(draft[r.group][r.key]){delete draft[r.group][r.key][f];if(!Object.keys(draft[r.group][r.key]).length)delete draft[r.group][r.key];}}
 else{const [min,max]=FIELDS[r.group][f];(draft[r.group][r.key]??={})[f]=Math.min(max,Math.max(min,Number(v)));}
 $('changes').textContent=count()?`แก้ไว้ ${count()} ช่อง (ยังไม่บันทึก)`:'ยังไม่มีการแก้';
}
function tabs(){
 $('tabs').innerHTML=[['classes','อาชีพ'],['skills','สกิล'],['table','ตารางสกิล'],['items','ไอเท็ม'],['monsters','มอนสเตอร์'],['players','ผู้เล่น']].map(([id,n])=>`<button type="button" id="tab-${id}" aria-pressed="${id===tab}" data-tab="${id}">${n}</button>`).join('');
 $('tabs').querySelectorAll('button').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;query='';remember();tabs();render();});
}
const remember=()=>{try{localStorage.setItem('ayo-admin-view',JSON.stringify({tab,classId}));}catch{}};
function filters(){
 const f=$('filters');
 if(tab==='skills')f.innerHTML=`<label>อาชีพ <select id="class-pick">${paths.map(c=>`<option value="${c.id}"${c.id===classId?' selected':''}>${esc(c.name)}</option>`).join('')}</select></label><small>ค่านี้คือค่าขั้น 1 ก่อนบวกโบนัส Master · ขั้นสูงขึ้นคำนวณจากค่านี้</small>`;
 else if(tab==='table')f.innerHTML=`<label>ดู <select id="table-pick"><option value="compare"${tableView==='compare'?' selected':''}>เทียบทุกอาชีพ</option>${paths.map(c=>`<option value="${c.id}"${c.id===tableView?' selected':''}>${esc(c.name)}</option>`).join('')}</select></label><small>ตัวเลขรวมค่าที่แก้ในแท็บสกิล (ยังไม่บันทึกก็เห็นผลทันที) · เขียว/แดง = สูงสุด/ต่ำสุดของแถว</small>`;
 else if(tab==='items')f.innerHTML=`<label>ค้นหา <input id="search" type="search" value="${esc(query)}" placeholder="ชื่อหรือรหัสไอเท็ม"></label><label>ประเภท <select id="kind-pick"><option value="all">ทั้งหมด</option>${Object.entries(KIND).map(([k,n])=>`<option value="${k}"${k===kind?' selected':''}>${n}</option>`).join('')}</select></label>`;
 else if(tab==='monsters')f.innerHTML=`<label>ค้นหา <input id="search" type="search" value="${esc(query)}" placeholder="ชื่อหรือรหัสมอนสเตอร์"></label>`;
 else f.innerHTML='';
 $('class-pick')&&($('class-pick').onchange=e=>{classId=e.target.value;remember();render();});
 $('table-pick')&&($('table-pick').onchange=e=>{tableView=e.target.value;render(false);});
 $('kind-pick')&&($('kind-pick').onchange=e=>{kind=e.target.value;render(false);});
 $('search')&&($('search').oninput=e=>{query=e.target.value.trim().toLowerCase();render(false);});
}
function render(withFilters=true){
 if(withFilters)filters();
 if(tab==='table'){$('view').innerHTML=skillTable();return;}
 if(tab==='players'){playersTab();return;}
 const rows=rowsFor(),cols=columns(rows);
 $('view').innerHTML=`<div class="scroll"><table><thead><tr><th class="l">ชื่อ</th>${cols.map(c=>`<th>${LABEL[c]??c}</th>`).join('')}<th></th></tr></thead><tbody>${rows.map((r,i)=>`<tr data-i="${i}"><td class="l"><b>${esc(r.title)}</b><small>${esc(r.sub)}</small></td>${cols.map(f=>{const b=base(r,f),v=value(r,f),edited=draft[r.group][r.key]?.[f]!==undefined;return `<td>${b==null&&!edited?'<span class="na">—</span>':`<input type="number" step="any" data-f="${f}" value="${v??''}" class="${edited?'edited':''}" aria-label="${esc(r.title)} ${LABEL[f]??f}" title="ค่าเดิม ${b??'—'}">`}</td>`;}).join('')}<td><button type="button" class="undo" data-undo="${i}" ${draft[r.group][r.key]?'':'hidden'} aria-label="คืนค่าเดิม ${esc(r.title)}">คืนค่า</button></td></tr>`).join('')}</tbody></table></div>`;
 $('view').querySelectorAll('tr[data-i]').forEach(tr=>{const r=rows[+tr.dataset.i];
  tr.querySelectorAll('input').forEach(inp=>inp.onchange=()=>{set(r,inp.dataset.f,inp.value);const edited=draft[r.group][r.key]?.[inp.dataset.f]!==undefined;inp.classList.toggle('edited',edited);if(!edited)inp.value=base(r,inp.dataset.f)??'';tr.querySelector('.undo').hidden=!draft[r.group][r.key];});
  tr.querySelector('.undo').onclick=()=>{delete draft[r.group][r.key];set(r,'',null);render(false);};});
 $('changes').textContent=count()?`แก้ไว้ ${count()} ช่อง`:'ยังไม่มีการแก้';
}
// 0.89 skill table (owner): the balance view from the game numbers, including unsaved edits from the skill tab.
const ROLE=['โจมตี','วงกว้าง','ตรึง','ผลัก','ฟื้นตัว','ตั้งรับ','โจมตีหนัก','พุ่ง','รวมสมาธิ','ไม้ตาย'];
const REQ=Object.fromEntries(SKILL_TREE.map(n=>[n.slot,n.req]));
const live=cid=>classSkills(cid,SKILLS).map((s,i)=>({...s,...(draft.skills[cid+':'+i]??{}),slot:i}));
const num=v=>v==null?'—':(Math.round(v*100)/100).toLocaleString('th-TH');
const reqText=(list,slot)=>(REQ[slot]??[]).map(([r,l])=>`${esc(list[r].name)} ขั้น ${l}`).join(' + ')||'มีตั้งแต่เริ่ม';
function skillTable(){
 if(tableView!=='compare'){const list=live(tableView);
  return `<div class="scroll"><table><thead><tr><th class="l">สกิล</th><th>MP</th><th>คูลดาวน์</th><th>ระยะ/รัศมี</th><th>นาน</th><th>ขั้น 1</th><th>ขั้น 4</th><th>ขั้น 7</th><th>ขั้น 10</th><th>พลัง/MP</th><th>พลัง/วิ</th><th class="l">ปลดล็อกเมื่อ</th></tr></thead><tbody>${list.map(s=>{const p=s.damage??s.heal??0,lv=[1,4,7,10].map(l=>scaledSkill(s,l));
   return `<tr><td class="l"><b>${s.key} · ${esc(s.name)}</b><small>${ROLE[s.slot]} · ${esc(s.type)}</small></td><td>${num(s.cost)}</td><td>${num(s.cd)}</td><td>${num(s.radius??s.range)}</td><td>${num(s.duration)}</td>${lv.map(x=>`<td>${s.heal?'+'+num(x.heal):num(x.damage)}<small>${num(x.cd)} วิ</small></td>`).join('')}<td>${s.cost?num(p/s.cost):'—'}</td><td>${s.cd?num(p/s.cd):'—'}</td><td class="l req">${reqText(list,s.slot)}</td></tr>`;}).join('')}</tbody></table></div>`;}
 const all=paths.map(c=>({c,list:live(c.id)}));
 return `<div class="scroll"><table><thead><tr><th class="l">ช่อง · บทบาท</th>${all.map(a=>`<th>${esc(a.c.name)}</th>`).join('')}</tr></thead><tbody><tr><td class="l"><b>ตีธรรมดา</b><small>ATK อาชีพ · หน่วง</small></td>${all.map(a=>`<td>${num(a.c.damage)}<small>${num(a.c.delay)} วิ</small></td>`).join('')}</tr>${ROLE.map((role,slot)=>{const vals=all.map(a=>a.list[slot].damage??a.list[slot].heal??null),n=vals.filter(v=>v!=null),hi=Math.max(...n),lo=Math.min(...n);
  return `<tr><td class="l"><b>${slot===9?0:slot+1} · ${role}</b><small>${reqText(all[0].list,slot)}</small></td>${all.map((a,i)=>{const s=a.list[slot],v=vals[i],k=n.length>1&&hi!==lo&&v!=null?(v===hi?'top':v===lo?'bottom':''):'';return `<td class="${k}">${s.heal?'+'+num(s.heal):num(s.damage)}<small>MP ${num(s.cost)} · ${num(s.cd)} วิ</small></td>`;}).join('')}</tr>`;}).join('')}</tbody></table></div>`;
}
const say=(t,ok=true)=>{$('status').textContent=t;$('status').className='status '+(ok?'ok':'bad');};
$('reset-all').onclick=()=>{for(const g of Object.keys(draft))draft[g]={};render(false);say('คืนค่าทั้งหมดในหน้านี้แล้ว (ยังไม่บันทึก)');};
$('copy-json').onclick=async()=>{const text=JSON.stringify(draft,null,1);try{await navigator.clipboard.writeText(text);say('คัดลอก JSON แล้ว · ส่งให้ Claude ได้เลย');}catch{say('คัดลอกไม่ได้ · เลือกข้อความจากกล่องด้านล่าง',false);$('view').insertAdjacentHTML('afterbegin',`<textarea class="dump" readonly>${esc(text)}</textarea>`);}};
// 0.100.6 save: on the live site the server commits balance-data.js to GitHub (game and server redeploy in ~3 minutes);
// locally it writes the file. The Google popup has to open straight from this click, so Firebase is connected at load.
$('save').onclick=async()=>{
 if(!LOCAL&&!fbConn?.auth.currentUser){
  if(!fbConn){say('กำลังเชื่อมต่อ Google… กดบันทึกอีกครั้งในอีกครู่',false);warmFirebase();return;}
  const provider=new fbConn.sdk.GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});
  try{await fbConn.sdk.signInWithPopup(fbConn.auth,provider);}catch(e){say('ล็อกอินไม่สำเร็จ · '+(e.code??e.message),false);return;}
 }
 say('กำลังบันทึก…');
 try{const j=await adminFetch('/admin/balance',draft);$('changes').textContent=`บันทึกแล้ว ${j.changes} ช่อง`;
  say(j.local?`บันทึกแล้ว ${j.changes} ช่อง · รีโหลดเกมเพื่อเห็นผล`:j.unchanged?'ค่าเหล่านี้อยู่ในเกมแล้ว':`ส่งเข้าเกมแล้ว ${j.changes} ช่อง · เกมและเซิร์ฟเวอร์จะอัปเดตเองในราว 3 นาที (ผู้เล่นหลุดสั้น ๆ ตอนเซิร์ฟเวอร์รีสตาร์ต)`);}
 catch(e){say(ADMIN_ERRORS[e.message]??'บันทึกไม่สำเร็จ · '+e.message,false);}
};
tabs();render();warmFirebase();

// 0.99.16 players tab: who is online right now (from the realm server) and gifts of items or cowries.
// Production asks for a Google sign-in; the server only answers emails listed in ADMIN_EMAILS on Render.
async function adminFetch(path,body){
 const headers={'Content-Type':'application/json'};
 if(!LOCAL){if(!fbConn?.auth.currentUser)throw new Error('need-login');headers.Authorization='Bearer '+await fbConn.auth.currentUser.getIdToken();}
 const r=await fetch(API+path,{method:body?'POST':'GET',headers,body:body&&JSON.stringify(body)}),j=await r.json().catch(()=>({}));
 if(!r.ok)throw new Error(j.error??String(r.status));return j;
}
const ADMIN_ERRORS={'not-admin':'อีเมลนี้ไม่อยู่ในรายชื่อ ADMIN_EMAILS บน Render','admin-unset':'เซิร์ฟเวอร์ยังไม่เห็นค่า ADMIN_EMAILS · ตั้งที่ Render แล้วกด Save, rebuild and deploy','bad-token':'ตรวจการล็อกอิน Google ไม่ผ่าน · ออกแล้วล็อกอินใหม่','origin':'เปิดหน้านี้จากเว็บเกมเท่านั้น','player-offline':'ผู้เล่นออฟไลน์ไปแล้ว','bad-item':'ไม่มีไอเท็มนี้','bad-count':'จำนวนต้อง 1–999','bad-coins':'เบี้ยต้อง 0–10,000,000','nothing':'ยังไม่ได้เลือกของหรือใส่เบี้ย','need-login':'ต้องล็อกอิน Google ก่อน','github-unset':'เซิร์ฟเวอร์ยังไม่มี GITHUB_TOKEN (ตั้งที่ Render)','github-failed':'ส่งขึ้น GitHub ไม่สำเร็จ · ตรวจสิทธิ์ของ GITHUB_TOKEN','github-conflict':'ไฟล์บน GitHub เพิ่งเปลี่ยน · กดบันทึกอีกครั้ง','invalid':'ข้อมูลไม่ถูกต้อง'};
// Firebase connects as soon as the tab opens, so the click below can open the Google popup straight away
// (a popup opened after an await is no longer a click, and the browser blocks it).
function warmFirebase(){if(LOCAL||fbWarm)return;fbWarm=import('./firebase-client.js').then(m=>m.deadline(m.connectFirebase())).then(c=>{fbConn=c;if(tab==='players')playersTab();}).catch(()=>{fbWarm=null;adminMsg='เชื่อมต่อ Google ไม่ได้ · ลองรีโหลดหน้า';if(tab==='players')playersTab();});}
// 0.100.8 players tab, easier: signs in and loads by itself, refreshes every 15 s, search by name, a gift basket
// (quick buttons or any item + count, plus cowries) sent in one go to the player picked on the left.
async function signIn(){
 if(LOCAL||fbConn?.auth.currentUser)return true;
 if(!fbConn){adminMsg='กำลังเชื่อมต่อ Google… กดอีกครั้งในอีกครู่';warmFirebase();playersTab();return false;}
 const provider=new fbConn.sdk.GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});
 try{await fbConn.sdk.signInWithPopup(fbConn.auth,provider);return true;}catch(e){adminMsg='ล็อกอินไม่สำเร็จ · '+(e.code??e.message);playersTab();return false;}
}
async function loadPlayers(quiet=false){
 if(!LOCAL&&!fbConn?.auth.currentUser)return;
 if(!quiet){adminMsg='กำลังโหลด…';playersTab();}
 try{players=(await adminFetch('/admin/players')).players;if(!quiet)adminMsg='';if(picked&&!players.some(p=>p.id===picked))picked=null;}
 catch(e){adminMsg=ADMIN_ERRORS[e.message]??'โหลดไม่สำเร็จ · '+e.message;}
 if(tab==='players')playersTab();
}
function autoRefresh(){clearInterval(refreshTimer);refreshTimer=setInterval(()=>{if(tab!=='players'||document.hidden)return;if(document.activeElement?.closest?.('#give'))return;loadPlayers(true);},15000);}
function playersTab(){
 warmFirebase();
 const user=LOCAL?'เครื่องตัวเอง (localhost)':fbConn?.auth.currentUser?.email??'';
 if(user&&!players&&!adminMsg){loadPlayers();autoRefresh();}
 const picks=Object.keys(ITEMS).filter(id=>!['ui','reserved'].includes(ITEMS[id].kind)).sort((a,b)=>itemName(a).localeCompare(itemName(b),'th'));
 const list=(players??[]).filter(x=>!search||x.name.toLowerCase().includes(search.toLowerCase())),p=players?.find(x=>x.id===picked);
 const head=`<div class="players-head"><h2>ผู้เล่นออนไลน์${players?' <small>'+players.length+' คน</small>':''}</h2>`+
  (user?`<span class="who">👤 ${esc(user)}</span>${LOCAL?'':'<button type="button" id="sign-out">ออกจากระบบ</button>'}<button type="button" id="load-players">↻ รีเฟรช</button>`:'<button type="button" id="sign-in" class="primary">ล็อกอิน Google</button>')+
  (adminMsg?`<span class="msg">${esc(adminMsg)}</span>`:'')+'</div>';
 const row=x=>`<button type="button" class="prow${x.id===picked?' on':''}" data-pick="${esc(x.id)}"><b>${esc(x.name)}${x.online?'':' <small>(หลุด)</small>'}</b><span>${esc(className(x.classId))} · Lv.${x.level}</span><span>เซิร์ฟ ${esc(x.server.replace('server-',''))} · ${esc(x.map)}</span><span class="coin">${x.coins.toLocaleString('th-TH')} เบี้ย</span></button>`;
 const plist=`<section class="plist"><input id="player-search" type="search" placeholder="ค้นหาชื่อผู้เล่น" value="${esc(search)}">${list.map(row).join('')||`<p class="hint">${players?'ไม่มีผู้เล่นออนไลน์':'กำลังโหลด…'}</p>`}</section>`;
 const bag=p?Object.entries(p.items).filter(([,n])=>n>0).map(([id,n])=>`<span>${esc(itemName(id))} ×${n}</span>`).join('')||'ว่าง':'';
 const quick=QUICK.map(([id,n],i)=>`<button type="button" data-quick="${i}">+ ${id==='coins'?n.toLocaleString('th-TH')+' เบี้ย':esc(itemName(id))+' ×'+n}</button>`).join('');
 const lines=basket.map((l,i)=>`<li>${esc(itemName(l.id))} ×${l.count}<button type="button" data-drop="${i}" aria-label="เอาออก">×</button></li>`).join('')||'<li class="empty">ยังไม่มีไอเท็มในรายการ</li>';
 const gift=!p?'<p class="hint">← เลือกผู้เล่นทางซ้ายเพื่อส่งของ</p>':
  `<form id="give"><h3>ส่งของให้ ${esc(p.name)}</h3><p class="bag"><b>กระเป๋า</b> ${bag}</p><div class="quick">${quick}</div>`+
  `<div class="add"><input id="give-item" list="give-items" placeholder="พิมพ์ชื่อไอเท็ม"><datalist id="give-items">${picks.map(id=>`<option value="${esc(itemName(id))}">`).join('')}</datalist><input id="give-count" type="number" min="1" max="999" value="1" aria-label="จำนวน"><button type="button" id="give-add">เพิ่ม</button></div>`+
  `<label class="coins">เบี้ย <input id="give-coins" type="number" min="0" max="10000000" value="${giftCoins}"></label><ul class="basket">${lines}</ul>`+
  `<button type="submit" class="primary send"${!basket.length&&!giftCoins?' disabled':''}>ส่งให้ ${esc(p.name)}</button></form>`;
 $('view').innerHTML=`<div class="players">${head}${user?`<div class="players-body">${plist}<section class="gift">${gift}</section></div>`:'<p class="hint">ล็อกอินด้วยอีเมลแอดมินเพื่อดูผู้เล่นที่ออนไลน์อยู่ และส่งไอเท็มหรือเบี้ยให้</p>'}</div>`;
 const on=(id,ev,fn)=>{const el=$(id);if(el)el[ev]=fn;};
 on('sign-in','onclick',async()=>{if(await signIn()){adminMsg='';loadPlayers();autoRefresh();}});
 on('sign-out','onclick',async()=>{await fbConn.sdk.signOut(fbConn.auth);players=null;picked=null;adminMsg='';playersTab();});
 on('load-players','onclick',()=>loadPlayers());
 on('player-search','oninput',e=>{search=e.target.value;const pos=e.target.selectionStart;playersTab();const el=$('player-search');el.focus();el.setSelectionRange(pos,pos);});
 $('view').querySelectorAll('[data-pick]').forEach(b=>b.onclick=()=>{if(picked!==b.dataset.pick){picked=b.dataset.pick;basket=[];giftCoins=0;}adminMsg='';playersTab();});
 const form=$('give');if(!form)return;
 const keepCoins=()=>{giftCoins=Math.max(0,Math.min(1e7,Math.floor(Number($('give-coins').value)||0)));};
 const addItem=(id,count)=>{const line=basket.find(l=>l.id===id);if(line)line.count=Math.min(999,line.count+count);else if(basket.length<20)basket.push({id,count});};
 form.querySelectorAll('[data-quick]').forEach(b=>b.onclick=()=>{keepCoins();const [id,n]=QUICK[+b.dataset.quick];if(id==='coins')giftCoins=Math.min(1e7,giftCoins+n);else addItem(id,n);playersTab();});
 form.querySelectorAll('[data-drop]').forEach(b=>b.onclick=()=>{keepCoins();basket.splice(+b.dataset.drop,1);playersTab();});
 on('give-add','onclick',()=>{keepCoins();const name=$('give-item').value.trim(),id=picks.find(x=>itemName(x)===name||x===name),n=Math.max(1,Math.min(999,Math.floor(Number($('give-count').value)||1)));if(!id){adminMsg='ไม่พบไอเท็มชื่อนี้';playersTab();return;}addItem(id,n);adminMsg='';playersTab();});
 on('give-coins','oninput',()=>{keepCoins();form.querySelector('.send').disabled=!basket.length&&!giftCoins;});
 form.onsubmit=async e=>{e.preventDefault();keepCoins();const send=form.querySelector('.send');send.disabled=true;send.textContent='กำลังส่ง…';
  try{const r=await adminFetch('/admin/give',{peer:p.id,coins:giftCoins,items:basket});adminMsg='✔ ส่งให้ '+r.name+' แล้ว';Object.assign(p,{coins:r.coins,items:r.items});basket=[];giftCoins=0;}
  catch(e){adminMsg=ADMIN_ERRORS[e.message]??'ส่งไม่สำเร็จ · '+e.message;}
  playersTab();};
}
