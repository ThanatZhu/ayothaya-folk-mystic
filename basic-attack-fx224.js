import * as THREE from './vendor/build/three.module.js';
import {ATTACK_CLASSES224,ATTACK_STYLE224,attackVariant224} from './attack-style224.js';
const caches=new Map(),plane=new THREE.PlaneGeometry(1,1),clamp=x=>Math.max(0,Math.min(1,x));
const compact=()=>globalThis.matchMedia?.('(pointer:coarse),(max-width:900px)').matches??false;
function resources(){
 if(typeof document==='undefined')return null;
 const tier=compact()?'sd':'hd';let c=caches.get(tier);
 if(c?.failed&&performance.now()-c.failed>5000){caches.delete(tier);c=null;}
 if(!c){c={ready:null};caches.set(tier,c);
 c.promise=(async()=>{
  const loader=new THREE.TextureLoader(),loaded=await Promise.allSettled(['trails','impacts'].map(k=>loader.loadAsync(new URL('./assets/attack224/fx-'+k+(tier==='sd'?'-sd':'')+'.webp',import.meta.url).href)));
  if(loaded.some(r=>r.status==='rejected')){for(const r of loaded)if(r.status==='fulfilled')r.value.dispose();throw Error('attack224-fx');}
  c.ready={};
  for(let j=0;j<2;j++){
   const base=loaded[j].value;base.colorSpace=THREE.SRGBColorSpace;base.generateMipmaps=false;base.magFilter=base.minFilter=THREE.LinearFilter;
   c.ready[j?'impacts':'trails']=Object.fromEntries(ATTACK_CLASSES224.map((id,row)=>[id,Array.from({length:6},(_,i)=>{const t=base.clone();t.repeat.set(1/6,1/8);t.offset.set(i/6,1-(row+1)/8);t.needsUpdate=true;return t;})]));
  }
  return true;
 })().catch(()=>{c.failed=performance.now();return false;});
 }
 return c;
}
export async function warmBasicFx224(){return await resources()?.promise??false;}
export function createBasicAttackEffect224(track,options={},provided=null){
 const id=track.classId,style=ATTACK_STYLE224[id];let art=provided??resources()?.ready;
 if(!style||(!art&&typeof document==='undefined'))return null;
 const from=options.from??{},to=options.to??from,origin=new THREE.Vector3(from.x??0,options.groundY??from.y??0,from.z??0);
 const target=new THREE.Vector3(to.x??origin.x,(to.y??origin.y)-origin.y+.95,to.z??origin.z);target.x-=origin.x;target.z-=origin.z;
 const aim=new THREE.Vector3(target.x,0,target.z);if(aim.lengthSq()<1e-8)aim.set(options.direction?.x??1,0,options.direction?.z??0);aim.normalize();
 const duration=Math.max(.05,Number.isFinite(track.duration)?track.duration:.6),impact=Math.max(0,Math.min(duration,(track.strikes?.[0]??.42)*duration));
 const release=style.projectile?impact*.62:Math.max(0,impact-Math.min(.1,impact*.7)),variant=attackVariant224(options.castId);
 const group=new THREE.Group();group.name='BasicAttack224';group.position.copy(origin);group.userData={classId:id,variant,castId:options.castId,impact,confirmed:false};
 const mat=()=>new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,toneMapped:false});
 const trail=new THREE.Mesh(plane,mat()),spark=new THREE.Mesh(plane,mat());group.add(trail,spark);for(const m of [trail,spark]){m.visible=false;m.renderOrder=6;m.frustumCulled=false;}
 const right=new THREE.Vector3(),up=new THREE.Vector3(),delta=new THREE.Vector3(),flight=new THREE.Vector3(),scratch=new THREE.Quaternion();
 let confirmedAt=null,crit=false,disposed=false;
 const effect={group,age:0,life:duration+.32,kind:'basic224',presentationAge:typeof options.presentationClock==='function'&&Number.isFinite(options.startedAt)?()=>Math.max(0,options.presentationClock()-options.startedAt):null,
  hit(e){if(disposed||options.air||confirmedAt!==null||e.type!=='damage'||(e.source&&e.source!=='basic'))return;if(effect.presentationAge)effect.age=effect.presentationAge();confirmedAt=Math.max(impact,effect.age);crit=!!e.crit;group.userData.confirmed=true;if(Number.isFinite(e.x))target.x=e.x-origin.x;if(Number.isFinite(e.z))target.z=e.z-origin.z;},
  sample(time,camera){
   if(disposed)return;art??=resources()?.ready;if(!art){trail.visible=spark.visible=false;return;}const t=Math.max(0,Number.isFinite(time)?time:0);
   if(camera){right.set(1,0,0).applyQuaternion(camera.quaternion);up.set(0,1,0).applyQuaternion(camera.quaternion);scratch.copy(camera.quaternion);}else{right.set(1,0,0);up.set(0,1,0);scratch.identity();}
   delta.set(target.x,0,target.z);const angle=Math.atan2(delta.dot(up),delta.dot(right)),after=t-impact;
   const active=options.reduced?t>=release&&t<impact+.06:t>=release&&after<.16;
   trail.visible=active;
   if(active){
    let progress;
    if(style.projectile){const q=clamp((t-release)/Math.max(.015,impact-release));flight.set(0,.95,0).lerp(target,q);trail.position.copy(flight);progress=t<=impact?q*.4:.4+clamp(after/.16)*.6;}
    else{trail.position.set(aim.x*Math.min(style.range*.55,Math.hypot(target.x,target.z)*.55),.95,aim.z*Math.min(style.range*.55,Math.hypot(target.x,target.z)*.55));progress=t<=impact?clamp((t-release)/Math.max(.015,impact-release))*.4:.4+clamp(after/.16)*.6;}
    trail.material.map=art.trails[id][Math.min(5,Math.floor(progress*6))];trail.material.opacity=(options.reduced?.22:.72)*(after>0?1-clamp(after/.16):1);
    trail.quaternion.copy(scratch);trail.rotateZ(angle+(style.projectile?0:style.tilts[variant]));trail.scale.set(style.size,style.size*.62,1);
   }
   const hitAge=confirmedAt===null?-1:t-confirmedAt;spark.visible=hitAge>=0&&hitAge<(options.reduced?.07:.20);
   if(spark.visible){const q=clamp(hitAge/.2);spark.material.map=art.impacts[id][Math.min(5,Math.floor(q*6))];spark.material.opacity=(options.reduced?.3:.85)*(1-q);spark.position.copy(target);spark.quaternion.copy(scratch);const size=style.hit*(crit?1.12:1);spark.scale.set(size,size,1);}
  },
  releaseResources(){if(disposed)return;disposed=true;trail.material.dispose();spark.material.dispose();},
 };
 return effect;
}

