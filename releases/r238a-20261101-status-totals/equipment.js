// Starter equipment is granted by profession. IDs, never client-supplied stats,
// cross the network. These first items change appearance, not combat balance.
const professions={
 novice:['มือเปล่า','ผ้าพันมือฝึกหัด','ชุดนักเดินทาง'],
 swordsman:['ดาบเหล็กและโล่','ดาบใบหยกและโล่','ชุดนักดาบ'],
 lancer:['หอกเหล็ก','ตรีศูลทอง','ชุดทหารหอก'],
 hunter:['ธนูไม้','ธนูงาช้างหยก','ชุดพราน'],
 boxer:['หมัดคาดเชือก','นวมผ้ายันต์แดง','ชุดนักมวย'],
 rogue:['มีดคู่เหล็ก','มีดคู่จันทร์คราม','ชุดจารชน'],
 shaman:['ไม้เท้าครู','คทาจันทร์วิญญาณ','ชุดหมอผี'],
 acolyte:['ประคำไม้','ประคำหยกบัวทอง','ชุดผู้บำเพ็ญ']
};
const dyes=[['original','แบบเดิม'],['indigo','คราม'],['crimson','ชาด'],['ivory','งาช้าง']];
export const EQUIPMENT=Object.freeze(Object.entries(professions).flatMap(([classId,names],i)=>[
 ...['basic','crafted'].map((art,n)=>Object.freeze({id:`${classId}-weapon-${art}`,slot:'weapon',classId,name:names[n],art,icon:i*2+n,description:n?'อาวุธรูปลักษณ์พิเศษ · ใช้ท่าของสายอาชีพเดิม':'อุปกรณ์ประจำสายอาชีพ'})),
 ...dyes.map(([dye,label])=>Object.freeze({id:`${classId}-outfit-${dye}`,slot:'outfit',classId,name:names[2]+' · '+label,dye,icon:16+i,description:dye==='original'?'ใช้ชุดและการแต่งตัวที่บันทึกไว้':'ชุดย้อมสี · คงทรงเครื่องแต่งกายประจำอาชีพ'}))
]));
const byId=new Map(EQUIPMENT.map(item=>[item.id,item]));
export const equipmentItem=id=>byId.get(id)??null;
export function starterEquipment(classId){if(!professions[classId])throw new Error('equipment-class');return EQUIPMENT.filter(i=>i.classId===classId);}
export function normalizeEquipment(input,classId){
 starterEquipment(classId);
 const result={version:1};
 for(const slot of ['weapon','outfit']){
  const item=equipmentItem(input?.[slot]);
  result[slot]=item?.classId===classId&&item.slot===slot?item.id:`${classId}-${slot}-${slot==='weapon'?'basic':'original'}`;
 }
 return result;
}
export function equipItem(current,classId,id){
 const item=equipmentItem(id);if(!item)throw new Error('equipment-item');
 if(item.classId!==classId)throw new Error('equipment-class');
 return {...normalizeEquipment(current,classId),[item.slot]:id};
}
export function equipmentAppearance(appearance,equipment,classId){
 const gear=normalizeEquipment(equipment,classId),dye=equipmentItem(gear.outfit).dye;
 return {...appearance,...(dye!=='original'?{outfit:dye}:{})};
}
