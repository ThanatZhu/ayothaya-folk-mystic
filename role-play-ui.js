export function createRolePlayUI({world,clear,respawn,itemCount=()=>0}){
 const panel=document.createElement('dialog');panel.id='role-down-panel';panel.setAttribute('aria-labelledby','role-down-title');panel.setAttribute('aria-describedby','role-down-description');
 panel.innerHTML='<img class="death-emblem" src="./assets/brand69/ayothaya-emblem.png" alt="" aria-hidden="true"><p class="death-eyebrow">เส้นทางยังไม่สิ้นสุด</p><h2 id="role-down-title">คุณหมดแรงแล้ว</h2><p id="role-down-description">เลือกจุดเกิดเพื่อออกเดินทางต่อ<br>หรือรอให้เพื่อนชุบชีวิต</p><div class="death-item"><img src="./assets/revival180/soul-talisman.png" alt=""><div><strong>ยันต์คืนขวัญ</strong><span class="death-item-count"></span></div></div><div class="death-choices"><button type="button" data-respawn="here"><strong>เกิดที่นี่</strong><small>ใช้ยันต์คืนขวัญ 1 ชิ้น</small></button><button type="button" data-respawn="capital"><strong>เกิดที่อยุธยา</strong><small>กลับจุดเกิดในเมือง</small></button></div><p class="death-feedback" role="status" aria-live="polite"></p>';
 document.body.append(panel);
 const buttons=[...panel.querySelectorAll('button')],feedback=panel.querySelector('.death-feedback'),countLabel=panel.querySelector('.death-item-count');let busy=false,wasDead=false,lastCount=-1;
 function availability(){const count=itemCount();buttons[0].disabled=busy||count<1;buttons[1].disabled=busy;if(count!==lastCount){countLabel.textContent='มี '+count+' ชิ้น';lastCount=count;}buttons[0].title=count>0?'ใช้ยันต์คืนขวัญ 1 ชิ้น':'ต้องมียันต์คืนขวัญ 1 ชิ้น';}
 panel.addEventListener('cancel',e=>e.preventDefault());
 // Native modal/top layer blocks pointer input; stop shortcuts reaching the game.
 for(const event of ['keydown','keyup'])panel.addEventListener(event,e=>e.stopPropagation());
 panel.addEventListener('click',async e=>{
  const button=e.target.closest('[data-respawn]');if(!button||button.disabled||busy||world.player.hp>0)return;
  busy=true;buttons.forEach(b=>b.disabled=true);feedback.textContent='กำลังคืนขวัญ…';clear();
  try{if(!await respawn(button.dataset.respawn))throw Error('respawn-failed');}
  catch(e){feedback.textContent=e.message==='no-revival-item'?'ต้องมียันต์คืนขวัญ 1 ชิ้น':'เชื่อมต่อไม่สำเร็จ กรุณาลองอีกครั้ง';}
  finally{busy=false;availability();}
 });
 const css=document.createElement('link');css.rel='stylesheet';css.href='./role-live.css?v=revival180';document.head.append(css);
 const aim=()=>{world.roleAim=true;world.notice('แตะพื้นเพื่อเลือกจุดวางสกิล');clear();};addEventListener('role-aim-ground',aim);
 return {update(){
  const dead=world.player.hp<=0;if(dead)availability();
  if(dead&&!wasDead){clear();feedback.textContent='';if(!panel.open)panel.showModal();(buttons[0].disabled?buttons[1]:buttons[0]).focus({preventScroll:true});}
  if(!dead&&panel.open){panel.close();feedback.textContent='';}
  wasDead=dead;
 },dispose(){removeEventListener('role-aim-ground',aim);panel.remove();css.remove();}};
}
