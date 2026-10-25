import {loadPaintedCharacter} from './painted-character.js?v=size1';
import {BODY_HEIGHT,FRAME_SIZE,FRAME_FOOT,LOGICAL_SIZE,CHARACTER_WORLD_SCALE,WORLD_BODY_HEIGHT,standingHeight} from './character-size.js?v=size1';
import {PEOPLE_BODY_CALIBRATION,peoplePlacement,citizenBodyHeight} from './npc-size.js?v=size1';
import {CLASSES,NOVICE,className} from './classes.js?v=novice174';
import {MENTORS,CITIZEN_STYLES} from './city-life-data.js?v=98';

// A fixed orthographic comparison: one canvas pixel ratio for every actor.
// "Before" reproduces the previous runtime size AND the old static-NPC pivot.
const PIXELS_PER_WORLD=BODY_HEIGHT/WORLD_BODY_HEIGHT,WIDTH=320,HEIGHT=360,FOOT=312;
const groups={
 players:{title:'ผู้เล่น · ชายและหญิง',note:'8 อาชีพ × 2 แบบ · เป็นส่วนสูงอ้างอิงเดิม'},
 story:{title:'NPC เนื้อเรื่องและบริการ',note:'4 ภาพต้นฉบับที่ใช้อยู่กับ NPC 10 ชื่อ'},
 mentors:{title:'ครูประจำอาชีพ',note:'8 คน · ใช้ส่วนสูงท่ายืน ไม่รวมปลายอาวุธ'},
 citizens:{title:'ชาวเมือง',note:'8 แบบ · ใช้ร่วมกันกับชาวเมืองหลายคน'}
};
let mode='after',gear='basic',filter='all';
const allRows=[],imageCache=new Map(),cards=new Map();
const audit=window.characterSizeAudit={
 ready:false,errors:[],rows:[],allRows,
 targetBodyPixels:BODY_HEIGHT,targetWorldHeight:WORLD_BODY_HEIGHT,
 pixelsPerWorld:PIXELS_PER_WORLD,frameSize:FRAME_SIZE,frameFoot:FRAME_FOOT,
 coverage:{playerDesigns:16,weaponVariants:2,staticDesigns:4,staticNames:10,mentors:8,citizenDesigns:8,totalDesigns:36,totalStandingImages:52}
};
const $=id=>document.getElementById(id);
const canvas=(width=FRAME_SIZE,height=FRAME_SIZE)=>Object.assign(document.createElement('canvas'),{width,height});
async function json(path){const response=await fetch(path);if(!response.ok)throw new Error(`${path}: HTTP ${response.status}`);return response.json();}
function image(path){
 if(!imageCache.has(path)){const pending=(async()=>{const img=new Image();img.src=path;await img.decode();return img;})();imageCache.set(path,pending);}
 return imageCache.get(path);
}
function cleanPixels(c,cutoff){
 // Match the runtime alpha test without allowing faint generated halos into the exported PNG.
 const ctx=c.getContext('2d',{willReadFrequently:true}),data=ctx.getImageData(0,0,c.width,c.height);
 for(let i=3;i<data.data.length;i+=4)if(data.data[i]<cutoff)data.data[i]=0;
 ctx.putImageData(data,0,0);return c;
}
function addRow(row){
 row.beforeBodyPixels=row.beforeWorldHeight*PIXELS_PER_WORLD;
 row.afterWorldHeight=WORLD_BODY_HEIGHT;
 row.afterBodyPixels=BODY_HEIGHT;
 row.changePercent=(row.afterBodyPixels/row.beforeBodyPixels-1)*100;
 allRows.push(row);
}
async function loadPlayers(){
 for(const item of [NOVICE,...CLASSES]){
  for(const variant of ['basic','crafted']){
   const directory=variant==='crafted'?'equipment41':'animation37';
   const [painted,meta]=await Promise.all([
    loadPaintedCharacter(item.id,{}, {weapon:`${item.id}-weapon-${variant}`}),
    json(`./assets/${directory}/${item.id}.json`)
   ]);
   for(const gender of ['male','female']){
    const f=meta.frames[gender][0],name=className(item.id,gender)+(item.id==='acolyte'?'':gender==='female'?' · หญิง':' · ชาย');
    addRow({
     id:`${item.id}-${gender}-${variant}`,group:'players',gear:variant,classId:item.id,gender,name,
     detail:variant==='basic'?'อุปกรณ์ชุดเริ่มต้น':'อุปกรณ์รูปลักษณ์พิเศษ',
     source:`assets/${directory}/${f.source}`,sourceBodyPixels:standingHeight(directory,item.id,gender),
     beforeWorldHeight:CHARACTER_WORLD_SCALE*BODY_HEIGHT/LOGICAL_SIZE,
     normalizedCanvas:painted[gender][0],
     drawBefore(ctx){ctx.drawImage(this.normalizedCanvas,(WIDTH-FRAME_SIZE)/2,FOOT-FRAME_FOOT);}
    });
   }
  }
  $('status').textContent=`อ่านภาพผู้เล่น ${item.name} แล้ว`;
 }
}
async function loadPeople(world){
 const img=await image('./assets/people.png'),w=Math.round(img.width/2),h=Math.round(img.height/2);
 const names=Object.values(world.maps).flatMap(m=>m.npcs??[]).filter(n=>!n.mentorId);
 for(let i=0;i<4;i++){
  const crop=canvas(w,h),ctx=crop.getContext('2d');
  ctx.drawImage(img,(i%2)*w,Math.floor(i/2)*h,w,h,0,0,w,h);cleanPixels(crop,115);
  const b=PEOPLE_BODY_CALIBRATION[i],placement=peoplePlacement(i,w,h),normalized=canvas();
  const sx=placement.width*PIXELS_PER_WORLD,sy=placement.height*PIXELS_PER_WORLD;
  normalized.getContext('2d').drawImage(crop,FRAME_SIZE/2-placement.centerX*sx,FRAME_FOOT-(1-placement.centerY)*sy,sx,sy);
  const namesHere=names.filter(n=>n.texture===i).map(n=>n.name);
  addRow({
   id:`people-${i}`,group:'story',name:namesHere[0]??`ภาพ NPC ${i+1}`,names:namesHere,
   detail:namesHere.length>1?`ใช้ร่วมกับ ${namesHere.slice(1).join(' · ')}`:'ใช้ภาพนี้เพียงชื่อเดียว',
   source:'assets/people.png',sourceIndex:i,sourceBodyPixels:(b.sole-b.crown)*h/627,
   beforeWorldHeight:1.65*(b.sole-b.crown)/627,normalizedCanvas:normalized,
   drawBefore(out){
    const size=1.65*PIXELS_PER_WORLD;
    // Old fixed NPCs used centerX .5 and centerY 0, including transparent padding.
    out.drawImage(crop,(WIDTH-size)/2,FOOT-size,size,size);
   }
  });
 }
}
async function loadCity(meta){
 for(const [group,items] of [['mentors',MENTORS],['citizens',CITIZEN_STYLES]]){
  for(const item of items){
   const m=meta[item.sheet],rects=m.rects.slice(item.row*m.columns,(item.row+1)*m.columns),r=rects[0];
   const img=await image(`./assets/citizens40/${item.sheet}.png`),crop=canvas(r[2],r[3]);
   crop.getContext('2d').drawImage(img,...r,0,0,r[2],r[3]);cleanPixels(crop,128);
   const sourceHeight=citizenBodyHeight(item.sheet,item.row),anchor=m.anchors[item.row*m.columns];
   const scale=BODY_HEIGHT/sourceHeight,normalized=canvas();
   normalized.getContext('2d').drawImage(crop,FRAME_SIZE/2-anchor*scale,FRAME_FOOT-r[3]*scale,r[2]*scale,r[3]*scale);
   const previous=(group==='citizens'?1.85:2.1)/Math.max(...rects.map(r=>r[3]));
   addRow({
    id:`${item.sheet}-${item.row}`,group,name:item.name,detail:item.title??'ชาวเมืองที่เดินอยู่ในอโยธยา',
    source:`assets/citizens40/${item.sheet}.png`,sourceRow:item.row,sourceBodyPixels:sourceHeight,
    beforeWorldHeight:sourceHeight*previous,normalizedCanvas:normalized,
    drawBefore(out){const s=previous*PIXELS_PER_WORLD;out.drawImage(crop,WIDTH/2-anchor*s,FOOT-r[3]*s,r[2]*s,r[3]*s);}
   });
  }
 }
}
function selectedRows(){return allRows.filter(r=>(r.group!=='players'||r.gear===gear)&&(filter==='all'||r.group===filter));}
function draw(row,c){
 const ctx=c.getContext('2d');ctx.clearRect(0,0,WIDTH,HEIGHT);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
 ctx.strokeStyle='#cbd5c1';ctx.lineWidth=1;
 for(let y=FOOT;y>20;y-=BODY_HEIGHT/4){ctx.beginPath();ctx.moveTo(14,y+.5);ctx.lineTo(WIDTH-14,y+.5);ctx.stroke();}
 ctx.save();ctx.setLineDash([5,5]);ctx.strokeStyle='#b29a60';
 ctx.beginPath();ctx.moveTo(12,FOOT-BODY_HEIGHT+.5);ctx.lineTo(WIDTH-12,FOOT-BODY_HEIGHT+.5);ctx.stroke();ctx.restore();
 ctx.strokeStyle='#9eb294';ctx.beginPath();ctx.moveTo(12,FOOT+.5);ctx.lineTo(WIDTH-12,FOOT+.5);ctx.stroke();
 ctx.fillStyle='#829076';ctx.font='11px Tahoma,sans-serif';ctx.fillText('210',14,FOOT-BODY_HEIGHT-7);ctx.fillText('0',14,FOOT+15);
 if(mode==='before')row.drawBefore(ctx);
 else ctx.drawImage(row.normalizedCanvas,(WIDTH-FRAME_SIZE)/2,FOOT-FRAME_FOOT);
}
function download(row){
 const a=document.createElement('a');a.download=`${row.id}-standing-210.png`;a.href=row.normalizedCanvas.toDataURL('image/png');a.click();
}
function render(){
 const rows=selectedRows();audit.rows=rows;audit.mode=mode;audit.gear=gear;audit.filter=filter;
 const root=$('gallery');root.replaceChildren();cards.clear();
 for(const [key,g] of Object.entries(groups)){
  const members=rows.filter(r=>r.group===key);if(!members.length)continue;
  const section=document.createElement('section');section.className='section';
  const heading=document.createElement('div');heading.className='section-head';
  const title=document.createElement('h2');title.textContent=g.title;
  const note=document.createElement('p');note.textContent=g.note;heading.append(title,note);section.append(heading);
  const grid=document.createElement('div');grid.className='grid';
  members.forEach((row,i)=>{
   const card=document.createElement('article');card.className='card';card.dataset.id=row.id;
   const stage=document.createElement('div');stage.className='stage';
   const c=canvas(WIDTH,HEIGHT);c.setAttribute('aria-label',`${row.name} ${mode==='after'?'หลังปรับ':'ก่อนปรับ'}`);c.setAttribute('role','img');
   const index=document.createElement('span');index.className='index';index.textContent=String(i+1).padStart(2,'0');stage.append(c,index);
   const body=document.createElement('div');body.className='card-body';
   const name=document.createElement('p');name.className='name';name.textContent=row.name;
   const sub=document.createElement('p');sub.className='sub';sub.textContent=row.detail;
   const measure=document.createElement('div');measure.className='measure';
   const old=document.createElement('span');old.className='old-value';old.textContent=`เดิม ${row.beforeBodyPixels.toFixed(1)}`;
   const value=document.createElement('strong');value.textContent=`→ ${row.afterBodyPixels.toFixed(0)} px`;measure.append(old,value);
   const button=document.createElement('button');button.type='button';button.className='download';button.textContent='ดาวน์โหลดภาพหลังปรับ';button.addEventListener('click',()=>download(row));
   body.append(name,sub,measure,button);card.append(stage,body);grid.append(card);cards.set(row.id,c);draw(row,c);
  });
  section.append(grid);root.append(section);
 }
 $('status').textContent=`แสดง ${rows.length} แบบ · ${mode==='after'?'หลังปรับ':'ก่อนปรับ'}`;
}
document.querySelectorAll('[data-mode]').forEach(button=>button.addEventListener('click',()=>{
 mode=button.dataset.mode;document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
 $('mode-note').textContent=mode==='after'
  ?'หลังปรับ: ตัวละครทั้งหมดใช้ส่วนสูงอ้างอิงเดียวกัน 210 px โดยคงสัดส่วนของภาพเดิม ท่าก้มและยกเท้าใช้สเกลคงที่ตลอดชุดอนิเมชัน'
  :'ก่อนปรับ: จำลองขนาดที่เคยใช้ในเกมด้วยพิกเซลต่อหน่วยโลกเท่ากัน ภาพ NPC เดิมบางภาพมีขอบโปร่งใสใต้เท้า จึงเห็นเท้าลอยเหนือเส้นพื้น ผู้เล่นเป็นขนาดอ้างอิงที่คงไว้';
 if(audit.ready)render();
}));
document.querySelectorAll('[data-gear]').forEach(button=>button.addEventListener('click',()=>{
 gear=button.dataset.gear;document.querySelectorAll('[data-gear]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));if(audit.ready)render();
}));
$('group-filter').addEventListener('change',e=>{filter=e.target.value;if(audit.ready)render();});
audit.select=({mode:nextMode,gear:nextGear,group:nextGroup}={})=>{
 if(nextMode)document.querySelector(`[data-mode="${nextMode==='before'?'before':'after'}"]`).click();
 if(nextGear)document.querySelector(`[data-gear="${nextGear==='crafted'?'crafted':'basic'}"]`).click();
 if(nextGroup&&['all',...Object.keys(groups)].includes(nextGroup)){$('group-filter').value=nextGroup;$('group-filter').dispatchEvent(new Event('change'));}
};
audit.download=download;
try{
 const [world,meta]=await Promise.all([json('./maps/world.json'),json('./assets/citizens40/frames.json')]);
 const results=await Promise.allSettled([loadPlayers(),loadPeople(world),loadCity(meta)]);
 results.forEach(result=>{if(result.status==='rejected')audit.errors.push(String(result.reason?.stack??result.reason));});
}catch(error){audit.errors.push(String(error?.stack??error));}
audit.ready=true;
if(audit.errors.length){$('error-box').hidden=false;$('error-box').textContent='บางภาพโหลดไม่สำเร็จ: '+audit.errors.join(' · ');}
render();
