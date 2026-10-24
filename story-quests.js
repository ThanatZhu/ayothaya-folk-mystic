// Story quests that double as the tutorial (0.98): every quest teaches one system and its reward is what the next
// quest asks you to use (the starter weapon → equip it, iron ore → refine, a card → insert it).
// Shared by the client (offline guests + UI) and the realm server (authoritative online progress and rewards).
// Progress state: {v, quest: index of the current quest, step: index inside it, count: kills toward a defeat step, done}.

export const STORY_TITLE='บทที่ 1 · ประทีปที่ดับพร้อมกัน';
export const STORY_VERSION=3; // v3 removes t13; v2 progress is mapped below instead of restarting the story.

// Step types:
// talk {npc, mapId, say} · defeat {monster (MONSTER_TYPES id), count, mapId} · enter {mapId}
// do {action, how, npc?, mapId?} — finished by using a system (see storySatisfied / the action events below)
// level {level, how} — finished on reaching that base level
// `hint` is the tracker line, `how` the tutorial line under it. A reward item '@weapon' is the class starter weapon.
const C2='บทที่ 2 · โคมผีกลางบึง',C3='บทที่ 3 · สังคมอโยธยา';
export const STORY=[
 {id:'t1',title:'คืนที่ประทีปดับ',reward:{baseXp:30,jobXp:15,coins:100,items:[{id:'@weapon',count:1},{id:'hp-small',count:5}]},steps:[
  {type:'talk',npc:'ลุงเรือง',mapId:'ayutthaya',hint:'คุยกับลุงเรืองที่ท่าน้ำ',how:'แตะชื่อ NPC ที่มีเครื่องหมาย ! หรือกด ▶ เดินไป ให้เดินไปเอง',say:'เจ้ามาถึงในคืนแปลกเสียด้วย ประทีปทั้งเมืองดับพร้อมกัน ทั้งที่ลมยังนิ่ง ก่อนออกไปไหน ไปรับอาวุธจากครูแสนดาบก่อนเถิด'},
  {type:'talk',npc:'ครูแสนดาบ',mapId:'ayutthaya',hint:'รับอาวุธจากครูแสนดาบ',how:'ครูแสนดาบอยู่ที่โรงตีอาวุธในเมือง',say:'ผู้ฝึกตนหน้าใหม่สินะ รับอาวุธติดมือไปก่อน ถือให้มั่นแล้วค่อยไปพบขุนอินทร์'},
 ]},
 {id:'t2',title:'ถืออาวุธให้มั่น',reward:{baseXp:20,jobXp:10,coins:50,items:[{id:'vest-cotton',count:1}]},steps:[
  {type:'do',action:'equip',hint:'สวมอาวุธที่ได้จากครูแสนดาบ',how:'กด กระเป๋า → แตะอาวุธ → กด สวมใส่ (รางวัลถัดไปเป็นเสื้อเกราะ ใส่แบบเดียวกันได้เลย)'},
 ]},
 {id:'t3',title:'สายใยขวัญเส้นแรก',reward:{baseXp:34,jobXp:19,coins:60,items:[{id:'mp-small',count:3}]},steps:[
  {type:'talk',npc:'ขุนอินทร์',mapId:'ayutthaya',hint:'ไปพบขุนอินทร์',say:'ประทีปไม่ได้ดับเพราะลม สายใยขวัญที่ผูกเมืองไว้ขาดไปเส้นหนึ่ง ไปกราบพระปัญญาก่อน ท่านรู้เรื่องสายใยดีที่สุด'},
  {type:'talk',npc:'พระปัญญา',mapId:'ayutthaya',hint:'ไปกราบพระปัญญา',say:'สายใยขวัญผูกความทรงจำของผู้คนไว้กับที่ทาง เส้นที่ขาดลากยาวออกไปทางทุ่งเหนือ เด็กน้อยเจ้าจุกเห็นแสงลอยไปทางนั้น'},
  {type:'talk',npc:'เจ้าจุก',mapId:'ayutthaya',hint:'ถามเจ้าจุกเรื่องแสงลอย',say:'แสงเล็ก ๆ ลอยข้ามประตูเมืองไปทางทุ่งข้าว! พี่ตามไปสิ ป้าละไมอยู่ที่ยุ้งข้าวนั่นแหละ'},
 ]},
 {id:'t4',title:'ทุ่งขวัญข้าว',reward:{baseXp:37,jobXp:20,coins:80,items:[{id:'sticky-rice',count:2}]},steps:[
  {type:'enter',mapId:'rice-fields',hint:'ออกประตูเมืองไปทุ่งขวัญข้าว',how:'เดินออกประตูเมือง หรือกด ▶ เดินไป'},
  {type:'talk',npc:'ป้าละไม',mapId:'rice-fields',hint:'คุยกับป้าละไมที่ยุ้งข้าว',say:'มาถึงก็ดีแล้ว หุ่นฟางขยับเองตั้งแต่ประทีปดับ ช่วยป้าล้มมันให้นิ่งทีเถิด'},
 ]},
 {id:'t5',title:'หุ่นฟางขยับเอง',reward:{baseXp:41,jobXp:23,coins:120,items:[{id:'hp-small',count:5}]},steps:[
  {type:'defeat',monster:'straw',count:5,mapId:'rice-fields',hint:'ล้มหุ่นฟางหลง',how:'แตะมอนเพื่อเลือกเป้า แล้วกดปุ่มดาบ (Space) · เลือดต่ำกด Q ดื่มยาแดง'},
  {type:'talk',npc:'ป้าละไม',mapId:'rice-fields',hint:'กลับไปหาป้าละไม',say:'ข้างในหุ่นฟางมีเส้นด้ายเรืองแสงพันอยู่… ผู้ฝึกตนอย่างเจ้าน่าจะลองเรียนวิชาสักอย่างนะ'},
 ]},
 {id:'t6',title:'วิชาแรกของผู้ฝึกตน',reward:{baseXp:30,jobXp:20,coins:60,items:[{id:'mp-small',count:3}]},steps:[
  {type:'do',action:'skill',hint:'อัปสกิลใหม่ 1 ครั้ง',how:'กด สกิล → แตะสกิลที่กรอบสว่าง → กด + (เรียนฟรี) · ลากลงแถบลัด แล้วกดเลข 1–0 ใช้สกิล'},
 ]},
 {id:'t7',title:'หนูในยุ้งข้าว',reward:{baseXp:48,jobXp:26,coins:500,items:[{id:'iron-ore',count:2},{id:'hp-small',count:5}]},steps:[
  {type:'do',action:'auto',hint:'เปิดออโต้',how:'กดปุ่ม AUTO มุมขวาล่าง (หรือคีย์ F) ตัวละครจะล่าเอง · กดฟันเฟืองที่ปุ่ม AUTO เพื่อตั้งค่าสกิลและยา'},
  {type:'defeat',monster:'rat',count:6,mapId:'rice-fields',hint:'ไล่หนูยุ้งข้าว'},
  {type:'talk',npc:'ป้าละไม',mapId:'rice-fields',hint:'เอาเศษสายใยไปให้ป้าละไม',say:'หนูพวกนี้ฟันคมนัก เอาเศษเหล็กนี่ไปให้ครูแสนดาบตีอาวุธให้แกร่งขึ้นเถิด'},
 ]},
 {id:'t8',title:'เหล็กน้ำพี้',reward:{baseXp:60,jobXp:30,coins:300,items:[{id:'card-rat',count:1},{id:'laterite',count:1}]},steps:[
  {type:'level',level:6,hint:'ล่ามอนจนถึง Lv.6',how:'เปิด AUTO ในทุ่งขวัญข้าว · ภารกิจล่ารางวัลในเมืองก็ให้ EXP'},
  {type:'talk',npc:'ครูแสนดาบ',mapId:'ayutthaya',hint:'กลับไปหาครูแสนดาบ',say:'เหล็กน้ำพี้ดีนี่ มาตีบวกอาวุธกัน +1 ถึง +4 ไม่มีวันแตก ตั้งแต่ +5 ถ้าพลาดของจะแตก เว้นแต่มียันต์กันแตก'},
  {type:'do',action:'refine',npc:'ครูแสนดาบ',mapId:'ayutthaya',hint:'ตีบวกอาวุธเป็น +1',how:'คุยครูแสนดาบ → ตีบวกอาวุธ / เกราะ → กด ตีบวก (ใช้เศษเหล็ก 1 + เบี้ย)'},
 ]},
 {id:'t9',title:'การ์ดใบแรก',reward:{baseXp:40,jobXp:25,coins:200,items:[{id:'hp-small',count:5}]},steps:[
  {type:'do',action:'card',hint:'ใส่การ์ดหนูยุ้งข้าวในอาวุธ',how:'กด สถานะ → ช่องอาวุธ → เลือกการ์ด แล้วกด ใส่การ์ด (ใส่แล้วถอดไม่ได้ · การ์ดดรอปจากมอนแต่ละชนิด)'},
 ]},
 {id:'t10',title:'สวนหมากคลองเก่า',reward:{baseXp:59,jobXp:32,coins:200,items:[{id:'straw-bundle',count:3},{id:'hp-large',count:3}]},steps:[
  {type:'level',level:10,hint:'ล่ามอนจนถึง Lv.10',how:'ทุ่งขวัญข้าวเหมาะกับ Lv.1–12 · ใช้ AUTO ได้'},
  {type:'enter',mapId:'old-orchard',hint:'เดินทางไปสวนหมากคลองเก่า'},
  {type:'talk',npc:'ยายสาย',mapId:'old-orchard',hint:'คุยกับยายสาย',say:'โคมที่ลอยอยู่ในสวนคือประทีปที่หลงชื่อตัวเอง ก่อนไปปลอบมัน ทำยาติดตัวไว้ก่อน ฟางนั่นทำยาได้'},
 ]},
 {id:'t11',title:'ยาของตัวเอง',reward:{baseXp:50,jobXp:28,coins:150,items:[{id:'khao-tom-mat',count:1}]},steps:[
  {type:'do',action:'craft',hint:'คราฟต์ของ 1 ครั้ง',how:'กระเป๋า → ⚒ คราฟต์ → แท็บ ยา → ยาสมุนไพรแดง → ทำ · อาหารเพิ่มสเตตัสได้ 10 นาที'},
 ]},
 {id:'t12',title:'โคมหลงทาง',reward:{baseXp:66,jobXp:36,coins:300,items:[{id:'mp-large',count:3}]},steps:[
  {type:'defeat',monster:'lantern',count:3,mapId:'old-orchard',hint:'ปลอบโคมหลงทาง'},
  {type:'talk',npc:'ยายสาย',mapId:'old-orchard',hint:'กลับไปหายายสาย',say:'แสงในสวนสงบลงแล้ว ก่อนตามเสียงไปโรงสี แวะตลาดแม่บัวเตรียมยาและเสบียงให้พร้อมก่อนนะลูก'},
 ]},
 {id:'t14',title:'ตลาดแม่บัว',reward:{baseXp:50,jobXp:25,coins:300,items:[]},steps:[
  {type:'do',action:'shop',npc:'แม่บัว',mapId:'ayutthaya',hint:'ซื้อหรือขายของกับพ่อค้า 1 ครั้ง',how:'คุยแม่บัวในอยุธยา (หรือป้าละไมในทุ่ง) · ผู้เล่นตั้งแผงขายของกันได้ที่ถนนตลาดแม่บัว'},
 ]},
 {id:'t15',title:'โรงสีใต้เงาจันทร์',reward:{baseXp:140,jobXp:77,coins:1000,items:[{id:'hp-large',count:5},{id:'break-guard',count:1}]},steps:[
  {type:'level',level:18,hint:'ล่ามอนจนถึง Lv.18',how:'สวนหมากคลองเก่าเหมาะกับเลเวลนี้ · ตีบวกอาวุธเพิ่มให้แรงขึ้น'},
  {type:'enter',mapId:'moonlit-mill',hint:'เดินทางไปโรงสีใต้เงาจันทร์'},
  {type:'talk',npc:'จ้อย',mapId:'moonlit-mill',hint:'คุยกับจ้อยที่ทางเข้า',say:'เขาพันเชือกไว้กับตัวจนจำไม่ได้ว่ารอใคร… ช่วยปลดเขาที'},
  {type:'defeat',monster:'mill-keeper',count:1,mapId:'moonlit-mill',hint:'ปลดเชือกเจ้าหุ่นฟางพันเชือก',how:'บอสแรงมาก ชวนเพื่อนมาเป็นปาร์ตี้ได้ · ถอยออกจากวงแดง'},
  {type:'talk',npc:'ขุนอินทร์',mapId:'ayutthaya',hint:'กลับไปรายงานขุนอินทร์',say:'ประทีปที่ท่าน้ำกลับมาสว่างแล้ว! เจ้าผูกสายใยเส้นแรกคืนได้ เมืองนี้ติดหนี้เจ้า'},
 ]},
 {id:'t16',title:'ใต้ถุนโรงสี',reward:{baseXp:120,jobXp:66,coins:800,items:[{id:'lek-lai',count:1}]},steps:[
  {type:'enter',mapId:'mill-cellar',hint:'ลงดันเจี้ยนใต้ถุนโรงสี',how:'ทางลงอยู่ในโรงสีใต้เงาจันทร์ · มาเป็นปาร์ตี้ได้ บอสท้ายดันเจี้ยนดรอปของดี'},
 ]},
 {id:'t17',title:'เส้นทางอาชีพ',reward:{baseXp:150,jobXp:0,coins:1000,items:[{id:'@weapon',count:1}]},steps:[
  {type:'do',action:'job',hint:'เปลี่ยนอาชีพที่ลานครู',how:'Job ตันเมื่อไหร่ จะมีหน้าต่างเควสเด้ง · ไปหาครูประจำสายที่ลานครูแห่งอโยธยา ทำบททดสอบให้ครบ 3 ด่าน'},
 ]},
 {id:'t18',chapter:C2,title:'ข่าวจากบึงบัว',reward:{baseXp:98,jobXp:54,coins:600,items:[{id:'green-herb',count:5}]},steps:[
  {type:'talk',npc:'ขุนอินทร์',mapId:'ayutthaya',hint:'ฟังข่าวจากขุนอินทร์',say:'มีคนเห็นโคมลอยเหนือบึงบัวหลังโรงสี ทั้งที่ประทีปในเมืองสว่างแล้ว ไปดูทีเถิด'},
  {type:'enter',mapId:'lotus-marsh',hint:'เดินทางไปบึงบัวต้องมนตร์ (ผ่านโรงสี)'},
  {type:'talk',npc:'ยายบัวผัน',mapId:'lotus-marsh',hint:'คุยกับยายบัวผัน',say:'หนูในบึงตัวโตผิดปกติ มันกัดสายใยที่ข้าผูกไว้กับต้นบัวจนขาดหมด'},
 ]},
 {id:'t19',chapter:C2,title:'หนูบึงยักษ์',reward:{baseXp:113,jobXp:62,coins:800,items:[{id:'hp-large',count:5}]},steps:[
  {type:'defeat',monster:'marsh-rat',count:6,mapId:'lotus-marsh',hint:'ไล่หนูบึงยักษ์'},
  {type:'talk',npc:'ยายบัวผัน',mapId:'lotus-marsh',hint:'กลับไปหายายบัวผัน',say:'ดีแล้ว ทีนี้เห็นไหม โคมพวกนั้นลอยรวมกันอยู่กลางบึง'},
 ]},
 {id:'t20',chapter:C2,title:'โคมผีบึง',reward:{baseXp:127,jobXp:70,coins:1000,items:[{id:'lek-lai',count:1}]},steps:[
  {type:'defeat',monster:'bog-lantern',count:4,mapId:'lotus-marsh',hint:'ดับโคมผีบึง',how:'ถอยออกจากวงแดงก่อนมันระเบิด'},
  {type:'talk',npc:'ยายบัวผัน',mapId:'lotus-marsh',hint:'บอกยายบัวผัน',say:'โคมดับแล้ว แต่ต้นเหตุยังอยู่ พญาวานรตัวนั้นขโมยประทีปไปซ่อนไว้กลางบึง'},
 ]},
 {id:'t21',chapter:C2,title:'พญาวานรบึง',reward:{baseXp:290,jobXp:160,coins:2500,items:[{id:'vest-chain',count:1}]},steps:[
  {type:'defeat',monster:'marsh-ape',count:1,mapId:'lotus-marsh',hint:'ล้มพญาวานรบึง'},
  {type:'talk',npc:'ขุนอินทร์',mapId:'ayutthaya',hint:'นำประทีปกลับไปให้ขุนอินทร์',say:'ประทีปดวงสุดท้ายกลับมาแล้ว อยุธยาติดค้างบุญคุณเจ้าอีกครั้ง คนเก่งอย่างเจ้าควรมีพวกพ้องนะ'},
 ]},
 {id:'t22',chapter:C3,title:'พวกพ้อง',reward:{baseXp:150,jobXp:80,coins:1000,items:[{id:'break-guard',count:1}]},steps:[
  {type:'do',action:'guild',hint:'สร้างหรือเข้าร่วมกิลด์',how:'กด สังคม → กิลด์ · ทุกวันเสาร์ 20:00 มีกิลด์วอร์ยึดป้อมโรงสี'},
 ]},
 {id:'t23',chapter:C3,title:'ประลองฝีมือ',reward:{baseXp:150,jobXp:80,coins:1500,items:[{id:'lek-lai',count:2}]},steps:[
  {type:'do',action:'duel',hint:'ประลองกับผู้เล่นอื่น 1 ครั้ง',how:'รายชื่อผู้เล่น → ท้าดวล (นอกเมือง) · ชนะสะสมแต้มทัวร์นาเมนต์รายสัปดาห์ (ดูที่ อันดับ)'},
 ]},
];

// Starter weapon per class for '@weapon' rewards (novice gets the hand wraps; a new class gets its own weapon).
export const STARTER_WEAPON={novice:'wrap-novice',swordsman:'sword-iron',lancer:'spear-bamboo',hunter:'bow-bamboo',boxer:'gloves-hemp',rogue:'daggers-twin',shaman:'staff-wan',acolyte:'beads-wood'};
export const rewardItems=(reward,classId)=>(reward?.items??[]).map(i=>i.id==='@weapon'?{...i,id:STARTER_WEAPON[classId]??'wrap-novice'}:i);

export function normalizeStory(state){
 const s=state&&typeof state==='object'&&[2,STORY_VERSION].includes(state.v)?state:{};
 const old=Number.isInteger(s.quest)?Math.min(Math.max(s.quest,0),STORY.length+(s.v===2?1:0)):0;
 const quest=s.v===2&&old>12?old-1:old; // old t13 (index 12) now points straight to t14; no reward is granted.
 const done=quest>=STORY.length;
 const steps=done?0:STORY[quest].steps.length;
 const step=!done&&Number.isInteger(s.step)?Math.min(Math.max(s.step,0),steps-1):0;
 const goal=done?0:STORY[quest].steps[step].count??0;
 const count=Number.isInteger(s.count)?Math.min(Math.max(s.count,0),goal):0;
 return {v:STORY_VERSION,quest,step,count,done};
}

// What the player should do now: {quest, step, index:{quest,step}, progress} or null when the story is finished.
export function currentObjective(state){
 const s=normalizeStory(state);if(s.done)return null;
 const quest=STORY[s.quest],step=quest.steps[s.step];
 return {quest,step,count:s.count,stepNumber:s.step+1,steps:quest.steps.length};
}

// Whether a do/level step is already true for the player (ctx is built by the server, or the client offline):
// {level, weapon, refined, carded, job, skilled, auto, guild}. Event-only actions (craft, pet, shop, duel) return false.
export function storySatisfied(step,ctx){
 if(!step||!ctx)return false;
 if(step.type==='level')return ctx.level>=step.level;
 if(step.type!=='do')return false;
 return !!({equip:ctx.weapon,refine:ctx.refined,card:ctx.carded,job:ctx.job,skill:ctx.skilled,auto:ctx.auto,guild:ctx.guild})[step.action];
}

// event: {type:'talk', npc, mapId} | {type:'defeat', monster, mapId} | {type:'enter', mapId} | {type:'do', action}
// | {type:'check', ctx} (completes a do/level step that is already true). Returns {state, changed, say?, completed?, reward?}.
export function storyEvent(state,event){
 const s=normalizeStory(state);if(s.done||!event)return {state:s,changed:false};
 const quest=STORY[s.quest],step=quest.steps[s.step];
 if(event.type==='check'){if(!storySatisfied(step,event.ctx))return {state:s,changed:false};}
 else if(step.type==='do'){if(event.type!=='do'||event.action!==step.action)return {state:s,changed:false};}
 else{
  if(event.type!==step.type||event.mapId!==step.mapId)return {state:s,changed:false};
  if(step.type==='talk'&&event.npc!==step.npc)return {state:s,changed:false};
  if(step.type==='defeat'){
   if(event.monster!==step.monster)return {state:s,changed:false};
   const count=s.count+1;
   if(count<step.count)return {state:{...s,count},changed:true};
  }
 }
 // Step complete: advance; finishing the last step completes the quest and pays its reward.
 const say=step.say;
 if(s.step+1<quest.steps.length)return {state:{...s,step:s.step+1,count:0},changed:true,say};
 const next=s.quest+1;
 return {state:normalizeStory({v:STORY_VERSION,quest:next,step:0,count:0}),changed:true,say,completed:quest,reward:quest.reward};
}

// Next map to walk to on the way from `from` to `to`, following portals (breadth-first). null if unreachable.
export function nextHop(maps,from,to){
 if(from===to)return to;
 const seen=new Set([from]),queue=[[from,null]];
 while(queue.length){
  const [id,first]=queue.shift();
  for(const p of maps.find(m=>m.id===id)?.portals??[]){
   if(seen.has(p.to))continue;seen.add(p.to);
   const hop=first??p.to;if(p.to===to)return hop;queue.push([p.to,hop]);
  }
 }
 return null;
}
