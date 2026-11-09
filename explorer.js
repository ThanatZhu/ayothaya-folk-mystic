// Public money explorer (owner 9 Nov 2026): reads the realm host's /economy books and draws the daily flow.
import {multiplayerURL} from './multiplayer-config.js';
const $=id=>document.getElementById(id),fmt=n=>n==null?'-':Math.round(n).toLocaleString('en-US'),signed=n=>(n>0?'+':n<0?'−':'')+fmt(Math.abs(n));
const api='http'+multiplayerURL().slice(2).replace('/realtime','/economy');
let data=null,range=7;
const sumBy=(days,side)=>{const o={};for(const d of days)for(const [k,v] of Object.entries(d[side]))o[k]=(o[k]??0)+v;return o;};
function list(el,totals,labels,color){
 const rows=Object.entries(totals).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]),all=rows.reduce((a,[,v])=>a+v,0);
 el.replaceChildren();if(!rows.length){const p=document.createElement('p');p.className='econ-empty';p.textContent='ยังไม่มีข้อมูล';el.append(p);return;}
 for(const [k,v] of rows){const r=document.createElement('div');r.className='econ-row';const pct=all?v/all*100:0;
  const name=document.createElement('span');name.textContent=labels[k]?.th??k;
  const val=document.createElement('b');val.textContent=fmt(v);const em=document.createElement('em');em.textContent=pct.toFixed(1)+'%';val.append(em);
  const bar=document.createElement('div');bar.className='econ-bar';bar.style.setProperty('--c',color);const fill=document.createElement('i');fill.style.width=pct.toFixed(1)+'%';bar.append(fill);
  r.append(name,val,bar);el.append(r);}
}
function chart(days){
 const W=760,H=300,L=60,R=10,T=14,B=28,max=Math.max(1,...days.map(d=>Math.max(d.totalIn,d.totalOut))),pw=(W-L-R)/days.length,bw=Math.max(4,Math.min(26,pw*.34));
 const y0=T+(H-T-B)/2,sc=(H-T-B)/2/max,y=v=>y0-v*sc,ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox',`0 0 ${W} ${H}`);svg.setAttribute('role','img');svg.setAttribute('aria-label','กราฟเบี้ยเข้า-ออกรายวัน');
 const el=(tag,a)=>{const e=document.createElementNS(ns,tag);for(const k in a)e.setAttribute(k,a[k]);svg.append(e);return e;};
 for(const v of [max,max/2,0,-max/2,-max]){el('line',{x1:L,x2:W-R,y1:y(v),y2:y(v),stroke:v===0?'#c6a16499':'#c6a16426','stroke-width':1});el('text',{x:L-8,y:y(v)+4,'text-anchor':'end'}).textContent=fmt(Math.abs(v));}
 const bar=(x,v,up,c)=>{const h=v*sc;if(h<=0)return;const r=Math.min(4,bw/2,h),e=up?y0-h:y0+h,s=up?1:-1;
  el('path',{fill:c,d:`M${x} ${y0}V${e+s*r}Q${x} ${e} ${x+r} ${e}H${x+bw-r}Q${x+bw} ${e} ${x+bw} ${e+s*r}V${y0}Z`});};
 const pts=[];days.forEach((d,i)=>{const cx=L+pw*i+pw/2;bar(cx-bw/2,d.totalIn,true,'var(--in)');bar(cx-bw/2,d.totalOut,false,'var(--out)');pts.push([cx,y(d.net)]);
  if(days.length<=14||i%3===0)el('text',{x:cx,y:H-8,'text-anchor':'middle'}).textContent=d.day.slice(8)+'/'+d.day.slice(5,7);});
 if(pts.length>1)el('polyline',{points:pts.map(p=>p.join(',')).join(' '),fill:'none',stroke:'var(--ink)','stroke-width':2,'stroke-linejoin':'round'});
 for(const p of pts)el('circle',{cx:p[0],cy:p[1],r:4,fill:'var(--ink)',stroke:'#1b3029','stroke-width':2});
 const tip=$('econ-tip'),box=$('econ-chart');
 days.forEach((d,i)=>{const hit=el('rect',{x:L+pw*i,y:T,width:pw,height:H-T-B,fill:'transparent',tabindex:0});
  const show=()=>{tip.replaceChildren();const head=document.createElement('b');head.textContent=d.day;tip.append(head);
   for(const [label,val] of [['เบี้ยเข้า',fmt(d.totalIn)],['เบี้ยออก',fmt(d.totalOut)],['สุทธิ',signed(d.net)]]){const row=document.createElement('div');const a=document.createElement('span');a.textContent=label;row.append(a,' '+val);tip.append(row);}
   const s=box.clientWidth/W;tip.style.left=(box.offsetLeft+Math.min(Math.max((L+pw*i+pw/2)*s,70),box.clientWidth-70))+'px';tip.style.top=(box.offsetTop+T*s)+'px';tip.style.display='block';};
  const hide=()=>{tip.style.display='none';};
  hit.addEventListener('pointerenter',show);hit.addEventListener('focus',show);hit.addEventListener('pointerleave',hide);hit.addEventListener('blur',hide);});
 box.replaceChildren(svg);
}
function render(){
 const days=data.days.slice(-range),today=data.days.at(-1);
 $('s-held').textContent=fmt(data.held);$('s-chars').textContent=fmt(data.characters);
 $('s-in').textContent=fmt(today?.totalIn??0);$('s-out').textContent=fmt(today?.totalOut??0);$('s-net').textContent=signed(today?.net??0);
 chart(days.length?days:[{day:'----------',totalIn:0,totalOut:0,net:0}]);
 list($('econ-sources'),sumBy(days,'in'),data.sources,'var(--in)');list($('econ-sinks'),sumBy(days,'out'),data.sinks,'var(--out)');
}
document.querySelectorAll('[data-days]').forEach(b=>b.addEventListener('click',()=>{range=+b.dataset.days;document.querySelectorAll('[data-days]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));if(data)render();}));
async function load(){
 try{const r=await fetch(api,{cache:'no-store'});if(!r.ok)throw Error(r.status);data=await r.json();
  $('econ-status').hidden=true;for(const id of ['econ-stats','econ-flow','econ-lists'])$(id).hidden=false;render();}
 catch{if(!data)$('econ-status').textContent='โหลดข้อมูลไม่ได้ ลองใหม่อีกครั้งภายหลัง';}
}
load();setInterval(load,300000);
