export function createRolePlayUI({world,clear,respawn}){
 const panel=document.createElement('dialog');panel.id='role-down-panel';panel.setAttribute('aria-labelledby','role-down-title');panel.setAttribute('aria-describedby','role-down-description');
 panel.innerHTML='<div class="death-emblem" aria-hidden="true">✦</div><p class="death-eyebrow">เส้นทางยังไม่สิ้นสุด</p><h2 id="role-down-title">คุณหมดแรงแล้ว</h2><p id="role-down-description">เลือกจุดเกิดเพื่อออกเดินทางต่อ<br>หรือรอให้เพื่อนชุบชีวิต</p><div class="death-choices"><button type="button" data-respawn="here"><strong>เกิดที่นี่</strong><small>คืนชีพ ณ ตำแหน่งเดิม</small></button><button type="button" data-respawn="capital"><strong>เกิดที่อยุธยา</strong><small>กลับจุดเกิดในเมือง</small></button></div><p class="death-feedback" role="status" aria-live="polite"></p>';
 document.body.append(panel);
 const buttons=[...panel.querySelectorAll('button')],feedback=panel.querySelector('.death-feedback');let busy=false,wasDead=false;
 panel.addEventListener('cancel',e=>e.preventDefault());
 // Native modal/top layer blocks pointer input; stop shortcuts reaching the game.
 for(const event of ['keydown','keyup'])panel.addEventListener(event,e=>e.stopPropagation());
 panel.addEventListener('click',async e=>{
  const button=e.target.closest('[data-respawn]');if(!button||busy||world.player.hp>0)return;
  busy=true;buttons.forEach(b=>b.disabled=true);feedback.textContent='กำลังคืนขวัญ…';clear();
  try{if(!await respawn(button.dataset.respawn))throw Error('respawn-failed');}
  catch{feedback.textContent='เชื่อมต่อไม่สำเร็จ กรุณาลองอีกครั้ง';}
  finally{busy=false;buttons.forEach(b=>b.disabled=false);}
 });
 const css=document.createElement('link');css.rel='stylesheet';css.href='./role-live.css?v=death178';document.head.append(css);
 const aim=()=>{world.roleAim=true;world.notice('แตะพื้นเพื่อเลือกจุดวางสกิล');clear();};addEventListener('role-aim-ground',aim);
 return {update(){
  const dead=world.player.hp<=0;
  if(dead&&!wasDead){clear();feedback.textContent='';if(!panel.open)panel.showModal();buttons[0].focus({preventScroll:true});}
  if(!dead&&panel.open){panel.close();feedback.textContent='';}
  wasDead=dead;
 },dispose(){removeEventListener('role-aim-ground',aim);panel.remove();css.remove();}};
}
