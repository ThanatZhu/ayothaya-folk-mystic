import * as THREE from 'three';
import {roadDistance} from './landscape-details.js?v=38';

// Geometry and collision footprints are both described by maps/world.json.
export async function createFrontierScene({scene,map,ground,tiles}){
 const root=new THREE.Group();root.name='Countryside';scene.add(root);
 const night=map.procedural==='mill',clock={value:0};let running=!matchMedia('(prefers-reduced-motion:reduce)').matches;
 scene.background=new THREE.Color(night?'#31494d':'#d7dec0');scene.fog=new THREE.Fog(night?'#455c60':'#d7dec0',60,135);
 let seed=3803;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
 const material=(color,map)=>new THREE.MeshLambertMaterial({color,map});
 const wood=material('#b79b6d',tiles.wood),stone=material('#9b9f83'),soil=material('#8e805b'),water=new THREE.MeshPhongMaterial({color:'#416e66',shininess:70,transparent:true,opacity:.92});
 const box=(x,y,z,w,h,d,mat)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;root.add(m);return m;};
 ground.color.set(night?'#9bacb1':map.mood==='dusk'?'#d6c3a6':map.procedural==='rice'?'#e6dfbd':'#d8e2c9');
 const b=map.bounds;box(b.x+b.w/2,-.48,b.z+b.d/2,b.w+160,.9,b.d+160,soil);
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(b.w+160,b.d+160),ground);floor.rotation.x=-Math.PI/2;floor.position.set(b.x+b.w/2,.005,b.z+b.d/2);floor.receiveShadow=true;root.add(floor);
 // Dark shoreline + translucent wave highlights give depth without a flat blue strip.
 const waveMaterial=new THREE.ShaderMaterial({depthWrite:false,uniforms:{time:clock,night:{value:night?1:0}},vertexShader:'varying vec2 p;varying vec2 v;void main(){v=uv;vec4 w=modelMatrix*vec4(position,1.);p=w.xz;gl_Position=projectionMatrix*viewMatrix*w;}',fragmentShader:`
 uniform float time;uniform float night;varying vec2 p;varying vec2 v;
 float hash(vec2 q){return fract(sin(dot(q,vec2(127.1,311.7)))*43758.5453);}
 float noise(vec2 q){vec2 i=floor(q),f=fract(q);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1)),f.x),f.y);}
 void main(){float shore=smoothstep(0.,.23,min(v.x,1.-v.x));float cloud=noise(p*.31+vec2(time*.025,time*.06));float grain=noise(p*1.9+vec2(0,time*.17));
 vec3 shallow=vec3(.34,.43,.27),deep=vec3(.12,.29,.27);vec3 c=mix(shallow,deep,shore)+vec3(.08,.11,.08)*(cloud-.4);
 float crest=pow(max(0.,sin(p.y*5.+sin(p.x*2.)+grain*2.-time*1.1)),18.);c+=vec3(.43,.56,.49)*crest*.10*smoothstep(.52,.8,grain);
 c+=vec3(.10,.14,.10)*pow(1.-shore,3.)*(.5+.5*sin(p.y*2.8-time));c=mix(c,c*vec3(.63,.78,.92),night*.65);gl_FragColor=vec4(c,1.);}` });
 for(const a of map.waterAreas){box(a.x+a.w/2,.025,a.z+a.d/2,a.w,.02,a.d,water);const ripples=new THREE.Mesh(new THREE.PlaneGeometry(a.w,a.d),waveMaterial);ripples.rotation.x=-Math.PI/2;ripples.position.set(a.x+a.w/2,.047,a.z+a.d/2);root.add(ripples);for(const x of [a.x-.2,a.x+a.w+.2])box(x,.12,a.z+a.d/2,.5,.25,a.d,stone);}
 for(const a of map.bridges){
  for(let x=a.x;x<a.x+a.w;x+=.55)box(x,.18,a.z+a.d/2,.5,.26,a.d,wood);
  for(const z of [a.z+.2,a.z+a.d-.2]){box(a.x+a.w/2,1.03,z,a.w,.12,.13,wood);for(let x=a.x;x<=a.x+a.w;x+=2.2)box(x,.6,z,.14,1.2,.14,wood);}
 }
 const [image,metadata]=await Promise.all([new THREE.TextureLoader().loadAsync('./assets/frontier38/rural-props.png'),fetch('./assets/frontier38/rural-props.json').then(r=>r.json())]);
 const textures=metadata.rects.map(([x,y,w,h])=>{const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(image.image,x,y,w,h,0,0,w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.magFilter=THREE.LinearFilter;return t;});
 const mats=textures.map(map=>new THREE.SpriteMaterial({map,alphaTest:.45,color:night?'#aebbbc':'#fff4dc'}));
 const shadows=new THREE.MeshBasicMaterial({color:'#344a31',transparent:true,opacity:.2,depthWrite:false});
 function prop(asset,x,z,w,h){const s=new THREE.Sprite(mats[asset]);s.center.set(.5,0);s.position.set(x,.07,z);s.scale.set(w,h,1);root.add(s);const sh=new THREE.Mesh(new THREE.CircleGeometry(w*.29,20),shadows);sh.rotation.x=-Math.PI/2;sh.position.set(x,.06,z);root.add(sh);return s;}
 const breeze=[];
 // Irregular bank rocks soften the straight canal edge while keeping bridge approaches clear.
 for(const a of map.waterAreas)for(let z=a.z+3;z<a.z+a.d-2;z+=4.6){if(map.bridges.some(b=>z>b.z-2&&z<b.z+b.d+2))continue;for(const x of [a.x-.35,a.x+a.w+.35]){const s=1.2+random()*.9;prop(7,x+(random()-.5)*.6,z,s,s*.63);}}
 for(const [kind,x,z,w]of map.plants)if(kind==='canopy19'){const s=w/6;const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.17*s,.34*s,4.8*s,9),wood);trunk.position.set(x,2.4*s,z);trunk.castShadow=true;root.add(trunk);}
 for(const d of map.decor)prop(d.asset,d.x,d.z,d.w,d.h);
 // Dense agricultural pockets, broad walkable roads, never a screen-wide repeating carpet.
 const riceGeo=new THREE.PlaneGeometry(1,1);riceGeo.translate(0,.5,0);
 const riceMat=new THREE.MeshBasicMaterial({map:textures[6],alphaTest:.5,side:THREE.DoubleSide,color:night?'#93a48b':'#eee9be'});
 riceMat.onBeforeCompile=s=>{s.uniforms.windTime=clock;s.vertexShader='uniform float windTime;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.x+=position.y*position.y*.13*sin(windTime*1.1+instanceMatrix[3].x*.4+instanceMatrix[3].z*.2);');};
 const stems=[],objects=[];
 for(let i=0;i<1250;i++){
  const x=-69+random()*138,z=-74+random()*135;
  if(roadDistance(x,z,map)<2.4||map.waterAreas.some(a=>x>a.x-2&&x<a.x+a.w+2)||map.nav.obstacles.some(a=>x>a.x-2&&x<a.x+a.w+2&&z>a.z-2&&z<a.z+a.d+2))continue;
  if(map.procedural==='rice'&&i<1000){} // Rice is authored in paddies below, not scattered at random.
  else if(i<125&&Math.abs(x)>15){const asset=map.procedural==='orchard'?3+i%2:7;objects.push([asset,x,z,asset===7?1.5:4.8,asset===7?1:6+random()*2]);}
 }
 if(map.procedural==='rice')for(const [cx,cz,w,d]of [[-44,33,24,21],[19,33,15,23],[-40,-10,28,20],[18,-12,16,25],[-44,-59,26,21],[53,-57,22,21]]){
  const mud=material('#878153');box(cx,.025,cz,w,.04,d,mud);
  for(const x of [cx-w/2,cx+w/2])box(x,.12,cz,.6,.24,d+1,soil);
  for(const z of [cz-d/2,cz+d/2])box(cx,.12,z,w+1,.24,.6,soil);
  for(let x=cx-w/2+1;x<cx+w/2-1;x+=1.5)for(let z=cz-d/2+1;z<cz+d/2-1;z+=1.65)stems.push([x+(random()-.5)*.3,z,1.05+random()*.3]);
 }
 const rice=new THREE.InstancedMesh(riceGeo,riceMat,stems.length*2),dummy=new THREE.Object3D();let n=0;
 for(const [x,z,s]of stems)for(const a of [.5,2.07]){dummy.position.set(x,.05,z);dummy.rotation.set(0,a,0);dummy.scale.set(1.8*s,1.1*s,1);dummy.updateMatrix();rice.setMatrixAt(n++,dummy.matrix);}rice.computeBoundingSphere();rice.receiveShadow=true;root.add(rice);
 for(const o of objects){const s=prop(...o);if(o[0]!==7){s.material=s.material.clone();breeze.push({sprite:s,x:o[1]});}}
 for(const [x,z]of [[-8,48],[9,8],[-8,-32]]){prop(8,x,z,2,1.6);prop(7,x+2,z+1,2.3,1.4);}
 // Pools of lantern light and animated fireflies frame the route through the mill.
 const lamps=[];for(const [x,z]of [[-7,50],[7,16],[-7,-18],[8,-42]]){box(x,1,z,.14,2,.14,wood);const flame=new THREE.Mesh(new THREE.SphereGeometry(.17,8,6),new THREE.MeshBasicMaterial({color:night?'#9ee9c6':'#ffcf79'}));flame.position.set(x,2.1,z);root.add(flame);const glow=new THREE.PointLight(night?'#9ee9c6':'#ffd28c',night?7:1,9,1.7);glow.position.copy(flame.position);root.add(glow);lamps.push(glow);}
 const dustGeometry=new THREE.BufferGeometry(),positions=new Float32Array(96*3);for(let i=0;i<96;i++){positions[i*3]=(random()-.5)*115;positions[i*3+1]=.6+random()*4;positions[i*3+2]=-65+random()*120;}dustGeometry.setAttribute('position',new THREE.BufferAttribute(positions,3));root.add(new THREE.Points(dustGeometry,new THREE.PointsMaterial({size:night?.095:.045,color:night?'#b5f4d4':'#f5e4a3',transparent:true,opacity:.6,depthWrite:false})));
 return {root,update(dt){if(running)clock.value+=Math.min(.08,Math.max(0,dt));const t=clock.value;breeze.forEach(({sprite:s},i)=>{s.material.rotation=.008*Math.sin(t*.8+i);});lamps.forEach((l,i)=>l.intensity=(night?7:1)*(1+Math.sin(t*3+i)*.07));return t;},toggle(){running=!running;return running;},get running(){return running;}};
}
