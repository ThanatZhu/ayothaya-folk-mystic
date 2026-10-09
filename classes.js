// Shared profession catalogue: lobby, persistence, combat and sprite renderer.
export const CLASSES=[
 {id:'swordsman',name:'นักดาบ',icon:'⚔',role:'แนวหน้า · ดาบและโล่',description:'เข้าประชิด ฟันกวาด และตั้งรับด้วยโล่',color:'#e5b867',range:1.65,damage:21,delay:.8,speed:3.4,kind:'slash',names:['ฟันเปิดทาง','ดาบกวาด','ตีสกัด','โล่กระแทก','พักหายใจ','ตั้งโล่','ดาบผ่าเกราะ','พุ่งเข้าหา','รวบรวมแรง','วงดาบพิทักษ์']},
 {id:'lancer',name:'นักทวน',icon:'➶',role:'คุมระยะ · ทวนยาว',description:'แทงได้ไกลกว่าดาบ หยุดและผลักศัตรู',color:'#eab57b',range:2.6,damage:23,delay:1,speed:3.2,kind:'thrust',names:['แทงทวน','กวาดปลายทวน','ตรึงปลายทวน','ทวนผลัก','พักลมปราณ','ตั้งรับทวน','แทงทะลวง','ก้าวทวน','ตั้งสมาธิ','ทวนหมุน']},
 {id:'hunter',name:'นายพราน',icon:'➹',role:'ระยะไกล · ธนูและกับดัก',description:'ยิงจากระยะไกล ตรึงเป้าหมายก่อนถอย',color:'#b8ce82',range:6,damage:15,delay:.85,speed:3.6,kind:'arrow',names:['ศรแม่นยำ','ฝนลูกศร','บ่วงพราน','ศรผลัก','สมุนไพรป่า','พรางกาย','ศรเจาะเกราะ','ก้าวพงไพร','ลมหายใจพราน','วงศรพิทักษ์']},
 {id:'boxer',name:'นักมวย',icon:'✊',role:'ประชิดเร็ว · หมัดและศอก',description:'เข้าประชิดระยะสั้น ออกหมัดไวและเคลื่อนตัวคล่อง',color:'#efac88',range:1.3,damage:14,delay:.43,speed:3.8,kind:'punch',names:['หมัดตรง','ศอกกลับ','จับล็อก','ถีบส่ง','พักยก','ตั้งการ์ด','หมัดทะลวง','ย่างสามขุม','คุมลมหายใจ','แม่ไม้มวยไทย']},
 {id:'rogue',name:'จอมโจร',icon:'✧',role:'คล่องตัว · มีดคู่',description:'โจมตีรวดเร็ว ใช้มีดคู่และก้าวหลบ',color:'#d5a5cf',range:1.5,damage:13,delay:.38,speed:4.1,kind:'slash',names:['มีดคู่','มีดกวาด','มีดตรึง','เตะถอย','ทำแผล','เงาป้องกัน','มีดเจาะจุด','ก้าวเงา','ตั้งสติ','ระบำมีด']},
 {id:'shaman',name:'หมอผี',icon:'✦',role:'มนตรา · วิญญาณและยันต์',description:'ใช้วิญญาณโจมตีเป็นวง พร้อมอาคมฟื้นฟู',color:'#80e4d3',range:3.3,damage:14,delay:.78,speed:3.4,kind:'bolt'},
 {id:'acolyte',name:'พระ / แม่ชี',icon:'☼',role:'สนับสนุน · ฟื้นฟูและคุ้มครอง',description:'สวดคุ้มครอง ฟื้นฟูตนเอง และส่งแสงสลายภูต',color:'#f4dc9e',range:4.2,damage:10,delay:1,speed:3.3,kind:'blessing',names:['แสงเมตตา','รัศมีสงบ','ตรึงจิต','แสงผลัก','พรฟื้นฟู','เขตคุ้มครอง','แสงสลายภูต','ก้าวสงบ','ภาวนา','รัศมีคุ้มครอง']}
];
export const isClass=id=>CLASSES.some(c=>c.id===id);
export function getClass(id='shaman'){const c=CLASSES.find(c=>c.id===id);if(!c)throw new Error('invalid-class');return c;}
export const className=(id,gender)=>id==='acolyte'?(gender==='female'?'แม่ชี':'พระ'):getClass(id).name;
export const atlasPath=id=>'./assets/classes/'+getClass(id).id+'-09.png';
export function classSkills(id,base){
 const c=getClass(id);if(id==='shaman')return base;
 return base.map((s,i)=>{
  const next={...s,name:c.names[i],short:c.names[i],color:c.color};
  if(s.range)next.range=id==='hunter'?7:id==='acolyte'?5:c.range+.4;
  if(i===0||i===6){next.type=c.kind;next.icon=c.icon;}
  if(['swordsman','lancer','boxer','rogue'].includes(id)&&i===1){next.type='nova';delete next.range;next.radius=c.range+.7;}
  if(i===4)next.heal=id==='acolyte'?75:40;
  if(i===5)next.duration=id==='acolyte'?12:8;
  if(i===0)next.damage=c.damage*2;
  if(i===6)next.damage=c.damage*3;
  return next;
 });
}
