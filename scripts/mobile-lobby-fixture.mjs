import {readFile} from 'node:fs/promises';
export async function mobileLobbyFixture(){
 let html=(await readFile(new URL('../play.html',import.meta.url),'utf8')).replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'');
 html=html.replace('</head>','<script src="i18n-en.js"></script><script src="i18n.js"></script></head>');
 return html.replace('</body>',`<script type="module">
 import {createLandscapeGuard} from './mobile-layout.js';import {createMotionPreview} from './motion-preview.js';import {characterMotion} from './character-motion.js';import {atlasPath,CLASSES,getClass} from './classes.js';
 const params=new URL(location.href).searchParams,view=params.get('screen')||'character',screen=view==='create'?'character':view,account=params.get('account')||'signed';
 document.body.dataset.screen=screen;document.querySelectorAll('.screen').forEach(e=>e.hidden=e.id!==screen+'-screen');
 document.querySelector('#journey-loading')?.remove();document.querySelector('#profession-options').hidden=true;document.querySelector('#character-form').hidden=true;document.querySelector('#existing-character').hidden=false;
 document.querySelector('#character-title').textContent='เลือกตัวละคร';document.querySelector('#realm-caption').textContent='พรีวิว · ไม่มีการแก้บัญชีหรือเซฟ';document.querySelector('#progression-hint').textContent='ลองเลือกอาชีพและสลับท่า เท้าต้องตรงกับฐานทุกขนาดจอ';document.querySelector('#slot-count').textContent='8 อาชีพ';document.querySelector('#lobby-status').textContent='';
 const host=document.querySelector('#hero-preview'),preview=createMotionPreview(host);let id='acolyte',gender='male',mode='idle',ready=0;
 async function choose(next){id=next;const token=++ready,img=new Image();img.src=atlasPath(id);await img.decode();if(token!==ready)return;preview.setSource(img,gender,id);document.querySelector('#stage-name').textContent=getClass(id).name;document.querySelector('#existing-name').textContent=document.querySelector('#stage-name').textContent+' · Lv. 38';document.querySelector('#existing-detail').textContent='ชาย · อโยธยา';document.querySelectorAll('.character-slot').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.role===id)));}
 document.querySelector('#class-badge').textContent='ภาพตัวละครเดิม · ฐานร่วมกับเท้า';document.querySelector('#character-slots').replaceChildren();
 for(const c of ['novice','swordsman','hunter','shaman','acolyte'].map(id=>getClass(id))){const b=document.createElement('button');b.type='button';b.className='character-slot';b.dataset.role=c.id;b.innerHTML='<span class="slot-portrait" style="background-image:url('+atlasPath(c.id)+')"></span><strong>'+c.name+'</strong><small>Lv. 38</small>';b.onclick=()=>choose(c.id);document.querySelector('#character-slots').append(b);}
 document.querySelectorAll('[data-pose]').forEach(b=>b.onclick=()=>{mode=b.dataset.pose==='cycle'?'idle':b.dataset.pose;document.querySelectorAll('[data-pose]').forEach(e=>e.setAttribute('aria-pressed',String(e===b)));});
 document.querySelector('#enter-world').onclick=()=>location.href='/mobile-fixture.html';document.querySelector('#delete-character').hidden=false;document.querySelector('#back-servers').onclick=()=>location.href='/mobile-lobby-fixture.html?screen=servers';
 document.querySelector('#slot-count').textContent='5 / 5';
 if(view==='create'){document.querySelector('#character-form').hidden=false;document.querySelector('#existing-character').hidden=true;document.querySelector('#character-title').textContent='สร้างผู้ฝึกตน';}
 for(const key of ['login-google','login-quick']){document.getElementById(key).hidden=['signed','anon'].includes(account);document.getElementById(key).disabled=false;}
 document.getElementById('continue-account').hidden=!['signed','anon'].includes(account);document.getElementById('link-google').hidden=account!=='anon';document.getElementById('switch-account').hidden=!['signed','anon'].includes(account);
 document.getElementById('lobby-status').textContent=screen!=='login'?'':account==='signed'?'ยินดีต้อนรับกลับ Sirichok':account==='anon'?'ยินดีต้อนรับกลับ · บัญชีนี้ยังไม่ผูก Google':account==='error'?'เชื่อมต่อไม่สำเร็จ ตรวจอินเทอร์เน็ตแล้วลองอีกครั้ง':'';
 document.getElementById('retry-connection').hidden=account!=='error';
 createLandscapeGuard({allowPortrait:true});await choose(id);document.body.dataset.review='ready';
 const frame=t=>{preview.draw(characterMotion({time:mode==='attack'?(t/1000)%.95:t/1000,mode,classId:id}));requestAnimationFrame(frame);};requestAnimationFrame(frame);
 window.__mobileLobby={choose,setMode(value){mode=value;}};
 </script></body>`);
}
