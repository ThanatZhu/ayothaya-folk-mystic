// ทุ่งนิมิต: the new-player prologue. Shared by the realm server (rules) and the client (cutscenes, objective).
// A brand-new Novice wakes in the dream meadow, defeats a few training monsters, talks to the teacher spirit and borrows
// one class's skills, beats the vision guardian on the ancient terrace, and wakes in Ayutthaya as a Novice again.
// The borrowed kit lives only in the realm's combat world; the saved character and skills never change.
export const PROLOGUE_MAP='prologue-vision';
export const PROLOGUE_KILLS=5;
export const TEACHER='วิญญาณครู';
export const TERRACE={x:0,z:-28,r:12};
export const BOSS_SPOT={x:0,z:-32};
export const TRIAL_CLASSES=['swordsman','lancer','hunter','boxer','rogue','shaman','acolyte'];
export const STAGES=['wake','teacher','trial','arena','boss','fading','done'];
export const SCENE_IDS=['dream','teacher','boss','fading','awake'];
// stage -> what to do next (shown in the objective line)
export const OBJECTIVES={wake:'ปราบมอนสเตอร์ในทุ่งนิมิต',teacher:'ไปคุยกับวิญญาณครูที่ต้นไทร',trial:'ไปที่ลานศิลาโบราณทางเหนือ',arena:'ลานศิลากำลังตื่น',boss:'ปราบอสูรฟางนิมิต',fading:'นิมิตกำลังจางหาย',done:''};
export const PROLOGUE_BOSS={id:'vision-straw-guardian',name:'อสูรฟางนิมิต',hp:2400,speed:.75,damage:5,baseXp:60,jobXp:40,level:5,
 sheet:'elite-monsters',row:2,height:3.3,elite:true,prologue:true,respawn:1e9,reach:2.6,windup:1};

const rank=s=>STAGES.indexOf(s);
export function normalizePrologue(v){
 if(!v||typeof v!=='object'||!STAGES.includes(v.stage))return null;
 const classId=TRIAL_CLASSES.includes(v.classId)?v.classId:null,stage=rank(v.stage)>=rank('trial')&&rank(v.stage)<rank('fading')&&!classId?'teacher':v.stage;
 return {stage,kills:Math.max(0,Math.min(PROLOGUE_KILLS,v.kills|0)),classId,seen:SCENE_IDS.filter(id=>Array.isArray(v.seen)&&v.seen.includes(id))};
}
// Only a character that has never played gets the prologue: a Novice with no Job, no EXP and no story progress.
export function prologueDue(record){
 const saved=normalizePrologue(record?.prologue);if(saved)return saved;
 if(record?.prologue!==undefined&&record?.prologue!==null)return null;
 const c=record?.character,t=record?.state?.traveler,s=record?.story;
 const fresh=c?.classId==='novice'&&!c.jobId&&!(t?.baseXp>0)&&!(t?.jobXp>0)&&!(s?.quest>0)&&!(s?.step>0)&&!(s?.done?.length);
 return fresh?{stage:'wake',kills:0,classId:null,seen:[]}:null;
}
export const inTrial=state=>!!state?.classId&&rank(state.stage)>=rank('trial')&&rank(state.stage)<rank('fading');
export const onTerrace=p=>Math.hypot(p.x-TERRACE.x,p.z-TERRACE.z)<=TERRACE.r+.5;

// Full-screen scenes. The 16:9 paintings (1536x864) are cropped to the screen, never stretched. `hero` is where the
// player's own sprite stands (x, foot y and height as fractions of the painting: the mat, the clearing before the teacher,
// the near side of the terrace); `captionAt` keeps the captions off it.
const scene=(id,file,title,hero,captionAt,captions)=>({id,seenId:'prologue:'+id,prologue:true,title,art:{src:'./assets/prologue/'+file+'.webp',panels:1,drift:true},hero,captionAt,captions});
export const PROLOGUE_SCENES={
 dream:scene('dream','prologue-01-dream','บทนำ · ทุ่งนิมิต',{x:.505,y:.642,h:.178},'bottom',[
  'ก่อนออกเดินทาง… นักเดินทางทุกคนต้องผ่านคืนแห่งนิมิตนี้',
  'ทุ่งที่ไม่เคยมีใครเห็น เสียงลมพัดผ่านใบไม้ราวกับเรียกชื่อเจ้า',
  'ลุกขึ้นเถิด กำหมัดให้มั่น แล้วลองฝึกกับหุ่นฟางที่หลงอยู่ในทุ่งนี้']),
 teacher:scene('teacher','prologue-02-teacher','วิญญาณครูแห่งต้นไทร',{x:.5,y:.855,h:.213},'top',[
  'วิญญาณครู: ข้ารอเจ้ามานานแล้ว ผู้ที่ตื่นในทุ่งนิมิตย่อมมีเส้นทางรออยู่',
  'อาวุธทั้งเจ็ดนี้คือเจ็ดวิถีแห่งอโยธยา ดาบ ทวน ธนู หมัดมวย มีดคู่ ไม้เท้าอาคม และบาตรแห่งธรรม',
  'เลือกมาหนึ่งวิถี ข้าจะให้เจ้ายืมพลังของมันชั่วคราว เพื่อไปเผชิญสิ่งที่รออยู่บนลานศิลาโบราณ']),
 boss:scene('boss','prologue-03-boss','ลานศิลาโบราณ',{x:.3,y:.9,h:.24,trial:true},'top',[
  'ลานศิลาสั่นสะเทือน ตราดอกบัวที่แตกร้าวเรืองแสงสีคราม',
  'อสูรฟางนิมิตลุกขึ้นจากฝุ่นฟางและเงาดำ ดวงตาลุกโชนดั่งถ่านไฟ',
  'ใช้พลังที่ยืมมาให้เต็มที่! กดสกิลและไม้ตายของวิถีที่เจ้าเลือก']),
 fading:scene('fading','prologue-04-fading','พลังที่ยืมมา',{x:.5,y:.749,h:.196,trial:true,fade:true},'top',[
  'อสูรฟางแตกสลายเป็นกลีบบัวสีทอง ปลิวขึ้นสู่ฟ้ายามรุ่งอรุณ',
  'พลังที่ยืมมาค่อยๆ คลายออกจากกายเจ้า กลายเป็นแสงเจ็ดสีลอยหายไป',
  'วิญญาณครู: จำความรู้สึกนี้ไว้ วันหนึ่งพลังนั้นจะเป็นของเจ้าเองอย่างแท้จริง']),
 awake:scene('awake','prologue-05-awake','ท่าเรือเจ้าพระยา',{x:.7,y:.882,h:.24},'top',[
  'เช้าวันใหม่ที่ท่าเรือเจ้าพระยา กรุงศรีอยุธยา',
  'เจ้าตื่นขึ้นในสภาพผู้ฝึกตน… แต่ริบบิ้นจากต้นไทรยังเรืองแสงอยู่บนเสื่อ',
  'ฝึกฝนจนถึง Job 10 แล้วไปหาครูที่ลานครู เพื่อเลือกเส้นทางของเจ้าอย่างแท้จริง'])
};
// Which scene (if any) the client owes the player right now. `talking` = the teacher conversation is open.
export function dueScene(state,mapId,{talking=false}={}){
 if(!state)return null;const seen=new Set(state.seen);
 if(mapId===PROLOGUE_MAP){
  if(state.stage==='wake'&&!seen.has('dream'))return 'dream';
  if(state.stage==='teacher'&&talking&&!seen.has('teacher'))return 'teacher';
  if(state.stage==='arena'&&!seen.has('boss'))return 'boss';
  if(state.stage==='fading'&&!seen.has('fading'))return 'fading';
  return null;
 }
 return state.stage==='done'&&!seen.has('awake')?'awake':null;
}
