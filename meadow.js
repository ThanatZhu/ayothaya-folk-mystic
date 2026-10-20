import * as THREE from './vendor/build/three.module.js';
import {roadDistance} from './landscape-details.js?v=38';
import {groundHeight} from './combat-core.js?v=101';

// 0.75 living meadow: painted grass tufts, tall grass, ferns and flower clumps scattered over the open ground of a
// Blender v2 map (never on tracks, plazas, canals, bridges, buildings or the rice paddies, which keep their own
// blades). Everything is drawn into one canvas atlas at load, so nothing is downloaded. Each 20 m chunk is one
// instanced draw, so the camera only pays for the chunks it sees. Phones get ~40% of the clumps.
// Per map: flowers = drift level above which flowers bloom, ferns = drift level above which ferns gather (lower = more),
// density = clumps per square metre. The lotus marsh is one big water area with walkable islands, so its water box is
// ignored and the walk grid alone decides where land is. The mill cellar is indoors and gets none.
const MIX={'rice-fields':{flowers:.3,ferns:.5},'old-orchard':{flowers:.5,ferns:.25},
 ayutthaya:{flowers:.35,ferns:.6,density:2},'moonlit-mill':{flowers:.55,ferns:.3},'lotus-marsh':{flowers:.25,ferns:.35,islands:true}};
export const MEADOW_MAPS=new Set(Object.keys(MIX));
const TILES=['grass','tall','fern','daisy','marigold','orchid','clover'],COLS=4,ROWS=2,CELL=256,CHUNK=20;
// [tile, width, height] per kind; heights stay under a character's knee so feet remain readable.
const KIND={grass:[0,1.15,.5],tall:[1,1.1,.72],fern:[2,1.6,.62],daisy:[3,1.05,.5],marigold:[4,1.05,.5],orchid:[5,1.05,.52],clover:[6,1.2,.32]};

function atlas(){
 const c=document.createElement('canvas');c.width=CELL*COLS;c.height=CELL*ROWS;const g=c.getContext('2d');
 let seed=7;const r=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
 const at=i=>[(i%COLS)*CELL,Math.floor(i/COLS)*CELL];
 const blade=(x0,y0,len,lean,w,base,tip)=>{const x1=x0+lean*len,y1=y0-len,gr=g.createLinearGradient(x0,y0,x1,y1);gr.addColorStop(0,base);gr.addColorStop(1,tip);g.fillStyle=gr;g.beginPath();g.moveTo(x0-w,y0);g.quadraticCurveTo(x0+lean*len*.3-w*.4,y0-len*.55,x1,y1);g.quadraticCurveTo(x0+lean*len*.3+w*.4,y0-len*.55,x0+w,y0);g.closePath();g.fill();};
 const tuft=(i,n,h,base,tips)=>{const [ox,oy]=at(i);for(let k=0;k<n;k++){const x=ox+CELL*(.3+r()*.4),lean=(x-ox-CELL/2)/CELL*1.6+(r()-.5)*.5;blade(x,oy+CELL-10,CELL*h*(.55+r()*.45),lean,3+r()*4,base,tips[k%tips.length]);}};
 const flower=(x,y,rad,petal,core)=>{g.fillStyle=petal;for(let k=0;k<5;k++){const a=k/5*Math.PI*2;g.beginPath();g.ellipse(x+Math.cos(a)*rad,y+Math.sin(a)*rad*.8,rad*.8,rad*.55,a,0,Math.PI*2);g.fill();}g.fillStyle=core;g.beginPath();g.arc(x,y,rad*.55,0,Math.PI*2);g.fill();};
 const bloom=(i,petals,core)=>{const [ox,oy]=at(i);tuft(i,18,.5,'#5d8a35',['#9fc257','#b1cf63']);
  for(let k=0;k<7;k++){const x=ox+CELL*(.22+r()*.56),top=oy+CELL*(.28+r()*.35);g.strokeStyle='#557f34';g.lineWidth=3;g.beginPath();g.moveTo(x+(r()-.5)*20,oy+CELL-12);g.quadraticCurveTo(x+(r()-.5)*16,(top+oy+CELL)/2,x,top);g.stroke();flower(x,top,9+r()*6,petals[k%petals.length],core);}};
 tuft(0,52,.62,'#5d8a35',['#a7c75a','#b9d468','#94bb4e']);
 tuft(1,38,.92,'#6f8f3e',['#cbd57a','#d8dc8a','#b8c96a']);
 {const [ox,oy]=at(1);for(let k=0;k<6;k++){const x=ox+CELL*(.3+r()*.4),y=oy+CELL*(.08+r()*.15);g.fillStyle='#e3d39a';g.beginPath();g.ellipse(x,y,4,13,(r()-.5)*.6,0,Math.PI*2);g.fill();}}
 {const [ox,oy]=at(2);for(let k=0;k<9;k++){const a=-Math.PI/2+(k-4)*.3+(r()-.5)*.12,len=CELL*(.42+r()*.18),bx=ox+CELL/2,by=oy+CELL-10;
  for(let s=1;s<=11;s++){const t=s/12,x=bx+Math.cos(a)*len*t+Math.cos(a)*len*t*t*.0,y=by+Math.sin(a)*len*t+len*t*t*.35,w=(1-t)*15+4;g.fillStyle=s%2?'#5f9c3f':'#79b34f';
   for(const side of [-1,1]){g.beginPath();g.ellipse(x+Math.cos(a+side*1.2)*w*.6,y+Math.sin(a+side*1.2)*w*.6,w*.6,w*.24,a+side*1.2,0,Math.PI*2);g.fill();}}
  g.strokeStyle='#3a6a28';g.lineWidth=3;g.beginPath();g.moveTo(bx,by);g.quadraticCurveTo(bx+Math.cos(a)*len*.5,by+Math.sin(a)*len*.5,bx+Math.cos(a)*len,by+Math.sin(a)*len+len*.35);g.stroke();}}
 bloom(3,['#fbfaf0','#f2efe2'],'#f1c64a');bloom(4,['#f6b93b','#f3d04f'],'#c8661e');bloom(5,['#d79be0','#f19fbf'],'#fbe39a');
 {const [ox,oy]=at(6);for(let k=0;k<26;k++){const x=ox+CELL*(.15+r()*.7),y=oy+CELL*(.55+r()*.38),s=10+r()*8;g.fillStyle=k%3?'#5f9a3e':'#78b04d';for(let l=0;l<3;l++){const a=l/3*Math.PI*2+r();g.beginPath();g.ellipse(x+Math.cos(a)*s*.55,y+Math.sin(a)*s*.4,s*.55,s*.4,a,0,Math.PI*2);g.fill();}}}
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;
}
// Three crossed upright cards, base at y=0, height 1; normals point up so clumps light like the ground they stand on.
function clumpGeometry(){
 const p=[],uv=[],n=[],idx=[];
 for(let q=0;q<3;q++){const a=q*Math.PI/3,cx=Math.cos(a)*.5,cz=Math.sin(a)*.5,b=p.length/3;
  p.push(-cx,0,-cz,cx,0,cz,cx,1,cz,-cx,1,-cz);uv.push(0,0,1,0,1,1,0,1);n.push(0,1,0,0,1,0,0,1,0,0,1,0);idx.push(b,b+1,b+2,b,b+2,b+3);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setAttribute('normal',new THREE.Float32BufferAttribute(n,3));g.setIndex(idx);return g;
}
function paddyMask(model,map){
 // Cells covered by the Blender rice blades are paddies: they already carry rice, so the meadow skips them.
 const {x:bx,z:bz,w,d}=map.bounds,cols=Math.ceil(w),mask=new Uint8Array(cols*Math.ceil(d)),v=new THREE.Vector3();
 model.updateMatrixWorld(true);
 const seen=new Set(); // tiles of one Blender mesh share a vertex buffer: read each buffer once
 model.traverse(o=>{if(!o.isMesh||!/^Dense rice blades/.test(o.name)||seen.has(o.geometry.attributes.position))return;const pos=o.geometry.attributes.position;seen.add(pos);
  for(let i=0;i<pos.count;i+=3){v.fromBufferAttribute(pos,i).applyMatrix4(o.matrixWorld);const cx=Math.floor(v.x-bx),cz=Math.floor(v.z-bz);
   for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){const x=cx+dx,z=cz+dz;if(x>=0&&z>=0&&x<cols&&z<d)mask[z*cols+x]=1;}}});
 return (x,z)=>mask[Math.floor(z-bz)*cols+Math.floor(x-bx)]===1;
}
export function createMeadow({scene,map,model,quality='high',reduced=false}){
 const texture=atlas(),base=clumpGeometry(),wind={value:0};
 const material=new THREE.MeshLambertMaterial({map:texture,alphaTest:.5,side:THREE.DoubleSide});
 material.onBeforeCompile=s=>{
  s.uniforms.meadowWind=wind;
  s.vertexShader='uniform float meadowWind;\nattribute float aTile;\n'+s.vertexShader
   .replace('#include <uv_vertex>',`#include <uv_vertex>\n vMapUv=vec2((mod(aTile,${COLS}.0)+uv.x)/${COLS}.0,(uv.y+${ROWS-1}.0-floor(aTile/${COLS}.0))/${ROWS}.0);`)
   .replace('#include <project_vertex>',`vec4 mvPosition=instanceMatrix*vec4(transformed,1.0);
 float sway=position.y*position.y;vec2 at=instanceMatrix[3].xz;
 mvPosition.x+=sway*.09*sin(meadowWind*1.6+at.x*.31+at.y*.23);mvPosition.z+=sway*.06*sin(meadowWind*1.25+at.x*.17-at.y*.29);
 mvPosition=modelViewMatrix*mvPosition;gl_Position=projectionMatrix*mvPosition;`);
 };
 material.customProgramCacheKey=()=>'meadow75';
 const mix=MIX[map.id]??MIX['rice-fields'],paddy=paddyMask(model,map),{x:bx,z:bz,w,d}=map.bounds;
 let seed=4211;const r=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
 // Slow value noise so flowers and ferns gather in drifts instead of an even sprinkle.
 const drift=(x,z,k)=>(Math.sin(x*.13+k)*Math.cos(z*.11-k*1.7)+Math.sin((x+z)*.05+k*2.3))*.5;
 const scale=quality==='low'?.4:1,chunks=new Map(),dummy=new THREE.Object3D(),tint=new THREE.Color();
 const place=(kind,x,z,size)=>{
  const key=Math.floor((x-bx)/CHUNK)+','+Math.floor((z-bz)/CHUNK);if(!chunks.has(key))chunks.set(key,[]);
  const [tile,cw,ch]=KIND[kind];dummy.position.set(x,groundHeight(map.nav,x,z)+.02,z);dummy.rotation.set(0,r()*Math.PI,0);dummy.scale.set(cw*size,ch*size*(.85+r()*.3),cw*size);dummy.updateMatrix();
  const shade=kind==='grass'||kind==='tall'||kind==='clover'?.82+r()*.26:.95+r()*.1;tint.setRGB(shade*(.96+r()*.08),shade,shade*(.92+r()*.08));
  chunks.get(key).push({matrix:dummy.matrix.clone(),tile,color:tint.clone()});
 };
 const shore=(x,z)=>map.nav.grid&&[[1.6,0],[-1.6,0],[0,1.6],[0,-1.6]].some(([dx,dz])=>!walkableCell(map.nav.grid,x+dx,z+dz));
 const water=(x,z,m)=>!mix.islands&&map.waterAreas.some(a=>x>a.x-m&&x<a.x+a.w+m&&z>a.z-m&&z<a.z+a.d+m),bridge=(x,z)=>(map.bridges??[]).some(a=>x>a.x-a.w/2-.5&&x<a.x+a.w/2+.5&&z>a.z-a.d/2-.5&&z<a.z+a.d/2+.5);
 for(let cz=Math.ceil(bz)+1;cz<bz+d-1;cz++)for(let cx=Math.ceil(bx)+1;cx<bx+w-1;cx++){
  const per=(mix.density??2.6)*scale,n=Math.floor(per)+(r()<per%1?1:0);
  for(let k=0;k<n;k++){
   const x=cx+r(),z=cz+r(),edge=roadDistance(x,z,mix.islands?{...map,plazas:[]}:map); // marsh plazas are the islands themselves
   if(edge<.25||paddy(x,z)||water(x,z,.4)||bridge(x,z))continue;
   if(map.nav.grid&&!walkableCell(map.nav.grid,x,z))continue;
   // Road shoulders keep only short sparse tufts; the open meadow gets the full mix.
   if(edge<1.4){if(r()<.35)place('grass',x,z,.7+r()*.3);continue;}
   const f=drift(x,z,1),g=drift(x,z,4),roll=r();
   if(f>mix.flowers&&roll<.5)place(['daisy','marigold','orchid'][Math.floor(drift(x,z,9)*3+3)%3],x,z,.85+r()*.35);
   else if(g>mix.ferns&&roll<.3||(water(x,z,1.6)||mix.islands&&shore(x,z))&&roll<.4)place('fern',x,z,.8+r()*.45);
   else if(roll<.12)place('clover',x,z,.8+r()*.4);
   else place(g<-.3?'tall':'grass',x,z,.8+r()*.45);
  }
 }
 const group=new THREE.Group();group.name='Living meadow';let total=0;
 for(const items of chunks.values()){
  const geometry=base.clone(),tiles=new Float32Array(items.length);items.forEach((it,i)=>tiles[i]=it.tile);
  geometry.setAttribute('aTile',new THREE.InstancedBufferAttribute(tiles,1));
  const mesh=new THREE.InstancedMesh(geometry,material,items.length);mesh.receiveShadow=true;mesh.castShadow=false;
  items.forEach((it,i)=>{mesh.setMatrixAt(i,it.matrix);mesh.setColorAt(i,it.color);});mesh.computeBoundingSphere();mesh.computeBoundingBox?.();group.add(mesh);total+=items.length;
 }
 base.dispose();scene.add(group);group.userData.count=total;
 let time=0;
 return {group,get count(){return total;},
  update(t){if(!reduced){time=Number.isFinite(t)?t:time;wind.value=time;}},
  dispose(){scene.remove(group);group.traverse(o=>{if(o.isMesh)o.geometry.dispose();});material.dispose();texture.dispose();}};
}
// Same rounding as combat-core gridCell: '.' cells are buildings, posts and other blocked ground.
function walkableCell(grid,x,z){return (grid.rows[Math.round((z-grid.z0)/grid.cell)]?.[Math.round((x-grid.x0)/grid.cell)]??'.')!=='.';}
