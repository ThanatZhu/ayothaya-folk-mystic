import {trainingStatus,mentorById,trialItemsShort,MASTER_COURT,TRIAL} from './city-life-data.js?v=98';
import {advanceReady} from './advancement.js?v=73';
import {itemDef} from './items.js?v=107';
// 0.98 the three parts of a trial (hunt · boss · materials); online the server checks the last two.
const trialLines=(s,bag,online)=>{const t=s.trial,items=bag?.items??{};return ['มอนสเตอร์ '+s.progress+'/'+s.target,...(online?[(s.bossDone?'✔ ':'✘ ')+'ล้ม'+t.bossName,...t.items.map(([id,n])=>((items[id]??0)>=n?'✔ ':'✘ ')+itemDef(id).name+' '+Math.min(items[id]??0,n)+'/'+n),((bag?.coins??0)>=t.coins?'✔ ':'✘ ')+t.coins.toLocaleString('th-TH')+' เบี้ย']:[])];};
const trialReady=(s,bag,online)=>s.own&&s.progress>=s.target&&(!online||s.bossDone&&!trialItemsShort(bag,s.trial).length);
import {className} from './classes.js?v=112.1';
import {getLoadingScreen} from './loading-screen.js?v=39';
const errors={'trainer-boss':'ยังไม่ได้ล้มบอสของบททดสอบ','trainer-items':'วัตถุดิบหรือเบี้ยยังไม่ครบ','trainer-level':'ระดับยังไม่ถึงเงื่อนไขของครู','trainer-distance':'เดินเข้าใกล้ครูก่อนนะ','trainer-active':'มีบททดสอบที่รับไว้แล้ว ให้กลับหาครูสายเดิมก่อน','trainer-incomplete':'ยังทำบททดสอบไม่ครบ','trainer-class':'ครูท่านนี้สอนอีกสายอาชีพ','trainer-finished':'คุณผ่านการเลื่อนขั้นแล้ว','trainer-quest':'ยังไม่ได้รับบททดสอบนี้','action-rate':'รอสักครู่แล้วลองอีกครั้ง','online-required':'ต้องเชื่อมต่อเซิร์ฟเวอร์ก่อนรับบททดสอบ','not-connected':'กำลังเชื่อมต่อเซิร์ฟเวอร์ กรุณารอสักครู่'};
export function createMentorUI({game,account,inTown=()=>false,recall=()=>false}){
 const panel=document.createElement('dialog');panel.id='mentor-panel';panel.setAttribute('aria-labelledby','mentor-name');
 panel.innerHTML='<header><div><small>ลานครูแห่งอโยธยา</small><h2 id="mentor-name"></h2></div><button id="mentor-close" aria-label="ปิดบทสนทนา">×</button></header><div class="mentor-content"><div class="mentor-portrait" role="img"></div><section><p id="mentor-role"></p><p id="mentor-story"></p><h3 id="mentor-quest"></h3><p id="mentor-objective"></p><progress id="mentor-progress"></progress><label id="mentor-branch-label">เลือกสาย Master<select id="mentor-branch"></select></label><p id="mentor-stat-note">เมื่อเปลี่ยนอาชีพหรือสาย Master จะคืนแต้มสถานะทั้งหมดให้จัดใหม่</p><p id="mentor-result" role="status"></p><div class="mentor-actions"><button id="mentor-accept">รับบททดสอบ</button><button id="mentor-complete">ส่งบททดสอบ</button><button id="mentor-cancel">ยกเลิกบททดสอบ</button></div></section></div>';
 document.getElementById('game-shell').append(panel);const $=id=>panel.querySelector('#'+id);let current=null,busy=false,last='';
 const journal=document.createElement('aside');journal.id='training-journal';journal.hidden=true;journal.innerHTML='<strong>บททดสอบจากครู</strong><span></span><small></small>';document.getElementById('game-shell').append(journal);
 const close=()=>{if(busy)return;panel.close();};$('mentor-close').onclick=close;panel.addEventListener('cancel',e=>{if(busy)e.preventDefault();});panel.addEventListener('close',()=>{if(current)current.talking=false;current=null;game.clearInput();});
 async function act(action){if(busy||!current)return;busy=true;for(const b of panel.querySelectorAll('button'))b.disabled=true;$('mentor-result').textContent='กำลังบันทึก…';
  try{const result=await account.train(current.mentorId,action,$('mentor-branch').value);if(result.advanced){$('mentor-result').textContent='ผ่านบททดสอบแล้ว กำลังเตรียมอาชีพใหม่…';getLoadingScreen().show('ayutthaya');location.reload();return;}$('mentor-result').textContent=action==='accept'?'รับบททดสอบแล้ว ออกไปฝึกนอกกำแพงเมืองได้เลย':'ยกเลิกบททดสอบแล้ว';}
  catch(e){$('mentor-result').textContent=errors[e.message]??'บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง';}finally{busy=false;for(const b of panel.querySelectorAll('button'))b.disabled=false;render();}
 }
 $('mentor-accept').onclick=()=>act('accept');$('mentor-complete').onclick=()=>act('complete');$('mentor-cancel').onclick=()=>act('cancel');
 function render(){if(!current)return;const s=trainingStatus(account.character,account.training,game.world,current.mentorId),ready=trialReady(s,game.world.bag,game.online);
  $('mentor-stat-note').hidden=s.completed||s.wrongClass;
  $('mentor-role').textContent=current.title+' · '+className(current.classId,account.character.gender);
  $('mentor-quest').textContent=s.tier==='class'?'บททดสอบฝากตัวเป็นศิษย์':'บททดสอบสู่ Master';
  $('mentor-objective').textContent=s.completed?'คุณผ่านการเลื่อนขั้นแล้ว ยินดีต้อนรับกลับมาฝึกฝนเสมอ':s.wrongClass?'กลับไปหาครูประจำสายอาชีพของคุณเพื่อเลื่อนขั้น':!s.eligible?'ฝึก Job ให้ตัน ('+s.jobLevel+' / '+s.jobCap+')'+' ก่อนกลับมารับบททดสอบ':s.training&&!s.own?'คุณรับบททดสอบของสาย '+className(s.training.classId,account.character.gender)+' ไว้แล้ว':(s.own?trialLines(s,game.world.bag,game.online).join(' · '):'บททดสอบ: ล่ามอนสเตอร์ '+s.target+' ตัว'+(game.online?' · ล้ม'+s.trial.bossName+' · นำ'+s.trial.items.map(([id,n])=>itemDef(id).name+' '+n).join(' ')+' และ '+s.trial.coins.toLocaleString('th-TH')+' เบี้ย':''))+' · กลับมาหาครูเพื่อ'+(s.tier==='class'?'เปลี่ยนอาชีพ':'เลื่อนขั้น')+(ready?' · พร้อมส่งแล้ว':'');
  const allowed=!s.completed&&!s.wrongClass&&s.eligible;
  $('mentor-progress').hidden=!s.own;$('mentor-progress').max=s.target;$('mentor-progress').value=s.progress;
  $('mentor-accept').hidden=!allowed||!!s.training;$('mentor-cancel').hidden=!s.own||s.completed;$('mentor-complete').hidden=!s.own||s.completed;$('mentor-complete').disabled=busy||!ready;
  $('mentor-branch-label').hidden=!allowed||!s.own||s.tier!=='master';
 }
 function open(n){if(busy)return;if(current)current.talking=false;current=n;n.talking=true;game.clearInput();$('mentor-name').textContent=n.name;$('mentor-story').textContent=n.text;$('mentor-result').textContent='';
  const portrait=panel.querySelector('.mentor-portrait');portrait.style.backgroundImage=`url("./assets/citizens40/${n.sheet}.png")`;portrait.style.backgroundPosition=`0% ${n.row/3*100}%`;portrait.setAttribute('aria-label',n.name);
  $('mentor-branch').replaceChildren(...trainingStatus(account.character,account.training,game.world,n.mentorId).branches.map(j=>{const o=document.createElement('option');o.value=j.id;o.textContent=j.name+' · '+j.style;return o;}));render();if(!panel.open)panel.showModal();$('mentor-close').focus();
 }
 // 0.98 the moment the Job bar is full, a quest card pops up and points the player to the masters' court.
 const ready=document.createElement('dialog');ready.id='job-ready';ready.setAttribute('aria-labelledby','job-ready-title');
 ready.innerHTML='<small>เควสเปลี่ยนอาชีพ</small><h2 id="job-ready-title"></h2><p id="job-ready-text"></p><ul id="job-ready-steps"></ul><div class="mentor-actions"><button id="job-ready-go">▶ ไปลานครู</button><button id="job-ready-later">ไว้ทีหลัง</button></div>';
 document.getElementById('game-shell').append(ready);
 ready.querySelector('#job-ready-later').onclick=()=>ready.close();
 // 0.99.9 from the field: ride back to the capital, then keep walking to the court once the town has loaded
 const WALK='ayothaya-job-walk',toCourt=()=>game.walkTo({x:MASTER_COURT.x,z:MASTER_COURT.z},{radius:3,kind:'quest'});
 ready.querySelector('#job-ready-go').onclick=()=>{ready.close();if(inTown()){toCourt();return;}try{sessionStorage.setItem(WALK,'1');}catch{}if(!recall())game.world.notice('กลับอยุธยาไม่ได้ตอนนี้ ลองใหม่อีกครั้ง');};
 try{if(inTown()&&sessionStorage.getItem(WALK)){sessionStorage.removeItem(WALK);setTimeout(toCourt,1600);}}catch{}
 let readyFor=null;
 function jobReady(){const c=account?.character;if(!c||c.jobId||account.training)return;const r=advanceReady(game.world,c.classId,c.jobId??'');if(!r.job.maxed)return;
  const key='ayothaya-job-ready:'+c.classId+':'+r.base+':'+r.ok;if(readyFor===key)return;readyFor=key;try{if(sessionStorage.getItem(key))return;sessionStorage.setItem(key,'1');}catch{}
  const t=TRIAL[r.tier],first=r.tier==='class';ready.querySelector('#job-ready-title').textContent=first?'Job ตันแล้ว! ถึงเวลาเลือกอาชีพ':'Job ตันแล้ว! ถึงเวลาสู่ Master';
  ready.querySelector('#job-ready-text').textContent=r.ok?'ไปหาครูประจำสายที่ลานครูแห่งอโยธยา รับบททดสอบ แล้วทำให้ครบทั้ง 3 ด่าน':'ต้อง Base Lv.'+r.min+' ก่อน (ตอนนี้ Lv.'+r.base+') ระหว่างนี้เตรียมของสำหรับบททดสอบไว้ได้เลย';
  ready.querySelector('#job-ready-steps').innerHTML=['ล่ามอนสเตอร์ '+t.kills+' ตัว','ล้ม'+t.bossName,'นำ '+t.items.map(([id,n])=>itemDef(id).name+' '+n).join(' · ')+' และ '+t.coins.toLocaleString('th-TH')+' เบี้ย'].map(x=>'<li>'+x+'</li>').join('');
  ready.querySelector('#job-ready-go').textContent=inTown()?'▶ เดินไปหา Master':'▶ กลับอยุธยา ไปหา Master';if(!ready.open)ready.showModal();}
 // 0.101.3 the trial journal sits under the party frame and the ailment row (whichever reach lower), so they never overlap
 function stackJournal(){
  if(journal.hidden)return;let below=0;
  // 1.12.6 also below the event chips and the rebirth button (they covered the trial journal on phones)
  for(const id of ['party-frame','ailment-row','hud-chips','rebirth-btn']){const el=document.getElementById(id);if(el&&!el.hidden&&(el.childElementCount||id==='rebirth-btn')&&getComputedStyle(el).display!=='none'){const r=el.getBoundingClientRect();if(r.height&&r.left<journal.getBoundingClientRect().right)below=Math.max(below,r.bottom);}}
  const top=below?Math.round(below+8-(journal.offsetParent?.getBoundingClientRect().top??0))+'px':'';if(journal.style.top!==top)journal.style.top=top;
 }
 function update(){jobReady();stackJournal();const q=account.training,key=JSON.stringify([q,game.world.kills,game.world.bag]);if(key===last)return;last=key;journal.hidden=!q;if(q){const m=mentorById(q.classId==='acolyte'?'monk-master':({swordsman:'sword-master',lancer:'spear-master',hunter:'hunt-master',boxer:'box-master',rogue:'shadow-master',shaman:'spirit-master'})[q.classId]);const s=trainingStatus(account.character,q,game.world,m.id);journal.querySelector('span').textContent=className(q.classId,account.character.gender)+'\n'+trialLines(s,game.world.bag,game.online).join('\n');journal.querySelector('small').textContent=trialReady(s,game.world.bag,game.online)?'กลับลานครูเพื่อส่งบททดสอบ':'ฝึกนอกเมือง · บันทึกอัตโนมัติ';}render();}
 return {open,update,get paused(){return panel.open;}};
}
