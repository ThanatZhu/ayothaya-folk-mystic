export function adminLevelHTML(player,busy=false){
 const rows=[['base','Base Level',player.level,player.baseCap??99],['job','Job Level',player.jobLevel??1,player.jobCap??10]];
 return `<section class="admin-level-panel" aria-label="เพิ่มเลเวลตัวละคร"><h3>เพิ่มเลเวลตัวละคร</h3><p>ได้รับแต้มสถานะและแต้มสกิลตามเลเวล · ของขวัญตามระดับส่งเข้าจดหมาย</p><div>${rows.map(([kind,label,current,cap])=>`<form data-level-kind="${kind}"><label for="admin-level-${kind}"><b>${label}</b><span>Lv.${current} / ${cap}</span></label><div><input id="admin-level-${kind}" type="number" inputmode="numeric" min="1" max="${Math.max(1,cap-current)}" step="1" value="1" aria-label="จำนวนเลเวลที่เพิ่ม ${label}"${busy||current>=cap?' disabled':''}><button type="submit"${busy||current>=cap?' disabled':''}>${current>=cap?'เลเวลสูงสุดแล้ว':busy?'กำลังบันทึก…':'เพิ่ม '+label}</button></div></form>`).join('')}</div></section>`;
}
export function bindAdminLevels(root,{player,onSend}){
 for(const form of root.querySelectorAll('[data-level-kind]'))form.onsubmit=e=>{
  e.preventDefault();if(!form.reportValidity())return;
  const count=Number(form.querySelector('input').value),isBase=form.dataset.levelKind==='base',current=isBase?player.level:player.jobLevel??1,cap=isBase?player.baseCap??99:player.jobCap??10;
  if(!Number.isInteger(count)||count<1||current+count>cap)return;
  onSend({peer:player.id,[isBase?'baseLevel':'jobLevel']:current+count});
 };
}
