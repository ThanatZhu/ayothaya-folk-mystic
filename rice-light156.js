import * as THREE from 'three';
import {groundHeight} from './combat-core.js?v=run153';
import {stabilizeBillboardLighting} from './world-lighting159.js?v=shadow160';

// Only horizontal receiver layers are excluded: every raised prop, leaf,
// flower, reed and blade casts. Water/terrain must not shadow the entire map.
const RECEIVER_ONLY=/^(Ground|Soil foundation|Water surface|Damp canal|Streets|Tracks|Courtyard|Feathered|Earthen rice|Dense low rice canopy)/;
function windDepth(material){
 const depth=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking});
 // Reuse the *same* atlas UV and wind uniforms as the visible material; Three
 // supplies its current map/alphaTest on each shadow render. This avoids solid
 // rectangular card shadows and shadows that lag behind animated grass.
 depth.onBeforeCompile=(shader,renderer)=>material.onBeforeCompile(shader,renderer);
 depth.customProgramCacheKey=()=>material.customProgramCacheKey()+'-shadow157';
 return depth;
}

export function enableMeadowShadows(meadow){
 const material=meadow.group.children[0]?.material;if(!material)return {dispose(){}};
 const depth=windDepth(material);
 for(const mesh of meadow.group.children){mesh.castShadow=true;mesh.receiveShadow=true;mesh.customDepthMaterial=depth;}
 return {dispose(){for(const mesh of meadow.group.children)mesh.customDepthMaterial=undefined;depth.dispose();}};
}

export function enableActorShadows(actor){
 const source=actor.material;
 const lit=new THREE.MeshLambertMaterial({map:source.map,emissiveMap:source.map,emissive:source.color,emissiveIntensity:.28,
  alphaTest:source.alphaTest,side:source.side,shadowSide:THREE.DoubleSide,depthWrite:source.depthWrite});
 stabilizeBillboardLighting(lit);
 actor.material=lit;actor.castShadow=true;actor.receiveShadow=true;
 return {
  update(){
   // Painted-avatar playback owns the source material and replaces its map.
   // Synchronize after pose(), including both visible art and shadow alpha.
   lit.map=source.map;lit.emissiveMap=source.map;lit.color.copy(source.color).multiplyScalar(.52);
   lit.emissive.copy(source.color);lit.visible=source.visible;
  },
  dispose(){actor.material=source;lit.dispose();}
 };
}

// Opt-in rice-field study. Nothing in the live viewer imports this profile yet.
// Keep the weather system's base light values intact when this is integrated.
export function applyRiceLight({scene,model,sun,hemi,mobile=false}){
 const original={sun:sun.intensity,hemi:hemi.intensity};
 hemi.color.set('#fff5df');hemi.groundColor.set('#67744f');hemi.intensity=1.18;
 sun.color.set('#fff0d9');sun.intensity=2.3;
 sun.shadow.intensity=.78;sun.shadow.radius=3.2;
 scene.background.set('#cbd1aa');scene.fog.color.set('#d6d7b1');
 const materials=new Set();
 model.traverse(o=>{
  if(!o.isMesh)return;
  o.receiveShadow=true;o.castShadow=!RECEIVER_ONLY.test(o.name.replace(/_/g,' '));
  const windMaterial=[].concat(o.material).find(m=>/rice|grain|grassblade|grassdry/i.test(m.name));
  if(o.castShadow&&windMaterial){
   // These source GLB meshes contain real blade triangles, not impostor boxes.
   windMaterial.shadowSide=THREE.DoubleSide;o.customDepthMaterial=windDepth(windMaterial);
  }
  for(const m of [].concat(o.material)){
   if(materials.has(m))continue;materials.add(m);
   const grass=/rice|grassblade|grassdry|stubble|reeds/.test(m.name);
   const leaf=/leaf|grass$|moss/.test(m.name);
   if(grass||leaf)m.color.multiply(new THREE.Color().setRGB(1,.99,grass?.93:.96));
   if(/earth|path|mud/.test(m.name))m.color.multiply(new THREE.Color().setRGB(1,.99,.96));
   if(grass){
    // Retain the existing breeze shader. Ground contact shading is evaluated
    // on authored blade height and costs no extra draw or shadow pass.
    const compile=m.onBeforeCompile,key=m.customProgramCacheKey();
    m.onBeforeCompile=(s,r)=>{
     compile.call(m,s,r);
     s.vertexShader='varying float riceRoot156;\n'+s.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\nriceRoot156=smoothstep(.04,.52,position.y);');
     s.fragmentShader='varying float riceRoot156;\n'+s.fragmentShader.replace('#include <color_fragment>',
      '#include <color_fragment>\ndiffuseColor.rgb*=mix(vec3(.78,.82,.70),vec3(1.02,1.01,.98),riceRoot156);');
    };
    m.customProgramCacheKey=()=>key+'-rice-root156';m.needsUpdate=true;
   }
  }
 });
 return {offset:new THREE.Vector3(-20,23,14),original,materials:materials.size};
}

function contactTexture(){
 const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d');
 const gradient=g.createRadialGradient(32,32,1,32,32,31);
 gradient.addColorStop(0,'rgba(27,41,18,.48)');gradient.addColorStop(.38,'rgba(27,41,18,.28)');gradient.addColorStop(1,'rgba(27,41,18,0)');
 g.fillStyle=gradient;g.fillRect(0,0,64,64);
 const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;return texture;
}

// Soft local ground stamps, independent of shadow maps, also work on the phone
// profile. Existing walk/deck/water exclusions come from the meadow generator.
export function addMeadowContacts({scene,meadow,map,mobile=false}){
 const texture=contactTexture(),geometry=new THREE.PlaneGeometry(1,1);geometry.rotateX(-Math.PI/2);
 const material=new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,opacity:.4,polygonOffset:true,polygonOffsetFactor:-1});
 const group=new THREE.Group();group.name='Rice contact shade';
 const source=new THREE.Matrix4(),position=new THREE.Vector3(),rotation=new THREE.Quaternion(),scale=new THREE.Vector3(),dummy=new THREE.Object3D();
 for(const chunk of meadow.group.children){
  const stride=mobile?3:2,count=Math.ceil(chunk.count/stride),mesh=new THREE.InstancedMesh(geometry,material,count);
  mesh.renderOrder=-5;let n=0;
  for(let i=0;i<chunk.count;i+=stride){
   chunk.getMatrixAt(i,source);source.decompose(position,rotation,scale);
   dummy.position.set(position.x,groundHeight(map.nav,position.x,position.z)+.025,position.z);
   dummy.scale.set(scale.x*.86,1,scale.z*.62);dummy.rotation.set(0,0,0);dummy.updateMatrix();mesh.setMatrixAt(n++,dummy.matrix);
  }
  mesh.computeBoundingSphere();group.add(mesh);
 }
 scene.add(group);
 return {group,dispose(){scene.remove(group);geometry.dispose();material.dispose();texture.dispose();}};
}
