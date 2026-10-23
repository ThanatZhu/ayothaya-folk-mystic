import * as THREE from '../../vendor/build/three.module.js';
import {createRiggedSprite} from '../../rigged-sprite.js?v=106.0';
import {loadPaintedCharacter} from '../../painted-character.js?v=size1';
import {loadLifeArt,lifeFrameAt} from '../../character-life-art.js?v=106.0';
import {createRoleVfx} from '../skills-next/vfx.js';
import {createSkillLibraryRenderer} from './library-renderer.js';

export async function createLibraryStage(element){
 const scene=new THREE.Scene();scene.background=new THREE.Color('#3c4d34');
 const camera=new THREE.OrthographicCamera(-8,8,4.5,-4.5,.1,100);camera.position.set(0,11,15);camera.lookAt(0,.8,0);
 const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.outputColorSpace=THREE.SRGBColorSpace;element.append(renderer.domElement);
 scene.add(new THREE.HemisphereLight('#fff4d5','#657050',1.6));const sun=new THREE.DirectionalLight('#fff0c5',1.15);sun.position.set(-4,10,6);scene.add(sun);
 const loader=new THREE.TextureLoader(),materials=[],geometry=[],textures=[],frameTextures=new Map();let disposed=false,profile=null,oldTime=-.001,previousOld=false,zoom=1,preparation=0;
 const [groundMap,monsterMap,art,life]=await Promise.all([loader.loadAsync('./assets/capital-materials19.png'),loader.loadAsync('./assets/monsters.png'),loadPaintedCharacter('acolyte'),loadLifeArt('acolyte-female',{classId:'acolyte'})]);
 textures.push(groundMap,monsterMap);groundMap.colorSpace=monsterMap.colorSpace=THREE.SRGBColorSpace;groundMap.generateMipmaps=false;groundMap.minFilter=THREE.LinearFilter;
 const groundMaterial=new THREE.MeshLambertMaterial({color:'#e4e3d0'});materials.push(groundMaterial);
 groundMaterial.onBeforeCompile=shader=>{shader.uniforms.terrainAtlas={value:groundMap};shader.vertexShader='varying vec2 groundXZ;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ngroundXZ=(modelMatrix*vec4(transformed,1.)).xz;');shader.fragmentShader='varying vec2 groundXZ;uniform sampler2D terrainAtlas;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
 vec2 p=groundXZ;float edge=sin(p.x*.65)*.35+sin(p.y*1.2+p.x)*.25;
 float meadow=smoothstep(3.3,5.7,length(p*vec2(.72,1.))+edge);
 vec3 grass=texture2D(terrainAtlas,vec2(.005,.505)+fract(p/6.)*.49).rgb;
 vec3 dirt=texture2D(terrainAtlas,vec2(.505,.505)+fract(p/7.)*.49).rgb;
 diffuseColor.rgb*=mix(dirt,grass,meadow)*.8;`);};
 const plane=new THREE.PlaneGeometry(100,100),ground=new THREE.Mesh(plane,groundMaterial);ground.rotation.x=-Math.PI/2;ground.position.y=-.04;geometry.push(plane);scene.add(ground);
 const hero=createRiggedSprite(null,{classId:'swordsman'});hero.scale.set(2.5,2.5,1);hero.visible=false;scene.add(hero);
 monsterMap.repeat.set(.5,.5);monsterMap.offset.set(0,.5);
 const monsters=Array.from({length:3},()=>{const mat=new THREE.SpriteMaterial({map:monsterMap,alphaTest:.18,depthWrite:true}),sprite=new THREE.Sprite(mat);materials.push(mat);sprite.center.set(.5,.12);sprite.scale.setScalar(2.8);scene.add(sprite);return sprite;});
 function texture(canvas){if(!frameTextures.has(canvas)){const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.magFilter=t.minFilter=THREE.NearestFilter;t.generateMipmaps=false;frameTextures.set(canvas,t);}return frameTextures.get(canvas);}
 const friendMaterial=new THREE.SpriteMaterial({map:texture(art.female[0]),transparent:true,alphaTest:.35,depthWrite:true}),friend=new THREE.Sprite(friendMaterial);friend.center.set(.5,44/320);friend.scale.setScalar(3.125);friend.visible=false;materials.push(friendMaterial);scene.add(friend);
 const ghosts=Array.from({length:2},()=>{const mat=new THREE.SpriteMaterial({transparent:true,opacity:.28,color:'#9c7bc9',depthWrite:false}),sprite=new THREE.Sprite(mat);sprite.center.set(.5,44/320);sprite.scale.setScalar(3.125);materials.push(mat);scene.add(sprite);sprite.visible=false;return sprite;});
 const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=64;const ctx=shadowCanvas.getContext('2d'),gradient=ctx.createRadialGradient(32,32,2,32,32,30);gradient.addColorStop(0,'#1a231bc0');gradient.addColorStop(.45,'#1a231b65');gradient.addColorStop(1,'#1a231b00');ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);const shadowTex=new THREE.CanvasTexture(shadowCanvas);textures.push(shadowTex);
 const shadowGeometry=new THREE.PlaneGeometry(1,1);geometry.push(shadowGeometry);const shadows=Array.from({length:5},()=>{const mat=new THREE.MeshBasicMaterial({map:shadowTex,transparent:true,depthWrite:false,opacity:.5}),mesh=new THREE.Mesh(shadowGeometry,mat);mesh.rotation.x=-Math.PI/2;mesh.position.y=.008;materials.push(mat);scene.add(mesh);return mesh;});
 const grassGeometry=new THREE.PlaneGeometry(.055,.36),grassMaterial=new THREE.MeshLambertMaterial({color:'#84945c',side:THREE.DoubleSide}),grass=new THREE.InstancedMesh(grassGeometry,grassMaterial,120),dummy=new THREE.Object3D();geometry.push(grassGeometry);materials.push(grassMaterial);for(let i=0;i<120;i++){const a=i*2.399,r=6.3+(Math.sin(i*33)+1)*1.2;dummy.position.set(Math.cos(a)*r,.12,Math.sin(a)*r*.8);dummy.rotation.set(0,i*.7,Math.sin(i*5)*.22);dummy.scale.setScalar(.5+(Math.sin(i*8)+1)*.5);dummy.updateMatrix();grass.setMatrixAt(i,dummy.matrix);}scene.add(grass);
 const painted=createSkillLibraryRenderer(scene),oldFx=createRoleVfx(scene);
 function resize(){const box=element.getBoundingClientRect();if(!box.width||!box.height)return;const h=9/zoom;camera.left=-h*box.width/box.height/2;camera.right=-camera.left;camera.top=h/2;camera.bottom=-h/2;camera.updateProjectionMatrix();renderer.setSize(box.width,box.height);}
 const observer=new ResizeObserver(resize);observer.observe(element);resize();
 function stepOld(t,rebuild){
  if(rebuild||t<oldTime){oldFx.clear();oldTime=-.001;}let cursor=Math.max(0,oldTime);const first=profile.impacts[0]??.8,events=[{at:.2,charge:true},{at:first,charge:false}],skill={...profile.skill,kind:profile.skill.kind??'ward',windup:profile.skill.windup??.5};
  for(const event of events)if(event.at>oldTime&&event.at<=t){oldFx.update(Math.max(0,event.at-cursor));oldFx.burst(skill,{x:-2,z:0},{x:1.55,z:0},profile.color,event.charge);cursor=event.at;}oldFx.update(Math.max(0,t-cursor));oldTime=t;
 }
 const projection=new THREE.Vector3();
 const api={
  async prepare(next,{gender='male',quality='high',reduced=false}={}){
   const token=++preparation;hero.visible=false;profile=null;oldFx.clear();oldTime=-.001;previousOld=false;
   const [_,ready]=await Promise.all([hero.userData.setRig(next.classId,gender),painted.prepare(next,{quality})]);if(token!==preparation||disposed||!ready)return false;
   if(hero.userData.artError)throw new Error(hero.userData.artError);hero.material.needsUpdate=true;hero.visible=true;oldFx.configure({quality,reduced});profile=next;return true;
  },
  draw(sample,{old=false,quality='high',reduced=false,shake=true,zoom:nextZoom=1}={}){
   if(disposed||!profile||profile.id!==sample.id)return null;if(nextZoom!==zoom){zoom=nextZoom;resize();}
   const s=sample,heroZ=s.heroZ??0;hero.userData.pose({mode:'cast',time:s.time,artFrame:s.frame,reduced},false);hero.position.set(s.heroX,s.heroY,heroZ);hero.material.transparent=!!s.cloak;hero.material.opacity=s.cloak?.38:1;
   const friendly=['ally','down'].includes(profile.target);friend.visible=friendly;if(friendly){const clip=life?.clips[s.targetMode];friend.material.map=texture(clip?clip.frames[lifeFrameAt(clip,s.targetTime,reduced)]:art.female[0]);friend.position.set(s.targetX,.02,0);}
   const reflection=friendly&&profile.layers.some(layer=>layer.reflect);
   monsters.forEach((monster,index)=>{monster.visible=reflection?index===0:!friendly&&(index===0||profile.target==='group');monster.position.set(reflection?3.7:index?s.targetX+1.15:s.targetX,.02,index?(index===1?-1.35:1.35):0);monster.material.color.setRGB(1,1-s.reaction*.25,1-s.reaction*.4);});
   ghosts.forEach((ghost,i)=>{ghost.visible=!!profile.ghosts&&s.time>.45&&s.time<2.8;if(ghost.visible){if(!ghost.material.map)ghost.material.needsUpdate=true;ghost.material.map=hero.material.map;ghost.position.set(s.heroX+(i?1.05:-1.05),0,heroZ-.7);ghost.material.opacity=.28*Math.min(1,(s.time-.45)*4,(2.8-s.time)*3);}});
   shadows[0].position.set(s.heroX,.008,heroZ);shadows[0].scale.set(1.45,.7,1);shadows[0].material.opacity=.5-s.heroY*.3;
   for(let i=1;i<=3;i++){const object=i===1&&friendly?friend:monsters[i-1];shadows[i].visible=object.visible;shadows[i].position.set(object.position.x,.009,object.position.z);shadows[i].scale.set(friendly&&s.hp===0?1.8:1.4,.75,1);}
   shadows[4].visible=profile.layers.some(l=>l.mode==='pet');shadows[4].position.set(s.roosterX??-.9,.008,-.08);shadows[4].scale.set(.75,.4,1);
   if(old)stepOld(s.time,!previousOld);else if(previousOld){oldFx.clear();oldTime=-.001;}previousOld=old;
   const force=shake&&!reduced?s.shake:0,dx=Math.sin(s.time*117)*force,dy=Math.cos(s.time*93)*force*.55;camera.position.x+=dx;camera.position.y+=dy;camera.updateMatrixWorld();painted.sample(s,camera,{quality,reduced,hidden:old});renderer.render(scene,camera);
   const onSelf=profile.target==='self';projection.set(onSelf?s.heroX:s.targetX,2.15,onSelf?heroZ:0).project(camera);const box=element.getBoundingClientRect();const label={x:Math.max(50,Math.min(box.width-50,(projection.x+1)*box.width/2)),y:Math.max(80,(-projection.y+1)*box.height/2-28)};camera.position.x-=dx;camera.position.y-=dy;return label;
  },
  get metrics(){return {...painted.metrics,textures:renderer.info.memory.textures,geometries:renderer.info.memory.geometries,oldEffects:oldFx.count};},
  dispose(){if(disposed)return;disposed=true;preparation++;observer.disconnect();painted.dispose();oldFx.dispose();hero.userData.dispose();textures.forEach(t=>t.dispose());frameTextures.forEach(t=>t.dispose());geometry.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());renderer.dispose();}
 };return api;
}
