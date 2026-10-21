// 0.85 back-office dashboard: every tunable game number in one place (paths, skills, items, monsters).
// Edits are kept as overrides (balance.js FIELDS); "บันทึกเข้าเกม" posts them to the local dev server, which writes
// balance-data.js for the next deploy. Player data is not touched here.
import {ITEMS,DROPS} from './items.js?v=107';
import {CLASSES,NOVICE,classSkills,className} from './classes.js?v=101';
import {multiplayerURL} from './multiplayer-config.js';
import {iconStyle} from './bag-ui.js?v=107';
import {SKILLS,MONSTER_TYPES} from './combat-core.js?v=110.8';
import {BALANCE,BASELINE,FIELDS,monsterKey} from './balance.js';
import {SKILL_TREE,scaledSkill} from './skill-progress.js?v=101';
import {WEATHERS} from './weather.js?v=97';
import {deriveStats} from './character-stats.js';
import {monsterDef,monsterMdef,monsterFlee,monsterHit as monsterHitStat,defFactor,hitChance,dodgeChance,magicMonster,CRIT_MULT} from './combat-formulas.js';

const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';');
const LABEL={damage:'พลัง',heal:'ฟื้นฟู',cost:'MP',cd:'คูลดาวน์',range:'ระยะ',radius:'รัศมี',duration:'นาน',delay:'หน่วง (วิ)',atk:'ATK',matk:'MATK',def:'DEF',level:'เลเวล',buy:'ราคาซื้อ',sell:'ราคาขาย',tokens:'เหรียญงาน',hp:'HP',mp:'MP',speed:'ความเร็ว',baseXp:'Base EXP',jobXp:'Job EXP',respawn:'เกิดใหม่ (วิ)',reach:'ระยะตี'};
const KIND={potion:'ยา',gear:'อุปกรณ์',card:'การ์ด',loot:'วัตถุดิบ',scroll:'ม้วน',egg:'ไข่',lure:'เหยื่อ',petfood:'อาหารสัตว์'};
const paths=[NOVICE,...CLASSES];
let draft=JSON.parse(JSON.stringify(BALANCE));
// what is already in the game: the counter shows only edits made since the last save
let saved=JSON.parse(JSON.stringify(BALANCE));
for(const g of [...Object.keys(FIELDS),'drops'])draft[g]??={};
let tab='players',classId='swordsman',query='',kind='all',tableView='compare';
// players tab state (declared up here: the first render may already be on that tab)
const LOCAL=['127.0.0.1','localhost'].includes(location.hostname),API=LOCAL?'':multiplayerURL().replace(/^ws/,'http').replace(/\/realtime$/,'');
let players=null,picked=null,adminMsg='',fbConn=null,fbWarm=null;
let fx={classId:'swordsman',level:50,str:40,agi:20,vit:20,int:1,dex:20,luk:10,watk:60,wmatk:0,skillLv:5};
try{Object.assign(fx,JSON.parse(localStorage.getItem('ayo-admin-formula'))??{});}catch{}
// 0.110.7 weather / world-boss tab state lives up here: the first render() runs at load and may open either tab
// (the last tab is remembered), so declaring it further down left it uninitialised and crashed the whole page.
let weatherState=null,weatherMsg='',weatherMaps=null,wx={serverId:'server-1',mapId:'',minutes:30};
let bossMsg='',bossMaps=null,bx={serverId:'server-1',mapId:'',typeId:String(MONSTER_TYPES.findIndex(t=>t.mvp)),count:1,spot:null}; // spot = in-game {x,y} (y = -z) or null = random
let presence='all',shownRows=50; // 0.103 players list: online / offline filter and how many rows are drawn
let search='',basket=[],giftCoins=0,refreshTimer=0,itemKind='all',gearClass='all',itemQuery='',pickCount=1;
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
function count(){let n=0;for(const g of Object.keys(draft))for(const k of new Set([...Object.keys(draft[g]),...Object.keys(saved[g]??{})]))for(const f of new Set([...Object.keys(draft[g][k]??{}),...Object.keys(saved[g]?.[k]??{})]))if(draft[g][k]?.[f]!==saved[g]?.[k]?.[f])n++;return n;}
function set(r,f,v){
 const b=base(r,f);if(v===''||v===null||Number(v)===b){if(draft[r.group][r.key]){delete draft[r.group][r.key][f];if(!Object.keys(draft[r.group][r.key]).length)delete draft[r.group][r.key];}}
 else{const [min,max]=FIELDS[r.group][f];(draft[r.group][r.key]??={})[f]=Math.min(max,Math.max(min,Number(v)));}
 showCount();
}
// 0.101.2 side menu: what each page is for, in one line
const PAGES={formula:['📐','สูตรดาเมจ','ลองค่าตัวละคร ดูดาเมจ ตีโดน และหลบได้ต่อมอนทุกตัว'],players:['👥','ผู้เล่น','ดูผู้เล่นทั้งออนไลน์และออฟไลน์ ส่งไอเท็มหรือเบี้ยให้'],classes:['⚔️','อาชีพ','ค่าพื้นฐานของแต่ละอาชีพ: พลังโจมตี ความเร็ว ระยะ'],skills:['✨','สกิล','ปรับพลัง MP คูลดาวน์ของสกิลทีละอาชีพ'],table:['📊','ตารางสกิล','เทียบความแรงสกิลทุกอาชีพ (ดูอย่างเดียว)'],items:['🎒','ไอเท็ม','ราคา ค่าพลัง ฟื้น HP/MP ของไอเท็ม'],monsters:['👹','มอนสเตอร์','HP พลัง EXP และเวลาเกิดใหม่ของมอน'],drops:['🎲','ดรอป','โอกาสดรอปไอเท็มของมอนแต่ละตัว (%)'],weather:['🌦️','สภาพอากาศ','เปลี่ยนฝน หมอก พายุในเกมทันที ทุกแผนที่หรือแผนที่เดียว'],boss:['👑','บอสโลก','เสกบอสลงแผนที่ที่เลือก · คนตีแรงสุดได้รางวัล MVP']};
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
 else if(tab==='drops')f.innerHTML=`<label>ค้นหา <input id="search" type="search" value="${esc(query)}" placeholder="ชื่อมอนหรือไอเท็ม"></label><small>100% = ดรอปทุกครั้ง · หัวหน้าฝูงและช่วงดรอป ×2 ยังทอยซ้ำตามเดิม</small>`;
 else if(tab==='monsters')f.innerHTML=`<label>ค้นหา <input id="search" type="search" value="${esc(query)}" placeholder="ชื่อหรือรหัสมอนสเตอร์"></label>`;
 else f.innerHTML='';
 $('class-pick')&&($('class-pick').onchange=e=>{classId=e.target.value;remember();render();});
 $('table-pick')&&($('table-pick').onchange=e=>{tableView=e.target.value;render(false);});
 $('kind-pick')&&($('kind-pick').onchange=e=>{kind=e.target.value;render(false);});
 $('search')&&($('search').oninput=e=>{query=e.target.value.trim().toLowerCase();render(false);});
}
function pageHead(){
 const [icon,name,help]=PAGES[tab],editable=!['players','table','formula','weather','boss'].includes(tab);
 $('page-title').textContent=icon+' '+name;$('page-help').textContent=help+(editable?' · แก้ตัวเลขในช่อง (สีทอง = แก้แล้ว) แล้วกด บันทึกเข้าเกม':'');
 $('save-actions').hidden=!editable;showCount();
}
function showCount(){const n=count();$('changes').textContent=n?`แก้ไว้ ${n} ช่อง · ยังไม่บันทึก`:'ยังไม่มีการแก้';$('changes').classList.toggle('dirty',!!n);$('save').disabled=!n;$('reset-all').disabled=!n;}
function render(withFilters=true){
 if(withFilters)filters();pageHead();
 if(tab==='table'){$('view').innerHTML=skillTable();return;}
 if(tab==='players'){playersTab();return;}
 if(tab==='formula'){formulaTab();return;}
 if(tab==='drops'){dropsTab();return;}
 if(tab==='weather'){weatherTab();return;}
 if(tab==='boss'){bossTab();return;}
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
// 0.103 drop rates: one row per item a monster can drop, edited in % (stored 0-1 in balance-data.js drops).
const pct=v=>Math.round(v*1e6)/1e4;
const monName=id=>MONSTER_TYPES.find((m,i)=>monsterKey(m,i)===id)?.name??id;
const dropBase=(mid,id,now)=>{const k='drops.'+mid+'.'+id;return k in BASELINE?BASELINE[k]:now;};
function dropsTab(){
 const list=Object.entries(DROPS).map(([mid,d])=>({mid,name:monName(mid),d})).filter(m=>!query||(m.name+m.mid+m.d.items.map(([id])=>itemName(id)+id).join()).toLowerCase().includes(query));
 $('view').innerHTML=`<div class="scroll"><table class="drops"><thead><tr><th class="l">มอน · ไอเท็ม</th><th>ค่าเดิม</th><th>โอกาสดรอป %</th><th>จำนวน</th><th></th></tr></thead><tbody>${list.map(({mid,name,d})=>{const over=draft.drops[mid];
  return `<tr class="mon"><td class="l" colspan="4"><b>${esc(name)}</b><small>${esc(mid)} · เบี้ย ${d.coins[0]}–${d.coins[1]}</small></td><td><button type="button" class="undo" data-undo-drop="${esc(mid)}" ${over?'':'hidden'}>คืนค่า</button></td></tr>`+
  d.items.map(([id,now,n=1])=>{const b=dropBase(mid,id,now),edited=over?.[id]!==undefined,v=edited?over[id]:b;
   return `<tr><td class="l"><span class="name"><i class="ico sm" data-item="${esc(id)}" style="${iconStyle(id)}"></i><span><b>${esc(itemName(id))}</b><small>${esc(id)}</small></span></span></td><td>${pct(b)}%</td><td><input type="number" min="0" max="100" step="any" data-mid="${esc(mid)}" data-id="${esc(id)}" value="${pct(v)}" class="${edited?'edited':''}" aria-label="${esc(name)} ${esc(itemName(id))} %" title="ค่าเดิม ${pct(b)}%"></td><td>×${n}</td><td></td></tr>`;}).join('');}).join('')||'<tr><td class="l" colspan="5">ไม่พบ</td></tr>'}</tbody></table></div>`;
 $('view').querySelectorAll('input[data-mid]').forEach(inp=>inp.onchange=()=>{
  const {mid,id}=inp.dataset,entry=DROPS[mid].items.find(e=>e[0]===id),b=dropBase(mid,id,entry[1]),v=inp.value===''?b:Math.min(100,Math.max(0,Number(inp.value)))/100;
  if(!Number.isFinite(v)||pct(v)===pct(b)){if(draft.drops[mid]){delete draft.drops[mid][id];if(!Object.keys(draft.drops[mid]).length)delete draft.drops[mid];}}
  else (draft.drops[mid]??={})[id]=v;
  const edited=draft.drops[mid]?.[id]!==undefined;inp.classList.toggle('edited',edited);inp.value=pct(edited?v:b);
  $('view').querySelector(`[data-undo-drop="${CSS.escape(mid)}"]`).hidden=!draft.drops[mid];showCount();
 });
 $('view').querySelectorAll('[data-undo-drop]').forEach(b=>b.onclick=()=>{const top=$('view').querySelector('.scroll').scrollTop;delete draft.drops[b.dataset.undoDrop];dropsTab();$('view').querySelector('.scroll').scrollTop=top;});
 showCount();
}
const say=(t,ok=true)=>{$('status').textContent=t;$('status').className='status '+(ok?'ok':'bad');};
$('reset-all').onclick=()=>{draft=JSON.parse(JSON.stringify(saved));for(const g of [...Object.keys(FIELDS),'drops'])draft[g]??={};render(false);say('ยกเลิกที่แก้แล้ว · กลับเป็นค่าที่บันทึกไว้');};
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
 try{const j=await adminFetch('/admin/balance',draft);saved=JSON.parse(JSON.stringify(draft));showCount();$('changes').textContent=`บันทึกแล้ว ${j.changes} ช่อง`;
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
const ADMIN_ERRORS={'player-online':'ผู้เล่นคนนี้เพิ่งเข้าเกม · กดรีเฟรชแล้วส่งใหม่','bag-full':'กระเป๋าผู้เล่นเต็ม · ส่งของน้อยลงหรือส่งเป็นเบี้ยแทน','character-not-found':'ไม่พบตัวละครนี้ในเซฟ','not-admin':'อีเมลนี้ไม่อยู่ในรายชื่อ ADMIN_EMAILS บน Render','admin-unset':'เซิร์ฟเวอร์ยังไม่เห็นค่า ADMIN_EMAILS · ตั้งที่ Render แล้วกด Save, rebuild and deploy','bad-token':'ตรวจการล็อกอิน Google ไม่ผ่าน · ออกแล้วล็อกอินใหม่','origin':'เปิดหน้านี้จากเว็บเกมเท่านั้น','player-offline':'ผู้เล่นออฟไลน์ไปแล้ว','bad-item':'ไม่มีไอเท็มนี้','bad-count':'จำนวนต้อง 1–999','bad-coins':'เบี้ยต้อง 0–10,000,000','nothing':'ยังไม่ได้เลือกของหรือใส่เบี้ย','need-login':'ต้องล็อกอิน Google ก่อน','github-unset':'เซิร์ฟเวอร์ยังไม่มี GITHUB_TOKEN (ตั้งที่ Render)','github-failed':'ส่งขึ้น GitHub ไม่สำเร็จ · ตรวจสิทธิ์ของ GITHUB_TOKEN','github-conflict':'ไฟล์บน GitHub เพิ่งเปลี่ยน · กดบันทึกอีกครั้ง','invalid':'ข้อมูลไม่ถูกต้อง'};
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
async function loadPlayers(quiet=false,fresh=false){
 if(!LOCAL&&!fbConn?.auth.currentUser)return;
 if(!quiet){adminMsg='กำลังโหลด…';playersTab();}
 try{players=(await adminFetch('/admin/players'+(fresh?'?fresh=1':''))).players;if(!quiet)adminMsg='';if(picked&&!players.some(p=>p.id===picked))picked=null;}
 catch(e){adminMsg=ADMIN_ERRORS[e.message]??'โหลดไม่สำเร็จ · '+e.message;}
 if(tab==='players')playersTab();
}
function autoRefresh(){clearInterval(refreshTimer);refreshTimer=setInterval(()=>{if(tab!=='players'||document.hidden)return;if(document.activeElement?.closest?.('#give'))return;loadPlayers(true);},15000);}
// 0.109.7 weather tab: set rain / mist / storm (or clear) on a realm for some minutes, or hand it back to the clock.
async function loadWeather(){try{weatherState=(await adminFetch('/admin/weather')).servers;weatherMsg='';}catch(e){weatherMsg=ADMIN_ERRORS[e.message]??'โหลดไม่สำเร็จ · '+e.message;}if(tab==='weather')weatherTab();}
async function setWeather(weather){
 weatherMsg='กำลังเปลี่ยน…';weatherTab();
 try{const r=await adminFetch('/admin/weather',{serverId:wx.serverId,weather,minutes:wx.minutes,mapId:wx.mapId||null});(weatherState??={})[r.serverId]=r.weather;
  weatherMsg=weather==='auto'?'กลับเป็นสภาพอากาศตามเวลาแล้ว':'เปลี่ยนเป็น '+WEATHERS[weather].icon+' '+WEATHERS[weather].name+' แล้ว · ผู้เล่นเห็นภายในไม่กี่วินาที';}
 catch(e){weatherMsg=ADMIN_ERRORS[e.message]??'เปลี่ยนไม่สำเร็จ · '+e.message;}weatherTab();
}
function weatherTab(){
 warmFirebase();const user=LOCAL||fbConn?.auth.currentUser;
 if(!weatherMaps){weatherMaps=[];fetch('maps/world.json').then(r=>r.json()).then(w=>{weatherMaps=w.maps.filter(m=>!m.instance).map(m=>({id:m.id,name:m.name}));if(tab==='weather')weatherTab();}).catch(()=>{});}
 if(user&&!weatherState&&!weatherMsg)loadWeather();
 const mapName=id=>weatherMaps?.find(m=>m.id===id)?.name??id;
 const now=id=>{const o=weatherState?.[id];return o?`${WEATHERS[o.id].icon} ${WEATHERS[o.id].name} · ${o.mapId?esc(mapName(o.mapId)):'ทุกแผนที่'} · อีก ${Math.ceil(o.left/6e4)} นาที`:'ตามเวลา (สุ่มทุก 15 นาที)';};
 $('view').innerHTML=!user?`<div class="wx"><p>ต้องล็อกอิน Google ด้วยบัญชีแอดมินก่อน</p><button type="button" id="wx-login" class="wx-auto">ล็อกอิน</button></div>`:
  `<div class="wx"><p class="wx-now">ตอนนี้ · เซิร์ฟ 1: <b>${now('server-1')}</b> · เซิร์ฟ 2: <b>${now('server-2')}</b></p>
  <div class="wx-pick"><label>เซิร์ฟ <select id="wx-server"><option value="server-1"${wx.serverId==='server-1'?' selected':''}>เซิร์ฟ 1</option><option value="server-2"${wx.serverId==='server-2'?' selected':''}>เซิร์ฟ 2</option></select></label>
  <label>แผนที่ <select id="wx-map"><option value="">ทุกแผนที่กลางแจ้ง</option>${(weatherMaps??[]).map(m=>`<option value="${esc(m.id)}"${m.id===wx.mapId?' selected':''}>${esc(m.name)}</option>`).join('')}</select></label>
  <label>นาน <select id="wx-min">${[15,30,60,120,240].map(n=>`<option value="${n}"${n===wx.minutes?' selected':''}>${n} นาที</option>`).join('')}</select></label></div>
  <div class="wx-grid">${Object.entries(WEATHERS).map(([id,w])=>`<button type="button" data-wx="${id}"><i>${w.icon}</i><b>${w.name}</b><small>${w.text}</small></button>`).join('')}</div>
  <button type="button" class="wx-auto" data-wx="auto">↺ กลับเป็นตามเวลา</button><p class="wx-msg" role="status">${esc(weatherMsg)}</p><small>ดันเจี้ยนไม่มีฝนเสมอ · หมดเวลาแล้วกลับเป็นตามเวลาเอง</small></div>`;
 $('wx-login')&&($('wx-login').onclick=async()=>{if(await signIn())loadWeather();});
 $('wx-server')&&($('wx-server').onchange=e=>{wx.serverId=e.target.value;});$('wx-map')&&($('wx-map').onchange=e=>{wx.mapId=e.target.value;});$('wx-min')&&($('wx-min').onchange=e=>{wx.minutes=+e.target.value;});
 $('view').querySelectorAll('[data-wx]').forEach(b=>b.onclick=()=>setWeather(b.dataset.wx));
}
// 0.109.8 world boss tab: pick a realm, a field map and a boss, then summon it (one at a time per map; it does not respawn).
async function summonBoss(){
 if(!bx.mapId){bossMsg='เลือกแผนที่ก่อน';bossTab();return;}
 bossMsg='กำลังเสก…';bossTab();
 try{const r=await adminFetch('/admin/boss',{serverId:bx.serverId,mapId:bx.mapId,typeId:+bx.typeId,count:bx.count,x:bx.spot?.x??null,y:bx.spot?.y??null});bossMsg=`👑 เสก ${r.name}${r.count>1?' ×'+r.count:''} ที่ ${r.map} แล้ว (จุด X ${r.x} · Y ${r.y}) · ประกาศทั้งเซิร์ฟแล้ว`;}
 catch(e){bossMsg={'boss-many':'แผนที่นี้มีบอสที่เสกไว้เยอะเกินไปแล้ว (สูงสุด 60 ตัว)','bad-spot':'จุดที่เลือกเดินไม่ได้ · ลองจิ้มบนพื้นสีเขียว','bad-map':'แผนที่นี้เสกบอสไม่ได้ (เมือง ดันเจี้ยน บ้านกิลด์)','bad-boss':'มอนตัวนี้ไม่ใช่บอส'}[e.message]??ADMIN_ERRORS[e.message]??'เสกไม่สำเร็จ · '+e.message;}
 bossTab();
}
function bossTab(){
 warmFirebase();const user=LOCAL||fbConn?.auth.currentUser;
 if(!bossMaps){bossMaps=[];fetch('maps/world.json').then(r=>r.json()).then(w=>{bossMaps=w.maps.filter(m=>!m.instance&&!m.safe&&!m.guildHall).map(m=>({id:m.id,name:m.name,nav:m.nav,bounds:m.bounds}));if(!bx.mapId&&bossMaps[0])bx.mapId=bossMaps[0].id;if(tab==='boss')bossTab();}).catch(()=>{});}
 const bosses=MONSTER_TYPES.map((t,i)=>[i,t]).filter(([,t])=>t.boss);
 $('view').innerHTML=!user?`<div class="wx"><p>ต้องล็อกอิน Google ด้วยบัญชีแอดมินก่อน</p><button type="button" id="bx-login" class="wx-auto">ล็อกอิน</button></div>`:
  `<div class="wx"><div class="wx-pick"><label>เซิร์ฟ <select id="bx-server"><option value="server-1"${bx.serverId==='server-1'?' selected':''}>เซิร์ฟ 1</option><option value="server-2"${bx.serverId==='server-2'?' selected':''}>เซิร์ฟ 2</option></select></label>
  <label>แผนที่ <select id="bx-map">${(bossMaps??[]).map(m=>`<option value="${esc(m.id)}"${m.id===bx.mapId?' selected':''}>${esc(m.name)}</option>`).join('')}</select></label>
  <label>บอส <select id="bx-type">${bosses.map(([i,t])=>`<option value="${i}"${String(i)===bx.typeId?' selected':''}>${esc(t.name)}${t.mvp?' (MVP)':''} · Lv.${t.level??'?'} · HP ${t.hp.toLocaleString('th-TH')}</option>`).join('')}</select></label>
  <label>จำนวน <input id="bx-count" type="number" min="1" max="20" value="${bx.count}"></label></div>
  <div class="bx-map"><canvas id="bx-canvas" width="360" height="360" aria-label="จิ้มบนแผนที่เพื่อเลือกจุดเสก"></canvas><div><p>จุดเสก: <b>${bx.spot?`X ${bx.spot.x} · Y ${bx.spot.y}`:'สุ่มทั้งแผนที่'}</b></p><label>X <input id="bx-x" type="number" value="${bx.spot?.x??''}"></label><label>Y <input id="bx-y" type="number" value="${bx.spot?.y??''}"></label><button type="button" class="wx-auto" id="bx-random">🎲 สุ่มจุด</button><small>จิ้มบนพื้นสีเขียว · X / Y ตรงกับมุมแผนที่ในเกม</small></div></div>
  <button type="button" class="wx-auto bx-go" id="bx-go">👑 เสกบอสโลก</button><p class="wx-msg" role="status">${esc(bossMsg)}</p>
  <small>เสกได้เฉพาะแผนที่สนาม (ไม่ใช่เมือง ดันเจี้ยน บ้านกิลด์) · เสกได้หลายตัว (ครั้งละไม่เกิน 20) · ไม่เกิดซ้ำเมื่อตาย · ไม่กระทบเวลาเกิดของ MVP ปกติ · คนตีแรงสุดได้ ถ่านเพลิงราชาหุ่นฟาง</small></div>`;
 $('bx-login')&&($('bx-login').onclick=async()=>{if(await signIn())bossTab();});
 $('bx-server')&&($('bx-server').onchange=e=>{bx.serverId=e.target.value;});$('bx-map')&&($('bx-map').onchange=e=>{bx.mapId=e.target.value;bx.spot=null;bossTab();});$('bx-type')&&($('bx-type').onchange=e=>{bx.typeId=e.target.value;});
 $('bx-go')&&($('bx-go').onclick=summonBoss);
 $('bx-count')&&($('bx-count').onchange=e=>{bx.count=Math.min(20,Math.max(1,Math.round(+e.target.value)||1));e.target.value=bx.count;});
 const setXY=()=>{const x=$('bx-x').value,y=$('bx-y').value;bx.spot=x!==''&&y!==''?{x:Math.round(+x),y:Math.round(+y)}:null;bossTab();};
 $('bx-x')&&($('bx-x').onchange=setXY);$('bx-y')&&($('bx-y').onchange=setXY);$('bx-random')&&($('bx-random').onclick=()=>{bx.spot=null;bossTab();});
 drawBossMap();
}
// The picked map from its walk grid (green = ground players can stand on); a click sets the spot in in-game X / Y.
function drawBossMap(){
 const c=$('bx-canvas'),m=bossMaps?.find(v=>v.id===bx.mapId);if(!c||!m)return;const g=c.getContext('2d'),b=m.bounds??{x:-50,z:-50,w:100,d:100},k=c.width/Math.max(b.w,b.d);
 const px=x=>(x-b.x)*k,pz=z=>(z-b.z)*k;g.fillStyle='#0b1915';g.fillRect(0,0,c.width,c.height);g.fillStyle='#4f8a5d';
 const grid=m.nav?.grid;if(grid)grid.rows.forEach((row,j)=>{for(let i=0;i<row.length;i++)if(row[i]!=='.')g.fillRect(px(grid.x0+i*grid.cell)-k*grid.cell/2,pz(grid.z0+j*grid.cell)-k*grid.cell/2,Math.ceil(k*grid.cell),Math.ceil(k*grid.cell));});
 else for(const zn of m.nav?.zones??[])g.fillRect(px(zn.x),pz(zn.z),zn.w*k,zn.d*k);
 g.fillStyle='#1d2b26';for(const o of m.nav?.obstacles??[])g.fillRect(px(o.x),pz(o.z),o.w*k,o.d*k);
 if(bx.spot){const x=px(bx.spot.x),y=pz(-bx.spot.y);g.fillStyle='#ff5a3c';g.strokeStyle='#fff3d6';g.lineWidth=2;g.beginPath();g.arc(x,y,7,0,7);g.fill();g.stroke();}
 c.onclick=e=>{const r=c.getBoundingClientRect(),x=(e.clientX-r.left)*c.width/r.width/k+b.x,z=(e.clientY-r.top)*c.height/r.height/k+b.z;bx.spot={x:Math.round(x),y:Math.round(-z)};bossTab();};
}
function playersTab(){
 warmFirebase();
 const user=LOCAL?'เครื่องตัวเอง (localhost)':fbConn?.auth.currentUser?.email??'';
 if(user&&!players&&!adminMsg){loadPlayers();autoRefresh();}
 // 0.100.9 pictures: the character's first standing frame, item icons from the game's atlases, an item grid to click
 const face=x=>`<i class="face" style="background-image:url(assets/character-life100/player/${esc(x.classId)}-${x.gender==='female'?'female':'male'}.png)"></i>`;
 const pic=(id,n)=>`<i class="ico" data-item="${esc(id)}" style="${iconStyle(id)}"></i>${n?`<em>${n}</em>`:''}`;
 const KINDS=[['all','ทั้งหมด'],['potion','ยา/อาหาร'],['gear','อุปกรณ์'],['card','การ์ด'],['loot','วัตถุดิบ'],['other','อื่น ๆ']];
 const kindOf=id=>['potion','gear','card','loot'].includes(ITEMS[id].kind)?ITEMS[id].kind:'other';
 const picks=Object.keys(ITEMS).filter(id=>!['ui','reserved'].includes(ITEMS[id].kind)&&(itemKind==='all'||kindOf(id)===itemKind)&&(itemKind!=='gear'||gearClass==='all'||(ITEMS[id].classes?.includes(gearClass)??gearClass==='any'))&&(!itemQuery||itemName(id).includes(itemQuery))).sort((a,b)=>itemName(a).localeCompare(itemName(b),'th'));
 // 0.103 offline characters (from the saves) are listed too: filter chips with counts, online first, 50 rows at a time
 const isOn=x=>!x.offline,all=players??[],counts={all:all.length,online:all.filter(isOn).length,offline:all.filter(x=>x.offline).length};
 const list=all.filter(x=>(presence==='all'||(presence==='online')===isOn(x))&&(!search||x.name.toLowerCase().includes(search.toLowerCase()))).sort((a,b)=>isOn(b)-isOn(a)),p=players?.find(x=>x.id===picked);
 const ago=t=>{const m=Math.max(0,(Date.now()-t)/60000);return m<1?'เมื่อสักครู่':m<60?Math.floor(m)+' นาทีที่แล้ว':m<1440?Math.floor(m/60)+' ชม.ที่แล้ว':Math.floor(m/1440)+' วันที่แล้ว';};
 const state=x=>x.offline?`<em class="pstate off">ออฟไลน์${x.lastSeen?' · '+ago(x.lastSeen):''}</em>`:x.online?'<em class="pstate on">ออนไลน์</em>':'<em class="pstate off">หลุด</em>';
 const chips=`<div class="kinds presence">${[['all','ทั้งหมด'],['online','ออนไลน์'],['offline','ออฟไลน์']].map(([k,n])=>`<button type="button" data-presence="${k}" class="${k===presence?'on':''}">${n} ${counts[k]}</button>`).join('')}</div>`;
 const head=`<div class="players-head"><h2>ผู้เล่น${players?' <small>'+counts.online+' ออนไลน์ · '+counts.offline+' ออฟไลน์</small>':''}</h2>`+
  (user?`<span class="who">👤 ${esc(user)}</span>${LOCAL?'':'<button type="button" id="sign-out">ออกจากระบบ</button>'}<button type="button" id="load-players">↻ รีเฟรช</button>`:'<button type="button" id="sign-in" class="primary">ล็อกอิน Google</button>')+
  (adminMsg?`<span class="msg">${esc(adminMsg)}</span>`:'')+'</div>';
 const row=x=>`<button type="button" class="prow${x.id===picked?' on':''}" data-pick="${esc(x.id)}">${face(x)}<span class="pinfo"><b>${esc(x.name)} ${state(x)}</b><span>${esc(className(x.classId))} · Lv.${x.level}</span><span>เซิร์ฟ ${esc(x.server.replace('server-',''))} · ${esc(x.map)}</span></span><span class="coin">${x.coins.toLocaleString('th-TH')}<small>เบี้ย</small></span></button>`;
 const plist=`<section class="plist"><input id="player-search" type="search" placeholder="🔍 ค้นหาชื่อผู้เล่น" value="${esc(search)}">${chips}${list.slice(0,shownRows).map(row).join('')||`<p class="hint">${players?'ไม่พบผู้เล่น':'กำลังโหลด…'}</p>`}${list.length>shownRows?`<button type="button" id="more-players" class="more">แสดงเพิ่ม (อีก ${list.length-shownRows} คน)</button>`:''}</section>`;
 let gift='<p class="hint big">← เลือกผู้เล่นทางซ้ายเพื่อดูกระเป๋าและส่งของ</p>';
 if(p){
  const bag=Object.entries(p.items).filter(([id,n])=>n>0&&ITEMS[id]).map(([id,n])=>`<span class="cell" title="${esc(itemName(id))} ×${n}">${pic(id,n)}</span>`).join('')||'<span class="hint">ว่าง</span>';
  const quick=QUICK.map(([id,n],i)=>`<button type="button" class="qbtn" data-quick="${i}">${id==='coins'?`<i class="ico" style="${iconStyle('cowrie')}"></i>`:`<i class="ico" data-item="${esc(id)}" style="${iconStyle(id)}"></i>`}<span>+${id==='coins'?n.toLocaleString('th-TH')+' เบี้ย':esc(itemName(id))+' ×'+n}</span></button>`).join('');
  const lines=basket.map((l,i)=>`<li>${pic(l.id)}<span>${esc(itemName(l.id))}</span><b>×${l.count}</b><button type="button" data-drop="${i}" aria-label="เอาออก">×</button></li>`).join('')+(giftCoins?`<li><i class="ico" style="${iconStyle('cowrie')}"></i><span>เบี้ย</span><b>${giftCoins.toLocaleString('th-TH')}</b><button type="button" data-drop="coins" aria-label="เอาออก">×</button></li>`:'');
  gift=`<form id="give"><div class="ghead">${face(p)}<div><h3>${esc(p.name)}</h3><small>${esc(className(p.classId))} · Lv.${p.level} · ${p.coins.toLocaleString('th-TH')} เบี้ย</small> ${state(p)}</div></div>`+
   (p.offline?'<p class="hint offline-note">ผู้เล่นออฟไลน์อยู่ · ของที่ส่งจะเข้ากระเป๋าในเซฟทันที และเห็นตอนเข้าเกมครั้งถัดไป</p>':'')+
   `<h4>กระเป๋า</h4><div class="grid bag">${bag}</div>`+
   `<h4>ส่งด่วน</h4><div class="quick">${quick}</div>`+
   `<h4>เลือกไอเท็ม <small>แตะรูปเพื่อใส่ในรายการ · จำนวนต่อครั้ง</small> <input id="give-count" type="number" min="1" max="999" value="${pickCount}" aria-label="จำนวนต่อครั้ง"></h4>`+
   `<div class="kinds">${KINDS.map(([k,n])=>`<button type="button" data-kind="${k}" class="${k===itemKind?'on':''}">${n}</button>`).join('')}<input id="item-search" type="search" placeholder="🔍 ชื่อไอเท็ม" value="${esc(itemQuery)}"></div>`+
   // equipment split per class (items.js `classes`); gear without `classes` fits everyone
   (itemKind==='gear'?`<div class="kinds sub">${[['all','ทุกอาชีพ'],...paths.map(c=>[c.id,c.icon+' '+c.name]),['any','ใช้ได้ทุกอาชีพ']].map(([k,n])=>`<button type="button" data-gear="${k}" class="${k===gearClass?'on':''}">${esc(n)}</button>`).join('')}</div>`:'')+
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
 on('load-players','onclick',()=>loadPlayers(false,true));
 on('more-players','onclick',()=>{shownRows+=50;playersTab();});
 $('view').querySelectorAll('[data-presence]').forEach(b=>b.onclick=()=>{presence=b.dataset.presence;shownRows=50;playersTab();});
 refocus('player-search',v=>{search=v;shownRows=50;});
 $('view').querySelectorAll('[data-pick]').forEach(b=>b.onclick=()=>{if(picked!==b.dataset.pick){picked=b.dataset.pick;basket=[];giftCoins=0;}adminMsg='';playersTab();});
 const form=$('give');if(!form)return;
 const keep=()=>{giftCoins=Math.max(0,Math.min(1e7,Math.floor(Number($('give-coins').value)||0)));pickCount=Math.max(1,Math.min(999,Math.floor(Number($('give-count').value)||1)));};
 const addItem=(id,count)=>{const line=basket.find(l=>l.id===id);if(line)line.count=Math.min(999,line.count+count);else if(basket.length<20)basket.push({id,count});};
 form.querySelectorAll('[data-quick]').forEach(b=>b.onclick=()=>{keep();const [id,n]=QUICK[+b.dataset.quick];if(id==='coins')giftCoins=Math.min(1e7,giftCoins+n);else addItem(id,n);playersTab();});
 form.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>{keep();addItem(b.dataset.add,pickCount);playersTab();});
 form.querySelectorAll('[data-kind]').forEach(b=>b.onclick=()=>{keep();itemKind=b.dataset.kind;playersTab();});
 form.querySelectorAll('[data-gear]').forEach(b=>b.onclick=()=>{keep();gearClass=b.dataset.gear;playersTab();});
 form.querySelectorAll('[data-drop]').forEach(b=>b.onclick=()=>{keep();if(b.dataset.drop==='coins')giftCoins=0;else basket.splice(+b.dataset.drop,1);playersTab();});
 refocus('item-search',v=>{keep();itemQuery=v.trim();});
 on('give-coins','onchange',()=>{keep();playersTab();});on('give-count','onchange',keep);
 form.onsubmit=async e=>{e.preventDefault();keep();const send=form.querySelector('.send');send.disabled=true;send.textContent='กำลังส่ง…';
  try{const r=await adminFetch('/admin/give',{peer:p.id,coins:giftCoins,items:basket});adminMsg='✔ ส่งให้ '+r.name+' แล้ว'+(p.offline?' (เข้าเซฟแล้ว เห็นตอนเข้าเกม)':'');Object.assign(p,{coins:r.coins,items:r.items});basket=[];giftCoins=0;}
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
