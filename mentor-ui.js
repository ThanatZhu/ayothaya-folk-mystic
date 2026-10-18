import {trainingStatus,mentorById} from './city-life-data.js?v=66.1';
import {className} from './classes.js?v=18';
import {getLoadingScreen} from './loading-screen.js?v=39';
const errors={'trainer-level':'ระดับยังไม่ถึงเงื่อนไขของครู','trainer-distance':'เดินเข้าใกล้ครูก่อนนะ','trainer-active':'มีบททดสอบที่รับไว้แล้ว ให้กลับหาครูสายเดิมก่อน','trainer-incomplete':'ยังทำบททดสอบไม่ครบ','trainer-class':'ครูท่านนี้สอนอีกสายอาชีพ','trainer-finished':'คุณผ่านการเลื่อนขั้นแล้ว','trainer-quest':'ยังไม่ได้รับบททดสอบนี้','action-rate':'รอสักครู่แล้วลองอีกครั้ง','online-required':'ต้องเชื่อมต่อเซิร์ฟเวอร์ก่อนรับบททดสอบ','not-connected':'กำลังเชื่อมต่อเซิร์ฟเวอร์ กรุณารอสักครู่'};
export function createMentorUI({game,account}){
 const panel=document.createElement('dialog');panel.id='mentor-panel';panel.setAttribute('aria-labelledby','mentor-name');
 panel.innerHTML='<header><div><small>ลานครูแห่งอโยธยา</small><h2 id="mentor-name"></h2></div><button id="mentor-close" aria-label="ปิดบทสนทนา">×</button></header><div class="mentor-content"><div class="mentor-portrait" role="img"></div><section><p id="mentor-role"></p><p id="mentor-story"></p><h3 id="mentor-quest"></h3><p id="mentor-objective"></p><progress id="mentor-progress"></progress><label id="mentor-branch-label">เลือกสาย Master<select id="mentor-branch"></select></label><p id="mentor-result" role="status"></p><div class="mentor-actions"><button id="mentor-accept">รับบททดสอบ</button><button id="mentor-complete">ส่งบททดสอบ</button><button id="mentor-cancel">ยกเลิกบททดสอบ</button></div></section></div>';
 document.getElementById('game-shell').append(panel);const $=id=>panel.querySelector('#'+id);let current=null,busy=false,last='';
 const journal=document.createElement('aside');journal.id='training-journal';journal.hidden=true;journal.innerHTML='<strong>บททดสอบจากครู</strong><span></span><small></small>';document.getElementById('game-shell').append(journal);
 const close=()=>{if(busy)return;panel.close();};$('mentor-close').onclick=close;panel.addEventListener('cancel',e=>{if(busy)e.preventDefault();});panel.addEventListener('close',()=>{if(current)current.talking=false;current=null;game.clearInput();});
 async function act(action){if(busy||!current)return;busy=true;for(const b of panel.querySelectorAll('button'))b.disabled=true;$('mentor-result').textContent='กำลังบันทึก…';
  try{const result=await account.train(current.mentorId,action,$('mentor-branch').value);if(result.advanced){$('mentor-result').textContent='ผ่านบททดสอบแล้ว กำลังเตรียมอาชีพใหม่…';getLoadingScreen().show('ayutthaya');location.reload();return;}$('mentor-result').textContent=action==='accept'?'รับบททดสอบแล้ว ออกไปฝึกนอกกำแพงเมืองได้เลย':'ยกเลิกบททดสอบแล้ว';}
  catch(e){$('mentor-result').textContent=errors[e.message]??'บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง';}finally{busy=false;for(const b of panel.querySelectorAll('button'))b.disabled=false;render();}
 }
 $('mentor-accept').onclick=()=>act('accept');$('mentor-complete').onclick=()=>act('complete');$('mentor-cancel').onclick=()=>act('cancel');
 function render(){if(!current)return;const s=trainingStatus(account.character,account.training,game.world,current.mentorId),ready=s.own&&s.progress>=s.target;
  $('mentor-role').textContent=current.title+' · '+className(current.classId,account.character.gender);
  $('mentor-quest').textContent=s.tier==='class'?'บททดสอบฝากตัวเป็นศิษย์':'บททดสอบสู่ Master';
  $('mentor-objective').textContent=s.completed?'คุณผ่านการเลื่อนขั้นแล้ว ยินดีต้อนรับกลับมาฝึกฝนเสมอ':s.wrongClass?'กลับไปหาครูประจำสายอาชีพของคุณเพื่อเลื่อนขั้น':!s.eligible?'ฝึกถึง Base Lv. '+s.required+' ก่อนกลับมารับบททดสอบ':s.training&&!s.own?'คุณรับบททดสอบของสาย '+className(s.training.classId,account.character.gender)+' ไว้แล้ว':(s.own?'กำจัดมอนสเตอร์นอกเมือง '+s.progress+' / '+s.target+' ตัว':'รับบททดสอบ แล้วกำจัดมอนสเตอร์นอกเมือง '+s.target+' ตัว')+' · กลับมาหาครูเพื่อ'+(s.tier==='class'?'เปลี่ยนอาชีพ':'เลื่อนขั้น')+(ready?' · พร้อมส่งแล้ว':'');
  const allowed=!s.completed&&!s.wrongClass&&s.eligible;
  $('mentor-progress').hidden=!s.own;$('mentor-progress').max=s.target;$('mentor-progress').value=s.progress;
  $('mentor-accept').hidden=!allowed||!!s.training;$('mentor-cancel').hidden=!s.own||s.completed;$('mentor-complete').hidden=!s.own||s.completed;$('mentor-complete').disabled=busy||!ready;
  $('mentor-branch-label').hidden=!allowed||!s.own||s.tier!=='master';
 }
 function open(n){if(busy)return;if(current)current.talking=false;current=n;n.talking=true;game.clearInput();$('mentor-name').textContent=n.name;$('mentor-story').textContent=n.text;$('mentor-result').textContent='';
  const portrait=panel.querySelector('.mentor-portrait');portrait.style.backgroundImage=`url("./assets/citizens40/${n.sheet}.png")`;portrait.style.backgroundPosition=`0% ${n.row/3*100}%`;portrait.setAttribute('aria-label',n.name);
  $('mentor-branch').replaceChildren(...trainingStatus(account.character,account.training,game.world,n.mentorId).branches.map(j=>{const o=document.createElement('option');o.value=j.id;o.textContent=j.name+' · '+j.style;return o;}));render();if(!panel.open)panel.showModal();$('mentor-close').focus();
 }
 function update(){const q=account.training,key=JSON.stringify([q,game.world.kills]);if(key===last)return;last=key;journal.hidden=!q;if(q){const m=mentorById(q.classId==='acolyte'?'monk-master':({swordsman:'sword-master',lancer:'spear-master',hunter:'hunt-master',boxer:'box-master',rogue:'shadow-master',shaman:'spirit-master'})[q.classId]);const s=trainingStatus(account.character,q,game.world,m.id);journal.querySelector('span').textContent=className(q.classId,account.character.gender)+' · มอนสเตอร์ '+s.progress+'/'+s.target;journal.querySelector('small').textContent=s.progress>=s.target?'กลับลานครูเพื่อส่งบททดสอบ':'ฝึกนอกเมือง · บันทึกอัตโนมัติ';}render();}
 return {open,update,get paused(){return panel.open;}};
}
