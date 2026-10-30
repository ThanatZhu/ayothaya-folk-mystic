import {FAMILIES,WEAPON_CLASSES,weaponId,TIERS,TIER_WORDS,gearText,gearLook,pieceId,SET_SLOTS} from './gear-sets.js';
export const CLASS_REWARD_BOX='class-red-set-box';
export const CLASS_REWARD_TIER=4,CLASS_REWARD_LEVEL=55,CLASS_REWARD_GRADE=4;
export const CLASS_REWARD_MAIL_ID='class-red-set-lv55-v1';
// 0.123 owner: a job change now pays the Lv.25 red set. Lv.55 boxes already handed out (0.120–0.122) still open.
export const CLASS_REWARD_BOX_25='class-red-set-box-two',CLASS_REWARD_MAIL_ID_25='class-red-set-lv25-v1';
export const REWARD_BOX_TIER={[CLASS_REWARD_BOX]:CLASS_REWARD_TIER,[CLASS_REWARD_BOX_25]:2};
export const familyWeaponId=(family,classId,tier=CLASS_REWARD_TIER)=>'reward-'+family+'-'+classId+'-'+TIER_WORDS[tier-1];
export const familySetItemIds=(family,character,tier=CLASS_REWARD_TIER)=>[familyWeaponId(family,character.classId,tier),...SET_SLOTS.map(slot=>pieceId(family,slot,gearLook(character.classId,character.gender),tier))].map(id=>id+'^4');
export function buildClassRewardItems(base){
 const out={};
 for(const [box,tier] of Object.entries(REWARD_BOX_TIER)){
  out[box]={name:'กล่องยุทธภัณฑ์แดง Lv.'+TIERS[tier-1],kind:'scroll',image:'assets/class-reward192/weapon-choice-box.png',sell:0,rarity:4,setChoice:true,
   text:'เลือกเซ็ตสีแดง Lv.'+TIERS[tier-1]+' ตรงอาชีพตนเองครบ 5 ชิ้น · อาวุธ หมวก เสื้อ ผ้าคลุม รองเท้า · ทะลวง / เพชฌฆาต / มนตรา / กำแพงเพชร / วายุ'};
  for(const family of FAMILIES)for(const [classId,word] of WEAPON_CLASSES){
   const original=base[weaponId(classId,tier)];if(!original)throw Error('missing-reward-weapon');
   const item={...original,name:word+family.sets[tier-1],set:{family:family.key,tier},pct:{...family.piece},classReward:true,
    note:'อาวุธชุด'+family.name+' · Lv.'+TIERS[tier-1]+' · รางวัลเปลี่ยนอาชีพ · ร่วมโบนัสเซ็ตสายเดียวกัน'};
   item.text=gearText(item);out[familyWeaponId(family.key,classId,tier)]=item;
  }
 }
 return out;
}
