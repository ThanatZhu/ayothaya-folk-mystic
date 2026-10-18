import * as THREE from 'three';

// 0.62: Blender v2 environments keep their own textured PBR materials (no Lambert repaint).
// Mood presets stand in for the Cycles lights, which the GLB does not carry.
export const MOODS={
 day:{sky:'#cfd9c3',fog:'#d4dccb',hemi:['#fff6e2','#7d8a5c',1.55],sun:['#ffe2b8',2.5],lamp:1},
 dusk:{sky:'#5d6b6c',fog:'#66716c',hemi:['#ffd7b0','#3f4d4a',1.05],sun:['#ffb980',1.6],lamp:2.2},
 night:{sky:'#2c4246',fog:'#3a5153',hemi:['#b9d4e0','#3b4f4c',.95],sun:['#b9d3f0',.85],lamp:3},
 cellar:{sky:'#1f2f34',fog:'#23353a',hemi:['#a6d8d6','#273b3a',1.15],sun:['#cfe6ef',.55],lamp:3.4},
};
export const moodOf=map=>map.instance?'cellar':map.procedural==='mill'?'night':map.mood==='dusk'?'dusk':'day';
const FLAT=/^(Ground|Soil foundation|Water surface|Damp canal|Streets|Tracks|Courtyard|Feathered|Island meadow|Wetland islands|Cellar foundation|Raised flagstone|Spirit arena|Earthen rice|Dense low rice|Stone moss|Fine meadow|Dense rice|Rice seed|Cupped floating|Lotus|Layered lotus|Arena inlays)/;

// 0.64.1 ground layers are modelled at the same height (streets, tracks, shoulders, courtyards), which z-fights
// as the camera moves, worst on phones. Each layer gets its own depth bias so the upper layer always wins.
const LAYERS=[[/^(Ground|Island meadow|Soil foundation|Cellar foundation)/,0],[/^(Damp canal|Wetland islands|Earthen rice)/,1],[/^Tracks/,2],[/^Feathered/,3],[/^(Streets|Courtyard|Raised flagstone|Spirit arena paved)/,4],[/^(Dense low rice|Stone moss|Arena inlays)/,5]];
export function prepareSceneV2({scene,model,map}){
 const mood=MOODS[moodOf(map)],converted=new Map(),water=[];
 scene.background=new THREE.Color(mood.sky);scene.fog=new THREE.Fog(mood.fog,60,150);
 model.traverse(o=>{
  if(!o.isMesh)return;
  // Ground layers and dense scatter receive shadows only: casting them costs a lot and adds nothing from above.
  o.castShadow=!FLAT.test(o.name);o.receiveShadow=true;
  const source=o.material;if(!converted.has(source)){
   // Physical extensions (specular/IOR/clearcoat) cost shader time with no visible gain at this camera distance.
   const m=new THREE.MeshStandardMaterial();
   for(const k of ['name','color','map','normalMap','normalScale','roughness','roughnessMap','metalness','metalnessMap','emissive','emissiveMap','emissiveIntensity','alphaTest','transparent','opacity','side','vertexColors','alphaMap','aoMap'])if(source[k]!==undefined)m[k]=source[k]?.clone&&!source[k].isTexture?source[k].clone():source[k];
   if(/water/i.test(m.name)){m.roughness=.22;m.metalness=.05;m.color.multiplyScalar(map.instance?.9:1);water.push(m);}
   if(m.emissive.getHex()&&(m.emissiveMap||m.emissiveIntensity>0))m.emissiveIntensity=Math.max(m.emissiveIntensity,1)*mood.lamp;
   converted.set(source,m);source.dispose();
  }
  o.material=converted.get(source);
  const rank=LAYERS.find(([re])=>re.test(o.name))?.[1];
  if(rank){const key=o.material.uuid+'|'+rank;if(!converted.has(key)){const m=o.material.clone();m.polygonOffset=true;m.polygonOffsetFactor=-rank;m.polygonOffsetUnits=-rank*4;converted.set(key,m);if(water.includes(o.material))water.push(m);}o.material=converted.get(key);}
 });
 for(const m of water)for(const t of [m.map,m.normalMap])if(t){t.wrapS=t.wrapT=THREE.RepeatWrapping;}
 let running=!matchMedia('(prefers-reduced-motion:reduce)').matches,time=0;
 return {
  update(dt){if(running)time+=Math.min(.08,Math.max(0,dt));for(const m of water){if(m.normalMap)m.normalMap.offset.set(time*.012,time*.02);if(m.map)m.map.offset.set(-time*.004,time*.006);}return time;},
  toggle(){running=!running;return running;},get running(){return running;},
 };
}
// Release GPU memory of the current scene (geometry, materials, textures) before the page moves to another map.
export function disposeScene(root){
 const textures=new Set();
 root.traverse(o=>{o.geometry?.dispose();for(const m of [].concat(o.material??[])){for(const v of Object.values(m))if(v?.isTexture)textures.add(v);m.dispose();}});
 textures.forEach(t=>t.dispose());
}
