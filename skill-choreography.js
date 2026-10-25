import {skillFrame} from './animation-frames.js?v=37';
// Authored skill tracks over the existing sprite rig. Timing is visual, not combat balance.
import {characterMotion} from './character-motion.js?v=life1';
import {JOINT_CHANNELS} from './character-rig.js?v=37';
import {gestureJoints} from './joint-gestures.js?v=37';
import {MASTER_FROM,BASE_SLOTS,isMaster} from './skill-progress.js?v=role116';
const gestures={
 ready:{lean:-.032,crouch:.027,armL:.016,armR:-.025},
 jab:{lean:.055,armR:.065,armL:-.014,legR:.025,x:.16},
 cross:{lean:.04,armL:-.058,armR:.02,rotation:-.06,x:.12},
 sweep:{armL:-.045,armR:.058,lean:.025,rotation:.08,legL:-.025},
 high:{armRY:.038,armLY:.012,lean:-.018,body:.016,rotation:-.035},
 chop:{armRY:-.025,armR:.045,lean:.062,crouch:.035,x:.14},
 brace:{armL:.025,armR:-.025,armLY:.018,armRY:.018,crouch:.04,legL:-.02,legR:.02},
 shove:{armL:-.027,armR:.06,lean:.065,legL:-.035,x:.23},
 thrust:{armR:.075,armL:.028,lean:.045,legL:-.035,legR:.03,x:.28},
 recoil:{lean:-.05,armL:.014,armR:-.025,legR:.015,x:-.08},
 low:{crouch:.058,lean:.018,armRY:-.025,head:.012},
 rise:{body:.02,armLY:.027,armRY:.035,y:.12,rotation:-.045},
 kick:{lean:-.025,legR:.072,liftR:.09,armL:-.025,armR:.02,x:.16},
 knee:{lean:.03,legL:-.025,legR:.024,liftR:.10,crouch:.012},
 elbow:{armL:.02,armR:-.035,armRY:.03,lean:.045,rotation:-.075,x:.17},
 draw:{armL:-.045,armR:-.035,armRY:.013,lean:-.018,legL:-.02},
 release:{armL:-.055,armR:.025,armRY:.012,lean:.035,head:-.01},
 sky:{armLY:.038,armRY:.043,armL:-.022,armR:.012,lean:-.025,head:-.014},
 plant:{crouch:.055,lean:.04,armL:-.01,armR:.028,armRY:-.03},
 palm:{armR:.035,armRY:.029,armL:.018,lean:.014,head:-.006},
 open:{armL:-.04,armR:.04,armLY:.018,armRY:.02,body:.018},
 pray:{armL:.029,armR:-.03,armLY:.024,armRY:.024,head:.012,body:.005},
 breathe:{body:.015,armL:.012,armR:-.008,head:-.007},
 bow:{lean:.04,head:.023,crouch:.025,armL:.017,armR:-.012},
 ward:{armL:-.028,armR:.03,armLY:.028,armRY:.031,crouch:.018},
 step:{legL:-.04,legR:.035,liftL:.065,lean:.028,x:.18},
 evade:{legL:.05,legR:-.045,liftR:.045,lean:-.04,rotation:.055,x:-.30},
 dash:{lean:.065,armL:.03,armR:-.028,legL:-.05,legR:.05,x:.35},
 turn:{rotation:-.10,armL:.04,armR:-.03,legL:.025,liftL:.02},
 land:{crouch:.046,legL:-.035,legR:.035,armL:-.03,armR:.02},
 float:{body:.02,y:.18,armL:-.035,armR:.035,armLY:.023,armRY:.025},
 mend:{armL:.035,armR:-.016,armLY:-.014,crouch:.027,head:.018},
 focus:{armRY:.025,armR:-.015,armL:.012,head:-.013,body:.013},
 seal:{armR:.04,armRY:.025,armL:-.026,lean:.02,rotation:.035},
 spiral:{rotation:.10,armL:-.04,armR:.04,body:.015,legR:.035,y:.07}
};
// [duration, motion description, ordered gestures, effect motif]. Each row is a deliberate sequence.
const tracks={
 novice:[
  [.82,'ตั้งหมัด → ชกตรง → ดึงมือกลับ','ready jab recoil','impact'],
  [1.02,'ย่อเข่า → กวาดแขนออก → คืนหลัก','low sweep land','arc'],
  [.95,'ตั้งรับ → ยื่นมือสกัด → ดึงกลับ','brace palm recoil','bind'],
  [.9,'ถ่ายน้ำหนัก → ผลักสองมือ','ready shove brace','wave'],
  [1.45,'ก้มพัก → สูดลมหายใจ → ยืดตัว','bow breathe rise','heal'],
  [1.1,'ถอยเท้า → ยกแขนตั้งรับ','recoil brace ready','shield'],
  [1.12,'รวบรวมแรง → หมัดหนัก → ย่อคืนหลัก','focus ready jab land','impact'],
  [.75,'ก้าวหลบ → ถอยสั้น → ตั้งหลัก','step evade land','trail'],
  [1.55,'รวมสมาธิ → ผ่อนแขน → ยืดอก','focus pray breathe open','motes'],
  [1.7,'ฮึดสู้ → หมัดซ้ายขวา → กวาดแขน','low rise jab cross sweep land','burst']
 ],
 swordsman:[
  [.78,'เงื้อดาบ → ฟันลง → คืนดาบ','high chop recoil','slash'],
  [1.02,'บิดตัว → กวาดดาบแนวนอน','ready turn sweep land','arc'],
  [.88,'ตั้งดาบรับ → ตีสกัดปลายดาบ','brace cross palm','bind'],
  [.85,'ยกโล่ → ก้าวกระแทก → ถอนตัว','brace step shove recoil','wave'],
  [1.4,'ลดอาวุธ → พักหายใจ','low breathe bow rise','heal'],
  [1.15,'ปักหลัก → ยกโล่ → ค้างตั้งรับ','land high brace ward','shield'],
  [1.18,'เงื้อสูง → ยกตัว → ผ่าลงหนัก','ready high rise chop land','slash'],
  [.72,'ย่อตัว → พุ่งดาบ → เบรกเท้า','low dash thrust land','trail'],
  [1.48,'ตั้งดาบ → รวมแรง → เปิดไหล่','brace focus high open','motes'],
  [1.78,'ฟันกวาด → กลับคม → ปักหลักพิทักษ์','high sweep turn cross chop ward','orbit']
 ],
 lancer:[
  [.92,'ถอยทวน → แทงยาว → ถอนทวน','recoil ready thrust recoil','lance'],
  [1.12,'ย่อหลัก → เหวี่ยงทวน → กวาดปลาย','low turn sweep cross','arc'],
  [1.03,'ลดปลายทวน → แทงตรึง → ค้างหลัก','plant thrust brace','bind'],
  [.98,'ขวางทวน → ก้าวดัน → คืนระยะ','cross brace shove step','wave'],
  [1.6,'พักทวน → ยืดอก → ผ่อนลมหายใจ','plant breathe open bow','heal'],
  [1.22,'ขวางทวน → แยกเท้า → ตั้งรับ','sweep land brace focus','shield'],
  [1.28,'รวบแรง → แทงทะลวงสองจังหวะ','focus recoil thrust ready thrust','lance'],
  [.86,'ยกเข่า → ก้าวส่งทวน → คืนหลัก','knee step dash thrust','trail'],
  [1.62,'ตั้งทวน → รวมสมาธิ → ยกปลาย','plant focus breathe high','motes'],
  [1.9,'หมุนทวนสองวง → ทิ้งน้ำหนักลง','high spiral sweep turn spiral plant','orbit']
 ],
 hunter:[
  [1.02,'ยกธนู → ดึงสาย → ปล่อยศร','high draw release recoil','arrow'],
  [1.55,'เล็งขึ้นฟ้า → ยิงสามระลอก','draw sky release draw sky release','rain'],
  [1.2,'ย่อวางบ่วง → ดึงเชือก → ถอย','low plant draw evade','bind'],
  [1.04,'ถอยดึงสาย → ยิงศรผลัก','evade draw release brace','arrow'],
  [1.65,'หยิบสมุนไพร → ทำแผล → ยืดตัว','low mend bow breathe','heal'],
  [1.3,'ย่อต่ำ → หลบไหล่ → พรางตัว','low turn evade brace','shield'],
  [1.42,'นิ่งเล็ง → ดึงสายสุด → ปล่อยศรหนัก','focus draw draw release recoil','arrow'],
  [.88,'ยกเท้า → ข้ามพง → ลงหลัก','step knee rise evade land','trail'],
  [1.72,'ลดธนู → กำหนดลม → ตั้งเล็ง','bow breathe focus draw','motes'],
  [1.95,'ยิงซ้ายขวา → ยกธนู → ศรวงรอบ','draw release turn draw release sky','orbit']
 ],
 boxer:[
  [.58,'ตั้งการ์ด → ส่งหมัดหน้า → ดึงกลับ','brace jab ready','impact'],
  [.82,'บิดสะโพก → ศอกกลับ → คืนการ์ด','ready turn elbow brace','arc'],
  [1.02,'ยื่นจับ → ดึงเข้าตัว → ล็อกแขน','palm shove cross brace','bind'],
  [.88,'ยกเข่า → ถีบส่ง → วางเท้า','brace knee kick land','wave'],
  [1.55,'ลดการ์ด → พักยก → ผ่อนบ่า','low bow breathe ready','heal'],
  [1.02,'ก้าวตั้งหลัก → ยกการ์ด → โยกหลบ','step brace recoil brace','shield'],
  [.97,'ย่อตัว → หมัดทะลวง → ส่งไหล่','low ready jab shove recoil','impact'],
  [1.22,'ย่างสามขุม → ยกเข่าสลับ → ตั้งการ์ด','step knee evade step brace','trail'],
  [1.7,'ไหว้ครู → รวมลม → ตั้งหมัด','pray bow breathe ready','motes'],
  [1.85,'หมัด → ศอก → เข่า → ถีบปิดชุด','jab cross elbow knee kick land','burst']
 ],
 rogue:[
  [.69,'มีดซ้าย → มีดขวา → เก็บคม','ready cross jab recoil','slash'],
  [.86,'ย่อต่ำ → กวาดสองคม → หลบ','low sweep cross evade','arc'],
  [.83,'เล็งจุด → พุ่งมีด → ดึงคืน','focus palm thrust recoil','bind'],
  [.79,'หมุนหลบ → เตะส่ง → ถอย','turn knee kick evade','wave'],
  [1.38,'ย่อตัว → พันแผล → เก็บมือ','low mend focus brace','heal'],
  [1.04,'หลบไหล่ → ไขว้มีด → ตั้งรับ','turn evade cross brace','shield'],
  [1.06,'เก็บเงา → พุ่งแทง → ถอนคม','low focus dash thrust evade','slash'],
  [.67,'ย่อเงา → พุ่งต่ำ → ย้ายหลัก','low evade dash land','trail'],
  [1.47,'ก้มรวมสติ → ตั้งมีด → นิ่งเล็ง','bow focus cross breathe','motes'],
  [1.65,'ระบำสลับคม → หมุน → แทงปิดท้าย','cross jab spiral sweep dash thrust','orbit']
 ],
 shaman:[
  [1.04,'ชูไม้เท้า → รวมไฟ → ส่งวิญญาณ','high focus seal palm','spirit'],
  [1.48,'วาดอาคม → ยกไฟ → กดลงพื้น','seal open sky plant','flame'],
  [1.24,'ผูกด้าย → วาดวง → ส่งสายสิญจน์','pray seal draw palm','bind'],
  [1.02,'รวบมนตรา → ผลักฝ่ามือ','focus open shove recoil','wave'],
  [1.68,'ก้มบริกรรม → ประสานมือ → เปิดพร','bow pray breathe open','heal'],
  [1.52,'วาดยันต์ → ชูไม้เท้า → กางอาคม','seal high spiral ward','shield'],
  [1.5,'เขียนยันต์ → รวมพลัง → สะบัดส่ง','focus seal sky chop palm','talisman'],
  [.94,'ย่อตัว → ก้าวผ่านควัน → คืนกาย','low seal dash float land','trail'],
  [1.9,'บริกรรม → ลอยรวมจิต → คืนพื้น','pray focus float breathe land','motes'],
  [2.1,'วาดวง → ยกอาคม → ปักไม้เท้า','seal spiral sky float plant ward','orbit']
 ],
 acolyte:[
  [1.2,'ประนมมือ → เปิดฝ่ามือ → ส่งแสง','pray breathe palm open','light'],
  [1.65,'ก้มสวด → กางแขน → แผ่รัศมี','bow pray open sky ward','burst'],
  [1.36,'ตั้งจิต → ยกมือ → ประทับแสง','pray focus seal palm','bind'],
  [1.14,'รวบแสง → ยื่นมือ → ผ่อนแขน','pray ward shove open','wave'],
  [1.85,'ก้มให้พร → ประนม → แผ่เมตตา','bow pray high open breathe','heal'],
  [1.72,'ประนม → วาดเขต → กางคุ้มครอง','pray seal open ward brace','shield'],
  [1.67,'ตั้งจิต → ชูแสง → ส่งสลายภูต','focus pray sky seal palm','light'],
  [1.1,'ก้าวสงบ → ยกตัวเบา → ลงหลัก','pray step float step land','trail'],
  [2.05,'ก้มภาวนา → รวมลม → ผ่อนมือ','bow pray breathe focus open','motes'],
  [2.25,'สวด → ยกแสง → แผ่รัศมีคุ้มครอง','bow pray sky float open ward','orbit']
 ]
};
const weights={novice:.72,swordsman:1,lancer:1,hunter:.9,boxer:1,rogue:1.05,shaman:.9,acolyte:.8};
const attackArt=new Set(['jab','cross','sweep','chop','shove','thrust','release','palm','seal','spiral']);
export const SKILL_TRACKS=Object.fromEntries(Object.entries(tracks).map(([id,rows])=>[id,rows.map(([duration,label,steps,fx],index)=>{
 const sequence=steps.split(' '),times=sequence.map((_,n)=>.14+n*.65/(sequence.length-1));
 // Release marks follow the actual authored strike poses, including combo strikes.
 const strikes=sequence.flatMap((g,n)=>['jab','cross','sweep','chop','shove','thrust','kick','elbow','release','palm','plant','seal','ward','open'].includes(g)?[times[n]]:[]);
 return {id:`${id}-${index}`,classId:id,index,duration,label,sequence,times,fx,strikes:strikes.length?strikes:[.53],weight:weights[id]};
})]));
// 0.101 a Master skill (slot 10+) moves like the skill it grew from.
export function skillTrack(classId,index){return SKILL_TRACKS[classId]?.[isMaster(index)?MASTER_FROM[index-BASE_SLOTS]:index]??null;}
export function skillPose(classId,index,time,{reduced=false}={}){
 // Clip metadata is not a joint channel. Keep cast at both neutral endpoints so
 // a painted idle clip cannot replace the first or recovery frame of a skill.
 const p={...characterMotion({reduced:true}),mode:'cast',time:Number.isFinite(time)?Math.max(0,time):0,phase:null,reduced,profileFrame:true,armLY:0,armRY:0},track=skillTrack(classId,index);
 if(!track||!Number.isFinite(time)||time<=0||time>=track.duration)return p;
 const q=time/track.duration;
 if(reduced){p.frame=q>.25&&q<.8?3:0;return p;}
 const times=[0,...track.times,1],poses=[{},...track.sequence.map(g=>({...gestures[g],...gestureJoints(g,classId)})),{}];
 const j=times.findIndex(t=>t>q),a=poses[j-1],b=poses[j];let f=(q-times[j-1])/(times[j]-times[j-1]);f=f*f*(3-2*f);
 for(const key of Object.keys(p))if(!['mode','time','phase','reduced','profileFrame','frame','artFrame','sx','sy'].includes(key))p[key]=((a[key]??0)*(1-f)+(b[key]??0)*f)*(JOINT_CHANNELS.includes(key)?1:track.weight);
 // A kick, guard or recovery must not borrow the extended-punch illustration.
 const nearest=track.times.reduce((best,t,n)=>Math.abs(t-q)<Math.abs(track.times[best]-q)?n:best,0);
 p.frame=q>=.22&&q<.85&&attackArt.has(track.sequence[nearest])?3:0;
 p.artFrame=skillFrame(track,time,reduced);
 // Weight transfer comes from bent knees and hips, never scaling the artwork.
 return p;
}
