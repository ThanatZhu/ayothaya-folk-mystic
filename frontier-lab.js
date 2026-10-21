import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createCapitalLook,createCapitalTrees} from './capital-look.js?v=38';
import {createLandscapeDetails} from './landscape-details.js?v=38';
import {createFrontierScene} from './frontier-scene.js?v=38';
import {loadMonsterFrames} from './monster-art.js?v=38';
import {MONSTER_TYPES} from './combat-core.js?v=109.4';
import {monsterFrame} from './monster-catalog.js?v=38';
import {createSoftLook} from './soft-look.js?v=82';
const $=id=>document.getElementById(id),id=new URLSearchParams(location.search).get('map')??'rice-fields';
$('map').value=id;$('map').onchange=()=>location.assign('?map='+$('map').value);
try{
 const catalog=await fetch('./maps/world.json?v=38').then(r=>r.json()),map=catalog.maps.find(m=>m.id===id&&m.procedural)??catalog.maps[1];
 const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.toneMapping=THREE.NeutralToneMapping;document.body.prepend(renderer.domElement);
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-26,26,18,-18,.1,350),controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.maxPolarAngle=Math.PI*.43;controls.minZoom=.45;controls.maxZoom=3;
 function focus(x,z){controls.target.set(x,1,z);camera.position.set(x+24,29,z+30);controls.update();}focus(0,33);camera.zoom=1.35;
 const soft=createSoftLook({renderer,scene,camera});
 function size(){const a=innerWidth/innerHeight;camera.left=-19*a;camera.right=19*a;camera.top=19;camera.bottom=-19;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);soft.setSize(innerWidth,innerHeight);}addEventListener('resize',size);size();
 const night=map.procedural==='mill';scene.add(new THREE.HemisphereLight(night?'#b4d5dd':'#fff3d9',night?'#4e6260':'#657755',night?.85:1.6));const sun=new THREE.DirectionalLight(night?'#bed9ed':'#fff1d2',night?.7:1.7);sun.position.set(-20,45,30);sun.castShadow=true;Object.assign(sun.shadow.camera,{left:-75,right:75,top:75,bottom:-75,far:180});sun.shadow.mapSize.set(2048,2048);sun.shadow.bias=-.0003;scene.add(sun);
 const loader=new THREE.TextureLoader(),[atlas,leaves,materials]=await Promise.all(['capital-materials19','capital-leaves19','materials'].map(n=>loader.loadAsync('./assets/'+n+'.png')));
 function frame(image,[x,y,w,h],repeat){const c=document.createElement('canvas');c.width=image.width*w;c.height=image.height*h;c.getContext('2d').drawImage(image,image.width*x,image.height*y,c.width,c.height,0,0,c.width,c.height);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;if(repeat)t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;}
 const look=createCapitalLook({map,atlas,frame}),trees=createCapitalTrees({scene,map,texture:leaves,crownTexture:look.crownTexture}),details=createLandscapeDetails({scene,map}),ambient=await createFrontierScene({scene,map,ground:look.ground,tiles:{wood:frame(materials.image,[0,0,.5,.5],true)}}),art=await loadMonsterFrames(map);
 let reaction=0,death=0,time=0,last=performance.now();const views=map.mobs.map(([x,z,type],i)=>{const h=MONSTER_TYPES[type].height;const s=new THREE.Sprite(new THREE.SpriteMaterial({map:art[type][0],alphaTest:.45}));s.center.set(.5,0);s.position.set(x,.06,z);s.scale.set(h*1.1,h,1);scene.add(s);return {sprite:s,type,i};});
 $('arrival').onclick=()=>focus(0,33);$('bridge').onclick=()=>focus(map.waterAreas[0].x+3,10);$('boss').onclick=()=>{const [x,z]=map.mobs.at(-1);focus(x,z);camera.zoom=1.8;camera.updateProjectionMatrix();};$('hit').onclick=()=>{reaction=.65;death=0;};$('death').onclick=()=>{death=2;reaction=0;};
 $('status').textContent=map.name+' · '+map.mobs.length+' จุดเกิด · ภาพพร้อม';
 renderer.setAnimationLoop(()=>{const now=performance.now(),dt=Math.min(.05,(now-last)/1000);last=now;time+=dt;reaction=Math.max(0,reaction-dt);death=Math.max(0,death-dt);const t=ambient.update(dt);look.update(t);trees.update(t);details.update(t);for(const v of views){const f=monsterFrame({hp:death>0?0:1,hit:reaction/2,windup:0,strike:0,moving:false},time);v.sprite.material.map=art[v.type][f];v.sprite.position.x=map.mobs[v.i][0]+(reaction>0?Math.sin(reaction/.65*Math.PI)*.18:0);v.sprite.material.color.set(reaction>.5?'#ffdec0':'#ffffff');}controls.update();soft.render(dt);});
}catch(e){console.error(e);$('status').textContent='โหลดไม่สำเร็จ: '+e.message;}
