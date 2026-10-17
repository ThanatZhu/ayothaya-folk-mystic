// Chapter 1 story quests ("ประทีปที่ดับพร้อมกัน") across the current four maps, plus the pure progress rules.
// Shared by the client (offline guests + UI) and the realm server (authoritative online progress and rewards).
// Progress state: {quest: index of the current quest, step: index inside it, count: kills toward a defeat step, done: bool}.

export const STORY_TITLE='บทที่ 1 · ประทีปที่ดับพร้อมกัน';

// Step types: talk {npc, mapId} · defeat {monster (MONSTER_TYPES id), count, mapId} · enter {mapId}.
// `say` is what the NPC says when that talk step completes; `hint` is the tracker line.
export const STORY=[
 {id:'s1',title:'คืนที่ประทีปดับ',reward:{baseXp:20,jobXp:10,coins:50,items:[{id:'hp-small',count:3}]},steps:[
  {type:'talk',npc:'ลุงเรือง',mapId:'ayutthaya',hint:'คุยกับลุงเรืองที่ท่าน้ำ',say:'เจ้ามาถึงในคืนแปลกเสียด้วย ประทีปทั้งเมืองดับพร้อมกัน ทั้งที่ลมยังนิ่ง ลองไปถามขุนอินทร์ดูเถิด'},
  {type:'talk',npc:'ขุนอินทร์',mapId:'ayutthaya',hint:'ไปพบขุนอินทร์',say:'ประทีปไม่ได้ดับเพราะลม สายใยขวัญที่ผูกเมืองไว้ขาดไปเส้นหนึ่ง ไปกราบพระปัญญาก่อน ท่านรู้เรื่องสายใยดีที่สุด'},
 ]},
 {id:'s2',title:'สายใยขวัญเส้นแรก',reward:{baseXp:30,jobXp:15,coins:60,items:[{id:'mp-small',count:2}]},steps:[
  {type:'talk',npc:'พระปัญญา',mapId:'ayutthaya',hint:'ไปกราบพระปัญญา',say:'สายใยขวัญผูกความทรงจำของผู้คนไว้กับที่ทาง เส้นที่ขาดลากยาวออกไปทางทุ่งเหนือ เด็กน้อยเจ้าจุกเห็นแสงลอยไปทางนั้น'},
  {type:'talk',npc:'เจ้าจุก',mapId:'ayutthaya',hint:'ถามเจ้าจุกเรื่องแสงลอย',say:'แสงเล็ก ๆ ลอยข้ามประตูเมืองไปทางทุ่งข้าว! พี่ตามไปสิ ป้าละไมอยู่ที่ยุ้งข้าวนั่นแหละ'},
 ]},
 {id:'s3',title:'ทุ่งขวัญข้าว',reward:{baseXp:40,jobXp:20,coins:80,items:[{id:'sticky-rice',count:2}]},steps:[
  {type:'enter',mapId:'rice-fields',hint:'ออกประตูเมืองไปทุ่งขวัญข้าว'},
  {type:'talk',npc:'ป้าละไม',mapId:'rice-fields',hint:'คุยกับป้าละไมที่ยุ้งข้าว',say:'มาถึงก็ดีแล้ว หุ่นฟางขยับเองตั้งแต่ประทีปดับ ช่วยป้าล้มมันให้นิ่งทีเถิด'},
 ]},
 {id:'s4',title:'หุ่นฟางขยับเอง',reward:{baseXp:90,jobXp:50,coins:120,items:[{id:'hp-small',count:5}]},steps:[
  {type:'defeat',monster:'straw',count:5,mapId:'rice-fields',hint:'ล้มหุ่นฟางหลง'},
  {type:'talk',npc:'ป้าละไม',mapId:'rice-fields',hint:'กลับไปหาป้าละไม',say:'ข้างในหุ่นฟางมีเส้นด้ายเรืองแสงพันอยู่… เป็นเศษสายใยขวัญแน่ ๆ หนูในยุ้งก็กัดกินมันไปด้วย'},
 ]},
 {id:'s5',title:'หนูในยุ้งข้าว',reward:{baseXp:110,jobXp:60,coins:150,items:[{id:'mp-small',count:3}]},steps:[
  {type:'defeat',monster:'rat',count:4,mapId:'rice-fields',hint:'ไล่หนูยุ้งข้าว'},
  {type:'talk',npc:'ป้าละไม',mapId:'rice-fields',hint:'เอาเศษสายใยไปให้ป้าละไม',say:'เส้นด้ายพวกนี้ชี้ไปทางสวนหมากคลองเก่า ยายสายเฝ้าสวนอยู่ ไปหาแกเถิด'},
 ]},
 {id:'s6',title:'สวนหมากคลองเก่า',reward:{baseXp:160,jobXp:90,coins:200,items:[{id:'hp-large',count:3}]},steps:[
  {type:'enter',mapId:'old-orchard',hint:'เดินทางไปสวนหมากคลองเก่า'},
  {type:'talk',npc:'ยายสาย',mapId:'old-orchard',hint:'คุยกับยายสาย',say:'โคมที่ลอยอยู่ในสวนคือประทีปที่หลงชื่อตัวเอง ดับมันให้สงบ แล้วสายใยจะคลายออก'},
 ]},
 {id:'s7',title:'โคมหลงทาง',reward:{baseXp:260,jobXp:150,coins:300,items:[{id:'mp-large',count:3}]},steps:[
  {type:'defeat',monster:'lantern',count:3,mapId:'old-orchard',hint:'ปลอบโคมหลงทาง'},
  {type:'talk',npc:'ยายสาย',mapId:'old-orchard',hint:'กลับไปหายายสาย',say:'สายใยเส้นสุดท้ายพันอยู่ที่โรงสีใต้เงาจันทร์ จ้อยเฝ้าทางเข้าอยู่ ระวังเจ้าหุ่นฟางพันเชือกให้ดี'},
 ]},
 {id:'s8',title:'โรงสีใต้เงาจันทร์',reward:{baseXp:700,jobXp:400,coins:1000,items:[{id:'hp-large',count:5},{id:'palm-leaf',count:1}]},steps:[
  {type:'enter',mapId:'moonlit-mill',hint:'เดินทางไปโรงสีใต้เงาจันทร์'},
  {type:'talk',npc:'จ้อย',mapId:'moonlit-mill',hint:'คุยกับจ้อยที่ทางเข้า',say:'เขาพันเชือกไว้กับตัวจนจำไม่ได้ว่ารอใคร… ช่วยปลดเขาที'},
  {type:'defeat',monster:'mill-keeper',count:1,mapId:'moonlit-mill',hint:'ปลดเชือกเจ้าหุ่นฟางพันเชือก'},
  {type:'talk',npc:'ขุนอินทร์',mapId:'ayutthaya',hint:'กลับไปรายงานขุนอินทร์',say:'ประทีปที่ท่าน้ำกลับมาสว่างแล้ว! เจ้าผูกสายใยเส้นแรกคืนได้ เมืองนี้ติดหนี้เจ้า'},
 ]},
 // ---- บทที่ 2 · โคมผีกลางบึง (0.60)
 {id:'s9',chapter:'บทที่ 2 · โคมผีกลางบึง',title:'ข่าวจากบึงบัว',reward:{baseXp:900,jobXp:500,coins:600,items:[{id:'green-herb',count:5}]},steps:[
  {type:'talk',npc:'ขุนอินทร์',mapId:'ayutthaya',hint:'ฟังข่าวจากขุนอินทร์',say:'มีคนเห็นโคมลอยเหนือบึงบัวหลังโรงสี ทั้งที่ประทีปในเมืองสว่างแล้ว ไปดูทีเถิด'},
  {type:'enter',mapId:'lotus-marsh',hint:'เดินทางไปบึงบัวต้องมนตร์ (ผ่านโรงสี)'},
  {type:'talk',npc:'ยายบัวผัน',mapId:'lotus-marsh',hint:'คุยกับยายบัวผัน',say:'หนูในบึงตัวโตผิดปกติ มันกัดสายใยที่ข้าผูกไว้กับต้นบัวจนขาดหมด'},
 ]},
 {id:'s10',chapter:'บทที่ 2 · โคมผีกลางบึง',title:'หนูบึงยักษ์',reward:{baseXp:1200,jobXp:650,coins:800,items:[{id:'hp-large',count:5}]},steps:[
  {type:'defeat',monster:'marsh-rat',count:6,mapId:'lotus-marsh',hint:'ไล่หนูบึงยักษ์'},
  {type:'talk',npc:'ยายบัวผัน',mapId:'lotus-marsh',hint:'กลับไปหายายบัวผัน',say:'ดีแล้ว ทีนี้เห็นไหม โคมพวกนั้นลอยรวมกันอยู่กลางบึง'},
 ]},
 {id:'s11',chapter:'บทที่ 2 · โคมผีกลางบึง',title:'โคมผีบึง',reward:{baseXp:1600,jobXp:900,coins:1000,items:[{id:'lek-lai',count:1}]},steps:[
  {type:'defeat',monster:'bog-lantern',count:4,mapId:'lotus-marsh',hint:'ดับโคมผีบึง (ถอยออกจากวงแดง)'},
  {type:'talk',npc:'ยายบัวผัน',mapId:'lotus-marsh',hint:'บอกยายบัวผัน',say:'โคมดับแล้ว แต่ต้นเหตุยังอยู่ พญาวานรตัวนั้นขโมยประทีปไปซ่อนไว้กลางบึง'},
 ]},
 {id:'s12',chapter:'บทที่ 2 · โคมผีกลางบึง',title:'พญาวานรบึง',reward:{baseXp:3000,jobXp:1600,coins:2500,items:[{id:'vest-chain',count:1}]},steps:[
  {type:'defeat',monster:'marsh-ape',count:1,mapId:'lotus-marsh',hint:'ล้มพญาวานรบึง'},
  {type:'talk',npc:'ขุนอินทร์',mapId:'ayutthaya',hint:'นำประทีปกลับไปให้ขุนอินทร์',say:'ประทีปดวงสุดท้ายกลับมาแล้ว อยุธยาติดค้างบุญคุณเจ้าอีกครั้ง'},
 ]},
];

export function normalizeStory(state){
 const s=state&&typeof state==='object'?state:{};
 const quest=Number.isInteger(s.quest)?Math.min(Math.max(s.quest,0),STORY.length):0;
 const done=quest>=STORY.length;
 const steps=done?0:STORY[quest].steps.length;
 const step=!done&&Number.isInteger(s.step)?Math.min(Math.max(s.step,0),steps-1):0;
 const goal=done?0:STORY[quest].steps[step].count??0;
 const count=Number.isInteger(s.count)?Math.min(Math.max(s.count,0),goal):0;
 return {quest,step,count,done};
}

// What the player should do now: {quest, step, index:{quest,step}, progress} or null when the chapter is finished.
export function currentObjective(state){
 const s=normalizeStory(state);if(s.done)return null;
 const quest=STORY[s.quest],step=quest.steps[s.step];
 return {quest,step,count:s.count,stepNumber:s.step+1,steps:quest.steps.length};
}

// event: {type:'talk', npc, mapId} | {type:'defeat', monster, mapId} | {type:'enter', mapId}
// Returns {state, changed, say?, completed? (quest finished), reward?}.
export function storyEvent(state,event){
 const s=normalizeStory(state);if(s.done||!event)return {state:s,changed:false};
 const quest=STORY[s.quest],step=quest.steps[s.step];
 if(event.type!==step.type||event.mapId!==step.mapId)return {state:s,changed:false};
 if(step.type==='talk'&&event.npc!==step.npc)return {state:s,changed:false};
 if(step.type==='defeat'){
  if(event.monster!==step.monster)return {state:s,changed:false};
  const count=s.count+1;
  if(count<step.count)return {state:{...s,count},changed:true};
 }
 // Step complete: advance; finishing the last step completes the quest and pays its reward.
 const say=step.say;
 if(s.step+1<quest.steps.length)return {state:{...s,step:s.step+1,count:0},changed:true,say};
 const next=s.quest+1;
 return {state:normalizeStory({quest:next,step:0,count:0}),changed:true,say,completed:quest,reward:quest.reward};
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
