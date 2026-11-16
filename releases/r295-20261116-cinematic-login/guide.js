import {effectiveGearStats,refineTier,refinePercent} from './refine-tiers.js';

// Public, read-only reference. No account SDK, save writer or game session is loaded.
const $=s=>document.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=v=>Number(v??0).toLocaleString('th-TH',{maximumFractionDigits:2}),pct=v=>number(v*100)+'%';
const normalize=v=>String(v??'').normalize('NFKC').toLowerCase().replace(/\s+/g,' ').trim();
const matches=(text,q)=>normalize(q).split(' ').every(t=>normalize(text).includes(t));
let data,ui,pictures=[],articles=[],index=[],current='skills',limit=16,searchLimit=30,focused=null,searchTimer,toastTimer,pictureDialog,pictureOpener;
const kinds=['skills','items','monsters','maps','recipes','pets','story'];
// database.html is the reference library alone: no handbook chapters, sidebar or overview
const dbOnly=document.body.classList.contains('database-page');
// the handbook links records over to database.html; on database.html they stay on the page
const REF=dbOnly?'':'database.html',libraryHref=(kind,query='')=>'database.html?tab='+kind+(query?'&q='+encodeURIComponent(query):'');
const label=k=>ui?.[k]??k,name=id=>data.items.find(i=>i.id===id)?.name??id;
const className=id=>data.classes.find(c=>c.id===id)?.name??label(id);
const mapName=id=>data.maps.find(m=>m.id===id)?.name??id;
const badge=s=>`<span class="badge">${esc(s)}</span>`;
// Section icons are cells of the in-game menu sheet (assets/ui63/ui-menu63.png, 6 columns x 4 rows), not new art.
const ICON_CELL={'เริ่มผจญภัย':[0,2],'เติบโตและต่อสู้':[5,2],'อุปกรณ์และเศรษฐกิจ':[3,2],'เพื่อนร่วมทาง':[1,1],'โลกและภารกิจ':[3,1],
 skills:[1,0],items:[3,0],monsters:[0,3],maps:[4,1],recipes:[2,2],pets:[5,0],story:[0,1]};
const icon=key=>{const c=ICON_CELL[key];return c?`<i class="gi" style="--cell:${c[0]*20}% ${c[1]*100/3}%" aria-hidden="true"></i>`:'';};
function renderOverview(){
 const groups=[...new Set(articles.map(a=>a.group))].map(g=>{const list=articles.filter(a=>a.group===g);return {icon:icon(g),title:g,count:list.length,unit:label('articles'),text:list.slice(0,4).map(a=>a.title).join(' · '),href:'#'+list[0].id,attrs:''};});
 const db=kinds.map(k=>({icon:icon(k),title:label(k),count:data[k].length,unit:label('entries'),text:label('about_'+k),href:libraryHref(k),attrs:''}));
 const card=c=>`<a class="overview-card" href="${esc(c.href)}"${c.attrs}>${c.icon}<span><b>${esc(c.title)} <small>${number(c.count)} ${esc(c.unit)}</small></b><span>${esc(c.text)}</span></span><em>${esc(label('open'))} →</em></a>`;
 $('#overview').innerHTML=`<h2>${esc(label('handbook'))}</h2><div class="overview-grid">${groups.map(card).join('')}</div><h2>${esc(label('library'))}</h2><div class="overview-grid">${db.map(card).join('')}</div>`;
}
const table=(headers,rows)=>`<div class="data-table"><table><thead><tr>${headers.map(h=>`<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(c=>`<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const reward=r=>[r.coins?number(r.coins)+' '+label('coins'):'',r.baseXp?number(r.baseXp)+' Base EXP':'',r.jobXp?number(r.jobXp)+' Job EXP':'',...(r.items??[]).map(i=>name(i.id)+' ×'+i.count)].filter(Boolean).join(' · ');
const stats=it=>[...['atk','matk','def','mdef'].filter(k=>it[k]).map(k=>k.toUpperCase()+' +'+number(it[k])),...Object.entries(it.bonus??{}).filter(([,n])=>n).map(([k,n])=>k.toUpperCase()+' +'+number(n))].join(' · ')||label('statsEmpty');
const copyButton=id=>`<button type="button" class="copy" data-copy="${esc(id)}">${esc(label('link'))}</button>`;
const dbLink=(kind,id,text)=>`<a href="${REF}#ref-${esc(kind)}-${esc(kind==='items'?id.split('^')[0]:id)}">${esc(text)}</a>`;

function art(a){
 if(!a?.src)return '';
 if(a.rect){const [x,y,w,h]=a.rect,max=Math.max(w,h),px=a.width===w?0:x/(a.width-w)*100,py=a.height===h?0:y/(a.height-h)*100;
  return `<span class="art-box" aria-hidden="true"><span class="art-sprite" style="width:${w/max*100}%;height:${h/max*100}%;background-image:url('${esc(a.src)}');background-size:${a.width/w*100}% ${a.height/h*100}%;background-position:${px}% ${py}%"></span></span>`;
 }
 if(a.cols){const col=a.index%a.cols,row=Math.floor(a.index/a.cols);return `<span class="art-box" aria-hidden="true"><span class="art-sprite" style="width:100%;height:100%;background-image:url('${esc(a.src)}');background-size:${a.cols*100}% ${a.rows*100}%;background-position:${a.cols===1?0:col/(a.cols-1)*100}% ${a.rows===1?0:row/(a.rows-1)*100}%"></span></span>`;}
 return `<span class="art-box"><img src="${esc(a.src)}" loading="lazy" alt="" width="64" height="64"></span>`;
}

function markdown(text){
 const lines=text.split('\n');let out='',list='';
 const close=()=>{if(list){out+=`</${list}>`;list='';}};
 for(const raw of lines){const line=raw.trim();if(!line)continue;
  const type=line.startsWith('- ')?'ul':/^\d+\. /.test(line)?'ol':'';
  if(type){if(list!==type){close();out+=`<${type}>`;list=type;}out+=`<li>${esc(line.replace(/^(?:- |\d+\. )/,''))}</li>`;continue;}
  close();out+=line.startsWith('### ')?`<h3>${esc(line.slice(4))}</h3>`:line.startsWith('! ')?`<p class="note">${esc(line.slice(2))}</p>`:`<p>${esc(line)}</p>`;
 }close();return out;
}
function pictureFrame(p){
 return `<span class="picture-frame" style="aspect-ratio:${p.width}/${p.height}"><img src="${esc(p.src)}" alt="${esc(p.alt)}" width="${p.width}" height="${p.height}" loading="lazy" decoding="async">${p.pins.map((pin,i)=>`<span class="picture-pin" style="left:${pin.x}%;top:${pin.y}%" aria-hidden="true">${i+1}</span>`).join('')}</span>`;
}
function pictureNotes(p){return p.pins.length?`<ol class="picture-notes">${p.pins.map((pin,i)=>`<li><b aria-hidden="true">${i+1}</b><span>${esc(pin.text)}</span></li>`).join('')}</ol>`:'';}
function visualFigures(id){
 return pictures.filter(p=>p.chapters.includes(id)).map(p=>`<figure class="guide-picture"><figcaption><span class="eyebrow">${esc(label('picture'))}</span><h3>${esc(p.title)}</h3><p>${esc(p.description)}</p></figcaption><button type="button" class="picture-open" data-picture="${esc(p.id)}" aria-label="${esc(label('enlarge')+': '+p.title)}">${pictureFrame(p)}<span class="picture-enlarge">${esc(label('enlarge'))}</span></button>${pictureNotes(p)}<small class="picture-example">${esc(label('pictureNote'))}</small></figure>`).join('');
}
function pictureTiles(id){
 const tiles=(title,rows)=>`<section class="visual-examples" aria-label="${esc(title)}"><h3>${esc(title)}</h3><div class="visual-tiles">${rows.join('')}</div></section>`;
 const itemTile=i=>`<a class="visual-tile" href="${REF}#ref-items-${esc(i.id)}">${art(i.art)}<strong>${esc(i.name)}</strong><small>${esc(i.text??'')}</small></a>`;
 if(id==='classes')return tiles(label('classPictures'),data.classes.map(c=>`<a class="visual-tile class-tile" href="${esc(libraryHref('skills',c.name))}"><img src="assets/landing98/class-${esc(c.id)}-m.webp" loading="lazy" decoding="async" width="180" height="180" alt="${esc(c.name)}"><strong>${esc(c.name)}</strong><small>${esc(c.role)}</small></a>`));
 if(id==='equipment')return tiles(label('equipmentPictures'),['weapon','head','armor','garment','shoes','accessory'].map(slot=>itemTile(data.items.find(i=>i.kind==='gear'&&i.slot===slot))));
 if(id==='advancement')return tiles(label('materialPictures'),[...new Set(Object.values(data.rules.training).flatMap(t=>t.items.map(([id])=>id)))].map(id=>itemTile(data.items.find(i=>i.id===id))));
 if(id==='cards')return tiles(label('cardPictures'),data.items.filter(i=>i.kind==='card').slice(0,3).map(itemTile));
 if(id==='pets')return tiles(label('petPictures'),data.pets.map(p=>`<a class="visual-tile pet-tile" href="${REF}#ref-pets-${esc(p.id)}"><img src="${esc(p.art.src)}" alt="${esc(p.name)}" width="150" height="150" loading="lazy" decoding="async"><strong>${esc(p.name)} <span class="badge">${p.tier}</span></strong><small>${esc(p.skill.tip)}</small></a>`));
 return '';
}
function setupPictureViewer(){
 pictureDialog=document.createElement('dialog');pictureDialog.id='guide-picture-viewer';pictureDialog.setAttribute('aria-labelledby','guide-picture-title');
 pictureDialog.innerHTML=`<header><h2 id="guide-picture-title"></h2><button type="button" id="guide-picture-zoom">${esc(label('zoomPicture'))}</button><button type="button" id="guide-picture-close" aria-label="${esc(label('closePicture'))}">×</button></header><div class="picture-scroll"><div class="picture-large"></div></div><div class="picture-viewer-notes"></div>`;document.body.append(pictureDialog);
 const close=()=>pictureDialog.close();$('#guide-picture-close').addEventListener('click',close);
 pictureDialog.addEventListener('click',e=>{if(e.target===pictureDialog)close();});
 pictureDialog.addEventListener('close',()=>{pictureOpener?.focus({preventScroll:true});});
 $('#guide-picture-zoom').addEventListener('click',()=>{const zoom=pictureDialog.classList.toggle('actual-size');$('#guide-picture-zoom').textContent=label(zoom?'fitPicture':'zoomPicture');$('#guide-picture-zoom').setAttribute('aria-pressed',String(zoom));});
}
function openPicture(id,opener){
 const p=pictures.find(p=>p.id===id);if(!p)return;pictureOpener=opener;pictureDialog.classList.remove('actual-size');
 $('#guide-picture-title').textContent=p.title;$('#guide-picture-zoom').textContent=label('zoomPicture');$('#guide-picture-zoom').setAttribute('aria-pressed','false');
 pictureDialog.querySelector('.picture-large').innerHTML=pictureFrame(p);pictureDialog.querySelector('.picture-large').style.setProperty('--natural-width',p.width+'px');
 pictureDialog.querySelector('.picture-viewer-notes').innerHTML=pictureNotes(p);pictureDialog.showModal();pictureDialog.querySelector('.picture-scroll').scrollTo(0,0);$('#guide-picture-close').focus();
}
function supplemental(id){
 if(id==='classes')return table([label('class'),label('summary'),label('branches')],data.classes.map(c=>[c.name,c.role,(c.branches??[]).map(b=>b.name).join(' / ')]));
 if(id==='advancement')return `<h3>${esc(label('trainTitle'))}</h3>`+table([label('tier'),label('needJob'),label('kills'),label('boss'),label('ingredients'),label('price')],Object.entries(data.rules.training).map(([k,t])=>[label(k==='class'?'trainingClass':'trainingMaster'),k==='class'?10:40,t.kills,t.bossName,t.items.map(([id,n])=>name(id)+' ×'+n).join(' · '),number(t.coins)]))+table([label('class'),'NPC','X / Y'],data.classes.map(c=>[c.name,c.mentor?.name??'',`${c.mentor?.x??''} / ${-(c.mentor?.z??0)}`]));
 if(id==='refine')return `<div class="calculator" id="refine-calculator"><h3>${esc(label('calcTitle'))}</h3><p class="muted">${esc(label('calcNote'))}</p><div class="calc-controls"><label>${esc(label('calcItem'))}<select id="calc-item">${data.items.filter(i=>i.kind==='gear').map(i=>`<option value="${esc(i.id)}">${esc(i.name)}</option>`).join('')}</select></label><label>${esc(label('calcLevel'))}<input id="calc-level" type="number" min="0" max="20" step="1" value="10"></label></div><div id="calc-result" aria-live="polite"></div></div><h3>${esc(label('refineTitle'))}</h3>`+table(['+',label('tier'),label('bonus'),label('rate'),label('withLek'),label('price')],data.rules.refine.rates.map((rate,i)=>[i+1,refineTier(i+1)||'—',refinePercent(i+1)+'%',pct(rate),pct(Math.min(1,rate+.2)),number(data.rules.refine.costs[i])])) ;
 if(id==='album')return `<h3>${esc(label('albumTitle'))}</h3>`+table([label('types'),label('rewards')],data.rules.album.map(m=>[m.count,reward(m.reward)]));
 if(id==='daily')return `<h3>${esc(label('dailyTitle'))}</h3>`+table([label('day'),label('rewards')],data.rules.daily.map((r,i)=>[i+1,reward(r)]))+`<h3>${esc(label('weeklyTitle'))}</h3>`+table([label('objectives'),label('rewards')],data.rules.weekly.map(q=>[q.name,reward(q.reward)]));
 if(id==='guild')return `<h3>${esc(label('guildTitle'))}</h3>`+table([label('name'),label('tier'),label('level'),label('price'),label('bonus')],Object.values(data.rules.guild.upgrades).flatMap(u=>u.costs.map((cost,i)=>[u.name,i+1,u.levels[i],number(cost),u.text])));
 if(id==='bosses')return table([label('maps'),label('boss'),label('mapHp')],data.maps.filter(m=>m.worldBoss).map(m=>[m.name,m.boss,number(m.worldBoss.hp)]));
 return '';
}

function renderArticles(){
 $('#articles').innerHTML=articles.map((a,i)=>{const body=markdown(a.body),intro=body.indexOf('</p>')+4;return `<article class="chapter" id="${esc(a.id)}"><div class="chapter-top"><span class="chapter-number">${String(i+1).padStart(2,'0')} / ${esc(a.group)}</span>${copyButton(a.id)}</div><h2>${esc(a.title)}</h2>${body.slice(0,intro)}${pictureTiles(a.id)}${visualFigures(a.id)}${body.slice(intro)}${supplemental(a.id)}</article>`;}).join('');
 let last='';$('#toc').innerHTML=articles.map(a=>{const title=a.group!==last?`<strong>${icon(a.group)}${esc(a.group)} <small>${articles.filter(x=>x.group===a.group).length}</small></strong>`:'';last=a.group;return title+`<a href="#${esc(a.id)}">${esc(a.title)}</a>`;}).join('');
 const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){$('#toc a.active')?.classList.remove('active');$(`#toc a[href="#${entry.target.id}"]`)?.classList.add('active');}},{rootMargin:'-150px 0px -55% 0px'});
 document.querySelectorAll('#articles article').forEach(a=>observer.observe(a));
 $('#calc-item').addEventListener('change',calculate);$('#calc-level').addEventListener('input',calculate);calculate();
}
function calculate(){
 const item=data.items.find(i=>i.id===$('#calc-item').value),raw=Number($('#calc-level').value),level=Number.isFinite(raw)?Math.max(0,Math.min(20,Math.trunc(raw))):0;
 const result=effectiveGearStats({...item,refine:level});
 $('#calc-result').innerHTML=`<div class="calc-tier">+${level} · ${refineTier(level)?'Tier '+refineTier(level)+' / +'+refinePercent(level)+'%':esc(label('noTier'))}</div><div class="calc-output"><div class="calc-stat"><strong>${esc(label('calcBase'))}</strong>${esc(stats(item))}</div><div class="calc-stat"><strong>${esc(label('calcResult'))}</strong>${esc(stats(result))}</div></div>`;
}
function record(kind,r){
 const id=`ref-${kind}-${r.id}`,title=r.name??r.title;let body='',sub='';
 if(kind==='skills'){
  sub=r.className+' / '+(r.branchName??label('base'));
  body=`${badge(r.passive?label('passive'):'Lv.1–'+r.max)}<p>${esc(r.tip)}</p><p class="muted">${esc(label('need'))}: ${esc((r.job?'Job Lv.'+r.job:'')||r.requires.map(q=>q.name+' Lv.'+q.level).join(' · ')||label('noNeed'))}</p>`;
  if(r.levels.length)body+=table(['Lv.','MP',label('cooldown'), 'Power',label('range'),label('radius')],r.levels.map(v=>[v.level,v.cost??v.mp??0,number(v.cd??0),number(v.power??0),v.range??'—',v.radius??'—']));
 }
 if(kind==='items'){
  sub=label(r.kind==='gear'?r.slot:r.kind);
  body=`<p>${esc(r.text??'')}</p><p>${esc(stats(r))}</p>`+['level','classes','slots'].map(k=>(k==='slots'?r.kind==='gear':r[k])?badge(k==='classes'?r[k].map(className).join('/'):label(k==='slots'?'cardSlot':k)+' '+(r[k]??1)):'').join('');
  if(r.buy||r.sell)body+=`<p class="muted">${r.buy?esc(label('buy'))+' '+number(r.buy)+' · ':''}${r.sell?esc(label('sell'))+' '+number(r.sell):''}</p>`;
  body+=`<details><summary>${esc(label('source'))}</summary>${r.sources.length?`<ul>${r.sources.map(s=>`<li>${s.type==='drop'?dbLink('monsters',s.monster,s.name)+' · '+pct(s.rate):s.type==='shop'?esc(label('shop')+' '+s.name)+(s.mapId?' · '+dbLink('maps',s.mapId,mapName(s.mapId)):''):`<a href="#database" data-library="recipes" data-query="${esc(r.name)}">${esc(label('craft'))}</a>`}</li>`).join('')}</ul>`:`<p>${esc(label('specialSource'))}</p>`}</details>`;
 }
 if(kind==='monsters'){
  sub='Lv.'+(r.level??1)+' · '+label(r.boss?'boss':r.elite?'elite':'normal');
  body=`<dl><dt>HP</dt><dd>${number(r.hp)}</dd><dt>${esc(label('attack'))}</dt><dd>${number(r.damage)}</dd><dt>Base / Job EXP</dt><dd>${number(r.baseXp)} / ${number(r.jobXp)}</dd></dl><p>${esc(label('where'))}: ${r.locations.map(m=>dbLink('maps',m.id,m.name)).join(' · ')||'—'}</p>`;
  const areas=data.maps.filter(m=>m.worldBoss?.id===r.id);if(areas.length)body+=`<p class="note">${esc(label('mapHp'))}: ${number(areas[0].worldBoss.hp)}<br>${esc(label('bossLive'))}</p>`;
  body+=`<details><summary>${esc(label('drops'))} (${r.drops.length})</summary><p class="muted">${esc(label('sourceNote'))}</p>${r.drops.length?`<ul>${r.drops.map(d=>`<li>${dbLink('items',d.id,d.name)} · ${pct(d.rate)}${d.count!==1?' ×'+d.count:''}</li>`).join('')}</ul>`:`<p>${esc(label('unlistedDrop'))}</p>`}</details>`;
 }
 if(kind==='maps'){
  sub=label(r.safe?'safe':'field');body=`<p>${esc(r.subtitle)}</p>`;
  if(r.worldBoss)body+=`<p>${esc(label('worldBoss'))}: ${dbLink('monsters',r.worldBoss.id,r.boss)} · HP ${number(r.worldBoss.hp)}</p>`;
  body+=`<p>${esc(label('portal'))}: ${r.portals.map(p=>dbLink('maps',p.to,p.name)+' (X '+p.x+', Y '+p.y+')').join(' · ')||'—'}</p>`;
  if(r.npcs.length)body+=`<details><summary>${esc(label('npcs'))} (${r.npcs.length})</summary>`+table(['NPC','X','Y'],r.npcs.map(n=>[n.name,n.x,n.y]))+'</details>';
  body+=`<details><summary>${esc(label('monsters'))} (${r.monsters.length})</summary><ul>${r.monsters.map(m=>`<li>${dbLink('monsters',m.id,m.name)} · Lv.${m.level}</li>`).join('')}</ul></details>`;
 }
 if(kind==='recipes'){
  sub=label(r.group);body=`<p>${esc(label('output'))}: ${dbLink('items',r.out,r.name)} ×${r.count??1}</p><p>${esc(label('price'))}: ${number(r.coins)}</p><ul>${r.ingredients.map(i=>`<li>${dbLink('items',i.id,i.name)} ×${i.count}</li>`).join('')}</ul>`;
 }
 if(kind==='pets'){
  sub=r.tier+' / '+label(r.movement==='fly'?'fly':'ground');body=`<p>${esc(label('oneStar'))}: ${esc(stats({bonus:r.bonus}))}</p><p>${esc(label('fiveStar'))}: ${esc(stats({bonus:r.five.bonus}))}</p><h4>${esc(r.skill.name)}</h4><p>${esc(r.skill.tip)}</p><p class="muted">${esc(label('cooldown'))}: ${r.skill.cooldown} / ${r.five.skill.cooldown} ${esc(label('seconds'))} (1 / 5 ${esc(label('stars'))})</p>`;
  if(r.tier==='S')body+='<p class="muted">'+esc(label('petBuildS'))+'</p>';
 }
 if(kind==='story'){
  sub=label('chapter')+' '+r.id;body=`<details><summary>${esc(label('replay'))}</summary><ol>${r.steps.map(s=>`<li>${esc(s.hint??s.how??s.type)}${s.mapId?' · '+esc(mapName(s.mapId)):''}${s.npc?' · '+esc(s.npc):''}${s.count?' ×'+s.count:''}</li>`).join('')}</ol><p>${esc(label('rewards'))}: ${esc(reward(r.reward??{}))}</p></details>`;
 }
 return `<article class="record ${kind==='maps'?'map-card':''}" id="${esc(id)}"><div class="record-head">${art(r.art)}<div><small>${esc(sub)}</small><h4>${esc(title)}</h4></div></div>${body}${copyButton(id)}</article>`;
}
// Monster tab, wiki style: a chip per map (with its level range), cards with key stats and top drops, a popup with everything.
const levelRange=list=>{const plain=list.filter(m=>!data.monsters.find(t=>t.id===m.id)?.boss),l=(plain.length?plain:list).map(m=>m.level??1);return l.length?'Lv.'+Math.min(...l)+(Math.max(...l)>Math.min(...l)?'–'+Math.max(...l):''):'';};
function monsterChips(){
 const box=$('#library-chips'),on=current==='monsters';box.hidden=!on;if(!on)return;const value=$('#library-filter').value;
 const chips=[['',label('allMaps'),''],['boss',label('boss'),''],...data.maps.filter(m=>m.monsters.length).map(m=>[m.id,m.name,levelRange(m.monsters)])];
 box.innerHTML=chips.map(([v,t,lv])=>`<button type="button" data-map-chip="${esc(v)}" aria-pressed="${v===value}">${esc(t)}${lv?` <small>${esc(lv)}</small>`:''}</button>`).join('');
}
const monsterTag=r=>r.boss?`<span class="tag boss">${esc(label('boss'))}</span>`:r.elite?`<span class="tag elite">${esc(label('eliteShort'))}</span>`:'';
const dropLine=d=>`<li>${art(d.art)}<a href="${REF}#ref-items-${esc(d.id)}" data-close-monster>${esc(d.name)}</a><b>${pct(d.rate)}</b>${d.count!==1?`<small>×${d.count}</small>`:''}</li>`;
const byRate=list=>[...list].sort((a,b)=>b.rate-a.rate);
function monsterCard(r){
 const top=byRate(r.drops).slice(0,4);
 return `<article class="monster-card${r.boss?' is-boss':''}" id="ref-monsters-${esc(r.id)}"><button type="button" class="monster-open" data-monster="${esc(r.id)}" aria-label="${esc(label('monsterInfo')+' '+r.name)}"></button>`+
  `<div class="monster-head">${art(r.art)}<div><h4>${esc(r.name)} ${monsterTag(r)}</h4><p class="lv">Lv.${r.level??1}${r.magic?' · '+esc(label('magicAttack')):''}</p><p class="where">${esc(r.locations.map(m=>m.name).join(' · ')||'—')}</p></div></div>`+
  `<dl class="monster-stats"><div><dt>HP</dt><dd>${number(r.hp)}</dd></div><div><dt>ATK</dt><dd>${number(r.damage)}</dd></div><div><dt>EXP</dt><dd>${number(r.baseXp)}</dd></div><div><dt>FLEE</dt><dd>${number(r.flee)}</dd></div><div><dt>DEF/MDEF</dt><dd>${number(r.def)}/${number(r.mdef)}</dd></div><div><dt>HIT</dt><dd>${number(r.hit)}</dd></div></dl>`+
  `<p class="drop-title">${esc(label('drops'))} (${r.drops.length})</p>${top.length?`<ul class="drop-list">${top.map(dropLine).join('')}</ul>`:`<p class="muted">${esc(label('unlistedDrop'))}</p>`}</article>`;
}
let monsterDialog;
function openMonster(id){
 const r=data.monsters.find(m=>m.id===id);if(!r)return;
 if(!monsterDialog){monsterDialog=document.createElement('dialog');monsterDialog.id='monster-viewer';monsterDialog.setAttribute('aria-labelledby','monster-viewer-title');document.body.append(monsterDialog);
  monsterDialog.addEventListener('click',e=>{if(e.target===monsterDialog||e.target.closest('[data-close-monster]'))monsterDialog.close();});}
 // combat-formulas.js: hit chance = (90 + HIT - FLEE)% capped at 100%; dodge = (FLEE - monster HIT + 20)% capped at 70%
 const hit=[[label('hit80'),'HIT '+Math.max(0,r.flee-10)+'+'],[label('hit95'),'HIT '+(r.flee+5)+'+'],[label('hit100'),'HIT '+(r.flee+10)+'+']],dodge=[[label('dodge50'),'FLEE '+(r.hit+30)+'+'],[label('dodge70'),'FLEE '+(r.hit+50)+'+']];
 const rows=list=>`<table>${list.map(([a,b])=>`<tr><td>${esc(a)}</td><th>${esc(b)}</th></tr>`).join('')}</table>`;
 const stat=(k,v,c)=>`<div class="${c}"><dt>${esc(k)}</dt><dd>${v}</dd></div>`;
 const where=r.locations.map(m=>`<a href="${REF}#ref-maps-${esc(m.id)}" data-close-monster>${esc(m.name)}</a>`).join(' · ')||'—';
 monsterDialog.innerHTML=`<header><h2 id="monster-viewer-title">${esc(label('monsterInfo'))}: ${esc(r.name)}</h2><button type="button" data-close-monster aria-label="${esc(label('close'))}">✕</button></header><div class="monster-body">`+
  `<div class="monster-head">${art(r.art)}<div><h3>${esc(r.name)} ${monsterTag(r)}</h3><p class="lv">Lv.${r.level??1} · ${esc(label(r.magic?'magicAttack':'physicalAttack'))}${r.respawn?' · '+esc(label('respawn'))+' '+number(r.respawn/60)+' '+esc(label('minutes')):''}</p><p class="where">${esc(label('where'))}: ${where}</p></div></div>`+
  `<dl class="monster-grid">${stat('HP',number(r.hp),'hp')}${stat(label('attack')+' (ATK)',number(r.damage),'atk')}${stat('Base / Job EXP',number(r.baseXp)+' / '+number(r.jobXp),'exp')}${stat('FLEE',number(r.flee),'flee')}${stat('DEF / MDEF',number(r.def)+' / '+number(r.mdef),'def')}${stat('HIT',number(r.hit),'hit')}</dl>`+
  `<section class="hit-box"><h4>${esc(label('hitTitle'))}</h4><div>${rows(hit)}${rows(dodge)}</div><p class="muted">${esc(label('hitNote'))}</p></section>`+
  `<h4>${esc(label('drops'))} (${r.drops.length})</h4>${r.drops.length?`<ul class="drop-list full">${byRate(r.drops).map(dropLine).join('')}</ul>`:`<p class="muted">${esc(label('unlistedDrop'))}</p>`}<p class="muted">${esc(label('sourceNote'))}</p></div>`;
 monsterDialog.showModal();
}
function filterOptions(){
 const select=$('#library-filter');let options=[['',label(current==='skills'?'allClasses':'allTypes')]];
 if(current==='skills')options.push(...data.classes.flatMap(c=>[[c.id,c.name],...(c.branches??[]).map(b=>[b.id,c.name+' / '+b.name]) ]));
 else if(current==='items')options.push(...[...new Set(data.items.map(i=>i.kind))].map(k=>[k,label(k)]));
 else if(current==='monsters')options.push(['boss',label('boss')],['normal',label('normal')],['elite',label('elite')],...data.maps.filter(m=>m.monsters.length).map(m=>[m.id,m.name]));
 else if(current==='pets')options.push(['S','S'],['A','A'],['B','B'],['fly',label('fly')],['ground',label('ground')]);
 else if(current==='recipes')options.push(...[...new Set(data.recipes.map(r=>r.group))].map(k=>[k,label(k)]));
 select.innerHTML=options.map(([v,t])=>`<option value="${esc(v)}">${esc(t)}</option>`).join('');select.hidden=options.length===1||current==='monsters';
}
function libraryRows(){
 const query=$('#library-search').value,filter=$('#library-filter').value;
 return data[current].filter(r=>{
  if(focused)return r.id===focused;
  if(filter){if(current==='skills'&&r.classId!==filter&&!r.branchName?.includes(filter)&&!data.classes.some(c=>c.branches?.some(b=>b.id===filter&&b.name===r.branchName)))return false;
   if(current==='items'&&r.kind!==filter)return false;
   if(current==='monsters'&&!(filter==='boss'?r.boss:filter==='elite'?r.elite&&!r.boss:filter==='normal'?!r.boss&&!r.elite:r.locations.some(m=>m.id===filter)))return false;
   if(current==='pets'&&r.tier!==filter&&r.movement!==filter)return false;
   if(current==='recipes'&&r.group!==filter)return false;
  }
  return !query||matches(searchText(current,r),query);
 });
}
function renderLibrary(){
 const rows=libraryRows();$('#library-count').textContent=`${label('shown')} ${Math.min(rows.length,limit)} ${label('of')} ${rows.length} ${label('count')}`;
 monsterChips();$('#library-results').classList.toggle('monster-list',current==='monsters');$('#library-results').innerHTML=rows.length?rows.slice(0,limit).map(r=>current==='monsters'?monsterCard(r):record(current,r)).join(''):`<p>${esc(label('noResults'))}</p>`;
 $('#load-more').hidden=rows.length<=limit;$('#load-more').textContent=label('more');
 document.querySelectorAll('#library-tabs button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.library===current)));
}
function setLibrary(kind,query='',focus=null){
 if(!kinds.includes(kind))return;current=kind;limit=16;focused=focus;$('#library-search').value=query;filterOptions();renderLibrary();
}
function searchText(kind,r){
 if(kind==='articles')return r.title+' '+r.group+' '+r.body;
 if(kind==='skills')return [r.name,r.tip,r.className,r.branchName,r.passive?label('passive'):''].join(' ');
 if(kind==='items')return [r.name,r.text,label(r.kind),label(r.slot),stats(r),...r.sources.map(s=>s.name)].join(' ');
 if(kind==='monsters')return [r.name,...r.locations.map(m=>m.name),...r.drops.map(d=>d.name)].join(' ');
 if(kind==='maps')return [r.name,r.subtitle,...r.npcs.map(n=>n.name),...r.monsters.map(m=>m.name)].join(' ');
 if(kind==='recipes')return [r.name,...r.ingredients.map(i=>i.name)].join(' ');
 if(kind==='pets')return [r.name,r.nameEn,r.tier,r.skill.name,r.skill.tip,stats({bonus:r.bonus})].join(' ');
 return [r.title,...r.steps.map(s=>s.hint)].join(' ');
}
function search(){
 const q=$('#guide-search').value,scope=$('#search-scope').value;$('#search-results').hidden=false;
 if(normalize(q).length<2){$('#result-list').innerHTML='';$('#search-status').textContent=label('searchHint');return;}
 const found=index.filter(i=>(scope==='all'||i.kind===scope)&&matches(i.text,q));
 $('#search-status').textContent=found.length?`${number(found.length)} ${label('count')} · ${label('shown')} ${Math.min(searchLimit,found.length)}`:label('noResults');
 $('#result-list').innerHTML=found.slice(0,searchLimit).map(i=>`<a class="result-item" href="${i.kind==='articles'?'#'+esc(i.id):REF+'#ref-'+i.kind+'-'+esc(i.id)}"><small>${esc(label(i.kind))}</small><strong>${esc(i.title)}</strong><p>${esc(i.snippet.slice(0,150))}</p></a>`).join('')+(found.length>searchLimit?`<button id="more-search" type="button">${esc(label('more'))}</button>`:'');
}
function closeContents(){
 $('#contents')?.classList.remove('open');$('#contents-toggle')?.setAttribute('aria-expanded','false');
}
function route(){
 let hash;try{hash=decodeURIComponent(location.hash.slice(1));}catch{return;}
 if(!dbOnly&&(hash==='database'||hash.startsWith('ref-'))){location.replace('database.html'+(hash==='database'?'':location.hash));return;}
 if(hash.startsWith('ref-')){const kind=kinds.find(k=>hash.startsWith('ref-'+k+'-'));if(!kind)return;const id=hash.slice(kind.length+5);if(!data[kind].some(r=>r.id===id))return;setLibrary(kind,'',id);}
 closeContents();requestAnimationFrame(()=>document.getElementById(hash)?.scrollIntoView({block:'start'}));
}
async function copyLink(hash){
 const url=new URL(location.href);url.hash=hash;url.search='';
 let text=label('copied');try{await navigator.clipboard.writeText(url.href);}catch{text=label('linkFailed');}
 $('#toast').textContent=text;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),2600);
}
async function load(){
 const [snapshot,words,book,visuals]=await Promise.all([fetch('assets/guide169/game-data.json?v=skills119').then(r=>{if(!r.ok)throw Error('data');return r.json();}),fetch('assets/guide169/ui.json?v=petbuild220').then(r=>{if(!r.ok)throw Error('labels');return r.json();}),(dbOnly?Promise.resolve({ok:true,text:()=>''}):fetch('assets/guide169/handbook.md?v=petbuild220')).then(r=>{if(!r.ok)throw Error('book');return r.text();}),fetch('assets/guide169/visuals.json?v=skills119').then(r=>{if(!r.ok)throw Error('visuals');return r.json();})]);
 data=snapshot;ui=words;pictures=visuals.pictures;setupPictureViewer();
 new ResizeObserver(()=>document.documentElement.style.setProperty('--guide-tools-height',Math.ceil($('.searchbar').getBoundingClientRect().height)+'px')).observe($('.searchbar'));
 articles=dbOnly?[]:book.trim().split(/\n@/).map(section=>{const [head,...body]=section.replace(/^@/,'').split('\n'),[id,group,title]=head.split('|');return {id,group,title,body:body.join('\n')};});
 // Keep the four TOC groups together without changing stable article IDs.
 const groups=[...new Set(articles.map(a=>a.group))];articles.sort((a,b)=>groups.indexOf(a.group)-groups.indexOf(b.group));
 if(!dbOnly)$('#edition').textContent=`${label('updated')} · ${articles.length} ${label('articleCount')} · ${data.skills.length} ${label('skills')}`;
 if(!dbOnly){renderArticles();renderOverview();}$('#load-status').hidden=true;
 if(dbOnly)$('#library-tabs').innerHTML=['monsters',...kinds.filter(k=>k!=='monsters')].map(k=>`<button type="button" data-library="${k}" aria-pressed="false">${icon(k)}${esc(label(k))} <small>${data[k].length}</small></button>`).join('');
 $('#search-scope').innerHTML=['all',...(dbOnly?[]:['articles']),...kinds].map(k=>`<option value="${k}">${esc(label(k))}</option>`).join('');
 index=[...articles.map(a=>({kind:'articles',id:a.id,title:a.title,snippet:a.body,text:searchText('articles',a)})),...kinds.flatMap(kind=>data[kind].map(r=>({kind,id:r.id,title:r.name??r.title,snippet:searchText(kind,r),text:searchText(kind,r)})))];
 if(dbOnly){const p=new URLSearchParams(location.search);setLibrary(kinds.includes(p.get('tab'))?p.get('tab'):'monsters',p.get('q')??'');}route();
 $('#search-form').addEventListener('submit',e=>{e.preventDefault();searchLimit=30;search();$('#search-results').scrollIntoView({block:'start'});});
 $('#guide-search').addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>{searchLimit=30;if(!$('#guide-search').value){$('#search-results').hidden=true;return;}search();},180);});
 $('#search-scope').addEventListener('change',()=>{searchLimit=30;search();});
 $('#close-search').addEventListener('click',()=>{$('#search-results').hidden=true;$('#guide-search').focus();});
 if(dbOnly){$('#library-search').addEventListener('input',()=>{focused=null;limit=16;renderLibrary();});$('#library-filter').addEventListener('change',()=>{focused=null;limit=16;renderLibrary();});
 $('#load-more').addEventListener('click',()=>{limit+=16;renderLibrary();});}
 $('#contents-toggle')?.addEventListener('click',()=>{const open=$('#contents').classList.toggle('open');$('#contents-toggle').setAttribute('aria-expanded',String(open));if(open)$('#toc a')?.focus();});
 document.addEventListener('click',e=>{const chip=e.target.closest('[data-map-chip]');if(chip){$('#library-filter').value=chip.dataset.mapChip;limit=16;focused=null;renderLibrary();}const mon=e.target.closest('[data-monster]');if(mon)openMonster(mon.dataset.monster);const picture=e.target.closest('[data-picture]');if(picture)openPicture(picture.dataset.picture,picture);const button=e.target.closest('[data-copy]');if(button)copyLink(button.dataset.copy);const tab=dbOnly&&e.target.closest('[data-library]');if(tab){if(tab.tagName==='A')e.preventDefault();setLibrary(tab.dataset.library,tab.dataset.query??'');if(tab.tagName==='A')$('#database').scrollIntoView({block:'start'});}if(e.target.closest('#more-search')){searchLimit+=30;search();}if(e.target.closest('#toc a'))closeContents();});
 document.addEventListener('keydown',e=>{if(pictureDialog.open)return;if(e.key==='Escape'){closeContents();$('#search-results').hidden=true;$('#contents-toggle')?.focus();}if(e.key==='/'&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)){e.preventDefault();$('#guide-search').focus();}});
 window.addEventListener('hashchange',route);
}
load().catch(()=>{const node=$('#load-status');node.className='load-error';node.textContent=ui?.error??'Unable to load the guide. Please reload this page.';});
