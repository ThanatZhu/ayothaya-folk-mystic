import {createAdminResetUI} from './admin-reset-ui.js?v=166';
import {legacyPetItem} from './mailbox.js';
import {petGrantHTML,bindPetGrant} from './admin-pet-panel.js?v=127';
import {paintAdminSkills,paintAdminMonsters} from './admin-art.js?v=127';
import {liveRoleSkills} from './role-skill-progress.js';
import {roleById} from './assets/skills-next/catalog.js';
// 0.85 back-office dashboard: every tunable game number in one place (paths, skills, items, monsters).
// Edits are kept as overrides (balance.js FIELDS); "บันทึกเข้าเกม" posts them to the local dev server, which writes
// balance-data.js for the next deploy. Player data is not touched here.
import {ITEMS,DROPS,itemDef} from './items.js?v=107';
import {gearLook,GRADES,familyName,BOSS_SETS} from './gear-sets.js';
import {newGearFilter,gearMatch,gearFilterHTML,bindGearFilter,lookName} from './admin-gear-filter.js?v=1163';
import {WORLD_MAP_BOSSES} from './chapter2-monsters.js';
import {CLASSES,NOVICE,classSkills,className} from './classes.js?v=novice174';
import {multiplayerURL} from './multiplayer-config.js?v=28';
import {iconStyle} from './bag-ui.js?v=107';
import {SKILLS,MONSTER_TYPES} from './combat-core.js?v=novice174';
import {BALANCE,BASELINE,FIELDS,monsterKey} from './balance.js';
import {SKILL_TREE,scaledSkill} from './skill-progress.js?v=novice174';
import {WEATHERS} from './weather.js?v=181';
import {deriveStats} from './character-stats.js';
import {monsterDef,monsterMdef,monsterFlee,monsterHit as monsterHitStat,defFactor,hitChance,dodgeChance,magicMonster,CRIT_MULT} from './combat-formulas.js';

export const ALLOWED_ADMINS = ['chokkungfn@gmail.com'];

const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';');
const LABEL={damage:'พลัง',heal:'ฟื้นฟู',cost:'MP',cd:'คูลดาวน์',range:'ระยะ',radius:'รัศมี',duration:'นาน',delay:'หน่วง (วิ)',atk:'ATK',matk:'MATK',def:'DEF',level:'เลเวล',buy:'ราคาซื้อ',sell:'ราคาขาย',tokens:'เหรียญงาน',hp:'HP',mp:'MP',speed:'ความเร็ว',baseXp:'Base EXP',jobXp:'Job EXP',respawn:'เกิดใหม่ (วิ)',reach:'ระยะตี'};
const KIND={potion:'ยา',gear:'อุปกรณ์',card:'การ์ด',loot:'วัตถุดิบ',scroll:'ม้วน',egg:'ไข่',lure:'เหยื่อ',petfood:'อาหารสัตว์'};
const paths=[NOVICE,...CLASSES];
let draft=JSON.parse(JSON.stringify(BALANCE));
// what is already in the game: the counter shows only edits made since the last save
let saved=JSON.parse(JSON.stringify(BALANCE));
for(const g of [...Object.keys(FIELDS),'drops'])draft[g]??={};
let tab='players',classId='swordsman',query='',kind='all',tableView='compare',viewMode='cards',skillSet='live',masterId='',monsterKind='all';
let mapBossView={serverId:'server-1',channel:1,rows:null,loading:false,message:'',request:0,offset:0};
// players tab state (declared up here: the first render may already be on that tab)
const LOCAL=['127.0.0.1','localhost'].includes(location.hostname),API=LOCAL?'':multiplayerURL().replace(/^ws/,'http').replace(/\/realtime$/,'');
let players=null,picked=null,adminMsg='',fbConn=null,fbWarm=null;
let fx={classId:'swordsman',level:50,str:40,agi:20,vit:20,int:1,dex:20,luk:10,watk:60,wmatk:0,skillLv:5};
try{Object.assign(fx,JSON.parse(localStorage.getItem('ayo-admin-formula'))??{});}catch{}
// 0.110.7 weather / world-boss tab state lives up here: the first render() runs at load and may open either tab
// (the last tab is remembered), so declaring it further down left it uninitialised and crashed the whole page.
let weatherState=null,weatherMsg='',weatherMaps=null,wx={serverId:'server-1',mapId:'',minutes:30};
let bossMsg='',bossMaps=null,bx={serverId:'server-1',channel:1,mapId:'',typeId:String(MONSTER_TYPES.findIndex(t=>t.mvp)),count:1,spot:null}; // spot = in-game {x,y} (y = -z) or null = random
let presence='all',shownRows=50; // 0.103 players list: online / offline filter and how many rows are drawn
let itemGrantPending=null,itemGrantSending=false,petGrantPending=null,petGrantSending=false,giftPane='pets';const petGrantDrafts=new Map();
let search='',basket=[],giftCoins=0,refreshTimer=0,itemKind='all',itemQuery='',pickCount=1,shownPicks=60;
const giftGear=newGearFilter('auto'),tabGear=newGearFilter('all'); // 0.117 gear filters: gift picker (follows the picked player) and items tab
const QUICK=[['coins',1000],['coins',10000],['hp-small',10],['mp-small',10],['hp-large',5],['return-incense',5],['lek-lai',1],['break-guard',1]];
const itemName=id=>itemDef(id)?.name??id;
const pickedLook=()=>{const x=players?.find(v=>v.id===picked);return x?gearLook(x.classId,x.gender):null;};
// graded gear is sent with the grade picked in the filter ('^1'..'^4'); everything else as is
const gradeId=id=>itemKind==='gear'&&ITEMS[id]?.graded&&Number.isInteger(giftGear.grade)&&giftGear.grade?id+'^'+giftGear.grade:id;
try{const s=JSON.parse(localStorage.getItem('ayo-admin-view'));if(s){tab=s.tab??tab;classId=s.classId??classId;}}catch{}

// Original value (code) and the value in effect for one field.
const original=(group,key,field,current)=>{const id=group+'.'+key+'.'+field;return id in BASELINE?BASELINE[id]:current;};
const skillBase=(cid,slot)=>classSkills(cid,SKILLS)[slot];
function rowsFor(){
 if(tab==='classes')return paths.map(c=>({group:'classes',key:c.id,title:c.name,sub:c.role??'',src:c}));
 if(tab==='skills')return skillBase&&classSkills(classId,SKILLS).map((s,i)=>({group:'skills',key:classId+':'+i,title:s.key+' · '+s.name,sub:s.type,src:s,skill:true,artSlot:i}));
 if(tab==='items')return Object.entries(ITEMS).filter(([id,it])=>it.kind!=='ui'&&it.kind!=='reserved'&&(kind==='all'||it.kind===kind)&&(kind!=='gear'||gearMatch(it,tabGear))&&(!query||(it.name+id).toLowerCase().includes(query))).map(([id,it])=>({group:'items',key:id,title:it.name,sub:(KIND[it.kind]??it.kind)+' · '+id,src:it}));
 return MONSTER_TYPES.map((m,i)=>({group:'monsters',key:monsterKey(m,i),title:m.name,sub:(m.boss?'บอส · ':m.elite?'อีลิท · ':'')+monsterKey(m,i),src:m})).filter(r=>(!query||(r.title+r.key).toLowerCase().includes(query))&&(monsterKind==='all'||monsterKind==='boss'&&r.src.boss||monsterKind==='elite'&&r.src.elite&&!r.src.boss||monsterKind==='normal'&&!r.src.elite&&!r.src.boss));
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
const NAV=[['ผู้เล่นและชุมชน',['players','mail','evidence']],['โลกเกมตอนนี้',['weather','boss','mapbosses']],['ปรับสมดุลเกม',['classes','skills','table','items','monsters','drops','formula']]];
// 0.118 evidence log (player names and details are shown exactly as recorded: data-i18n-skip): search what players and admins did (server keeps players 90 days, admins 3 years) and export it.
const bkkDay=(t=Date.now())=>new Date(t+7*3600e3).toISOString().slice(0,10);
const ev={stream:'players',from:bkkDay(),to:bkkDay(),type:'',q:'',rows:null,total:0,truncated:false,loading:false,msg:''};
const EV_TYPES={players:[['','ทุกประเภท'],['login','เข้าเกม'],['logout','ออกจากเกม'],['chat','แชต'],['trade','แลกของ'],['market','ตลาด / แผง / ร้าน'],['mail','จดหมาย / รับของ'],['pet','สัตว์เลี้ยง'],['rename','เปลี่ยนชื่อ'],['travel','ย้ายแมพ'],['consent','ยอมรับนโยบาย']],admin:[['','ทุกการกระทำ'],['admin-mail','ส่งของ / จดหมาย'],['admin-balance','ปรับค่าสมดุล'],['admin-weather','สภาพอากาศ'],['admin-boss','เสกบอส'],['admin-finance','บัญชีการเงิน'],['admin-world-reset','รีเซ็ตโลก'],['admin-evidence-search','ค้นบันทึกนี้']]};
const EV_LABEL=Object.fromEntries([...EV_TYPES.players,...EV_TYPES.admin].filter(([k])=>k));
Object.assign(EV_LABEL,{'market-stall':'ซื้อจากแผง','market-shop-buy':'ซื้อจากร้าน','market-shop-sell':'ขายให้ร้าน','admin-mail-all':'ประกาศทุกคน','admin-world-reset-preview':'ดูตัวอย่างรีเซ็ต','admin-world-reset-execute':'สั่งรีเซ็ตโลก'});
const evTime=t=>new Date(t).toLocaleString('th-TH',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'});
const evBag=o=>!o?'—':[o.coins?num(o.coins)+' เบี้ย':'',...Object.entries(o.items??{}).map(([id,n])=>itemName(id)+' ×'+n)].filter(Boolean).join(', ')||'—';
function evDetail(e){
 if(e.type==='chat')return '['+e.channel+(e.to?' → '+e.to.name:'')+'] '+e.text;
 if(e.type==='trade')return 'แลกกับ '+(e.with?.name??'?')+' · ให้: '+evBag(e.gave)+' · ได้: '+evBag(e.got);
 if(e.type?.startsWith('market'))return itemName(e.item)+' ×'+e.count+' · '+num(e.coins)+' เบี้ย'+(e.seller?' · ผู้ขาย '+e.seller.name:e.shop?' · ร้าน '+e.shop.owner:'');
 if(e.type==='login')return e.agent??'';
 if(e.type==='travel')return '→ '+e.to+(e.warp?' (วาร์ป)':'');
 if(e.type==='consent')return 'ฉบับ '+e.version+(e.email?' · '+e.email:'');
 const {t,type,uid,slot,server,name,ip,ch,map,admin,...rest}=e;return Object.keys(rest).length?JSON.stringify(rest):'';
}
function evRows(){return ev.rows??[];}
async function loadEvidence(){
 ev.loading=true;ev.msg='กำลังค้นหา…';evidenceTab();
 try{const p=new URLSearchParams({stream:ev.stream,from:ev.from,to:ev.to,type:ev.type,q:ev.q}),r=await adminFetch('/admin/evidence?'+p);ev.rows=r.events;ev.total=r.total;ev.truncated=r.truncated;ev.msg='';}
 catch(e){ev.msg=({'range-too-long':'ค้นได้ครั้งละไม่เกิน 31 วัน','bad-range':'ช่วงวันที่ไม่ถูกต้อง','evidence-unsupported':'เซิร์ฟเวอร์นี้ยังไม่มีระบบบันทึกหลักฐาน (รอ deploy)','need-login':'ต้องล็อกอิน Google ก่อน'})[e.message]??'ค้นหาไม่สำเร็จ · '+e.message;}
 finally{ev.loading=false;if(tab==='evidence')evidenceTab();}
}
function evDownload(kind){
 const rows=evRows();if(!rows.length)return;
 const stamp=ev.stream+'-'+ev.from+'_'+ev.to,cell=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
 const text=kind==='json'?JSON.stringify({query:{stream:ev.stream,from:ev.from,to:ev.to,type:ev.type,q:ev.q},exportedAt:new Date().toISOString(),events:rows},null,1)
  :'﻿'+[['เวลา (กรุงเทพ)','ประเภท','ผู้ทำ','UID','IP','เซิร์ฟ','CH','แมพ','รายละเอียด'].map(cell).join(','),...rows.map(e=>[evTime(e.t),EV_LABEL[e.type]??e.type,e.admin??e.name,e.uid,e.ip,e.server,e.ch,e.map,evDetail(e)].map(cell).join(','))].join('\r\n');
 const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:kind==='json'?'application/json':'text/csv;charset=utf-8'}));a.download='ayothaya-evidence-'+stamp+'.'+kind;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
function evidenceTab(){
 const rows=evRows(),types=EV_TYPES[ev.stream];
 $('view').innerHTML=`<div class="ev-admin"><form class="ev-filters" id="ev-form">
<label>บันทึกของ <select id="ev-stream"><option value="players"${ev.stream==='players'?' selected':''}>ผู้เล่น (เก็บ 90 วัน)</option><option value="admin"${ev.stream==='admin'?' selected':''}>แอดมิน (เก็บ 3 ปี)</option></select></label>
<label>ตั้งแต่ <input id="ev-from" type="date" value="${ev.from}"></label><label>ถึง <input id="ev-to" type="date" value="${ev.to}"></label>
<label>ประเภท <select id="ev-type">${types.map(([k,n])=>`<option value="${k}"${k===ev.type?' selected':''}>${n}</option>`).join('')}</select></label>
<label class="ev-q">ค้นหา <input id="ev-q" type="search" value="${esc(ev.q)}" placeholder="ชื่อตัวละคร · UID · IP · ข้อความ"></label>
<button type="submit" class="primary"${ev.loading?' disabled':''}>ค้นหา</button></form>
<div class="ev-bar"><span>${ev.msg?esc(ev.msg):ev.rows?`พบ ${num(ev.total)} รายการ`+(ev.truncated?' · แสดง 2,000 รายการล่าสุด ให้แคบช่วงลง':''):'เลือกช่วงวันแล้วกดค้นหา · ค้นได้ครั้งละไม่เกิน 31 วัน'}</span><span class="ev-export"><button type="button" id="ev-csv"${rows.length?'':' disabled'}>⬇ CSV (Excel)</button><button type="button" id="ev-json"${rows.length?'':' disabled'}>⬇ JSON</button></span></div>
${rows.length?`<div class="scroll ev-scroll"><table class="ev-table"><thead><tr><th>เวลา</th><th>ประเภท</th><th>${ev.stream==='admin'?'แอดมิน':'ผู้เล่น'}</th><th>IP</th><th>CH · แมพ</th><th>รายละเอียด</th></tr></thead><tbody>${rows.map(e=>`<tr><td class="ev-time">${evTime(e.t)}</td><td><span class="ev-type ev-${esc(String(e.type).split('-')[0])}">${esc(EV_LABEL[e.type]??e.type)}</span></td><td data-i18n-skip><b>${esc(e.admin??e.name??'—')}</b>${e.uid?`<small title="${esc(e.uid)}">${esc(e.uid.slice(0,10))}…</small>`:''}</td><td class="ev-ip">${esc(e.ip??'—')}</td><td>${e.ch?'CH '+esc(e.ch):''}${e.map?`<small>${esc(e.map)}</small>`:''}</td><td class="ev-detail" data-i18n-skip>${esc(evDetail(e))}</td></tr>`).join('')}</tbody></table></div>`:''}
<p class="ev-note">ใช้เป็นหลักฐานเมื่อมีข้อร้องเรียน เช่น โดนโกงของ คำพูดผิดกฎหมาย หรือเจ้าหน้าที่ขอข้อมูล · ทุกครั้งที่ค้นจะถูกบันทึกไว้ในบันทึกของแอดมินด้วย · ส่งออกแล้วเก็บไฟล์ไว้ในที่ปลอดภัย เพราะมีข้อมูลส่วนบุคคล</p></div>`;
 $('ev-stream').onchange=e=>{ev.stream=e.target.value;ev.type='';ev.rows=null;evidenceTab();};
 $('ev-form').onsubmit=e=>{e.preventDefault();ev.from=$('ev-from').value||bkkDay();ev.to=$('ev-to').value||ev.from;ev.type=$('ev-type').value;ev.q=$('ev-q').value.trim();loadEvidence();};
 $('ev-csv').onclick=()=>evDownload('csv');$('ev-json').onclick=()=>evDownload('json');
}
const announcementDraft={title:'',body:'',serverId:'all',pending:null,busy:false,message:''};
function tabs(){
 PAGES.mail=['✉','จดหมายและประกาศ','ส่งประกาศเข้าจดหมายผู้เล่น · ของแจกส่งได้ที่หน้าผู้เล่น'];
 PAGES.evidence=['🧾','บันทึกหลักฐาน','ประวัติเข้าเกม แชต การแลกของ ตลาด และการกระทำของแอดมิน · ค้นหาและส่งออกเป็นไฟล์'];
 PAGES.mapbosses=['🏔️','บอสประจำแมพ','9 แมพ · HP ไล่ตามพื้นที่ · เกิดใหม่ 60 นาทีหลังตาย แยกตามเซิร์ฟ/CH'];
 // 0.115 grouped menu: one line per page; the page's one-line help shows in its header instead.
 $('tabs').innerHTML=NAV.map(([group,ids])=>`<p class="nav-group">${group}</p>`+ids.filter(id=>PAGES[id]).map(id=>{const [icon,name,help]=PAGES[id];return `<button type="button" id="tab-${id}" aria-pressed="${id===tab}" data-tab="${id}" title="${esc(help)}"><i>${icon}</i><b>${name}</b></button>`;}).join('')).join('');
 $('tabs').querySelector('[aria-pressed=true]')?.scrollIntoView({block:'nearest',inline:'center'}); // phones: the menu is a strip, keep the open page in sight
 $('tabs').querySelectorAll('button').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;query='';remember();tabs();render();$('page-title').scrollIntoView({block:'start'});});
}
const remember=()=>{try{localStorage.setItem('ayo-admin-view',JSON.stringify({tab,classId}));}catch{}};
function filters(){
 const f=$('filters');
 if(tab==='skills'){
  const role=roleById(classId);if(!role?.branches.some(b=>b.id===masterId))masterId=role?.branches[0]?.id??'';
  f.innerHTML=`<label>อาชีพ <select id="class-pick">${paths.map(c=>`<option value="${c.id}"${c.id===classId?' selected':''}>${esc(c.name)}</option>`).join('')}</select></label><label>ชุดสกิล <select id="skill-set"><option value="live"${skillSet==='live'?' selected':''}>ชุดที่ใช้ในเกม · ดูรายละเอียด</option><option value="legacy"${skillSet==='legacy'?' selected':''}>ชุดเดิม · แก้ค่าสมดุล</option></select></label>`+(skillSet==='live'&&role?`<label>สาย Master <select id="master-pick">${role.branches.map(b=>`<option value="${b.id}"${b.id===masterId?' selected':''}>${esc(b.name)}</option>`).join('')}</select></label>`:'');
 }
 else if(tab==='table')f.innerHTML=`<label>ดู <select id="table-pick"><option value="compare"${tableView==='compare'?' selected':''}>เทียบทุกอาชีพ</option>${paths.map(c=>`<option value="${c.id}"${c.id===tableView?' selected':''}>${esc(c.name)}</option>`).join('')}</select></label><small>ตัวเลขรวมค่าที่แก้ในแท็บสกิล (ยังไม่บันทึกก็เห็นผลทันที) · เขียว/แดง = สูงสุด/ต่ำสุดของแถว</small>`;
 else if(tab==='items')f.innerHTML=`<label>ค้นหา <input id="search" type="search" value="${esc(query)}" placeholder="ชื่อหรือรหัสไอเท็ม"></label><label>ประเภท <select id="kind-pick"><option value="all">ทั้งหมด</option>${Object.entries(KIND).map(([k,n])=>`<option value="${k}"${k===kind?' selected':''}>${n}</option>`).join('')}</select></label>`;
 else if(tab==='drops')f.innerHTML=`<label>ค้นหา <input id="search" type="search" value="${esc(query)}" placeholder="ชื่อมอนหรือไอเท็ม"></label><small>100% = ดรอปทุกครั้ง · หัวหน้าฝูงและช่วงดรอป ×2 ยังทอยซ้ำตามเดิม</small>`;
 else if(tab==='monsters')f.innerHTML=`<label>ค้นหา <input id="search" type="search" value="${esc(query)}" placeholder="ชื่อหรือรหัสมอนสเตอร์"></label><label>ประเภท <select id="monster-kind">${[['all','ทั้งหมด'],['normal','ธรรมดา'],['elite','อีลิท'],['boss','บอส']].map(([k,n])=>`<option value="${k}"${monsterKind===k?' selected':''}>${n}</option>`).join('')}</select></label>`;
 else f.innerHTML='';
 if(tab==='items'&&kind==='gear'){f.insertAdjacentHTML('beforeend',gearFilterHTML(tabGear));bindGearFilter(f,tabGear,()=>render(false));}
 if(['skills','monsters'].includes(tab)&&!(tab==='skills'&&skillSet==='live'))f.insertAdjacentHTML('beforeend',`<div class="admin-view-switch" aria-label="รูปแบบการแสดงผล"><button type="button" data-view-mode="cards" aria-pressed="${viewMode==='cards'}">รูปภาพและรายละเอียด</button><button type="button" data-view-mode="table" aria-pressed="${viewMode==='table'}">ตารางตัวเลข</button></div>`);
 f.querySelectorAll('[data-view-mode]').forEach(b=>b.onclick=()=>{viewMode=b.dataset.viewMode;render();});
 $('monster-kind')&&($('monster-kind').onchange=e=>{monsterKind=e.target.value;render(false);});
 $('skill-set')&&($('skill-set').onchange=e=>{skillSet=e.target.value;render();});$('master-pick')&&($('master-pick').onchange=e=>{masterId=e.target.value;render();});
 $('class-pick')&&($('class-pick').onchange=e=>{classId=e.target.value;remember();render();});
 $('table-pick')&&($('table-pick').onchange=e=>{tableView=e.target.value;render(false);});
 $('kind-pick')&&($('kind-pick').onchange=e=>{kind=e.target.value;render();});
 $('search')&&($('search').oninput=e=>{query=e.target.value.trim().toLowerCase();render(false);});
}
function pageHead(){
 const [icon,name,help]=PAGES[tab],editable=!['players','table','formula','weather','boss','mapbosses','mail','evidence'].includes(tab)&&!(tab==='skills'&&skillSet==='live');
 $('page-title').textContent=name;$('page-help').textContent=(tab==='skills'&&skillSet==='live'?'ชุดสกิลที่ใช้ในเกมปัจจุบัน · ดูรูป บทบาท และสาย Master':help)+(editable?' · แก้ตัวเลขในช่อง (สีทอง = แก้แล้ว) แล้วกด บันทึกเข้าเกม':'');
 $('save-actions').hidden=!editable;showCount();
}
function showCount(){const n=count();$('changes').textContent=n?`แก้ไว้ ${n} ช่อง · ยังไม่บันทึก`:'ยังไม่มีการแก้';$('changes').classList.toggle('dirty',!!n);$('save').disabled=!n;$('reset-all').disabled=!n;}
function rowArt(r){
 if(r.skill)return `<span class="admin-skill-host" data-skill-art="${r.artSlot}"><strong></strong></span>`;
 if(r.group==='monsters')return `<img class="admin-monster-art" data-monster-art="${MONSTER_TYPES.indexOf(r.src)}" alt="${esc(r.title)}" width="160" height="160">`;
 if(r.group==='items')return `<i class="ico sm" data-item="${esc(r.key)}" style="${iconStyle(r.key)}"></i>`;
 return `<i class="face sm" style="background-image:url(assets/character-life100/player/${esc(r.key)}-male.png)"></i>`;
}
function fieldInput(r,f){const b=base(r,f),v=value(r,f),edited=draft[r.group][r.key]?.[f]!==undefined,range=FIELDS[r.group][f];return `<input type="number" step="any" min="${range[0]}" max="${range[1]}" data-f="${f}" value="${v??''}" class="${edited?'edited':''}" aria-label="${esc(r.title)} ${LABEL[f]??f}" title="ค่าเดิม ${b??'—'}">`;}
function currentSkills(){
 const defs=liveRoleSkills(classId,masterId)??classSkills(classId,SKILLS),role=roleById(classId),list=defs.map((s,i)=>({...s,artSlot:i})).filter(s=>!s.reserved);
 $('view').innerHTML=`<div class="admin-info-strip"><span>${esc(role?.role??className(classId))}</span><small>ค่าพื้นฐานก่อนเพิ่มระดับสกิล · ดูรายละเอียดเท่านั้น</small></div><div class="admin-entity-grid live-skill-grid">${list.map(s=>`<article class="admin-entity-card"><header>${rowArt({skill:true,artSlot:s.artSlot})}<div><span class="admin-tag">${s.passive?'พาสซีฟ':s.artSlot>=10?'Master':'สกิลอาชีพ'}</span><h3>${esc(s.name)}</h3><small>${esc(s.type)}</small></div></header><p class="admin-skill-tip">${esc(s.tip??'')}</p><dl class="admin-read-stats">${[['MP',s.passive?null:s.cost],['คูลดาวน์ (วิ)',s.passive?null:s.cd],['พลัง',s.passive||['taunt','guard','intercept','evade','stealth','clones','summon','greatSummon','spirit','greatSpirit','crow','smoke'].includes(s.type)?null:s.power??s.damage??s.heal]].filter(([,v])=>v!=null).map(([k,v])=>`<div><dt>${k}</dt><dd>${round(v)}</dd></div>`).join('')}</dl></article>`).join('')}</div>`;
 paintAdminSkills($('view'),classId,defs);
}
function render(withFilters=true){
 if(withFilters)filters();pageHead();
 if(tab==='skills'&&skillSet==='live'){currentSkills();return;}
 if(tab==='table'){$('view').innerHTML=skillTable();paintAdminSkills($('view'),tableView==='compare'?classId:tableView);return;}
 if(tab==='evidence'){evidenceTab();return;}if(tab==='mail'){announcementTab();return;}if(tab==='players'){playersTab();return;}if(tab==='formula'){formulaTab();return;}if(tab==='drops'){dropsTab();return;}if(tab==='weather'){weatherTab();return;}if(tab==='boss'){bossTab();return;}if(tab==='mapbosses'){mapBossesTab();return;}
 const rows=rowsFor(),cols=columns(rows),cards=['skills','monsters'].includes(tab)&&viewMode==='cards';
 const undo=(r,i)=>`<button type="button" class="undo" data-undo="${i}" ${draft[r.group][r.key]?'':'hidden'} aria-label="คืนค่าเดิม ${esc(r.title)}">คืนค่า</button>`;
 const note=tab==='skills'?'<p class="admin-legacy-note">ชุดสกิลเดิมก่อนปรับระบบอาชีพ · ไม่ใช่ชุดสกิลปัจจุบันที่แสดงในเกม</p>':'';
 $('view').innerHTML=note+(cards?`<div class="admin-info-strip"><span>${rows.length} รายการ</span><small>แก้เฉพาะค่าที่ต้องการ แล้วกดบันทึกเข้าเกม · สีทองคือค่าที่ยังไม่บันทึก</small></div><div class="admin-entity-grid">${rows.map((r,i)=>`<article class="admin-entity-card" data-i="${i}"><header>${rowArt(r)}<div><h3>${esc(r.title)}</h3><small>${esc(r.sub)}</small></div></header><div class="admin-edit-fields">${cols.filter(f=>base(r,f)!=null||draft[r.group][r.key]?.[f]!==undefined).map(f=>`<label><span>${LABEL[f]??f}</span>${fieldInput(r,f)}</label>`).join('')}</div><footer>${undo(r,i)}</footer></article>`).join('')}</div>`:
 `<div class="scroll admin-data-scroll"><table><thead><tr><th class="l">ชื่อ</th>${cols.map(c=>`<th>${LABEL[c]??c}</th>`).join('')}<th></th></tr></thead><tbody>${rows.map((r,i)=>`<tr data-i="${i}"><td class="l"><span class="name">${rowArt(r)}<span><b>${esc(r.title)}</b><small>${esc(r.sub)}</small></span></span></td>${cols.map(f=>`<td>${base(r,f)==null&&draft[r.group][r.key]?.[f]===undefined?'<span class="na">—</span>':fieldInput(r,f)}</td>`).join('')}<td>${undo(r,i)}</td></tr>`).join('')}</tbody></table></div>`);
 $('view').querySelectorAll('[data-i]').forEach(el=>{const r=rows[+el.dataset.i];el.querySelectorAll('input[data-f]').forEach(inp=>inp.onchange=()=>{set(r,inp.dataset.f,inp.value);const edited=draft[r.group][r.key]?.[inp.dataset.f]!==undefined;inp.classList.toggle('edited',edited);if(!edited)inp.value=base(r,inp.dataset.f)??'';el.querySelector('.undo').hidden=!draft[r.group][r.key];});el.querySelector('.undo').onclick=()=>{delete draft[r.group][r.key];showCount();render(false);};});
 if(tab==='skills')paintAdminSkills($('view'),classId);if(tab==='monsters')paintAdminMonsters($('view'));showCount();
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
   return `<tr><td class="l"><span class="name">${rowArt({skill:true,artSlot:s.slot})}<span><b>${s.key} · ${esc(s.name)}</b><small>${ROLE[s.slot]} · ${esc(s.type)}</small></span></span></td><td>${num(s.cost)}</td><td>${num(s.cd)}</td><td>${num(s.radius??s.range)}</td><td>${num(s.duration)}</td>${lv.map(x=>`<td>${s.heal?'+'+num(x.heal):num(x.damage)}<small>${num(x.cd)} วิ</small></td>`).join('')}<td>${s.cost?num(p/s.cost):'—'}</td><td>${s.cd?num(p/s.cd):'—'}</td><td class="l req">${reqText(list,s.slot)}</td></tr>`;}).join('')}</tbody></table></div>`;}
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
  return `<tr class="mon"><td class="l" colspan="4"><b>${esc(name)}</b><small>${esc(mid)} · เบี้ย ${d.coins[0]}–${d.coins[1]}${d.sets?` · อุปกรณ์เซ็ทขั้น ${d.sets.tier}: หมวก/ผ้าคลุม/รองเท้า ${pct(d.sets.piece)}%${d.sets.armor?' · เสื้อ '+pct(d.sets.armor)+'%':''} (แบบตามอาชีพผู้ฆ่า · แก้ในโค้ด)`:''}</small></td><td><button type="button" class="undo" data-undo-drop="${esc(mid)}" ${over?'':'hidden'}>คืนค่า</button></td></tr>`+
  d.items.map(([id,now,n=1])=>{const b=dropBase(mid,id,now),edited=over?.[id]!==undefined,v=edited?over[id]:b;
   return `<tr><td class="l"><span class="name"><i class="ico sm" data-item="${esc(id)}" style="${iconStyle(id)}"></i><span><b>${esc(itemName(id))}</b><small>${esc(id)}</small></span></span></td><td>${pct(b)}%</td><td><input type="number" min="0" max="100" step="any" data-mid="${esc(mid)}" data-id="${esc(id)}" value="${pct(v)}" class="${edited?'edited':''}" aria-label="${esc(name)} ${esc(itemName(id))} %" title="ค่าเดิม ${pct(b)}%"></td><td>×${n}</td><td></td></tr>`;}).join('');}).join('')||'<tr><td class="l" colspan="5">ไม่พบ</td></tr>'}</tbody></table></div>`;
 $('view').querySelectorAll('tr.mon td:first-child').forEach((cell,i)=>{const index=MONSTER_TYPES.findIndex((m,k)=>monsterKey(m,k)===list[i].mid);if(index>=0){const image=document.createElement('img');image.className='admin-monster-art';image.dataset.monsterArt=index;image.alt=list[i].name;cell.prepend(image);}});paintAdminMonsters($('view'));
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
 const it=itemDef(id);if(!it)return '';
 const grade=it.rainbow?'เซ็ทบอส · กรอบรุ้ง':it.graded?'เกรด'+GRADES[it.grade??0].name:'',setLine=it.set?'ชุด'+familyName(it.set.family)+' ขั้น '+it.set.tier:it.bossSet?'เซ็ทบอส'+BOSS_SETS[it.bossSet].name:'';
 const stats=Object.entries(STAT).filter(([k])=>typeof it[k]==='number').map(([k,n])=>`<li><span>${n}</span><b>${it[k].toLocaleString('th-TH')}</b></li>`).join('');
 const bonus=Object.entries(it.bonus??it.effect?.bonus??{}).map(([k,v])=>`<li><span>${esc(k.toUpperCase())}</span><b>+${v}</b></li>`).join('');
 const sub=[KIND[it.kind]??it.kind,it.slot&&(SLOT[it.slot]??it.slot),it.classes?.map(c=>className(c)).join(', ')].filter(Boolean).map(esc).join(' · ');
 return `<div class="tip-head"><i class="ico" style="${iconStyle(id)}"></i><div><b>${esc(it.name)}</b><small>${sub}</small></div></div>${grade||setLine?`<p class="tip-grade">${esc([grade,setLine,it.look?'แบบ'+lookName(it.look):''].filter(Boolean).join(' · '))}</p>`:''}${it.text?`<p>${esc(it.text)}</p>`:''}${stats||bonus?`<ul>${stats}${bonus}</ul>`:''}<small class="tip-id">${esc(id)}</small>`;
}
const tip=$('tip');let tipFor=null;
function placeTip(x,y){const w=tip.offsetWidth,h=tip.offsetHeight;tip.style.left=Math.max(8,Math.min(innerWidth-w-8,x+14))+'px';tip.style.top=(y+14+h>innerHeight?Math.max(8,y-h-10):y+14)+'px';}
document.addEventListener('pointerover',e=>{const el=e.target.closest?.('[data-item]');if(!el){tip.hidden=true;tipFor=null;return;}if(el.dataset.item!==tipFor){tipFor=el.dataset.item;tip.innerHTML=tipHTML(tipFor);}tip.hidden=false;placeTip(e.clientX,e.clientY);});
document.addEventListener('pointermove',e=>{if(!tip.hidden)placeTip(e.clientX,e.clientY);});
document.addEventListener('scroll',()=>{tip.hidden=true;tipFor=null;},true);
const resetUI=createAdminResetUI({container:$('account-actions'),fetchAdmin:adminFetch,canUse:()=>!!fbConn?.auth.currentUser&&ALLOWED_ADMINS.includes((fbConn.auth.currentUser.email??'').toLowerCase())});
async function initAdminAuthGate(){
 const gate=$('auth-gate'),app=$('app-shell');
 if(!gate||!app){
  tabs();render();warmFirebase();
  return;
 }
 const msg=$('gate-msg'),btnLogin=$('btn-login-google'),btnLogout=$('btn-logout'),badge=$('admin-user-badge');

 function lock(msgHtml){
  resetUI.syncVisibility();
  app.hidden=true;
  app.style.display='none';
  gate.hidden=false;
  gate.style.display='flex';
  document.body.style.overflow='hidden';
  if(msg&&msgHtml)msg.innerHTML=msgHtml;
 }
 function unlock(user){
  gate.hidden=true;
  gate.style.display='none';
  app.hidden=false;
  app.style.display='grid';
  document.body.style.overflow='';
  if(badge)badge.textContent='👤 '+user.email;
  resetUI.syncVisibility();
  tabs();
  render();
 }

 // Dev server on this machine: no Google gate (the local API already trusts loopback); the live site always gates.
 if(LOCAL){unlock({email:'localhost'});warmFirebase();return;}
 lock('กำลังเตรียมระบบความปลอดภัย…');

 try{
  const m=await import('./firebase-client.js');
  fbConn=await m.deadline(m.connectFirebase(),15000);
  fbWarm=Promise.resolve(fbConn);

  fbConn.auth.onAuthStateChanged(user=>{
   const email=(user?.email||'').toLowerCase().trim();
   if(user&&email&&ALLOWED_ADMINS.includes(email)){
    unlock(user);
   }else if(user){
    lock(`<span style="color:var(--bad)">⛔ บัญชี <b>${user.email}</b> ไม่มีสิทธิ์เข้าถึงหน้านี้<br>(อนุญาตเฉพาะแอดมิน: ${ALLOWED_ADMINS.join(', ')})</span>`);
    fbConn.sdk.signOut(fbConn.auth).catch(()=>{});
   }else{
    lock('กรุณาเข้าสู่ระบบด้วย Google (Gmail)');
   }
  });
 }catch(e){
  lock('ไม่สามารถเชื่อมต่อระบบความปลอดภัย Firebase ได้ กรุณารีเฟรชหน้าเว็บ');
 }

 if(btnLogin){
  btnLogin.onclick=async()=>{
   if(!fbConn){lock('กำลังเชื่อมต่อระบบ กรุณากดอีกครั้ง');return;}
   if(msg)msg.textContent='กำลังเปิดหน้าต่างล็อกอิน Google…';
   const provider=new fbConn.sdk.GoogleAuthProvider();
   provider.setCustomParameters({prompt:'select_account'});
   try{
    const res=await fbConn.sdk.signInWithPopup(fbConn.auth,provider);
    const email=(res.user?.email||'').toLowerCase().trim();
    if(res.user&&email&&ALLOWED_ADMINS.includes(email)){
     unlock(res.user);
    }else{
     lock(`<span style="color:var(--bad)">⛔ บัญชี <b>${res.user?.email||''}</b> ไม่มีสิทธิ์เข้าถึงหน้านี้</span>`);
     fbConn.sdk.signOut(fbConn.auth).catch(()=>{});
    }
   }catch(err){
    if(err.code!=='auth/popup-closed-by-user'){
     if(msg)msg.textContent='ล็อกอินไม่สำเร็จ: '+(err.message||err.code);
    }else{
     if(msg)msg.textContent='ยกเลิกการล็อกอิน';
    }
   }
  };
 }

 if(btnLogout){
  btnLogout.onclick=async()=>{
   if(fbConn)await fbConn.sdk.signOut(fbConn.auth);
   location.reload();
  };
 }
}

initAdminAuthGate();

// 0.99.16 players tab: who is online right now (from the realm server) and gifts of items or cowries.
// Production asks for a Google sign-in; the server only answers emails listed in ADMIN_EMAILS on Render.
async function adminFetch(path,body){
 const headers={'Content-Type':'application/json'};
 if(!LOCAL){if(!fbConn?.auth.currentUser)throw new Error('need-login');headers.Authorization='Bearer '+await fbConn.auth.currentUser.getIdToken();}
 const r=await fetch(API+path,{method:body?'POST':'GET',headers,body:body&&JSON.stringify(body)}),j=await r.json().catch(()=>({}));
 if(!r.ok)throw new Error(j.error??String(r.status));return j;
}
const ADMIN_ERRORS={'mailbox-full':'กล่องจดหมายเต็ม','player-online':'ผู้เล่นคนนี้เพิ่งเข้าเกม · กดรีเฟรชแล้วส่งใหม่','bag-full':'กระเป๋าผู้เล่นเต็ม · ส่งของน้อยลงหรือส่งเป็นเบี้ยแทน','character-not-found':'ไม่พบตัวละครนี้ในเซฟ','not-admin':'อีเมลนี้ไม่อยู่ในรายชื่อ ADMIN_EMAILS บน Render','admin-unset':'เซิร์ฟเวอร์ยังไม่เห็นค่า ADMIN_EMAILS · ตั้งที่ Render แล้วกด Save, rebuild and deploy','bad-token':'ตรวจการล็อกอิน Google ไม่ผ่าน · ออกแล้วล็อกอินใหม่','origin':'เปิดหน้านี้จากเว็บเกมเท่านั้น','player-offline':'ผู้เล่นออฟไลน์ไปแล้ว','bad-item':'ไม่มีไอเท็มนี้','bad-count':'จำนวนต้อง 1–999','bad-coins':'เบี้ยต้อง 0–10,000,000','nothing':'ยังไม่ได้เลือกของหรือใส่เบี้ย','need-login':'ต้องล็อกอิน Google ก่อน','github-unset':'เซิร์ฟเวอร์ยังไม่มี GITHUB_TOKEN (ตั้งที่ Render)','github-failed':'ส่งขึ้น GitHub ไม่สำเร็จ · ตรวจสิทธิ์ของ GITHUB_TOKEN','github-conflict':'ไฟล์บน GitHub เพิ่งเปลี่ยน · กดบันทึกอีกครั้ง','invalid':'ข้อมูลไม่ถูกต้อง'};
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
function autoRefresh(){clearInterval(refreshTimer);refreshTimer=setInterval(()=>{if(tab!=='players'||document.hidden)return;if(itemGrantSending||petGrantSending||document.activeElement?.closest?.('#give,.admin-pet-grant'))return;loadPlayers(true);},15000);}
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
 try{const r=await adminFetch('/admin/boss',{serverId:bx.serverId,channel:bx.channel,mapId:bx.mapId,typeId:+bx.typeId,count:bx.count,x:bx.spot?.x??null,y:bx.spot?.y??null});bossMsg=`👑 เสก ${r.name}${r.count>1?' ×'+r.count:''} ที่ ${r.map} แล้ว (จุด X ${r.x} · Y ${r.y}) · ประกาศทั้งเซิร์ฟแล้ว`;}
 catch(e){bossMsg={'boss-many':'แผนที่นี้มีบอสที่เสกไว้เยอะเกินไปแล้ว (สูงสุด 60 ตัว)','bad-spot':'จุดที่เลือกเดินไม่ได้ · ลองจิ้มบนพื้นสีเขียว','bad-map':'แผนที่นี้เสกบอสไม่ได้ (เมือง ดันเจี้ยน บ้านกิลด์)','bad-boss':'มอนตัวนี้ไม่ใช่บอส'}[e.message]??ADMIN_ERRORS[e.message]??'เสกไม่สำเร็จ · '+e.message;}
 bossTab();
}
async function loadMapBosses(){
 const request=++mapBossView.request;mapBossView.loading=true;mapBossView.message='กำลังอ่านสถานะจากเซิร์ฟเวอร์…';mapBossesTab();
 try{
  const result=await adminFetch('/admin/map-bosses?serverId='+encodeURIComponent(mapBossView.serverId)+'&channel='+mapBossView.channel);
  if(request!==mapBossView.request)return;mapBossView.rows=result.bosses;mapBossView.offset=result.serverTime-Date.now();mapBossView.message='สถานะจากเซิร์ฟเวอร์ · เวลาเกิดจะคงอยู่หลังออกแมพหรือรีสตาร์ต';
 }catch(e){if(request===mapBossView.request)mapBossView.message=ADMIN_ERRORS[e.message]??'อ่านสถานะไม่ได้: '+e.message;}
 finally{if(request===mapBossView.request){mapBossView.loading=false;if(tab==='mapbosses')mapBossesTab();}}
}
// 0.115.1 map bosses: one row per boss (picture, name and map together), numbers right-aligned, a coloured status
// badge, and three equal actions. The live status loads by itself the first time the page opens.
function mapBossesTab(){
 if(!mapBossView.rows&&!mapBossView.loading&&!mapBossView.tried){mapBossView.tried=true;loadMapBosses();return;}
 const rows=mapBossView.rows??WORLD_MAP_BOSSES.map(b=>({...b,drops:DROPS[b.id]?.items??[]}));
 const clock=Date.now()+mapBossView.offset;
 const status=b=>{const left=b.nextAt?Math.max(0,Math.ceil((b.nextAt-clock)/1000)):0;
  return b.alive===undefined?['idle',mapBossView.loading?'กำลังอ่าน…':'ยังไม่ทราบ']:b.alive?['ok','พร้อมต่อสู้']:left?['wait','เกิดใน '+Math.floor(left/60)+':'+String(left%60).padStart(2,'0')]:['wait','กำลังเกิด'];};
 const row=b=>{const t=MONSTER_TYPES.find(t=>t.id===b.id),art=MONSTER_TYPES.indexOf(t),[kind,text]=status(b);
  return `<tr><td><div class="mb-boss">${art>=0?`<img class="admin-monster-art" data-monster-art="${art}" alt="" width="64" height="64">`:''}<div><b>${esc(b.name)}</b><small>${esc(b.mapName)} · Lv.${b.minLevel}–${b.level}</small></div></div></td>
<td class="num"><b>${num(t?.hp??b.hp)}</b><small>ATK ${num(t?.damage)} · Lv.${num(t?.level??b.level)}</small></td>
<td><span class="mb-status ${kind}">${text}</span><small>เกิดใหม่ 60 นาทีหลังตาย</small></td>
<td><div class="mb-loot"><i class="ico sm" data-item="${esc(b.accessory)}" style="${iconStyle(b.accessory)}"></i><div><b>${esc(itemName(b.accessory))}</b><small>${esc(itemName(b.material))} ×5 · ตราบอส 8%</small></div></div></td>
<td><div class="mb-actions"><button type="button" data-mb-edit="${esc(b.id)}">ค่าบอส</button><button type="button" data-mb-drops="${esc(b.id)}">ดรอป</button><a href="assets/monsters-chapter2/animations/${esc(b.id)}-poses-v1.png" target="_blank" rel="noopener">ภาพท่า ↗</a></div></td></tr>`;};
 $('view').innerHTML=`<div class="map-boss-admin"><div class="mb-toolbar"><label>เซิร์ฟ <select id="mb-server">${['server-1','server-2'].map((id,i)=>`<option value="${id}"${mapBossView.serverId===id?' selected':''}>เซิร์ฟ ${i+1}</option>`).join('')}</select></label><label>CH <select id="mb-channel">${[1,2,3,4,5].map(c=>`<option${mapBossView.channel===c?' selected':''}>${c}</option>`).join('')}</select></label><button id="mb-refresh" type="button"${mapBossView.loading?' disabled':''}>↻ รีเฟรชสถานะ</button><p role="status">${esc(mapBossView.message||'')}</p></div>
<div class="scroll mb-scroll"><table class="mb-table"><thead><tr><th>บอส · แมพ</th><th class="num">HP · พลังโจมตี</th><th>สถานะ</th><th>ของประจำแมพ</th><th>จัดการ</th></tr></thead><tbody>${rows.map(row).join('')}</tbody></table></div>
<p class="mb-note">มอนทั่วไป ตัวพิเศษ และบอสเควสเดิมแยกจากบอสประจำแมพนี้ · เมืองปลอดภัยและดันเจี้ยนส่วนตัวไม่มีบอสประจำแมพเกิดอัตโนมัติ</p></div>`;
 paintAdminMonsters($('view'));
 const scope=()=>{mapBossView.serverId=$('mb-server').value;mapBossView.channel=+$('mb-channel').value;mapBossView.rows=null;loadMapBosses();};
 $('mb-server').onchange=scope;$('mb-channel').onchange=scope;$('mb-refresh').onclick=loadMapBosses;
 $('view').querySelectorAll('[data-mb-edit],[data-mb-drops]').forEach(b=>b.onclick=()=>{tab=b.dataset.mbEdit?'monsters':'drops';query=b.dataset.mbEdit??b.dataset.mbDrops;monsterKind='all';remember();tabs();render();});
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
 const chPick=document.createElement('label');chPick.textContent='CH ';const select=document.createElement('select');select.id='bx-channel';
 for(let c=1;c<=5;c++){const o=document.createElement('option');o.value=String(c);o.textContent='CH '+c;o.selected=c===bx.channel;select.append(o);}select.onchange=()=>bx.channel=+select.value;chPick.append(select);$('view').querySelector('.wx-pick')?.append(chPick);
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
 const picks=Object.keys(ITEMS).filter(id=>!legacyPetItem(id)&&!['ui','reserved'].includes(ITEMS[id].kind)&&(itemKind==='all'||kindOf(id)===itemKind)&&(itemKind!=='gear'||gearMatch(ITEMS[id],giftGear,pickedLook()))&&(!itemQuery||itemName(id).includes(itemQuery))).sort((a,b)=>itemName(a).localeCompare(itemName(b),'th'));
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
  const petDraft=petGrantDrafts.get(p.id)??{gems:0,pet:null};petGrantDrafts.set(p.id,petDraft);petDraft.pane=giftPane;
  const bag=Object.entries(p.items).filter(([id,n])=>n>0&&ITEMS[id]).map(([id,n])=>`<span class="cell" title="${esc(itemName(id))} ×${n}">${pic(id,n)}</span>`).join('')||'<span class="hint">ว่าง</span>';
  const quick=QUICK.map(([id,n],i)=>`<button type="button" class="qbtn" data-quick="${i}">${id==='coins'?`<i class="ico" style="${iconStyle('cowrie')}"></i>`:`<i class="ico" data-item="${esc(id)}" style="${iconStyle(id)}"></i>`}<span>+${id==='coins'?n.toLocaleString('th-TH')+' เบี้ย':esc(itemName(id))+' ×'+n}</span></button>`).join('');
  const lines=basket.map((l,i)=>`<li>${pic(l.id)}<span>${esc(itemName(l.id))}</span><b>×${l.count}</b><button type="button" data-drop="${i}" aria-label="เอาออก">×</button></li>`).join('')+(giftCoins?`<li><i class="ico" style="${iconStyle('cowrie')}"></i><span>เบี้ย</span><b>${giftCoins.toLocaleString('th-TH')}</b><button type="button" data-drop="coins" aria-label="เอาออก">×</button></li>`:'');
  gift=`<nav class="admin-gift-tabs" aria-label="ประเภทของที่จะมอบ"><button type="button" data-gift-pane="pets" aria-pressed="${giftPane==='pets'}">สัตว์เลี้ยงและทองแท่ง</button><button type="button" data-gift-pane="items" aria-pressed="${giftPane==='items'}">กระเป๋าและไอเท็ม</button></nav><form id="give" ${giftPane==='pets'?'hidden':''}><div class="ghead">${face(p)}<div><h3>${esc(p.name)}</h3><small>${esc(className(p.classId))} · Lv.${p.level} · ${p.coins.toLocaleString('th-TH')} เบี้ย</small> ${state(p)}</div></div>`+
   (p.offline?'<p class="hint offline-note">ผู้เล่นออฟไลน์อยู่ · ของที่ส่งจะเข้าจดหมาย ให้ผู้เล่นกดรับเมื่อเข้าเกม</p>':'')+
   `<h4>กระเป๋า</h4><div class="grid bag">${bag}</div>`+
   `<h4>ส่งด่วน</h4><div class="quick">${quick}</div>`+
   `<h4>เลือกไอเท็ม <small>แตะรูปเพื่อใส่ในรายการ · จำนวนต่อครั้ง</small> <input id="give-count" type="number" min="1" max="999" value="${pickCount}" aria-label="จำนวนต่อครั้ง"></h4>`+
   `<div class="kinds">${KINDS.map(([k,n])=>`<button type="button" data-kind="${k}" class="${k===itemKind?'on':''}">${n}</button>`).join('')}<input id="item-search" type="search" placeholder="🔍 ชื่อไอเท็ม" value="${esc(itemQuery)}"></div>`+
   // equipment split per class (items.js `classes`); gear without `classes` fits everyone
   (itemKind==='gear'?gearFilterHTML(giftGear,{autoName:lookName(gearLook(p.classId,p.gender)),grade:true}):'')+
   `<p class="pick-count">พบ ${picks.length.toLocaleString('th-TH')} ชิ้น${picks.length>shownPicks?' · แสดง '+shownPicks:''}</p>`+
   `<div class="grid pick">${picks.slice(0,shownPicks).map(id=>{const gid=gradeId(id);return `<button type="button" class="cell" data-add="${esc(gid)}" title="${esc(itemName(gid))}">${pic(gid)}<small>${esc(itemName(gid))}</small></button>`;}).join('')||'<span class="hint">ไม่พบไอเท็ม · ลองเปลี่ยนตัวกรอง</span>'}</div>`+
   (picks.length>shownPicks?`<button type="button" id="more-picks" class="more">แสดงเพิ่ม (อีก ${(picks.length-shownPicks).toLocaleString('th-TH')} ชิ้น)</button>`:'')+
   `<div class="sendbar"><h4>รายการที่จะส่ง</h4><ul class="basket">${lines||'<li class="empty">ยังว่าง · แตะรูปไอเท็มหรือปุ่มส่งด่วน</li>'}</ul>`+
   `<label class="coins">+ เบี้ย <input id="give-coins" type="number" min="0" max="10000000" value="${giftCoins}"></label>`+
   `<button type="submit" class="primary send"${!basket.length&&!giftCoins?' disabled':''}>🎁 ส่งให้ ${esc(p.name)}</button></div></form>`+
   petGrantHTML(p,petDraft,petGrantSending);
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
 $('view').querySelectorAll('[data-gift-pane]').forEach(b=>b.onclick=()=>{giftPane=b.dataset.giftPane;playersTab();});
 if(p)bindPetGrant($('view'),{player:p,draft:petGrantDrafts.get(p.id),busy:petGrantSending,onSend:async()=>{
  if(petGrantSending)return;const draft=petGrantDrafts.get(p.id),payload={peer:p.id,gems:draft.gems,pet:draft.pet||null},signature=JSON.stringify(payload);
  if(!petGrantPending||petGrantPending.signature!==signature)petGrantPending={signature,id:crypto.randomUUID()};petGrantSending=true;playersTab();
  try{const r=await adminFetch('/admin/mail',{peer:payload.peer,attachments:{goldBars:payload.gems,pets:payload.pet?[payload.pet]:[]},requestId:petGrantPending.id});petGrantPending=null;draft.gems=0;draft.pet=null;adminMsg='ส่งสัตว์เลี้ยงและทองแท่งเข้าจดหมายเรียบร้อยแล้ว';}
  catch(e){adminMsg='ยังไม่สำเร็จ · '+e.message;}finally{petGrantSending=false;playersTab();}
 }});
 const form=$('give');if(!form)return;
 const keep=()=>{giftCoins=Math.max(0,Math.min(1e7,Math.floor(Number($('give-coins').value)||0)));pickCount=Math.max(1,Math.min(999,Math.floor(Number($('give-count').value)||1)));};
 const addItem=(id,count)=>{const line=basket.find(l=>l.id===id);if(line)line.count=Math.min(999,line.count+count);else if(basket.length<20)basket.push({id,count});};
 form.querySelectorAll('[data-quick]').forEach(b=>b.onclick=()=>{keep();const [id,n]=QUICK[+b.dataset.quick];if(id==='coins')giftCoins=Math.min(1e7,giftCoins+n);else addItem(id,n);playersTab();});
 form.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>{keep();addItem(b.dataset.add,pickCount);playersTab();});
 form.querySelectorAll('[data-kind]').forEach(b=>b.onclick=()=>{keep();itemKind=b.dataset.kind;shownPicks=60;playersTab();});
 bindGearFilter(form,giftGear,()=>{keep();shownPicks=60;playersTab();});
 on('more-picks','onclick',()=>{keep();shownPicks+=120;playersTab();});
 form.querySelectorAll('[data-drop]').forEach(b=>b.onclick=()=>{keep();if(b.dataset.drop==='coins')giftCoins=0;else basket.splice(+b.dataset.drop,1);playersTab();});
 refocus('item-search',v=>{keep();itemQuery=v.trim();shownPicks=60;});
 on('give-coins','onchange',()=>{keep();playersTab();});on('give-count','onchange',keep);
 form.onsubmit=async e=>{e.preventDefault();if(itemGrantSending)return;keep();itemGrantSending=true;const send=form.querySelector('.send');send.disabled=true;send.textContent='กำลังส่ง…';
  try{const payload={peer:p.id,coins:giftCoins,items:basket},signature=JSON.stringify(payload);if(!itemGrantPending||itemGrantPending.signature!==signature)itemGrantPending={signature,id:crypto.randomUUID()};const r=await adminFetch('/admin/mail',{peer:payload.peer,attachments:{coins:payload.coins,items:payload.items},requestId:itemGrantPending.id});adminMsg='✔ ส่งเข้าจดหมายของ '+r.name+' แล้ว';basket=[];giftCoins=0;itemGrantPending=null;}
  catch(e){adminMsg=ADMIN_ERRORS[e.message]??'ส่งไม่สำเร็จ · '+e.message;}finally{itemGrantSending=false;}
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

function announcementTab(){
 warmFirebase();const d=announcementDraft;
 $('view').innerHTML=`<section class="admin-announcement"><small>PLAYER MAIL</small><h2>ประกาศจากทีมงาน</h2><p>ส่งเข้าจดหมายของผู้เล่นทั้งออนไลน์และออฟไลน์ · ฉบับนี้ไม่มีของแนบ</p><form id="announcement-form"><label>ผู้รับ<select id="announcement-scope"><option value="all">ทุกเซิร์ฟเวอร์</option><option value="server-1">เซิร์ฟเวอร์ 1</option><option value="server-2">เซิร์ฟเวอร์ 2</option></select></label><label>หัวเรื่อง<input id="announcement-title" maxlength="100" required value="${esc(d.title)}"></label><label>ข้อความ<textarea id="announcement-body" maxlength="4000" rows="9" required>${esc(d.body)}</textarea></label><aside><small>ตัวอย่างจดหมาย · ทีมงานอโยธยา</small><h3 id="announcement-preview-title"></h3><p id="announcement-preview-body"></p></aside><button type="submit" class="primary" ${d.busy?'disabled':''}>${d.busy?'กำลังส่ง…':'ส่งประกาศเข้าจดหมาย'}</button><p role="status">${esc(d.message)}</p></form></section>`;
 $('announcement-scope').value=d.serverId;
 const keep=()=>{d.title=$('announcement-title').value;d.body=$('announcement-body').value;d.serverId=$('announcement-scope').value;$('announcement-preview-title').textContent=d.title;$('announcement-preview-body').textContent=d.body;};keep();
 for(const id of ['announcement-scope','announcement-title','announcement-body'])$(id).oninput=keep;
 $('announcement-form').onsubmit=async e=>{e.preventDefault();if(d.busy)return;keep();const payload={peer:'all',title:d.title,body:d.body,serverId:d.serverId},signature=JSON.stringify(payload);if(!d.pending||d.pending.signature!==signature)d.pending={signature,id:crypto.randomUUID()};d.busy=true;d.message='';announcementTab();try{await adminFetch('/admin/mail',{...payload,requestId:d.pending.id});d.message='ส่งประกาศเข้าจดหมายเรียบร้อยแล้ว';d.title='';d.body='';d.pending=null;}catch(e){d.message=ADMIN_ERRORS[e.message]??'ยังไม่สำเร็จ · '+e.message;}finally{d.busy=false;announcementTab();}};
}
