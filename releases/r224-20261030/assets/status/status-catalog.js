// Shared status art. A passive is shown only when its effect is active, never as a permanent HUD badge.
const buffs=[
 ['shield','เกราะอาคม','ลดความเสียหายด้วยเกราะอาคม','Magic armor','Reduces incoming damage'],
 ['guard','ตั้งรับ','กำลังตั้งรับการโจมตี','Guard','Guarding against attacks'],
 ['counter','รอสวนกลับ','พร้อมสวนเมื่อถูกโจมตี','Counter ready','Ready to counter an attack'],
 ['link','สายใยโล่','แบ่งรับความเสียหายกับผู้คุ้มกัน','Shield link','Shares damage with a protector'],
 ['sanctuary','เขตคุ้มครอง','ได้รับการคุ้มครองขณะอยู่ในเขต','Sanctuary','Protected while inside the field'],
 ['evade','หลบหลีก','เพิ่มความสามารถในการหลบหลีก','Evasion','Improved evasion'],
 ['inspired','ปลุกขวัญ','ได้รับแรงใจจากไก่อาคม','Inspired','Inspired by the mystical rooster'],
 ['stealth','พรางตัว','ซ่อนตัวเพื่อเตรียมลอบโจมตี','Stealth','Concealed for a surprise attack'],
 ['smoke','ควันคุ้มกัน','ได้รับการหลบหลีกจากม่านควัน','Smoke cover','Evasion from a smoke screen'],
 ['regen','ฟื้นฟูต่อเนื่อง','ได้รับการฟื้นฟู HP เป็นระยะ','Regeneration','Restores HP over time'],
 ['lifeTree','พรต้นบุญ','ได้รับการฟื้นฟูจากต้นบุญ','Sacred tree','Healing from the sacred tree'],
 ['reflect','สะท้อนอาคม','สะท้อนความเสียหายกลับบางส่วน','Reflection','Reflects part of incoming damage'],
 ['rooster','ไก่ชนคู่ใจ','มีไก่ชนช่วยต่อสู้','Rooster companion','A rooster is helping in combat'],
 ['spirit','พรายพิทักษ์','มีพรายช่วยต่อสู้','Spirit companion','A spirit is helping in combat'],
 ['combo','จังหวะมวย','สะสมแรงสำหรับท่าคอมโบ','Combo rhythm','Builds power for a combo finisher'],
 ['focus','รวมจิต','สมาธิและพลังมานา','Focus','Concentration and mana'],
 ['blessing','พรเมตตา','ได้รับพรคุ้มครอง','Blessing','A protective blessing'],
 ['zoneGuard','หลักทวนมั่น','รับแรงได้ดีขึ้นภายในเขตทวน','Planted stance','Improved defense inside a spear field'],
 ['lowGuard','ใจไม่ยอมล้ม','รับแรงได้ดีขึ้นเมื่อ HP ต่ำ','Tenacity','Improved defense at low HP'],
 ['strength','อาหารเสริมพลัง','อาหารเพิ่ม STR','Strength meal','Food increases STR'],
 ['agility','อาหารเสริมคล่องตัว','อาหารเพิ่ม AGI','Agility meal','Food increases AGI'],
 ['vitality','อาหารเสริมกาย','อาหารเพิ่ม VIT','Vitality meal','Food increases VIT'],
 ['intelligence','อาหารเสริมปัญญา','อาหารเพิ่ม INT','Intelligence meal','Food increases INT'],
 ['dexterity','อาหารเสริมแม่นยำ','อาหารเพิ่ม DEX','Dexterity meal','Food increases DEX']
];
const debuffs=[
 ['poison','ติดพิษ','เสีย HP ทุกวินาที (ไม่ตาย)','Poison','Loses HP over time without killing'],
 ['stun','มึนงง','ขยับและโจมตีไม่ได้','Stun','Cannot move or attack'],
 ['sleep','หลับ','ตื่นเมื่อถูกโจมตี','Sleep','Wakes when attacked'],
 ['silence','ใบ้','ใช้สกิลไม่ได้','Silence','Cannot use skills'],
 ['blind','ตาพร่า','ความเสียหาย -30% · หลบได้น้อยลง','Blindness','Damage -30% and reduced evasion'],
 ['curse','คำสาป','ความเสียหายและความเร็วลดลง','Curse','Reduced damage and speed'],
 ['root','ตรึง','เคลื่อนที่ไม่ได้ชั่วคราว','Rooted','Temporarily unable to move'],
 ['slow','เชื่องช้า','ความเร็วเคลื่อนที่ลดลง','Slow','Reduced movement speed'],
 ['fear','หวาดกลัว','ขวัญเสียจากอาถรรพ์','Fear','Frightened by dark magic'],
 ['break','เกราะแตก','พลังป้องกันลดลง','Armor break','Reduced defense'],
 ['brand','ตราดาบทะลวง','รับความเสียหายจากการโจมตีเพิ่ม','Vulnerability brand','Takes increased attack damage'],
 ['mark','หมายตาพราน','ถูกพรานหมายตาไว้','Hunter mark','Marked by a hunter']
];
export const STATUS_ICONS=[...buffs.map((row,index)=>({row,index,kind:'buff',rows:4,sheet:'buffs-v1.png'})),...debuffs.map((row,index)=>({row,index,kind:'debuff',rows:2,sheet:'debuffs-v1.png'}))].map(({row,...rest})=>({id:row[0],name:row[1],description:row[2],en:row[3],enDescription:row[4],...rest}));
const byId=Object.fromEntries(STATUS_ICONS.map(s=>[s.id,s]));
export const STATUS_ALIASES={stagger:'stun',taunt:'inspired',decoy:'stealth',casting:'focus',regeneration:'regen',lifeTree:'lifeTree',sanctuaryBuff:'sanctuary'};
const aliasLabels={stagger:['เสียหลัก','Stagger'],taunt:['ถูกยั่ว','Taunted'],decoy:['ล่อเงา','Shadow decoy'],casting:['กำลังร่าย','Casting']};
export function statusDefinition(id){const source=byId[id]??byId[STATUS_ALIASES[id]];if(!source)return null;const labels=aliasLabels[id];return labels?{...source,id,name:labels[0],en:labels[1],description:labels[0],enDescription:labels[1]}:source;}
export function statusArtStyle(id){
 const s=statusDefinition(id);if(!s)return '';
 // Native source is preserved. Sample inside each cell to omit painted cell seams.
 const fraction=.92,inset=(1-fraction)/2,col=s.index%6,row=Math.floor(s.index/6);
 const x=(col+inset)/(6-fraction)*100,y=(row+inset)/(s.rows-fraction)*100;
 return `background-image:url("./assets/status/${s.sheet}");background-size:${6/fraction*100}% ${s.rows/fraction*100}%;background-position:${x}% ${y}%`;
}
export function remainingStatus(value){const n=typeof value==='number'?value:value?.time??value?.left;return Number.isFinite(n)&&n>0?Math.ceil(n):0;}
export function statusTime(seconds){return seconds>=60?Math.ceil(seconds/60)+'m':String(seconds);}
