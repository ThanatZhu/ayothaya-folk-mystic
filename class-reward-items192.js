import {FAMILIES,WEAPON_CLASSES,weaponId,TIERS,gearText,gearLook,pieceId,SET_SLOTS} from './gear-sets.js';
export const CLASS_REWARD_BOX='class-red-set-box';
export const CLASS_REWARD_TIER=4,CLASS_REWARD_LEVEL=55,CLASS_REWARD_GRADE=4;
export const CLASS_REWARD_MAIL_ID='class-red-set-lv55-v1';
export const familyWeaponId=(family,classId)=>'reward-'+family+'-'+classId+'-four';
export const familySetItemIds=(family,character)=>[familyWeaponId(family,character.classId),...SET_SLOTS.map(slot=>pieceId(family,slot,gearLook(character.classId,character.gender),CLASS_REWARD_TIER))].map(id=>id+'^4');
export function buildClassRewardItems(base){
 const out={[CLASS_REWARD_BOX]:{name:'กล่องยุทธภัณฑ์แดง Lv.55',kind:'scroll',image:'assets/class-reward192/weapon-choice-box.png',sell:0,rarity:4,setChoice:true,
  text:'เลือกเซ็ตสีแดง Lv.55 ตรงอาชีพตนเองครบ 5 ชิ้น · อาวุธ หมวก เสื้อ ผ้าคลุม รองเท้า · ทะลวง / เพชฌฆาต / มนตรา / กำแพงเพชร / วายุ'}};
 for(const family of FAMILIES)for(const [classId,word] of WEAPON_CLASSES){
  const original=base[weaponId(classId,CLASS_REWARD_TIER)];if(!original)throw Error('missing-reward-weapon');
  const item={...original,name:word+family.sets[CLASS_REWARD_TIER-1],set:{family:family.key,tier:CLASS_REWARD_TIER},pct:{...family.piece},classReward:true,
   note:'อาวุธชุด'+family.name+' · Lv.'+TIERS[CLASS_REWARD_TIER-1]+' · รางวัลเปลี่ยนอาชีพ · ร่วมโบนัสเซ็ตสายเดียวกัน'};
  item.text=gearText(item);out[familyWeaponId(family.key,classId)]=item;
 }
 return out;
}
