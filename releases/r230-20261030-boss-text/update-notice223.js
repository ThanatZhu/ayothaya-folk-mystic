// Updating is opt-in. Merely discovering a new build never saves, reloads or touches the socket.
import {loadFarmStyles} from './farm-utility-ui221.js';
export function createUpdateNotice({game,save,current=document.querySelector('meta[name="ayothaya-release"]')?.content,fetchImpl=fetch,navigate=url=>location.replace(url),interval=60000}){
 loadFarmStyles();const n=document.createElement('aside');n.id='game-update223';n.hidden=true;n.setAttribute('aria-live','polite');n.innerHTML='<span>มีอัปเดตใหม่ · เล่นต่อได้ตามปกติ</span><button class="qol-btn qol-primary" type="button">อัปเดตเมื่อพร้อม</button>';(document.getElementById('game-shell')??document.body).append(n);for(const type of ['keydown','keyup'])n.addEventListener(type,e=>{if(e.key==='Enter'||e.key===' ')e.stopPropagation();});
 const button=n.querySelector('button'),label=n.querySelector('span');let latest=null,busy=false,timer=null,stopped=false,checking=false;
 async function check(){if(stopped||checking||document.hidden)return;checking=true;const abort=new AbortController(),timeout=setTimeout(()=>abort.abort(),5000);
  try{const r=await fetchImpl('/release.json?check='+Date.now(),{cache:'no-store',credentials:'same-origin',signal:abort.signal});if(!r.ok)return;const data=await r.json();if(data.schema!==1||!/^r[a-zA-Z0-9_-]{1,80}$/.test(data.id))return;
   if(!current)current=data.id;latest=data;n.hidden=latest.id===current;
  }catch{}finally{clearTimeout(timeout);checking=false;}
 }
 button.onclick=async()=>{if(busy||!latest)return;if(game.online&&game.networkStatus!=='online'){label.textContent='รอเชื่อมต่อก่อนอัปเดต เพื่อบันทึกความคืบหน้า';return;}
  busy=true;button.disabled=true;label.textContent='กำลังบันทึกก่อนอัปเดต…';game.clearInput?.();
  try{const saved=await save();if(saved===false)throw Error('save-failed');if(stopped)return;const u=new URL(location.href);u.searchParams.set('release',latest.id);navigate(u.href);}
  catch{label.textContent='ยังบันทึกไม่สำเร็จ · เล่นต่อได้และกดใหม่ภายหลัง';}
  finally{busy=false;button.disabled=false;}
 };
 function arm(){clearTimeout(timer);if(!stopped)timer=setTimeout(async()=>{await check();arm();},interval);}
 const visible=()=>{if(!document.hidden)check();};document.addEventListener('visibilitychange',visible);check();arm();
 return {check,node:n,destroy(){stopped=true;clearTimeout(timer);document.removeEventListener('visibilitychange',visible);n.remove();}};
}
