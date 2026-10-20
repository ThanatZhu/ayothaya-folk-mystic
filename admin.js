// 0.85 back-office dashboard: every tunable game number in one place (paths, skills, items, monsters).
// Edits are kept as overrides (balance.js FIELDS); "บันทึกเข้าเกม" posts them to the local dev server, which writes
// balance-data.js for the next deploy. Player data is not touched here.
import {ITEMS} from './items.js?v=94';
import {CLASSES,NOVICE,classSkills,className} from './classes.js?v=101';
import {multiplayerURL} from './multiplayer-config.js';
import {iconStyle} from './bag-ui.js?v=98';
import {SKILLS,MONSTER_TYPES} from './combat-core.js?v=101';
import {BALANCE,BASELINE,FIELDS,monsterKey} from './balance.js';
import {SKILL_TREE,scaledSkill} from './skill-progress.js?v=101';
import {deriveStats} from './character-stats.js';
import {monsterDef,monsterMdef,monsterFlee,monsterHit as monsterHitStat,defFactor,hitChance,dodgeChance,magicMonster,CRIT_MULT} from './combat-formulas.js';

const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';');
const LABEL={damage:'พลัง',heal:'ฟื้นฟู',cost:'MP',cd:'คูลดาวน์',range:'ระยะ',radius:'รัศมี',duration:'นาน',delay:'หน่วง (วิ)',atk:'ATK',matk:'MATK',def:'DEF',level:'เลเวล',buy:'ราคาซื้อ',sell:'ราคาขาย',tokens:'เหรียญงาน',hp:'HP',mp:'MP',speed:'ความเร็ว',baseXp:'Base EXP',jobXp:'Job EXP',respawn:'เกิดใหม่ (วิ)',reach:'ระยะตี'};
const KIND={potion:'ยา',gear:'อุปกรณ์',card:'การ์ด',loot:'วัตถุดิบ',scroll:'ม้วน',egg:'ไข่',lure:'เหยื่อ',petfood:'อาหารสัตว์'};
const paths=[NOVICE,...CLASSES];
let draft=JSON.parse(JSON.stringify(BALANCE));for(const g of Object.keys(FIELDS))draft[g]??={};
let tab='players',classId='swordsman',query='',kind='all',tableView='compare';
// players tab state (declared up here: the first render may already be on that tab)
const LOCAL=['127.0.0.1','localhost'].includes(location.hostname),API=LOCAL?'':multiplayerURL().replace(/^ws/,'http').replace(/\/realtime$/,'');
let players=null,picked=null,adminMsg='',fbConn=null,fbWarm=null;
let fx={classId:'swordsman',level:50,str:40,agi:20,vit:20,int:1,dex:20,luk:10,watk:60,wmatk:0,skillLv:5};
try{Object.assign(fx,JSON.parse(localStorage.getItem('ayo-admin-formula'))??{});}catch{}
let search='',basket=[],giftCoins=0,refreshTimer=0,itemKind='all',itemQuery='',pickCount=1;
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
 showCount();
}
// 0.101.2 side menu: what each page is for, in one line
const PAGES={formula:['📐','สูตรดาเมจ','ลองค่าตัวละคร ดูดาเมจ ตีโดน และหลบได้ต่อมอนทุกตัว'],players:['👥','ผู้เล่น','ดูผู้เล่นที่ออนไลน์ ส่งไอเท็มหรือเบี้ยให้'],classes:['⚔️','อาชีพ','ค่าพื้นฐานของแต่ละอาชีพ: พลังโจมตี ความเร็ว ระยะ'],skills:['✨','สกิล','ปรับพลัง MP คูลดาวน์ของสกิลทีละอาชีพ'],table:['📊','ตารางสกิล','เทียบความแรงสกิลทุกอาชีพ (ดูอย่างเดียว)'],items:['🎒','ไอเท็ม','ราคา ค่าพลัง ฟื้น HP/MP ของไอเท็ม'],monsters:['👹','มอนสเตอร์','HP พลัง EXP และเวลาเกิดใหม่ของมอน']};
function tabs(){
 $('tabs').innerHTML=Object.entries(PAGES).map(([id,[icon,name,help]])=>`<button type="button" id="tab-${id}" aria-pressed="${id===tab}" data-tab="${id}"><i>${icon}</i><span><b>${name}</b><small>${help}</small></span></button>`).join('');
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
function pageHead(){
 const [icon,name,help]=PAGES[tab],editable=!['players','table','formula'].includes(tab);
 $('page-title').textContent=icon+' '+name;$('page-help').textContent=help+(editable?' · แก้ตัวเลขในช่อง (สีทอง = แก้แล้ว) แล้วกด บันทึกเข้าเกม':'');
 $('save-actions').hidden=!editable;showCount();
}
function showCount(){const n=count();$('changes').textContent=n?`แก้ไว้ ${n} ช่อง · ยังไม่บันทึก`:'ยังไม่มีการแก้';$('changes').classList.toggle('dirty',!!n);$('save').disabled=!n;$('reset-all').disabled=!n;}
function render(withFilters=true){
 if(withFilters)filters();pageHead();
 if(tab==='table'){$('view').innerHTML=skillTable();return;}
 if(tab==='players'){playersTab();return;}
 if(tab==='formula'){formulaTab();return;}
 const rows=rowsFor(),cols=columns(rows);
 $('view').innerHTML=`<div class="scroll"><table><thead><tr><th class="l">ชื่อ</th>${cols.map(c=>`<th>${LABEL[c]??c}</th>`).join('')}<th></th></tr></thead><tbody>${rows.map((r,i)=>`<tr data-i="${i}"><td class="l"><span class="name">${r.group==='items'?`<i class="ico sm" data-item="${esc(r.key)}" style="${iconStyle(r.key)}"></i>`:r.group==='classes'?`<i class="face sm" style="background-image:url(assets/character-life100/player/${esc(r.key)}-male.png)"></i>`:''}<span><b>${esc(r.title)}</b><small>${esc(r.sub)}</small></span></span></td>${cols.map(f=>{const b=base(r,f),v=value(r,f),edited=draft[r.group][r.key]?.[f]!==undefined;return `<td>${b==null&&!edited?'<span class="na">—</span>':`<input type="number" step="any" data-f="${f}" value="${v??''}" class="${edited?'edited':''}" aria-label="${esc(r.title)} ${LABEL[f]??f}" title="ค่าเดิม ${b??'—'}">`}</td>`;}).join('')}<td><button type="button" class="undo" data-undo="${i}" ${draft[r.group][r.key]?'':'hidden'} aria-label="คืนค่าเดิม ${esc(r.title)}">คืนค่า</button></td></tr>`).join('')}</tbody></table></div>`;
 $('view').querySelectorAll('tr[data-i]').forEach(tr=>{const r=rows[+tr.dataset.i];
  tr.querySelectorAll('input').forEach(inp=>inp.onchange=()=>{set(r,inp.dataset.f,inp.value);const edited=draft[r.group][r.key]?.[inp.dataset.f]!==undefined;inp.classList.toggle('edited',edited);if(!edited)inp.value=base(r,inp.dataset.f)??'';tr.querySelector('.undo').hidden=!draft[r.group][r.key];});
  tr.querySelector('.undo').onclick=()=>{delete draft[r.group][r.key];set(r,'',null);render(false);};});
 showCount();
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
// 0.101.2 point at an item picture: name, kind, what it does, its numbers and price
const STAT={atk:'ATK',matk:'MATK',def:'DEF',hp:'ฟื้น HP',mp:'ฟื้น MP',level:'ใช้ได้ตั้งแต่ Lv.',buy:'ราคาซื้อ',sell:'ขายได้',tokens:'เหรียญงานวัด',time:'นาน (วิ)'};
const SLOT={weapon:'อาวุธ',armor:'เสื้อเกราะ',head:'หมวก',garment:'ผ้าคลุม',shoes:'รองเท้า',accessory:'เครื่องประดับ'};
function tipHTML(id){
 const it=ITEMS[id];if(!it)return '';
 const stats=Object.entries(STAT).filter(([k])=>typeof it[k]==='number').map(([k,n])=>`<li><span>${n}</span><b>${it[k].toLocaleString('th-TH')}</b></li>`).join('');
 const bonus=Object.entries(it.bonus??it.effect?.bonus??{}).map(([k,v])=>`<li><span>${esc(k.toUpperCase())}</span><b>+${v}</b></li>`).join('');
 const sub=[KIND[it.kind]??it.kind,it.slot&&(SLOT[it.slot]??it.slot),it.classes?.map(c=>className(c)).join(', ')].filter(Boolean).map(esc).join(' · ');
 return `<div class="tip-head"><i class="ico" style="${iconStyle(id)}"></i><div><b>${esc(it.name)}</b><small>${sub}</small></div></div>${it.text?`<p>${esc(it.text)}</p>`:''}${stats||bonus?`<ul>${stats}${bonus}</ul>`:''}<small class="tip-id">${esc(id)}</small>`;
}
const tip=$('tip');let tipFor=null;
function placeTip(x,y){const w=tip.offsetWidth,h=tip.offsetHeight;tip.style.left=Math.max(8,Math.min(innerWidth-w-8,x+14))+'px';tip.style.top=(y+14+h>innerHeight?Math.max(8,y-h-10):y+14)+'px';}
document.addEventListener('pointerover',e=>{const el=e.target.closest?.('[data-item]');if(!el){tip.hidden=true;tipFor=null;return;}if(el.dataset.item!==tipFor){tipFor=el.dataset.item;tip.innerHTML=tipHTML(tipFor);}tip.hidden=false;placeTip(e.clientX,e.clientY);});
document.addEventListener('pointermove',e=>{if(!tip.hidden)placeTip(e.clientX,e.clientY);});
document.addEventListener('scroll',()=>{tip.hidden=true;tipFor=null;},true);
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
 // 0.100.9 pictures: the character's first standing frame, item icons from the game's atlases, an item grid to click
 const face=x=>`<i class="face" style="background-image:url(assets/character-life100/player/${esc(x.classId)}-${x.gender==='female'?'female':'male'}.png)"></i>`;
 const pic=(id,n)=>`<i class="ico" data-item="${esc(id)}" style="${iconStyle(id)}"></i>${n?`<em>${n}</em>`:''}`;
 const KINDS=[['all','ทั้งหมด'],['potion','ยา/อาหาร'],['gear','อุปกรณ์'],['card','การ์ด'],['loot','วัตถุดิบ'],['other','อื่น ๆ']];
 const kindOf=id=>['potion','gear','card','loot'].includes(ITEMS[id].kind)?ITEMS[id].kind:'other';
 const picks=Object.keys(ITEMS).filter(id=>!['ui','reserved'].includes(ITEMS[id].kind)&&(itemKind==='all'||kindOf(id)===itemKind)&&(!itemQuery||itemName(id).includes(itemQuery))).sort((a,b)=>itemName(a).localeCompare(itemName(b),'th'));
 const list=(players??[]).filter(x=>!search||x.name.toLowerCase().includes(search.toLowerCase())),p=players?.find(x=>x.id===picked);
 const head=`<div class="players-head"><h2>ผู้เล่นออนไลน์${players?' <small>'+players.length+' คน</small>':''}</h2>`+
  (user?`<span class="who">👤 ${esc(user)}</span>${LOCAL?'':'<button type="button" id="sign-out">ออกจากระบบ</button>'}<button type="button" id="load-players">↻ รีเฟรช</button>`:'<button type="button" id="sign-in" class="primary">ล็อกอิน Google</button>')+
  (adminMsg?`<span class="msg">${esc(adminMsg)}</span>`:'')+'</div>';
 const row=x=>`<button type="button" class="prow${x.id===picked?' on':''}" data-pick="${esc(x.id)}">${face(x)}<span class="pinfo"><b>${esc(x.name)}${x.online?'':' <small>(หลุด)</small>'}</b><span>${esc(className(x.classId))} · Lv.${x.level}</span><span>เซิร์ฟ ${esc(x.server.replace('server-',''))} · ${esc(x.map)}</span></span><span class="coin">${x.coins.toLocaleString('th-TH')}<small>เบี้ย</small></span></button>`;
 const plist=`<section class="plist"><input id="player-search" type="search" placeholder="🔍 ค้นหาชื่อผู้เล่น" value="${esc(search)}">${list.map(row).join('')||`<p class="hint">${players?'ไม่มีผู้เล่นออนไลน์':'กำลังโหลด…'}</p>`}</section>`;
 let gift='<p class="hint big">← เลือกผู้เล่นทางซ้ายเพื่อดูกระเป๋าและส่งของ</p>';
 if(p){
  const bag=Object.entries(p.items).filter(([id,n])=>n>0&&ITEMS[id]).map(([id,n])=>`<span class="cell" title="${esc(itemName(id))} ×${n}">${pic(id,n)}</span>`).join('')||'<span class="hint">ว่าง</span>';
  const quick=QUICK.map(([id,n],i)=>`<button type="button" class="qbtn" data-quick="${i}">${id==='coins'?`<i class="ico" style="${iconStyle('cowrie')}"></i>`:`<i class="ico" data-item="${esc(id)}" style="${iconStyle(id)}"></i>`}<span>+${id==='coins'?n.toLocaleString('th-TH')+' เบี้ย':esc(itemName(id))+' ×'+n}</span></button>`).join('');
  const lines=basket.map((l,i)=>`<li>${pic(l.id)}<span>${esc(itemName(l.id))}</span><b>×${l.count}</b><button type="button" data-drop="${i}" aria-label="เอาออก">×</button></li>`).join('')+(giftCoins?`<li><i class="ico" style="${iconStyle('cowrie')}"></i><span>เบี้ย</span><b>${giftCoins.toLocaleString('th-TH')}</b><button type="button" data-drop="coins" aria-label="เอาออก">×</button></li>`:'');
  gift=`<form id="give"><div class="ghead">${face(p)}<div><h3>${esc(p.name)}</h3><small>${esc(className(p.classId))} · Lv.${p.level} · ${p.coins.toLocaleString('th-TH')} เบี้ย</small></div></div>`+
   `<h4>กระเป๋า</h4><div class="grid bag">${bag}</div>`+
   `<h4>ส่งด่วน</h4><div class="quick">${quick}</div>`+
   `<h4>เลือกไอเท็ม <small>แตะรูปเพื่อใส่ในรายการ · จำนวนต่อครั้ง</small> <input id="give-count" type="number" min="1" max="999" value="${pickCount}" aria-label="จำนวนต่อครั้ง"></h4>`+
   `<div class="kinds">${KINDS.map(([k,n])=>`<button type="button" data-kind="${k}" class="${k===itemKind?'on':''}">${n}</button>`).join('')}<input id="item-search" type="search" placeholder="🔍 ชื่อไอเท็ม" value="${esc(itemQuery)}"></div>`+
   `<div class="grid pick">${picks.map(id=>`<button type="button" class="cell" data-add="${esc(id)}" title="${esc(itemName(id))}">${pic(id)}<small>${esc(itemName(id))}</small></button>`).join('')||'<span class="hint">ไม่พบไอเท็ม</span>'}</div>`+
   `<div class="sendbar"><h4>รายการที่จะส่ง</h4><ul class="basket">${lines||'<li class="empty">ยังว่าง · แตะรูปไอเท็มหรือปุ่มส่งด่วน</li>'}</ul>`+
   `<label class="coins">+ เบี้ย <input id="give-coins" type="number" min="0" max="10000000" value="${giftCoins}"></label>`+
   `<button type="submit" class="primary send"${!basket.length&&!giftCoins?' disabled':''}>🎁 ส่งให้ ${esc(p.name)}</button></div></form>`;
 }
 $('view').innerHTML=`<div class="players">${head}${user?`<div class="players-body">${plist}<section class="gift">${gift}</section></div>`:'<p class="hint big">ล็อกอินด้วยอีเมลแอดมินเพื่อดูผู้เล่นที่ออนไลน์อยู่ และส่งไอเท็มหรือเบี้ยให้</p>'}</div>`;
 const on=(id,ev,fn)=>{const el=$(id);if(el)el[ev]=fn;};
 const refocus=(id,fn)=>on(id,'oninput',e=>{fn(e.target.value);const pos=e.target.selectionStart;playersTab();const el=$(id);el.focus();el.setSelectionRange(pos,pos);});
 on('sign-in','onclick',async()=>{if(await signIn()){adminMsg='';loadPlayers();autoRefresh();}});
 on('sign-out','onclick',async()=>{await fbConn.sdk.signOut(fbConn.auth);players=null;picked=null;adminMsg='';playersTab();});
 on('load-players','onclick',()=>loadPlayers());
 refocus('player-search',v=>{search=v;});
 $('view').querySelectorAll('[data-pick]').forEach(b=>b.onclick=()=>{if(picked!==b.dataset.pick){picked=b.dataset.pick;basket=[];giftCoins=0;}adminMsg='';playersTab();});
 const form=$('give');if(!form)return;
 const keep=()=>{giftCoins=Math.max(0,Math.min(1e7,Math.floor(Number($('give-coins').value)||0)));pickCount=Math.max(1,Math.min(999,Math.floor(Number($('give-count').value)||1)));};
 const addItem=(id,count)=>{const line=basket.find(l=>l.id===id);if(line)line.count=Math.min(999,line.count+count);else if(basket.length<20)basket.push({id,count});};
 form.querySelectorAll('[data-quick]').forEach(b=>b.onclick=()=>{keep();const [id,n]=QUICK[+b.dataset.quick];if(id==='coins')giftCoins=Math.min(1e7,giftCoins+n);else addItem(id,n);playersTab();});
 form.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>{keep();addItem(b.dataset.add,pickCount);playersTab();});
 form.querySelectorAll('[data-kind]').forEach(b=>b.onclick=()=>{keep();itemKind=b.dataset.kind;playersTab();});
 form.querySelectorAll('[data-drop]').forEach(b=>b.onclick=()=>{keep();if(b.dataset.drop==='coins')giftCoins=0;else basket.splice(+b.dataset.drop,1);playersTab();});
 refocus('item-search',v=>{keep();itemQuery=v.trim();});
 on('give-coins','onchange',()=>{keep();playersTab();});on('give-count','onchange',keep);
 form.onsubmit=async e=>{e.preventDefault();keep();const send=form.querySelector('.send');send.disabled=true;send.textContent='กำลังส่ง…';
  try{const r=await adminFetch('/admin/give',{peer:p.id,coins:giftCoins,items:basket});adminMsg='✔ ส่งให้ '+r.name+' แล้ว';Object.assign(p,{coins:r.coins,items:r.items});basket=[];giftCoins=0;}
  catch(e){adminMsg=ADMIN_ERRORS[e.message]??'ส่งไม่สำเร็จ · '+e.message;}
  playersTab();};
}

// 0.103 damage formula page: try a character build and read what it does against every monster (same rules as the game)
function formulaTab(){
 const keep=()=>{try{localStorage.setItem('ayo-admin-formula',JSON.stringify(fx));}catch{}};
 const d=deriveStats({level:fx.level,classId:fx.classId,stats:{str:fx.str,agi:fx.agi,vit:fx.vit,int:fx.int,dex:fx.dex,luk:fx.luk}});
 const atk=d.atk+fx.watk,matk=d.matk+fx.wmatk,power=d.magic?matk:atk,cls=paths.find(c=>c.id===fx.classId)??paths[0];
 const basic=(cls.damage??0)+(d.magic?matk:atk),skills=classSkills(fx.classId,SKILLS).map(s=>scaledSkill(s,fx.skillLv)).filter(s=>s&&(s.damage??0)>0);
 const pct=n=>Math.round(n*100)+'%',num=n=>Math.round(n).toLocaleString('th-TH');
 const field=(k,label,min,max)=>`<label>${label}<input type="number" data-fx="${k}" min="${min}" max="${max}" value="${fx[k]}"></label>`;
 const rows=MONSTER_TYPES.map((t,i)=>{
  const guard=defFactor(d.magic?monsterMdef(t):monsterDef(t)),hit=d.magic?1:hitChance(d.hit,monsterFlee(t));
  const hitDmg=basic*guard,critDmg=basic*CRIT_MULT,avg=hit*((1-d.crit)*hitDmg+d.crit*critDmg);
  const blowGuard=magicMonster(t)?d.mdef:d.def,taken=(t.damage??0)*100/(100+blowGuard*4),dodge=dodgeChance(d.fleeStat,monsterHitStat(t),fx.luk);
  return `<tr><td class="l"><b>${esc(t.name)}</b><small>Lv.${t.level??'?'} · HP ${num(t.hp)}${magicMonster(t)?' · ตีเวท':''}</small></td><td>${monsterDef(t)} / ${monsterMdef(t)}</td><td>${monsterFlee(t)} / ${monsterHitStat(t)}</td><td>${pct(hit)}</td><td>${num(hitDmg)}<small>คริ ${num(critDmg)}</small></td><td>${avg>0?num(Math.ceil(t.hp/avg)):'—'}</td><td>${num(taken)}</td><td>${pct(dodge)}</td></tr>`;}).join('');
 const sk=skills.map(s=>{const p=1+power/40;return `<tr><td class="l"><b>${esc(s.key??'')} · ${esc(s.name)}</b><small>${esc(s.type)}</small></td><td>${num(s.damage)}</td><td>${pct(s.damage/40)}</td><td>${num(s.damage*p)}</td><td>${num(s.damage*p*defFactor(30))}</td></tr>`;}).join('');
 $('view').innerHTML=`<div class="formula">
  <section class="fx-in"><h3>ลองตัวละคร</h3><label>อาชีพ<select data-fx="classId">${paths.map(c=>`<option value="${c.id}"${c.id===fx.classId?' selected':''}>${esc(c.name)}</option>`).join('')}</select></label>
   ${field('level','Base Lv.',1,99)}${field('str','STR',1,99)}${field('agi','AGI',1,99)}${field('vit','VIT',1,99)}${field('int','INT',1,99)}${field('dex','DEX',1,99)}${field('luk','LUK',1,99)}${field('watk','ATK อาวุธ',0,999)}${field('wmatk','MATK อาวุธ',0,999)}${field('skillLv','ขั้นสกิล',1,10)}</section>
  <section class="fx-out"><h3>ค่าที่ได้ ${d.magic?'(สายเวท · ใช้ MATK)':'(สายกายภาพ · ใช้ ATK)'}</h3><dl>
   ${[['ATK',atk],['MATK',matk],['HIT',d.hit],['FLEE',d.fleeStat],['DEF',d.def],['MDEF',d.mdef],['คริ',pct(d.crit)],['HP',d.maxHp],['MP',d.maxMp],['ตีธรรมดา',basic]].map(([k,v])=>`<div><dt>${k}</dt><dd>${typeof v==='number'?num(v):v}</dd></div>`).join('')}</dl></section>
  <details class="fx-rules"><summary>สูตรที่ใช้ (ตัวเกมใช้สูตรเดียวกันนี้)</summary><ul>
   <li><b>ATK</b> = STR + (STR÷10)² + DEX÷5 + LUK÷3 + ATK อาวุธ (สายธนูสลับ STR ↔ DEX) · <b>MATK</b> = (INT−1)×1.5 + (INT÷7)² + MATK อาวุธ</li>
   <li><b>ตีธรรมดา</b> = ดาเมจพื้นฐานอาชีพ + ATK (สายเวทใช้ MATK) · <b>สกิล</b> = ค่าสกิล × (1 + พลัง÷40) คือได้ค่าสกิล + พลัง × (ค่าสกิล÷40)</li>
   <li><b>เกราะมอน</b>: ดาเมจ × 100 ÷ (100 + DEF) · สายเวทชน MDEF แทน · <b>คริ</b> (โอกาสจาก LUK) ×1.5 และทะลุ DEF · มอน DEF = Lv×0.5, MDEF = Lv×0.4</li>
   <li><b>โอกาสตีโดน</b> = 90% + HIT − FLEE มอน (30–100%) · HIT = Lv + DEX + LUK÷3 · FLEE มอน = Lv×0.6 · เวทโดนเสมอ</li>
   <li><b>หลบ</b> = FLEE − HIT มอน + 20% (5–70%) + LUK×0.1% · FLEE = Lv + AGI + LUK÷5 · HIT มอน = Lv×1.5 + 20</li>
   <li><b>โดนมอนตี</b> = ดาเมจมอน × 100 ÷ (100 + DEF×4) · โคม/ผีตีเวทชน MDEF (INT÷2 + ของ)</li></ul></details>
  <h3>สกิล (ขั้น ${fx.skillLv}) เทียบมอน DEF 30</h3><div class="scroll"><table><thead><tr><th class="l">สกิล</th><th>ค่าสกิล</th><th>% ของพลัง</th><th>ดาเมจเต็ม</th><th>ผ่าน DEF 30</th></tr></thead><tbody>${sk||'<tr><td class="l" colspan="5">อาชีพนี้ไม่มีสกิลโจมตี</td></tr>'}</tbody></table></div>
  <h3>เทียบกับมอนทุกตัว (ตีธรรมดา)</h3><div class="scroll"><table><thead><tr><th class="l">มอน</th><th>DEF / MDEF</th><th>FLEE / HIT</th><th>ตีโดน</th><th>ดาเมจต่อครั้ง</th><th>ตีกี่ครั้งตาย</th><th>โดนตีครั้งละ</th><th>หลบได้</th></tr></thead><tbody>${rows}</tbody></table></div>
 </div>`;
 $('view').querySelectorAll('[data-fx]').forEach(el=>el.onchange=()=>{const k=el.dataset.fx;fx[k]=k==='classId'?el.value:Math.max(+el.min||0,Math.min(+el.max||999,Math.floor(Number(el.value)||0)));keep();formulaTab();});
}
