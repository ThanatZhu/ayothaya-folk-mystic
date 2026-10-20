import {createMotionPreview} from './motion-preview.js?v=41.2';
import {APPEARANCE_OPTIONS,validateAppearance} from './appearance-state.js';
import {customizeAtlas} from './character-appearance.js?v=41';
import {JOBS,progression,JOB_LEVEL,advanceReady} from './advancement.js?v=73';
import {atlasPath} from './classes.js?v=101';
import {characterMotion,MOTION_MODES} from './character-motion.js?v=37';
const labels={garment:'แบบเครื่องแต่งกาย',outfit:'สีเครื่องแต่งกาย',hair:'ทรงผม',hairColor:'สีผม',eyes:'สีตา',beard:'หนวดและเครา',tattoo:'รอยยันต์'};
const names={shouldercloth:'ผ้าพาดไหล่',cloak:'ผ้าคลุมเดินทาง',original:'แบบประจำอาชีพ',indigo:'คราม',crimson:'แดงชาด',ivory:'งาช้าง',topknot:'มวยสูง',braid:'เปียข้าง',black:'ดำ',brown:'น้ำตาล',silver:'เงิน',green:'เขียว',blue:'ฟ้า',none:'แบบเดิม / ไม่เพิ่ม',mustache:'หนวด',goatee:'หนวดและเครา',forehead:'ยันต์หน้าผาก',arms:'ยันต์ช่วงไหล่'};
const motions={idle:'ยืนหายใจ',walk:'เดิน',attack:'โจมตี',cast:'ร่ายอาคม',guard:'ตั้งรับ',hit:'ถูกโจมตี',dash:'ก้าวพุ่ง',bow:'คำนับ',celebrate:'ดีใจ',rest:'พัก'};
export function createWardrobe({getClass,getGender,getRecord,onApply,onTexture,onNotice}){
 const dialog=document.createElement('dialog');dialog.id='wardrobe';dialog.setAttribute('aria-labelledby','wardrobe-title');
 dialog.innerHTML='<header><div><h2 id="wardrobe-title">ตัวละครของคุณ</h2><p>รูปลักษณ์และเส้นทางอาชีพ</p></div><button type="button" id="wardrobe-close" aria-label="ปิดหน้าปรับตัวละคร">×</button></header><div class="wardrobe-body"><section class="wardrobe-preview"><div id="wardrobe-art" role="img" aria-label="ตัวอย่างรูปลักษณ์ที่เลือก"></div><label>ลองท่าทาง<select id="wardrobe-motion"></select></label><p id="wardrobe-level"></p></section><section class="wardrobe-fields"><div id="appearance-fields"></div><label>Master · Job 40 ตัน<select id="advanced-job"></select></label><p id="job-description"></p><p id="wardrobe-message" role="status"></p></section></div><footer><button id="wardrobe-apply" type="button">ใช้รูปลักษณ์นี้</button></footer>';
 document.body.append(dialog);const $=id=>dialog.querySelector('#'+id),fields=$('appearance-fields');let appearance=validateAppearance(),jobId='',renderToken=0,mode='idle',time=0,last=0,sourceURL='',gender='male',loading=false,beforeOpen=null,committed=false;
 const preview=createMotionPreview($('wardrobe-art'));const images=new Map();
 for(const [key,options] of Object.entries(APPEARANCE_OPTIONS)){
  const label=document.createElement('label');label.textContent=labels[key];const select=document.createElement('select');select.id='appearance-'+key;
  for(const value of options){const option=document.createElement('option');option.value=value;option.textContent=names[value];select.append(option);}
  select.onchange=()=>{appearance[key]=select.value;render();};label.append(select);fields.append(label);
 }
 for(const key of MOTION_MODES){const option=document.createElement('option');option.value=key;option.textContent=motions[key];$('wardrobe-motion').append(option);}
 $('wardrobe-motion').onchange=()=>{mode=$('wardrobe-motion').value;time=0;};
 $('wardrobe-close').onclick=()=>dialog.close();
 async function render(){
  const token=++renderToken,id=getClass(),path=atlasPath(id);gender=getGender();
  try{
   if(!images.has(path))images.set(path,new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=path;}));
   const img=await images.get(path);if(token!==renderToken)return;
   const atlas=customizeAtlas(img,appearance,id);sourceURL=atlas.toDataURL();preview.setSource(atlas,gender,id,getRecord()?.equipment);onTexture(sourceURL,atlas,gender);
  }catch{images.delete(path);$('wardrobe-message').textContent='โหลดรูปลักษณ์ไม่ได้ ลองเปิดหน้านี้อีกครั้ง';}
 }
 function reset(next={},job=''){appearance=validateAppearance(next);jobId=job;for(const key of Object.keys(labels))$('appearance-'+key).value=appearance[key];}
 dialog.addEventListener('cancel',e=>{if(loading)e.preventDefault();});
 dialog.addEventListener('close',()=>{if(!committed&&beforeOpen){reset(beforeOpen.appearance,beforeOpen.jobId);render();}document.getElementById('open-wardrobe')?.focus();});
 function open(){
  beforeOpen={appearance:{...appearance},jobId};committed=false;
  const record=getRecord(),kills=record?.state.traveler??0,level=progression(kills).level;
  $('wardrobe-level').textContent=`Lv. ${level} · EXP ${progression(kills).xp}`;
  const select=$('advanced-job');select.replaceChildren();const base=document.createElement('option');base.value='';base.textContent='ยังไม่เป็น Master';base.disabled=!!record?.character.jobId;select.append(base);
  for(const job of JOBS[getClass()]){const option=document.createElement('option');option.value=job.id;option.textContent=job.name+' · '+job.style;option.disabled=!record||(!advanceReady(kills,record.character.classId,'').ok&&job.id!==record.character.jobId)||!!record?.character.jobId&&job.id!==record.character.jobId;select.append(option);}
  if(!JOBS[getClass()].some(j=>j.id===jobId))jobId='';select.value=jobId;select.disabled=true;
  $('job-description').textContent=record?.character.jobId?'ผ่านบททดสอบ Master แล้ว':'พบครูประจำสายที่ลานครูแห่งอโยธยา · Job 10 ตันเปลี่ยนอาชีพ · Job 40 ตันรับ Master';
  // Monastic characters keep their class-specific shaved head.
  for(const key of ['hair','hairColor'])$('appearance-'+key).disabled=getClass()==='acolyte';
  $('wardrobe-message').textContent=getClass()==='acolyte'?'พระและแม่ชีคงรูปลักษณ์ศีรษะประจำอาชีพ':'';
  render();dialog.showModal();
 }
 $('advanced-job').onchange=()=>jobId=$('advanced-job').value;
 $('wardrobe-apply').onclick=async()=>{
  if(loading)return;loading=true;$('wardrobe-apply').disabled=true;$('wardrobe-close').disabled=true;
  try{await onApply({...appearance},jobId);committed=true;dialog.close();onNotice(getRecord()?'บันทึกรูปลักษณ์แล้ว':'เลือกรูปลักษณ์แล้ว กรอกชื่อเพื่อสร้างตัวละคร');}
  catch(error){$('wardrobe-message').textContent=error.message==='job-locked'?'ต้องให้ Job ตัน (Job 40) ก่อนเลือก Master':error.message==='class-first'?'บันทึกอาชีพเริ่มต้นที่เลือกก่อน แล้วเปิดหน้านี้อีกครั้ง':'บันทึกไม่สำเร็จ กรุณาลองใหม่';}
  finally{loading=false;$('wardrobe-apply').disabled=false;$('wardrobe-close').disabled=false;}
 };
 let drawnAt=0;
 function animate(ms){const dt=Math.min(.05,(ms-last)/1000);last=ms;if(dialog.open&&!document.hidden){time+=dt;if(ms-drawnAt>=1000/30){drawnAt=ms;preview.draw(characterMotion({time:mode==='attack'?time%.95:mode==='cast'?time%1.4:time,mode,classId:getClass(),reduced:matchMedia('(prefers-reduced-motion:reduce)').matches||document.body.classList.contains('motion-off')}));}}requestAnimationFrame(animate);}
 requestAnimationFrame(animate);
 return {open,reset,render,get appearance(){return {...appearance};},get jobId(){return jobId;}};
}
