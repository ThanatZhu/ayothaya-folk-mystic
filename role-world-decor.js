import * as THREE from './vendor/build/three.module.js';
import {groundHeight} from './combat-core.js?v=role116';
import {atlasUv} from './assets/skill-polish/timing.js';
const urls={rooster:'./assets/skill-polish/rooster-dash-v1.png',spirit:'./assets/skill-polish/library/spirit-v1.png'};
// Persistent companions and field boundaries use one shared atlas per kind, not one texture per pet.
export function createRoleWorldDecor(scene,world){
 const textures=new Map(),pets=[],fields=[],ring=new THREE.RingGeometry(.97,1,48),loader=new THREE.TextureLoader();let disposed=false;
 function source(kind){if(textures.has(kind))return textures.get(kind);const entry={frames:null};textures.set(kind,entry);loader.load(urls[kind],base=>{if(disposed){base.dispose();return;}base.colorSpace=THREE.SRGBColorSpace;base.generateMipmaps=false;base.minFilter=base.magFilter=THREE.LinearFilter;entry.base=base;entry.frames=Array.from({length:8},(_,i)=>{const t=base.clone(),uv=atlasUv(i);t.offset.set(uv.x,uv.y);t.repeat.set(uv.w,uv.h);t.needsUpdate=true;return t;});});return entry;}
 function petSlot(i){if(pets[i])return pets[i];const m=new THREE.SpriteMaterial({transparent:true,depthWrite:false,alphaTest:.03}),sprite=new THREE.Sprite(m);sprite.center.set(.5,.17);scene.add(sprite);return pets[i]={sprite,material:m};}
 function fieldSlot(i){if(fields[i])return fields[i];const material=new THREE.MeshBasicMaterial({color:'#ffd98f',transparent:true,opacity:.38,depthWrite:false,side:THREE.DoubleSide}),mesh=new THREE.Mesh(ring,material);mesh.rotation.x=-Math.PI/2;scene.add(mesh);return fields[i]={mesh,material};}
 return {update(){
  const own=world.roleCombat?.state,allPets=world.rolePetsView??own?.pets??[],allFields=world.roleFieldsView??own?.fields??[],limit=matchMedia('(pointer:coarse),(max-width:900px)').matches?8:16;
  pets.forEach(p=>p.sprite.visible=false);fields.forEach(f=>f.mesh.visible=false);
  allPets.filter(p=>p.left>0).slice(0,limit).forEach((pet,i)=>{const a=petSlot(i),art=source(pet.kind);if(!art.frames)return;const attack=pet.attacking??pet.tick>.85,frame=pet.kind==='rooster'?(attack?4:7):Math.floor(world.time*4)%4+1;if(!a.material.map)a.material.needsUpdate=true;a.material.map=art.frames[frame];a.sprite.position.set(pet.x,groundHeight(world.nav,pet.x,pet.z)+(pet.kind==='spirit'?.45:.02),pet.z);a.sprite.scale.setScalar(pet.kind==='rooster'?1.45:1.1);a.sprite.visible=true;});
  allFields.filter(f=>f.left>0).slice(0,limit).forEach((f,i)=>{const a=fieldSlot(i);a.mesh.visible=true;a.mesh.position.set(f.x,groundHeight(world.nav,f.x,f.z)+.045,f.z);a.mesh.scale.setScalar(f.radius);a.material.color.set(['regen','lifeTree','sanctuary'].includes(f.kind)?'#a9eaa2':['mine','thorns','holyField'].includes(f.kind)?'#f8a45c':'#a0d9ed');a.material.opacity=Math.min(.4,f.left*.2);});
 },dispose(){disposed=true;for(const p of pets){scene.remove(p.sprite);p.material.dispose();}for(const f of fields){scene.remove(f.mesh);f.material.dispose();}ring.dispose();for(const s of textures.values()){s.frames?.forEach(t=>t.dispose());s.base?.dispose();}},get metrics(){return {petSlots:pets.length,fieldSlots:fields.length,atlases:textures.size};}};
}
