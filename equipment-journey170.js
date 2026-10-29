import {ITEMS,CLASSES,SLOTS,GRADES,FAMILIES,familyName,CHAPTERS,REFINE_MAX,REFINE_TIERS,WORLD_MAP_BOSSES,levelChapter,cardSlots,featuredGear,bossGear,chapterGear,itemEffects,createItemGuide,searchItems} from './equipment-journey-data170.js?v=surfaces222';
import {itemDef,ATLASES,ITEM_ATLAS,ATLAS_LAYOUTS} from './items.js?v=tier167';
const $=id=>document.getElementById(id),node=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!=null)el.textContent=text;return el;};
const params=new URLSearchParams(location.search),selected=CLASSES.find(c=>c.id===params.get('class'))?.id??'swordsman';
let classId=selected,level=Math.max(1,Math.min(99,Number(params.get('level'))||1)),guide,visible=18,previousFocus=null;
const sourcesCache=new Map(),source=id=>{if(!sourcesCache.has(id))sourcesCache.set(id,guide.sources(id));return sourcesCache.get(id);};
const num=n=>Number(n).toLocaleString('th-TH',{maximumFractionDigits:3});
const percent=n=>num(n*100)+'%';
const tints={wind:'hue-rotate(95deg) saturate(1.5) brightness(1.15)',gold:'sepia(.55) saturate(2.4) hue-rotate(-10deg) brightness(1.12)',violet:'hue-rotate(215deg) saturate(1.7) brightness(1.05)'};
function art(id){const it=itemDef(id),el=node('span','item-art');el.setAttribute('aria-hidden','true');if(!it)return el;
 const direct=it.image??(it.monsterCard?'assets/cards147/'+id.slice(5)+'.webp':null);
 if(direct){el.style.backgroundImage=`url("${direct}")`;el.style.backgroundSize='contain';el.style.backgroundPosition='center';}
 else{const {columns=6,rows=4}=ATLAS_LAYOUTS[it.atlas]??{};el.style.backgroundImage=`url("${ATLASES[it.atlas]??ITEM_ATLAS}")`;el.style.backgroundSize=columns*100+'% '+rows*100+'%';el.style.backgroundPosition=(it.icon%columns)/(columns-1)*100+'% '+Math.floor(it.icon/columns)/(rows-1)*100+'%';}
 if(tints[it.tint])el.style.filter=tints[it.tint]+' drop-shadow(0 4px 3px #0007)';return el;
}
function sourceHint(id){const s=source(id),ways=[];if(s.quest.length)ways.push('รางวัลเควส');if(s.shop.length)ways.push('ซื้อได้');if(s.recipe)ways.push('คราฟได้');if(s.drop.length)ways.push('สุ่มดรอป');if(s.gacha.length)ways.push('กาชา');return ways.join(' / ')||'ยังไม่พบแหล่งได้รับ';}
function itemCard(item,extra=''){const id=typeof item==='string'?item:item.id,it=itemDef(id);if(!it)return node('span');
 const button=node('button','item-card');button.type='button';button.dataset.item=id;button.setAttribute('aria-label',it.name+' ดูวิธีได้รับ');button.append(art(id));const text=node('span');
 text.append(node('strong','',it.name));text.append(node('small','',extra||(it.kind==='gear'?`Lv.${it.level??1} · ${SLOTS[it.slot]}${it.set?' · ชุด'+familyName(it.set.family)+' ขั้น '+it.set.tier:it.tier?' · ขั้น '+it.tier:it.bossSet?' · เซ็ทบอส':''}`:it.kind==='card'?'การ์ดใส่'+SLOTS[it.slot]:'วัตถุดิบ')));text.append(node('small','source-hint',sourceHint(id)));button.append(text);return button;
}
function updatePosition(){const c=levelChapter(level);$('player-position').textContent=`${CLASSES.find(c=>c.id===classId).name} · Base Lv.${level} · ดูช่วง ${c.min}–${c.max}: ${c.title}`;
 for(const link of $('chapter-nav').querySelectorAll('a')){const current=link.hash==='#chapter-'+c.id;link.classList.toggle('current',current);if(current)link.setAttribute('aria-current','step');else link.removeAttribute('aria-current');}
 const url=new URL(location.href);url.searchParams.set('class',classId);url.searchParams.set('level',level);history.replaceState(null,'',url);
}
function renderChapters(){const nav=$('chapter-nav'),body=$('chapters');nav.replaceChildren();body.replaceChildren();
 CHAPTERS.forEach((chapter,i)=>{
  const link=node('a');link.href='#chapter-'+chapter.id;link.append(node('span','',String(i+1).padStart(2,'0')));const label=node('div','',`Lv.${chapter.min}–${chapter.max}`);label.append(node('strong','',chapter.title));link.append(label);nav.append(link);
  const section=node('section','chapter');section.id='chapter-'+chapter.id;section.setAttribute('aria-labelledby','chapter-title-'+chapter.id);
  const banner=node('div','chapter-banner');banner.style.backgroundImage=`linear-gradient(0deg,#0b211af2,#0b211a30),url("${chapter.image}")`;const heading=node('div');heading.append(node('p','eyebrow',`ช่วงที่ ${i+1} · Base Lv.${chapter.min}–${chapter.max}`));const h=node('h2','',chapter.title);h.id='chapter-title-'+chapter.id;heading.append(h);banner.append(heading);section.append(banner);
  const content=node('div','chapter-content');content.append(node('p','chapter-label',chapter.place),node('p','chapter-intro',chapter.intro));
  const steps=node('ol','steps');for(const text of chapter.steps)steps.append(node('li','',text));content.append(steps,node('p','chapter-label','ของที่ควรรู้จักในช่วงนี้ · กดเพื่อดูวิธีหา'));
  const grid=node('div','item-grid');for(const it of featuredGear(chapter,classId))grid.append(itemCard(it));content.append(grid);
  const all=chapterGear(chapter,classId),details=node('details','stage-detail');details.append(node('summary','',`ดูอุปกรณ์ช่วงนี้ทั้งหมดที่อาชีพนี้ใช้ได้ (${all.length} ชิ้น)`));details.addEventListener('toggle',()=>{if(details.open&&!details.dataset.loaded){const items=node('div','item-grid');for(const it of all)items.append(itemCard(it));details.append(items);details.dataset.loaded='1';}});content.append(details,node('p','next-step','เป้าหมายถัดไป · '+chapter.next));section.append(content);body.append(section);
 });updatePosition();
}
// 0.117 the five grades (frame colours) and the five set families
function renderGrades(){const el=$('grade-comparison');el.replaceChildren();
 GRADES.forEach((g,i)=>{const box=node('article','grade-card');const h=node('h3','',`เกรด${g.name}`);h.style.color=g.color;box.style.borderColor=g.color;
  box.append(h,node('p','',`ค่าพื้นฐาน ${Math.round(g.mul*100)}% · โอกาสได้ ${Math.round(g.chance*100)}%`),node('small','small-note',i===4?'ดรอปจากบอสเท่านั้น':'ดรอปหรือคราฟ · โบนัสเซ็ทเท่ากันทุกเกรด'));el.append(box);});
 FAMILIES.forEach(f=>{const box=node('article','grade-card');box.append(node('h3','',`ชุด${f.name}`),node('p','',`ขั้น 1 → 6: ${f.sets[0]} … ${f.sets[5]}`));el.append(box);});
 $('refine-milestones').textContent=REFINE_TIERS.map(t=>`+${t.level} = Tier ${t.tier} (+${t.percent}%)`).join(' · ');
}
function renderEndgame(){const grid=$('endgame-gear');grid.replaceChildren();for(const id of bossGear(classId))grid.append(itemCard(id));
 if(classId==='novice')grid.append(node('p','small-note','ผู้ฝึกตนใช้ชุดเริ่มต้น เซ็ทบอสเป็นของอาชีพหลัก เปลี่ยนอาชีพก่อนแล้วค่อยวางแผน'));
 $('endgame-relics').replaceChildren(itemCard('seal-naga'),itemCard('seal-kailash'));
}
function renderRelics(){const el=$('relic-list');el.replaceChildren();for(const b of WORLD_MAP_BOSSES){const recipe=guide.recipeDetails(b.accessory),box=node('article','relic-card');box.append(itemCard(b.accessory),node('p','',b.mapName+' · บอส '+b.name),node('small','',`วัตถุดิบแมพ ${recipe.needs.find(n=>n.id===b.material).count} ชิ้น + เหล็กไหล · ${source(b.material).drop.some(d=>!d.boss)?'ฟาร์มมอนธรรมดาได้':'วัสดุจากบอสแมพ'}`));el.append(box);}}
function renderCatalog(reset=true){if(reset)visible=18;const rows=searchItems({classId,query:$('item-search').value,kind:$('kind-select').value,allClasses:$('all-classes').checked}).sort((a,b)=>(a.level??1)-(b.level??1)||a.name.localeCompare(b.name,'th'));
 const grid=$('catalog-items');grid.replaceChildren(...rows.slice(0,visible).map(i=>itemCard(i)));$('load-more').hidden=visible>=rows.length;$('search-status').textContent=rows.length?`แสดง ${Math.min(visible,rows.length)} จาก ${rows.length} ชิ้น`:'ไม่พบไอเท็ม ลองเปลี่ยนคำค้นหรือเลือกรวมของทุกอาชีพ';
 $('catalog-count').textContent=`ข้อมูลปัจจุบัน: Equipment ${Object.values(ITEMS).filter(i=>i.kind==='gear').length} ชิ้น · การ์ด ${Object.values(ITEMS).filter(i=>i.kind==='card').length} ใบ · พร้อมวัตถุดิบที่เกี่ยวข้อง`;
}
function detailSection(title){const section=node('section','detail-section');section.append(node('h3','',title));$('item-detail').append(section);return section;}
function row(title,subtitle,value){const r=node('div','source-row'),left=node('div');left.append(node('strong','',title));if(subtitle)left.append(node('small','',subtitle));r.append(left,node('span','',value));return r;}
function describeMaterial(s){if(s.shop.length)return 'ซื้อจาก '+s.shop[0].npc+' · '+s.shop[0].mapName;if(s.drop.length){const best=[...s.drop].sort((a,b)=>Number(a.boss)-Number(b.boss)||b.chance-a.chance)[0];return best.name+' · '+best.maps.map(m=>m.name).join(', ');}if(s.recipe)return 'มีสูตรคราฟ กดดูรายละเอียด';return 'กดดูแหล่งได้รับ';}
function openItem(id){const it=itemDef(id);if(!it)return;const dialog=$('item-dialog'),root=$('item-detail'),s=source(id);if(!dialog.open)previousFocus=document.activeElement;root.replaceChildren();
 const hero=node('div','detail-hero'),body=node('div');hero.append(art(id));const title=node('h2','',it.name);title.id='detail-title';body.append(title,node('p','',id),node('p','',it.kind==='gear'?`สวมใส่ Base Lv.${it.level??1} · ${SLOTS[it.slot]} · ${it.classes?.map(c=>CLASSES.find(x=>x.id===c)?.name??c).join(', ')??'ทุกอาชีพ'}`:it.kind==='card'?'การ์ดสำหรับ'+SLOTS[it.slot]:'วัตถุดิบและของคราฟ'),node('p','',itemEffects(it)));hero.append(body);root.append(hero);
 if(it.kind==='gear'){const rules=detailSection('ก่อนลงทุนกับชิ้นนี้');rules.append(node('p','',`${it.set?'ชุด'+familyName(it.set.family)+' ขั้น '+it.set.tier+' · สุ่มได้ 5 เกรด · ':it.bossSet?'เซ็ทบอส กรอบสีรุ้ง · ':''}ช่องการ์ด ${cardSlots(it)} ช่อง · ตีบวกได้ถึง +${REFINE_MAX}`));if(!cardSlots(it))rules.append(node('p','recipe-note','ชิ้นนี้ไม่มีช่องการ์ด ตรวจให้ตรงกับบิลด์ก่อนเลือกคราฟหรือตีบวก'));}
 if(s.quest.length){const section=detailSection('รับแน่นอนเมื่อทำเควสสำเร็จ');for(const q of s.quest)section.append(row(q.title,q.steps.map(step=>[step.npc,step.mapName,step.level?'ถึง Base Lv.'+step.level:null].filter(Boolean).join(' · ')).filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i).join(' / '),`×${q.count}`));}
 if(s.shop.length){const section=detailSection('ซื้อจากร้าน');for(const shop of s.shop)section.append(row(shop.npc,shop.title+' · '+shop.mapName,shop.price!=null?`${num(shop.price)} ${shop.currency==='coins'?'เบี้ย':ITEMS[shop.currency]?.name??shop.currency}`:'ไม่ได้ระบุราคา'));}
 const recipe=guide.recipeDetails(id);if(recipe){const section=detailSection('คราฟได้ด้วยตัวเอง');section.append(node('p','',`เปิด กระเป๋า → คราฟ → เลือก ${it.name} · ได้ ${recipe.count} ชิ้นต่อครั้ง · ค่าใช้จ่าย ${num(recipe.coins)} เบี้ยต่อครั้ง`));const list=node('div','recipe-materials');for(const material of recipe.needs)list.append(itemCard(material.id,`ใช้ ${material.count} ชิ้น · ${describeMaterial(material.sources)}`));section.append(list);if(recipe.needs.some(n=>ITEMS[n.id]?.kind==='gear'))section.append(node('p','recipe-note','สูตรใช้ชิ้นอุปกรณ์ฐานที่ไม่ตีบวก ไม่ใส่การ์ด และไม่มีออปชันสุ่ม แยกไว้ในกระเป๋าก่อนคราฟ'));}
 if(s.drop.length){const section=detailSection('มอนสเตอร์ที่สุ่มดรอป');section.append(node('p','',`โอกาสพื้นฐานต่อการสุ่ม ไม่ได้รับประกันว่าจะได้ภายในจำนวนครั้งที่กำหนด · พบ ${s.drop.length} แหล่ง`));for(const d of s.drop){let subtitle=`Lv.${d.level} · ${d.maps.length?d.maps.map(m=>m.name+(m.instance?' (ดันเจี้ยนปาร์ตี้)':'')).join(', '):'ยังไม่พบจุดเกิดในแผนที่ปัจจุบัน'}`;if(d.worldBoss)subtitle+=' · บอสแมพเกิดใหม่ 1 ชั่วโมงหลังตาย';else if(d.boss)subtitle+=' · หัวหน้าหรือบอส';section.append(row(d.name,subtitle,percent(d.chance)+(d.count>1?' · ×'+d.count:'')));}}
 if(s.gacha.length){const section=detailSection('กาชา');for(const g of s.gacha)section.append(row('กรุเบญจภาคี','เรทปกติต่อการสุ่ม 1 ครั้ง',percent(g.chance)));}
 if(!s.quest.length&&!s.shop.length&&!recipe&&!s.drop.length&&!s.gacha.length)detailSection('สถานะเส้นทาง').append(node('p','', 'มีนิยามไอเท็ม แต่ยังไม่พบร้าน รางวัลเควส สูตรคราฟ หรือมอนสเตอร์ที่ดรอปในข้อมูลปัจจุบัน'));
 if(it.kind==='card')detailSection('วิธีใช้การ์ด').append(node('p','',`เปิดกระเป๋า เลือกการ์ด แล้วใส่ใน${SLOTS[it.slot]}ที่มีช่องการ์ด 1 ช่อง การ์ดไม่จำกัดอาชีพ แต่ต้องตรงชนิดช่องของอุปกรณ์`));
 if(!dialog.open)dialog.showModal();dialog.scrollTop=0;$('close-detail').focus({preventScroll:true});
}
async function init(){const res=await fetch('maps/world.json?v=170');if(!res.ok)throw Error('โหลดแผนที่ไม่สำเร็จ');guide=createItemGuide(await res.json());
 for(const c of CLASSES){const option=node('option','',c.name);option.value=c.id;$('class-select').append(option);}$('class-select').value=classId;$('level-input').value=level;
 const render=()=>{renderChapters();renderGrades();renderEndgame();renderCatalog();};render();renderRelics();$('page-status').textContent='';
 $('class-select').addEventListener('change',()=>{classId=$('class-select').value;render();});
 const readLevel=()=>{level=Math.max(1,Math.min(99,Number($('level-input').value)||1));$('level-input').value=level;updatePosition();};$('level-input').addEventListener('change',readLevel);
 $('find-stage').addEventListener('click',()=>{readLevel();$('chapter-'+levelChapter(level).id).scrollIntoView({block:'start'});});
 $('item-search').addEventListener('input',()=>renderCatalog());$('kind-select').addEventListener('change',()=>renderCatalog());$('all-classes').addEventListener('change',()=>renderCatalog());$('load-more').addEventListener('click',()=>{visible+=24;renderCatalog(false);});
 document.querySelector('[data-find-cards]').addEventListener('click',()=>{$('kind-select').value='card';$('item-search').value='';renderCatalog();});
 document.addEventListener('click',e=>{const button=e.target.closest('[data-item]');if(button)openItem(button.dataset.item);});
 $('close-detail').addEventListener('click',()=>$('item-dialog').close());$('item-dialog').addEventListener('close',()=>{if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});});$('item-dialog').addEventListener('click',e=>{if(e.target!==$('item-dialog'))return;const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();});
 if(location.hash&&document.getElementById(location.hash.slice(1)))requestAnimationFrame(()=>document.getElementById(location.hash.slice(1)).scrollIntoView({behavior:'instant'}));
}
init().catch(error=>{console.error(error);$('page-status').textContent='โหลดคู่มือไม่สำเร็จ ลองรีเฟรชหน้านี้อีกครั้ง';});
