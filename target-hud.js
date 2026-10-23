// Shared by the game and the local HUD preview; never changes combat selection.
export function targetHudState({target,mobs=[],player,types=[]}){
 const alive=m=>m&&m.hp>0;
 const selected=alive(target)?target:null;
 const boss=selected&&!selected.pvp&&types[selected.type]?.boss?selected:mobs.find(m=>alive(m)&&types[m.type]?.boss&&m.aggro&&player&&Math.hypot(m.x-player.x,m.z-player.z)<=32);
 const focus=boss??selected;
 if(!focus)return {visible:false,kind:'none',name:'',percent:0};
 return {visible:true,kind:focus.pvp?'player':types[focus.type]?.boss?'boss':'monster',
  name:focus.pvp?focus.name:types[focus.type]?.name??'มอนสเตอร์',
  hp:Math.max(0,Math.ceil(focus.hp)),maxHp:focus.maxHp,
  percent:focus.maxHp>0?Math.max(0,Math.min(100,focus.hp/focus.maxHp*100)):0};
}
export function paintTargetHud(doc,state){
 const panel=doc.querySelector('.target-panel');if(!panel)return;
 panel.hidden=!state.visible;panel.dataset.kind=state.kind;
 doc.getElementById('target-name').textContent=state.name;
 doc.getElementById('target-hp').textContent=state.visible?`${state.hp} / ${state.maxHp}`:'';
 doc.getElementById('target-fill').style.width=state.percent+'%';
}
