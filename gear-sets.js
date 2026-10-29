import {weaponCraftRecipes,WEAPON_MATERIALS} from './weapon-crafting.js';
import {rainbowRecipe} from './rainbow-crafting.js';
// 0.117 gear sets (docs/gear-sets-proposal.md, owner-approved draft numbers): replaces every pre-0.117 weapon/armor/head/
// garment/shoes item. Accessories stay as they were. Pure data + rules, shared by the client and the realm server.
// Art: assets/gear2/<sheet>-<cell>.webp, sliced from the 57 generated sheets (outputs/gear-sets/manifest.json).
// Class sheets are 4x6: rows = families in FAMILIES order, columns = head · armor · garment · shoes, cell 20 = weapon.
// Boss sheets are 3x2: weapon · head · armor · garment · shoes. Starter: head · armor · garment · shoes · weapon (wraps).

export const TIERS=[10,25,40,55,70,85]; // wear level per tier 1..6
export const TIER_WORDS=['one','two','three','four','five','six']; // item ids are [a-z-], so no digits
const TIER_PLACE=['ทุ่งนา','บึงบัว','ป่าไผ่','หิมพานต์','นาคบาดาล','ไกรลาส'];
export const SET_SLOTS=['head','armor','garment','shoes'];
const SLOT_WORD={head:'หมวก',armor:'เสื้อ',garment:'ผ้าคลุม',shoes:'รองเท้า'};
// 8 looks. monk and nun are the acolyte class drawn for each gender (not new classes); nun has no weapon of her own.
export const LOOKS=[['swordsman','นักดาบ'],['lancer','นักทวน'],['hunter','นายพราน'],['boxer','นักมวย'],['rogue','จอมโจร'],['shaman','หมอผี'],['monk','พระ'],['nun','แม่ชี']];
// the class a look's armor belongs to (monk and nun are both the acolyte)
export const lookClass=look=>look==='monk'||look==='nun'?'acolyte':look;
export const gearLook=(classId,gender)=>classId==='acolyte'?(gender==='female'?'nun':'monk'):LOOKS.some(([l])=>l===classId)?classId:null;
// [class, weapon word, stat, power, look whose sheet holds the weapon]
export const WEAPON_CLASSES=[['swordsman','ดาบ','atk',1,'swordsman'],['lancer','ทวน','atk',1.07,'lancer'],['hunter','ธนู','atk',.93,'hunter'],
 ['boxer','นวม','atk',.93,'boxer'],['rogue','มีดคู่','atk',.87,'rogue'],['shaman','ไม้เท้า','matk',1,'shaman'],['acolyte','ประคำ','matk',.9,'monk']];
const CLASS_NAME={swordsman:'นักดาบ',lancer:'นักทวน',hunter:'นายพราน',boxer:'นักมวย',rogue:'จอมโจร',shaman:'หมอผี',acolyte:'พระ / แม่ชี',novice:'ผู้ฝึกตน'};

// Set families. piece: what every piece adds on its own. main/second: the 4-piece total per tier (2 pieces give 40% of main).
export const FAMILIES=[
 {key:'pierce',name:'ทะลวง',piece:{armorPen:.01},main:['armorPen',[.10,.15,.20,.25,.30,.35]],
  sets:['เขี้ยวหนูนา','หนามบึง','หนามไผ่ทะลวง','งาคชสาร','เขี้ยวอสรพิษ','ครุฑทะลวงฟ้า']},
 {key:'exec',name:'เพชฌฆาต',piece:{crit:.01},main:['crit',[.05,.07,.09,.11,.13,.15]],second:['critDmg',[.15,.20,.30,.40,.50,.60]],
  sets:['เงาลูกลิง','โคมผีบึง','เงาปอบ','ลายเสือเถาวัลย์','เกล็ดหยก','ยักษ์เมฆา']},
 {key:'mantra',name:'มนตรา',piece:{cdr:.01},main:['cdr',[.05,.08,.11,.14,.17,.20]],second:['mpCut',[.05,.08,.10,.12,.15,.18]],
  sets:['ยันต์ใบข้าว','บัวมนตร์','ระฆังอาคม','เห็ดหมอกฤๅษี','มณีนาคา','เทพไกรลาส']},
 {key:'wall',name:'กำแพงเพชร',piece:{dmgReduce:.01},main:['hpPct',[.08,.12,.16,.20,.25,.30]],second:['dmgReduce',[.03,.05,.07,.09,.11,.13]],
  sets:['หุ่นฟางเหล็ก','กระดองเต่าบัว','ยักษ์ศิลา','หมูป่าเขาแก้ว','กระดองปูศิลา','เขาผลึก']},
 {key:'wind',name:'วายุ',piece:{aspd:.01},main:['aspd',[.05,.08,.11,.14,.17,.20]],second:['moveSpeed',[.03,.04,.05,.06,.08,.10]],
  sets:['ปีกตั๊กแตน','ลมโรงสี','ค้างคาวราตรี','นกเปลวใบไม้','ธารบาดาล','ปักษาวายุ']},
];
const ATK_PCT=[.03,.04,.05,.06,.07,.08]; // 4-piece ATK/MATK bonus per tier
export const STAT_NAME={armorPen:'เจาะเกราะ',crit:'คริ',critDmg:'ความแรงคริ',cdr:'ลดคูลดาวน์',mpCut:'ลด MP',hpPct:'HP',dmgReduce:'ลดดาเมจที่ได้รับ',
 aspd:'ความเร็วโจมตี',moveSpeed:'ความเร็วเดิน',atkPct:'ATK',matkPct:'MATK',defPct:'DEF',hit:'HIT'};
export const STAT_CAPS={armorPen:.5,crit:.5,cdr:.4,mpCut:.4,dmgReduce:.3,moveSpeed:.15};
const pct=(k,n)=>STAT_NAME[k]+' +'+(k==='hit'?n:+(n*100).toFixed(1)+'%');

// Grades (frame colours). Index 0 has no id suffix; 1..4 travel as '^1'..'^4'. Set bonuses ignore the grade.
export const GRADES=[{name:'ธรรมดา',color:'#5fb8ff',mul:1,chance:.60},{name:'ดี',color:'#5fd27a',mul:1.1,chance:.25},{name:'หายาก',color:'#b678ff',mul:1.25,chance:.10},
 {name:'ตำนาน',color:'#ff9a3c',mul:1.4,chance:.04},{name:'เทพ',color:'#ff4b4b',mul:1.6,chance:.01}];
export const RAINBOW={name:'บอส',color:'rainbow'};
// Random red grades only roll on boss drops. Weapon crafting chooses its explicit progression grade.
export function rollGrade(rand=Math.random,boss=false){const r=rand();let acc=0;for(let g=GRADES.length-1;g>0;g--){if(g===4&&!boss)continue;acc+=GRADES[g].chance;if(r<acc)return g;}return 0;}

// Boss sets (rainbow): Lv.80, base = red grade of tier 6, crafted from boss shards. Effects marked live:false need new
// combat mechanics and are shown as "coming soon" until the server implements them.
export const BOSS_SETS={
 swordsman:{name:'ขุนศึกอโยธยา',bonus:{2:{defPct:.15}},soon:{3:'HP ต่ำกว่า 30% ได้โล่ 20% ของ HP (ทุก 60 วิ)',5:'โดนตีสะสม "แค้น" ครบ 10 ชั้น สกิลถัดไปแรง x2'}},
 lancer:{name:'ทวนพญาครุฑ',bonus:{},soon:{2:'ระยะโจมตี +0.5',3:'ตีศัตรูที่อยู่ไกลแรงขึ้น 15%',5:'ตีปกติครบ 5 ครั้ง ปล่อยคลื่นทวนแทงทะลุ'}},
 hunter:{name:'พรานหิมพานต์',bonus:{2:{hit:20}},soon:{3:'ยิงปกติมีโอกาส 15% ยิงเพิ่มอีก 1 ดอก',5:'ยิงเป้าเดิมติดกัน 5 ครั้ง ครั้งที่ 6 คริแน่นอน'}},
 boxer:{name:'ครูมวยหนุมาน',bonus:{2:{aspd:.10}},soon:{3:'ตีต่อเนื่อง ดาเมจ +3% ต่อชั้น (สูงสุด 10 ชั้น)',5:'ครบ 10 ชั้น สกิลถัดไปไม่ติดคูลดาวน์'}},
 rogue:{name:'เงาราตรี',bonus:{2:{crit:.08}},soon:{3:'ติดคริแล้วเดินเร็ว +20% นาน 3 วิ',5:'ตีเป้าที่ HP ต่ำกว่า 30% แรงขึ้น 40%'}},
 shaman:{name:'อาคมนวหรคุณ',bonus:{2:{matkPct:.10}},soon:{3:'สกิลวงทิ้งไฟเผาพื้นไว้ 3 วิ',5:'ใช้สกิลครบ 4 ครั้ง ปล่อยวิญญาณโจมตีฟรี 1 ครั้ง'}},
 acolyte:{name:'พุทธคุณ',bonus:{},soon:{2:'ฮีลแรงขึ้น 15%',3:'ฮีลเกินหลอด กลายเป็นโล่ (สูงสุด 15% ของ HP)',5:'เพื่อนรอบตัวโดนตีเจ็บน้อยลง 10% (ออร่า)'}},
};
export const SHARDS=[['shard-soul','เศษวิญญาณบอส','บอสต่ำกว่า Lv.60'],['shard-gem','เศษมณีบอส','บอส Lv.60–98'],['shard-divine','เศษเทพ','บอสร่างตื่น และยักษ์เมฆา Lv.99']];


const L=t=>TIERS[t-1],price=(t,k)=>Math.max(100,Math.round(L(t)*L(t)*k/100)*100);
const DEF_PER={head:.12,armor:.55,garment:.1,shoes:.1};
const img=(sheet,cell)=>'assets/gear2/'+sheet+'-'+cell+'.webp';
export const pieceId=(family,slot,look,tier)=>family+'-'+slot+'-'+look+'-'+TIER_WORDS[tier-1];
export const weaponId=(cls,tier)=>'weapon-'+cls+'-'+TIER_WORDS[tier-1];
export const bossId=(slot,who)=>'boss-'+slot+'-'+who; // who = look for armor pieces, class for the weapon
export const STARTER=['starter-headband','starter-shirt','starter-cloth','starter-sandals','starter-wraps'];

function defStats(slot,level){const def=Math.max(1,Math.round(DEF_PER[slot]*level));return {def,mdef:Math.max(1,Math.round(def*.5))};}
// Tooltip text = stat line (recomputed for each grade) + the item's note.
export const gearText=it=>[statLine(it),it.note].filter(Boolean).join(' · ');
// A graded copy: base ATK/MATK/DEF/MDEF and the sell price scale with the grade; the per-piece % and set bonus do not.
export function gradeItem(it,g){const k=GRADES[g].mul,o={...it,grade:g,sell:Math.round(it.sell*k*k)};for(const s of ['atk','matk','def','mdef'])if(it[s])o[s]=Math.round(it[s]*k);o.text=gearText(o);return o;}
const statLine=it=>[...['atk','matk','def','mdef'].filter(k=>it[k]).map(k=>k.toUpperCase()+' +'+it[k]),...Object.entries(it.pct??{}).map(([k,n])=>pct(k,n))].join(' · ');

// Builds every 0.117 gear item; items.js merges them into ITEMS.
export function buildGearItems(){
 const out={};
 FAMILIES.forEach((f,fi)=>LOOKS.forEach(([look,lookName])=>{for(let t=1;t<=6;t++)SET_SLOTS.forEach((slot,si)=>{
  const it={image:img(look+'-t'+t,fi*4+si),name:SLOT_WORD[slot]+f.sets[t-1]+' ('+lookName+')',kind:'gear',slot,level:L(t),
   set:{family:f.key,tier:t},look,...defStats(slot,L(t)),pct:{...f.piece},sell:Math.round(price(t,slot==='armor'?4:2)/4),graded:true};
  if(slot!=='armor')it.slots=0;
  it.note='ชุด'+f.name+' ขั้น '+t+' · Lv.'+L(t);it.text=gearText(it);
  out[pieceId(f.key,slot,look,t)]=it;
 });}));
 for(const [cls,word,stat,power,look] of WEAPON_CLASSES)for(let t=1;t<=6;t++){
  const it={image:img(look+'-t'+t,20),name:word+TIER_PLACE[t-1],kind:'gear',slot:'weapon',classes:[cls],level:L(t),tier:t,[stat]:Math.round(2*L(t)*power),
   sell:Math.round(price(t,5)/4),graded:true};
  it.note=CLASS_NAME[cls]+' · ขั้น '+t+' · Lv.'+L(t)+' · คราฟที่ครูแสนดาบ';it.text=gearText(it);
  out[weaponId(cls,t)]=it;
 }
 // Boss sets: armor pieces per look, weapons per class (nun shares the monk's beads).
 const top=x=>Math.round(x*GRADES[4].mul);
 for(const [look,lookName] of LOOKS){
  const cls=look==='monk'||look==='nun'?'acolyte':look,b=BOSS_SETS[cls];
  SET_SLOTS.forEach((slot,si)=>{const d=defStats(slot,85),it={image:img('boss-'+look,si+1),name:SLOT_WORD[slot]+b.name+' ('+lookName+')',kind:'gear',slot,level:80,
   bossSet:cls,look,def:top(d.def),mdef:top(d.mdef),sell:20000,rainbow:true};
   if(slot!=='armor')it.slots=0;it.note='เซ็ทบอส'+b.name+' · Lv.80';it.text=gearText(it);out[bossId(slot,look)]=it;});
 }
 for(const [cls,word,stat,power,look] of WEAPON_CLASSES){const b=BOSS_SETS[cls],it={image:img('boss-'+look,0),name:word+b.name,kind:'gear',slot:'weapon',classes:[cls],
  level:80,bossSet:cls,[stat]:top(Math.round(2*85*power)),sell:40000,rainbow:true};it.note='เซ็ทบอส'+b.name+' · Lv.80';it.text=gearText(it);out[bossId('weapon',cls)]=it;}
 // Novice starter kit (shop, Lv.1, no set): wraps are the Novice weapon, the rest fit everyone.
 const starter=[['ผ้าคาดหัวขาวม้า','head',{def:1},120],['เสื้อผ้าฝ้ายชาวบ้าน','armor',{def:3,mdef:1},150],['ผ้าขาวม้าพาดบ่า','garment',{def:1},150],
  ['รองเท้าแตะสานใบตาล','shoes',{def:1},150],['ผ้าพันหมัดผู้ฝึกตน','weapon',{atk:6},120]];
 starter.forEach(([name,slot,stats,buy],i)=>{const it={image:img('starter',i),name,kind:'gear',slot,level:1,...stats,buy,sell:Math.round(buy/4),starter:true};
  if(slot==='weapon')it.classes=['novice'];if(slot!=='armor'&&slot!=='weapon')it.slots=0;it.note='ชุดเริ่มต้น'+(slot==='weapon'?' · ผู้ฝึกตน':'');it.text=gearText(it);out[STARTER[i]]=it;});
 // Shard icons reuse loot cells (tinted) until painted art lands.
 SHARDS.forEach(([id,name,from],i)=>{out[id]={icon:[4,11,10][i],tint:['wind','gold','violet'][i],name,kind:'loot',sell:[200,600,2000][i],text:'ใช้คราฟเซ็ทบอสที่ครูแสนดาบ · ดรอปจาก'+from};});
 return out;
}

// Weapon and boss-set recipes for crafting.js. Tier materials are the Chapter II map relics of that level band.
const BOSS_MATERIALS={weapon:[40,25,10],piece:[20,12,5]};
const TIER_RELIC=['relic-rice','relic-mill','relic-bamboo','relic-himmapan','relic-naga','relic-kailash'];
export function gearRecipes(items){
 const r=[];
 for(const [cls] of WEAPON_CLASSES)for(let t=1;t<=6;t++){const needs={[WEAPON_MATERIALS[t-1][0]]:10+5*t,'iron-ore':2*t};if(t>1)needs['lek-lai']=t-1;
  r.push(...weaponCraftRecipes({out:weaponId(cls,t),count:1,group:'gear',needs,coins:price(t,5)/2}));}
 for(const id of Object.keys(items).filter(id=>items[id].bossSet)){const [a,b,c]=items[id].slot==='weapon'?BOSS_MATERIALS.weapon:BOSS_MATERIALS.piece;r.push(rainbowRecipe(id,{'shard-soul':a,'shard-gem':b,'shard-divine':c}));}
 return r;
}

// Tier of set gear a monster drops (Lv.5+), by its level band in the proposal's map table.
// 0.123 maps step up from Lv.10–22: a monster drops the highest tier its level can wear (as the rebirth maps do)
export const dropTier=level=>TIERS.filter(t=>level>=t).length;
// Drop rules per monster: normal 2% / elite 6% for one head·garment·shoes piece; bosses add the armor and shards.
export function setDrops(m){
 const tier=dropTier(m.level??1);if(!tier)return null;
 if(m.boss)return {tier,piece:.5,armor:.25,boss:true};
 return {tier,piece:m.elite?.06:.02,armor:0,boss:false};
}
export function shardDrop(m){
 if(!m.boss)return null;if(m.id.endsWith('-awakened')||(m.level??1)>=99)return ['shard-divine',.5,1];
 return (m.level??1)>=60?['shard-gem',1,2]:['shard-soul',1,3];   // 0.123 was 50: the ป่าไผ่ boss (now Lv.58) still drops soul shards
}
// Resolves a set roll for the killer's look (Novice: any look) and rolls the grade.
export function rollSetPiece(rule,look,rand=Math.random){
 const out=[];const pick=a=>a[Math.floor(rand()*a.length)%a.length];
 const lk=look??pick(LOOKS)[0],fam=()=>pick(FAMILIES).key;
 if(rand()<rule.piece)out.push(withGrade(pieceId(fam(),pick(['head','garment','shoes']),lk,rule.tier),rollGrade(rand,rule.boss)));
 if(rule.armor&&rand()<rule.armor)out.push(withGrade(pieceId(fam(),'armor',lk,rule.tier),rollGrade(rand,rule.boss)));
 return out;
}
export const withGrade=(id,grade)=>grade>0?id+'^'+grade:id;

// Set bonuses from worn items (itemDef results). Mixed tiers of one family count at the lowest tier.
export function setBonuses(worn){
 const total={},add=(k,n)=>{total[k]=(total[k]??0)+n;},active=[];
 for(const it of worn)for(const [k,n] of Object.entries(it.pct??{}))add(k,n);
 for(const f of FAMILIES){const pieces=worn.filter(it=>it.set?.family===f.key);if(pieces.length<2)continue;
  const t=Math.min(...pieces.map(it=>it.set.tier)),[mk,mv]=f.main;
  if(pieces.length>=4){add(mk,mv[t-1]);if(f.second)add(f.second[0],f.second[1][t-1]);add('atkPct',ATK_PCT[t-1]);add('matkPct',ATK_PCT[t-1]);}
  else add(mk,mv[t-1]*.4);
  active.push({family:f.key,count:pieces.length,tier:t});}
 for(const [cls,b] of Object.entries(BOSS_SETS)){const n=worn.filter(it=>it.bossSet===cls).length;
  for(const [need,bonus] of Object.entries(b.bonus))if(n>=+need)for(const [k,v] of Object.entries(bonus))add(k,v);
  if(n)active.push({boss:cls,count:n});}
 return {total,active};
}
// Lines for the equipment window / tooltip: [text, reached].
export function setLines(familyKey,tier,count){
 const f=FAMILIES.find(f=>f.key===familyKey),t=tier,[mk,mv]=f.main;
 const four=[pct(mk,mv[t-1]),...(f.second?[pct(f.second[0],f.second[1][t-1])]:[]),'ATK/MATK +'+ATK_PCT[t-1]*100+'%'].join(' · ');
 return [['2 ชิ้น: '+pct(mk,mv[t-1]*.4),count>=2],['4 ชิ้น: '+four,count>=4]];
}
export function bossLines(cls,count){
 const b=BOSS_SETS[cls],lines=[];
 for(const need of [2,3,5]){const live=b.bonus[need],text=live?Object.entries(live).map(([k,v])=>pct(k,v)).join(' · '):b.soon[need];
  if(text)lines.push([need+' ชิ้น: '+text+(live?'':' (เร็วๆ นี้)'),count>=need]);}
 return lines;
}
export const familyName=key=>FAMILIES.find(f=>f.key===key)?.name??key;
