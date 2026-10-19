// 0.85 back-office dashboard: every tunable game number in one place (paths, skills, items, monsters).
// Edits are kept as overrides (balance.js FIELDS); "บันทึกเข้าเกม" posts them to the local dev server, which writes
// balance-data.js for the next deploy. Player data is not touched here.
import {ITEMS} from './items.js?v=70';
import {CLASSES,NOVICE,classSkills} from './classes.js?v=73';
import {SKILLS,MONSTER_TYPES} from './combat-core.js?v=72.1';
import {BALANCE,BASELINE,FIELDS,monsterKey} from './balance.js';

const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';');
const LABEL={damage:'พลัง',heal:'ฟื้นฟู',cost:'MP',cd:'คูลดาวน์',range:'ระยะ',radius:'รัศมี',duration:'นาน',delay:'หน่วง (วิ)',atk:'ATK',matk:'MATK',def:'DEF',level:'เลเวล',buy:'ราคาซื้อ',sell:'ราคาขาย',tokens:'เหรียญงาน',hp:'HP',mp:'MP',speed:'ความเร็ว',baseXp:'Base EXP',jobXp:'Job EXP',respawn:'เกิดใหม่ (วิ)',reach:'ระยะตี'};
const KIND={potion:'ยา',gear:'อุปกรณ์',card:'การ์ด',loot:'วัตถุดิบ',scroll:'ม้วน',egg:'ไข่',lure:'เหยื่อ',petfood:'อาหารสัตว์'};
const paths=[NOVICE,...CLASSES];
let draft=JSON.parse(JSON.stringify(BALANCE));for(const g of Object.keys(FIELDS))draft[g]??={};
let tab='skills',classId='swordsman',query='',kind='all';
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
 $('tabs').innerHTML=[['classes','อาชีพ'],['skills','สกิล'],['items','ไอเท็ม'],['monsters','มอนสเตอร์'],['players','ผู้เล่น']].map(([id,n])=>`<button type="button" id="tab-${id}" aria-pressed="${id===tab}" data-tab="${id}">${n}</button>`).join('');
 $('tabs').querySelectorAll('button').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;query='';remember();tabs();render();});
}
const remember=()=>{try{localStorage.setItem('ayo-admin-view',JSON.stringify({tab,classId}));}catch{}};
function filters(){
 const f=$('filters');
 if(tab==='skills')f.innerHTML=`<label>อาชีพ <select id="class-pick">${paths.map(c=>`<option value="${c.id}"${c.id===classId?' selected':''}>${esc(c.name)}</option>`).join('')}</select></label><small>ค่านี้คือค่าขั้น 1 ก่อนบวกโบนัส Master · ขั้นสูงขึ้นคำนวณจากค่านี้</small>`;
 else if(tab==='items')f.innerHTML=`<label>ค้นหา <input id="search" type="search" value="${esc(query)}" placeholder="ชื่อหรือรหัสไอเท็ม"></label><label>ประเภท <select id="kind-pick"><option value="all">ทั้งหมด</option>${Object.entries(KIND).map(([k,n])=>`<option value="${k}"${k===kind?' selected':''}>${n}</option>`).join('')}</select></label>`;
 else if(tab==='monsters')f.innerHTML=`<label>ค้นหา <input id="search" type="search" value="${esc(query)}" placeholder="ชื่อหรือรหัสมอนสเตอร์"></label>`;
 else f.innerHTML='';
 $('class-pick')&&($('class-pick').onchange=e=>{classId=e.target.value;remember();render();});
 $('kind-pick')&&($('kind-pick').onchange=e=>{kind=e.target.value;render(false);});
 $('search')&&($('search').oninput=e=>{query=e.target.value.trim().toLowerCase();render(false);});
}
function render(withFilters=true){
 if(withFilters)filters();
 if(tab==='players'){$('view').innerHTML='<div class="empty"><h2>ข้อมูลผู้เล่น</h2><p>ดูและแก้เลเวล เงิน และกระเป๋าของผู้เล่น ต้องเปิดสิทธิ์แอดมินบนเซิร์ฟเวอร์จริงและแก้กฎ Firestore จึงจะทำเป็นขั้นถัดไปหลังเจ้าของอนุญาต</p></div>';return;}
 const rows=rowsFor(),cols=columns(rows);
 $('view').innerHTML=`<div class="scroll"><table><thead><tr><th class="l">ชื่อ</th>${cols.map(c=>`<th>${LABEL[c]??c}</th>`).join('')}<th></th></tr></thead><tbody>${rows.map((r,i)=>`<tr data-i="${i}"><td class="l"><b>${esc(r.title)}</b><small>${esc(r.sub)}</small></td>${cols.map(f=>{const b=base(r,f),v=value(r,f),edited=draft[r.group][r.key]?.[f]!==undefined;return `<td>${b==null&&!edited?'<span class="na">—</span>':`<input type="number" step="any" data-f="${f}" value="${v??''}" class="${edited?'edited':''}" aria-label="${esc(r.title)} ${LABEL[f]??f}" title="ค่าเดิม ${b??'—'}">`}</td>`;}).join('')}<td><button type="button" class="undo" data-undo="${i}" ${draft[r.group][r.key]?'':'hidden'} aria-label="คืนค่าเดิม ${esc(r.title)}">คืนค่า</button></td></tr>`).join('')}</tbody></table></div>`;
 $('view').querySelectorAll('tr[data-i]').forEach(tr=>{const r=rows[+tr.dataset.i];
  tr.querySelectorAll('input').forEach(inp=>inp.onchange=()=>{set(r,inp.dataset.f,inp.value);const edited=draft[r.group][r.key]?.[inp.dataset.f]!==undefined;inp.classList.toggle('edited',edited);if(!edited)inp.value=base(r,inp.dataset.f)??'';tr.querySelector('.undo').hidden=!draft[r.group][r.key];});
  tr.querySelector('.undo').onclick=()=>{delete draft[r.group][r.key];set(r,'',null);render(false);};});
 $('changes').textContent=count()?`แก้ไว้ ${count()} ช่อง`:'ยังไม่มีการแก้';
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
