export function createRolePlayUI({world,clear,returnToSpawn}){
 const panel=document.createElement('section');panel.id='role-down-panel';panel.hidden=true;panel.setAttribute('aria-label','รอคืนขวัญ');panel.innerHTML='<strong>หมดแรง · รอเพื่อนคืนขวัญ</strong><span></span><button type="button">กลับจุดเกิด</button>';document.getElementById('game-shell').append(panel);
 panel.querySelector('button').onclick=()=>{clear();returnToSpawn();};
 const css=document.createElement('link');css.rel='stylesheet';css.href='./role-live.css?v=1';document.head.append(css);
 const aim=()=>{world.roleAim=true;world.notice('แตะพื้นเพื่อเลือกจุดวางสกิล');clear();};addEventListener('role-aim-ground',aim);
 return {update(){panel.hidden=!world.roleCombat||world.player.hp>0;if(!panel.hidden)panel.querySelector('span').textContent='กลับจุดเกิดอัตโนมัติใน '+Math.max(0,Math.ceil(world.player.down))+' วินาที';},dispose(){removeEventListener('role-aim-ground',aim);panel.remove();}};
}
