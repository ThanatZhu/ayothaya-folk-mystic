import {loadPaintedCharacter} from './painted-character.js?v=size1';
import {BODY_HEIGHT,FRAME_SIZE,FRAME_FOOT,WORLD_BODY_HEIGHT} from './character-size.js?v=size1';
import {peoplePlacement,citizenBodyHeight} from './npc-size.js?v=size1';
import {CLASSES,NOVICE,className} from './classes.js?v=novice174';
import {MENTORS,CITIZEN_STYLES} from './city-life-data.js?v=98';
import {POSTURE_TRANSITIONS} from './character-action-state.js?v=106.0';

const ACTIONS=['idle','walk','run','sit','sleep','sitDown','standUp'];
const ACTION_NAMES={idle:'ยืน',walk:'เดิน',run:'วิ่ง',sit:'นั่ง',sleep:'นอน',sitDown:'นั่งลง',standUp:'ลุกขึ้น'};
const POSTURE_CYCLE=['idle','sitDown','sit','standUp'];
const GROUP_NAMES={players:'ผู้เล่น',story:'NPC เนื้อเรื่อง',mentors:'ครูอาชีพ',citizens:'ชาวเมือง'};
const PIXELS_PER_WORLD=BODY_HEIGHT/WORLD_BODY_HEIGHT;
const rows=[],images=new Map(),cards=new Map();
const $=id=>document.getElementById(id);
const query=new URLSearchParams(location.search);
const state={id:query.get('id')??'novice-male',action:ACTIONS.includes(query.get('action'))?query.get('action'):'walk',group:'all',speed:.5,playing:!matchMedia('(prefers-reduced-motion: reduce)').matches,elapsed:0,frame:0,ghost:false,ruler:true,cycle:false};
const audit=window.characterAnimationAudit={ready:false,errors:[],rows,selected:null,available:[],frame:0,frameCount:0,targetBodyPixels:BODY_HEIGHT,frameSize:FRAME_SIZE,frameFoot:FRAME_FOOT};
const makeCanvas=(w=FRAME_SIZE,h=FRAME_SIZE)=>Object.assign(document.createElement('canvas'),{width:w,height:h});
async function json(path){const r=await fetch(path);if(!r.ok)throw new Error(`${path}: HTTP ${r.status}`);return r.json();}
function image(path){
  if(!images.has(path))images.set(path,(async()=>{const img=new Image();img.src=path;await img.decode();return img;})());
  return images.get(path);
}
function cropFrame(img,rect,{scale=1,anchor=rect[2]/2,cutoff=128}={}){
  const [x,y,w,h]=rect,crop=makeCanvas(w,h),ctx=crop.getContext('2d',{willReadFrequently:true});
  ctx.drawImage(img,x,y,w,h,0,0,w,h);
  const pixels=ctx.getImageData(0,0,w,h);
  for(let i=3;i<pixels.data.length;i+=4)if(pixels.data[i]<cutoff)pixels.data[i]=0;
  ctx.putImageData(pixels,0,0);
  const out=makeCanvas(),draw=out.getContext('2d');draw.imageSmoothingEnabled=true;draw.imageSmoothingQuality='high';
  draw.drawImage(crop,FRAME_SIZE/2-anchor*scale,FRAME_FOOT-h*scale,w*scale,h*scale);
  return out;
}
const still=frame=>({frames:[frame],fps:1,loop:true,source:'original',note:'ภาพยืนเดิมหนึ่งเฟรม พร้อมจังหวะหายใจเบา ๆ แบบเดียวกับในเกม'});
async function loadPlayers(){
  const crafted=query.get('equipment')==='crafted';
  const classes=crafted?CLASSES.filter(c=>['shaman','rogue'].includes(c.id)):[NOVICE,...CLASSES];
  await Promise.all(classes.map(async(item,order)=>{
    const equipment={weapon:`${item.id}-weapon-${crafted?'crafted':'basic'}`};
    const art=await loadPaintedCharacter(item.id,{},equipment);
    for(const [sexOrder,gender] of ['male','female'].entries()){
      const frames=art[gender],idle=still(frames[0]);
      const clips={idle};
      if(frames.length>=20)clips.walk={frames:frames.slice(12,20),fps:8,loop:true,source:'original',note:'ท่าเดินเดิม 8 เฟรม · ดูที่ 0.5× เพื่อตรวจขา แขน และตำแหน่งกระเป๋า'};
      rows.push({id:`${item.id}-${gender}`,group:'players',order:order*2+sexOrder,classId:item.id,gender,equipment,
        name:className(item.id,gender)+(item.id==='acolyte'?'':gender==='male'?' · ชาย':' · หญิง'),
        detail:crafted?'อาวุธรูปลักษณ์พิเศษ':'อุปกรณ์ชุดเริ่มต้น',standing:frames[0],clips});
    }
  }));
}
async function loadPeople(world){
  const img=await image('./assets/people.png'),w=Math.round(img.width/2),h=Math.round(img.height/2);
  const allNPCs=Object.values(world.maps).flatMap(m=>m.npcs??[]).filter(n=>!n.mentorId);
  for(let i=0;i<4;i++){
    const placement=peoplePlacement(i,w,h),scale=placement.width*PIXELS_PER_WORLD/w;
    // The calibrated anchor excludes empty atlas padding and equipment above the head.
    const standing=cropFrame(img,[(i%2)*w,Math.floor(i/2)*h,w,h],{scale,anchor:placement.centerX*w,cutoff:115});
    const verticalOffset=placement.centerY*h*scale;
    if(verticalOffset){const shifted=makeCanvas();shifted.getContext('2d').drawImage(standing,0,verticalOffset);standing.getContext('2d').clearRect(0,0,FRAME_SIZE,FRAME_SIZE);standing.getContext('2d').drawImage(shifted,0,0);}
    const names=[...new Set(allNPCs.filter(n=>n.texture===i).map(n=>n.name))];
    rows.push({id:`people-${i}`,group:'story',order:100+i,name:names[0]??`NPC ${i+1}`,names,
      detail:names.length>1?`ใช้ภาพร่วมกับ ${names.slice(1).join(' · ')}`:'NPC ประจำจุด',standing,clips:{idle:still(standing)}});
  }
}
async function loadCity(meta){
  await Promise.all([['mentors',MENTORS],['citizens',CITIZEN_STYLES]].flatMap(([group,items])=>items.map(async(item,index)=>{
    const m=meta[item.sheet],img=await image(`./assets/citizens40/${item.sheet}.png`),scale=BODY_HEIGHT/citizenBodyHeight(item.sheet,item.row);
    const frames=m.rects.slice(item.row*m.columns,(item.row+1)*m.columns).map((r,i)=>cropFrame(img,r,{scale,anchor:m.anchors[item.row*m.columns+i]}));
    const clips={idle:still(frames[0])};
    if(group==='mentors'&&frames[1])clips.idle={frames:[frames[0],frames[1],frames[0]],frameDurations:[3.8,.17,.35],fps:1,loop:true,source:'original',note:'ท่ายืนและจังหวะกะพริบตาจากภาพครูเดิม'};
    if(group==='citizens'&&frames.length>=4)clips.walk={frames:frames.slice(2,4),fps:3,loop:true,source:'original',note:'ภาพเดินเดิม 2 เฟรม · ชุดนี้ยังต้องปรับการสลับขาและตำแหน่งสัมภาระ'};
    rows.push({id:`${item.sheet}-${item.row}`,group,order:(group==='mentors'?200:300)+index,
      name:item.name,detail:item.title??'ชาวเมืองในอโยธยา',standing:frames[0],clips});
  })));
}
function clipDuration(clip){
  return clip?.frameDurations?.reduce((a,b)=>a+b,0)??(clip?clip.frames.length/Math.max(.01,clip.fps??8):0);
}
function frameAt(clip,time){
  if(!clip?.frames?.length)return 0;
  const duration=clipDuration(clip),t=clip.loop===false?Math.min(Math.max(0,time),Math.max(0,duration-.00001)):((time%duration)+duration)%duration;
  if(clip.frameDurations){let total=0;for(let i=0;i<clip.frameDurations.length;i++){total+=clip.frameDurations[i];if(t<total)return i;}return clip.frames.length-1;}
  return Math.min(clip.frames.length-1,Math.floor(t*(clip.fps??8)));
}
function frameStart(clip,frame){
  return clip?.frameDurations?clip.frameDurations.slice(0,frame).reduce((a,b)=>a+b,0):frame/Math.max(.01,clip?.fps??8);
}
function currentRow(){return rows.find(r=>r.id===state.id);}
function currentClip(){return currentRow()?.clips[state.action]??null;}
function breathPeriod(){return state.action==='sleep'?4.8:4.1;}
function hasBreath(){return !!currentClip()&&['idle','sit','sleep'].includes(state.action);}
function availability(clip){return clip?.frames?.length>1?'animated':clip?.frames?.length?'static':'pending';}
function updateAudit(){
  const row=currentRow(),clip=currentClip();
  audit.selected={id:state.id,action:state.action,group:state.group,speed:state.speed,playing:state.playing,ghost:state.ghost,ruler:state.ruler,cycle:state.cycle};
  audit.available=ACTIONS.filter(a=>row?.clips[a]?.frames?.length);
  audit.frame=state.frame;audit.frameCount=clip?.frames.length??0;
}
function syncPlayback(){
  const clip=currentClip(),animated=(clip?.frames.length??0)>1,canPlay=animated||hasBreath();
  $('play-label').textContent=!clip?'ยังไม่มีภาพ':!canPlay?'ภาพท่าทาง':state.playing?'หยุดดู':'เล่นต่อ';$('play-icon').textContent=!canPlay?'◌':state.playing?'Ⅱ':'▶';
  $('play-toggle').setAttribute('aria-pressed',String(state.playing));
  $('play-toggle').disabled=!canPlay;$('frame-prev').disabled=!animated;$('frame-next').disabled=!animated;$('frame-scrubber').disabled=!animated;
  $('frame-scrubber').max=String(Math.max(0,(clip?.frames.length??1)-1));$('frame-scrubber').value=String(state.frame);
  document.querySelectorAll('[data-speed]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.speed)===state.speed)));
  $('clip-duration').textContent=animated?`${clipDuration(clip).toFixed(2)} วินาที`:hasBreath()?`${breathPeriod()} วินาที`:'—';
  updateAudit();
}
function syncSelection(){
  const row=currentRow();if(!row)return;
  $('selected-group').textContent=GROUP_NAMES[row.group];$('selected-name').textContent=row.name;$('selected-description').textContent=row.detail;
  $('character-select').value=row.id;
  const clip=currentClip(),count=clip?.frames.length??0;
  $('main-canvas').setAttribute('aria-label',`${row.name} · ${ACTION_NAMES[state.action]}${count?'':' · ยังไม่มีภาพ'}`);
  $('stage-state').textContent=count?`${ACTION_NAMES[state.action]} · ${count} เฟรม`:`${ACTION_NAMES[state.action]} · รอภาพท่าใหม่`;
  $('missing-clip').hidden=!!count;$('missing-title').textContent=`ยังไม่มีภาพท่า${ACTION_NAMES[state.action]}`;
  $('missing-note').textContent=`${row.name} ยังไม่มีภาพท่านี้ในชุดที่นำมาแสดง เลือกท่าอื่นเพื่อดูภาพที่มีอยู่ได้`;
  const badge=$('clip-badge');badge.classList.toggle('pending',!count);
  badge.textContent=!count?'รอภาพท่าใหม่':clip.source==='original'?(count===1?'ภาพนิ่งเดิม':'ภาพเคลื่อนไหวเดิม'):`ภาพท่าใหม่ · ${count} เฟรม`;
  $('clip-note').textContent=clip?.note??(count===1?'ภาพท่าทางหนึ่งเฟรม · ยังไม่มีจังหวะขยับต่อเนื่องในคลิปนี้':count?'ตรวจความต่อเนื่องของแขน ขา สัมภาระ และสัดส่วนได้ด้วยปุ่มทีละเฟรม':'จะแสดงภาพเมื่อชุดท่านี้พร้อม โดยคงรูปร่างและขนาดตัวละครเดิม');
  document.querySelectorAll('[data-action]').forEach(b=>{
    b.setAttribute('aria-pressed',String(b.dataset.action===state.action));b.dataset.availability=availability(row.clips[b.dataset.action]);
    b.title=`${ACTION_NAMES[b.dataset.action]} · ${row.clips[b.dataset.action]?.frames.length??0} เฟรม`;
  });
  const canCycle=POSTURE_CYCLE.every(action=>row.clips[action]?.frames.length);
  $('posture-cycle').disabled=!canCycle;$('posture-cycle').setAttribute('aria-pressed',String(state.cycle));
  $('posture-cycle').textContent=state.cycle?'หยุดวงรอบ ยืน → นั่ง → ลุก':'เล่นต่อเนื่อง: ยืน → นั่ง → ลุก';
  $('cycle-note').textContent=!canCycle?'รอภาพนั่งลงและลุกขึ้นของตัวละครนี้':state.cycle?'เล่นเปลี่ยนท่าครั้งเดียว พักนั่ง แล้วลุกกลับมายืน':'ท่านั่งลงและลุกขึ้นเล่นครั้งเดียว แล้วค้างท่านั่งหรือยืน';
  for(const [id,card] of cards)card.setAttribute('aria-pressed',String(id===state.id));
  syncPlayback();drawMain();
}
function drawMain(){
  const canvas=$('main-canvas'),ctx=canvas.getContext('2d'),row=currentRow(),clip=currentClip();
  ctx.clearRect(0,0,canvas.width,canvas.height);ctx.imageSmoothingEnabled=false;
  const scale=1.75,foot=540,left=canvas.width/2-FRAME_SIZE/2*scale,top=foot-FRAME_FOOT*scale;
  if(state.ruler){
    ctx.lineWidth=1;ctx.strokeStyle='#b9c8a8';ctx.beginPath();ctx.moveTo(105,foot+.5);ctx.lineTo(855,foot+.5);ctx.stroke();
    ctx.save();ctx.setLineDash([6,8]);ctx.strokeStyle='#c0ae78';ctx.beginPath();ctx.moveTo(105,foot-BODY_HEIGHT*scale+.5);ctx.lineTo(855,foot-BODY_HEIGHT*scale+.5);ctx.stroke();ctx.restore();
    ctx.fillStyle='#7f8d6f';ctx.font='15px Tahoma,sans-serif';ctx.fillText('210 px',107,foot-BODY_HEIGHT*scale-13);ctx.fillText('0',107,foot+26);
    ctx.strokeStyle='#d1dbc4';ctx.beginPath();ctx.moveTo(480,foot-390);ctx.lineTo(480,foot+10);ctx.stroke();
  }
  if(state.ghost&&row?.standing&&clip){ctx.globalAlpha=.15;ctx.drawImage(row.standing,left,top,FRAME_SIZE*scale,FRAME_SIZE*scale);ctx.globalAlpha=1;}
  if(clip){
    const frame=clip.frames[state.frame]??clip.frames[0];
    // Match rigged-sprite's 0.25% breath around the ground contact. This is a
    // rendering motion over the authored pose, not invented additional frames.
    const breath=hasBreath()?1+Math.sin(state.elapsed*Math.PI*2/breathPeriod())*.0025:1;
    ctx.drawImage(frame,left,foot-FRAME_FOOT*scale*breath,FRAME_SIZE*scale,FRAME_SIZE*scale*breath);
  }
  $('frame-counter').textContent=clip?`${String(state.frame+1).padStart(2,'0')} / ${String(clip.frames.length).padStart(2,'0')}`:'—';
  $('frame-scrubber').value=String(state.frame);updateAudit();
}
function renderLibrary(){
  const root=$('character-grid');root.replaceChildren();cards.clear();
  const visible=rows.filter(r=>state.group==='all'||r.group===state.group);
  for(const row of visible){
    const button=document.createElement('button');button.type='button';button.className='character-card';button.dataset.id=row.id;
    button.setAttribute('aria-pressed',String(row.id===state.id));button.setAttribute('aria-label',`ดู ${row.name}`);
    const imageWrap=document.createElement('div');imageWrap.className='card-image';
    const c=makeCanvas(),ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.drawImage(row.standing,0,0);
    c.setAttribute('aria-hidden','true');const group=document.createElement('span');group.className='card-group';group.textContent=GROUP_NAMES[row.group];
    imageWrap.append(c,group);
    const content=document.createElement('div');content.className='card-content';const name=document.createElement('strong');name.textContent=row.name;
    const states=document.createElement('div');states.className='state-list';
    for(const action of ACTIONS){
      const stateEl=document.createElement('span'),status=availability(row.clips[action]);stateEl.className=status;
      const count=row.clips[action]?.frames.length??0;stateEl.title=`${ACTION_NAMES[action]} · ${count>0?`${count} เฟรม`:'รอภาพท่าใหม่'}`;
      const dot=document.createElement('i');dot.setAttribute('aria-hidden','true');stateEl.append(dot,document.createTextNode(ACTION_NAMES[action]));states.append(stateEl);
    }
    content.append(name,states);button.append(imageWrap,content);button.addEventListener('click',()=>setSelection({id:row.id}));
    root.append(button);cards.set(row.id,button);
  }
  $('library-status').textContent=`แสดง ${visible.length} จาก ${rows.length} แบบ · เลือกภาพเพื่อดูท่าทางด้านบน`;
}
function populateSelect(){
  const select=$('character-select');select.replaceChildren();
  for(const [key,label] of Object.entries(GROUP_NAMES)){
    const group=document.createElement('optgroup');group.label=label;
    for(const row of rows.filter(r=>r.group===key)){const option=document.createElement('option');option.value=row.id;option.textContent=row.name;group.append(option);}
    select.append(group);
  }
  select.disabled=!rows.length;
}
function setSelection(next={}){
  let reset=false;
  if(next.id||next.action||Number.isFinite(next.frame))state.cycle=false;
  if(next.id&&rows.some(r=>r.id===next.id)&&next.id!==state.id){state.id=next.id;reset=true;}
  if(next.action&&ACTIONS.includes(next.action)&&next.action!==state.action){state.action=next.action;reset=true;}
  if(next.group&&['all',...Object.keys(GROUP_NAMES)].includes(next.group)){state.group=next.group;$('group-filter').value=next.group;renderLibrary();}
  if([.5,1].includes(Number(next.speed)))state.speed=Number(next.speed);
  if(typeof next.playing==='boolean')state.playing=next.playing;
  if(typeof next.ghost==='boolean'){state.ghost=next.ghost;$('show-ghost').checked=state.ghost;}
  if(typeof next.ruler==='boolean'){state.ruler=next.ruler;$('show-ruler').checked=state.ruler;}
  if(reset){state.elapsed=0;state.frame=0;}
  const clip=currentClip();
  if(Number.isFinite(next.frame)&&clip){state.frame=Math.min(clip.frames.length-1,Math.max(0,Math.round(next.frame)));state.elapsed=frameStart(clip,state.frame);state.playing=false;}
  syncSelection();return audit.selected;
}
function setCycle(value){
  if(value&&!POSTURE_CYCLE.every(action=>currentRow()?.clips[action]?.frames.length))return false;
  state.cycle=!!value;
  if(state.cycle){state.action='idle';state.elapsed=0;state.frame=0;state.playing=true;}
  syncSelection();return state.cycle;
}
function advancePlayback(seconds){
  const clip=currentClip();if(!clip)return;
  state.elapsed+=Math.max(0,seconds)*state.speed;
  let changed=false;
  // Transitions never loop on their own. A selected transition ends in its
  // authored resting pose; the optional cycle also holds each rest for 2.4 s.
  for(let guard=0;guard<32;guard++){
    const active=currentClip(),duration=state.cycle&&!POSTURE_TRANSITIONS[state.action]?2.4:clipDuration(active);
    if(!(duration>0)||state.elapsed<duration)break;
    let next;
    if(state.cycle)next=POSTURE_CYCLE[(POSTURE_CYCLE.indexOf(state.action)+1)%POSTURE_CYCLE.length];
    else next=POSTURE_TRANSITIONS[state.action];
    if(!next||!currentRow()?.clips[next]?.frames.length)break;
    state.elapsed-=duration;state.action=next;changed=true;
  }
  state.frame=frameAt(currentClip(),state.elapsed);
  if(changed)syncSelection();else drawMain();
}
audit.setSelection=setSelection;audit.select=setSelection;
audit.frameAt=frameAt;
audit.setCycle=setCycle;audit.advance=advancePlayback;
$('character-select').addEventListener('change',e=>setSelection({id:e.target.value}));
$('group-filter').addEventListener('change',e=>setSelection({group:e.target.value}));
document.querySelectorAll('[data-action]').forEach(b=>b.addEventListener('click',()=>setSelection({action:b.dataset.action})));
document.querySelectorAll('[data-speed]').forEach(b=>b.addEventListener('click',()=>setSelection({speed:Number(b.dataset.speed)})));
$('play-toggle').addEventListener('click',()=>setSelection({playing:!state.playing}));
for(const [id,step] of [['frame-prev',-1],['frame-next',1]])$(id).addEventListener('click',()=>{const n=currentClip()?.frames.length??1;setSelection({frame:(state.frame+step+n)%n});});
$('frame-scrubber').addEventListener('input',e=>setSelection({frame:Number(e.target.value)}));
$('show-ruler').addEventListener('change',e=>setSelection({ruler:e.target.checked}));
$('show-ghost').addEventListener('change',e=>setSelection({ghost:e.target.checked}));
$('posture-cycle').addEventListener('click',()=>setCycle(!state.cycle));
let previous=performance.now();
function tick(now){
  const dt=Math.min(.1,(now-previous)/1000);previous=now;
  if(audit.ready&&state.playing&&!document.hidden){const clip=currentClip();if(clip&&(clip.frames.length>1||hasBreath()))advancePlayback(dt);}
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
try{
  const [world,cityMeta]=await Promise.all([json('./maps/world.json'),json('./assets/citizens40/frames.json')]);
  const loaded=await Promise.allSettled(query.get('equipment')==='crafted'?[loadPlayers()]:[loadPlayers(),loadPeople(world),loadCity(cityMeta)]);
  for(const item of loaded)if(item.status==='rejected')audit.errors.push(String(item.reason?.message??item.reason));
  rows.sort((a,b)=>a.order-b.order);
  // A missing authored clip remains visibly unavailable; it is never replaced by a distorted standing image.
  const {loadLifeArt}=await import('./character-life-art.js?v=106.0');
  const newArt=await Promise.allSettled(rows.map(async row=>{
    const art=await loadLifeArt(row.id,{classId:row.classId,equipment:row.equipment});if(!art?.clips)return;
    for(const action of ACTIONS){const clip=art.clips[action];if(clip?.frames?.length)row.clips[action]={...clip,source:'authored'};}
    row.lifeArt=art;
  }));
  for(const item of newArt)if(item.status==='rejected')audit.errors.push(String(item.reason?.message??item.reason));
}catch(error){audit.errors.push(String(error?.message??error));}
if(!currentRow()&&rows.length)state.id=rows[0].id;
if(!query.has('action')&&currentRow()?.clips.sit)state.action='sit';
populateSelect();renderLibrary();audit.ready=true;
if(audit.errors.length){$('error-box').hidden=false;$('error-box').textContent='โหลดภาพบางชุดไม่สำเร็จ: '+audit.errors.join(' · ');}
syncSelection();
