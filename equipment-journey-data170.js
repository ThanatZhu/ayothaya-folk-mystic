import {ITEMS,DROPS,SHOPS,itemDef} from './items.js?v=tier167';
import {WEAPON_CLASSES,FAMILIES,LOOKS,TIERS,STARTER,GRADES as GEAR_GRADES,gearLook,weaponId,pieceId,bossId,familyName} from './gear-sets.js';
import {RECIPES} from './crafting.js?v=107';
import {MONSTER_TYPES} from './combat-core.js?v=novice174';
import {STORY,STARTER_WEAPON} from './story-quests.js';
import {WORLD_MAP_BOSSES} from './chapter2-monsters.js';
import {REFINE_MAX,REFINE_TIERS} from './refine-tiers.js';
import {AMULET_REWARDS,AMULET_PRICE,AMULET_PITY} from './amulets.js';
export {ITEMS,RECIPES,REFINE_MAX,REFINE_TIERS,WORLD_MAP_BOSSES};
export const CLASSES=[{id:'novice',name:'ผู้ฝึกตน'},...WEAPON_CLASSES.map(([id])=>({id,name:{swordsman:'นักดาบ',lancer:'นักทวน',hunter:'นายพราน',boxer:'นักมวย',rogue:'จอมโจร',shaman:'หมอผี',acolyte:'พระ / แม่ชี'}[id]}))];
export const SLOTS={weapon:'อาวุธ',armor:'เสื้อเกราะ',head:'หมวก',garment:'ผ้าคลุม',shoes:'รองเท้า',accessory:'เครื่องประดับ'};
// 0.117 grades (frame colours) of one piece; the tier is the set level (ขั้น 1–6)
export const GRADES=GEAR_GRADES;
export {FAMILIES,familyName};
export const CHAPTERS=[
 {id:'start',min:1,max:9,title:'ชุดเริ่มต้น',place:'อยุธยา · โรงตีอาวุธครูแสนดาบ',image:'assets/landing98/rice-fields.webp',intro:'ผู้ฝึกตนใช้ชุดเริ่มต้น 5 ชิ้นจากร้านครูแสนดาบ ยังไม่มีเซ็ท พอถึง Lv.10 ค่อยเริ่มเก็บชุดขั้น 1',steps:['ทำเควสแรกเพื่อรับผ้าพันหมัดผู้ฝึกตน','ซื้อผ้าคาดหัว เสื้อ ผ้าพาดบ่า และรองเท้าแตะจากครูแสนดาบ','ฝึก Job 10 ให้ตันแล้วเลือกอาชีพ จะได้อาวุธขั้น 1 ของอาชีพจากเควส'],focus:STARTER},
 {id:'tier-1',tier:1,min:10,max:24,title:'ชุดขั้น 1',place:'ทุ่งขวัญข้าวและสวนหมาก',image:'assets/landing98/rice-fields.webp',intro:'ของขั้น 1 ใส่ได้ตั้งแต่ Lv.10 หมวก ผ้าคลุม และรองเท้าดรอปจากมอน Lv.5–24 เสื้อดรอปจากบอสของแมพ อาวุธคราฟที่ครูแสนดาบ',steps:['เลือกสายเซ็ทจาก 5 สาย แล้วเก็บให้ครบ 2 หรือ 4 ชิ้นเพื่อเปิดโบนัส','ล่าบอสของแมพเพื่อเสื้อ และสะสมวัตถุดิบแมพไปคราฟอาวุธ','ชิ้นเดิมสุ่มได้ 5 เกรด เกรดสูงค่าพื้นฐานสูงกว่า ส่วนโบนัสเซ็ทเท่ากันทุกเกรด']},
 {id:'tier-2',tier:2,min:25,max:39,title:'ชุดขั้น 2',place:'โรงสีและบึงบัว',image:'assets/landing98/moonlit-mill.webp',intro:'ของขั้น 2 ใส่ได้ตั้งแต่ Lv.25 หมวก ผ้าคลุม และรองเท้าดรอปจากมอน Lv.25–35 เสื้อดรอปจากบอสของแมพ อาวุธคราฟที่ครูแสนดาบ',steps:['เลือกสายเซ็ทจาก 5 สาย แล้วเก็บให้ครบ 2 หรือ 4 ชิ้นเพื่อเปิดโบนัส','ล่าบอสของแมพเพื่อเสื้อ และสะสมวัตถุดิบแมพไปคราฟอาวุธ','ชิ้นเดิมสุ่มได้ 5 เกรด เกรดสูงค่าพื้นฐานสูงกว่า ส่วนโบนัสเซ็ทเท่ากันทุกเกรด']},
 {id:'tier-3',tier:3,min:40,max:54,title:'ชุดขั้น 3',place:'ป่าไผ่ผีปอบและวัดร้าง',image:'assets/loading105/bamboo-grove.webp',intro:'ของขั้น 3 ใส่ได้ตั้งแต่ Lv.40 หมวก ผ้าคลุม และรองเท้าดรอปจากมอน Lv.36–56 เสื้อดรอปจากบอสของแมพ อาวุธคราฟที่ครูแสนดาบ',steps:['เลือกสายเซ็ทจาก 5 สาย แล้วเก็บให้ครบ 2 หรือ 4 ชิ้นเพื่อเปิดโบนัส','ล่าบอสของแมพเพื่อเสื้อ และสะสมวัตถุดิบแมพไปคราฟอาวุธ','ชิ้นเดิมสุ่มได้ 5 เกรด เกรดสูงค่าพื้นฐานสูงกว่า ส่วนโบนัสเซ็ทเท่ากันทุกเกรด']},
 {id:'tier-4',tier:4,min:55,max:69,title:'ชุดขั้น 4',place:'ชายป่าหิมพานต์',image:'assets/loading105/himmapan-edge.webp',intro:'ของขั้น 4 ใส่ได้ตั้งแต่ Lv.55 หมวก ผ้าคลุม และรองเท้าดรอปจากมอน Lv.57–71 เสื้อดรอปจากบอสของแมพ อาวุธคราฟที่ครูแสนดาบ',steps:['เลือกสายเซ็ทจาก 5 สาย แล้วเก็บให้ครบ 2 หรือ 4 ชิ้นเพื่อเปิดโบนัส','ล่าบอสของแมพเพื่อเสื้อ และสะสมวัตถุดิบแมพไปคราฟอาวุธ','ชิ้นเดิมสุ่มได้ 5 เกรด เกรดสูงค่าพื้นฐานสูงกว่า ส่วนโบนัสเซ็ทเท่ากันทุกเกรด']},
 {id:'tier-5',tier:5,min:70,max:84,title:'ชุดขั้น 5',place:'ถ้ำพญานาค',image:'assets/loading105/naga-cave.webp',intro:'ของขั้น 5 ใส่ได้ตั้งแต่ Lv.70 หมวก ผ้าคลุม และรองเท้าดรอปจากมอน Lv.72–86 เสื้อดรอปจากบอสของแมพ อาวุธคราฟที่ครูแสนดาบ',steps:['เลือกสายเซ็ทจาก 5 สาย แล้วเก็บให้ครบ 2 หรือ 4 ชิ้นเพื่อเปิดโบนัส','ล่าบอสของแมพเพื่อเสื้อ และสะสมวัตถุดิบแมพไปคราฟอาวุธ','ชิ้นเดิมสุ่มได้ 5 เกรด เกรดสูงค่าพื้นฐานสูงกว่า ส่วนโบนัสเซ็ทเท่ากันทุกเกรด']},
 {id:'tier-6',tier:6,min:85,max:99,title:'ชุดขั้น 6',place:'ยอดเขาไกรลาส',image:'assets/loading105/kailash-peak.webp',intro:'ของขั้น 6 ใส่ได้ตั้งแต่ Lv.85 หมวก ผ้าคลุม และรองเท้าดรอปจากมอน Lv.87–99 เสื้อดรอปจากบอสของแมพ อาวุธคราฟที่ครูแสนดาบ',steps:['เลือกสายเซ็ทจาก 5 สาย แล้วเก็บให้ครบ 2 หรือ 4 ชิ้นเพื่อเปิดโบนัส','ล่าบอสของแมพเพื่อเสื้อ และสะสมวัตถุดิบแมพไปคราฟอาวุธ','ชิ้นเดิมสุ่มได้ 5 เกรด เกรดสูงค่าพื้นฐานสูงกว่า ส่วนโบนัสเซ็ทเท่ากันทุกเกรด']},
];
const monsterById=new Map(MONSTER_TYPES.map((m,i)=>[m.id,{...m,index:i}]));
export const levelChapter=level=>CHAPTERS.find(c=>level>=c.min&&level<=c.max)??CHAPTERS[0];
export function cardSlots(it){return it?.kind==='gear'&&it.slots!==0&&['weapon','armor','accessory'].includes(it.slot)?1:0;}
export function fitsClass(it,classId){if(it.look)return classId==='novice'||[gearLook(classId,'male'),gearLook(classId,'female')].includes(it.look);return !it.classes||it.classes.includes(classId);}
export function chapterGear(chapter,classId){return Object.entries(ITEMS).filter(([,it])=>it.kind==='gear'&&fitsClass(it,classId)&&(it.level??1)>=chapter.min&&(it.level??1)<=chapter.max).map(([id,it])=>({id,...it}));}
export function featuredGear(chapter,classId){
 if(!chapter.tier)return (chapter.focus??[]).filter(id=>ITEMS[id]&&fitsClass(ITEMS[id],classId)).map(id=>({id,...ITEMS[id]}));
 const look=gearLook(classId,'male')??'swordsman',ids=[...(classId==='novice'?[]:[weaponId(classId,chapter.tier)]),...FAMILIES.map(f=>pieceId(f.key,'armor',look,chapter.tier))];
 return ids.filter(id=>ITEMS[id]).map(id=>({id,...ITEMS[id]}));
}
// Boss-set pieces for a class (both acolyte looks).
export function bossGear(classId){
 const looks=classId==='novice'?[]:[...new Set([gearLook(classId,'male'),gearLook(classId,'female')])];
 return [...(classId==='novice'?[]:[bossId('weapon',classId)]),...looks.flatMap(l=>['head','armor','garment','shoes'].map(s=>bossId(s,l)))].filter(id=>ITEMS[id]);
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
  const quest=STORY.flatMap(q=>(q.reward?.items??[]).filter(i=>i.id===id||(i.id==='@weapon'&&(q.id==='t1'?id===STARTER_WEAPON.novice:q.id==='t17'&&id!==STARTER_WEAPON.novice&&Object.values(STARTER_WEAPON).includes(id)))||(i.id==='@armor'&&ITEMS[id]?.slot==='armor'&&ITEMS[id].set?.family==='wall'&&ITEMS[id].set.tier===2)).map(i=>({id:q.id,title:q.title,count:i.count,steps:q.steps.map(s=>({npc:s.npc,mapId:s.mapId,mapName:mapById.get(s.mapId)?.name,action:s.action,level:s.level,hint:s.hint}))})));
  const it=itemDef(id);if(it?.set)drop.push(...Object.entries(DROPS).filter(([,d])=>d.sets?.tier===it.set.tier&&(it.slot==='armor'?d.sets.armor:d.sets.piece)).map(([monster,d])=>({monster,name:monsterById.get(monster)?.name??monster,level:monsterById.get(monster)?.level??1,chance:it.slot==='armor'?d.sets.armor/5:d.sets.piece/15,count:1,maps:monsterMaps(monster),boss:!!(monsterById.get(monster)?.boss||monsterById.get(monster)?.elite),worldBoss:!!monsterById.get(monster)?.worldBoss,respawn:monsterById.get(monster)?.respawn??null})));
  const recipe=RECIPES.find(r=>r.out===id)??null;
  const gacha=AMULET_REWARDS.filter(r=>r.id===id).map(r=>({pool:'amulets',chance:r.rate,count:r.count,price:AMULET_PRICE,pity:AMULET_PITY}));
  return {shop,drop,quest,recipe,gacha};
 }
 function recipeDetails(id){const r=RECIPES.find(r=>r.out===id);return r?{...r,needs:Object.entries(r.needs).map(([id,count])=>({id,name:itemDef(id)?.name??id,count,sources:sources(id)}))}:null;}
 return {sources,recipeDetails,monsterMaps,mapName:id=>mapById.get(id)?.name??id};
}
export function searchItems({classId,query='',kind='all',allClasses=false}){
 const q=query.trim().toLocaleLowerCase('th');
 return Object.entries(ITEMS).filter(([id,it])=>['gear','card','loot','refine'].includes(it.kind)&&(allClasses||fitsClass(it,classId))&&(kind==='all'||(kind==='material'?['loot','refine'].includes(it.kind):it.kind===kind))&&(!q||[id,it.name,itemEffects(it),SLOTS[it.slot]??'',it.set?'ชุด'+familyName(it.set.family):'',...(it.classes??[]).map(c=>CLASSES.find(x=>x.id===c)?.name??c)].join(' ').toLocaleLowerCase('th').includes(q))).map(([id,it])=>({id,...it}));
}
