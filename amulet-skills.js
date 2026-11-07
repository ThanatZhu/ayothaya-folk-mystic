// Rainbow amulet skills. They run wherever combat runs (the server online, the page offline); an online client only shows the result.
// One cooldown per wearer, so swapping amulets cannot chain skills.
// ponytail: the cooldown lives on the world and a relog clears it; store it with roleCooldowns if players abuse that.
const CONTROL=['stun','sleep','root'],ready=w=>(w.amuletReadyAt??0)<=w.time,spend=(w,seconds)=>{w.amuletReadyAt=w.time+seconds;};
export const amuletDamage=w=>w.status?.baramee>0?1.15:1;
export const shieldPoints=w=>(w.status?.shield>0?w.roleCombat?.state.shield??0:0)+(w.petEffects?.shieldLeft>0?w.petEffects.shield:0)+(w.amuletShield?.hp??0);
// Call right before a hit reduces HP. Returns what is left of it. `floor` is the HP that already counts as a knockout (1 in a duel).
export function amuletHit(w,amount,{pvp=false,floor=0}={}){
 if(!(amount>0))return 0;if(w.status.undying>0)return 0;
 const s=w.amuletShield;if(s){const absorbed=Math.min(amount,s.hp);s.hp-=absorbed;amount-=absorbed;if(s.hp<=0)w.amuletShield=null;if(!amount)return 0;}
 const p=w.player;if(amount<p.hp-floor||w.derived?.amuletSkill!=='amulet-phra-rod'||!ready(w))return amount;
 spend(w,pvp?300:180);w.status.undying=3;w.notice('ก้าวพ้นภยันตราย · แคล้วคลาด อมตะ 3 วินาที');return Math.max(0,p.hp-floor-1);
}
export function tickAmuletSkill(w,dt){
 if(w.amuletShield&&(w.amuletShield.left-=dt)<=0)w.amuletShield=null;
 const id=w.derived?.amuletSkill,p=w.player;if(p.hp<=0){w.amuletShield=null;return;}
 if(id==='amulet-somdej'&&p.hp<p.maxHp*.4&&ready(w)){spend(w,60);w.amuletShield={hp:Math.round(p.maxHp*.25),left:6};w.notice('ร่มโพธิ์คุ้มกาย · ได้เกราะคุ้มกาย');}
 if(id!=='amulet-phong-suphan'||!CONTROL.some(k=>w.status[k]>0))return;
 if(!(w.status.stoutSpirit>0)){if(!ready(w))return;spend(w,45);w.status.stoutSpirit=3;const heal=Math.round(p.maxHp*.15);p.hp=Math.min(p.maxHp,p.hp+heal);w.emit('heal',{x:p.x,z:p.z,amount:heal});w.notice('ขวัญมั่นแห่งสุพรรณ · หลุดจากสถานะ');}
 for(const k of CONTROL)delete w.status[k];
}
export function amuletCrit(w){
 if(w.derived?.amuletSkill!=='amulet-nang-phaya'||!ready(w))return;spend(w,30);w.status.baramee=6;w.notice('บารมีนางพญา · ปาร์ตี้รอบตัวแรงขึ้น');
 const p=w.player;for(const a of w.roleAllies?.()??[])if(a.world!==w&&a.player.hp>0&&Math.hypot(a.player.x-p.x,a.player.z-p.z)<=10)a.world.status.baramee=6;
}
export function amuletCoins(w,coins,random=Math.random){
 if(!coins||w.derived?.amuletSkill!=='amulet-sum-kor'||random()>=.02)return coins;
 w.notice('ลาภผลแห่งทุ่งเศรษฐี · เบี้ยจากตัวนี้ 10 เท่า');return coins*10;
}
