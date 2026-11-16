// The dialog never executes a reset on load, on preview, or on closing it.
export function createAdminResetUI({fetchAdmin,canUse,container=document.querySelector('header .actions')}){
 if(!container)return {syncVisibility(){}};
 const style=document.createElement('link');style.rel='stylesheet';style.href=new URL('./admin-reset.css?v=166',import.meta.url);document.head.append(style);
 const entry=document.createElement('button');entry.type='button';entry.id='world-reset-open';entry.className='world-reset-entry';entry.hidden=true;entry.textContent='รีเซ็ตก่อนเปิด CBT';container.append(entry);
 const dialog=document.createElement('dialog');dialog.id='world-reset-dialog';dialog.className='world-reset-dialog';dialog.setAttribute('aria-labelledby','world-reset-title');
 dialog.innerHTML=`<header><div><span class="eyebrow">AYOTHAYA · WORLD RESET</span><h2 id="world-reset-title">เริ่มโลกใหม่ก่อนเปิด CBT</h2></div><button type="button" data-close aria-label="ปิด">×</button></header>
 <div class="world-reset-body"><p class="reset-intro">ลบตัวละครทุกไอดี ทั้งเซิร์ฟเวอร์ 1 และ 2 เพื่อให้ทุกคนเริ่มสร้างตัวละครใหม่</p>
 <div class="reset-scope"><section><h3>ข้อมูลที่จะล้าง</h3><p>ตัวละครทุกช่อง เลเวล จุติ ของ เงิน ทองแท่ง สัตว์เลี้ยง เควส การ์ด และจดหมาย</p><p>รวมกิลด์ ร้านค้า ตลาด อันดับ ประวัติการเล่น และเวลาเกิดบอส</p></section><section><h3>ข้อมูลที่เก็บไว้</h3><p>บัญชี Google และสิทธิ์แอดมินยังใช้ได้ตามเดิม</p><p>ภาพเกม แผนที่ และค่าสมดุลเกมยังอยู่</p></section></div>
 <p class="reset-backup">ระบบจะหยุดรับผู้เล่น ตัดการเชื่อมต่อ และสำรองข้อมูลบนเซิร์ฟเวอร์ก่อนลบ</p>
 <div id="world-reset-counts" class="reset-counts"></div>
 <p id="world-reset-message" role="status" aria-live="polite"></p>
 <div id="world-reset-confirmation"><label for="world-reset-phrase">พิมพ์ RESET CBT เพื่อยืนยัน</label><input id="world-reset-phrase" autocomplete="off" spellcheck="false" placeholder="RESET CBT">
 <label class="reset-ack"><input id="world-reset-ack" type="checkbox"><span>ยืนยันลบตัวละครทุกไอดี และให้ผู้เล่นเริ่มใหม่ทั้งหมด</span></label></div>
 <p id="world-reset-backup-id" class="reset-backup-id"></p></div>
 <footer><button type="button" data-close>ปิดหน้าต่าง</button><button type="button" id="world-reset-refresh">ตรวจข้อมูลอีกครั้ง</button><button type="button" id="world-reset-execute" class="reset-danger" disabled>ลบตัวละครทุกไอดี</button></footer>`;
 document.body.append(dialog);
 const $=id=>dialog.querySelector('#world-reset-'+id),phrase=$('phrase'),ack=$('ack'),execute=$('execute'),refresh=$('refresh');
 let preview=null,busy=false,working=false,timer=null,opening=0;
 const message=text=>{$('message').textContent=text;};
 function update(){execute.disabled=busy||working||!preview||Date.now()>=preview.expiresAt||phrase.value!=='RESET CBT'||!ack.checked;refresh.disabled=busy||working;}
 function clearConfirmation(){preview=null;phrase.value='';ack.checked=false;update();}
 function counts(summary,online){const labels=[['ไอดี',summary?.accounts],['ตัวละคร',summary?.characters],['รายการข้อมูล',summary?.documents],['ออนไลน์',online]];$('counts').replaceChildren(...labels.filter(([,n])=>n!==undefined).map(([label,n])=>{const el=document.createElement('div'),strong=document.createElement('strong'),small=document.createElement('span');strong.textContent=Number(n??0).toLocaleString();small.textContent=label;el.append(strong,small);return el;}));}
 function failure(error){message('ทำรายการไม่สำเร็จ กรุณาตรวจสถานะแล้วลองอีกครั้ง · '+error.message);}
 function showJob(state){
  const j=state.job;if(!j)return;
  working=['preparing','running'].includes(j.status);$('confirmation').hidden=working||j.status==='completed';execute.hidden=working||j.status==='completed';refresh.hidden=working||j.status==='completed';
  counts(j.summary);$('backup-id').textContent='รหัสสำรองข้อมูล · '+j.id;
  if(j.status==='completed')message('รีเซ็ตสำเร็จแล้ว ผู้เล่นล็อกอินและสร้างตัวละครใหม่ได้');
  else if(j.status==='failed'){message('รีเซ็ตหยุดชั่วคราว ระบบยังไม่เปิดรับผู้เล่น · กดตรวจข้อมูลอีกครั้งเพื่อทำต่อจากข้อมูลสำรองเดิม');}
  else message(j.phase==='backup'?'กำลังสำรองข้อมูลทั้งหมดก่อนลบ…':j.phase==='deleting'?'กำลังล้างตัวละครและข้อมูลโลก…':'กำลังหยุดผู้เล่นและรอให้บันทึกข้อมูลเสร็จ…');
  update();
 }
 async function poll(){if(!dialog.open)return;try{const state=await fetchAdmin('/admin/world-reset');showJob(state);}catch(e){failure(e);}finally{if(dialog.open&&working)timer=setTimeout(poll,2000);}}
 async function prepare(){
  const request=++opening;busy=true;working=false;clearConfirmation();$('confirmation').hidden=false;execute.hidden=false;refresh.hidden=false;message('กำลังตรวจจำนวนข้อมูล…');update();
  try{const p=await fetchAdmin('/admin/world-reset/preview',{});if(request!==opening||!dialog.open)return;preview=p;counts(p.summary,p.online);$('backup-id').textContent=p.backupId?'รหัสสำรองข้อมูล · '+p.backupId:'';execute.textContent=p.resume?'ทำการรีเซ็ตต่อ':'ลบตัวละครทุกไอดี';message(p.resume?'ระบบยังหยุดรับผู้เล่น ยืนยันเพื่อทำการรีเซ็ตต่อจากข้อมูลสำรองเดิม':'ยังไม่มีการลบข้อมูล · คำยืนยันนี้ใช้ได้ 5 นาที');}
  catch(e){failure(e);}finally{busy=false;update();}
 }
 async function open(){
  if(!canUse())return;const request=++opening;clearTimeout(timer);busy=true;working=false;clearConfirmation();$('counts').replaceChildren();$('backup-id').textContent='';message('กำลังตรวจสถานะ…');dialog.showModal();update();
  try{const state=await fetchAdmin('/admin/world-reset');if(request!==opening||!dialog.open)return;if(state.maintenance){busy=false;showJob(state);if(working)timer=setTimeout(poll,2000);}else await prepare();}
  catch(e){failure(e);}finally{busy=false;update();}
 }
 entry.onclick=open;refresh.onclick=async()=>{busy=true;update();try{const state=await fetchAdmin('/admin/world-reset');if(state.job&&['preparing','running'].includes(state.job.status)){showJob(state);timer=setTimeout(poll,500);}else await prepare();}catch(e){failure(e);}finally{busy=false;update();}};phrase.oninput=ack.onchange=update;
 dialog.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>dialog.close());
 dialog.addEventListener('close',()=>{opening++;clearTimeout(timer);clearConfirmation();entry.focus();});
 execute.onclick=async()=>{
  update();if(execute.disabled)return;const p=preview;busy=true;update();
  try{const state=await fetchAdmin('/admin/world-reset/execute',{challenge:p.challenge,confirmation:phrase.value,acknowledge:ack.checked});clearConfirmation();showJob(state);if(working)timer=setTimeout(poll,500);}
  catch(e){clearConfirmation();failure(e);}finally{busy=false;update();}
 };
 // Expiring a preview only disables its submit button; it never initiates an action.
 const expiry=setInterval(()=>{if(dialog.open)update();},1000);
 return {syncVisibility(){entry.hidden=!canUse();if(entry.hidden&&dialog.open)dialog.close();},destroy(){clearTimeout(timer);clearInterval(expiry);entry.remove();dialog.remove();style.remove();}};
}
