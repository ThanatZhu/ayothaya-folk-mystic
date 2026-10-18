import {JOBS,CLASS_LEVEL,JOB_LEVEL,progression} from './advancement.js?v=21';
export const MASTER_COURT={name:'ลานครูแห่งอโยธยา',x:40,z:-46};
export const MENTORS=[
 {id:'sword-master',classId:'swordsman',name:'ขุนอินทรเดช',title:'ครูดาบ',x:30,z:-54,sheet:'masters-arms',row:0,color:'#e6ba73',text:'ดาบที่มั่นคงเริ่มจากใจที่ไม่หวั่นไหว จงออกปกป้องชาวบ้าน แล้วกลับมารับคำสอนจากข้า'},
 {id:'spear-master',classId:'lancer',name:'ครูหญิงพิกุล',title:'ครูทวน',x:44,z:-54,sheet:'masters-arms',row:1,color:'#e9aa81',text:'ปลายทวนมีไว้รักษาระยะและคุ้มครองสหาย เจ้าพร้อมเรียนรู้จังหวะของมันหรือยัง'},
 {id:'hunt-master',classId:'hunter',name:'พรานแม่แก้ว',title:'ครูพราน',x:34,z:-54,sheet:'masters-arms',row:2,color:'#bdd58a',text:'ป่ามีภาษาของมัน ก่อนปล่อยศร เจ้าต้องมองเส้นทางกลับบ้านของทุกคนให้เห็น'},
 {id:'box-master',classId:'boxer',name:'ครูคง',title:'ครูมวย',x:48,z:-54,sheet:'masters-arms',row:3,color:'#f0ad83',text:'ยืนให้มั่น หายใจให้เป็น แล้วค่อยออกหมัด ฝีมือของเจ้ามีไว้ปกป้องผู้อ่อนแอ'},
 {id:'shadow-master',classId:'rogue',name:'แม่เงาจันทร์',title:'ครูมีดคู่',x:30,z:-38,sheet:'masters-mystic',row:0,color:'#d2abd5',text:'ความไวเพียงอย่างเดียวไม่พอ เจ้าต้องรู้ว่าเมื่อใดควรเข้าหา และเมื่อใดควรถอย'},
 {id:'spirit-master',classId:'shaman',name:'ปู่คำสิงห์',title:'ครูอาคม',x:44,z:-38,sheet:'masters-mystic',row:1,color:'#93dfd3',text:'ทุกดวงวิญญาณเคยมีชื่อ จงใช้วิชาเพื่อคลายทุกข์ มิใช่ผูกทุกสิ่งไว้กับตน'},
 {id:'monk-master',classId:'acolyte',name:'หลวงพ่อปัญญาธร',title:'ครูสายเมตตา',x:34,z:-38,sheet:'masters-mystic',row:2,color:'#eed397',text:'กำลังใจอันสงบช่วยคุ้มครองผู้คนได้ จงไปบรรเทาภัยนอกกำแพง แล้วกลับมาเล่าให้อาตมาฟัง'},
 {id:'nun-master',classId:'acolyte',name:'แม่ชีบุญเรือน',title:'ครูสายเมตตา',x:48,z:-38,sheet:'masters-mystic',row:3,color:'#e8e3cb',text:'เมตตาคือการลงมือช่วยผู้อื่น พระและแม่ชีเรียนบททดสอบเดียวกัน เลือกเส้นทางที่ใจเจ้าพร้อมเถิด'}
];
export const mentorById=id=>MENTORS.find(m=>m.id===id);
export function trainingStatus(character,training,traveler,mentorId){
 const mentor=mentorById(mentorId);if(!mentor)throw new Error('trainer-invalid');
 const level=progression(traveler).level,tier=character.classId==='novice'?'class':'master',required=tier==='class'?CLASS_LEVEL:JOB_LEVEL;
 const target=tier==='class'?5:15,own=training?.classId===mentor.classId&&training?.tier===tier;
 const progress=own?Math.min(target,Math.max(0,(traveler.kills??0)-training.startKills)):0;
 return {mentor,level,tier,required,target,progress,own,training:training??null,completed:!!character.jobId,wrongClass:character.classId!=='novice'&&character.classId!==mentor.classId,eligible:level>=required,branches:JOBS[mentor.classId]};
}
// Shared quest rules. Online callers supply only an action and mentor/branch IDs;
// the realm supplies position, level, kill count and the saved quest baseline.
export function trainingAction({character,training,state},mentorId,action,jobId=''){
 const s=trainingStatus(character,training,state.traveler,mentorId),m=s.mentor,p=state.position;
 if(state.mapId!=='ayutthaya'||!p||Math.hypot(p.x-m.x,p.z-m.z)>3||state.traveler.hp<=0)throw new Error('trainer-distance');
 if(!['accept','cancel','complete'].includes(action))throw new Error('trainer-action');
 if(s.completed)throw new Error('trainer-finished');if(s.wrongClass)throw new Error('trainer-class');if(!s.eligible)throw new Error('trainer-level');
 if(action==='accept'){if(training)throw new Error('trainer-active');return {character,training:{classId:m.classId,tier:s.tier,startKills:state.traveler.kills},advanced:false};}
 if(!s.own)throw new Error('trainer-quest');
 if(action==='cancel')return {character,training:null,advanced:false};
 if(s.progress<s.target)throw new Error('trainer-incomplete');
 if(s.tier==='master'&&!s.branches.some(j=>j.id===jobId))throw new Error('invalid-job');
 return {character:{...character,classId:m.classId,jobId:s.tier==='master'?jobId:''},training:null,advanced:true};
}

export const CITIZEN_STYLES=[
 {sheet:'citizens-market',row:0,name:'แม่ค้า',text:'ผักสดจากทุ่งมาถึงแล้วจ้ะ วันนี้ตลาดคึกคักดีนะ'},
 {sheet:'citizens-market',row:1,name:'คนหาบของ',text:'ขอทางหน่อยนะ กำลังขนของไปส่งตลาด เดี๋ยวก็ได้พักแล้ว'},
 {sheet:'citizens-market',row:2,name:'คนขายดอกไม้',text:'ดอกไม้หอม ๆ สำหรับไหว้ครูจ้ะ ลานครูอยู่ย่านลานสำนักทางเหนือของตลาด'},
 {sheet:'citizens-market',row:3,name:'พ่อครัว',text:'เดินเหนื่อยก็พักก่อนนะ กลิ่นข้าวหอม ๆ ช่วยให้คิดถึงบ้านเสมอ'},
 {sheet:'citizens-river',row:0,name:'ชาวนา',text:'นอกกำแพงมีหุ่นฟางเดินได้ ข้าฝากพวกนักเดินทางดูแลทุ่งด้วยนะ'},
 {sheet:'citizens-river',row:1,name:'คนเรือ',text:'คลองเชื่อมทุกย่านไว้ด้วยกัน จะข้ามฟากก็ใช้สะพานนะ'},
 {sheet:'citizens-river',row:2,name:'ผู้เฒ่า',text:'ครูทั้งหลายรวมตัวอยู่ที่ลานครู ฝึกถึงระดับ 25 จึงรับบททดสอบอาชีพได้'},
 {sheet:'citizens-river',row:3,name:'ช่างสาน',text:'ข้าจะเอาเสื่อไปส่งเรือนช่าง เจ้าชอบลายดอกพิกุลหรือลายขัดกันล่ะ'}
];
