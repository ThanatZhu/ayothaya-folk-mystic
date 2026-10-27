import {readFile} from 'node:fs/promises';
// Production DOM and rendering, with isolated in-memory demo records: no auth or save writes.
export async function mobileLobbyFixture(){
 let html=(await readFile(new URL('../play.html',import.meta.url),'utf8')).replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'');
 html=html.replace('</head>','<script src="i18n-en.js"></script><script src="i18n.js"></script></head>');
 return html.replace('</body>',`<script type="module">
 import {createLandscapeGuard} from './mobile-layout.js';
 import {createMotionPreview} from './motion-preview.js';
 import {characterMotion} from './character-motion.js';
 import {previewPose} from './sprite-motion.js';
 import {atlasPath,getClass,className} from './classes.js';
 import {createArrivalShowcase} from './arrival-showcase186.js?v=186.1';
 const $=id=>document.getElementById(id),params=new URL(location.href).searchParams;
 let account=params.get('account')||'signed',screen='login',mode='cycle',id='acolyte',gender='male',loadToken=0,elapsed=0,last=0;
 const reduced=matchMedia('(prefers-reduced-motion:reduce)'),preview=createMotionPreview($('hero-preview')),showcase=createArrivalShowcase($('arrival-showcase'));
 const demoRows=[{name:'ขวัญจันทร์',id:'acolyte',gender:'female',level:38},{name:'อินทร์คำ',id:'swordsman',gender:'male',level:26},{name:'สายหมอก',id:'shaman',gender:'male',level:45}];
 let chosen=0,creating=false;
 function feedback(text){$('lobby-status').textContent=text;}
 function accountView(){
  const signed=['signed','anon'].includes(account);
  for(const key of ['login-google','login-quick']){$(key).hidden=signed;$(key).disabled=false;}
  $('continue-account').hidden=!signed;$('link-google').hidden=account!=='anon';$('identity-link').hidden=account!=='anon';$('switch-account').hidden=!signed;
  $('identity').textContent=account==='anon'?'ผู้เล่นใหม่ · ยังไม่ผูก Google':signed?'ยินดีต้อนรับ ขวัญจันทร์':'ยินดีต้อนรับ นักเดินทาง';
  $('retry-connection').hidden=account!=='error';
 }
 function drawRoster(){
  $('slot-count').textContent=demoRows.length+' / 5';$('character-slots').replaceChildren();
  for(let i=0;i<5;i++){
   const row=demoRows[i],b=document.createElement('button');b.type='button';b.className='character-slot';b.dataset.slot=String(i);b.setAttribute('aria-pressed',String(!creating&&i===chosen));
   if(row){b.dataset.role=row.id;const portrait=document.createElement('span');portrait.className='slot-portrait';portrait.style.backgroundImage='url('+atlasPath(row.id)+')';portrait.style.backgroundPosition='0 '+(row.gender==='female'?'100%':'0%');const name=document.createElement('strong'),detail=document.createElement('small');name.textContent=row.name;detail.textContent='Lv. '+row.level+' · '+className(row.id,row.gender);b.append(portrait,name,detail);b.setAttribute('aria-label','เลือก '+row.name);}
   else{b.textContent='+ สร้างตัวละคร';b.setAttribute('aria-label','สร้างตัวละครช่อง '+(i+1));}
   b.onclick=()=>{chosen=i;show(row?'character':'create');};$('character-slots').append(b);
  }
 }
 async function choose(next,nextGender=gender){
  id=next;gender=nextGender;const token=++loadToken,img=new Image();img.src=atlasPath(id);await img.decode();if(token!==loadToken)return;
  preview.setSource(img,gender,id);$('hero-preview').dataset.classId=id;$('hero-preview').setAttribute('aria-label',className(id,gender));
 }
 async function show(next){
  creating=next==='create';screen=creating?'character':next;document.body.dataset.screen=screen;document.body.dataset.demoView=next;document.body.dataset.characterMode=creating?'create':'select';
  document.querySelectorAll('.screen').forEach(e=>e.hidden=e.id!==screen+'-screen');document.querySelectorAll('[data-step]').forEach(e=>e.dataset.step===screen?e.setAttribute('aria-current','step'):e.removeAttribute('aria-current'));
  showcase.setScreen(screen);accountView();feedback('');
  if(screen==='character'){
   $('profession-options').hidden=true;$('character-form').hidden=!creating;$('existing-character').hidden=creating;$('character-title').textContent=creating?'สร้างผู้ฝึกตน':'เลือกตัวละคร';
   $('realm-caption').textContent='เซิร์ฟ 1 · อยุธยา · ริมเจ้าพระยา';$('progression-hint').textContent=creating?'เริ่มเป็นผู้ฝึกตน · Job 10 เลือกอาชีพ · Job 40 รับ Master':'เลือกนักเดินทางของคุณ แล้วกลับสู่เรื่องราวที่รออยู่';drawRoster();
   if(creating){$('character-form').reset();await choose('novice','male');$('stage-name').textContent='';}
   else{const row=demoRows[chosen]??demoRows[0];await choose(row.id,row.gender);$('stage-name').textContent=row.name;$('existing-name').textContent=row.name+' · Lv. '+row.level;$('existing-detail').textContent=className(row.id,row.gender)+' · อยุธยา';}
   $('change-class').hidden=true;$('enter-world').hidden=false;$('delete-character').hidden=false;
  }
  if(screen==='login')feedback(account==='signed'?'ยินดีต้อนรับกลับ ขวัญจันทร์':account==='anon'?'ยินดีต้อนรับกลับ · บัญชีนี้ยังไม่ผูก Google':account==='error'?'เชื่อมต่อไม่สำเร็จ ตรวจอินเทอร์เน็ตแล้วลองอีกครั้ง':'');
  elapsed=0;document.querySelector('#'+screen+'-screen h2')?.focus({preventScroll:true});
 }
 for(const key of ['login-google','login-quick','continue-account'])$(key).onclick=()=>{account=key==='login-quick'?'anon':'signed';show('servers');};
 $('login-guest').onclick=()=>{account='new';show('servers');};
 $('back-login').onclick=()=>show('login');$('back-servers').onclick=()=>show('servers');
 document.querySelectorAll('[data-server]').forEach(b=>b.onclick=()=>{chosen=0;show('character');});
 for(const key of ['link-google','identity-link'])$(key).onclick=()=>{account='signed';accountView();feedback('พรีวิวการผูกบัญชี · ไม่มีการเชื่อมบัญชีจริง');};
 $('switch-account').onclick=()=>{account='new';show('login');};$('retry-connection').onclick=()=>{account='new';show('login');};
 $('enter-world').onclick=()=>feedback('พรีวิวพร้อมออกเดินทาง · หน้านี้ไม่มีการแก้บัญชีหรือเซฟ');
 $('hero-name').addEventListener('input',()=>{if(creating)$('stage-name').textContent=$('hero-name').value.trim();});
 document.querySelectorAll('[name=gender]').forEach(b=>b.onchange=()=>choose('novice',b.value));
 document.querySelectorAll('[data-pose]').forEach(b=>b.onclick=()=>{mode=b.dataset.pose;elapsed=0;document.querySelectorAll('[data-pose]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));});
 $('character-form').onsubmit=async e=>{e.preventDefault();if(!$('character-form').reportValidity())return;const name=$('hero-name').value.trim();demoRows.push({name,id:'novice',gender,level:1});chosen=demoRows.length-1;await show('character');feedback('สร้างตัวละครตัวอย่างแล้ว · ยังไม่มีการบันทึกจริง');};
 $('delete-character').onclick=()=>{$('delete-name').textContent=demoRows[chosen].name;$('delete-confirm').value='';$('delete-go').disabled=true;$('delete-dialog').showModal();};
 $('delete-confirm').oninput=()=>{$('delete-go').disabled=$('delete-confirm').value.trim()!==demoRows[chosen]?.name;};
 $('delete-dialog').addEventListener('close',()=>{if($('delete-dialog').returnValue==='ok'){demoRows.splice(chosen,1);chosen=0;show(demoRows.length?'character':'create');}});
 document.querySelector('#journey-loading')?.remove();createLandscapeGuard({allowPortrait:true});
 for(const key of ['explore-paths','character-explore'])if($(key))$(key).onclick=()=>showcase.open();
 await show(params.get('screen')||'login');await document.fonts.ready;document.body.dataset.review='ready';
 function frame(t){const dt=last?Math.min(.05,(t-last)/1000):0;last=t;const quiet=false;elapsed+=dt*(reduced.matches?.45:.7);if(screen==='character'&&!document.hidden){const state=previewPose(elapsed,mode,quiet),poseMode=quiet?'idle':mode==='attack'?'attack':state.casting?'attack':state.moving?'walk':'idle';preview.draw(characterMotion({time:poseMode==='attack'?elapsed%.95:elapsed,mode:poseMode,classId:id,reduced:quiet}));$('hero-preview').dataset.pose=poseMode;}requestAnimationFrame(frame);}requestAnimationFrame(frame);
 window.__mobileLobby={choose,show,showcase,setMode(value){mode=value;elapsed=0;},get state(){return {screen,creating,classId:id,gender,rows:demoRows.length};}};
 </script></body>`);
}
