import {composeMail,deliverMail} from './mailbox.js';
import {FAMILIES,WEAPON_CLASSES,gearLook} from './gear-sets.js';
import {addLoot,normalizeBag,itemDef} from './items.js';
import {CLASS_REWARD_BOX,CLASS_REWARD_MAIL_ID,familySetItemIds} from './class-reward-items192.js';
const classes=new Set(WEAPON_CLASSES.map(([id])=>id));
export const classRewardEligible=record=>classes.has(record.character?.classId);
export const classRewardDelivered=record=>!!record.mailbox?.messages?.some(m=>m.id===CLASS_REWARD_MAIL_ID)||Object.hasOwn(record.mailbox?.deleted??{},CLASS_REWARD_MAIL_ID);
export function grantClassReward(record,now=Date.now()){
 if(!classRewardEligible(record)||classRewardDelivered(record))return record;
 const mail=composeMail({id:CLASS_REWARD_MAIL_ID,title:'เปลี่ยนอาชีพสำเร็จ · รับทั้งเซ็ตสีแดง Lv.55',sender:'ลานครูแห่งอโยธยา',serverId:record.serverId??'all',
  body:'ยินดีด้วยกับการเปลี่ยนอาชีพ! รับกล่องยุทธภัณฑ์แดง Lv.55 แล้วเปิดจากกระเป๋า เลือก 1 สายเซ็ต: ทะลวง เพชฌฆาต มนตรา กำแพงเพชร หรือวายุ ได้ครบ 5 ชิ้น ได้แก่ อาวุธ หมวก เสื้อ ผ้าคลุม และรองเท้า ตรงกับอาชีพและรูปลักษณ์ตัวละครขณะเปิดกล่อง ทุกชิ้นสีแดง สวมใส่เมื่อเลเวล 55 และร่วมโบนัสเซ็ตสายเดียวกัน\nหนึ่งกล่องต่อตัวละคร รวมผู้ที่เปลี่ยนอาชีพสำเร็จไปแล้วด้วย',
  attachments:{items:[{id:CLASS_REWARD_BOX,count:1}]}},now);
 return {...record,mailbox:deliverMail(record.mailbox,mail).mailbox};
}
export function chooseClassSet(record,action){
 if(typeof action.id!=='string'||!/^[A-Za-z0-9_-]{8,80}$/.test(action.id))throw Error('invalid-request');
 if(!FAMILIES.some(f=>f.key===action.family))throw Error('invalid-set-family');
 const signature=JSON.stringify(['classSetChoose',action.family]),receipts=record.identityReceipts??[],old=receipts.find(r=>r.id===action.id);
 if(old){if(old.signature!==signature)throw Error('request-conflict');return structuredClone(record);}
 if(!classRewardEligible(record))throw Error('class-required');
 const bag=normalizeBag(record.bag);if(!(bag.items[CLASS_REWARD_BOX]>0))throw Error('no-set-box');
 const items=familySetItemIds(action.family,record.character).map(id=>({id,count:1}));
 if(items.length!==5||items.some(({id})=>{const it=itemDef(id);return !it||it.level!==55||it.grade!==4||(it.slot==='weapon'?!it.classes?.includes(record.character.classId):it.look!==gearLook(record.character.classId,record.character.gender));}))throw Error('bad-reward-set');
 if(--bag.items[CLASS_REWARD_BOX]===0)delete bag.items[CLASS_REWARD_BOX];
 const result=addLoot(bag,{items});if(result.lost.length)throw Error('bag-full');
 return {...record,bag:result.bag,identityReceipts:[...receipts,{id:action.id,signature}].slice(-64)};
}
