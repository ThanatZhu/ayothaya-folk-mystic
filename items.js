// Items, loot, coins (เบี้ย) and NPC shops. Pure rules shared by the client (offline guests + UI) and the realm
// server (authoritative online bag). Bag state: {coins, items:{[id]:count}}.
// Art: one atlas, 6x4 cells of 256 px (1536x1024, transparent). Drop a finished file over the same path to re-skin.
export const ITEM_ATLAS='assets/items42/items.png';
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
 'return-incense':{icon:17,name:'ธูปกลับเมือง',kind:'reserved',sell:0,text:'(เร็ว ๆ นี้) จุดแล้วกลับเมืองหลวง'},
 'cowrie':{icon:18,name:'เบี้ย',kind:'ui'},'cowrie-pile':{icon:19,name:'กองเบี้ย',kind:'ui'},
 'cloth-bag':{icon:20,name:'ถุงย่าม',kind:'ui'},'shop-sign':{icon:21,name:'ป้ายร้านค้า',kind:'ui'},
 'loot-bundle':{icon:22,name:'ห่อผ้า',kind:'ui'},'treasure-chest':{icon:23,name:'หีบสมบัติ',kind:'reserved',sell:0},
};
const BAGGABLE=id=>['loot','potion'].includes(ITEMS[id]?.kind);

// Per monster id (MONSTER_TYPES[].id): coins [min,max] and independent item rolls [id, chance, count=1].
export const DROPS={
 straw:{coins:[3,7],items:[['straw-bundle',.55],['rice-sheaf',.1],['spirit-thread',.03]]},
 rat:{coins:[2,5],items:[['rat-tooth',.6],['spirit-thread',.03]]},
 hopper:{coins:[5,10],items:[['hopper-wing',.5],['hp-small',.08]]},
 monkey:{coins:[9,16],items:[['betel-nut',.5],['hp-small',.1],['spirit-thread',.04]]},
 vine:{coins:[11,19],items:[['tough-vine',.5],['mp-small',.08]]},
 lantern:{coins:[14,24],items:[['lantern-paper',.5],['palm-leaf',.05],['spirit-thread',.05]]},
 'rat-chief':{coins:[80,140],items:[['rat-crown',.3],['spirit-thread',.5],['hp-large',.5,2]]},
 'monkey-chief':{coins:[120,200],items:[['monkey-bangle',.3],['spirit-thread',.6],['mp-large',.5,2]]},
 'mill-keeper':{coins:[400,600],items:[['spirit-rope',1],['palm-leaf',.5,2],['hp-large',1,3]]},
};

// Shops keyed by NPC name; the server also checks the player stands next to that NPC in that map.
export const SHOPS={
 'แม่บัว':{mapId:'ayutthaya',title:'แผงยาแม่บัว',stock:['hp-small','hp-large','mp-small','mp-large','sticky-rice']},
 'ป้าละไม':{mapId:'rice-fields',title:'ยุ้งป้าละไม',stock:['hp-small','mp-small','sticky-rice']},
};

const int=(v,min,max)=>Number.isSafeInteger(v)?Math.min(Math.max(v,min),max):min;
export function normalizeBag(bag){
 const b=bag&&typeof bag==='object'?bag:{},items={};
 for(const [id,n] of Object.entries(b.items&&typeof b.items==='object'?b.items:{})){
  if(!BAGGABLE(id))continue;const c=int(n,0,MAX_STACK);if(c>0&&Object.keys(items).length<BAG_SLOTS)items[id]=c;
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
 const item=ITEMS[id];if(!item||!BAGGABLE(id)||!item.sell)throw new Error('not-sellable');
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

export function itemLabel(list){return list.map(({id,count:n})=>(ITEMS[id]?.name??id)+(n>1?' ×'+n:'')).join(', ');}

// Player-facing reasons (shown as a notice) for the error codes above.
export const ITEM_ERRORS={'not-usable':'ใช้ไอเทมนี้ไม่ได้','no-item':'ไม่มีไอเทมนี้ในกระเป๋า','already-full':'HP / MP เต็มอยู่แล้ว','defeated':'หมดแรงอยู่ ใช้ยาไม่ได้','item-rate':'รอสักครู่ก่อนใช้อีกครั้ง','not-sold':'ร้านนี้ไม่ได้ขายของชิ้นนี้','no-coins':'เบี้ยไม่พอ','bag-full':'กระเป๋าเต็ม','bad-count':'จำนวนไม่ถูกต้อง','not-sellable':'ขายของชิ้นนี้ไม่ได้','shop-too-far':'เดินเข้าใกล้ร้านก่อน'};
