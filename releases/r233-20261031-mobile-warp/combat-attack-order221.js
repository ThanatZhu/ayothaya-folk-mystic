// Explicit basic attack intent is independent of combat AUTO and never selects a skill.
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function startAttackOrder(w){
 if(w.safe||w.player.hp<=0)return false;
 const target=w.target??w.nearest(30);if(!target)return w.basicAttack(true);
 w.clearEmote();w.auto=false;w.path=[];w.targetId=target.id;
 if(w.attackOrder?.id!==target.id)w.attackOrder={id:target.id,path:[],repath:0,stuck:0};
 return true;
}
export function stepAttackOrder(w,dt,{reachTo,lineClear,walkLineClear,findPath,moveBody},manual=false){
 const order=w.attackOrder;if(!order)return;const p=w.player,m=w.foes().find(a=>a.id===order.id&&a.hp>0);
 if(manual||w.safe||w.auto||p.hp<=0||!m||w.targetId!==order.id||distance(p,m)>45){w.attackOrder=null;return;}
 if(w.roleCombat?.state.pending||w.basicPending||w.legacyPending)return;
 if(reachTo(p,m)<=w.profession.range-.08&&lineClear(p,m,w.nav)){order.path=[];order.stuck=0;w.basicAttack(true);return;}
 if((order.repath-=dt)<=0){order.path=walkLineClear(p,m,w.nav)?[{x:m.x,z:m.z}]:findPath(p,m,w.nav);order.repath=.65;}
 while(order.path.length&&distance(p,order.path[0])<.16)order.path.shift();
 const next=order.path[0],before={x:p.x,z:p.z};
 if(next){const d=distance(p,next)||1,step=Math.min(d,w.walkSpeed(false)*dt);p.face={x:(next.x-p.x)/d,z:(next.z-p.z)/d};moveBody(p,p.face.x*step,p.face.z*step,w.nav);}
 order.stuck=distance(p,before)<.001?order.stuck+dt:0;
 if(order.stuck>3){w.attackOrder=null;w.notice('เดินไปหาเป้าหมายไม่ได้');}
}
