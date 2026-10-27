// The colour path is explicit; green-grade legacy drops remain usable items.
export const WEAPON_CRAFT_GRADES=[0,2,3,4];
export const WEAPON_COLOURS={0:'สีฟ้า',2:'สีม่วง',3:'สีส้ม',4:'สีแดง'};
export const gradeId=(base,grade)=>grade?base+'^'+grade:base;
export function weaponCraftRecipes(blue){
 return WEAPON_CRAFT_GRADES.map((grade,i)=>i?{...blue,out:gradeId(blue.out,grade),weaponGrade:grade,needs:{[gradeId(blue.out,WEAPON_CRAFT_GRADES[i-1])]:1,...Object.fromEntries(Object.entries(blue.needs).map(([id,n])=>[id,n*(i+1)]))},coins:blue.coins*2**i}:{...blue,weaponGrade:0});
}
const classes=new Set(['swordsman','lancer','hunter','boxer','rogue','shaman','acolyte']);
export function recipeAllowed(item,character){
 if(!item)return false;if(!character)return true;
 if(item.classes&&!item.classes.includes(character.classId))return false;
 if(!item.rainbow)return true;
 if(!classes.has(character.classId))return false;
 if(item.bossSet&&item.bossSet!==character.classId)return false;
 if(item.look&&character.gender&&item.bossSet==='acolyte'&&item.look!==(character.gender==='female'?'nun':'monk'))return false;
 return true;
}

export const WEAPON_MATERIALS=[
 ['weapon-fragment-rice','เศษศาสตราทุ่งนา',0],['weapon-fragment-marsh','เศษศาสตราบึงบัว',3],['weapon-fragment-bamboo','เศษศาสตราป่าไผ่',4],['weapon-fragment-himmapan','เศษศาสตราหิมพานต์',6],['weapon-fragment-naga','เศษศาสตรานาคบาดาล',7],['weapon-fragment-kailash','เศษศาสตราไกรลาส',8]
];
export const weaponMaterialTier=level=>level>=87?6:level>=72?5:level>=57?4:level>=36?3:level>=25?2:1;
export function buildWeaponMaterials(){return Object.fromEntries(WEAPON_MATERIALS.map(([id,name,icon],i)=>[id,{name,kind:'loot',atlas:'world125',icon,sell:5*(i+1),text:'เศษวัสดุสำหรับคราฟต์และพัฒนาสีอาวุธ · ดรอปจากมอนสเตอร์ในช่วงเลเวลเดียวกับอาวุธ'}]));}
