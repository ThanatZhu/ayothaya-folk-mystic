import {multiplayerURL} from './multiplayer-config.js?v=27';
import {CHANNELS} from './realm-state.js?v=21';

const $=id=>document.getElementById(id);
const URL_KEY='ayothaya-dashboard-url-v1';
const COSTS_KEY='ayothaya-dashboard-costs-v1';
const RATE_KEY='ayothaya-dashboard-usd-rate-v1';
// USD -> THB: typing a dollar price fills the baht price with this rate (editable on the page, saved on this device)
let usdRate=Number(localStorage.getItem(RATE_KEY))||34;
const toThb=usd=>Math.round(Math.max(0,Number(usd)||0)*usdRate);
const LEDGER_KEY='ayothaya-dashboard-ledger-v1';

const MAP_NAMES={
 'ayothaya':'พระนครศรีอยุธยา (เมืองหลวง)',
 'rice-fields':'ทุ่งนาชานเมือง',
 'FloatingMarket':'ตลาดน้ำอโยธยา',
 'JungleRuins':'ป่ารกและเทวสถานร้าง',
 'lavo':'เมืองละโว้',
 'sukhothai':'เมืองสุโขทai',
 'ancient-temple':'วัดโบราณริมน้ำ'
};

const CAT_LABELS={
 join:'เข้าเกม',
 leave:'ออกเกม',
 channel:'ย้ายแนล',
 chat:'แชต',
 mvp:'บอส MVP',
 trade:'แลกเปลี่ยน',
 market:'ตั้งร้าน',
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
 if(saved)return saved;
 const ws=multiplayerURL();
 if(ws)return ws.replace(/^wss:/,'https:').replace(/^ws:/,'http:').replace(/\/realtime\/?$/,'');
 return 'http://127.0.0.1:8787';
}

let serverUrl=defaultHttpUrl();
$('srv-url-input').value=serverUrl;
$('tx-date').value=new Date().toISOString().slice(0,10);

let currentLogFilter='all';
let currentTxFilter='all';
let liveLogs=[];
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

 $('kpi-players').textContent=totalPlayers+' คน';
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

 if(Array.isArray(data?.logs))liveLogs=data.logs;
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
 $('log-count-badge').textContent=filtered.length+' รายการ';
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
 serverUrl=$('srv-url-input').value.trim();
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
  if(raw){const parsed=JSON.parse(raw);if(Array.isArray(parsed)&&parsed.length)return parsed;}
 }catch{}
 return structuredClone(DEFAULT_COSTS);
}
function saveCosts(list){
 localStorage.setItem(COSTS_KEY,JSON.stringify(list));
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
  const tr=document.createElement('tr');
  tr.innerHTML=`
   <td><strong class="cost-name-cell"></strong></td>
   <td class="cost-cat-cell"></td>
   <td class="cost-role-cell" style="color:var(--muted);font-size:12px"></td>
   <td>${CYCLE_LABELS[item.cycle]||item.cycle}</td>
   <td><span class="money-cell"><span class="money-unit">$</span><input type="number" step="0.01" min="0" class="inline-num inp-usd" value="${Number(item.usd||0)}"></span></td>
   <td><span class="money-cell"><input type="number" step="1" min="0" class="inline-num inp-thb" value="${Number(item.thb||0)}"><span class="money-unit">฿</span></span></td>
   <td>
    <select class="sel-status" style="padding:4px 8px;border-radius:8px;background:#13261f;border:1px solid #75907766;font-size:11px">
     <option value="active" ${item.status==='active'?'selected':''}>${STATUS_LABELS.active}</option>
     <option value="free" ${item.status==='free'?'selected':''}>${STATUS_LABELS.free}</option>
     <option value="optional" ${item.status==='optional'?'selected':''}>${STATUS_LABELS.optional}</option>
     <option value="paused" ${item.status==='paused'?'selected':''}>${STATUS_LABELS.paused}</option>
    </select>
   </td>
   <td><button type="button" class="btn-del">ลบ</button></td>
  `;
  tr.querySelector('.cost-name-cell').textContent=item.name;
  tr.querySelector('.cost-cat-cell').textContent=item.category;
  tr.querySelector('.cost-role-cell').textContent=item.role;

  tr.querySelector('.inp-usd').oninput=e=>{item.usd=Math.max(0,Number(e.target.value||0));item.thb=toThb(item.usd);tr.querySelector('.inp-thb').value=item.thb;saveCosts(costs);updateCostKpi();};
  tr.querySelector('.inp-usd').onchange=e=>{item.usd=Math.max(0,Number(e.target.value||0));item.thb=toThb(item.usd);saveCosts(costs);renderCosts();};
  tr.querySelector('.inp-thb').onchange=e=>{item.thb=Math.max(0,Number(e.target.value||0));saveCosts(costs);renderCosts();};
  tr.querySelector('.sel-status').onchange=e=>{item.status=e.target.value;saveCosts(costs);renderCosts();};
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
 localStorage.setItem(LEDGER_KEY,JSON.stringify(list));
}
let ledger=loadLedger();

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

 $('ratio-income-label').textContent='รายรับรวม: +'+formatMoney(totalIncome);
 $('ratio-expense-label').textContent='รายจ่ายรวม: -'+formatMoney(totalExpense);
 const sum=totalIncome+totalExpense;
 $('ratio-income-bar').style.width=(sum>0?(totalIncome/sum)*100:50)+'%';

 const visible=ledger.filter(tx=>currentTxFilter==='all'||tx.type===currentTxFilter);
 if(!visible.length){
  const tr=document.createElement('tr');
  tr.innerHTML='<td colspan="7" style="text-align:center;color:var(--muted);padding:18px">ยังไม่มีรายการในหมวดนี้</td>';
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
   <td><strong class="tx-title-cell"></strong></td>
   <td class="tx-note-cell" style="color:var(--muted);font-size:12px"></td>
   <td class="${isInc?'txt-jade':'txt-danger'}" style="font-weight:700">${isInc?'+':'-'}${formatMoney(tx.amount)}</td>
   <td><button type="button" class="btn-del">ลบ</button></td>
  `;
  tr.querySelector('.tx-cat-cell').textContent=tx.category||'';
  tr.querySelector('.tx-title-cell').textContent=tx.title||'';
  tr.querySelector('.tx-note-cell').textContent=tx.note||'-';
  tr.querySelector('.btn-del').onclick=()=>{
   ledger=ledger.filter(x=>x.id!==tx.id);
   saveLedger(ledger);
   renderLedger();
  };
  tbody.append(tr);
 }
}

$('tx-form').onsubmit=e=>{
 e.preventDefault();
 ledger.unshift({
  id:'tx-'+Date.now(),
  type:$('tx-type').value,
  date:$('tx-date').value||new Date().toISOString().slice(0,10),
  category:$('tx-category').value,
  title:$('tx-title').value.trim(),
  amount:Math.max(0,Number($('tx-amount').value||0)),
  note:$('tx-note').value.trim()
 });
 saveLedger(ledger);
 renderLedger();
 $('tx-title').value='';
 $('tx-amount').value='';
 $('tx-note').value='';
};

$('btn-record-monthly-cost').onclick=()=>{
 const today=new Date().toISOString().slice(0,10);
 const activeCosts=costs.filter(c=>c.status==='active'&&Number(c.thb)>0);
 if(!activeCosts.length)return;
 for(const c of activeCosts){
  ledger.unshift({
   id:'tx-'+Date.now()+'-'+Math.random().toString(36).slice(2,6),
   type:'expense',
   date:today,
   category:'ค่าเซิร์ฟเวอร์ (DigitalOcean/Render)',
   title:c.name,
   amount:Number(c.thb),
   note:c.role
  });
 }
 saveLedger(ledger);
 renderLedger();
};

document.querySelectorAll('[data-tx-filter]').forEach(btn=>{
 btn.onclick=()=>{
  currentTxFilter=btn.dataset.txFilter;
  document.querySelectorAll('[data-tx-filter]').forEach(b=>b.classList.toggle('active',b===btn));
  renderLedger();
 };
});

$('btn-export-tx').onclick=()=>{
 const payload=JSON.stringify({costs,ledger,exportedAt:new Date().toISOString()},null,2);
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
  if(Array.isArray(parsed.ledger)){ledger=parsed.ledger;saveLedger(ledger);renderLedger();}
 }catch{}
 e.target.value='';
};

renderCosts();
renderLedger();
renderServerPanel({totalPlayers:0,rooms:[],uptimeSeconds:0,bandwidth:{bytesSent:0},logs:[]});
pollServer();
setInterval(pollServer,5000);
