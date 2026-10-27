// 0.116 asset gallery (ayothaya-assets-9x7k.html, back office): every asset live in the game, read from the shipped data
// (audio-catalog180.js, maps/world.json, the guide's game-data.json, loading-theme.js) plus the build's file index.
import {BGM,SFX,THEME_OF,themeOf,audioUrl,COMBAT_CLASSES,COMBAT_FAMILIES,COMBAT_NAMES,combatFile,combatUrl} from './audio-catalog180.js?v=180';
import {LOADING_THEMES} from './loading-theme.js?v=105';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const mb=b=>b>=1048576?(b/1048576).toFixed(1)+' MB':(b/1024).toFixed(0)+' KB';
const getJson=url=>fetch(url).then(r=>r.ok?r.json():null).catch(()=>null);
const [world,data,index]=await Promise.all([getJson('maps/world.json'),getJson('assets/guide169/game-data.json'),getJson('asset-index180.json')]);
const files=index?.files??[],size=new Map(files);

// ---- sound: one thing plays at a time
let now=null;
function stop(){if(now){now.audio.pause();now.button.classList.remove('on');now.button.textContent='▶';now=null;}}
function toggle(button,url,loop){
 if(now?.button===button)return stop();stop();
 const audio=new Audio(url);audio.loop=loop;audio.play().catch(()=>{});button.classList.add('on');button.textContent='■';now={audio,button};
 audio.onended=()=>{if(now?.audio===audio)stop();};
}
$('stop').onclick=stop;
const usedBy=theme=>Object.entries(THEME_OF).filter(([,t])=>t===theme).map(([id])=>world?.maps.find(m=>m.id===id)?.name??id);
const combat=f=>/^(fam|cls)-/.test(f);
function trackRow(label,sub,files,loop){
 const el=document.createElement('div');el.className='track';
 el.innerHTML=`<button class="play" title="ฟัง">▶</button><strong>${esc(label)}</strong><small>${esc(sub)}</small><small>${files.map(f=>{const p=(combat(f)?'assets/audio-combat/':'assets/audio180/')+f+'.mp3';return esc(f)+'.mp3 · '+(size.has(p)?mb(size.get(p)):'–');}).join(' · ')}</small>`;
 let k=0;el.querySelector('.play').onclick=e=>{const f=files[k++%files.length];toggle(e.currentTarget,combat(f)?combatUrl(f):audioUrl(f),loop);};return el;
}
for(const [id,t] of Object.entries(BGM))$('bgm-list').append(trackRow(t.name,`${t.note} · ${Math.round(t.seconds)} วินาทีต่อรอบ · ${id==='boss'?'เมื่อสู้บอสใกล้ตัว':usedBy(id).join(', ')}`,['bgm-'+id],true));
for(const [id,s] of Object.entries(SFX))$('sfx-list').append(trackRow(s.name,`เล่นเมื่อ: ${s.on}${s.files.length>1?` · ${s.files.length} แบบ`:''}`,s.files.map(f=>'sfx-'+f),false));
// 0.121 combat sounds: each press plays the next file of the row (swing, hit… / cast, hit…)
for(const c of COMBAT_CLASSES){
 $('sfx-list').append(trackRow(`${COMBAT_NAMES[c]} · โจมตีปกติ`,'กดซ้ำเพื่อฟังทีละแบบ: เหวี่ยง 3 แบบ แล้วโดนเป้า 3 แบบ',[0,1,2].map(v=>combatFile('cls',c,'swing',v)).concat([0,1,2].map(v=>combatFile('cls',c,'hit',v))),false));
 $('sfx-list').append(trackRow(`${COMBAT_NAMES[c]} · ไม้ตาย`,'เล่นเพิ่มตอนใช้ไม้ตาย',[combatFile('cls',c,'ult',0)],false));
}
for(const f of COMBAT_FAMILIES)$('sfx-list').append(trackRow(`สกิลสาย${COMBAT_NAMES[f]}`,'กดซ้ำเพื่อฟังทีละแบบ: ง้าง โดน ง้าง โดน',[0,1].flatMap(v=>[combatFile('fam',f,'cast',v),combatFile('fam',f,'hit',v)]),false));

// ---- maps
for(const m of world?.maps??[]){
 const art=LOADING_THEMES[m.id]?.art??'',theme=themeOf(m),el=document.createElement('div');el.className='map';
 el.innerHTML=`<img loading="lazy" alt="" src="${esc(art)}"><div><strong>${esc(m.name)}</strong><small>${esc(m.subtitle??'')}</small>
  <small>ฉาก: <a href="${esc(m.scene)}" target="_blank" rel="noopener">${esc(m.scene)}</a> · ${size.has(m.scene)?mb(size.get(m.scene)):'–'}</small>
  <small>เพลง: ${esc(BGM[theme]?.name??theme)} · ${m.safe?'เขตปลอดภัย':'พื้นที่ต่อสู้'} · id ${esc(m.id)}</small></div>`;
 $('map-list').append(el);
}

// ---- sprites from the guide data
function art(desc,box=112){
 const d=document.createElement('div');d.className='art';if(!desc)return d;
 if(desc.sheet)desc={src:'assets/skills-next/'+desc.sheet,cols:desc.cols,rows:desc.rows,index:desc.row*desc.cols+desc.col};
 if(desc.rect){const [x,y,w,h]=desc.rect,s=box/Math.max(w,h);Object.assign(d.style,{backgroundImage:`url("${desc.src}")`,backgroundSize:`${desc.width*s}px ${desc.height*s}px`,backgroundPosition:`${-x*s+(box-w*s)/2}px ${-y*s+(box-h*s)/2}px`,width:box+'px',height:box+'px',margin:'0 auto'});return d;}
 if(desc.cols){const c=desc.index%desc.cols,r=Math.floor(desc.index/desc.cols);Object.assign(d.style,{backgroundImage:`url("${desc.src}")`,backgroundSize:`${desc.cols*100}% ${desc.rows*100}%`,backgroundPosition:`${desc.cols>1?c/(desc.cols-1)*100:0}% ${desc.rows>1?r/(desc.rows-1)*100:0}%`});return d;}
 d.innerHTML=`<img loading="lazy" alt="" src="${esc(desc.src)}">`;return d;
}
function cards(list,host,{pic,sub}){
 const frag=document.createDocumentFragment();
 for(const x of list){const c=document.createElement('div');c.className='card';c.append(art(pic(x)));c.insertAdjacentHTML('beforeend',`<strong>${esc(x.name)}</strong><small>${esc(sub(x))}</small>`);frag.append(c);}
 $(host).append(frag);if(!list.length)$(host).innerHTML='<p class="empty">ไม่พบข้อมูล</p>';
}
const KIND={gear:'อุปกรณ์',loot:'ของดรอป',potion:'ยา',card:'การ์ด',scroll:'ม้วนคัมภีร์',wing:'ปีก'};
cards(data?.items??[],'item-list',{pic:x=>x.art,sub:x=>`${KIND[x.kind]??x.kind??''} · ${x.id}`});
cards(data?.skills??[],'skill-list',{pic:x=>x.icon,sub:x=>`${data.classes.find(c=>c.id===x.classId)?.name??x.classId??''} · ${x.tier??''}`});
cards(data?.monsters??[],'monster-list',{pic:x=>x.art,sub:x=>`Lv. ${x.level??'?'} · HP ${x.hp??'?'}${x.boss?' · บอส':''}`});
cards(data?.pets??[],'pet-list',{pic:x=>x.art,sub:x=>`ระดับ ${x.tier??''} · ${x.nameEn??''}`});

// ---- every shipped file, grouped by folder; thumbnails load when a group opens
const groups=new Map();
for(const [p,b] of files){const parts=p.split('/'),key=parts.length>2?parts[0]+'/'+parts[1]:parts[0];if(!groups.has(key))groups.set(key,[]);groups.get(key).push([p,b]);}
const IMG=/\.(png|webp|jpe?g|gif|svg)$/i,AUD=/\.(mp3|ogg|wav|m4a)$/i;
function fileCard([p,b]){
 const name=p.split('/').pop(),ext=name.split('.').pop().toUpperCase(),url=encodeURI(p);
 const thumb=IMG.test(p)?`<img loading="lazy" alt="" src="${url}">`:`<span class="ext">${esc(ext)}</span>`;
 const el=document.createElement('div');el.className='file';
 el.innerHTML=`<a class="thumb" href="${url}" target="_blank" rel="noopener">${thumb}</a><a href="${url}" target="_blank" rel="noopener">${esc(name)}</a><span>${mb(b)}</span>`;
 if(AUD.test(p)){const btn=document.createElement('button');btn.className='btn';btn.textContent='▶';btn.onclick=()=>toggle(btn,url,false);el.append(btn);}
 return el;
}
function renderFiles(q=''){
 const host=$('file-list');host.textContent='';q=q.trim().toLowerCase();
 for(const [key,list] of groups){
  const shown=q?list.filter(([p])=>p.toLowerCase().includes(q)):list;if(!shown.length)continue;
  const d=document.createElement('details');d.open=!!q&&shown.length<=60;
  d.innerHTML=`<summary>${esc(key)}<span>${shown.length} ไฟล์ · ${mb(shown.reduce((s,[,b])=>s+b,0))}</span></summary>`;
  const fill=()=>{if(d.dataset.filled)return;d.dataset.filled=1;const g=document.createElement('div');g.className='files';shown.forEach(f=>g.append(fileCard(f)));d.append(g);};
  d.addEventListener('toggle',()=>d.open&&fill());if(d.open)fill();host.append(d);
 }
 if(!host.children.length)host.innerHTML=`<p class="empty">${files.length?'ไม่พบไฟล์ที่ตรงกับคำค้น':'ยังไม่มีดัชนีไฟล์ (สร้างตอน build)'}</p>`;
}
let timer;$('q').oninput=e=>{clearTimeout(timer);timer=setTimeout(()=>renderFiles(e.target.value),200);};renderFiles();

// ---- header numbers and section links
const total=files.reduce((s,[,b])=>s+b,0),count=(re)=>files.filter(([p])=>re.test(p)).length;
const stats=[['ไฟล์ทั้งหมด',files.length],['ขนาดรวม',mb(total)],['รูปภาพ',count(IMG)],['ไฟล์เสียง',count(AUD)],['ฉาก 3 มิติ',count(/\.glb$/i)],['แผนที่',world?.maps.length??0],['ไอเทม',data?.items.length??0],['มอนสเตอร์',data?.monsters.length??0]];
$('stats').innerHTML=stats.map(([k,v])=>`<div class="stat"><b>${esc(v)}</b><span>${esc(k)}</span></div>`).join('');
const NAV=[['bgm','เพลง',Object.keys(BGM).length],['sfx','เอฟเฟกต์',Object.keys(SFX).length],['maps','แผนที่',world?.maps.length],['items','ไอเทม',data?.items.length],['skills','สกิล',data?.skills.length],['monsters','มอนสเตอร์',data?.monsters.length],['pets','สัตว์เลี้ยง',data?.pets.length],['files','ไฟล์ทั้งหมด',files.length]];
$('nav').innerHTML=NAV.map(([id,label,n])=>`<a href="#${id}">${label}<b>${n??0}</b></a>`).join('');
if(index?.built)$('built').textContent+=` · อัปเดต ${new Date(index.built).toLocaleString('th-TH')}`;
