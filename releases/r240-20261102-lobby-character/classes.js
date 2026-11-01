import {patch} from './balance.js';
import {MASTER_FROM,NOVICE_SLOTS,NOVICE_MAX} from './skill-progress.js?v=novice174';
// Shared profession catalogue: lobby, persistence, combat and sprite renderer.
export const CLASSES=[
 {id:'swordsman',name:'นักดาบ',icon:'⚔',role:'แนวหน้า · ดาบและโล่',description:'เข้าประชิด ฟันกวาด และตั้งรับด้วยโล่',color:'#e5b867',range:1.65,damage:21,delay:.8,speed:4.08,kind:'slash',names:['ฟันเปิดทาง','ดาบกวาด','ตีสกัด','โล่กระแทก','พักหายใจ','ตั้งโล่','ดาบผ่าเกราะ','พุ่งเข้าหา','รวบรวมแรง','วงดาบพิทักษ์']},
 {id:'lancer',name:'นักทวน',icon:'➶',role:'คุมระยะ · ทวนยาว',description:'แทงได้ไกลกว่าดาบ หยุดและผลักศัตรู',color:'#eab57b',range:2.6,damage:23,delay:1,speed:3.84,kind:'thrust',names:['แทงทวน','กวาดปลายทวน','ตรึงปลายทวน','ทวนผลัก','พักลมปราณ','ตั้งรับทวน','แทงทะลวง','ก้าวทวน','ตั้งสมาธิ','ทวนหมุน']},
 {id:'hunter',name:'นายพราน',icon:'➹',role:'ระยะไกล · ธนูและกับดัก',description:'ยิงจากระยะไกล ตรึงเป้าหมายก่อนถอย',color:'#b8ce82',range:6,damage:15,delay:.85,speed:4.32,kind:'arrow',names:['ศรแม่นยำ','ฝนลูกศร','บ่วงพราน','ศรผลัก','สมุนไพรป่า','พรางกาย','ศรเจาะเกราะ','ก้าวพงไพร','ลมหายใจพราน','วงศรพิทักษ์']},
 {id:'boxer',name:'นักมวย',icon:'✊',role:'ประชิดเร็ว · หมัดและศอก',description:'เข้าประชิดระยะสั้น ออกหมัดไวและเคลื่อนตัวคล่อง',color:'#efac88',range:1.3,damage:14,delay:.43,speed:4.56,kind:'punch',names:['หมัดตรง','ศอกกลับ','จับล็อก','ถีบส่ง','พักยก','ตั้งการ์ด','หมัดทะลวง','ย่างสามขุม','คุมลมหายใจ','แม่ไม้มวยไทย']},
 {id:'rogue',name:'จอมโจร',icon:'✧',role:'คล่องตัว · มีดคู่',description:'โจมตีรวดเร็ว ใช้มีดคู่และก้าวหลบ',color:'#d5a5cf',range:1.5,damage:13,delay:.38,speed:4.92,kind:'slash',names:['มีดคู่','มีดกวาด','มีดตรึง','เตะถอย','ทำแผล','เงาป้องกัน','มีดเจาะจุด','ก้าวเงา','ตั้งสติ','ระบำมีด']},
 {id:'shaman',name:'หมอผี',icon:'✦',role:'มนตรา · วิญญาณและยันต์',description:'ใช้วิญญาณโจมตีเป็นวง พร้อมอาคมฟื้นฟู',color:'#80e4d3',range:6,damage:14,delay:.78,speed:4.08,kind:'bolt'},
 {id:'acolyte',name:'พระ / แม่ชี',icon:'☼',role:'สนับสนุน · ฟื้นฟูและคุ้มครอง',description:'สวดคุ้มครอง ฟื้นฟูตนเอง และส่งแสงสลายภูต',color:'#f4dc9e',range:5.5,damage:10,delay:1,speed:3.96,kind:'blessing',names:['แสงเมตตา','รัศมีสงบ','ตรึงจิต','แสงผลัก','พรฟื้นฟู','เขตคุ้มครอง','แสงสลายภูต','ก้าวสงบ','ภาวนา','รัศมีคุ้มครอง']}
];
export const NOVICE={id:'novice',name:'ผู้ฝึกตน',icon:'✿',role:'Novice · จุดเริ่มต้นของทุกเส้นทาง',description:'ฝึกจน Job 10 ตันเพื่อเลือกอาชีพ · อาชีพ Job 40 ตันเพื่อเป็น Master',color:'#d6c79d',range:1.4,damage:12,delay:.8,speed:4.08,kind:'punch',names:['หมัดฝึกฝน','กวาดแขน','หยุดคู่ต่อสู้','ผลักถอย','พักหายใจ','ตั้งรับ','หมัดมุ่งมั่น','ก้าวหลบ','รวบรวมสมาธิ','แรงฮึดสุดท้าย']};
export const isClass=id=>id==='novice'||CLASSES.some(c=>c.id===id);
export function getClass(id='shaman'){const c=id==='novice'?NOVICE:CLASSES.find(c=>c.id===id);if(!c)throw new Error('invalid-class');return c;}
export const className=(id,gender)=>id==='acolyte'?(gender==='female'?'แม่ชี':'พระ'):getClass(id).name;
export const atlasPath=id=>'./assets/classes/'+getClass(id).id+(id==='novice'?'-18.png':'-09.png');
// 0.101 Master skills (slots 10-14, skill-progress.js MASTER_FROM): a stronger cast of the strike, area, recover,
// heavy strike and ultimate, opened when that skill reaches Lv 10. Same type, so motion, art and AUTO carry over.
export const MASTER_NAMES={
 novice:['หมัดครูฝึก','กวาดลมกรด','ลมหายใจครู','หมัดสิบปี','ฮึดครั้งสุดท้าย'],
 swordsman:['ดาบฟ้าผ่า','ดาบพายุหมุน','ปราณขุนศึก','ดาบผ่าภูผา','วงดาบเทพพิทักษ์'],
 lancer:['ทวนสายฟ้า','ทวนวายุ','ปราณทวนหลวง','ทวนเจาะบาดาล','ทวนจักรผัน'],
 hunter:['ศรพญาเหยี่ยว','ฝนศรพันดอก','ยาป่าหิมพานต์','ศรทะลวงฟ้า','วงศรพญานาค'],
 boxer:['หนุมานถวายแหวน','เถรกวาดลาน','ลมปราณครูมวย','จระเข้ฟาดหาง','แม่ไม้ครูใหญ่'],
 rogue:['มีดเงาพราย','พายุมีดเงา','ยาสมานเงา','มีดปลิดวิญญาณ','ระบำมีดราตรี'],
 shaman:['พรายเพลิงพันดวง','อัคคีกัลป์','น้ำมนต์คืนชีพ','ยันต์ตรีนิสิงเห','มหาวงนวหรคุณ'],
 acolyte:['แสงธรรมรัศมี','รัศมีพุทธคุณ','พรมหาเมตตา','แสงปราบมาร','มหารัศมีคุ้มครอง']
};
function masterSkill(s,name,n){
 const m={...s,name,short:name,key:'Alt+'+n,master:true,cost:Math.round(s.cost*1.5),cd:Math.round(s.cd*1.5*10)/10};
 if(s.damage)m.damage=Math.round(s.damage*1.6);
 if(s.radius)m.radius=s.radius+1;
 if(s.type==='heal')m.heal=Math.round((s.heal??48)*1.8);
 return m;
}
export function classSkills(id,base){
 const skills=baseSkills(id,base);
 if(id==='novice')return [...skills,...MASTER_FROM.map(()=>({}))].map((s,i)=>NOVICE_SLOTS.includes(i)?{
  ...s,key:String(NOVICE_SLOTS.indexOf(i)+1),maxLevel:NOVICE_MAX,...(i===0?{damage:22,cost:5,cd:3,tip:'หมัดพื้นฐานสำหรับโจมตีเป้าหมายเดียว'}:i===4?{heal:32,cost:8,cd:12,tip:'พักฟื้นพลังชีวิตของตนเอง'}:{duration:4,cost:8,cd:10,tip:'ตั้งรับเพื่อลดความเสียหายชั่วคราว'})
 }:{name:'ช่องสำรอง',short:'—',key:i<10?String((i+1)%10):'Alt+'+(i-9),icon:'',cost:0,cd:0,type:'reserved',reserved:true});
 return [...skills,...MASTER_FROM.map((from,i)=>masterSkill(skills[from],MASTER_NAMES[id][i],i+1))];
}
function baseSkills(id,base){
 const c=getClass(id);if(id==='shaman')return base;
 return base.map((s,i)=>{
  const next={...s,name:c.names[i],short:c.names[i],color:c.color};
  if(s.range)next.range=id==='hunter'?7:id==='acolyte'?5:c.range+.4;
  if(i===0||i===6){next.type=c.kind;next.icon=c.icon;}
  if(['novice','swordsman','lancer','boxer','rogue'].includes(id)&&i===1){next.type='nova';delete next.range;next.radius=c.range+.7;}
  if(i===4)next.heal=id==='acolyte'?75:40;
  if(i===5)next.duration=id==='acolyte'?12:8;
  if(i===0)next.damage=c.damage*2;
  if(i===6)next.damage=c.damage*3;
  return next;
 });
}
// 0.85 admin balance overrides (balance.js): basic attack damage, delay and reach per path.
for(const c of [NOVICE,...CLASSES])patch('classes',c.id,c);
