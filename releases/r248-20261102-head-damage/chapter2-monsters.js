// Append-only content: never renumber the existing monster catalog.
// 0.123 owner: map levels step up from ทุ่งขวัญข้าว Lv.10–22 (maps/world.json levels); world bosses and chapter-2 monsters moved with them.
export const WORLD_BOSS_RESPAWN=3600;
export const WORLD_MAP_BOSSES=[
 ['rice-fields','ทุ่งขวัญข้าว',10,22,'rice-world-guardian','ขุนฟางพิทักษ์นา',3.5,'rice'],
 ['old-orchard','สวนหมากคลองเก่า',20,30,'orchard-world-guardian','พญาวานรหมากทอง',3.8,'orchard'],
 ['moonlit-mill','โรงสีใต้เงาจันทร์',28,38,'mill-world-guardian','อสุรโรงสีจันทรา',4.1,'mill'],
 ['lotus-marsh','บึงบัวต้องมนตร์',38,48,'marsh-world-guardian','พญาเต่าบัวทมิฬ',4.1,'marsh'],
 ['bamboo-grove','ป่าไผ่ผีปอบ',46,58,'pop-grove-lord','ปอบเจ้าดง',4.1,'bamboo'],
 ['ruined-temple','วัดร้างริมกรุงเก่า',56,68,'abandoned-bell-curse','อาถรรพ์ระฆังร้าง',4,'temple'],
 ['himmapan-edge','ชายป่าหิมพานต์',66,78,'woodland-elephant','คชสารพฤกษ์',4.35,'himmapan'],
 ['naga-cave','ถ้ำพญานาค',76,88,'underwater-naga-guardian','นาคพิทักษ์บาดาล',4.4,'naga'],
 ['kailash-peak','ยอดเขาไกรลาส',86,99,'cloud-peak-yaksha','ยักษ์เมฆาคุ้มขุนเขา',4.45,'kailash']
].map(([mapId,mapName,minLevel,level,id,name,height,key],i)=>({mapId,mapName,minLevel,level,id,name,height,key,order:i+1,hp:500000*(i+1),respawn:WORLD_BOSS_RESPAWN,material:'relic-'+key,accessory:'seal-'+key}));
const rows=[
 ['bamboo-sprout','หน่อไผ่หลง',46,1.35,'earth','bamboo-grove'],
 ['hungry-pop','ปอบหิวโหย',50,1.85,'ghost','bamboo-grove'],
 ['bamboo-bat','ค้างคาวใบไผ่',54,1.2,'wind','bamboo-grove'],
 ['bamboo-ward','หุ่นไผ่อาคม',57,2.65,'earth','bamboo-grove',true],
 ['pop-grove-lord','ปอบเจ้าดง',58,4.1,'ghost','bamboo-grove'],
 ['clay-temple-doll','ตุ๊กตาดินเฝ้าวัด',56,1.15,'earth','ruined-temple'],
 ['haunted-bell','ระฆังผี',60,1.3,'ghost','ruined-temple'],
 ['walking-bricks','กองอิฐเดินได้',64,1.55,'earth','ruined-temple'],
 ['stone-gate-guardian','ยักษ์ศิลาเฝ้าประตู',67,2.65,'earth','ruined-temple',true],
 ['abandoned-bell-curse','อาถรรพ์ระฆังร้าง',68,4,'ghost','ruined-temple'],
 ['mist-cap','เห็ดลายหมอก',67,1.1,'earth','himmapan-edge'],
 ['crystal-tusk-boar','หมูป่าเขาแก้ว',70,1.65,'earth','himmapan-edge'],
 ['leaf-flame-bird','นกเปลวใบไม้',74,1.2,'fire','himmapan-edge'],
 ['vine-tiger','เสือเถาวัลย์',76,2.7,'earth','himmapan-edge',true],
 ['woodland-elephant','คชสารพฤกษ์',78,4.35,'earth','himmapan-edge'],
 ['cave-crystal-toad','อึ่งแก้วถ้ำ',77,1.15,'water','naga-cave'],
 ['jade-scale-hatchling','ลูกงูเกล็ดหยก',80,1.25,'water','naga-cave'],
 ['glowstone-crab','ปูหินเรืองแสง',84,1.2,'water','naga-cave'],
 ['stream-serpent','อสรพิษเฝ้าธาร',86,2.7,'water','naga-cave',true],
 ['underwater-naga-guardian','นาคพิทักษ์บาดาล',88,4.4,'water','naga-cave'],
 ['stone-mist-hare','กระต่ายหมอกศิลา',87,1.15,'earth','kailash-peak'],
 ['wind-mountain-bird','ปักษาวายุ',90,1.4,'wind','kailash-peak'],
 ['crystal-horn-goat','แพะเขาผลึก',94,1.8,'earth','kailash-peak'],
 ['stone-garuda','ครุฑศิลาฝึกศึก',97,2.85,'wind','kailash-peak',true],
 ['cloud-peak-yaksha','ยักษ์เมฆาคุ้มขุนเขา',99,4.45,'wind','kailash-peak'],
 ...WORLD_MAP_BOSSES.slice(0,4).map(b=>[b.id,b.name,b.level,b.height,b.key==='marsh'?'water':b.key==='mill'?'ghost':'earth',b.mapId])
];
export const CHAPTER2_MONSTERS=rows.map(([id,name,level,height,element,mapId,elite=false])=>{
 const b=WORLD_MAP_BOSSES.find(b=>b.id===id),boss=!!b,hp=Math.round((500+level*level*.65)*(elite?3.5:1));
 return {id,name,level,height,bodyHeight:height,element,mapId,chapter2Art:id,hp:b?.hp??hp,
  speed:boss?.85:elite?1.1:1.25,damage:boss?45+b.order*29:Math.round(level*(elite?2.2:1.3)),
  baseXp:boss?2500*b.order:Math.round(level*level*.12*(elite?3:1)),
  jobXp:boss?1500*b.order:Math.round(level*level*.075*(elite?3:1)),
  respawn:boss?WORLD_BOSS_RESPAWN:elite?90:20,reach:boss?2.8:elite?1.8:1.35,
  windup:boss?1.1:elite?.8:.55,...(boss?{boss:true,worldBoss:true}:elite?{elite:true}:{}),
  ...(['haunted-bell','abandoned-bell-curse','underwater-naga-guardian'].includes(id)?{magic:true}:{})};
});
const slam=(order)=>({radius:3.5+order*.15,push:2.5,power:1.25,pct:.06+order*.004,hits:10,cd:9,windup:1.25});
export const CHAPTER2_BEHAVIOUR=Object.fromEntries(CHAPTER2_MONSTERS.map(t=>{
 const b=WORLD_MAP_BOSSES.find(b=>b.id===t.id);
 const v=b?{aoe:2.8+b.order*.12,enrage:true,windup:1.1,slam:slam(b.order)}:t.elite?{enrage:true}:{};
 if(['bamboo-bat','leaf-flame-bird','wind-mountain-bird','hungry-pop','vine-tiger'].includes(t.id))v.skirmish=1;
 if(['crystal-tusk-boar','vine-tiger','cave-crystal-toad','stone-mist-hare','crystal-horn-goat'].includes(t.id))v.leap=true;
 if(['haunted-bell','mist-cap','stream-serpent'].includes(t.id))Object.assign(v,{aoe:2.2,windup:.85});
 return [t.id,v];
}));
