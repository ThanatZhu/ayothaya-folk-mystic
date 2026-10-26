import {multiplayerURL} from './multiplayer-config.js?v=28';
import {CHANNELS} from './realm-state.js?v=21';
import {connectFirebase, deadline} from './firebase-client.js';
import {costExpenseDraft,monthlyBillableCosts,financeDay} from './dashboard-finance172.js';
import {saveSlip,getSlip,deleteSlip,exportSlips,importSlips,uploadSlip,setSlipCloud} from './dashboard-slips.js?v=2';

export const ALLOWED_ADMINS = ['chokkungfn@gmail.com'];
export const DO_SERVER_URL = 'https://hammerhead-app-nhswh.ondigitalocean.app';

const $=id=>document.getElementById(id);
const URL_KEY='ayothaya-dashboard-url-v3';
const COSTS_KEY='ayothaya-dashboard-costs-v1';
const RATE_KEY='ayothaya-dashboard-usd-rate-v1';
// USD -> THB: typing a dollar price fills the baht price with this rate (editable on the page, saved on this device)
let usdRate=Number(localStorage.getItem(RATE_KEY))||34;
const toThb=usd=>Math.round(Math.max(0,Number(usd)||0)*usdRate);
const LEDGER_KEY='ayothaya-dashboard-ledger-v1';

const MAP_NAMES={
 'ayothaya':'พระนครศรีอยุธยา (เมืองหลวง)',
 'rice-fields':'ทุ่งขวัญข้าว (ชานเมือง)',
 'FloatingMarket':'ตลาดน้ำอโยธยา',
 'JungleRuins':'ป่ารกและเทวสถานร้าง',
 'lavo':'เมืองละโว้',
 'sukhothai':'เมืองสุโขทัย',
 'ancient-temple':'วัดโบราณริมน้ำ',
 'old-orchard':'สวนหมากคลองเก่า',
 'moonlit-mill':'โรงสีใต้เงาจันทร์',
 'lotus-marsh':'บึงบัวต้องมนตร์',
 'mill-cellar':'ดันเจี้ยนใต้ถุนโรงสี',
 'guild-hall':'ป้อมและห้องโถงกิลด์'
};

const CAT_LABELS={
 join:'เข้าเกม',
 leave:'ออกเกม',
 channel:'ย้ายแนล/แมพ',
 chat:'แชต',
 mvp:'บอส MVP',
 trade:'แลกเปลี่ยน',
 market:'ตั้งร้าน/ตีบวก',
 guild:'กิลด์'
};

const DEFAULT_COSTS=[
 {id:'c-do',name:'DigitalOcean App Platform (Basic)',category:'เซิร์ฟเวอร์ (Hosting)',role:'รันเซิร์ฟเวอร์เกม Multiplayer 24 ชม. (1 เซิร์ฟ 5 แนล) · ได้ Bandwidth 50 GB/เดือน',cycle:'monthly',usd:5,thb:170,status:'active'},
 {id:'c-vercel',name:'Vercel (หน้าเว็บเกมหลัก)',category:'หน้าเว็บ (Frontend)',role:'โฮสต์ตัวเกม HTML/JS, แผนที่ และภาพสไปรต์ · ฟรี Bandwidth 100 GB/เดือน',cycle:'free',usd:0,thb:0,status:'free'},
 {id:'c-firebase',name:'Google Firebase (Auth + Firestore)',category:'ฐานข้อมูล (Database)',role:'ระบบล็อกอิน Google + เซฟตัวละคร 5 ช่อง (ฟรีอ่าน 50,000 ครั้ง/วัน)',cycle:'free',usd:0,thb:0,status:'free'},
 {id:'c-github',name:'GitHub Repository',category:'พัฒนาเกม / อาร์ต / AI',role:'เก็บโค้ดต้นฉบับและเชื่อมระบบอัปเดตอัตโนมัติขึ้นเซิร์ฟเวอร์',cycle:'free',usd:0,thb:0,status:'free'},
 {id:'c-render',name:'Render Free Tier (เซิร์ฟเวอร์เก่า)',category:'เซิร์ฟเวอร์ (Hosting)',role:'เซิร์ฟเวอร์เดิมที่โควตาฟรี 5 GB เต็มแล้ว (ย้ายมาใช้ DigitalOcean แทน)',cycle:'free',usd:0,thb:0,status:'paused'},
 {id:'c-ai',name:'ค่าเครื่องมือ AI / อาร์ตเวิร์ก / เสียงประกอบ',category:'พัฒนาเกม / อาร์ต / AI',role:'ต้นทุนทำภาพสไปรต์ ฉากหลัง และระบบโค้ด (แก้ไขยอดตามที่จ่ายจริงได้)',cycle:'once',usd:0,thb:0,status:'optional'},
 {id:'c-domain',name:'ค่าจดโดเมนเนมส่วนตัว (.com / .gg)',category:'โดเมน / อื่นๆ',role:'ชื่อเว็บไซต์ส่วนตัว (ไม่บังคับ · ใช้ลิงก์ .vercel.app ฟรีได้ตลอด)',cycle:'yearly',usd:10,thb:350,status:'optional'}
];

const DEFAULT_LEDGER=[
 {id:'tx-1',type:'expense',date:new Date().toISOString().slice(0,10),category:'ค่าเซิร์ฟเวอร์ (DigitalOcean/Render)',title:'ตั้งงบเซิร์ฟเวอร์ DigitalOcean App Platform (50 GB)',amount:170,note:'แพ็กเกจ $5/เดือน เปิดเซิร์ฟเวอร์ 24 ชม. รองรับ 1 เซิร์ฟ 5 แนล'}
];

function defaultHttpUrl(){
 const saved=localStorage.getItem(URL_KEY);
 if(saved&&!saved.includes('onrender.com')&&!saved.includes('vercel.app'))return saved.replace(/\/+$/,'');
 const ws=multiplayerURL();
 if(ws&&!ws.includes('onrender.com')&&!ws.includes('vercel.app'))return ws.replace(/^wss:/,'https:').replace(/^ws:/,'http:').replace(/\/realtime\/?$/,'');
 return DO_SERVER_URL;
}

let serverUrl=defaultHttpUrl();
if($('srv-url-input'))$('srv-url-input').value=serverUrl;
if($('tx-date'))$('tx-date').value=financeDay();
setTimeout(renderLogs, 0);

const LOG_STORAGE_KEY='ayothaya-dashboard-logs-cache-v1';
function loadCachedLogs(){
 try{const r=localStorage.getItem(LOG_STORAGE_KEY);return r?JSON.parse(r):[];}catch{return [];}
}
function saveCachedLogs(logs){
 try{localStorage.setItem(LOG_STORAGE_KEY,JSON.stringify(logs.slice(0,300)));}catch{}
}

let currentLogFilter='all';
let currentTxFilter='all';
let liveLogs=loadCachedLogs();
let liveChannels=CHANNELS.map(c=>({channel:c.id,name:c.name,subtitle:c.subtitle,players:0}));
let liveRooms=[];

function formatBytes(bytes){
 if(!Number.isFinite(bytes)||bytes<=0)return '0 MB';
 const mb=bytes/(1024*1024);
 if(mb<1024)return mb.toFixed(2)+' MB';
 return (mb/1024).toFixed(3)+' GB';
}

function formatUptime(sec){
 if(!Number.isFinite(sec)||sec<=0)return '-';
 const h=Math.floor(sec/3600),m=Math.floor((sec%3600)/60);
 return h>0?`${h} ชม. ${m} นาที`:`${m} นาที`;
}

function formatMoney(n){
 return Number(n||0).toLocaleString('th-TH',{minimumFractionDigits:0,maximumFractionDigits:2})+' ฿';
}

// 1. Live Server & Logs
function renderServerPanel(data){
 const totalPlayers=data?.totalPlayers??0;
 const rooms=data?.rooms??[];
 const uptime=data?.uptimeSeconds??0;
 const bw=data?.bandwidth??{bytesSent:0,messagesSent:0};

 $('kpi-players').textContent=`${totalPlayers} คน`;
 $('kpi-rooms').textContent=`ห้องที่เปิดอยู่: ${rooms.length} ห้อง · อัปไทม์: ${formatUptime(uptime)}`;

 const bytes=bw.bytesSent||0;
 const hours=Math.max(uptime/3600,1/60);
 const mbPerHour=(bytes/(1024*1024))/hours;
 const doQuotaBytes=50*1024*1024*1024;
 const pct=Math.min(100,(bytes/doQuotaBytes)*100);
 $('kpi-bandwidth').textContent=formatBytes(bytes);
 $('kpi-bw-bar').style.width=Math.max(pct,bytes>0?2:0)+'%';
 $('kpi-bw-sub').textContent=`อัตราเฉลี่ย: ~${mbPerHour.toFixed(1)} MB/ชม. · ใช้ไป ${pct.toFixed(2)}% ของโควตา 50 GB`;

 liveChannels=data?.channels??CHANNELS.map(c=>({channel:c.id,name:c.name,subtitle:c.subtitle,players:0}));
 const chWrap=$('channel-cards');
 chWrap.replaceChildren();
 for(const ch of CHANNELS){
  const found=liveChannels.find(x=>x.channel===ch.id);
  const count=found?.players??0;
  const card=document.createElement('div');
  card.className='ch-card'+(count>0?' has-players':'');
  card.innerHTML=`<div><strong>${ch.name}</strong><small>${ch.subtitle}</small></div><span class="ch-badge">${count} คน</span>`;
  chWrap.append(card);
 }

 liveRooms=rooms;
 const roomList=$('active-room-list');
 roomList.replaceChildren();
 if(!liveRooms.length){
  const li=document.createElement('li');
  li.innerHTML='<span style="color:var(--muted)">ยังไม่มีผู้เล่นออนไลน์ในขณะนี้</span><span>0 คน</span>';
  roomList.append(li);
 }else{
  for(const r of liveRooms){
   const li=document.createElement('li');
   const mapLabel=MAP_NAMES[r.mapId]||r.mapId;
   li.innerHTML=`<span><b>แนล ${r.channel||1}</b> · ${mapLabel}</span><span class="txt-jade">${r.players} คน</span>`;
   roomList.append(li);
  }
 }

 if(Array.isArray(data?.logs)){
  const map=new Map();
  for(const l of liveLogs)if(l&&l.id)map.set(l.id,l);
  for(const l of data.logs)if(l&&l.id)map.set(l.id,l);
  liveLogs=[...map.values()].sort((a,b)=>(b.time||0)-(a.time||0)).slice(0,250);
  saveCachedLogs(liveLogs);
 }
 renderLogs();
}

function renderLogs(){
 const box=$('log-list');
 box.replaceChildren();
 const filtered=liveLogs.filter(item=>{
  if(currentLogFilter==='all')return true;
  if(currentLogFilter==='join')return ['join','leave','channel'].includes(item.category);
  if(currentLogFilter==='market')return ['market','trade'].includes(item.category);
  return item.category===currentLogFilter;
 });
 $('log-count-badge').textContent=`${filtered.length} รายการ`;
 if(!filtered.length){
  const empty=document.createElement('p');
  empty.style.color='var(--muted)';
  empty.style.margin='8px 4px';
  empty.textContent='ยังไม่มีล็อกในหมวดนี้ (กดปุ่ม "จำลองล็อกทดสอบ" ด้านบนเพื่อดูตัวอย่างได้ครับ)';
  box.append(empty);
  return;
 }
 for(const item of filtered){
  const row=document.createElement('div');
  row.className='log-row';
  row.dataset.cat=item.category||'info';
  const timeStr=new Date(item.time||Date.now()).toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
  const tag=CAT_LABELS[item.category]||item.category||'ระบบ';
  row.innerHTML=`<time>${timeStr}</time><span class="log-tag">${tag}</span><span></span>`;
  row.lastChild.textContent=item.text||'';
  box.append(row);
 }
}

async function pollServer(){
 const cleanUrl=serverUrl.trim().replace(/\/+$/,'');
 if(!cleanUrl)return;
 try{
  const res=await fetch(cleanUrl+'/dashboard',{cache:'no-store'});
  if(res.ok){
   const data=await res.json();
   $('srv-dot').dataset.state='online';
   $('srv-status-title').textContent='เชื่อมต่อเซิร์ฟเวอร์สำเร็จ · ออนไลน์ปกติ';
   $('srv-status-sub').textContent=`URL: ${cleanUrl} · 1 เซิร์ฟเวอร์หลัก 5 แนล (Delta + Deflate ทำงานอยู่)`;
   renderServerPanel(data);
   return;
  }
  const health=await fetch(cleanUrl+'/health',{cache:'no-store'});
  if(health.ok){
   const h=await health.json();
   $('srv-dot').dataset.state='online';
   $('srv-status-title').textContent='เซิร์ฟเวอร์ออนไลน์ (รันเวอร์ชันก่อนมี /dashboard)';
   $('srv-status-sub').textContent=`URL: ${cleanUrl} · ออนไลน์ ${h.players||0} คน`;
   renderServerPanel({totalPlayers:h.players||0,rooms:Array.from({length:h.rooms||0},(_,i)=>({channel:1,mapId:'ayothaya',players:h.players||0})),uptimeSeconds:60,bandwidth:{bytesSent:0},logs:liveLogs});
   return;
  }
  throw new Error('bad-status');
 }catch{
  $('srv-dot').dataset.state='offline';
  $('srv-status-title').textContent='ยังไม่ได้เชื่อมต่อเซิร์ฟเวอร์จริง (แสดงโหมดออฟไลน์/จำลอง)';
  $('srv-status-sub').textContent=`ไม่สามารถติดต่อ ${cleanUrl} ได้ · หากเพิ่งย้ายไป DigitalOcean กรุณาวางลิงก์แอปด้านขวา`;
 }
}

$('srv-url-form').onsubmit=e=>{
 e.preventDefault();
 let val=$('srv-url-input').value.trim().replace(/\/+$/,'');
 if(val.includes('vercel.app')){
  alert('https://ayothaya-folk-mystic.vercel.app คือหน้าเว็บ ไม่ใช่เซิร์ฟเวอร์เกมครับ ระบบจะเปลี่ยนเป็นเซิร์ฟเวอร์ DigitalOcean ให้อัตโนมัติ');
  val=DO_SERVER_URL;
  $('srv-url-input').value=DO_SERVER_URL;
 }
 serverUrl=val||DO_SERVER_URL;
 localStorage.setItem(URL_KEY,serverUrl);
 pollServer();
};

$('btn-demo-logs').onclick=()=>{
 const now=Date.now();
 const demoLogs=[
  {id:'d1',time:now-95000,category:'join',text:'ขุนแผน เข้าสู่ แนล 1 (ayothaya)'},
  {id:'d2',time:now-80000,category:'join',text:'แม่หญิงจันทร์วาด เข้าสู่ แนล 1 (ayothaya)'},
  {id:'d3',time:now-65000,category:'chat',text:'[แนล 1 · ayothaya] ขุนแผน: ไปล่าบอสทุ่งนากันไหมครับทุกคน'},
  {id:'d4',time:now-50000,category:'channel',text:'หมอผีอิน ย้ายจาก แนล 1 ไป แนล 2 (rice-fields)'},
  {id:'d5',time:now-35000,category:'market',text:'แม่ค้าบัว ตั้งร้านซื้อขายที่ แนล 1 · ขายยันต์คุ้มภัย (150 อัฐ)'},
  {id:'d6',time:now-20000,category:'mvp',text:'ปราบ MVP ขุนศึกผีโบราณ สำเร็จที่ แนล 2 (rice-fields) โดย ขุนแผน'},
  {id:'d7',time:now-8000,category:'guild',text:'ขุนแผน ก่อตั้งกิลด์ "อยุธยาภักดี"'}
 ];
 liveLogs=demoLogs;
 renderServerPanel({
  totalPlayers:7,
  uptimeSeconds:5400,
  bandwidth:{bytesSent:19.4*1024*1024,messagesSent:46200},
  channels:[
   {channel:1,name:'แนล 1',subtitle:'อยุธยา · ริมเจ้าพระยา',players:4},
   {channel:2,name:'แนล 2',subtitle:'อยุธยา · แสงจันทร์',players:2},
   {channel:3,name:'แนล 3',subtitle:'อยุธยา · ตลาดน้ำ',players:1},
   {channel:4,name:'แนล 4',subtitle:'อยุธยา · ลานไทรทอง',players:0},
   {channel:5,name:'แนล 5',subtitle:'อยุธยา · ท่าเรือสำเภา',players:0}
  ],
  rooms:[
   {channel:1,mapId:'ayothaya',players:4},
   {channel:2,mapId:'rice-fields',players:2},
   {channel:3,mapId:'FloatingMarket',players:1}
  ],
  logs:demoLogs
 });
 $('srv-dot').dataset.state='online';
 $('srv-status-title').textContent='กำลังแสดงข้อมูลจำลอง (Demo Mode)';
 $('srv-status-sub').textContent='แสดงตัวอย่างการทำงานของ 1 เซิร์ฟเวอร์ 5 แนล และระบบล็อกในเกม';
};

document.querySelectorAll('[data-filter]').forEach(btn=>{
 btn.onclick=()=>{
  currentLogFilter=btn.dataset.filter;
  document.querySelectorAll('[data-filter]').forEach(b=>b.classList.toggle('active',b===btn));
  renderLogs();
 };
});

// 2. Project Cost Breakdown List (ลิสต์ต้นทุนว่าเสียเงินอะไรไปบ้าง)
function loadCosts(){
 try{
  const raw=localStorage.getItem(COSTS_KEY);
  if(raw){const parsed=JSON.parse(raw);if(Array.isArray(parsed))return parsed;}
 }catch{}
 return structuredClone(DEFAULT_COSTS);
}
function saveCosts(list){
 localStorage.setItem(COSTS_KEY,JSON.stringify(list));queueCloud();
}
let costs=loadCosts();

const CYCLE_LABELS={
 monthly:'รายเดือน (/เดือน)',
 yearly:'รายปี (/ปี)',
 once:'จ่ายครั้งเดียว',
 free:'ฟรีตลอดชีพ'
};
const STATUS_LABELS={
 active:'ใช้อยู่ (มีค่าใช้จ่าย)',
 free:'ใช้อยู่ (ฟรี 0 ฿)',
 optional:'ทางเลือก / ตามจริง',
 paused:'ยกเลิก / สำรอง'
};

function updateCostKpi(){
 let monthlyTotalThb=0,monthlyTotalUsd=0;
 for(const item of costs){
  if(item.status==='active'){
   if(item.cycle==='monthly'){monthlyTotalThb+=Number(item.thb||0);monthlyTotalUsd+=Number(item.usd||0);}
   else if(item.cycle==='yearly'){monthlyTotalThb+=Number(item.thb||0)/12;monthlyTotalUsd+=Number(item.usd||0)/12;}
  }
 }
 $('kpi-monthly-cost').textContent=`${formatMoney(Math.round(monthlyTotalThb))} / เดือน`;
 $('kpi-cost-sub').textContent=`คิดเป็น ~$${monthlyTotalUsd.toFixed(2)}/เดือน (เรท 1$ = ${usdRate}฿) · ประหยัดงบด้วย Vercel + Firebase ฟรี`;
}

const trText=s=>globalThis.I18N?.t?globalThis.I18N.t(String(s||'')):String(s||'');

function renderCosts(){
 const tbody=$('cost-tbody');
 tbody.replaceChildren();
 let monthlyTotalThb=0;
 let monthlyTotalUsd=0;

 for(const item of costs){
  if(item.status==='active'){
   if(item.cycle==='monthly'){monthlyTotalThb+=Number(item.thb||0);monthlyTotalUsd+=Number(item.usd||0);}
   else if(item.cycle==='yearly'){monthlyTotalThb+=Number(item.thb||0)/12;monthlyTotalUsd+=Number(item.usd||0)/12;}
  }
  const tr=document.createElement('tr');tr.dataset.costId=item.id;
  tr.innerHTML=`
   <td><input type="text" class="inline-text inp-name" aria-label="รายการต้นทุน / บริการ"></td>
   <td><input type="text" class="inline-text inp-payer" placeholder="ระบุชื่อผู้จ่าย..."></td>
   <td class="cost-cat-cell"></td>
   <td><input type="text" class="inline-text inp-role" aria-label="หน้าที่ในเกม"></td>
   <td>${CYCLE_LABELS[item.cycle]||item.cycle}</td>
   <td><span class="money-cell"><span class="money-unit">$</span><input type="number" step="0.01" min="0" class="inline-num inp-usd" value="${Number(item.usd||0)}"></span></td>
   <td><span class="money-cell"><input type="number" step="0.01" min="0" class="inline-num inp-thb" value="${Number(item.thb||0)}"><span class="money-unit">฿</span></span></td>
   <td>
    <select class="sel-status" style="padding:4px 8px;border-radius:8px;background:#13261f;border:1px solid #75907766;font-size:11px">
     <option value="active" ${item.status==='active'?'selected':''}>${STATUS_LABELS.active}</option>
     <option value="free" ${item.status==='free'?'selected':''}>${STATUS_LABELS.free}</option>
     <option value="optional" ${item.status==='optional'?'selected':''}>${STATUS_LABELS.optional}</option>
     <option value="paused" ${item.status==='paused'?'selected':''}>${STATUS_LABELS.paused}</option>
    </select>
   </td>
   <td><div class="cost-row-actions"><button type="button" class="btn-record-expense">ลงบัญชีรายจ่าย</button><button type="button" class="btn-del">ลบ</button></div></td>
  `;
  const nameInp=tr.querySelector('.inp-name');nameInp.value=trText(item.name);nameInp.onchange=e=>{item.name=e.target.value.trim()||item.name;saveCosts(costs);};
  const payerInp=tr.querySelector('.inp-payer');payerInp.value=item.payer||'';payerInp.onchange=e=>{item.payer=e.target.value.trim();saveCosts(costs);};
  tr.querySelector('.cost-cat-cell').textContent=item.category;
  const roleInp=tr.querySelector('.inp-role');roleInp.value=trText(item.role);roleInp.onchange=e=>{item.role=e.target.value.trim();saveCosts(costs);};

  const recordButton=tr.querySelector('.btn-record-expense');
  const updateRow=()=>{recordButton.disabled=!(Number.isFinite(Number(item.thb))&&Number(item.thb)>0);recordButton.title=recordButton.disabled?'ระบุยอดบาทมากกว่า 0 ก่อนลงบัญชี':'เตรียมรายการนี้ในแบบฟอร์มรายจ่าย';updateCostKpi();};
  recordButton.onclick=()=>{
   const draft=costExpenseDraft(item);
   for(const [key,value]of Object.entries(draft))$('tx-'+key).value=String(value);
   $('tx-date').value=financeDay();
   $('tx-status').textContent='ตรวจวันที่และยอดเงิน แล้วกดบันทึกรายการ';
   $('cost-ledger-status').textContent='เตรียมรายการในแบบฟอร์มรายจ่ายแล้ว';
   $('tx-form').scrollIntoView({behavior:'smooth',block:'center'});$('tx-amount').focus({preventScroll:true});
  };
  tr.querySelector('.inp-usd').oninput=e=>{item.usd=Math.max(0,Number(e.target.value||0));item.thb=toThb(item.usd);tr.querySelector('.inp-thb').value=item.thb;saveCosts(costs);updateRow();};
  // Keep the focused row in place: replacing it on blur used to swallow the following button click.
  tr.querySelector('.inp-usd').onchange=()=>{saveCosts(costs);updateRow();};
  tr.querySelector('.inp-thb').oninput=e=>{item.thb=Math.max(0,Number(e.target.value||0));saveCosts(costs);updateRow();};
  tr.querySelector('.sel-status').onchange=e=>{item.status=e.target.value;saveCosts(costs);updateRow();};
  updateRow();
  tr.querySelector('.btn-del').onclick=()=>{costs=costs.filter(c=>c.id!==item.id);saveCosts(costs);renderCosts();};
  tbody.append(tr);
 }

 $('kpi-monthly-cost').textContent=`${formatMoney(Math.round(monthlyTotalThb))} / เดือน`;
 updateCostKpi();
}

const rateEl=$('usd-rate');
if(rateEl){
 rateEl.value=usdRate;
 rateEl.onchange=e=>{
  const v=Number(e.target.value);
  if(v>0){
   usdRate=v;
   localStorage.setItem(RATE_KEY,String(usdRate));
   for(const c of costs){if(Number(c.usd)>0)c.thb=toThb(c.usd);}
   saveCosts(costs);
   renderCosts();
   if(Number($('cost-usd').value)>0)$('cost-thb').value=toThb($('cost-usd').value);
  }
 };
}

$('cost-usd').oninput=e=>{
 $('cost-thb').value=toThb(e.target.value);
};

$('cost-form').onsubmit=e=>{
 e.preventDefault();
 costs.push({
  id:'c-'+Date.now(),
  name:$('cost-name').value.trim(),
  payer:$('cost-payer')?.value.trim()||'',
  category:$('cost-category').value,
  role:$('cost-role').value.trim(),
  cycle:$('cost-cycle').value,
  usd:Math.max(0,Number($('cost-usd').value||0)),
  thb:Math.max(0,Number($('cost-thb').value||toThb($('cost-usd').value)||0)),
  status:$('cost-status').value
 });
 saveCosts(costs);
 renderCosts();
 $('cost-name').value='';
 if($('cost-payer'))$('cost-payer').value='';
 $('cost-role').value='';
 $('cost-usd').value='0';
 $('cost-thb').value='';
};

$('btn-reset-costs').onclick=()=>{
 costs=structuredClone(DEFAULT_COSTS);
 saveCosts(costs);
 renderCosts();
};

// 3. Revenue & Expense Ledger (ดูรายรับ ดูรายจ่าย)
function loadLedger(){
 try{
  const raw=localStorage.getItem(LEDGER_KEY);
  if(raw){const parsed=JSON.parse(raw);if(Array.isArray(parsed))return parsed;}
 }catch{}
 return structuredClone(DEFAULT_LEDGER);
}
function saveLedger(list){
 localStorage.setItem(LEDGER_KEY,JSON.stringify(list));queueCloud();
}
let ledger=loadLedger();
function ensureLedgerTypeVisible(type){
 if(currentTxFilter==='all'||currentTxFilter===type)return;
 currentTxFilter=type;
 document.querySelectorAll('[data-tx-filter]').forEach(b=>b.classList.toggle('active',b.dataset.txFilter===type));
}

function updateLedgerSummary(){
 let totalIncome=0,totalExpense=0;
 const byPayer=new Map();
 for(const tx of ledger){
  const amt=Number(tx.amount||0);
  if(tx.type==='income')totalIncome+=amt;
  else totalExpense+=amt;
  const who=(tx.payer||'').trim()||'ยังไม่ระบุชื่อ';
  const cur=byPayer.get(who)||{income:0,expense:0};
  if(tx.type==='income')cur.income+=amt;
  else cur.expense+=amt;
  byPayer.set(who,cur);
 }
 const net=totalIncome-totalExpense;
 $('kpi-total-income').textContent='+'+formatMoney(totalIncome);
 $('kpi-total-expense').textContent='-'+formatMoney(totalExpense);
 $('kpi-net-balance').textContent=(net>=0?'+':'')+formatMoney(net);
 $('kpi-net-balance').className='kpi-value '+(net>=0?'txt-jade':'txt-danger');
 $('ratio-income-label').textContent=`รายรับรวม: +${formatMoney(totalIncome)}`;
 $('ratio-expense-label').textContent=`รายจ่ายรวม: -${formatMoney(totalExpense)}`;
 const sum=totalIncome+totalExpense;
 $('ratio-income-bar').style.width=(sum>0?(totalIncome/sum)*100:50)+'%';
 const ps=$('payer-summary');
 if(ps){
  ps.replaceChildren();
  for(const [who,v] of byPayer.entries()){
   const chip=document.createElement('span');
   chip.className='payer-chip';
   const parts=[];
   if(v.expense>0)parts.push(`จ่าย -${formatMoney(v.expense)}`);
   if(v.income>0)parts.push(`รับ +${formatMoney(v.income)}`);
   chip.textContent=`👤 ${who}: ${parts.join(' · ')||'0 ฿'}`;
   ps.append(chip);
  }
 }
}

function renderLedger(){
 const tbody=$('tx-tbody');
 tbody.replaceChildren();
 let totalIncome=0;
 let totalExpense=0;

 for(const tx of ledger){
  if(tx.type==='income')totalIncome+=Number(tx.amount||0);
  else totalExpense+=Number(tx.amount||0);
 }

 const net=totalIncome-totalExpense;
 $('kpi-total-income').textContent='+'+formatMoney(totalIncome);
 $('kpi-total-expense').textContent='-'+formatMoney(totalExpense);
 $('kpi-net-balance').textContent=(net>=0?'+':'')+formatMoney(net);
 $('kpi-net-balance').className='kpi-value '+(net>=0?'txt-jade':'txt-danger');

 $('ratio-income-label').textContent=`รายรับรวม: +${formatMoney(totalIncome)}`;
 $('ratio-expense-label').textContent=`รายจ่ายรวม: -${formatMoney(totalExpense)}`;
 const sum=totalIncome+totalExpense;
 $('ratio-income-bar').style.width=(sum>0?(totalIncome/sum)*100:50)+'%';

 updateLedgerSummary();
 const visible=ledger.filter(tx=>currentTxFilter==='all'||tx.type===currentTxFilter);
 if(!visible.length){
  const tr=document.createElement('tr');
  tr.innerHTML='<td colspan="9" style="text-align:center;color:var(--muted);padding:18px">ยังไม่มีรายการในหมวดนี้</td>';
  tbody.append(tr);
  return;
 }

 for(const tx of visible){
  const tr=document.createElement('tr');
  const isInc=tx.type==='income';
  tr.innerHTML=`
   <td>${tx.date||'-'}</td>
   <td><span class="status-pill ${isInc?'free':'active'}">${isInc?'รายรับ (+)':'รายจ่าย (-)'}</span></td>
   <td class="tx-cat-cell"></td>
   <td><input type="text" class="inline-text inp-tx-payer" placeholder="ระบุชื่อผู้จ่าย..."></td>
   <td><input type="text" class="inline-text inp-tx-title" aria-label="ชื่อรายการ"></td>
   <td><input type="text" class="inline-text inp-tx-note" aria-label="หมายเหตุ"></td>
   <td><span class="money-cell"><span class="money-unit ${isInc?'txt-jade':'txt-danger'}">${isInc?'+':'-'}</span><input type="number" step="0.01" min="0" class="inline-num inp-tx-amount" value="${Number(tx.amount||0)}"><span class="money-unit">฿</span></span></td>


   <td class="slip-cell"></td>
   <td><button type="button" class="btn-del">ลบ</button></td>
  `;
  tr.querySelector('.tx-cat-cell').textContent=tx.category||'';
  tr.querySelector('.slip-cell').append(slipButton(tx));
  const pInp=tr.querySelector('.inp-tx-payer');pInp.value=tx.payer||'';pInp.oninput=e=>{tx.payer=e.target.value;saveLedger(ledger);updateLedgerSummary();};
  const tInp=tr.querySelector('.inp-tx-title');tInp.value=trText(tx.title||'');tInp.onchange=e=>{tx.title=e.target.value.trim();saveLedger(ledger);};
  const nInp=tr.querySelector('.inp-tx-note');nInp.value=trText(tx.note||'');nInp.onchange=e=>{tx.note=e.target.value.trim();saveLedger(ledger);};
  const aInp=tr.querySelector('.inp-tx-amount');aInp.oninput=e=>{tx.amount=Math.max(0,Number(e.target.value||0));saveLedger(ledger);updateLedgerSummary();};

  tr.querySelector('.btn-del').onclick=()=>{
   if(tx.slip)deleteSlip(tx.id).catch(()=>{});
   ledger=ledger.filter(x=>x.id!==tx.id);
   saveLedger(ledger);
   renderLedger();
  };
  tbody.append(tr);
 }
}

$('tx-form').onsubmit=async e=>{
 e.preventDefault();
 const id='tx-'+Date.now(),file=$('tx-slip').files?.[0];let slip=null;
 if(file){try{$('tx-status').textContent='กำลังบันทึกสลิป…';slip=await saveSlip(id,file);}catch(err){$('tx-status').textContent=SLIP_ERRORS[err.message]??'บันทึกสลิปไม่สำเร็จ · '+err.message;return;}}
 ledger.unshift({
  id,...(slip?{slip}:{}),
  type:$('tx-type').value,
  date:$('tx-date').value||financeDay(),
  category:$('tx-category').value,
  title:$('tx-title').value.trim(),
  payer:$('tx-payer')?.value.trim()||'',
  amount:Math.max(0,Number($('tx-amount').value||0)),
  note:$('tx-note').value.trim()
 });
 saveLedger(ledger);
 ensureLedgerTypeVisible($('tx-type').value);
 renderLedger();
 $('tx-title').value='';
 if($('tx-payer'))$('tx-payer').value='';
 $('tx-amount').value='';
 $('tx-note').value='';
 $('tx-slip').value='';$('tx-slip-preview').hidden=true;$('tx-slip-preview').replaceChildren();
 $('tx-status').textContent=slip?'บันทึกรายการพร้อมสลิปแล้ว':'บันทึกรายการเรียบร้อยแล้ว';
};

$('btn-record-monthly-cost').onclick=()=>{
 const today=financeDay();
 const activeCosts=monthlyBillableCosts(costs);
 if(!activeCosts.length){$('cost-ledger-status').textContent='ไม่มีต้นทุนรายเดือนที่ใช้อยู่ · รายปีหรือจ่ายครั้งเดียวให้เลือกลงบัญชีที่แถวนั้น';return;}
 for(const c of activeCosts){
  ledger.unshift({
   id:'tx-'+Date.now()+'-'+Math.random().toString(36).slice(2,6),
   type:'expense',
   date:today,
   ...costExpenseDraft(c)
  });
 }
 saveLedger(ledger);
 ensureLedgerTypeVisible('expense');
 renderLedger();
 $('cost-ledger-status').textContent=`บันทึกต้นทุนรายเดือนแล้ว ${activeCosts.length} รายการ`;
};

document.querySelectorAll('[data-tx-filter]').forEach(btn=>{
 btn.onclick=()=>{
  currentTxFilter=btn.dataset.txFilter;
  document.querySelectorAll('[data-tx-filter]').forEach(b=>b.classList.toggle('active',b===btn));
  renderLedger();
 };
});

$('btn-export-tx').onclick=async()=>{
 const slips=await exportSlips(ledger.filter(tx=>tx.slip).map(tx=>tx.id)).catch(()=>({}));
 const payload=JSON.stringify({costs,ledger,slips,exportedAt:new Date().toISOString()},null,2);
 const blob=new Blob([payload],{type:'application/json'});
 const a=document.createElement('a');
 a.href=URL.createObjectURL(blob);
 a.download=`ayothaya-finance-${new Date().toISOString().slice(0,10)}.json`;
 a.click();
 URL.revokeObjectURL(a.href);
};

$('input-import-tx').onchange=async e=>{
 const file=e.target.files?.[0];
 if(!file)return;
 try{
  const parsed=JSON.parse(await file.text());
  if(Array.isArray(parsed.costs)){costs=parsed.costs;saveCosts(costs);renderCosts();}
  if(parsed.slips)await importSlips(parsed.slips).catch(()=>0);
  if(Array.isArray(parsed.ledger)){ledger=parsed.ledger;saveLedger(ledger);renderLedger();}
 }catch{}
 e.target.value='';
};

// 0.116 shared books: the game server keeps one copy of the costs, the ledger and the slips for every admin browser.
// localStorage stays as this browser's cache (the page still works if the server is down) and edits sync ~1 s later.
const CLOUD_API=['127.0.0.1','localhost'].includes(location.hostname)?'':multiplayerURL().replace(/^ws/,'http').replace(/\/realtime$/,'');
const JOIN_KEY='ayothaya-dashboard-cloud-joined-v1';
let cloudRev=null,pushTimer=0,pushing=false,dirty=false;
async function financeFetch(p,body){
 const headers={'Content-Type':'application/json'};
 if(CLOUD_API){const u=fbConn?.auth.currentUser;if(!u)throw Error('need-login');headers.Authorization='Bearer '+await u.getIdToken();}
 const r=await fetch(CLOUD_API+p,{method:body?'POST':'GET',headers,body:body&&JSON.stringify(body)}),j=await r.json().catch(()=>({}));
 if(!r.ok)throw Object.assign(Error(j.error??String(r.status)),{data:j});return j;
}
setSlipCloud({put:(id,type,data)=>financeFetch('/admin/finance/slip',{id,type,data}),get:async id=>{try{return await financeFetch('/admin/finance/slip?id='+encodeURIComponent(id));}catch(e){if(e.message==='slip-missing')return null;throw e;}},del:id=>financeFetch('/admin/finance/slip-delete',{id})});
const clock=t=>new Date(t).toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit'});
function setSync(text,kind='ok'){
 for(const host of ['sec-costs-title','sec-ledger-title']){const h=$(host);if(!h)continue;let el=h.parentElement.querySelector('.finance-sync');if(!el){el=document.createElement('p');el.className='finance-sync';el.setAttribute('role','status');h.after(el);}el.textContent=text;el.dataset.kind=kind;}
}
function adopt(books){
 costs=Array.isArray(books.costs)?books.costs:[];ledger=Array.isArray(books.ledger)?books.ledger:[];cloudRev=books.rev??0;
 localStorage.setItem(COSTS_KEY,JSON.stringify(costs));localStorage.setItem(LEDGER_KEY,JSON.stringify(ledger));
 renderCosts();renderLedger();
}
function queueCloud(){if(cloudRev===null)return;dirty=true;clearTimeout(pushTimer);pushTimer=setTimeout(pushCloud,800);setSync('กำลังบันทึกขึ้นคลาวด์…','wait');}
async function pushCloud(){
 if(cloudRev===null)return;
 if(pushing){clearTimeout(pushTimer);pushTimer=setTimeout(pushCloud,800);return;} // an edit landed mid-save: go again after it
 pushing=true;dirty=false;let retry=false;
 try{const {books}=await financeFetch('/admin/finance',{baseRev:cloudRev,costs,ledger});cloudRev=books.rev;if(!dirty)setSync('☁ บันทึกบนคลาวด์แล้ว · ทุกเครื่องเห็นตรงกัน · '+clock(books.updatedAt));}
 catch(e){
  if(e.message==='finance-stale'&&e.data?.books){adopt(e.data.books);setSync('มีการแก้จากอีกเครื่องก่อนหน้า · โหลดฉบับล่าสุดแล้ว กรุณาตรวจรายการที่เพิ่งแก้อีกครั้ง','bad');}
  else{retry=true;setSync('บันทึกขึ้นคลาวด์ไม่สำเร็จ ('+e.message+') · เก็บในเครื่องไว้ก่อน จะลองใหม่','bad');}
 }finally{pushing=false;if(retry){dirty=true;clearTimeout(pushTimer);pushTimer=setTimeout(pushCloud,10000);}}
}
// Slips attached while offline (or before 0.116) go up now; rows remember which ones made it.
async function uploadPendingSlips(){
 let changed=false;for(const tx of ledger)if(tx.slip&&!tx.slip.cloud&&await uploadSlip(tx.id)){tx.slip.cloud=true;changed=true;}
 if(changed)saveLedger(ledger);
}
async function connectCloud(){
 setSync('กำลังเชื่อมคลาวด์…','wait');
 try{
  const {books}=await financeFetch('/admin/finance'),joined=localStorage.getItem(JOIN_KEY)==='1';
  // This browser's own rows that the cloud lacks join once (first connection); after that the cloud is the truth.
  const mine=key=>localStorage.getItem(key)?JSON.parse(localStorage.getItem(key)):[];
  const merge=(base,extra)=>{const have=new Set(base.map(r=>r.id));return [...base,...extra.filter(r=>r?.id&&!have.has(r.id))];};
  if(!books){cloudRev=0;costs=merge([],costs);}
  else if(!joined){adopt({...books,costs:merge(books.costs,mine(COSTS_KEY)),ledger:merge(books.ledger,mine(LEDGER_KEY))});}
  else adopt(books);
  localStorage.setItem(JOIN_KEY,'1');
  await uploadPendingSlips();
  if(!books||!joined)await pushCloud();else setSync('☁ ข้อมูลจากคลาวด์ · ทุกเครื่องเห็นตรงกัน · '+clock(books.updatedAt));
 }catch(e){cloudRev=null;setSync('เชื่อมคลาวด์ไม่ได้ ('+e.message+') · ตอนนี้ใช้ข้อมูลในเครื่องนี้','bad');}
}
// Pick up edits made on another machine while this page sits open.
setInterval(async()=>{
 if(document.hidden||cloudRev===null||dirty||pushing)return;
 try{const {books}=await financeFetch('/admin/finance');if(books&&books.rev>cloudRev&&!dirty&&!pushing){adopt(books);setSync('☁ อัปเดตจากอีกเครื่อง · '+clock(books.updatedAt));}}catch{}
},45000);

// 0.115.2 transfer slips: attach in the form or later from the row; click the thumbnail to view, replace or remove.
const SLIP_ERRORS={'slip-type':'แนบได้เฉพาะรูปภาพหรือ PDF','slip-too-big':'ไฟล์ใหญ่เกินไป · PDF ได้ไม่เกิน 640 KB (แคปหน้าจอแทนได้)','slip-encode':'อ่านรูปนี้ไม่ได้ · ลองแคปหน้าจอใหม่'};
const slipURLs=new Map();
async function slipURL(id){if(!slipURLs.has(id)){const b=await getSlip(id);slipURLs.set(id,b?URL.createObjectURL(b):null);}return slipURLs.get(id);}
function forgetSlipURL(id){const u=slipURLs.get(id);if(u)URL.revokeObjectURL(u);slipURLs.delete(id);}
function pickFile(){return new Promise(ok=>{const i=document.createElement('input');i.type='file';i.accept='image/*,application/pdf';i.onchange=()=>ok(i.files?.[0]??null);i.click();});}
async function attachSlip(tx,file){
 try{tx.slip=await saveSlip(tx.id,file);if(!tx.slip.cloud&&cloudRev!==null)setSync('สลิปเก็บในเครื่องนี้ก่อน · จะอัปขึ้นคลาวด์อีกครั้งตอนเชื่อมได้','bad');forgetSlipURL(tx.id);saveLedger(ledger);renderLedger();$('tx-status').textContent='แนบสลิปแล้ว · '+(tx.title||'');}
 catch(err){$('tx-status').textContent=SLIP_ERRORS[err.message]??'แนบสลิปไม่สำเร็จ · '+err.message;}
}
function slipButton(tx){
 const b=document.createElement('button');b.type='button';
 if(!tx.slip){b.className='slip-add';b.textContent='+ แนบ';b.title='แนบสลิปโอนให้รายการนี้';b.onclick=async()=>{const f=await pickFile();if(f)attachSlip(tx,f);};return b;}
 b.className='slip-thumb';b.title='ดูสลิป';b.textContent=tx.slip.type==='application/pdf'?'PDF':'🧾';
 if(tx.slip.type!=='application/pdf')slipURL(tx.id).then(u=>{if(u){b.textContent='';b.style.backgroundImage='url("'+u+'")';}else b.textContent='?';});
 b.onclick=()=>openSlip(tx);return b;
}
let slipDialog=null;
async function openSlip(tx){
 if(!slipDialog){slipDialog=document.createElement('dialog');slipDialog.className='slip-dialog';document.body.append(slipDialog);slipDialog.onclick=e=>{if(e.target===slipDialog)slipDialog.close();};}
 const url=await slipURL(tx.id),pdf=tx.slip.type==='application/pdf';
 const body=!url?'<p>ไม่พบไฟล์สลิปในเบราว์เซอร์นี้ · แนบใหม่ได้</p>':pdf?`<iframe title="สลิป PDF" src="${url}"></iframe>`:`<img alt="สลิปโอน" src="${url}">`;
 const download=url?`<a class="btn-secondary" href="${url}" download="slip-${tx.date||''}-${tx.id}${pdf?'.pdf':'.jpg'}">ดาวน์โหลด</a>`:'';
 slipDialog.innerHTML=`<header><div><b></b><small></small></div><button type="button" data-x aria-label="ปิด">×</button></header><div class="slip-body">${body}</div><footer>${download}<button type="button" class="btn-secondary" data-replace>เปลี่ยนสลิป</button><button type="button" class="btn-del" data-remove>ลบสลิป</button></footer>`;
 slipDialog.querySelector('b').textContent=(tx.title||'สลิปโอน')+' · '+formatMoney(Number(tx.amount||0));
 slipDialog.querySelector('small').textContent=[tx.date,tx.payer,tx.slip.name].filter(Boolean).join(' · ');
 slipDialog.querySelector('[data-x]').onclick=()=>slipDialog.close();
 slipDialog.querySelector('[data-replace]').onclick=async()=>{const f=await pickFile();if(f){slipDialog.close();attachSlip(tx,f);}};
 slipDialog.querySelector('[data-remove]').onclick=async()=>{if(!confirm('ลบสลิปของรายการนี้?'))return;await deleteSlip(tx.id).catch(()=>{});forgetSlipURL(tx.id);delete tx.slip;saveLedger(ledger);slipDialog.close();renderLedger();};
 slipDialog.showModal();
}
$('tx-slip').onchange=()=>{const f=$('tx-slip').files?.[0],box=$('tx-slip-preview');box.replaceChildren();box.hidden=!f;if(!f)return;
 if(f.type.startsWith('image/')){const img=document.createElement('img');img.alt='';img.src=URL.createObjectURL(f);img.onload=()=>URL.revokeObjectURL(img.src);box.append(img);}
 const name=document.createElement('span');name.textContent=f.name;const x=document.createElement('button');x.type='button';x.textContent='เอาออก';x.onclick=()=>{$('tx-slip').value='';box.hidden=true;box.replaceChildren();};box.append(name,x);};

let fbConn=null;
let pollTimer=null;

function startDashboard(user){
 const gate=$('auth-gate'),shell=$('dash-shell'),badge=$('admin-user-badge');
 if(gate){gate.hidden=true;gate.style.display='none';}
 if(shell){shell.hidden=false;shell.style.display='grid';}
 document.body.style.overflow='';
 if(badge)badge.textContent='👤 '+user.email;
 renderCosts();
 renderLedger();
 connectCloud();
 renderServerPanel({totalPlayers:0,rooms:[],uptimeSeconds:0,bandwidth:{bytesSent:0},logs:[]});
 pollServer();
 if(!pollTimer)pollTimer=setInterval(pollServer,5000);
}

function lockDashboard(msgHtml){
 const gate=$('auth-gate'),shell=$('dash-shell'),msg=$('gate-msg');
 if(pollTimer){clearInterval(pollTimer);pollTimer=null;}
 if(shell){shell.hidden=true;shell.style.display='none';}
 if(gate){gate.hidden=false;gate.style.display='flex';}
 document.body.style.overflow='hidden';
 if(msg){
  if(msgHtml)msg.innerHTML=msgHtml;
  else msg.textContent='กรุณาล็อกอินด้วยบัญชี Gmail ของแอดมินเพื่อปลดล็อก';
 }
}

async function initAuthGate(){
 const gate=$('auth-gate');
 if(!gate){
  renderCosts();renderLedger();
  renderServerPanel({totalPlayers:0,rooms:[],uptimeSeconds:0,bandwidth:{bytesSent:0},logs:[]});
  pollServer();setInterval(pollServer,5000);
  return;
 }
 const msg=$('gate-msg'),btnLogin=$('btn-login-google'),btnLogout=$('btn-logout');
 // Dev server on this machine: no Google gate (local preview only); the live site always gates.
 if(['127.0.0.1','localhost'].includes(location.hostname)){startDashboard({email:'localhost'});return;}
 lockDashboard();
 if(msg)msg.textContent='กำลังเตรียมระบบความปลอดภัย…';
 try{
  fbConn=await deadline(connectFirebase(),15000);
  fbConn.auth.onAuthStateChanged(user=>{
   const email=(user?.email||'').toLowerCase().trim();
   if(user&&email&&ALLOWED_ADMINS.includes(email)){
    startDashboard(user);
   }else if(user){
    lockDashboard(`<span class="txt-danger">⛔ บัญชี <b>${user.email}</b> ไม่มีสิทธิ์เข้าถึงหน้านี้<br>(อนุญาตเฉพาะแอดมิน: ${ALLOWED_ADMINS.join(', ')})</span>`);
    fbConn.sdk.signOut(fbConn.auth).catch(()=>{});
   }else{
    lockDashboard();
   }
  });
 }catch(e){
  if(msg)msg.textContent='ไม่สามารถเชื่อมต่อระบบความปลอดภัย Firebase ได้ กรุณารีเฟรชหน้าเว็บ';
 }
 if(btnLogin){
  btnLogin.onclick=async()=>{
   if(!fbConn){if(msg)msg.textContent='กำลังเชื่อมต่อระบบ กรุณากดอีกครั้ง';return;}
   if(msg)msg.textContent='กำลังเปิดหน้าต่างล็อกอิน Google…';
   const provider=new fbConn.sdk.GoogleAuthProvider();
   provider.setCustomParameters({prompt:'select_account'});
   try{
    const res=await fbConn.sdk.signInWithPopup(fbConn.auth,provider);
    const email=(res.user?.email||'').toLowerCase().trim();
    if(res.user&&email&&ALLOWED_ADMINS.includes(email)){
     startDashboard(res.user);
    }else{
     lockDashboard(`<span class="txt-danger">⛔ บัญชี <b>${res.user?.email||''}</b> ไม่มีสิทธิ์เข้าถึงหน้านี้</span>`);
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

initAuthGate();
