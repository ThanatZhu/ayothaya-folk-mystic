// Dense swaying grass and drifting motes for the diorama look. Grass grows exactly where the map paints meadow:
// one top-down render of the flat layers tells us where that is and how high the ground sits there.
import * as THREE from './vendor/build/three.module.js';

const GROUND=/^(Ground|Island[ _]meadow)/,SKIP=/^(Organic|Rounded|Fine|Soil|Cellar)/,HEIGHT_MIN=-8,HEIGHT_SPAN=48;
function readMeadow(renderer,scene,map,size=1024){
 const span=Math.max(map.bounds.w,map.bounds.d)+20,cx=map.bounds.x+map.bounds.w/2,cz=map.bounds.z+map.bounds.d/2;
 const cam=new THREE.OrthographicCamera(-span/2,span/2,span/2,-span/2,1,400);cam.position.set(cx,200,cz);cam.up.set(0,0,-1);cam.lookAt(cx,0,cz);cam.updateMatrixWorld();
 // Height needs more than 8 bits: G and B carry the whole and fractional part of it.
 const paint=flag=>new THREE.ShaderMaterial({vertexShader:'varying float h;void main(){vec4 w=modelMatrix*vec4(position,1.);h=w.y;gl_Position=projectionMatrix*viewMatrix*w;}',
  fragmentShader:`varying float h;void main(){float v=clamp((h-(${HEIGHT_MIN}.))/${HEIGHT_SPAN}.,0.,1.)*255.;gl_FragColor=vec4(${flag},floor(v)/255.,fract(v),1.);}`});
 const on=paint('1.'),off=paint('0.'),saved=[];
 scene.traverse(o=>{if(!o.isMesh&&!o.isPoints&&!o.isSprite&&!o.isLine)return;saved.push([o,o.material,o.visible]);if(SKIP.test(o.name)||o.isInstancedMesh||o.isSkinnedMesh||o.isSprite||o.isLine||o.isPoints)o.visible=false;else o.material=GROUND.test(o.name)?on:off;});
 const rt=new THREE.WebGLRenderTarget(size,size),bg=scene.background,fog=scene.fog,shadows=renderer.shadowMap.autoUpdate,clear=renderer.getClearAlpha(),tone=renderer.toneMapping;
 scene.background=null;scene.fog=null;renderer.shadowMap.autoUpdate=false;renderer.setClearAlpha(0);
 const px=new Uint8Array(size*size*4);
 try{renderer.setRenderTarget(rt);renderer.clear();renderer.render(scene,cam);renderer.readRenderTargetPixels(rt,0,0,size,size,px);}
 finally{renderer.setRenderTarget(null);scene.background=bg;scene.fog=fog;renderer.shadowMap.autoUpdate=shadows;renderer.setClearAlpha(clear);renderer.toneMapping=tone;for(const [o,m,v] of saved){o.material=m;o.visible=v;}rt.dispose();on.dispose();off.dispose();}
 const at=(x,z)=>{const u=Math.floor((x-cx+span/2)/span*size),v=Math.floor((cz+span/2-z)/span*size);return u<0||v<0||u>=size||v>=size?-1:(v*size+u)*4;};
 return {grass:(x,z)=>{const i=at(x,z);return i>=0&&px[i]>127;},height:(x,z)=>{const i=at(x,z);return i<0?0:(px[i+1]+px[i+2]/255)/255*HEIGHT_SPAN+HEIGHT_MIN;}};
}

const hash=(x,y)=>{const s=Math.sin(x*127.1+y*311.7)*43758.5453;return s-Math.floor(s);};
function noise(x,y){const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,ux=fx*fx*(3-2*fx),uy=fy*fy*(3-2*fy);const a=hash(ix,iy),b=hash(ix+1,iy),c=hash(ix,iy+1),d=hash(ix+1,iy+1);return a+(b-a)*ux+(c-a)*uy+(a-b-c+d)*ux*uy;}
const fbm=(x,y)=>noise(x,y)*.6+noise(x*2.3+7,y*2.3+3)*.28+noise(x*5.1+1,y*5.1+9)*.12;

// A tuft of tapered blades. All normals point up so a tuft lights softly instead of flickering blade by blade.
function tuft(blades,width,spread){
 const pos=[],col=[],idx=[];
 for(let b=0;b<blades;b++){
  const yaw=hash(b,1)*6.283,lean=spread*(.4+hash(b,2)),dx=Math.cos(yaw),dz=Math.sin(yaw),sx=-dz*width,sz=dx*width,h=.7+hash(b,3)*.3,ox=dx*.12*hash(b,4),oz=dz*.12*hash(b,4),v=pos.length/3;
  pos.push(ox-sx,0,oz-sz, ox+sx,0,oz+sz, ox-sx*.7+dx*lean*.35,h*.55,oz-sz*.7+dz*lean*.35, ox+sx*.7+dx*lean*.35,h*.55,oz+sz*.7+dz*lean*.35, ox+dx*lean,h,oz+dz*lean);
  col.push(.42,.42,.42, .42,.42,.42, .86,.86,.86, .86,.86,.86, 1.25,1.25,1.25);
  idx.push(v,v+1,v+3, v,v+3,v+2, v+2,v+3,v+4);
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));g.setIndex(idx);
 g.setAttribute('normal',new THREE.Float32BufferAttribute(new Float32Array(pos.length).map((_,i)=>i%3===1?1:0),3));return g;
}
function swayMaterial(wind){
 const m=new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide});
 m.onBeforeCompile=s=>{s.uniforms.wind=wind;s.vertexShader='uniform float wind;\n'+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n vec3 root=instanceMatrix[3].xyz;float bend=position.y*position.y;transformed.x+=bend*.16*sin(wind*1.7+root.x*.55+root.z*.3);transformed.z+=bend*.1*sin(wind*1.2+root.x*.2-root.z*.45);');};
 m.customProgramCacheKey=()=>'meadow-sway';return m;
}
// Split into tiles so three.js can skip everything off screen.
function plant(parent,geometry,material,items,tile=14){
 const tiles=new Map(),m=new THREE.Matrix4(),q=new THREE.Quaternion(),up=new THREE.Vector3(0,1,0),p=new THREE.Vector3(),s=new THREE.Vector3(),c=new THREE.Color();
 for(const it of items){const k=Math.floor(it.x/tile)+':'+Math.floor(it.z/tile);(tiles.get(k)??tiles.set(k,[]).get(k)).push(it);}
 for(const list of tiles.values()){
  const mesh=new THREE.InstancedMesh(geometry,material,list.length);mesh.receiveShadow=true;mesh.castShadow=false;mesh.name='Meadow tufts';
  list.forEach((it,i)=>{q.setFromAxisAngle(up,it.yaw);m.compose(p.set(it.x,it.y,it.z),q,s.set(it.w,it.h,it.w));mesh.setMatrixAt(i,m);mesh.setColorAt(i,c.setRGB(...it.color));});
  mesh.computeBoundingSphere();parent.add(mesh);
 }
}
const mix3=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
const DEEP=[.030,.080,.020],MID=[.095,.155,.035],SUN=[.290,.270,.075]; // linear RGB: olive, not lawn green
function grow(parent,meadow,map,wind,density){
 const b=map.bounds,grass=[],leaves=[],step=.26/Math.sqrt(density),edge=(x,z,r)=>meadow.grass(x+r,z)&&meadow.grass(x-r,z)&&meadow.grass(x,z+r)&&meadow.grass(x,z-r);
 for(let ix=0;ix*step<b.w;ix++)for(let iz=0;iz*step<b.d;iz++){
  const x=b.x+(ix+hash(ix,iz))*step,z=b.z+(iz+hash(iz,ix+9))*step;
  if(!meadow.grass(x,z))continue;
  const inner=edge(x,z,.5),deep=inner&&edge(x,z,1.1),clump=fbm(x*.16,z*.16),tall=Math.min(1,Math.max(0,(clump-.36)*3))*(deep?1:inner?.55:.2);
  if(hash(ix+3,iz+5)>.62+tall*.38)continue;
  const tint=fbm(x*.09+4,z*.09+2),color=mix3(mix3(DEEP,MID,Math.min(1,tint*1.5)),SUN,Math.max(0,tint-.45)*1.6+tall*.12).map(v=>v*(.85+hash(ix,iz+1)*.3));
  grass.push({x,z,y:meadow.height(x,z)-.03,yaw:hash(ix+1,iz)*6.283,w:.6+tall*.5,h:.2+tall*tall*.46+hash(ix,iz+2)*.08,color}); // knee high: taller grass hid monsters
 }
 for(let ix=0;ix*1.2<b.w;ix++)for(let iz=0;iz*1.2<b.d;iz++){
  const x=b.x+(ix+hash(ix,iz+40))*1.2,z=b.z+(iz+hash(iz,ix+41))*1.2;
  if(!meadow.grass(x,z)||!edge(x,z,.7)||hash(ix+7,iz+8)>.3*density)continue;
  leaves.push({x,z,y:meadow.height(x,z)-.03,yaw:hash(ix,iz+3)*6.283,w:.8+hash(ix,iz+4)*.7,h:.3+hash(ix,iz+6)*.26,color:[.030,.090,.024]});
 }
 const material=swayMaterial(wind);plant(parent,tuft(11,.04,.36),material,grass);plant(parent,tuft(7,.075,.42),material,leaves);
 return grass.length+leaves.length;
}
function createMotes(parent,count=260,box=[36,7,36]){
 const c=document.createElement('canvas');c.width=c.height=32;const x=c.getContext('2d'),g=x.createRadialGradient(16,16,0,16,16,16);g.addColorStop(0,'#fff');g.addColorStop(.3,'#fff6');g.addColorStop(1,'#fff0');x.fillStyle=g;x.fillRect(0,0,32,32);
 const pos=new Float32Array(count*3),seed=new Float32Array(count);for(let i=0;i<count;i++){pos[i*3]=Math.random()*box[0];pos[i*3+1]=Math.random()*box[1];pos[i*3+2]=Math.random()*box[2];seed[i]=Math.random()*6.283;}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
 const pts=new THREE.Points(geo,new THREE.PointsMaterial({map:new THREE.CanvasTexture(c),color:'#ffeeb4',size:6,sizeAttenuation:false,transparent:true,opacity:.8,depthWrite:false,blending:THREE.AdditiveBlending,fog:false}));
 pts.frustumCulled=false;parent.add(pts);
 const wrap=(v,c,w)=>{const o=v-(c-w/2);return c-w/2+((o%w)+w)%w;};
 return (dt,t,at)=>{const a=geo.attributes.position.array;for(let i=0;i<count;i++){const s=seed[i];
   a[i*3]=wrap(a[i*3]+Math.sin(t*.3+s)*dt*.35,at.x,box[0]);a[i*3+1]=(((a[i*3+1]+(Math.sin(t*.5+s*2)*.2+.08)*dt)%box[1])+box[1])%box[1];a[i*3+2]=wrap(a[i*3+2]+Math.cos(t*.25+s)*dt*.3,at.z,box[2]);}
  geo.attributes.position.needsUpdate=true;};
}
// density 1 = full field, 0 = no grass. parent is the map's model, so the map's own dispose frees all of this.
export function createMeadowGrass({renderer,scene,parent,map,density=1,motes=true}){
 const wind={value:0};let count=0;
 if(density>0&&map.bounds)count=grow(parent,readMeadow(renderer,scene,map),map,wind,density);
 const drift=count&&motes?createMotes(parent):null;
 return {count,update(dt,t,at){wind.value=t;drift?.(dt,t,at);}};
}
