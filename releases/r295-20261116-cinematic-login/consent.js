// 0.117 terms + privacy consent after sign-in (Google or quick play; offline guests keep data on their own device).
// A player ticks both boxes once per policy version. The server keeps the record (PDPA evidence) so another device
// does not ask again; this browser remembers it too, and retries the server copy if it could not be saved.
import {multiplayerURL} from './multiplayer-config.js?v=28';
export const CONSENT_VERSION='2026-10-27'; // bump when privacy.html / terms.html change materially: everyone is asked again
const LOCAL=['127.0.0.1','localhost'].includes(location.hostname);
const API=LOCAL?'':multiplayerURL().replace(/^ws/,'http').replace(/\/realtime$/,'');
const key=uid=>'ayo-consent:'+uid;
const read=uid=>{try{return JSON.parse(localStorage.getItem(key(uid)));}catch{return null;}};
const write=(uid,v)=>{try{localStorage.setItem(key(uid),JSON.stringify(v));}catch{}};
async function call(user,body){
 const headers={'Content-Type':'application/json'};if(!LOCAL)headers.Authorization='Bearer '+await user.getIdToken();
 const r=await fetch(API+'/consent'+(LOCAL?'?uid='+encodeURIComponent(user.uid):''),{method:body?'POST':'GET',headers,body:body&&JSON.stringify(body),signal:AbortSignal.timeout(8000)});
 if(!r.ok)throw Error('consent-'+r.status);return r.json();
}
function ask(){
 if(!document.querySelector('link[href^="./legal.css"]')){const l=document.createElement('link');l.rel='stylesheet';l.href='./legal.css?v=1';document.head.append(l);}
 const d=document.createElement('dialog');d.className='consent-dialog';d.setAttribute('aria-labelledby','consent-title');
 d.innerHTML=`<form method="dialog"><h2 id="consent-title">ก่อนเริ่มการผจญภัย</h2>
<p>กรุณาอ่านและยอมรับข้อกำหนดก่อนเล่นออนไลน์ สรุปสั้น ๆ:</p>
<ul><li>เราเก็บข้อมูลบัญชี Google (อีเมล ชื่อ) ข้อมูลตัวละคร และข้อความแชต เพื่อให้บริการเกมและดูแลความปลอดภัย</li>
<li>ไอเท็มและเงินในเกมใช้ได้ในเกมเท่านั้น แลกเป็นเงินจริงไม่ได้ · ห้ามโกง ห้ามบอท ห้ามซื้อขายด้วยเงินจริง</li>
<li>ช่วงทดสอบอาจมีการรีเซ็ตโลกเกม (ประกาศล่วงหน้า) · ขอดูหรือลบข้อมูลได้ทาง Discord ของเกม</li></ul>
<label><input type="checkbox" name="terms" required><span>ฉันได้อ่านและยอมรับ <a href="./terms.html" target="_blank" rel="noopener">ข้อกำหนดการใช้บริการ</a> และ <a href="./privacy.html" target="_blank" rel="noopener">นโยบายความเป็นส่วนตัว</a></span></label>
<label><input type="checkbox" name="age" required><span>ฉันอายุ 20 ปีขึ้นไป หรือผู้ปกครองของฉันรับทราบและยินยอมให้เล่นแล้ว</span></label>
<div class="consent-actions"><button type="button" class="consent-decline" value="no">ยังไม่ยอมรับ</button><button type="submit" class="consent-accept" value="yes" disabled>ยอมรับและเริ่มเล่น</button></div></form>`;
 document.body.append(d);
 const boxes=[...d.querySelectorAll('input[type=checkbox]')],accept=d.querySelector('.consent-accept');
 boxes.forEach(b=>b.onchange=()=>{accept.disabled=!boxes.every(x=>x.checked);});
 return new Promise(resolve=>{
  const done=v=>{d.close();d.remove();resolve(v);};
  d.querySelector('.consent-decline').onclick=()=>done(false);
  d.querySelector('form').onsubmit=e=>{e.preventDefault();if(boxes.every(x=>x.checked))done(true);};
  d.addEventListener('cancel',e=>{e.preventDefault();}); // Esc does not count as an answer
  d.showModal();boxes[0].focus();
 });
}
// true = this account has accepted the current version (asking if needed); false = the player declined.
export async function ensureConsent(user){
 if(!user)return false;
 const mark=read(user.uid);
 if(mark?.version===CONSENT_VERSION){
  if(!mark.synced)call(user,{version:CONSENT_VERSION}).then(()=>write(user.uid,{...mark,synced:true})).catch(()=>{});
  return true;
 }
 try{const r=await call(user);if(r.version===CONSENT_VERSION){write(user.uid,{version:r.version,at:r.at,synced:true});return true;}}catch{} // another device answered already
 if(!await ask())return false;
 const rec={version:CONSENT_VERSION,at:Date.now(),synced:false};
 try{await call(user,{version:CONSENT_VERSION});rec.synced=true;}catch{}
 write(user.uid,rec);return true;
}
