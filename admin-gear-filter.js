// 0.117 back-office gear filters (gift picker + items tab): look · tier · set · slot, plus the grade to send.
// 1,000+ gear pieces since the set redesign, so the old per-class chips were not enough.
import {LOOKS,FAMILIES,TIERS,GRADES} from './gear-sets.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';');
const LOOK_NAME=Object.fromEntries(LOOKS);
const lookClass=l=>l==='monk'||l==='nun'?'acolyte':l;
export const SLOT_NAME={weapon:'อาวุธ',head:'หมวก',armor:'เสื้อ',garment:'ผ้าคลุม',shoes:'รองเท้า',accessory:'เครื่องประดับ'};
const GROUPS=[['all','ทุกสาย'],...FAMILIES.map(f=>[f.key,'ชุด'+f.name]),['boss','เซ็ทบอส (รุ้ง)'],['weapon','อาวุธตามขั้น'],['starter','ชุดเริ่มต้น'],['accessory','เครื่องประดับ']];
export const newGearFilter=(look='auto')=>({look,tier:0,group:'all',slot:'all',grade:0});
const groupOf=it=>it.set?.family??(it.bossSet?'boss':it.starter?'starter':it.slot==='accessory'?'accessory':it.tier?'weapon':'other');

// look: 'auto' = the picked player's look (passed in), 'all', or a LOOKS key. Weapons follow the look's class.
export function gearMatch(it,f,playerLook=null){
 if(it?.kind!=='gear')return false;
 const lk=f.look==='auto'?playerLook:f.look;
 if(lk&&lk!=='all'){if(it.look){if(it.look!==lk)return false;}else if(it.classes&&!it.classes.includes(lookClass(lk)))return false;}
 if(f.tier&&(it.set?.tier??it.tier)!==f.tier)return false;
 if(f.group!=='all'&&groupOf(it)!==f.group)return false;
 return f.slot==='all'||it.slot===f.slot;
}
// Selects with data-gf="<key>"; `auto` adds "ตามผู้เล่น", `grade` adds the grade to send.
export function gearFilterHTML(f,{autoName=null,grade=false}={}){
 const sel=(k,label,opts)=>`<label class="gf"><span>${label}</span><select data-gf="${k}">${opts.map(([v,n])=>`<option value="${v}"${String(f[k])===String(v)?' selected':''}>${esc(n)}</option>`).join('')}</select></label>`;
 return `<div class="gear-filter">`+
  sel('look','แบบอาชีพ',[...(autoName!=null?[['auto','ตามผู้เล่น · '+(autoName||'ทุกแบบ')]]:[]),['all','ทุกแบบ'],...LOOKS])+
  sel('tier','ขั้น',[[0,'ทุกขั้น'],...TIERS.map((l,i)=>[i+1,'ขั้น '+(i+1)+' · Lv.'+l])])+
  sel('group','สาย',GROUPS)+
  sel('slot','ช่อง',[['all','ทุกช่อง'],...Object.entries(SLOT_NAME)])+
  (grade?sel('grade','เกรดที่จะส่ง',GRADES.map((g,i)=>[i,g.name])):'')+`</div>`;
}
export function bindGearFilter(root,f,onChange){
 root.querySelectorAll('[data-gf]').forEach(el=>el.onchange=()=>{const k=el.dataset.gf;f[k]=['tier','grade'].includes(k)?+el.value:el.value;onChange();});
}
export const lookName=l=>LOOK_NAME[l]??'';
