// Pixel townspeople: one strip of eight player-sized frames per person (scripts/build-pixel-monsters.py, npc mode).
// Poses: idle, idle breath, talk, talk, greeting, walk, step, walk. Same shape as loadLifeArt, so npc-life-animation plays it.
const ROOT='./assets/pixel/',VERSION='?v=1';
const NAMED={
 'ลุงเรือง':'np-uncle-rueang','ขุนอินทร์':'np-khun-in','แม่บัว':'np-mae-bua','ครูแสนดาบ':'np-khru-saen-dap','เจ้าจุก':'np-chao-chuk',
 'พระปัญญา':'np-phra-panya','ขุนพลชุมพล':'np-khunphon-chumphon','ยายจันทร์':'np-yai-chan',
 'ขุนอินทรเดช':'np-mentor-swordsman','ครูหญิงพิกุล':'np-mentor-lancer','พรานแม่แก้ว':'np-mentor-hunter','ครูคง':'np-mentor-boxer',
 'แม่เงาจันทร์':'np-mentor-rogue','ปู่คำสิงห์':'np-mentor-shaman','หลวงพ่อปัญญาธร':'np-mentor-monk','แม่ชีบุญเรือน':'np-mentor-nun',
 'ป้าละไม':'np-pa-lamai','ยายสาย':'np-yai-sai','จ้อย':'np-joi','ยายบัวผัน':'np-yai-buaphan','พระครูชุมพล':'np-phra-khru-chumphon',
 'พรานป่าเฝ้าทางเข้า':'np-forest-ranger','หมอยาสมุนไพร':'np-herb-doctor','พระธุดงค์ชรา':'np-forest-monk','ช่างปูนบูรณะวัด':'np-plasterer',
 'เจ้าเมืองลับแล':'np-lablae-lord','แม่ค้าตลาดน้ำ':'np-floating-seller','ช่างตีบวกขั้นสูง':'np-master-smith','คนเฝ้าคลังของ':'np-vault-keeper',
 'ครูสอนสกิลขั้นสูง':'np-master-trainer','ฤาษีเฝ้าป่า':'np-forest-hermit','นักล่ากิเลน':'np-kilen-hunter','นักสำรวจถ้ำ':'np-cave-explorer',
 'ผู้เฝ้าประตูนาค':'np-naga-gatekeeper','เทวดาผู้เฝ้ายอดเขา':'np-mountain-deva','ฤาษีชรา':'np-old-hermit','วิญญาณครู':'np-spirit-teacher',
 'มาลัย':'np-malai','ทิพย์สุวรรณ':'np-thipsuwan','นางจันทรา':'np-nang-chantra'
};
// Walking townsfolk are styled by their sheet row (city-life-data.js CITIZEN_STYLES).
const CITIZENS={
 'citizens-market-0':'np-citizen-seller','citizens-market-1':'np-citizen-porter','citizens-market-2':'np-citizen-florist','citizens-market-3':'np-citizen-cook',
 'citizens-river-0':'np-citizen-farmer','citizens-river-1':'np-citizen-boatman','citizens-river-2':'np-citizen-elder','citizens-river-3':'np-citizen-weaver'
};
// Every strip is drawn at hero height; children and the very old stand a little shorter.
const SCALE={'np-chao-chuk':.78,'np-yai-sai':.86,'np-joi':.86,'np-yai-chan':.9};
export const PIXEL_NPC_ARTS=new Set([...Object.values(NAMED),...Object.values(CITIZENS)]);
export const pixelNPCArt=n=>n?.citizen?CITIZENS[n.sheet+'-'+(n.row??0)]??null:NAMED[n?.name]??null;
export const isPixelNPCArt=id=>PIXEL_NPC_ARTS.has(id);

let list=null;const strips=new Map();
const sizes=()=>list??=fetch(ROOT+'npcs.json'+VERSION).then(r=>{if(!r.ok)throw Error('pixel npcs');return r.json();}).catch(e=>{list=null;throw e;});
function frames(art){
 if(!strips.has(art))strips.set(art,(async()=>{
  const cell=(await sizes())[art]?.cell;if(!cell)throw Error('pixel npc missing '+art);
  const image=new Image();image.src=ROOT+art+'.png'+VERSION;await image.decode();
  return Array.from({length:8},(_,i)=>{const c=document.createElement('canvas');c.width=c.height=cell;c.getContext('2d').drawImage(image,i*cell,0,cell,cell,0,0,cell,cell);return c;});
 })().catch(e=>{strips.delete(art);throw e;}));
 return strips.get(art);
}
export async function pixelNPCLife(art){
 const f=await frames(art),clip=(cells,timing)=>({frames:cells.map(i=>f[i]),...timing,source:'authored'});
 return {id:art,pixel:true,facing:'right',worldScale:SCALE[art]??1,review:'draft',clips:{
  idle:clip([0,1],{frameDurations:[.9,.9],loop:true}),
  // No sitting pose was drawn: a resting townsperson stays standing.
  sit:clip([0,1],{frameDurations:[1.2,1.2],loop:true}),
  talk:clip([2,3],{frameDurations:[.3,.3],loop:true}),
  bow:clip([4],{frameDurations:[1.2],loop:false}),
  walk:clip([5,6,7,6],{fps:6,loop:true}),
  run:clip([5,6,7,6],{fps:9,loop:true})
 }};
}
// Dialogue and character windows paint a still: the standing frame, enlarged by whole pixels.
export async function pixelNPCStanding(art){
 const [first]=await frames(art),scale=Math.max(1,Math.floor(320/first.width)),c=document.createElement('canvas');
 c.width=c.height=first.width*scale;const ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.drawImage(first,0,0,c.width,c.height);return c;
}
