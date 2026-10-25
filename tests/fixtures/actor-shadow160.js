import * as THREE from '../../vendor/build/three.module.js';
import {applyWorldLighting,createActorLighting} from '../../world-lighting159.js';
import {createPaintedAvatar} from '../../painted-avatar.js';
import {atlasCell} from '../../sprite-motion.js';
const params=new URLSearchParams(location.search);
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NeutralToneMapping;renderer.toneMappingExposure=1.16;renderer.shadowMap.enabled=true;
document.body.append(renderer.domElement);
const scene=new THREE.Scene(),model=new THREE.Group(),camera=new THREE.OrthographicCamera(-16*innerWidth/innerHeight,16*innerWidth/innerHeight,16,-16,.1,100);camera.position.set(20,22,24);camera.lookAt(6,0,-3);camera.updateMatrixWorld();
const floor=new THREE.Mesh(new THREE.PlaneGeometry(70,70),new THREE.MeshStandardMaterial({color:'#b4a67f',roughness:1}));floor.rotation.x=-Math.PI/2;floor.name='Ground';model.add(floor);
const roof=new THREE.Mesh(new THREE.BoxGeometry(6,1,6),new THREE.MeshStandardMaterial({color:'#3b5948'}));roof.name='Raised roof';roof.position.set(0,5,0);model.add(roof);scene.add(model);
const sun=new THREE.DirectionalLight(),hemi=new THREE.HemisphereLight();scene.add(sun,sun.target,hemi);sun.position.set(-20,23,14);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-24,right:24,top:24,bottom:-24,near:.5,far:95});sun.shadow.bias=-.0005;
applyWorldLighting({scene,model,map:{id:'rice-fields'},sun,hemi,renderer});
// Asymmetric art makes horizontal mirroring observable while preserving its
// average colour. Mirrored vertex positions reproduce rigged-sprite playback.
const art=document.createElement('canvas');art.width=art.height=128;const g=art.getContext('2d');g.fillStyle='#db9d61';g.beginPath();g.arc(64,29,19,0,Math.PI*2);g.fill();g.fillStyle='#c85132';g.fillRect(46,47,36,45);g.fillStyle='#d8aa4c';g.fillRect(30,51,16,31);g.fillStyle='#443937';g.fillRect(47,92,12,29);g.fillRect(70,92,12,29);g.fillStyle='#304731';g.fillRect(75,16,9,15);
const texture=new THREE.CanvasTexture(art);texture.colorSpace=THREE.SRGBColorSpace;
let source;
if(params.get('art')==='shaman'){
 const atlas=await new THREE.TextureLoader().loadAsync('/assets/classes/shaman-09.png'),[x,y,w,h]=atlasCell('male',0),frame=document.createElement('canvas');frame.width=atlas.image.width*w;frame.height=atlas.image.height*h;frame.getContext('2d').drawImage(atlas.image,atlas.image.width*x,atlas.image.height*y,frame.width,frame.height,0,0,frame.width,frame.height);const t=new THREE.CanvasTexture(frame);t.colorSpace=THREE.SRGBColorSpace;source=createPaintedAvatar(t,{directional:false,classId:'shaman',gender:'male'});await source.userData.ready;
}else source=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:texture,alphaTest:.45,side:THREE.DoubleSide,color:'#fff1da'}));
source.scale.set(2.1,2.1,1);source.frustumCulled=false;
source.onBeforeRender=(_r,_s,c)=>{source.quaternion.copy(c.quaternion);source.updateMatrixWorld();};scene.add(source);
const controller=createActorLighting({scene,camera,renderer,map:{nav:{}}});
const maskScene=new THREE.Scene();maskScene.background=new THREE.Color('#000');const maskMaterial=new THREE.MeshBasicMaterial({map:texture,alphaTest:.45,side:THREE.DoubleSide,fog:false,toneMapped:false});maskMaterial.onBeforeCompile=s=>{s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\ndiffuseColor.rgb=vec3(1.);');};
const maskMesh=new THREE.Mesh(source.geometry,maskMaterial);maskMesh.matrixAutoUpdate=false;maskMesh.frustumCulled=false;maskScene.add(maskMesh);
const canvas=document.createElement('canvas');canvas.width=innerWidth;canvas.height=innerHeight;const ctx=canvas.getContext('2d');
function pixels(){ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(renderer.domElement,0,0);return ctx.getImageData(0,0,canvas.width,canvas.height).data;}
function sample({x=12,flip=false,shadows=true,ownShadow=true,occluder=true}={}){
 roof.visible=occluder;source.position.set(x,.06,-3);
 if(renderer.shadowMap.enabled!==shadows){renderer.shadowMap.enabled=shadows;scene.traverse(o=>{for(const m of [].concat(o.material??[]))m.needsUpdate=true;});}
 if(source.userData.pose)source.userData.pose({mode:'idle',time:0,artFrame:0,reduced:true},flip);
 else{const p=source.geometry.attributes.position;p.setXYZ(0,flip?.5:-.5,1,0);p.setXYZ(1,flip?-.5:.5,1,0);p.setXYZ(2,flip?.5:-.5,0,0);p.setXYZ(3,flip?-.5:.5,0,0);p.needsUpdate=true;}
 controller.update();const state=controller.actors.get(source);state.proxy.castShadow=ownShadow;
 if(params.has('legacy'))for(const s of controller.actors.values())if(!s.lit.userData.legacy160){s.lit.onBeforeCompile=()=>{};s.lit.customProgramCacheKey=()=>'legacy-billboard159';s.lit.userData.legacy160=true;s.lit.needsUpdate=true;}
 renderer.render(scene,camera);renderer.render(scene,camera);const image=pixels();
 maskMaterial.map=state.lit.map;maskMesh.matrix.copy(state.proxy.matrixWorld);maskMesh.matrixWorldNeedsUpdate=true;renderer.render(maskScene,camera);const mask=pixels();let total=0,count=0;
 for(let i=0;i<mask.length;i+=4)if(mask[i]>240&&mask[i+1]>240&&mask[i+2]>240){total+=image[i]*.2126+image[i+1]*.7152+image[i+2]*.0722;count++;}
 renderer.render(scene,camera);return {mean:total/count,pixels:count};
}
window.__shadow160={sample,renderer,scene,camera,controller,source,roof,ready:true};sample();
