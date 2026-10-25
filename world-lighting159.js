import * as THREE from './vendor/build/three.module.js';
import {groundHeight} from './combat-core.js?v=run153';
import {isWaterMaterial} from './water-surface158.js?v=158';

const PROFILES={
 day:{sky:'#cbd1aa',fog:'#d6d7b1',hemi:['#fff5df','#67744f',1.18],sun:['#fff0d9',2.3],offset:[-20,23,14],gain:.52,warmth:.012},
 dusk:{sky:'#626d65',fog:'#748071',hemi:['#ffe3c3','#526052',.92],sun:['#ffd0a0',1.65],offset:[-20,18,14],gain:.65,warmth:.008},
 night:{sky:'#293d48',fog:'#3b5056',hemi:['#bed7e4','#354b46',.82],sun:['#c3ddf2',.95],offset:[-16,26,9],gain:.82,warmth:0},
 cellar:{sky:'#1e2e31',fog:'#283a3b',hemi:['#b2d9d2','#304b43',.95],sun:['#cde6df',.65],offset:[-12,25,10],gain:.9,warmth:0},
 cave:{sky:'#193944',fog:'#2a5359',hemi:['#b9e0df','#314a48',1.05],sun:['#b3e0e8',1.1],offset:[-12,25,10],gain:.75,warmth:0},
 summit:{sky:'#aebfcb',fog:'#c9d5d7',hemi:['#e1eced','#667780',1.35],sun:['#ffead3',2.15],offset:[-20,23,14],gain:.55,warmth:.004}
};
export function lightingProfile(map={}){
 const mood=map.instance?'cellar':map.procedural==='mill'?'night':Object.hasOwn(PROFILES,map.mood)?map.mood:'day';
 return {...PROFILES[mood],mood,finish:{blur:0,warmth:PROFILES[mood].warmth,vignette:.14,contrast:1,lift:0,saturation:.94,bloom:.12,threshold:1.1}};
}
const RECEIVER=/^(Ground|Soil foundation|Cellar foundation|Water surface|Damp canal|Streets|Tracks|Courtyard|Feathered|Earthen rice|Dense low rice canopy|Forest floor|Terrain|Island meadow|Wetland islands|Raised flagstone|Spirit arena paved|Stone moss|Arena inlays)/i;
function depthFor(material){
 const depth=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking});
 depth.onBeforeCompile=(s,r)=>material.onBeforeCompile(s,r);
 depth.customProgramCacheKey=()=>material.customProgramCacheKey()+'-world-shadow159';return depth;
}
export function applyWorldLighting({scene,model,map,sun,hemi,renderer}){
 const profile=lightingProfile(map),depths=new Map(),materials=new Set();
 hemi.color.set(profile.hemi[0]);hemi.groundColor.set(profile.hemi[1]);hemi.intensity=profile.hemi[2];sun.color.set(profile.sun[0]);sun.intensity=profile.sun[1];
 sun.shadow.radius=3.2;sun.shadow.intensity=.78;sun.shadow.normalBias=.04;sun.shadow.camera.far=95;sun.shadow.camera.updateProjectionMatrix();
 if(renderer)renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 if(scene.background?.isColor)scene.background.set(profile.sky);else scene.background=new THREE.Color(profile.sky);
 if(scene.fog)scene.fog.color.set(profile.fog);else scene.fog=new THREE.Fog(profile.fog,60,150);
 model.traverse(o=>{
  if(!o.isMesh)return;const ms=[].concat(o.material??[]),water=ms.some(isWaterMaterial),cloud=ms.some(m=>/cloud.*alpha/i.test(m.name));
  o.castShadow=!water&&!cloud&&!RECEIVER.test(o.name.replace(/_/g,' '));o.receiveShadow=!cloud;
  const wind=ms.find(m=>/rice|grain|grassblade|grassdry/i.test(m.name));
  if(o.castShadow&&wind){wind.shadowSide=THREE.DoubleSide;if(!depths.has(wind))depths.set(wind,depthFor(wind));o.customDepthMaterial=depths.get(wind);}
  for(const m of ms){if(materials.has(m)||water||cloud)continue;materials.add(m);
   if(/grassblade|grassdry|rice|stubble|reeds/i.test(m.name)){
    const before=m.onBeforeCompile,key=m.customProgramCacheKey();
    m.onBeforeCompile=(s,r)=>{before.call(m,s,r);s.vertexShader='varying float worldRoot159;\n'+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nworldRoot159=smoothstep(.04,.52,position.y);');s.fragmentShader='varying float worldRoot159;\n'+s.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb*=mix(vec3(.78,.82,.70),vec3(1.02,1.01,.98),worldRoot159);');};
    m.customProgramCacheKey=()=>key+'-world-root159';m.needsUpdate=true;
   }
  }
 });
 let disposed=false;const dispose=()=>{if(disposed)return;disposed=true;depths.forEach(d=>d.dispose());};model.userData.disposeLighting159=dispose;
 return {profile,offset:new THREE.Vector3(...profile.offset),dispose};
}
export function applyMeadowLighting(meadow){
 if(!meadow?.group)return {dispose(){}};
 const material=meadow.group.children[0]?.material;if(!material)return {dispose(){}};
 const before=material.onBeforeCompile,key=material.customProgramCacheKey();
 material.onBeforeCompile=(s,r)=>{before.call(material,s,r);s.vertexShader='varying float worldMeadow159;\n'+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nworldMeadow159=smoothstep(.03,.8,position.y);');s.fragmentShader='varying float worldMeadow159;\n'+s.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb*=mix(vec3(.72,.78,.63),vec3(1.02,1.01,.98),worldMeadow159);');};
 material.customProgramCacheKey=()=>key+'-world-meadow159';material.needsUpdate=true;
 const depth=depthFor(material);for(const m of meadow.group.children){m.castShadow=true;m.receiveShadow=true;m.customDepthMaterial=depth;}
 let disposed=false;const dispose=()=>{if(disposed)return;disposed=true;depth.dispose();};meadow.group.userData.disposeLighting159=dispose;return {dispose};
}
export function contactShadowTexture(){
 const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d'),fade=g.createRadialGradient(32,32,2,32,32,31);fade.addColorStop(0,'rgba(25,42,29,.55)');fade.addColorStop(.4,'rgba(25,42,29,.28)');fade.addColorStop(1,'rgba(25,42,29,0)');g.fillStyle=fade;g.fillRect(0,0,64,64);return new THREE.CanvasTexture(c);
}
export function isWorldActor(o){
 const m=o.material;return !!(!o.userData?.lightingProxy159&&(o.isSprite||o.isMesh&&m?.isMeshBasicMaterial)&&m?.map&&m.alphaTest>=.1&&m.toneMapped!==false&&m.fog!==false&&m.blending===THREE.NormalBlending);
}

// The original objects remain visible to picking and gameplay. Only their
// colour/depth writes are suppressed; animated maps/tints/opacity stay owned by
// their existing renderer. Lit proxies share those maps and posed geometry.
export function createActorLighting({scene,camera,renderer,map,profile=lightingProfile(map)}){
 const actors=new Map(),hidden=new Map(),group=new THREE.Group();group.name='World actor light and shadows';group.userData.lightingProxy159=true;scene.add(group);
 const footprintTexture=typeof document!=='undefined'?contactShadowTexture():null,footprintGeometry=new THREE.PlaneGeometry(1,1);footprintGeometry.rotateX(-Math.PI/2);
 const position=new THREE.Vector3(),scale=new THREE.Vector3(),rotation=new THREE.Quaternion(),q=new THREE.Quaternion(),axis=new THREE.Vector3(0,0,1);
 function hide(m){let saved=hidden.get(m);if(!saved){saved={count:0,...(m.userData.lightingHidden159??{colorWrite:m.colorWrite,depthWrite:m.depthWrite})};hidden.set(m,saved);m.userData.lightingHidden159={colorWrite:saved.colorWrite,depthWrite:saved.depthWrite};}saved.count++;m.colorWrite=false;m.depthWrite=false;return saved;}
 function releaseMaterial(m){const saved=hidden.get(m);if(saved&&!--saved.count){m.colorWrite=saved.colorWrite;m.depthWrite=saved.depthWrite;delete m.userData.lightingHidden159;hidden.delete(m);}}
 function attached(o){for(let p=o;p;p=p.parent)if(p===scene)return true;return false;}
 function visible(o){for(let p=o;p;p=p.parent)if(!p.visible)return false;return true;}
 function add(source){
  const m=source.material,saved=hide(m),geometry=source.isSprite?new THREE.PlaneGeometry(1,1):source.geometry;
  const lit=new THREE.MeshLambertMaterial({map:m.map,emissiveMap:m.map,emissiveIntensity:.28,alphaTest:m.alphaTest,side:THREE.DoubleSide,shadowSide:THREE.DoubleSide,depthWrite:saved.depthWrite});
  const proxy=new THREE.Mesh(geometry,lit);proxy.matrixAutoUpdate=false;proxy.castShadow=proxy.receiveShadow=true;proxy.frustumCulled=source.frustumCulled;proxy.userData.lightingProxy159=true;group.add(proxy);
  const foot=new THREE.Mesh(footprintGeometry,new THREE.MeshBasicMaterial({map:footprintTexture,transparent:true,opacity:.25,depthWrite:false}));foot.userData.lightingProxy159=true;group.add(foot);
  actors.set(source,{source,proxy,lit,foot,material:m,cx:NaN,cy:NaN,castShadow:source.castShadow});source.castShadow=false;
 }
 function remove(s){releaseMaterial(s.material);s.source.castShadow=s.castShadow;group.remove(s.proxy,s.foot);s.lit.dispose();s.foot.material.dispose();if(s.source.isSprite)s.proxy.geometry.dispose();actors.delete(s.source);}
 return {actors,
  update(){
   const fresh=[];scene.traverse(o=>{if(isWorldActor(o)&&!actors.has(o))fresh.push(o);});fresh.forEach(add);
   for(const s of actors.values()){
    const o=s.source;if(!attached(o)){remove(s);continue;}const m=o.material;
    if(m!==s.material){releaseMaterial(s.material);hide(m);s.material=m;}
    const saved=hidden.get(m);m.colorWrite=false;m.depthWrite=false;
    o.onBeforeRender?.(renderer,scene,camera,o.geometry,m,null);o.updateWorldMatrix(true,false);
    o.matrixWorld.decompose(position,rotation,scale);
    if(o.isSprite){
     const c=o.center;if(s.cx!==c.x||s.cy!==c.y){const p=s.proxy.geometry.attributes.position;p.setXYZ(0,-c.x,1-c.y,0);p.setXYZ(1,1-c.x,1-c.y,0);p.setXYZ(2,-c.x,-c.y,0);p.setXYZ(3,1-c.x,-c.y,0);p.needsUpdate=true;s.proxy.geometry.computeBoundingSphere();s.proxy.geometry.computeBoundingBox();s.cx=c.x;s.cy=c.y;}
     camera.getWorldQuaternion(rotation);q.setFromAxisAngle(axis,m.rotation??0);rotation.multiply(q);s.proxy.matrix.compose(position,rotation,scale);
    }else{s.proxy.geometry=o.geometry;s.proxy.matrix.copy(o.matrixWorld);}
    s.proxy.matrixWorldNeedsUpdate=true;s.proxy.visible=visible(o)&&m.visible;s.proxy.layers.mask=o.layers.mask;s.foot.layers.mask=o.layers.mask;
    s.proxy.castShadow=m.opacity>.2;
    const changed=s.lit.transparent!==m.transparent;s.lit.transparent=m.transparent;if(changed)s.lit.needsUpdate=true;
    s.lit.map=m.map;s.lit.emissiveMap=m.map;s.lit.alphaMap=m.alphaMap;s.lit.alphaTest=m.alphaTest;s.lit.opacity=m.opacity;s.lit.depthWrite=saved.depthWrite;s.lit.depthTest=m.depthTest;
    s.lit.color.copy(m.color).multiplyScalar(profile.gain);s.lit.emissive.copy(m.color);s.lit.fog=m.fog;s.proxy.renderOrder=o.renderOrder;
    s.foot.visible=s.proxy.visible&&!renderer.shadowMap.enabled;s.foot.position.set(position.x,groundHeight(map.nav,position.x,position.z)+.045,position.z);s.foot.scale.set(Math.max(.3,Math.abs(scale.x)*.6),1,Math.max(.2,Math.abs(scale.y)*.23));s.foot.material.opacity=.25*m.opacity;
   }
  },
  dispose(){for(const s of [...actors.values()])remove(s);scene.remove(group);footprintGeometry.dispose();footprintTexture?.dispose();}
 };
}
