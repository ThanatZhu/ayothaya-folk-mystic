// Two-level travel journal. Each action reuses an existing screen or save flow.
const $=id=>document.getElementById(id),click=id=>$(id)?.click();
const paths={
 lotus:'M24 38C8 35 5 25 7 18c8 0 13 6 17 20Zm0 0c16-3 19-13 17-20-8 0-13 6-17 20Zm0-4C12 25 16 12 24 5c8 7 12 20 0 29ZM10 42h28',
 hero:'M16 18a8 8 0 1 0 16 0 8 8 0 0 0-16 0ZM8 41c0-11 7-16 16-16s16 5 16 16M18 29l6 7 6-7',
 skill:'m24 5 5 13 14 6-14 5-5 14-5-14-14-5 14-6ZM8 7v7M5 10h6M39 36v8M35 40h8',
 map:'m5 12 12-5 14 5 12-5v29l-12 5-14-5-12 5V12Zm12-5v29m14-24v29M23 17v7m-3-4h6',
 people:'M7 40v-5c0-8 6-12 13-12s13 4 13 12v5M13 14a7 7 0 1 0 14 0 7 7 0 0 0-14 0Zm22-7a7 7 0 0 1 0 14m3 5c5 2 6 6 6 14',
 chat:'M6 8h36v25H23L12 42v-9H6V8Zm9 10h18m-18 7h12',
 emote:'M8 24a16 16 0 1 0 32 0 16 16 0 0 0-32 0Zm8 5c5 6 11 6 16 0M16 19h1m14 0h1',
 settings:'M24 5v6m0 26v6M5 24h6m26 0h6M10 10l5 5m18 18 5 5M10 38l5-5m18-18 5-5M12 24a12 12 0 1 0 24 0 12 12 0 0 0-24 0Zm7 0a5 5 0 1 0 10 0 5 5 0 0 0-10 0Z',
 door:'M6 42h36M12 42V9l24-4v37M20 15v27m9-18v5',
 eye:'M3 24S12 10 24 10s21 14 21 14-9 14-21 14S3 24 3 24Zm14 0a7 7 0 1 0 14 0 7 7 0 0 0-14 0Z',
 bow:'M20 8a5 5 0 1 0 10 0 5 5 0 0 0-10 0Zm5 10-9 9 8 6-4 10m-4-16-9 4m18-13 7 12 9 3m-17 0 11 10',
 celebrate:'M18 10a6 6 0 1 0 12 0 6 6 0 0 0-12 0ZM24 18v14m-14-20 6 11 8 2 8-2 6-11M24 32l-9 11m9-11 9 11M5 5v6m35-6v6',
 rest:'M18 9a6 6 0 1 0 12 0 6 6 0 0 0-12 0ZM24 17v14m-8-9-6 9h28l-6-9M24 31 8 41h32L24 31Z',
 guard:'M24 5 40 11v13c0 10-16 19-16 19S8 34 8 24V11L24 5Zm0 9v20M15 23h18',
 fullscreen:'M6 18V6h12m12 0h12v12m0 12v12H30m-12 0H6V30'
};
function icon(name){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 48 48');svg.setAttribute('aria-hidden','true');const p=document.createElementNS(svg.namespaceURI,'path');p.setAttribute('d',paths[name]||paths.lotus);svg.append(p);return svg;}
const groups=[
 {id:'character',label:'ตัวละคร',icon:'hero',note:'ทุกก้าว คือเรื่องราวของคุณ',items:[
  {id:'menu-profile',icon:'hero',label:'โปรไฟล์',description:'ตัวละคร · บัญชี · การบันทึก',run:()=>click('open-account')},
  {id:'menu-skills',icon:'skill',label:'วิชาและสกิล',description:'ดูวิชาและใช้แต้มอัปสกิล',key:'K',run:()=>dispatchEvent(new CustomEvent('open-skill-window'))},
  {icon:'door',label:'เลือกตัวละคร',description:'กลับหน้าตัวละครและเซิร์ฟเวอร์',run:()=>click('return-lobby')}
 ]},
 {id:'world',label:'โลกอโยธยา',icon:'map',note:'ออกเดินทาง ผ่านเมืองและสายน้ำ',items:[
  {id:'menu-map',icon:'map',label:'แผนที่เมือง',description:'ย่านต่าง ๆ และตำแหน่งของคุณ',key:'M',run:()=>click('mini-open')},
  {icon:'eye',label:'มองเมืองจากฟ้า',description:'สลับภาพรวมเมือง / กลับหาตัวละคร',key:'V',run:()=>click('overview')}
 ]},
 {id:'social',label:'เพื่อนร่วมทาง',icon:'people',note:'พบกันในโลกใบเดียวกัน',items:[
  {id:'menu-players',icon:'people',label:'ผู้เล่นและปาร์ตี้',description:'ดูผู้เล่นในห้อง · ชวนเข้าปาร์ตี้',run:()=>click('online-button')},
  {id:'menu-chat',icon:'chat',label:'สนทนา',description:'เปิดช่องแชตกับเพื่อนในห้อง',key:'Enter',run:()=>{if($('dock-toggle')?.getAttribute('aria-expanded')==='false')click('dock-toggle');document.querySelector('#online-dock [data-channel="room"]')?.click();$('online-text')?.focus();}}
 ]},
 {id:'emotes',label:'ท่าทาง',icon:'emote',note:'ให้ท่าทาง บอกความรู้สึก',items:[
  ...[['bow','คำนับ','ทักทายอย่างชาวอโยธยา'],['celebrate','ดีใจ','ฉลองให้กับการเดินทาง'],['rest','พักสักครู่','นั่งพักระหว่างทาง'],['guard','ตั้งรับ','เตรียมพร้อมรับการต่อสู้']].map(([name,label,description])=>({icon:name,label,description,run:()=>dispatchEvent(new CustomEvent('hero-emote',{detail:name}))}))
 ]},
 {id:'settings',label:'ตั้งค่า',icon:'settings',note:'จัดมุมมอง ให้เป็นการผจญภัยของคุณ',items:[
  {id:'menu-settings',icon:'settings',label:'ภาพและการควบคุม',description:'มุมกล้อง · ภาพละมุน · ลมและน้ำ',run:()=>click('open-settings')},
  {icon:'fullscreen',label:'เล่นเต็มจอ',description:'ขยายพื้นที่ผจญภัยบนอุปกรณ์นี้',run:()=>click('enter-fullscreen')}
 ]}
];
export function createGameMenu({game,account}){
 const shell=$('game-shell'),nav=document.createElement('nav');nav.id='game-menu';nav.setAttribute('aria-label','เมนูเกม');
 const trigger=document.createElement('button');trigger.id='open-game-menu';trigger.type='button';trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-controls','game-menu-dialog');trigger.append(icon('lotus'));
 const title=document.createElement('span');title.textContent='เมนู';trigger.append(title);nav.append(trigger);shell.append(nav);
 const dialog=document.createElement('dialog');dialog.id='game-menu-dialog';dialog.setAttribute('aria-labelledby','journal-title');
 // Static markup only; player data is assigned through textContent.
 dialog.innerHTML='<header class="journal-header"><div class="journal-seal" aria-hidden="true"></div><div><small>AYOTHAYA · FOLK MYSTIC</small><h2 id="journal-title">บันทึกนักเดินทาง</h2></div><button type="button" class="journal-close" aria-label="ปิดเมนูเกม">×</button></header><div class="journal-body"><nav class="journal-tabs" aria-label="หมวดเมนู"></nav><section class="journal-content"><div class="journal-heading"><small>การเดินทางของคุณ</small><h3 id="journal-section"></h3><p id="journal-note"></p></div><div class="journal-pages"></div><p class="journal-online-note" hidden>เข้าเกมด้วย Google และเชื่อมต่อออนไลน์เพื่อใช้แชต</p></section></div><footer class="journal-footer"><div><span class="journal-save-light" aria-hidden="true"></span><span class="journal-identity"></span><small>บันทึกอัตโนมัติ</small></div><button type="button" class="journal-return">กลับเข้าเกม <span aria-hidden="true">↗</span></button></footer>';
 dialog.querySelector('.journal-seal').append(icon('lotus'));shell.append(dialog);
 const tabs=[],pages=[];let selected='character';
 function select(id){selected=id;const group=groups.find(g=>g.id===id);$('journal-section').textContent=group.label;$('journal-note').textContent=group.note;tabs.forEach((b,i)=>b.setAttribute('aria-pressed',String(groups[i].id===id)));pages.forEach((p,i)=>p.hidden=groups[i].id!==id);updateOnline();}
 for(const group of groups){
  const tab=document.createElement('button');tab.type='button';tab.id='journal-tab-'+group.id;tab.setAttribute('aria-controls','journal-page-'+group.id);tab.append(icon(group.icon));
  const label=document.createElement('span');label.textContent=group.label;tab.append(label);tab.onclick=()=>select(group.id);dialog.querySelector('.journal-tabs').append(tab);tabs.push(tab);
  const page=document.createElement('div');page.id='journal-page-'+group.id;page.className='journal-page';page.setAttribute('role','group');page.setAttribute('aria-label',group.label);dialog.querySelector('.journal-pages').append(page);pages.push(page);
  for(const item of group.items){
   const b=document.createElement('button');b.type='button';b.className='journal-action';if(item.id)b.id=item.id;
   const art=document.createElement('span');art.className='journal-action-art';art.append(icon(item.icon));
   const text=document.createElement('span');text.className='journal-action-text';const name=document.createElement('strong'),description=document.createElement('small');name.textContent=item.label;description.textContent=item.description;text.append(name,description);b.append(art,text);
   if(item.key){const key=document.createElement('kbd');key.textContent=item.key;b.append(key);}
   b.onclick=()=>{dialog.close();game.clearInput();item.run();};page.append(b);
  }
 }
 function updateOnline(){const dock=$('online-dock'),available=!!dock&&!dock.hidden;$('menu-chat').hidden=!available;dialog.querySelector('.journal-online-note').hidden=selected!=='social'||available;}
 const dock=$('online-dock');if(dock)new MutationObserver(updateOnline).observe(dock,{attributes:true,attributeFilter:['hidden']});
 // Carry existing unread/invite/skill dots up to the category and main menu button.
 new MutationObserver(()=>{let any=false;pages.forEach((page,i)=>{const has=[...page.querySelectorAll('.menu-dot')].some(d=>!d.hidden&&!d.parentElement.hidden);tabs[i].classList.toggle('has-notice',has);any||=has;});trigger.classList.toggle('has-notice',any);}).observe(dialog.querySelector('.journal-pages'),{subtree:true,childList:true,attributes:true,attributeFilter:['hidden']});
 trigger.onclick=()=>{game.clearInput();updateOnline();dialog.querySelector('.journal-identity').textContent=account.character.name+' · เซิร์ฟ '+account.serverId.slice(-1);dialog.showModal();trigger.setAttribute('aria-expanded','true');tabs[groups.findIndex(g=>g.id===selected)].focus();};
 dialog.querySelector('.journal-close').onclick=()=>dialog.close();dialog.querySelector('.journal-return').onclick=()=>dialog.close();
 dialog.addEventListener('close',()=>{trigger.setAttribute('aria-expanded','false');game.clearInput();});
 // Keep gameplay shortcuts (including M) from opening another screen behind the menu.
 dialog.addEventListener('keydown',e=>e.stopPropagation());
 // Native dialog supplies Escape, focus trapping and focus restoration.
 select(selected);return nav;
}
