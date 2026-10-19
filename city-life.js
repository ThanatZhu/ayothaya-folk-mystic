import * as THREE from 'three';
import {CITIZEN_STYLES} from './city-life-data.js?v=73.1';
import {createCitizenMotion,stepCitizenMotion} from './citizen-motion.js?v=42.1';
import {groundHeight} from './combat-core.js?v=95';

// Whole painted poses, aligned at their feet. No skeletal cutouts or squash/stretch.
export function clearCourtTrees(model,map){
 if(!map.clearedCourtTrees)return;model.updateMatrixWorld(true);const point=new THREE.Vector3();
 // The old GLB batches all trunks together. Remove only triangles belonging to
 // the cleared tree; the authored map controls foliage and collision as well.
 model.traverse(o=>{if(!o.isMesh||!o.material.name.startsWith('bark19'))return;const geometry=o.geometry.clone(),position=geometry.attributes.position,index=geometry.index,count=index?.count??position.count,kept=[];
  for(let i=0;i<count;i+=3){const ids=[0,1,2].map(j=>index?index.getX(i+j):i+j);point.set(0,0,0);for(const k of ids){point.x+=position.getX(k)/3;point.y+=position.getY(k)/3;point.z+=position.getZ(k)/3;}point.applyMatrix4(o.matrixWorld);if(!map.clearedCourtTrees.some(([x,z])=>Math.hypot(point.x-x,point.z-z)<3.4))kept.push(...ids);}
  geometry.setIndex(kept);geometry.computeBoundingSphere();o.geometry=geometry;
 });
}
export async function createCityLife({scene,map,shadow,paving}){
 if(!map.masterCourt)return {citizens:[],update(){}};
 const response=await fetch('./assets/citizens40/frames.json?v=42.1');if(!response.ok)throw new Error('โหลดภาพชาวเมืองไม่ได้');
 const metadata=await response.json(),loader=new THREE.TextureLoader(),sheets={};
 await Promise.all(Object.keys(metadata).map(async id=>{const tex=await loader.loadAsync('./assets/citizens40/'+id+'.png');tex.colorSpace=THREE.SRGBColorSpace;tex.magFilter=THREE.LinearFilter;tex.minFilter=THREE.LinearMipmapLinearFilter;sheets[id]=tex;}));
 const citizens=(map.citizens??[]).map(c=>({...c,...CITIZEN_STYLES[c.style],citizen:true,x:c.route[0].x,z:c.route[0].z,talking:false}));
 const actors=[...map.npcs.filter(n=>n.mentorId),...citizens].map(n=>{
  const meta=metadata[n.sheet],rects=meta.rects.slice(n.row*meta.columns,(n.row+1)*meta.columns),maxHeight=Math.max(...rects.map(r=>r[3]));
  // Isolate each connected silhouette before filtering: atlas neighbours cannot bleed into a head/foot.
  const frames=rects.map((r,i)=>{const pad=3,c=document.createElement('canvas');c.width=r[2]+pad*2;c.height=r[3]+pad*2;
   c.getContext('2d').drawImage(sheets[n.sheet].image,...r,pad,pad,r[2],r[3]);
   const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearFilter;texture.generateMipmaps=false;
   return {texture,w:c.width,h:c.height,anchor:meta.anchors[n.row*meta.columns+i]+pad,pad};});
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:frames[0].texture,alphaTest:.5,transparent:false,depthWrite:true,color:'#fff5e7'}));scene.add(sprite);
  const walk=n.citizen?createCitizenMotion(n,Date.now()/1000+n.offset):null;if(walk){n.x=walk.pose.x;n.z=walk.pose.z;}
  n.visualHeight=n.citizen?1.85:2.1;
  return {n,frames,maxHeight,sprite,walk,shadow:shadow(n.x,-n.z,.38),frame:-1,flip:false};
 });
 // v2 scenes model their own sparring court; the painted floor only dresses the legacy capital.
 if(!map.scene){const pavingTexture=paving.clone();pavingTexture.repeat.set(9,10);pavingTexture.needsUpdate=true;
 const floor=new THREE.Mesh(new THREE.BoxGeometry(18,.06,23),new THREE.MeshLambertMaterial({map:pavingTexture,color:'#cfbb91'}));floor.position.set(38,.026,-70);floor.receiveShadow=true;scene.add(floor);
 const edgeMat=new THREE.MeshLambertMaterial({color:'#a88c59'});for(const [x,z,w,d] of [[29,-70,.2,23],[47,-70,.2,23],[38,-81.5,18,.2],[38,-58.5,18,.2]]){const edge=new THREE.Mesh(new THREE.BoxGeometry(w,.03,d),edgeMat);edge.position.set(x,.05,z);scene.add(edge);}
 const seal=new THREE.Mesh(new THREE.RingGeometry(2.7,2.76,64),new THREE.MeshBasicMaterial({color:'#b59255',transparent:true,opacity:.55,depthWrite:false,side:THREE.DoubleSide}));seal.rotation.x=-Math.PI/2;seal.position.set(38,.061,-70);scene.add(seal);}
 const banners=[];
 for(const n of map.npcs.filter(n=>n.mentorId)){
  const ring=new THREE.Mesh(new THREE.RingGeometry(.66,.73,32),new THREE.MeshBasicMaterial({color:n.color,transparent:true,opacity:.65,depthWrite:false,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.set(n.x,.09,n.z);scene.add(ring);
  const side=n.x<map.masterCourt.x?-1:1,x=n.x+side*1.2,z=n.z-.7;
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(.035,.05,2.5,8),new THREE.MeshLambertMaterial({color:'#785330'}));pole.position.set(x,1.25,z);scene.add(pole);
  const flag=new THREE.Mesh(new THREE.PlaneGeometry(.55,1.05,4,5),new THREE.MeshLambertMaterial({color:n.color,side:THREE.DoubleSide}));flag.position.set(x+side*.28,1.8,z);scene.add(flag);banners.push(flag);
 }
 const sign=document.createElement('canvas');sign.width=768;sign.height=144;const ctx=sign.getContext('2d');ctx.fillStyle='#163a2eea';ctx.strokeStyle='#d5b472';ctx.lineWidth=7;ctx.beginPath();ctx.roundRect(5,5,758,134,22);ctx.fill();ctx.stroke();ctx.fillStyle='#ffe5ab';ctx.textAlign='center';ctx.font='bold 52px Mali,Tahoma';ctx.fillText('ลานครูแห่งอโยธยา',384,67);ctx.font='26px Mali,Tahoma';ctx.fillText('เปลี่ยนอาชีพเมื่อ Job ตัน  ·  Job 10 → อาชีพ  ·  Job 40 → Master',384,110);
 const signTexture=new THREE.CanvasTexture(sign);signTexture.colorSpace=THREE.SRGBColorSpace;const plaque=new THREE.Sprite(new THREE.SpriteMaterial({map:signTexture,transparent:true,depthWrite:false,toneMapped:false,fog:false}));plaque.position.set(map.masterCourt.x,2.8,map.masterCourt.z-(map.scene?12.5:10));plaque.scale.set(6,1.125,1);scene.add(plaque);
 if(map.scene)addCourtProps(scene,map);
 function update(dt,player,camera){
  const time=Date.now()/1000;
  for(const a of actors){const n=a.n;let frame=0,flip=false;
   if(n.citizen){const e=camera.matrixWorld.elements,pose=stepCitizenMotion(a.walk,n,dt,{rightX:e[0],rightZ:e[2],viewX:e[8],viewZ:e[10]});n.x=pose.x;n.z=pose.z;frame=pose.frame;flip=pose.flip;
   }else {const cycle=(time+n.row*1.7)%18;frame=n.talking?2:cycle>15?3:cycle<.45?1:0;}
   const f=a.frames[frame];if(frame!==a.frame||flip!==a.flip){const tex=f.texture;tex.repeat.x=flip?-1:1;tex.offset.x=flip?1:0;a.sprite.material.map=tex;
    const scale=n.visualHeight/a.maxHeight;a.sprite.scale.set(f.w*scale,f.h*scale,1);
    a.sprite.center.set(flip?1-f.anchor/f.w:f.anchor/f.w,f.pad/f.h);a.frame=frame;a.flip=flip;}

   // 0.79 stand on the walk grid's height like the hero, so feet stay on bridge decks and raised floors.
   const y=groundHeight(map.nav,n.x,n.z);a.sprite.position.set(n.x,y+.07,n.z);a.shadow.position.set(n.x,y+.073,n.z);a.sprite.visible=a.shadow.visible=Math.hypot(player.x-n.x,player.z-n.z)<60;
  }
  banners.forEach((flag,i)=>{const p=flag.geometry.attributes.position;for(let j=0;j<p.count;j++)p.setZ(j,Math.sin(time*1.8+p.getY(j)*3+i)*.06*(.55-p.getY(j)));p.needsUpdate=true;});
 }
 return {citizens,update};
}

// 0.82 dress the bare sand of the teachers' court: weapon racks and a drum along the north edge, clay jars in the
// corners by the teachers, straw bales at the south corners. Small and at the rim, so the sparring ground stays open.
function addCourtProps(scene,map){
 const c=map.masterCourt,wood=new THREE.MeshLambertMaterial({color:'#7a5230'}),dark=new THREE.MeshLambertMaterial({color:'#4f3520'}),steel=new THREE.MeshLambertMaterial({color:'#cfc8b4'});
 const clay=new THREE.MeshLambertMaterial({color:'#b5653a'}),clayDark=new THREE.MeshLambertMaterial({color:'#8c4a2a'}),straw=new THREE.MeshLambertMaterial({color:'#d8b85a'}),hide=new THREE.MeshLambertMaterial({color:'#e8d6b0'});
 const at=(o,x,z,ry=0)=>{o.position.set(c.x+x,groundHeight(map.nav,c.x+x,c.z+z),c.z+z);o.rotation.y=ry;o.traverse(m=>{if(m.isMesh){m.castShadow=true;m.receiveShadow=true;}});scene.add(o);return o;};
 const box=(w,h,d,mat,x,y,z)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);return m;};
 function rack(){const g=new THREE.Group();for(const x of [-.75,.75])g.add(box(.1,1.25,.1,wood,x,.62,0));g.add(box(1.7,.08,.1,dark,0,1.05,0),box(1.7,.08,.1,dark,0,.35,0));
  for(let i=0;i<4;i++){const x=-.55+i*.37,shaft=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,1.6,6),wood);shaft.position.set(x,.8,.08);shaft.rotation.z=.08;const tip=new THREE.Mesh(new THREE.ConeGeometry(.05,.22,6),steel);tip.position.set(x-.065,1.7,.08);tip.rotation.z=.08;g.add(shaft,tip);}return g;}
 const jarShape=[[0,0],[.16,0],[.24,.12],[.27,.3],[.22,.48],[.12,.56],[.13,.62],[0,.62]].map(([x,y])=>new THREE.Vector2(x,y)),jarGeo=new THREE.LatheGeometry(jarShape,14);
 function jars(){const g=new THREE.Group();[[0,0,1.25,clay],[.5,.15,.9,clayDark],[.15,.55,.75,clay]].forEach(([x,z,s,m])=>{const j=new THREE.Mesh(jarGeo,m);j.position.set(x,0,z);j.scale.setScalar(s);g.add(j);});return g;}
 function bales(){const g=new THREE.Group();[[0,.32,0,0],[.75,.32,.1,.2],[.38,.92,.05,.1]].forEach(([x,y,z,r])=>{const b=new THREE.Mesh(new THREE.CylinderGeometry(.32,.32,.7,12),straw);b.rotation.set(0,r,Math.PI/2);b.position.set(x,y,z);g.add(b);for(const k of [-.2,.2]){const band=new THREE.Mesh(new THREE.TorusGeometry(.325,.02,4,16),dark);band.rotation.set(0,Math.PI/2+r,0);band.position.set(x+k*Math.cos(r),y,z-k*Math.sin(r));g.add(band);}});return g;}
 function drum(){const g=new THREE.Group(),body=new THREE.Mesh(new THREE.CylinderGeometry(.38,.38,.75,16),new THREE.MeshLambertMaterial({color:'#8e2f22'}));body.rotation.z=Math.PI/2;body.position.y=.7;g.add(body);
  for(const x of [-.39,.39]){const head=new THREE.Mesh(new THREE.CircleGeometry(.36,16),hide);head.position.set(x,.7,0);head.rotation.y=x<0?-Math.PI/2:Math.PI/2;g.add(head);}
  for(const x of [-.25,.25]){g.add(box(.06,.55,.06,wood,x,.27,.2),box(.06,.55,.06,wood,x,.27,-.2));}return g;}
 at(rack(),-6,-10.6);at(rack(),6,-10.6);at(drum(),0,-10.2);
 at(jars(),-11.5,-10.8,.4);at(jars(),11,-10.8,-.6);
 at(bales(),-9.5,11.8,.3);at(bales(),9,11.8,-.2);
}
