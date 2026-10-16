// Items, loot, coins (เบี้ย) and NPC shops. Pure rules shared by the client (offline guests + UI) and the realm
// server (authoritative online bag). Bag state: {coins, items:{[id]:count}}.
// Art: one atlas, 6x4 cells of 256 px (1536x1024, transparent). Drop a finished file over the same path to re-skin.
export const ITEM_ATLAS='assets/items42/items.png',GEAR_ATLAS='assets/gear43/gear.png',REFINE_ATLAS='assets/refine44/refine.png';
export const CARD_ATLAS='assets/cards45/cards.png',SOCIAL_ATLAS='assets/social46/social.png';
export const ATLASES={gear:GEAR_ATLAS,refine:REFINE_ATLAS,cards:CARD_ATLAS,social:SOCIAL_ATLAS}; // item.atlas key → file (default ITEM_ATLAS)
export const BAG_SLOTS=40,MAX_STACK=999,MAX_COINS=9999999;

// icon = atlas cell (row-major, 6 per row). kind: loot (sell only) · potion (usable) · ui (never in a bag).
export const ITEMS={
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
 'hp-large':{icon:13,name:'ยาสมุนไพรแดงขวดใหญ่',kind:'potion',buy:90,sell:22,hp:180,text:'ฟื้น HP 180'},
 'mp-small':{icon:14,name:'น้ำมนต์ใส',kind:'potion',buy:30,sell:7,mp:40,text:'ฟื้น MP 40'},
 'mp-large':{icon:15,name:'น้ำมนต์ทองคำ',kind:'potion',buy:110,sell:27,mp:120,text:'ฟื้น MP 120'},
 'sticky-rice':{icon:16,name:'ข้าวเหนียวห่อใบตอง',kind:'potion',buy:40,sell:10,hp:45,mp:20,text:'ฟื้น HP 45 และ MP 20'},
 'return-incense':{icon:17,name:'ธูปกลับเมือง',kind:'scroll',buy:120,sell:30,text:'จุดแล้วกลับเมืองหลวงอยุธยาจากที่ไหนก็ได้'},
 'cowrie':{icon:18,name:'เบี้ย',kind:'ui'},'cowrie-pile':{icon:19,name:'กองเบี้ย',kind:'ui'},
 'cloth-bag':{icon:20,name:'ถุงย่าม',kind:'ui'},'shop-sign':{icon:21,name:'ป้ายร้านค้า',kind:'ui'},
 'loot-bundle':{icon:22,name:'ห่อผ้า',kind:'ui'},
 // 0.46+ social / market UI cells (assets/social46, see docs/social46-art.md)
 'storage-chest':{atlas:'social',icon:0,name:'คลังเก็บของ',kind:'ui'},'trade-hands':{atlas:'social',icon:1,name:'แลกของ',kind:'ui'},
 'stall-sign':{atlas:'social',icon:2,name:'ป้ายแผง',kind:'ui'},'market-stalls':{atlas:'social',icon:3,name:'ตลาด',kind:'ui'},'treasure-chest':{icon:23,name:'หีบสมบัติ',kind:'reserved',sell:0},
 // 0.43 stat gear (atlas assets/gear43/gear.png): class weapons tier 1 / tier 2, armor, accessories.
 'wrap-novice':{atlas:'gear',icon:0,name:'ผ้าพันหมัดเชือกป่าน',kind:'gear',slot:'weapon',classes:['novice'],atk:6,buy:120,sell:30,text:'ATK +6 · ผู้ฝึกตน'},
 'sword-iron':{atlas:'gear',icon:1,name:'ดาบเหล็กกล้า',kind:'gear',slot:'weapon',classes:['swordsman'],atk:14,buy:300,sell:75,text:'ATK +14 · นักดาบ'},
 'spear-bamboo':{atlas:'gear',icon:2,name:'ทวนไม้ไผ่หัวเหล็ก',kind:'gear',slot:'weapon',classes:['lancer'],atk:15,buy:320,sell:80,text:'ATK +15 · นักทวน'},
 'bow-bamboo':{atlas:'gear',icon:3,name:'ธนูไม้ไผ่',kind:'gear',slot:'weapon',classes:['hunter'],atk:13,buy:300,sell:75,text:'ATK +13 · นายพราน'},
 'gloves-hemp':{atlas:'gear',icon:4,name:'นวมผ้าดิบ',kind:'gear',slot:'weapon',classes:['boxer'],atk:13,buy:280,sell:70,text:'ATK +13 · นักมวย'},
 'daggers-twin':{atlas:'gear',icon:5,name:'มีดคู่ด้ามไม้',kind:'gear',slot:'weapon',classes:['rogue'],atk:12,buy:280,sell:70,text:'ATK +12 · จอมโจร'},
 'staff-wan':{atlas:'gear',icon:6,name:'ไม้เท้าว่านยา',kind:'gear',slot:'weapon',classes:['shaman'],matk:14,buy:320,sell:80,text:'MATK +14 · หมอผี'},
 'beads-wood':{atlas:'gear',icon:7,name:'ประคำไม้มะเกลือ',kind:'gear',slot:'weapon',classes:['acolyte'],matk:12,buy:300,sell:75,text:'MATK +12 · พระ / แม่ชี'},
 'knuckle-brass':{atlas:'gear',icon:8,name:'สนับมือทองเหลือง',kind:'gear',slot:'weapon',classes:['novice'],atk:12,level:8,buy:600,sell:150,text:'ATK +12 · ผู้ฝึกตน · Lv.8'},
 'sword-silver':{atlas:'gear',icon:9,name:'ดาบคร่ำเงิน',kind:'gear',slot:'weapon',classes:['swordsman'],atk:30,level:15,buy:1500,sell:375,text:'ATK +30 · นักดาบ · Lv.15'},
 'spear-steel':{atlas:'gear',icon:10,name:'ทวนเหล็กน้ำพี้',kind:'gear',slot:'weapon',classes:['lancer'],atk:32,level:15,buy:1600,sell:400,text:'ATK +32 · นักทวน · Lv.15'},
 'bow-horn':{atlas:'gear',icon:11,name:'ธนูเขาควาย',kind:'gear',slot:'weapon',classes:['hunter'],atk:28,level:15,buy:1500,sell:375,text:'ATK +28 · นายพราน · Lv.15'},
 'gloves-leather':{atlas:'gear',icon:12,name:'นวมหนังควายคาดเชือก',kind:'gear',slot:'weapon',classes:['boxer'],atk:28,level:15,buy:1400,sell:350,text:'ATK +28 · นักมวย · Lv.15'},
 'daggers-ivory':{atlas:'gear',icon:13,name:'มีดคู่ด้ามงา',kind:'gear',slot:'weapon',classes:['rogue'],atk:26,level:15,buy:1400,sell:350,text:'ATK +26 · จอมโจร · Lv.15'},
 'staff-candle':{atlas:'gear',icon:14,name:'ไม้เท้ายันต์เทียนชัย',kind:'gear',slot:'weapon',classes:['shaman'],matk:30,element:'fire',level:15,buy:1600,sell:400,text:'MATK +30 · หมอผี · Lv.15'},
 'beads-sandal':{atlas:'gear',icon:15,name:'ประคำไม้จันทน์หอม',kind:'gear',slot:'weapon',classes:['acolyte'],matk:27,element:'holy',level:15,buy:1500,sell:375,text:'MATK +27 · พระ / แม่ชี · Lv.15'},
 'vest-cotton':{atlas:'gear',icon:16,name:'เสื้อผ้าฝ้ายทอหนา',kind:'gear',slot:'armor',def:3,buy:150,sell:37,text:'DEF +3'},
 'vest-buffalo':{atlas:'gear',icon:17,name:'เสื้อเกราะหนังควาย',kind:'gear',slot:'armor',def:7,level:12,buy:900,sell:225,text:'DEF +7 · Lv.12'},
 'vest-lacquer':{atlas:'gear',icon:18,name:'เสื้อเกราะลงรักปิดทอง',kind:'gear',slot:'armor',slots:0,def:12,level:25,sell:900,text:'DEF +12 · Lv.25 · ดรอปจากบอสโรงสี'},
 'takrut-silver':{atlas:'gear',icon:19,name:'ตะกรุดเงิน',kind:'gear',slot:'accessory',bonus:{vit:2},level:5,buy:500,sell:125,text:'VIT +2 · Lv.5'},
 'ring-ruby':{atlas:'gear',icon:20,name:'แหวนพลอยแดง',kind:'gear',slot:'accessory',bonus:{str:2},level:5,buy:500,sell:125,text:'STR +2 · Lv.5'},
 'anklet-silver':{atlas:'gear',icon:21,name:'กำไลข้อเท้าเงิน',kind:'gear',slot:'accessory',bonus:{agi:2},level:5,buy:500,sell:125,text:'AGI +2 · Lv.5'},
 'cloth-yant':{atlas:'gear',icon:22,name:'ผ้ายันต์',kind:'gear',slot:'accessory',bonus:{int:2},level:5,buy:500,sell:125,text:'INT +2 · Lv.5'},
 'bia-gae':{atlas:'gear',icon:23,name:'เบี้ยแก้',kind:'gear',slot:'accessory',slots:0,bonus:{luk:2,dex:1},level:10,sell:400,text:'LUK +2 · DEX +1 · Lv.10 · ของหายาก'},
 // 0.44 refine materials and UI cells (atlas assets/refine44/refine.png); cells 6-11 reserved for element stones.
 'iron-ore':{atlas:'refine',icon:0,name:'เศษเหล็กน้ำพี้',kind:'loot',buy:250,sell:60,text:'ใช้ตีบวกอาวุธที่โรงตีครูแสนดาบ'},
 'laterite':{atlas:'refine',icon:1,name:'ก้อนศิลาแลง',kind:'loot',buy:250,sell:60,text:'ใช้ตีบวกเสื้อเกราะที่โรงตีครูแสนดาบ'},
 'lek-lai':{atlas:'refine',icon:2,name:'เหล็กไหล',kind:'loot',sell:500,text:'ของวิเศษ ใช้ร่วมตอนตีบวก เพิ่มโอกาสสำเร็จ 20%'},

 // 0.45 monster cards (atlas assets/cards45/cards.png): one per monster, slot into worn gear (1 slot, permanent).
 'card-straw':{atlas:'cards',icon:0,name:'การ์ดหุ่นฟางหลง',kind:'card',slot:'armor',effect:{bonus:{vit:2},hpPct:.05},sell:200,text:'ใส่ในเสื้อเกราะ · VIT +2 · HP +5%'},
 'card-rat':{atlas:'cards',icon:1,name:'การ์ดหนูยุ้งข้าว',kind:'card',slot:'weapon',effect:{vsSize:{small:.15}},sell:200,text:'ใส่ในอาวุธ · แรงขึ้น 15% กับมอนตัวเล็ก'},
 'card-hopper':{atlas:'cards',icon:2,name:'การ์ดตั๊กแตนเกราะ',kind:'card',slot:'accessory',effect:{bonus:{agi:2},flee:.02},sell:200,text:'ใส่ในเครื่องประดับ · AGI +2 · หลบหลีก +2%'},
 'card-monkey':{atlas:'cards',icon:3,name:'การ์ดลูกลิงฉกของ',kind:'card',slot:'weapon',effect:{bonus:{str:2},crit:.03},sell:200,text:'ใส่ในอาวุธ · STR +2 · คริติคอล +3%'},
 'card-vine':{atlas:'cards',icon:4,name:'การ์ดเถาวัลย์พันขา',kind:'card',slot:'armor',effect:{def:4},sell:200,text:'ใส่ในเสื้อเกราะ · DEF +4'},
 'card-lantern':{atlas:'cards',icon:5,name:'การ์ดโคมหลงทาง',kind:'card',slot:'weapon',effect:{vsElement:{ghost:.2}},sell:200,text:'ใส่ในอาวุธ · แรงขึ้น 20% กับมอนธาตุผี'},
 'card-rat-chief':{atlas:'cards',icon:6,name:'การ์ดพญาหนูยุ้งข้าว',kind:'card',slot:'accessory',effect:{coinPct:.25,bonus:{luk:2}},sell:800,text:'ใส่ในเครื่องประดับ · เบี้ยจากมอน +25% · LUK +2'},
 'card-monkey-chief':{atlas:'cards',icon:7,name:'การ์ดวานรเจ้าเล่ห์',kind:'card',slot:'weapon',effect:{atkPct:.1,delay:.05},sell:800,text:'ใส่ในอาวุธ · ATK +10% · ความเร็วโจมตี +5%'},
 'card-mill-keeper':{atlas:'cards',icon:8,name:'การ์ดเจ้าหุ่นฟางพันเชือก',kind:'card',slot:'armor',effect:{resist:{ghost:.3},hpPct:.1},sell:2000,text:'ใส่ในเสื้อเกราะ · รับดาเมจจากผีลด 30% · HP +10%'},
 'refine-hammer':{atlas:'refine',icon:3,name:'ค้อนตีบวก',kind:'ui'},'refine-success':{atlas:'refine',icon:4,name:'ตีบวกสำเร็จ',kind:'ui'},'refine-broken':{atlas:'refine',icon:5,name:'อุปกรณ์แตก',kind:'ui'},
};
// A refined piece keeps its level as an id suffix: 'sword-iron+5'. itemDef() resolves any bag/gear id.
// 0.45: a slotted card adds '~card-<monster>': 'sword-iron+5~card-rat'.
export function itemDef(id){
 if(typeof id!=='string')return null;
 const m=/^([a-z-]+?)(?:\+(\d{1,2}))?(?:~(card-[a-z-]+))?$/.exec(id);
 const it=m&&ITEMS[m[1]];if(!it)return null;
 const n=m[2]?+m[2]:0,card=m[3]?ITEMS[m[3]]:null;
 if(!m[2]&&!m[3])return {...it,id,base:id,refine:0,card:null};
 if(it.kind!=='gear'||(m[2]&&(!['weapon','armor'].includes(it.slot)||n<1||n>10)))return null;
 if(m[3]&&(card?.kind!=='card'||card.slot!==it.slot||it.slots===0))return null;
 return {...it,id,base:m[1],refine:n,card:m[3]??null,name:it.name+(n?' +'+n:'')+(card?' ['+card.name+']':''),sell:Math.round(it.sell*(1+n*.25))+(card?.sell??0)};
}
export const composeId=(base,refine,card)=>base+(refine>0?'+'+refine:'')+(card?'~'+card:'');
const BAGGABLE=id=>['loot','potion','gear','card','scroll'].includes(itemDef(id)?.kind);

// Per monster id (MONSTER_TYPES[].id): coins [min,max] and independent item rolls [id, chance, count=1].
export const DROPS={
 straw:{coins:[3,7],items:[['straw-bundle',.55],['rice-sheaf',.1],['spirit-thread',.03],['laterite',.04],['card-straw',0.004]]},
 rat:{coins:[2,5],items:[['rat-tooth',.6],['spirit-thread',.03],['card-rat',0.004]]},
 hopper:{coins:[5,10],items:[['hopper-wing',.5],['hp-small',.08],['iron-ore',.06],['card-hopper',0.004]]},
 monkey:{coins:[9,16],items:[['betel-nut',.5],['hp-small',.1],['spirit-thread',.04],['laterite',.07],['card-monkey',0.004]]},
 vine:{coins:[11,19],items:[['tough-vine',.5],['mp-small',.08],['iron-ore',.08],['card-vine',0.004]]},
 lantern:{coins:[14,24],items:[['lantern-paper',.5],['palm-leaf',.05],['spirit-thread',.05],['cloth-yant',.01],['lek-lai',.01],['card-lantern',0.004]]},
 'rat-chief':{coins:[80,140],items:[['rat-crown',.3],['spirit-thread',.5],['hp-large',.5,2],['vest-buffalo',.08],['ring-ruby',.1],['iron-ore',.5],['card-rat-chief',0.04]]},
 'monkey-chief':{coins:[120,200],items:[['monkey-bangle',.3],['spirit-thread',.6],['mp-large',.5,2],['anklet-silver',.12],['cloth-yant',.12],['bia-gae',.04],['laterite',.5],['card-monkey-chief',0.04]]},
 'mill-keeper':{coins:[400,600],items:[['spirit-rope',1],['palm-leaf',.5,2],['hp-large',1,3],['vest-lacquer',.25],['bia-gae',.15],['takrut-silver',.3],['lek-lai',.3],['card-mill-keeper',0.15]]},
};

// Shops keyed by NPC name; the server also checks the player stands next to that NPC in that map.
export const SHOPS={
 'แม่บัว':{mapId:'ayutthaya',title:'แผงยาแม่บัว',stock:['hp-small','hp-large','mp-small','mp-large','sticky-rice','return-incense']},
 'ป้าละไม':{mapId:'rice-fields',title:'ยุ้งป้าละไม',stock:['hp-small','mp-small','sticky-rice']},
 'ครูแสนดาบ':{mapId:'ayutthaya',title:'โรงตีอาวุธครูแสนดาบ',refine:true,stock:['iron-ore','laterite','wrap-novice','sword-iron','spear-bamboo','bow-bamboo','gloves-hemp','daggers-twin','staff-wan','beads-wood','knuckle-brass','sword-silver','spear-steel','bow-horn','gloves-leather','daggers-ivory','staff-candle','beads-sandal','vest-cotton','vest-buffalo','takrut-silver','ring-ruby','anklet-silver','cloth-yant']},
};

const int=(v,min,max)=>Number.isSafeInteger(v)?Math.min(Math.max(v,min),max):min;
export function normalizeBag(bag,cap=BAG_SLOTS){
 const b=bag&&typeof bag==='object'?bag:{},items={};
 for(const [id,n] of Object.entries(b.items&&typeof b.items==='object'?b.items:{})){
  if(!BAGGABLE(id))continue;const c=int(n,0,MAX_STACK);if(c>0&&Object.keys(items).length<cap)items[id]=c;
 }
 return {coins:int(b.coins,0,MAX_COINS),items};
}
export const count=(bag,id)=>normalizeBag(bag).items[id]??0;

// Adds coins and items; whatever does not fit (full bag / stack cap) is reported as lost.
export function addLoot(bag,{coins=0,items=[]}={}){
 const b=normalizeBag(bag),added=[],lost=[];
 const gained=int(coins,0,MAX_COINS);b.coins=Math.min(MAX_COINS,b.coins+gained);
 for(const {id,count:n=1} of items){
  if(!BAGGABLE(id)||!(n>0))continue;
  const room=id in b.items||Object.keys(b.items).length<BAG_SLOTS?MAX_STACK-(b.items[id]??0):0,take=Math.min(room,n);
  if(take>0){b.items[id]=(b.items[id]??0)+take;added.push({id,count:take});}
  if(take<n)lost.push({id,count:n-take});
 }
 return {bag:b,coins:gained,added,lost};
}

export function rollLoot(monsterId,rand=Math.random){
 const d=DROPS[monsterId];if(!d)return {coins:0,items:[]};
 const [lo,hi]=d.coins,coins=lo+Math.floor(rand()*(hi-lo+1)),items=[];
 for(const [id,chance,n=1] of d.items)if(rand()<chance)items.push({id,count:n});
 return {coins,items};
}

export function buy(bag,shopNpc,id,qty=1){
 const shop=SHOPS[shopNpc],item=ITEMS[id];
 if(!shop||!shop.stock.includes(id)||!item?.buy)throw new Error('not-sold');
 if(!Number.isSafeInteger(qty)||qty<1||qty>99)throw new Error('bad-count');
 const b=normalizeBag(bag),cost=item.buy*qty;
 if(b.coins<cost)throw new Error('no-coins');
 const r=addLoot({...b,coins:b.coins-cost},{items:[{id,count:qty}]});
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

// Drinking a potion: returns the new bag and the healed player stats (caps at max; refuses when nothing to heal).
export function useItem(bag,id,player){
 const item=ITEMS[id];if(item?.kind!=='potion')throw new Error('not-usable');
 const b=normalizeBag(bag);if(!b.items[id])throw new Error('no-item');
 if(player.hp<=0)throw new Error('defeated');
 const hp=Math.min(player.maxHp,player.hp+(item.hp??0)),mp=Math.min(player.maxMp,player.mp+(item.mp??0));
 if(hp===player.hp&&mp===player.mp)throw new Error('already-full');
 b.items[id]--;if(!b.items[id])delete b.items[id];
 return {bag:b,hp,mp};
}

export function itemLabel(list){return list.map(({id,count:n})=>(itemDef(id)?.name??id)+(n>1?' ×'+n:'')).join(', ');}

// Player-facing reasons (shown as a notice) for the error codes above.
export const ITEM_ERRORS={'not-usable':'ใช้ไอเทมนี้ไม่ได้','no-item':'ไม่มีไอเทมนี้ในกระเป๋า','already-full':'HP / MP เต็มอยู่แล้ว','defeated':'หมดแรงอยู่ ใช้ยาไม่ได้','item-rate':'รอสักครู่ก่อนใช้อีกครั้ง','not-sold':'ร้านนี้ไม่ได้ขายของชิ้นนี้','no-coins':'เบี้ยไม่พอ','bag-full':'กระเป๋าเต็ม','bad-count':'จำนวนไม่ถูกต้อง','not-sellable':'ขายของชิ้นนี้ไม่ได้','shop-too-far':'เดินเข้าใกล้ร้านก่อน','not-gear':'สวมใส่ไม่ได้','wrong-class':'อาชีพนี้ใช้ไม่ได้','low-level':'เลเวลยังไม่ถึง','slot-empty':'ช่องนี้ว่างอยู่','bad-stat':'ค่าสถานะไม่ถูกต้อง','stat-max':'ค่าสถานะสูงสุดแล้ว','no-stat-points':'แต้มสถานะไม่พอ','gear-rate':'รอสักครู่','not-refinable':'ตีบวกได้เฉพาะอาวุธและเสื้อเกราะที่สวมอยู่','refine-max':'ตีบวกสูงสุด +10 แล้ว','no-ore':'แร่ตีบวกไม่พอ','no-lek-lai':'ไม่มีเหล็กไหล','refine-far':'ต้องตีบวกที่โรงตีครูแสนดาบ','not-card':'ไม่ใช่การ์ด','card-slot':'การ์ดนี้ใส่ช่องนี้ไม่ได้','slot-full':'อุปกรณ์นี้มีการ์ดแล้ว','no-card-slot':'อุปกรณ์นี้ไม่มีช่องการ์ด','storage-far':'คุยกับลุงเรืองที่ท่าน้ำเพื่อเปิดคลัง','coin-cap':'เบี้ยเต็มแล้ว','trade-far':'อยู่ไกลกันเกินไป','trade-busy':'อีกฝ่ายกำลังแลกของอยู่','trade-none':'ไม่ได้แลกของอยู่','trade-locked':'ล็อกข้อเสนอแล้ว แก้ไขไม่ได้','trade-wait':'รออีกฝ่ายล็อกก่อน','stall-city':'ตั้งแผงได้เฉพาะในเมือง','stall-none':'แผงนี้ปิดแล้ว','stall-self':'ซื้อจากแผงตัวเองไม่ได้','recall-here':'อยู่ในเมืองหลวงแล้ว'};
