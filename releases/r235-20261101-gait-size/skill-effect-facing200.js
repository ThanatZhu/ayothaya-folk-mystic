import * as THREE from './vendor/build/three.module.js';
import {VFX_SHEETS} from './assets/skills-next/vfx-2026-10/vfx-map.js';
// Audited against all 101 painted sheets, including frame 0/3: most auras,
// shrines, falling strikes and impact blooms must remain upright.
// These sheets have an authored horizontal travel axis (to the right).
const AIM=new Set(['sword-open','guard-link','guard-hook','duel-riposte','duel-storm','lance-pierce','lance-naga','van-hook','war-chain','hunt-shot','hunt-retreat','hunt-rama','rang-ambush','mb-barrage','rogue-shadowstab','rogue-execute','ym-reverse']);
const MIRROR=new Set(['lance-sweep','box-jab','box-elbow','box-triangle','ib-headbutt','rogue-slash','duel-cross','shade-moonfall','mb-maemai','venom-hamstring','venom-sunset']);
export const SHEET_FACING=Object.freeze(Object.fromEntries(Object.keys(VFX_SHEETS).map(id=>[id,Object.freeze({mode:id==='rang-fan'?'aim':AIM.has(id)?'aim':MIRROR.has(id)?'mirror':'upright',axis:id==='rang-fan'?Math.PI/2:0,fromFrame:['hunt-rama','rang-ambush'].includes(id)?2:0})])));
export function effectDirection(from,to,fallback){
 const dx=to?.x-from?.x,dz=to?.z-from?.z,d=Math.hypot(dx,dz);if(Number.isFinite(d)&&d>.01)return {x:dx/d,z:dz/d};
 const n=Math.hypot(fallback?.x,fallback?.z);return Number.isFinite(n)&&n>.001?{x:fallback.x/n,z:fallback.z/n}:{x:1,z:0};
}
const a=new THREE.Vector3(),b=new THREE.Vector3(),wrap=x=>Math.atan2(Math.sin(x),Math.cos(x));
export function projectedCastAngle(camera,from,direction){
 if(camera){a.set(from.x,0,from.z).project(camera);b.set(from.x+direction.x,0,from.z+direction.z).project(camera);const dx=b.x-a.x,dy=b.y-a.y;if(Number.isFinite(dx+dy)&&Math.hypot(dx,dy)>1e-8)return Math.atan2(dy,dx);}
 return Math.atan2(-direction.z,direction.x);
}
export function sheetFacing(id,camera,from,direction,frame=3){
 const policy=SHEET_FACING[id]??{mode:'upright',axis:0};if(policy.mode==='upright'||frame<(policy.fromFrame??0))return {rotation:0,mirror:false};
 const angle=projectedCastAngle(camera,from,direction),mirror=policy.axis===0&&Math.cos(angle)<-1e-6;
 return {mirror,rotation:policy.mode==='mirror'?0:wrap(angle-(mirror?Math.PI-policy.axis:policy.axis))};
}
export function mirroredFrame(texture){const copy=texture.clone();copy.offset.x+=copy.repeat.x;copy.repeat.x=-copy.repeat.x;copy.needsUpdate=true;return copy;}
