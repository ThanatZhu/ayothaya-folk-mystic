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
let players=null,picked=null,adminMsg='';
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
$('save').onclick=async()=>{
 say('กำลังบันทึก…');
 try{const r=await fetch('/dev/balance',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(draft)});if(!r.ok)throw new Error(r.status);const j=await r.json();$('changes').textContent=`บันทึกแล้ว ${j.changes} ช่อง`;say(`บันทึกแล้ว ${j.changes} ช่อง · รีโหลดเกมเพื่อเห็นผล · สั่ง Claude "ขึ้นเว็บ" เพื่อให้ผู้เล่นทุกคนได้ค่าใหม่`);}
 catch{say('บันทึกได้เฉพาะตอนเปิดจากเครื่องตัวเอง (localhost:8787) · ตอนนี้กด "คัดลอก JSON" แล้วส่งให้ Claude แทนได้',false);}
};
tabs();render();

// 0.99.16 players tab: who is online right now (from the realm server) and gifts of items or cowries.
// Production asks for a Google sign-in; the server only answers emails listed in ADMIN_EMAILS on Render.
async function adminFetch(path,body){
 const headers={'Content-Type':'application/json'};
 if(!LOCAL){const {connectFirebase}=await import('./firebase-client.js');const c=await connectFirebase();if(!c.auth.currentUser)await c.sdk.signInWithPopup(c.auth,new c.sdk.GoogleAuthProvider());headers.Authorization='Bearer '+await c.auth.currentUser.getIdToken();}
 const r=await fetch(API+path,{method:body?'POST':'GET',headers,body:body&&JSON.stringify(body)}),j=await r.json().catch(()=>({}));
 if(!r.ok)throw new Error(j.error??String(r.status));return j;
}
const ADMIN_ERRORS={'not-admin':'อีเมลนี้ไม่ใช่แอดมิน (ตั้ง ADMIN_EMAILS บน Render)','origin':'เปิดหน้านี้จากเว็บเกมเท่านั้น','player-offline':'ผู้เล่นออฟไลน์ไปแล้ว','bad-item':'ไม่มีไอเท็มนี้','bad-count':'จำนวนต้อง 1–999','bad-coins':'เบี้ยต้อง 0–10,000,000','nothing':'ยังไม่ได้เลือกของหรือใส่เบี้ย'};
async function loadPlayers(){adminMsg='กำลังโหลด…';playersTab();try{players=(await adminFetch('/admin/players')).players;adminMsg='';if(picked&&!players.some(p=>p.id===picked))picked=null;}catch(e){adminMsg=ADMIN_ERRORS[e.message]??'โหลดไม่สำเร็จ · '+e.message;}playersTab();}
function playersTab(){
 const item=id=>ITEMS[id]?.name??id,picks=Object.keys(ITEMS).filter(id=>!['ui','reserved'].includes(ITEMS[id].kind)).sort((a,b)=>item(a).localeCompare(item(b),'th'));
 const p=players?.find(x=>x.id===picked);
 $('view').innerHTML=`<div class="players">
  <div class="players-head"><h2>ผู้เล่นออนไลน์${players?' · '+players.length+' คน':''}</h2><button type="button" id="load-players" class="primary">${players?'รีเฟรช':'โหลดรายชื่อผู้เล่น'}</button><span class="msg">${esc(adminMsg)}</span></div>
  ${players?`<div class="scroll"><table><thead><tr><th class="l">ชื่อ</th><th>อาชีพ</th><th>Lv.</th><th>เซิร์ฟ</th><th class="l">แผนที่</th><th>เบี้ย</th><th></th></tr></thead><tbody>${players.map(x=>`<tr class="${x.id===picked?'picked':''}"><td class="l"><b>${esc(x.name)}</b>${x.online?'':'<small>หลุดการเชื่อมต่อ</small>'}</td><td>${esc(className(x.classId))}</td><td>${x.level}</td><td>${esc(x.server.replace('server-',''))}</td><td class="l">${esc(x.map)}</td><td>${x.coins.toLocaleString('th-TH')}</td><td><button type="button" data-pick="${esc(x.id)}">ส่งของ</button></td></tr>`).join('')||'<tr><td class="l" colspan="7">ยังไม่มีผู้เล่นออนไลน์</td></tr>'}</tbody></table></div>`:'<p>ดูผู้เล่นที่ออนไลน์อยู่ตอนนี้ และส่งไอเท็มหรือเบี้ยให้ · ต้องล็อกอิน Google ด้วยอีเมลแอดมิน</p>'}
  ${p?`<form id="give" class="give"><h3>ส่งของให้ ${esc(p.name)}</h3>
   <p class="bag">กระเป๋า: ${Object.entries(p.items).filter(([,n])=>n>0).map(([id,n])=>esc(item(id))+' ×'+n).join(' · ')||'ว่าง'}</p>
   <label>ไอเท็ม <select id="give-item"><option value="">— ไม่ส่งไอเท็ม —</option>${picks.map(id=>`<option value="${esc(id)}">${esc(item(id))}</option>`).join('')}</select></label>
   <label>จำนวน <input id="give-count" type="number" min="1" max="999" value="1"></label>
   <label>เบี้ย <input id="give-coins" type="number" min="0" max="10000000" value="0"></label>
   <button type="submit" class="primary">ส่งให้ผู้เล่น</button></form>`:''}
 </div>`;
 $('load-players').onclick=loadPlayers;
 $('view').querySelectorAll('[data-pick]').forEach(b=>b.onclick=()=>{picked=b.dataset.pick;adminMsg='';playersTab();});
 const form=$('give');if(form)form.onsubmit=async e=>{e.preventDefault();const id=$('give-item').value,count=Number($('give-count').value),coins=Number($('give-coins').value)||0;
  form.querySelector('button').disabled=true;
  try{const r=await adminFetch('/admin/give',{peer:p.id,coins,items:id?[{id,count}]:[]});adminMsg='ส่งให้ '+r.name+' แล้ว';Object.assign(p,{coins:r.coins,items:r.items});}
  catch(e){adminMsg=ADMIN_ERRORS[e.message]??'ส่งไม่สำเร็จ · '+e.message;}
  playersTab();};
}
