import {ITEMS,DROPS,SHOPS,GEAR_CLASSES,itemDef} from './items.js?v=tier167';
import {RECIPES} from './crafting.js?v=107';
import {MONSTER_TYPES} from './combat-core.js?v=novice174';
import {STORY,STARTER_WEAPON} from './story-quests.js';
import {WORLD_MAP_BOSSES} from './chapter2-monsters.js';
import {REFINE_MAX,REFINE_TIERS} from './refine-tiers.js';
export {ITEMS,RECIPES,REFINE_MAX,REFINE_TIERS,WORLD_MAP_BOSSES};
export const CLASSES=GEAR_CLASSES.map(c=>({id:c[0],name:c[8]}));
export const SLOTS={weapon:'อาวุธ',armor:'เสื้อเกราะ',head:'หมวก',garment:'ผ้าคลุม',shoes:'รองเท้า',accessory:'เครื่องประดับ'};
export const GRADES={common:'สามัญ',fine:'ชั้นดี',elite:'ชั้นเอก'};
export const CHAPTERS=[
 {id:'first',min:1,max:14,title:'อาวุธชิ้นแรก',place:'อยุธยาและทุ่งขวัญข้าว',image:'assets/landing98/rice-fields.webp',intro:'เริ่มจากของที่เควสให้ แล้วค่อยเติมเกราะและเครื่องประดับจากร้านในเมือง',steps:['ทำเควส คืนที่ประทีปดับ เพื่อรับผ้าพันมือฝึกหัด และทำ ถืออาวุธให้มั่น เพื่อรับเสื้อผ้าฝ้ายทอหนา','ผู้ฝึกตน Job 10 ไปเปลี่ยนอาชีพที่ลานครู เควส เส้นทางอาชีพ ให้อาวุธเริ่มต้นของอาชีพใหม่','เควส หนูในยุ้งข้าว ให้แร่เหล็ก 2 ชิ้น และ เหล็กน้ำพี้ ให้การ์ดหนูยุ้งข้าวหลังทดลองตีบวก'],next:'ใส่ของให้ครบช่องที่หาได้ ลองตีบวก +1–+4 แล้วเตรียมเงินสำหรับอาวุธ Lv.15',story:['t1','t2','t7','t8'],focus:['vest-cotton','hat-headband','shoes-woven','card-rat']},
 {id:'grow',min:15,max:24,title:'เตรียมตัวก่อนลงโรงสี',place:'สวนหมากคลองเก่าและโรงสีใต้เงาจันทร์',image:'assets/landing98/moonlit-mill.webp',intro:'อาวุธ Lv.15 ซื้อได้แน่นอนจากครูแสนดาบ ส่วนของบอสเป็นทางเลือกเสริม',steps:['เปลี่ยนอาวุธประจำอาชีพเป็นรุ่น Lv.15 ที่โรงตีอาวุธในอยุธยา','เติมเสื้อเกราะหนังควาย งอบ ผ้าคลุม และรองเท้าตามเลเวลกับค่าสเตตัสที่ต้องการ','เควส โรงสีใต้เงาจันทร์ ให้ยันต์กันแตก และ ใต้ถุนโรงสี ให้เหล็กไหล เก็บไว้ใช้กับการตีบวกขั้นเสี่ยง'],next:'เก็บเบี้ยเพื่อซื้ออาวุธ Lv.25 หรือชวนปาร์ตี้ลงใต้ถุนโรงสี',story:['t15','t16'],focus:['vest-buffalo','hat-ngob','cloak-yant','shoes-buffalo','spirit-lamp']},
 {id:'forge',min:25,max:34,title:'ซื้อของหลัก ล่าของเสริม',place:'โรงสี บึงบัว และดันเจี้ยนใต้ถุนโรงสี',image:'assets/story124/lotus-thread.webp',intro:'รุ่น Lv.25 มีทางซื้อจากร้าน ของดันเจี้ยนช่วยเพิ่มทางเลือกโดยไม่ต้องรอดรอปทุกชิ้น',steps:['ซื้ออาวุธ Lv.25 จากครูแสนดาบได้โดยตรง ถ้ามีเบี้ยครบ','เจ้าโคมวิญญาณในใต้ถุนโรงสีมีอาวุธ Lv.25 และ Lv.35 ในตารางดรอป ส่วนเจ้าหุ่นฟางพันเชือกมีของ Lv.25','ทำเควส พญาวานรบึง เพื่อรับเสื้อเกราะถักโซ่ทอง รางวัลเควสนี้ได้รับแน่นอนเมื่อทำสำเร็จ'],next:'เลือกชิ้นที่ใช้ได้นานก่อนลงทุนตีบวกสูง แล้วค่อยไปล่าอาวุธ Lv.35',story:['t21'],focus:['vest-chain','vest-lacquer','hat-ricecrown','spirit-lamp']},
 {id:'boss',min:35,max:44,title:'อาวุธบอสก่อนชุดครุฑ',place:'ใต้ถุนโรงสีและ MVP ราชาหุ่นฟางเพลิง',image:'assets/story124/moonlit-mill.webp',intro:'อาวุธรุ่น Lv.35 เป็นของสุ่มจากบอส ส่วนชุดครุฑเริ่มใส่ได้ที่ Lv.45',steps:['อาวุธ Lv.35 หาได้จากเจ้าโคมวิญญาณในดันเจี้ยน หรือราชาหุ่นฟางเพลิงในโรงสี','เกราะเกล็ดนาคและจี้ถ่านเพลิงราชามาจากราชาหุ่นฟางเพลิง เลือกตามบิลด์และของที่มี','เริ่มสะสมเหล็กไหล แร่เหล็ก และศิลาแลง เพื่อเตรียมคราฟชุดช่วงถัดไป'],next:'ถึง Lv.45 ไปเมืองลับแล ซื้อชิ้นสามัญของชุดครุฑได้เลย ไม่จำเป็นต้องรอบอส',focus:['vest-naga','ember-amulet','seal-marsh']},
 {id:'krut',min:45,max:59,bracket:'krut',title:'ชุดครุฑ',place:'ร้านช่างตีบวกขั้นสูงในเมืองลับแล',image:'assets/loading105/lablae.webp',intro:'มีเส้นทางซื้อสามัญ → คราฟชั้นดี และอีกทางคือล่าบอสเพื่อชั้นเอก',steps:['ซื้อชิ้นสามัญของชุดครุฑจากช่างตีบวกขั้นสูงที่เมืองลับแล','คราฟชั้นดีจากชิ้นสามัญ 1 ชิ้น + เหล็กไหล 2 ชิ้น + แร่หรือศิลาแลง 5 ชิ้น และเบี้ยตามสูตร','ชั้นเอกไม่มีสูตรคราฟในระบบปัจจุบัน ดูรายชื่อบอสที่ดรอปจากปุ่มของแต่ละชิ้น'],next:'ชั้นดีเป็นทางอัปเกรดที่ทำเองได้ ส่วนชั้นเอกเหมาะกับการเก็บชิ้นหลักระยะยาวก่อนชุด Lv.60',focus:['seal-bamboo','seal-temple']},
 {id:'kotcha',min:60,max:79,bracket:'kotcha',title:'ชุดคชสีห์',place:'เมืองลับแลและบอสช่วงกลาง–ปลายเกม',image:'assets/loading105/himmapan-edge.webp',intro:'ขยับฐานอุปกรณ์เป็น Lv.60 แล้วค่อยเลือกว่าจะฟาร์มชั้นดีหรือชั้นเอก',steps:['ซื้อคชสีห์สามัญจากร้านเดิมในเมืองลับแล','สูตรชั้นดีใช้ชิ้นสามัญ 1 ชิ้น + เหล็กไหล 4 ชิ้น + แร่หรือศิลาแลง 5 ชิ้น และเบี้ยตามสูตร','ชั้นเอกมาจากร่างทรงวานรเจ้าเล่ห์ และบอสแมพที่มีของคชสีห์ในตารางดรอป'],next:'สะสมของสำหรับชุดหิมพานต์ Lv.80 และเลือกการ์ดให้ตรงกับศัตรูที่ฟาร์ม',focus:['seal-himmapan']},
 {id:'himma',min:80,max:99,bracket:'himma',title:'ชุดหิมพานต์และเป้าหมายเอ็นเกม',place:'บอสร่างทรง ถ้ำพญานาค และยอดเขาไกรลาส',image:'assets/loading105/kailash-peak.webp',intro:'หิมพานต์ Lv.80 คือช่วงชุดหลักสูงสุดที่มีอยู่ตอนนี้ เลเวล 99 เพิ่มเป้าหมายเครื่องประดับและการพัฒนาบิลด์',steps:['ซื้อหิมพานต์สามัญได้ที่ลับแล หรือคราฟชั้นดีด้วยชิ้นสามัญ + เหล็กไหล 6 ชิ้น + แร่หรือศิลาแลง 5 ชิ้น','ฟาร์มหิมพานต์ชั้นเอกจากร่างทรงเจ้าหุ่นฟางพันเชือก ร่างทรงพญาวานรบึง และบอสแมพปลายเกมที่ระบุในแหล่งดรอป','เสริมเครื่องประดับตรานาค Lv.85 หรือตรายักษ์เมฆา Lv.99 ตามบิลด์ แล้วค่อยลงทุนการ์ดและตีบวกชิ้นที่ตั้งใจใช้ต่อ'],next:'เป้าหมายระยะยาว: ชิ้นหลักชั้นเอก การ์ดตรงบิลด์ ตีบวกถึง +20 และจุติ ไม่มีชุดอาวุธ Lv.99 แยกอีกชุดในข้อมูลปัจจุบัน',focus:['seal-naga','seal-kailash']}
];
const monsterById=new Map(MONSTER_TYPES.map((m,i)=>[m.id,{...m,index:i}]));
export const levelChapter=level=>CHAPTERS.find(c=>level>=c.min&&level<=c.max)??CHAPTERS[0];
export function cardSlots(it){return it?.kind==='gear'&&it.slots!==0&&['weapon','armor','accessory'].includes(it.slot)?1:0;}
export function fitsClass(it,classId){return !it.classes||it.classes.includes(classId);}
export function chapterGear(chapter,classId){return Object.entries(ITEMS).filter(([,it])=>it.kind==='gear'&&fitsClass(it,classId)&&(it.level??1)>=chapter.min&&(it.level??1)<=chapter.max).map(([id,it])=>({id,...it}));}
export function featuredGear(chapter,classId){
 const rows=chapterGear(chapter,classId),weapon=rows.filter(i=>i.slot==='weapon'&&(chapter.bracket?i.bracket===chapter.bracket:i.classes?.includes(classId))).sort((a,b)=>(b.level??1)-(a.level??1)||(a.rarity??0)-(b.rarity??0));
 const chosen=chapter.bracket?['common','fine','elite'].map(t=>weapon.find(i=>i.tier===t)).filter(Boolean):weapon.slice(0,1);
 if(chapter.bracket){const armor=rows.find(i=>i.slot==='armor'&&i.bracket===chapter.bracket&&i.tier==='elite');if(armor)chosen.push(armor);}
 for(const id of chapter.focus??[])if(ITEMS[id]&&fitsClass(ITEMS[id],classId))chosen.push({id,...ITEMS[id]});
 return [...new Map(chosen.map(i=>[i.id,i])).values()];
}
export function itemEffects(it){
 if(it.kind!=='card')return [...['atk','matk','def','mdef'].filter(k=>it[k]).map(k=>`${k.toUpperCase()} +${it[k]}`),...Object.entries(it.bonus??{}).map(([k,n])=>`${k.toUpperCase()} +${n}`)].join(' · ')||it.text||'ไม่มีโบนัสสเตตัส';
 const e=it.effect??{},parts=Object.entries(e.bonus??{}).map(([k,n])=>`${k.toUpperCase()} +${n}`),labels={atkPct:'ATK',hpPct:'HP',crit:'คริติคอล',delay:'ลดดีเลย์โจมตี',flee:'หลบ',coinPct:'เบี้ยดรอป'};
 for(const [key,label]of Object.entries(labels))if(e[key])parts.push(`${label} +${+(e[key]*100).toFixed(2)}%`);
 if(e.def)parts.push('DEF +'+e.def);
 const elements={neutral:'ไร้ธาตุ',fire:'ไฟ',water:'น้ำ',wind:'ลม',earth:'ดิน',ghost:'ผี',holy:'ศักดิ์สิทธิ์',dark:'มืด',poison:'พิษ'},sizes={small:'เล็ก',medium:'กลาง',large:'ใหญ่'};
 for(const [key,label]of [['vsElement','ดาเมจต่อธาตุ'],['vsSize','ดาเมจต่อขนาด'],['resist','ต้านธาตุ']])for(const [type,value]of Object.entries(e[key]??{}))parts.push(`${label}${elements[type]??sizes[type]??type} +${+(value*100).toFixed(2)}%`);
 return parts.join(' · ')||it.text||'ไม่มีเอฟเฟกต์';
}
export function createItemGuide(catalog){
 const mapById=new Map(catalog.maps.map(m=>[m.id,m]));
 function monsterMaps(id){const m=monsterById.get(id);if(!m)return [];return catalog.maps.filter(map=>map.mobs?.some(spawn=>spawn[2]===m.index)).map(map=>({id:map.id,name:map.name,instance:!!map.instance}));}
 function sources(id){
  const shop=Object.entries(SHOPS).filter(([,s])=>s.stock.includes(id)).map(([npc,s])=>({npc,title:s.title,mapId:s.mapId,mapName:mapById.get(s.mapId)?.name??s.mapId,currency:s.currency??'coins',price:s.currency?ITEMS[id]?.tokens:ITEMS[id]?.buy}));
  const drop=Object.entries(DROPS).flatMap(([monster,def])=>def.items.filter(([item,chance])=>item===id&&chance>0).map(([,chance,count=1])=>({monster,name:monsterById.get(monster)?.name??monster,level:monsterById.get(monster)?.level??1,chance,count,maps:monsterMaps(monster),boss:!!(monsterById.get(monster)?.boss||monsterById.get(monster)?.elite),worldBoss:!!monsterById.get(monster)?.worldBoss,respawn:monsterById.get(monster)?.respawn??null}))).sort((a,b)=>Number(a.boss)-Number(b.boss)||a.level-b.level||b.chance-a.chance);
  const quest=STORY.flatMap(q=>(q.reward?.items??[]).filter(i=>i.id===id||(i.id==='@weapon'&&(q.id==='t1'?id===STARTER_WEAPON.novice:q.id==='t17'&&id!==STARTER_WEAPON.novice&&Object.values(STARTER_WEAPON).includes(id)))).map(i=>({id:q.id,title:q.title,count:i.count,steps:q.steps.map(s=>({npc:s.npc,mapId:s.mapId,mapName:mapById.get(s.mapId)?.name,action:s.action,level:s.level,hint:s.hint}))})));
  const recipe=RECIPES.find(r=>r.out===id)??null;
  return {shop,drop,quest,recipe};
 }
 function recipeDetails(id){const r=RECIPES.find(r=>r.out===id);return r?{...r,needs:Object.entries(r.needs).map(([id,count])=>({id,name:ITEMS[id]?.name??id,count,sources:sources(id)}))}:null;}
 return {sources,recipeDetails,monsterMaps,mapName:id=>mapById.get(id)?.name??id};
}
export function searchItems({classId,query='',kind='all',allClasses=false}){
 const q=query.trim().toLocaleLowerCase('th');
 return Object.entries(ITEMS).filter(([id,it])=>['gear','card','loot','refine'].includes(it.kind)&&(allClasses||fitsClass(it,classId))&&(kind==='all'||(kind==='material'?['loot','refine'].includes(it.kind):it.kind===kind))&&(!q||[id,it.name,itemEffects(it),SLOTS[it.slot]??'',GRADES[it.tier]??'',...(it.classes??[]).map(c=>CLASSES.find(x=>x.id===c)?.name??c)].join(' ').toLocaleLowerCase('th').includes(q))).map(([id,it])=>({id,...it}));
}
