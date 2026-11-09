import {loadPaintedCharacter} from './painted-character.js';
import {drawCharacterFrame,FRAME_FOOT,FRAME_SIZE,LOGICAL_SIZE,CHARACTER_WORLD_SCALE,WORLD_BODY_HEIGHT} from './character-size.js';
import {loadChapter2Monster,drawChapter2Monster,chapter2FrameAt,chapter2PreviewSize,CHAPTER2_ACTIONS} from './chapter2-monster-art.js';

const $=s=>document.querySelector(s),response=await fetch('./assets/monsters-chapter2/designs.json');
if(!response.ok)throw new Error('Monster manifest unavailable');
const manifest=await response.json(),rank={normal:'มอนทั่วไป',elite:'ตัวพิเศษ',boss:'บอส'},poseNames=['ยืน','เคลื่อนที่ A','เคลื่อนที่ B','ง้าง','โจมตี','ถูกตี','คืนท่า','ล้ม'];
const hero=(await loadPaintedCharacter('novice')).male[0];
let assets=[],currentMap,selected,time=0,last=0,paused=matchMedia('(prefers-reduced-motion: reduce)').matches,manual=null,ticket=0;
const initial=new URL(location.href).searchParams;
if(CHAPTER2_ACTIONS.includes(initial.get('action')))$('#action').value=initial.get('action');
function urlState(){const url=new URL(location.href);url.searchParams.set('map',currentMap.mapId);url.searchParams.set('action',$('#action').value);url.searchParams.set('id',selected.monster.id);history.replaceState(null,'',url);}
function playback(asset){return manual===null?chapter2FrameAt(asset.meta,$('#action').value,time):{index:manual,action:'manual'};}
function pauseButton(){$('#pause').textContent=paused?'เล่นต่อ':'หยุดภาพ';$('#pause').setAttribute('aria-pressed',String(paused));}
function clear(ctx){ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';}

function render(){
  if(!assets.length)return;
  const ctx=$('#lineup').getContext('2d'),unit=+$('#zoom').value,floor=390;
  clear(ctx);ctx.strokeStyle='#bdaa6a88';ctx.beginPath();ctx.moveTo(20,floor+1);ctx.lineTo(1580,floor+1);ctx.stroke();
  const size=CHARACTER_WORLD_SCALE*unit,pad=(FRAME_SIZE-LOGICAL_SIZE)/2;
  drawCharacterFrame(ctx,hero,100-size/2,floor-(FRAME_FOOT-pad)*size/LOGICAL_SIZE,size);
  ctx.textAlign='center';ctx.font='17px Mali,Tahoma,sans-serif';ctx.fillStyle=document.body.classList.contains('light')?'#203c29':'#ffe9bb';ctx.fillText('ผู้ฝึกตน',100,floor+30);
  const positions=[315,515,720,990,1320];
  assets.forEach((asset,i)=>{
    const {monster:m}=asset,p=playback(asset),hover=['bamboo-bat','leaf-flame-bird','wind-mountain-bird','haunted-bell'].includes(m.id)&&p.index!==7?18:0;
    drawChapter2Monster(ctx,asset,p.index,positions[i],floor-hover,m.height*unit);
    ctx.fillText(m.name,positions[i],floor+30);ctx.font='13px Mali,Tahoma,sans-serif';
    ctx.fillText((m.height/WORLD_BODY_HEIGHT).toFixed(1)+'× ผู้เล่น · '+rank[m.rank],positions[i],floor+54);ctx.font='17px Mali,Tahoma,sans-serif';
    const article=$('[data-monster="'+m.id+'"]'),c=article.querySelector('.portrait'),cc=c.getContext('2d');
    clear(cc);drawChapter2Monster(cc,asset,p.index,150,246,chapter2PreviewSize(asset,264,226));
    article.dataset.frame=String(p.index);article.querySelector('.pose-state').textContent=poseNames[p.index];
  });
  const focus=$('#focus').getContext('2d'),p=playback(selected);clear(focus);
  drawChapter2Monster(focus,selected,p.index,450,432,chapter2PreviewSize(selected,780,400));
  $('#focus').dataset.frame=String(p.index);$('#frame').value=String(p.index);$('#frame-label').textContent=p.index+' · '+poseNames[p.index];
  $('#poses').querySelectorAll('button').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===p.index)));
}
function selectMonster(asset){
  selected=asset;$('#detail-title').textContent=asset.monster.name+' · '+rank[asset.monster.rank];
  $('#sheet-link').href='assets/monsters-chapter2/animations/'+asset.meta.source;$('#poses').replaceChildren();
  asset.meta.frames.forEach((_,index)=>{
    const b=document.createElement('button');b.type='button';b.title=poseNames[index];b.setAttribute('aria-label',index+' · '+poseNames[index]);b.setAttribute('aria-pressed','false');
    const c=document.createElement('canvas');c.width=130;c.height=130;drawChapter2Monster(c.getContext('2d'),asset,index,65,118,chapter2PreviewSize(asset,112,104));
    b.append(c,document.createTextNode(poseNames[index]));b.onclick=()=>{manual=index;paused=true;pauseButton();render();};$('#poses').append(b);
  });urlState();render();
}
async function selectMap(map){
  const token=++ticket;document.body.dataset.ready='false';$('#status').textContent='กำลังโหลด '+map.name+'…';
  try{
    const loaded=await Promise.all(map.monsters.map(loadChapter2Monster));if(token!==ticket)return;
    assets=loaded;currentMap=map;time=0;manual=null;
    $('#map-title').textContent=map.name;$('#map-level').textContent='ช่วงเลเวลที่เสนอ '+map.levelBand.join('–')+' · 5 ตัว / 40 เฟรม';
    $('#maps').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.map===map.mapId)));$('#creatures').replaceChildren();
    for(const asset of assets){
      const m=asset.monster,a=document.createElement('article');a.className=m.rank;a.dataset.monster=m.id;
      a.innerHTML='<canvas class="portrait" width="300" height="260" aria-label="'+m.name+'"></canvas><div class="card-heading"><span class="tag">'+rank[m.rank]+'</span><span class="pose-state"></span></div><h3>'+m.name+'</h3><p>'+m.hook+'</p><button class="inspect">ดูท่าแบบขยาย</button><a href="assets/monsters-chapter2/'+m.art+'" download>PNG ท่ายืนต้นฉบับ ↗</a>';
      a.querySelector('.inspect').onclick=()=>{selectMonster(asset);$('#detail').scrollIntoView({behavior:'smooth',block:'start'});};$('#creatures').append(a);
    }
    selectMonster(assets.find(a=>a.monster.id===initial.get('id'))||assets[0]);
    $('#status').textContent='ครบ 25 ตัว / 200 เฟรม · กำลังดู '+map.name+' · ชุดท่าหลักรอบตรวจ';document.body.dataset.ready='true';
  }catch(error){$('#status').textContent='โหลดไม่สำเร็จ: '+error.message;document.body.dataset.ready='error';console.error(error);}
}
for(const map of manifest.maps){
  const b=document.createElement('button');b.type='button';b.dataset.map=map.mapId;b.textContent=map.name;b.setAttribute('aria-pressed','false');b.onclick=()=>selectMap(map);$('#maps').append(b);
  const article=document.createElement('article');article.innerHTML='<h3>'+map.name+'</h3><p>5 ภาพต้นแบบ · ชุดท่าหลัก 40 เฟรม</p><p>'+map.monsters.map(m=>m.name).join(' / ')+'</p>';$('#planned').append(article);
}
$('#action').onchange=()=>{manual=null;time=0;urlState();render();};
$('#pause').onclick=()=>{paused=!paused;if(!paused)manual=null;pauseButton();render();};
$('#frame').oninput=()=>{manual=+$('#frame').value;paused=true;pauseButton();render();};
$('#zoom').oninput=render;$('#background').onclick=()=>{document.body.classList.toggle('light');render();};
pauseButton();await document.fonts.ready;await selectMap(manifest.maps.find(m=>m.mapId===initial.get('map'))||manifest.maps[0]);
function tick(now){if(last&&!paused)time+=Math.min(now-last,100)*+$('#speed').value;last=now;if(!document.hidden)render();requestAnimationFrame(tick);}
requestAnimationFrame(tick);
