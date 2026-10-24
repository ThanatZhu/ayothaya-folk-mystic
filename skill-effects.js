import * as THREE from './vendor/build/three.module.js';
import {createCombatVfxResources,createCombatEffect} from './combat-vfx.js?v=74';

// Shared by local/remote players and the seekable skill lab.
export function createSkillEffects(scene){
 const art=createCombatVfxResources(),active=[];let disposed=false;
 function remove(e){const i=active.indexOf(e);if(i<0)return;active.splice(i,1);scene.remove(e.group);e.releaseResources();}
 const api={
  create(track,options={}){
   if(disposed)throw new Error('Skill effects manager is disposed');
   while(active.length>=16)remove(active[0]);
   const e=createCombatEffect(art,track,options);e.castId=options.castId;e.actor=options.actor??'self';e.dispose=()=>remove(e);active.push(e);scene.add(e.group);return e;
  },
  cancel(castId,actor='self'){for(const e of [...active])if(castId!=null&&e.castId===castId&&e.actor===actor)remove(e);},
  update(dt,camera){const elapsed=Number.isFinite(dt)?Math.max(0,dt):0;for(const e of [...active]){e.age+=elapsed;if(e.age>e.life)remove(e);else e.sample(e.age,camera);}},
  clear(){for(const e of [...active])remove(e);},
  dispose(){if(disposed)return;api.clear();art.dispose();disposed=true;},
  get count(){return active.length;}
 };
 return api;
}

// Soft footfall dust is independent of skill palettes and capped at ten puffs.
export function createFootDust(scene){
 const geometry=new THREE.CircleGeometry(.2,14),puffs=[];let disposed=false;
 const remove=p=>{const i=puffs.indexOf(p);if(i<0)return;scene.remove(p.mesh);p.mesh.material.dispose();puffs.splice(i,1);};
 const api={
  puff(x,y,z){if(disposed)return;if(puffs.length>=10)remove(puffs[0]);const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color:'#efe2c4',transparent:true,opacity:.4,depthWrite:false}));mesh.rotation.x=-Math.PI/2;mesh.position.set(x,y,z);scene.add(mesh);puffs.push({mesh,age:0});},
  update(dt){dt=Number.isFinite(dt)?Math.max(0,dt):0;for(const p of [...puffs]){p.age+=dt;const f=p.age/.45;if(f>=1){remove(p);continue;}p.mesh.scale.set(.6+f*1.2,.6+f*1.2,1);p.mesh.position.y+=dt*.12;p.mesh.material.opacity=.4*(1-f);}},
  clear(){for(const p of [...puffs])remove(p);},
  dispose(){if(disposed)return;api.clear();geometry.dispose();disposed=true;},
  get count(){return puffs.length;}
 };
 return api;
}
