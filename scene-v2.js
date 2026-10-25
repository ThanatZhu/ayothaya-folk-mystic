import * as THREE from 'three';
import {createWaterSurface} from './water-surface158.js?v=158';

// 0.62: Blender v2 environments keep their own textured PBR materials (no Lambert repaint).
// Mood presets stand in for the Cycles lights, which the GLB does not carry.
export const MOODS={
 day:{sky:'#cfd9c3',fog:'#d4dccb',hemi:['#fff6e2','#7d8a5c',1.55],sun:['#ffe2b8',2.5],lamp:1},
 dusk:{sky:'#5d6b6c',fog:'#66716c',hemi:['#ffd7b0','#3f4d4a',1.05],sun:['#ffb980',1.6],lamp:2.2},
 night:{sky:'#2c4246',fog:'#3a5153',hemi:['#b9d4e0','#3b4f4c',.95],sun:['#b9d3f0',.85],lamp:3},
 cellar:{sky:'#1f2f34',fog:'#23353a',hemi:['#a6d8d6','#273b3a',1.15],sun:['#cfe6ef',.55],lamp:3.4},
 cave:{sky:'#172f37',fog:'#254149',hemi:['#bce9ef','#273c38',1.35],sun:['#9bdce5',1.1],lamp:2.4},
 summit:{sky:'#a8b7c5',fog:'#c5d0da',hemi:['#d8e8ec','#59656e',1.7],sun:['#ffdbb2',2.3],lamp:1},
};
export const moodOf=map=>map.instance?'cellar':map.procedural==='mill'?'night':Object.hasOwn(MOODS,map.mood)?map.mood:'day';
const FLAT=/^(Ground|Soil foundation|Water surface|Damp canal|Streets|Tracks|Courtyard|Feathered|Island meadow|Wetland islands|Cellar foundation|Raised flagstone|Spirit arena|Earthen rice|Dense low rice|Stone moss|Fine meadow|Dense rice|Rice seed|Cupped floating|Lotus|Layered lotus|Arena inlays)/;

// 0.64.1 ground layers are modelled at the same height (streets, tracks, shoulders, courtyards), which z-fights
// as the camera moves, worst on phones. Each layer gets its own depth bias so the upper layer always wins.
// 0.75 foundations sit one rank under the ground: their top face is modelled at the ground height. GLTFLoader turns
// spaces into underscores, so only names without a space before the matched word ever took part in this ranking;
// the foundation rule matches both spellings, the others keep the ranking every map was tuned with.
const LAYERS=[[/^(Soil|Cellar)[ _]foundation/,-1],[/^(Ground|Island meadow)/,0],[/^(Damp canal|Wetland islands|Earthen rice)/,1],[/^Tracks/,2],[/^Feathered/,3],[/^(Courtyard|Raised flagstone|Spirit arena paved)/,4],[/^Streets/,5],[/^(Dense low rice|Stone moss|Arena inlays)/,6]];
const TOP_RANK=Math.max(...LAYERS.map(([,r])=>r));
export function prepareSceneV2({scene,model,map,waterEnabled=true}){
 const mood=MOODS[moodOf(map)],converted=new Map(),water=[],wind={value:0};
 // glTF can share one atlas texture between roofs, timber, foliage and water.
 // Sliding that atlas changes every material's tile, even if the Texture is cloned.
 // Keep shared image UVs fixed; only standalone water images may scroll.
 const fixedImages=new Set();
 model.traverse(o=>{if(o.isMesh)for(const m of [].concat(o.material??[]))if(!/water/i.test(m.name))for(const t of [m.map,m.normalMap])if(t)fixedImages.add(t.image);});
 scene.background=new THREE.Color(mood.sky);scene.fog=new THREE.Fog(mood.fog,map.mood==='summit'?100:60,map.mood==='summit'?250:150);
 // 1.01 guild hall: 'Guild upgrade <kind> <tier>' props stay hidden until the guild owns that tier (guildUpgrades).
 const upgrades=[];
 model.traverse(o=>{
  if(!o.isMesh)return;
  const up=map.guildHall&&/^Guild[ _]upgrade[ _]([a-z]+)[ _](\d)/.exec(o.name);if(up){upgrades.push([o,up[1],+up[2]]);o.visible=false;}
  // Ground layers and dense scatter receive shadows only: casting them costs a lot and adds nothing from above.
  // 0.75 match the Blender names (GLTFLoader turns spaces into underscores), so flat ground and field scatter really
  // stop casting shadows; that also keeps the swaying rice and grass from leaving still shadows behind.
  o.castShadow=!FLAT.test(o.name.replace(/_/g,' '));o.receiveShadow=true;
  const source=o.material;if(!converted.has(source)){
   // Physical extensions (specular/IOR/clearcoat) cost shader time with no visible gain at this camera distance.
   const m=new THREE.MeshStandardMaterial();
   for(const k of ['name','color','map','normalMap','normalScale','roughness','roughnessMap','metalness','metalnessMap','emissive','emissiveMap','emissiveIntensity','alphaTest','transparent','opacity','side','vertexColors','alphaMap','aoMap'])if(source[k]!==undefined)m[k]=source[k]?.clone&&!source[k].isTexture?source[k].clone():source[k];
   if(/water/i.test(m.name)){m.roughness=.22;m.metalness=.05;m.color.multiplyScalar(map.instance?.9:1);water.push(m);}
   if(/cloud sea soft alpha/i.test(m.name)){m.depthWrite=false;o.castShadow=false;}
   if(m.emissive.getHex()&&(m.emissiveMap||m.emissiveIntensity>0))m.emissiveIntensity=Math.max(m.emissiveIntensity,1)*mood.lamp;
   // 0.75 rice, seed heads and meadow blades lean in a slow breeze (their meshes sit at the origin, so object space is
   // world space and position.y is the height above the field). They cast no shadows, so no depth shader is needed.
   if(/rice|grain|grassblade|grassdry/i.test(m.name)){m.onBeforeCompile=s=>{s.uniforms.fieldWind=wind;s.vertexShader='uniform float fieldWind;\n'+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n float lean=max(position.y-.12,0.);lean*=lean;transformed.x+=lean*.16*sin(fieldWind*1.5+position.x*.27+position.z*.19);transformed.z+=lean*.1*sin(fieldWind*1.1+position.x*.13-position.z*.23);');};m.customProgramCacheKey=()=>'field-wind75';}
   converted.set(source,m);source.dispose();
  }
  o.material=converted.get(source);
  const rank=LAYERS.find(([re])=>re.test(o.name))?.[1];
  // 0.68.2 phones still flickered: their depth buffer cannot separate layers 2 mm apart, so lower layers are also
  // physically moved down 2 cm per rank (the top layer stays put, so feet keep standing on it).
  if(rank!==undefined)o.position.y-=(TOP_RANK-rank)*.03; // 0.71.2: 3 cm per rank
  // 0.66.1 push lower layers back instead of pulling upper ones forward: a forward bias on streets/courtyards hid the feet
  // of everyone standing on them. The top layer keeps its true depth; sprites are never covered.
  if(rank!==undefined){const back=TOP_RANK-rank,key=o.material.uuid+'|'+rank;if(back>0&&!converted.has(key)){const m=o.material.clone();m.polygonOffset=true;m.polygonOffsetFactor=back;m.polygonOffsetUnits=back*4;converted.set(key,m);if(water.includes(o.material))water.push(m);}if(back>0)o.material=converted.get(key);}
  // 0.92 a road layer overlaps itself where two tracks cross (same height, different UVs) and the depth buffer cannot
  // order that, so crossings flickered as the camera moved. Ground layers now draw first in rank order, and the layers
  // above the ground stop writing depth, so the later strip always wins; the ground still writes depth for the rest.
  if(rank!==undefined){o.renderOrder=rank-30;if(rank>0){const key2=o.material.uuid+'|flat';if(!converted.has(key2)){const m=o.material.clone();m.depthWrite=false;converted.set(key2,m);if(water.includes(o.material))water.push(m);}o.material=converted.get(key2);}}
 });
 const flowing=new Map();
 for(const m of water)for(const [key,x,z] of [['map',-.004,.006],['normalMap',.012,.02]]){const t=m[key];if(t&&!fixedImages.has(t.image)){t.wrapS=t.wrapT=THREE.RepeatWrapping;flowing.set(t,{x,z,offset:t.offset.clone()});}}
 let running=!matchMedia('(prefers-reduced-motion:reduce)').matches,time=0;
 const surface=createWaterSurface({model,map,enabled:waterEnabled});
 model.userData.disposeWater158=()=>surface.dispose();
 return {
  water:surface,
  update(dt){if(running)time+=Math.min(.08,Math.max(0,dt));wind.value=time;surface.clock.value=time;for(const [t,v] of flowing)t.offset.set(v.offset.x+time*v.x,v.offset.y+time*v.z);return time;},
  toggle(){running=!running;return running;},
  guildUpgrades(owned){for(const [o,kind,tier] of upgrades)o.visible=(owned?.[kind]??0)>=tier;},get running(){return running;},
 };
}
// Release GPU memory of the current scene (geometry, materials, textures) before the page moves to another map.
export function disposeScene(root){
 const textures=new Set();
 root.traverse(o=>o.userData.disposeWater158?.());
 root.traverse(o=>o.userData.disposeLighting159?.());
 root.traverse(o=>{o.geometry?.dispose();for(const m of [].concat(o.material??[])){for(const v of Object.values(m))if(v?.isTexture)textures.add(v);m.dispose();}});
 textures.forEach(t=>t.dispose());
}
