import {patch,patchDrops} from './balance.js';
import {REFINE_MAX,refineTier,refinePercent,gearStatText} from './refine-tiers.js';
import {WORLD_DROP_ITEMS,WORLD_CARD_ATLASES,chapter2Drops} from './chapter2-loot.js';
import {buildGearItems,setDrops,shardDrop,rollSetPiece,gradeItem} from './gear-sets.js';
import {FRONTIER_MONSTERS} from './monster-catalog.js';
// Items, loot, coins (เบี้ย) and NPC shops. Pure rules shared by the client (offline guests + UI) and the realm
// server (authoritative online bag). Bag state: {coins, items:{[id]:count}}.
// Art: one atlas, 6x4 cells of 256 px (1536x1024, transparent). Drop a finished file over the same path to re-skin.
export const ITEM_ATLAS='assets/items42/items.png',GEAR_ATLAS='assets/gear43/gear.png',REFINE_ATLAS='assets/refine44/refine.png';
export const CARD_ATLAS='assets/cards45/cards.png',SOCIAL_ATLAS='assets/social46/social.png',EMBLEM_ATLAS='assets/emblems47/emblems.png',EMOTE_ATLAS='assets/emotes48/emotes.png',ITEMS48_ATLAS='assets/items48/items.png';
export const GEAR85_ATLAS='assets/gear85/gear.svg';
export const ATLASES={gear85:GEAR85_ATLAS,gear:GEAR_ATLAS,refine:REFINE_ATLAS,cards:CARD_ATLAS,social:SOCIAL_ATLAS,emblems:EMBLEM_ATLAS,emotes:EMOTE_ATLAS,items48:ITEMS48_ATLAS,gear104w:'assets/gear104/weapons.png',gear104a:'assets/gear104/armor.png',gear106a:'assets/gear106/head-garment.png',gear106b:'assets/gear106/shoes.png'}; // item.atlas key → file (default ITEM_ATLAS)
ATLASES.world125='assets/monsters-chapter2/world-drops-v1.png';
Object.assign(ATLASES,WORLD_CARD_ATLASES);
// Cards reuse each creature's authored 4x2 sheet; other item atlases remain 6x4.
export const ATLAS_LAYOUTS=Object.fromEntries(Object.keys(WORLD_CARD_ATLASES).map(key=>[key,{columns:4,rows:2}]));
export const BAG_SLOTS=40,MAX_STACK=999,MAX_COINS=9999999;
// 0.109.6 bag expansion: each bag carries its own size (40 base, +10 per expansion at Mae Bua's, up to 100)
export const BAG_MAX=100,BAG_STEP=10;
export const bagCap=bag=>{const n=bag?.slots;return Number.isSafeInteger(n)?Math.min(BAG_MAX,Math.max(BAG_SLOTS,n)):BAG_SLOTS;};
export const expandCost=bag=>bagCap(bag)>=BAG_MAX?null:2000*((bagCap(bag)-BAG_SLOTS)/BAG_STEP+1);

// icon = atlas cell (row-major, 6 per row). kind: loot (sell only) · potion (usable) · ui (never in a bag).
export const ITEMS={
 'rename-card':{image:'assets/arena166/rename-card.webp',icon:0,name:'บัตรเปลี่ยนชื่อ',kind:'scroll',text:'ใช้เปลี่ยนชื่อตัวละคร 1 ครั้ง · ซื้อด้วยทองแท่ง 1,000 แท่ง · กดปากกาข้างชื่อ'},
 'straw-bundle':{icon:0,name:'ฟางมัดเรืองแสง',kind:'loot',sell:4,text:'ฟางจากหุ่นที่ขยับเอง ยังอุ่นเหมือนมีลมหายใจ'},
 'rat-tooth':{icon:1,name:'ฟันหนูยุ้ง',kind:'loot',sell:3,text:'ฟันคม ๆ ที่แทะเศษสายใยขวัญ'},
 'hopper-wing':{icon:2,name:'ปีกตั๊กแตนเกราะ',kind:'loot',sell:8,text:'ปีกแข็งเหมือนแผ่นทองเหลือง'},
 'rat-crown':{icon:3,name:'มงกุฎพญาหนู',kind:'loot',sell:300,text:'มงกุฎฟางถักของพญาหนูยุ้งข้าว'},
 'spirit-thread':{icon:4,name:'เศษสายใยขวัญ',kind:'loot',sell:60,text:'ด้ายเรืองแสงจากสายใยที่ขาด'},
 'rice-sheaf':{icon:5,name:'รวงข้าวขวัญ',kind:'loot',sell:15,text:'รวงข้าวที่แม่โพสพเคยอวยพร'},
 'betel-nut':{icon:6,name:'หมากที่ถูกฉก',kind:'loot',sell:14,text:'ลูกหมากที่ลูกลิงขโมยมาซ่อน'},
 'tough-vine':{icon:7,name:'เถาวัลย์เหนียว',kind:'loot',sell:18,text:'เถาวัลย์ที่เคยพันขาคนเดินสวน'},
 'lantern-paper':{icon:8,name:'กระดาษโคมเรืองแสง',kind:'loot',sell:24,text:'กระดาษโคมที่ยังจำแสงเดิมได้'},
 'monkey-bangle':{icon:9,name:'กำไลวานร',kind:'loot',sell:450,text:'กำไลทองที่วานรเจ้าเล่ห์สวมไว้'},
 'spirit-rope':{icon:10,name:'เชือกขวัญพันเกลียว',kind:'loot',sell:1200,text:'เชือกที่พันเจ้าหุ่นฟางไว้กับการรอคอย'},
 'palm-leaf':{icon:11,name:'ใบลานจารึก',kind:'loot',sell:90,text:'ใบลานจารึกชื่อคนที่ประทีปเคยส่องทางให้'},
 'hp-small':{icon:12,name:'ยาสมุนไพรแดง',kind:'potion',buy:25,sell:6,hp:60,text:'ฟื้น HP 60'},
 'hp-large':{icon:13,tokens:3,name:'ยาสมุนไพรแดงขวดใหญ่',kind:'potion',buy:90,sell:22,hp:180,text:'ฟื้น HP 180'},
 'ember-amulet':{atlas:'items48',icon:1,name:'จี้ถ่านเพลิงราชา',kind:'gear',slot:'accessory',atk:10,matk:10,bonus:{str:2,int:2},level:20,sell:3000,text:'ATK +10 · MATK +10 · STR/INT +2 · Lv.20 · ของ MVP'},
 'spirit-lamp':{atlas:'items48',icon:2,name:'ตะเกียงวิญญาณ',kind:'gear',slot:'accessory',matk:8,bonus:{int:3,dex:2},level:18,sell:1500,text:'MATK +8 · INT +3 · DEX +2 · Lv.18 · ของดันเจี้ยน'},
 'king-ember':{atlas:'items48',icon:3,name:'ถ่านเพลิงราชาหุ่นฟาง',kind:'loot',sell:1500,text:'รางวัลผู้ได้ MVP · ขายได้ราคาดี'},
 // 0.50 pets and the festival
 'pet-lure':{atlas:'items48',icon:4,name:'ข้าวเหนียวล่อสัตว์',kind:'loot',sell:75,retired:true,text:'ของจากระบบสัตว์เลี้ยงเดิมที่ยุติแล้ว · ขายคืนร้านค้าได้'},
 'pet-food':{atlas:'social',icon:19,name:'ข้าวคลุกปลา',kind:'loot',sell:5,retired:true,text:'ของจากระบบสัตว์เลี้ยงเดิมที่ยุติแล้ว · ขายคืนร้านค้าได้'},
 'egg-rat':{atlas:'items48',icon:5,name:'ไข่หนูยุ้งข้าว',kind:'loot',sell:50,retired:true,text:'ของจากระบบสัตว์เลี้ยงเดิมที่ยุติแล้ว · ขายคืนร้านค้าได้'},
 'egg-straw':{atlas:'items48',icon:6,name:'ไข่หุ่นฟางหลง',kind:'loot',sell:50,retired:true,text:'ของจากระบบสัตว์เลี้ยงเดิมที่ยุติแล้ว · ขายคืนร้านค้าได้'},
 'egg-hopper':{atlas:'items48',icon:7,name:'ไข่ตั๊กแตนเกราะ',kind:'loot',sell:50,retired:true,text:'ของจากระบบสัตว์เลี้ยงเดิมที่ยุติแล้ว · ขายคืนร้านค้าได้'},
 'egg-monkey':{atlas:'items48',icon:8,name:'ไข่ลูกลิงฉกของ',kind:'loot',sell:50,retired:true,text:'ของจากระบบสัตว์เลี้ยงเดิมที่ยุติแล้ว · ขายคืนร้านค้าได้'},
 'event-token':{atlas:'social',icon:23,name:'เหรียญงานวัด',kind:'loot',text:'ได้จากมอนช่วงเทศกาล · แลกของที่เจ้าจุก'},
 'krathong':{atlas:'social',icon:22,name:'กระทงใบตอง',kind:'potion',tokens:4,hp:300,mp:150,sell:10,text:'อธิษฐานแล้วฟื้น HP 300 · MP 150'},
 'green-herb':{atlas:'items48',icon:0,tokens:2,name:'ยาเขียว',kind:'potion',buy:40,sell:10,cure:true,text:'แก้ทุกอาการ: พิษ ใบ้ ตาพร่า คำสาป'},
 'mp-small':{icon:14,name:'น้ำมนต์ใส',kind:'potion',buy:30,sell:7,mp:40,text:'ฟื้น MP 40'},
 'mp-large':{icon:15,name:'น้ำมนต์ทองคำ',kind:'potion',buy:110,sell:27,mp:120,text:'ฟื้น MP 120'},
 'sticky-rice':{icon:16,name:'ข้าวเหนียวห่อใบตอง',kind:'potion',buy:40,sell:10,hp:45,mp:20,text:'ฟื้น HP 45 และ MP 20'},
 // 0.94 crafted food (craft window): a little HP/MP and a stat buff for 10 minutes; one meal at a time, a new one replaces it.
 'khao-tom-mat':{icon:16,tint:'gold',name:'ข้าวต้มมัด',kind:'potion',sell:30,hp:60,buff:{str:4},time:600,text:'HP 60 · STR +4 นาน 10 นาที'},
 'miang-kham':{icon:6,tint:'gold',name:'เมี่ยงคำ',kind:'potion',sell:30,hp:40,mp:20,buff:{agi:4},time:600,text:'HP 40 · MP 20 · AGI +4 นาน 10 นาที'},
 'khao-lam':{icon:5,tint:'gold',name:'ข้าวหลาม',kind:'potion',sell:40,hp:120,buff:{vit:4},time:600,text:'HP 120 · VIT +4 นาน 10 นาที'},
 'bua-loi':{icon:9,tint:'violet',name:'บัวลอยใบเตย',kind:'potion',sell:40,mp:60,buff:{int:4},time:600,text:'MP 60 · INT +4 นาน 10 นาที'},
 'fried-hopper':{icon:2,tint:'gold',name:'ตั๊กแตนทอดกรอบ',kind:'potion',sell:30,hp:40,buff:{dex:4},time:600,text:'HP 40 · DEX +4 นาน 10 นาที'},
 'break-guard':{atlas:'refine',icon:2,tint:'violet',name:'ยันต์กันแตก',kind:'loot',sell:400,text:'ใช้ตอนตีบวก +5 ขึ้นไป · ถ้าล้มเหลว อุปกรณ์ไม่แตก (ยันต์หมดไป)'},
 'fly-wing':{icon:2,tint:'wind',name:'ปีกเหินลม',kind:'wing',buy:60,sell:15,text:'ใช้แล้ววาร์ปไปจุดสุ่มในแผนที่นี้ · ใช้ในดันเจี้ยน บ้านกิลด์ กิลด์วอร์ หรือระหว่างดวลไม่ได้'},
 'return-incense':{icon:17,name:'ธูปกลับเมือง',kind:'scroll',buy:120,sell:30,text:'จุดแล้วกลับเมืองหลวงอยุธยาจากที่ไหนก็ได้'},
 'cowrie':{icon:18,name:'เบี้ย',kind:'ui'},'cowrie-pile':{icon:19,name:'กองเบี้ย',kind:'ui'},
 'cloth-bag':{icon:20,name:'ถุงย่าม',kind:'ui'},'shop-sign':{icon:21,name:'ป้ายร้านค้า',kind:'ui'},
 'loot-bundle':{icon:22,name:'ห่อผ้า',kind:'ui'},
 // 0.46+ social / market UI cells (assets/social46, see docs/social46-art.md)
 'storage-chest':{atlas:'social',icon:0,name:'คลังเก็บของ',kind:'ui'},'trade-hands':{atlas:'social',icon:1,name:'แลกของ',kind:'ui'},
 'stall-sign':{atlas:'social',icon:2,name:'ป้ายแผง',kind:'ui'},'market-stalls':{atlas:'social',icon:3,name:'ตลาด',kind:'ui'},
 'whisper':{atlas:'social',icon:4,name:'กระซิบ',kind:'ui'},'friend':{atlas:'social',icon:5,name:'เพื่อน',kind:'ui'},
 'guild-flag':{atlas:'social',icon:6,name:'กิลด์',kind:'ui'},'guild-seal':{atlas:'social',icon:7,name:'ตรากิลด์',kind:'ui'},
 'st-poison':{atlas:'social',icon:8,name:'พิษ',kind:'ui'},'st-stun':{atlas:'social',icon:9,name:'มึนงง',kind:'ui'},'st-sleep':{atlas:'social',icon:10,name:'หลับ',kind:'ui'},
 'st-silence':{atlas:'social',icon:11,name:'ใบ้',kind:'ui'},'st-blind':{atlas:'social',icon:12,name:'ตาพร่า',kind:'ui'},'st-curse':{atlas:'social',icon:13,name:'คำสาป',kind:'ui'},
 'mvp-crown':{atlas:'social',icon:16,name:'MVP',kind:'ui'},'boss-timer':{atlas:'social',icon:17,name:'เวลาบอส',kind:'ui'},'dungeon-gate':{atlas:'social',icon:18,name:'ดันเจี้ยน',kind:'ui'},
 'pet-egg':{atlas:'social',icon:20,name:'ไข่สัตว์เลี้ยง',kind:'ui'},'pet-bell':{atlas:'social',icon:21,name:'กระดิ่งสัตว์เลี้ยง',kind:'ui'},
 'daily-gift':{atlas:'social',icon:14,name:'ของขวัญรายวัน',kind:'ui'},'death-soul':{atlas:'social',icon:15,name:'วิญญาณหลุด',kind:'ui'},'treasure-chest':{icon:23,name:'หีบสมบัติ',kind:'reserved',sell:0},
 // 0.117 every weapon/armor/head/garment/shoes item comes from gear-sets.js; these accessories stay until their own redesign.
 'takrut-silver':{atlas:'gear',icon:19,name:'ตะกรุดเงิน',kind:'gear',slot:'accessory',bonus:{vit:2},level:5,buy:500,sell:125,text:'VIT +2 · Lv.5'},
 'ring-ruby':{atlas:'gear',icon:20,name:'แหวนพลอยแดง',kind:'gear',slot:'accessory',bonus:{str:2},level:5,buy:500,sell:125,text:'STR +2 · Lv.5'},
 'anklet-silver':{atlas:'gear',icon:21,name:'กำไลข้อเท้าเงิน',kind:'gear',slot:'accessory',bonus:{agi:2},level:5,buy:500,sell:125,text:'AGI +2 · Lv.5'},
 'cloth-yant':{atlas:'gear',icon:22,name:'ผ้ายันต์',kind:'gear',slot:'accessory',bonus:{int:2},level:5,buy:500,sell:125,text:'INT +2 · Lv.5'},
 'bia-gae':{atlas:'gear',icon:23,name:'เบี้ยแก้',kind:'gear',slot:'accessory',slots:0,bonus:{luk:2,dex:1},level:10,sell:400,text:'LUK +2 · DEX +1 · Lv.10 · ของหายาก'},
 // 0.44 refine materials and UI cells (atlas assets/refine44/refine.png); cells 6-11 reserved for element stones.
 'iron-ore':{atlas:'refine',icon:0,name:'เศษเหล็กน้ำพี้',kind:'loot',buy:250,sell:60,text:'ใช้ตีบวกอาวุธที่โรงตีครูแสนดาบ'},
 'laterite':{atlas:'refine',icon:1,name:'ก้อนศิลาแลง',kind:'loot',buy:250,sell:60,text:'ใช้ตีบวกหมวก เสื้อเกราะ ผ้าคลุม รองเท้า และเครื่องประดับ'},
 'lek-lai':{atlas:'refine',icon:2,tokens:30,name:'เหล็กไหล',kind:'loot',sell:500,text:'ของวิเศษ ใช้ร่วมตอนตีบวก เพิ่มโอกาสสำเร็จ 20%'},

 // 0.45 monster cards (atlas assets/cards45/cards.png): one per monster, slot into worn gear (1 slot, permanent).
 'card-straw':{atlas:'cards',icon:0,name:'การ์ดหุ่นฟางหลง',kind:'card',slot:'armor',effect:{bonus:{vit:2},hpPct:.05},sell:200,text:'ใส่ในเสื้อเกราะ · VIT +2 · HP +5%'},
 'card-rat':{atlas:'cards',icon:1,name:'การ์ดหนูยุ้งข้าว',kind:'card',slot:'weapon',effect:{vsSize:{small:.15}},sell:200,text:'ใส่ในอาวุธ · แรงขึ้น 15% กับมอนตัวเล็ก'},
 'card-hopper':{atlas:'cards',icon:2,name:'การ์ดตั๊กแตนเกราะ',kind:'card',slot:'accessory',effect:{bonus:{agi:2},flee:.02},sell:200,text:'ใส่ในเครื่องประดับ · AGI +2 · หลบหลีก +2%'},
 'card-monkey':{atlas:'cards',icon:3,name:'การ์ดลูกลิงฉกของ',kind:'card',slot:'weapon',effect:{bonus:{str:2},crit:.03},sell:200,text:'ใส่ในอาวุธ · STR +2 · คริติคอล +3%'},
 'card-vine':{atlas:'cards',icon:4,name:'การ์ดเถาวัลย์พันขา',kind:'card',slot:'armor',effect:{def:4},sell:200,text:'ใส่ในเสื้อเกราะ · DEF +4'},
 'card-lantern':{atlas:'cards',icon:5,name:'การ์ดโคมหลงทาง',kind:'card',slot:'weapon',effect:{vsElement:{ghost:.2}},sell:200,text:'ใส่ในอาวุธ · แรงขึ้น 20% กับมอนธาตุผี'},
 // 0.102 awakened boss cards: the base art in gold, stronger effects
 'card-rat-chief-awakened':{atlas:'cards',icon:6,tint:'gold',name:'การ์ดร่างทรงพญาหนูยุ้งข้าว',kind:'card',slot:'accessory',effect:{coinPct:.4,bonus:{luk:4,dex:2}},sell:8000,text:'ใส่ในเครื่องประดับ · เบี้ยจากมอน +40% · LUK +4 · DEX +2'},
 'card-monkey-chief-awakened':{atlas:'cards',icon:7,tint:'gold',name:'การ์ดร่างทรงวานรเจ้าเล่ห์',kind:'card',slot:'weapon',effect:{atkPct:.15,delay:.08},sell:8000,text:'ใส่ในอาวุธ · ATK +15% · ความเร็วโจมตี +8%'},
 'card-mill-keeper-awakened':{atlas:'cards',icon:8,tint:'gold',name:'การ์ดร่างทรงเจ้าหุ่นฟางพันเชือก',kind:'card',slot:'armor',effect:{resist:{ghost:.4},hpPct:.18},sell:10000,text:'ใส่ในเสื้อเกราะ · รับดาเมจจากผีลด 40% · HP +18%'},
 'card-marsh-ape-awakened':{atlas:'cards',icon:7,tint:'gold',name:'การ์ดร่างทรงพญาวานรบึง',kind:'card',slot:'weapon',effect:{atkPct:.12,crit:.06},sell:12000,text:'ใส่ในอาวุธ · ATK +12% · คริ +6%'},
 'card-rat-chief':{atlas:'cards',icon:6,name:'การ์ดพญาหนูยุ้งข้าว',kind:'card',slot:'accessory',effect:{coinPct:.25,bonus:{luk:2}},sell:800,text:'ใส่ในเครื่องประดับ · เบี้ยจากมอน +25% · LUK +2'},
 'card-monkey-chief':{atlas:'cards',icon:7,name:'การ์ดวานรเจ้าเล่ห์',kind:'card',slot:'weapon',effect:{atkPct:.1,delay:.05},sell:800,text:'ใส่ในอาวุธ · ATK +10% · ความเร็วโจมตี +5%'},
 'card-lantern-lord':{atlas:'cards',icon:9,name:'การ์ดเจ้าโคมวิญญาณ',kind:'card',slot:'armor',effect:{resist:{ghost:.2},flee:.05},sell:2500,text:'ใส่ในเสื้อเกราะ · ต้านผี 20% · หลบ +5%'},
 'card-straw-king':{atlas:'cards',icon:10,name:'การ์ดราชาหุ่นฟางเพลิง',kind:'card',slot:'weapon',effect:{vsSize:{large:.2},atkPct:.05},sell:5000,text:'ใส่ในอาวุธ · ตีตัวใหญ่ +20% · ATK +5%'},
 'card-marsh-rat':{atlas:'cards',icon:1,tint:'violet',name:'การ์ดหนูบึงยักษ์',kind:'card',slot:'weapon',effect:{vsSize:{small:.2}},sell:1200,text:'ใส่ในอาวุธ · ตีตัวเล็ก +20%'},
 'card-bog-hopper':{atlas:'cards',icon:2,tint:'violet',name:'การ์ดตั๊กแตนหนองน้ำ',kind:'card',slot:'armor',effect:{flee:.06},sell:1200,text:'ใส่ในเสื้อเกราะ · หลบ +6%'},
 'card-lotus-vine':{atlas:'cards',icon:4,tint:'violet',name:'การ์ดเถาบัวพันขา',kind:'card',slot:'armor',effect:{hpPct:.12},sell:1400,text:'ใส่ในเสื้อเกราะ · HP สูงสุด +12%'},
 'card-bog-lantern':{atlas:'cards',icon:5,tint:'violet',name:'การ์ดโคมผีบึง',kind:'card',slot:'accessory',effect:{bonus:{int:3}},sell:1400,text:'ใส่ในเครื่องประดับ · INT +3'},
 'card-marsh-ape':{atlas:'cards',icon:7,tint:'violet',name:'การ์ดพญาวานรบึง',kind:'card',slot:'weapon',effect:{atkPct:.08,crit:.03},sell:3000,text:'ใส่ในอาวุธ · ATK +8% · คริ +3%'},
 'lotus-seed':{icon:9,tint:'gold',name:'เมล็ดบัวต้องมนตร์',kind:'loot',sell:45,text:'ของจากบึงบัว · ขายได้'},
 'card-mill-keeper':{atlas:'cards',icon:8,name:'การ์ดเจ้าหุ่นฟางพันเชือก',kind:'card',slot:'armor',effect:{resist:{ghost:.3},hpPct:.1},sell:2000,text:'ใส่ในเสื้อเกราะ · รับดาเมจจากผีลด 30% · HP +10%'},
 'refine-hammer':{atlas:'refine',icon:3,name:'ค้อนตีบวก',kind:'ui'},'refine-success':{atlas:'refine',icon:4,name:'ตีบวกสำเร็จ',kind:'ui'},'refine-broken':{atlas:'refine',icon:5,name:'อุปกรณ์แตก',kind:'ui'},
};
Object.assign(ITEMS,buildGearItems());
// 0.47 guild emblems: 24 cells of assets/emblems47 (docs/emblems47-art.md), picked when founding a guild.
// Ids are letters (emblem-a … emblem-x) because item ids are [a-z-]; the guild stores the number 1–24.
export const emblemId=n=>'emblem-'+String.fromCharCode(96+n);
for(let i=1;i<=24;i++)ITEMS[emblemId(i)]={atlas:'emblems',icon:i-1,name:'ตรากิลด์ '+i,kind:'ui'};
// 0.48 emote bubbles (assets/emotes48, docs/emotes48-art.md), same letter ids.
export const emoteId=n=>'emote-'+String.fromCharCode(96+n);
for(let i=1;i<=24;i++)ITEMS[emoteId(i)]={atlas:'emotes',icon:i-1,name:'อีโมต '+i,kind:'ui'};
// 0.57 rarity (grey · green · blue · purple · gold). Explicit `rarity` wins; otherwise from the item's kind and level.
export const RARITY=['common','uncommon','rare','epic','legendary'],RARITY_NAME=['ทั่วไป','ดี','หายาก','ล้ำค่า','ตำนาน'];
const RARE_LOOT={'lek-lai':2,'spirit-rope':2,'palm-leaf':1,'spirit-thread':1,'king-ember':4,'event-token':1};
function baseRarity(it,id){
 if(Number.isInteger(it.rarity))return it.rarity;
 if(it.graded)return it.grade??0;if(it.rainbow)return 4;if(it.starter)return 0;
 if(it.kind==='card')return ['card-mill-keeper','card-lantern-lord','card-straw-king'].includes(id)?4:3;
 if(it.kind==='egg')return 2;
 if(it.kind==='gear'){if(['ember-amulet'].includes(id)||it.tint==='violet')return 4;if(it.tint==='gold'||['vest-lacquer','bia-gae','spirit-lamp'].includes(id))return 3;return (it.level??0)>=8?2:1;}
 return RARE_LOOT[id]??0;
}
// Random affixes on dropped gear: '!' + stat letter + 1–3, e.g. 'vest-buffalo!s2' = STR +2. One rarity step up.
export const AFFIXES={s:['str','แห่งพละ'],a:['agi','แห่งลมกรด'],v:['vit','แห่งหินผา'],i:['int','แห่งปัญญา'],d:['dex','แห่งเหยี่ยว'],l:['luk','แห่งโชคลาภ']};
export function rollAffix(rand=Math.random){const keys=Object.keys(AFFIXES),k=keys[Math.floor(rand()*keys.length)],r=rand();return k+(r<.6?1:r<.9?2:3);}
// A refined piece keeps its level as an id suffix: 'sword-iron+5'. itemDef() resolves any bag/gear id.
// 0.45: a slotted card adds '~card-<monster>': 'sword-iron+5~card-rat'.
export function itemDef(id){
 if(typeof id!=='string')return null;
 const m=/^([a-z-]+?)(?:\+(\d{1,2}))?(?:~(card-[a-z-]+))?(?:!([savidl])([1-3]))?(?:\^([1-4]))?$/.exec(id);
 let it=m&&Object.hasOwn(ITEMS,m[1])&&ITEMS[m[1]];if(!it)return null;
 // 0.117 grade suffix '^1'..'^4' (gear-sets.js GRADES) scales the graded piece's base stats
 const grade=m[6]?+m[6]:0;if(grade){if(!it.graded)return null;it=gradeItem(it,grade);}
 const n=m[2]?+m[2]:0,card=m[3]?ITEMS[m[3]]:null;
 if(!m[2]&&!m[3]&&!m[4])return {...it,id,base:m[1],grade,refine:0,refineTier:0,refinePercent:0,card:null,affix:null,rarity:baseRarity(it,id)};
 if(m[4]&&it.kind!=='gear')return null;
 if(it.kind!=='gear'||(m[2]&&(!['weapon','head','armor','garment','shoes','accessory'].includes(it.slot)||n<1||n>REFINE_MAX||String(n)!==m[2])))return null;
 if(m[3]&&(card?.kind!=='card'||card.slot!==it.slot||it.slots===0))return null;
 const affix=m[4]?m[4]+m[5]:null,[stat,title]=m[4]?AFFIXES[m[4]]:[],plus=m[5]?+m[5]:0;
 const refineText=n&&it.slot!=='weapon'?(/\bDEF \+\d+/.test(it.text??'')?(it.text??'').replace(/\bDEF \+\d+/, 'DEF +'+((it.def??0)+n)):(it.text??'')+' · DEF +'+n):(it.text??'');
 const bonus=affix?{...(it.bonus??{}),[stat]:(it.bonus?.[stat]??0)+plus}:it.bonus;
 const resolved={...it,refine:n,bonus};
 const statsPattern=/\b(?:ATK|MATK|DEF|MDEF|STR|AGI|VIT|INT|DEX|LUK)(?:\/(?:STR|AGI|VIT|INT|DEX|LUK))*\s*\+[\d.]+/;
 const text=n>=5?[gearStatText(resolved),...(it.text??'').split(' · ').filter(t=>!statsPattern.test(t))].filter(Boolean).join(' · '):refineText+(affix?' · '+stat.toUpperCase()+' +'+plus:'');
 return {...it,id,base:m[1],grade,refine:n,refineTier:refineTier(n),refinePercent:refinePercent(n),card:m[3]??null,affix,bonus,rarity:Math.min(4,baseRarity(it,m[1])+(affix?1:0)),
  name:it.name+(affix?' '+title:'')+(n?' +'+n:'')+(card?' ['+card.name+']':''),text,
  sell:Math.round(it.sell*(1+n*.25)*(1+plus*.2))+(card?.sell??0)};
}
export const composeId=(base,refine,card,affix=null,grade=0)=>base+(refine>0?'+'+refine:'')+(card?'~'+card:'')+(affix?'!'+affix:'')+(grade>0?'^'+grade:'');
const BAGGABLE=id=>['loot','potion','gear','card','scroll','wing','lure','petfood','egg'].includes(itemDef(id)?.kind);

// Per monster id (MONSTER_TYPES[].id): coins [min,max] and independent item rolls [id, chance, count=1].
export const DROPS={
 straw:{coins:[3,7],items:[['straw-bundle',.55],['rice-sheaf',.1],['spirit-thread',.03],['laterite',.04],['card-straw',0.004]]},
 rat:{coins:[2,5],items:[['rat-tooth',.6],['spirit-thread',.03],['card-rat',0.004]]},
 hopper:{coins:[5,10],items:[['hopper-wing',.5],['hp-small',.08],['iron-ore',.06],['card-hopper',0.004]]},
 monkey:{coins:[9,16],items:[['betel-nut',.5],['hp-small',.1],['spirit-thread',.04],['laterite',.07],['card-monkey',0.004]]},
 vine:{coins:[11,19],items:[['tough-vine',.5],['mp-small',.08],['iron-ore',.08],['card-vine',0.004]]},
 lantern:{coins:[14,24],items:[['lantern-paper',.5],['palm-leaf',.05],['spirit-thread',.05],['cloth-yant',.01],['lek-lai',.01],['card-lantern',0.004]]},
 // 0.102 awakened bosses: rare refine materials and a good shot at the original boss card
 'rat-chief-awakened':{coins:[1500,3000],items:[['lek-lai',.6],['break-guard',.25],['hp-large',.8,5],['mp-large',.6,3],['ring-ruby',.2],['card-rat-chief-awakened',.08]]},'monkey-chief-awakened':{coins:[1500,3000],items:[['lek-lai',.6],['break-guard',.25],['hp-large',.8,5],['mp-large',.6,3],['ring-ruby',.2],['card-monkey-chief-awakened',.08]]},
 'mill-keeper-awakened':{coins:[1500,3000],items:[['lek-lai',.6],['break-guard',.25],['hp-large',.8,5],['mp-large',.6,3],['ring-ruby',.2],['card-mill-keeper-awakened',.08]]},'marsh-ape-awakened':{coins:[1500,3000],items:[['lek-lai',.6],['break-guard',.25],['hp-large',.8,5],['mp-large',.6,3],['ring-ruby',.2],['card-marsh-ape-awakened',.08]]},
 'rat-chief':{coins:[80,140],items:[['rat-crown',.3],['spirit-thread',.5],['hp-large',.5,2],['ring-ruby',.1],['iron-ore',.5],['card-rat-chief',0.04]]},
 'monkey-chief':{coins:[120,200],items:[['monkey-bangle',.3],['spirit-thread',.6],['mp-large',.5,2],['anklet-silver',.12],['cloth-yant',.12],['bia-gae',.04],['laterite',.5],['card-monkey-chief',0.04]]},
 'lantern-lord':{coins:[500,800],items:[['spirit-lamp',.2],['hp-large',1,3],['mp-large',1,2],['lek-lai',.4],['green-herb',1,3],['card-lantern-lord',0.1]]},
 'straw-king':{coins:[1500,2500],items:[['ember-amulet',.25],['lek-lai',1,2],['hp-large',1,5],['iron-ore',1,4],['laterite',1,4],['card-straw-king',0.1]]},
 'marsh-rat':{coins:[20,35],items:[['lotus-seed',.4],['rat-tooth',.5],['iron-ore',.08],['card-marsh-rat',0.004]]},
 'bog-hopper':{coins:[24,40],items:[['lotus-seed',.4],['hopper-wing',.5],['laterite',.08],['card-bog-hopper',0.004]]},
 'lotus-vine':{coins:[28,46],items:[['lotus-seed',.5],['green-herb',.15],['spirit-thread',.1],['card-lotus-vine',0.004]]},
 'bog-lantern':{coins:[30,50],items:[['lotus-seed',.4],['lantern-paper',.5],['lek-lai',.02],['card-bog-lantern',0.004]]},
 'marsh-ape':{coins:[300,450],items:[['lotus-seed',1,3],['hp-large',.8,2],['lek-lai',.25],['card-marsh-ape',0.04]]},
 'mill-keeper':{coins:[400,600],items:[['spirit-rope',1],['palm-leaf',.5,2],['hp-large',1,3],['bia-gae',.15],['takrut-silver',.3],['lek-lai',.3],['card-mill-keeper',0.15]]},
};
Object.assign(ITEMS,WORLD_DROP_ITEMS);
Object.assign(DROPS,chapter2Drops(ITEMS));
// 0.117 set gear by monster level (`sets`, resolved per killer in rollLoot) and boss shards for the rainbow sets.
for(const m of FRONTIER_MONSTERS){const d=DROPS[m.id];if(!d)continue;const rule=setDrops(m),shard=shardDrop(m);if(rule)d.sets=rule;if(shard)d.items.push(shard);}

// Shops keyed by NPC name; the server also checks the player stands next to that NPC in that map.
export const SHOPS={
 'แม่บัว':{mapId:'ayutthaya',title:'แผงยาแม่บัว',expand:true,stock:['hp-small','hp-large','mp-small','mp-large','green-herb','sticky-rice','return-incense','fly-wing']},
 // 0.50 festival exchange: paid in event tokens instead of cowries.
 'เจ้าจุก':{mapId:'ayutthaya',title:'ซุ้มงานวัดเจ้าจุก',currency:'event-token',stock:['krathong','green-herb','hp-large','lek-lai']},
 'ป้าละไม':{mapId:'rice-fields',title:'ยุ้งป้าละไม',stock:['hp-small','mp-small','sticky-rice']},
 'ครูแสนดาบ':{mapId:'ayutthaya',title:'โรงตีอาวุธครูแสนดาบ',refine:true,stock:['iron-ore','laterite','starter-wraps','starter-headband','starter-shirt','starter-cloth','starter-sandals','takrut-silver','ring-ruby','anklet-silver','cloth-yant']},
 // 0.117 set gear only drops or is crafted; the Lablae smith keeps selling refine stones
 'ช่างตีบวกขั้นสูง':{mapId:'lablae',title:'ร้านช่างตีบวกขั้นสูง',stock:['iron-ore','laterite']},
};

const int=(v,min,max)=>Number.isSafeInteger(v)?Math.min(Math.max(v,min),max):min;
export function normalizeBag(bag,cap=bagCap(bag)){
 const b=bag&&typeof bag==='object'?bag:{},items={},slots=bagCap(b);
 for(const [id,n] of Object.entries(b.items&&typeof b.items==='object'?b.items:{})){
  if(!BAGGABLE(id))continue;const c=int(n,0,MAX_STACK);if(c>0&&Object.keys(items).length<cap)items[id]=c;
 }
 return slots>BAG_SLOTS?{coins:int(b.coins,0,MAX_COINS),items,slots}:{coins:int(b.coins,0,MAX_COINS),items};
}
// Buy +BAG_STEP slots (shop service, not an item, so it works even when the bag is full).
export function expandBag(bag){const b=normalizeBag(bag),cost=expandCost(b);if(cost===null)throw new Error('bag-max');if(b.coins<cost)throw new Error('no-coins');b.coins-=cost;b.slots=bagCap(b)+BAG_STEP;return b;}
export const count=(bag,id)=>normalizeBag(bag).items[id]??0;

// Adds coins and items; whatever does not fit (full bag / stack cap) is reported as lost.
export function addLoot(bag,{coins=0,items=[]}={}){
 const b=normalizeBag(bag),added=[],lost=[];
 const gained=int(coins,0,MAX_COINS);b.coins=Math.min(MAX_COINS,b.coins+gained);
 for(const {id,count:n=1} of items){
  if(!BAGGABLE(id)||!(n>0))continue;
  const room=id in b.items||Object.keys(b.items).length<bagCap(b)?MAX_STACK-(b.items[id]??0):0,take=Math.min(room,n);
  if(take>0){b.items[id]=(b.items[id]??0)+take;added.push({id,count:take});}
  if(take<n)lost.push({id,count:n-take});
 }
 return {bag:b,coins:gained,added,lost};
}

// look: the killer's gear look (gear-sets.js gearLook); null (Novice) drops any look.
export function rollLoot(monsterId,rand=Math.random,event=null,rolls=1,look=null){
 if(rolls>1){const all={coins:0,items:[]};for(let i=0;i<rolls;i++){const r=rollLoot(monsterId,rand,i?null:event,1,look);all.coins+=r.coins;all.items.push(...r.items);}return all;} // 0.64 leaders/surge roll several times
 const d=DROPS[monsterId];if(!d)return {coins:0,items:[]};
 const [lo,hi]=d.coins,coins=lo+Math.floor(rand()*(hi-lo+1)),items=[];
 for(const [id,chance,n=1] of d.items)if(rand()<chance)items.push({id:ITEMS[id]?.kind==='gear'&&rand()<.35?id+'!'+rollAffix(rand):id,count:n}); // 0.57: 35% of dropped gear gets a random affix
 if(d.sets)for(const id of rollSetPiece(d.sets,look,rand)){const [base,grade]=id.split('^');items.push({id:rand()<.35?composeId(base,0,null,rollAffix(rand),+(grade??0)):id,count:1});}
 if(event&&rand()<event.drop)items.push({id:event.token,count:1});
 return {coins,items};
}

export function buy(bag,shopNpc,id,qty=1){
 const shop=SHOPS[shopNpc],item=ITEMS[id],price=shop?.currency?item?.tokens:item?.buy;
 if(!shop||!shop.stock.includes(id)||!price)throw new Error('not-sold');
 if(!Number.isSafeInteger(qty)||qty<1||qty>MAX_STACK)throw new Error('bad-count');
 const b=normalizeBag(bag),cost=price*qty;
 if(shop.currency){if((b.items[shop.currency]??0)<cost)throw new Error('no-tokens');b.items[shop.currency]-=cost;if(!b.items[shop.currency])delete b.items[shop.currency];}
 else if(b.coins<cost)throw new Error('no-coins');
 const r=addLoot({...b,coins:b.coins-(shop.currency?0:cost)},{items:[{id,count:qty}]});
 if(r.lost.length)throw new Error('bag-full');
 return r.bag;
}

export function sell(bag,id,qty=1){
 const item=itemDef(id);if(!item||!BAGGABLE(id)||!item.sell)throw new Error('not-sellable');
 if(!Number.isSafeInteger(qty)||qty<1)throw new Error('bad-count');
 const b=normalizeBag(bag);if((b.items[id]??0)<qty)throw new Error('no-item');
 b.items[id]-=qty;if(!b.items[id])delete b.items[id];
 b.coins=Math.min(MAX_COINS,b.coins+item.sell*qty);
 return b;
}

// 0.100.10 throwing items away from the bag (drag out of the bag window); qty must be 1..what the bag holds.
export function discard(bag,id,qty=1){
 const b=normalizeBag(bag);if(!Number.isSafeInteger(qty)||qty<1)throw new Error('bad-count');
 if(!b.items[id])throw new Error('no-item');if(b.items[id]<qty)throw new Error('bad-count');
 b.items[id]-=qty;if(!b.items[id])delete b.items[id];
 return b;
}

// Drinking a potion: returns the new bag and the healed player stats (caps at max; refuses when nothing to heal).
export function useItem(bag,id,player,status={}){ // food (item.buff) also returns food:{id,left}
 const item=ITEMS[id];if(item?.kind!=='potion')throw new Error('not-usable');
 const b=normalizeBag(bag);if(!b.items[id])throw new Error('no-item');
 if(player.hp<=0)throw new Error('defeated');if(status.stun||status.sleep)throw new Error('held');
 const cure=!!item.cure&&Object.keys(status).length>0;
 const hp=Math.min(player.maxHp,player.hp+(item.hp??0)),mp=Math.min(player.maxMp,player.mp+(item.mp??0));
 if(hp===player.hp&&mp===player.mp&&!cure&&!item.buff)throw new Error(item.cure?'no-ailment':'already-full');
 b.items[id]--;if(!b.items[id])delete b.items[id];
 return {bag:b,hp,mp,status:cure?{}:status,food:item.buff?{id,left:item.time}:null};
}

export function itemLabel(list){return list.map(({id,count:n})=>(itemDef(id)?.name??id)+(n>1?' ×'+n:'')).join(', ');}

// Player-facing reasons (shown as a notice) for the error codes above.
export const foodBuff=world=>world.food?.left>0?ITEMS[world.food.id]?.buff??null:null;
export const ITEM_ERRORS={'bag-max':'กระเป๋าขยายเต็มที่แล้ว (100 ช่อง)','wing-blocked':'ปีกเหินลมใช้ในดันเจี้ยน บ้านกิลด์ กิลด์วอร์ หรือระหว่างดวลไม่ได้','rebirth-town':'เกิดใหม่ได้เฉพาะในเมือง','rebirth-level':'ต้องถึง Base Lv.99 ก่อน','rebirth-max':'เกิดใหม่ครบ 10 ครั้งแล้ว','no-recipe':'ไม่มีสูตรนี้','no-material':'วัตถุดิบไม่พอ','craft-rate':'ค่อย ๆ ทำทีละรอบ','no-break-guard':'ไม่มียันต์กันแตก','shop-zone':'ตั้งร้านได้เฉพาะถนนตลาดแม่บัวในอยุธยา','shop-limit':'เปิดร้านค้างครบจำนวนแล้ว · เพิ่มทักษะการค้าเพื่อเปิดเพิ่ม','shop-crowded':'ชิดร้านอื่นเกินไป · ขยับออกอีกนิด','shop-far':'เดินไปที่ร้านก่อน','not-wanted':'ร้านนี้ไม่ได้รับซื้อของชิ้นนี้','not-usable':'ใช้ไอเทมนี้ไม่ได้','no-item':'ไม่มีไอเทมนี้ในกระเป๋า','already-full':'HP / MP เต็มอยู่แล้ว','defeated':'หมดแรงอยู่ ใช้ยาไม่ได้','item-rate':'รอสักครู่ก่อนใช้อีกครั้ง','not-sold':'ร้านนี้ไม่ได้ขายของชิ้นนี้','no-coins':'เบี้ยไม่พอ','bag-full':'กระเป๋าเต็ม','bad-count':'จำนวนไม่ถูกต้อง','not-sellable':'ขายของชิ้นนี้ไม่ได้','shop-too-far':'เดินเข้าใกล้ร้านก่อน','not-gear':'สวมใส่ไม่ได้','wrong-class':'อาชีพนี้ใช้ไม่ได้','low-level':'เลเวลยังไม่ถึง','slot-empty':'ช่องนี้ว่างอยู่','bad-stat':'ค่าสถานะไม่ถูกต้อง','stat-max':'ค่าสถานะสูงสุดแล้ว','no-stat-points':'แต้มสถานะไม่พอ','gear-rate':'รอสักครู่','not-refinable':'เลือกอุปกรณ์ที่สวมอยู่เพื่อตีบวก','refine-max':'ตีบวกสูงสุด +20 แล้ว','no-ore':'แร่ตีบวกไม่พอ','no-lek-lai':'ไม่มีเหล็กไหล','refine-far':'ต้องตีบวกที่โรงตีครูแสนดาบ','not-card':'ไม่ใช่การ์ด','card-slot':'การ์ดนี้ใส่ช่องนี้ไม่ได้','slot-full':'อุปกรณ์นี้มีการ์ดแล้ว','no-card-slot':'อุปกรณ์นี้ไม่มีช่องการ์ด','storage-far':'คุยกับลุงเรืองที่ท่าน้ำเพื่อเปิดคลัง','coin-cap':'เบี้ยเต็มแล้ว','trade-far':'อยู่ไกลกันเกินไป','trade-busy':'อีกฝ่ายกำลังแลกของอยู่','trade-none':'ไม่ได้แลกของอยู่','trade-locked':'ล็อกข้อเสนอแล้ว แก้ไขไม่ได้','trade-wait':'รออีกฝ่ายล็อกก่อน','stall-city':'ตั้งแผงได้เฉพาะในเมือง','stall-none':'แผงนี้ปิดแล้ว','stall-self':'ซื้อจากแผงตัวเองไม่ได้','recall-here':'อยู่ในเมืองหลวงแล้ว','held':'ขยับตัวไม่ได้','no-ailment':'ไม่มีอาการผิดปกติ','not-tameable':'ล่อได้เฉพาะ หนู หุ่นฟาง ตั๊กแตน ลูกลิง ที่เลือกเป็นเป้าไว้','pet-active':'มีสัตว์เลี้ยงออกมาอยู่แล้ว (คืนเป็นไข่ก่อน)','no-pet':'ยังไม่มีสัตว์เลี้ยง','no-tokens':'เหรียญงานวัดไม่พอ','bounty-town':'รับรางวัลค่าหัวได้ในเมือง','bounty-none':'ไม่มีค่าหัวนี้','bounty-claimed':'รับรางวัลไปแล้ว','bounty-unfinished':'ยังล่าไม่ครบ','hire-far':'จ้างทหารได้ที่โรงตีครูแสนดาบ','hire-active':'มีทหารรับจ้างอยู่แล้ว'};
// 0.85 admin balance overrides (balance.js); item description texts are not rewritten.
for(const [id,item] of Object.entries(ITEMS))patch('items',id,item);
patchDrops(DROPS);
