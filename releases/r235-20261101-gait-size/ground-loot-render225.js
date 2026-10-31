import * as THREE from 'three';
import {itemDef,ITEM_ATLAS,ATLASES,ATLAS_LAYOUTS} from './items.js';
import {contactShadowTexture} from './world-lighting159.js?v=surfaces222';

// Physical, stationary cutouts on the terrain. Repeated items share an instanced
// draw call; HTML owns only the accessible, phone-sized pickup targets.
export function createGroundLootRenderer({scene}){
 const root=new THREE.Group();root.name='Ground loot225';scene.add(root);
 const geometry=new THREE.PlaneGeometry(1,1),records=new Map(),cache=new Map(),images=new Map(),matrix=new THREE.Matrix4(),pose=new THREE.Object3D();
 const shadowTexture=contactShadowTexture(),shadowMaterial=new THREE.MeshBasicMaterial({map:shadowTexture,transparent:true,opacity:.48,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
 const shadows=new THREE.InstancedMesh(geometry,shadowMaterial,96);shadows.count=0;shadows.frustumCulled=false;root.add(shadows);
 const white=new THREE.Color(1,1,1),reserved=new THREE.Color(.62,.62,.62);
 let dirty=false,disposed=false;
 const readImage=url=>{
  if(!images.has(url))images.set(url,new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('Ground item art unavailable: '+url));image.src=url;}));
  return images.get(url);
 };
 function artSpec(id,fallback=false){
  const def=itemDef(id);if(!def)return null;
  const d=fallback&&def.ph?{...def,...def.ph}:def;
  if(d.image)return {url:d.image,columns:1,rows:1,cell:0,tint:d.tint,fallback:def.ph?()=>artSpec(id,true):null};
  if(d.monsterCard)return {url:'assets/cards147/'+id.slice(5)+'.webp',columns:1,rows:1,cell:0};
  const layout=ATLAS_LAYOUTS[d.atlas]??{columns:6,rows:4};
  return {url:ATLASES[d.atlas]??ITEM_ATLAS,...layout,cell:d.icon??0,tint:d.tint,fallback:!fallback&&def.ph?()=>artSpec(id,true):null};
 }
 async function paint(spec){
  let image;try{image=await readImage(spec.url);}catch(error){if(spec.fallback)return paint(spec.fallback());throw error;}
  const cw=image.naturalWidth/spec.columns,ch=image.naturalHeight/spec.rows,canvas=document.createElement('canvas');canvas.width=canvas.height=128;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  // Match legacy recolours, without inventory rarity halos.
  ctx.filter=({wind:'hue-rotate(95deg) saturate(1.2)',gold:'sepia(.55) saturate(1.5) hue-rotate(-10deg)',violet:'hue-rotate(215deg) saturate(1.3)'})[spec.tint]??'none';
  ctx.drawImage(image,spec.cell%spec.columns*cw,Math.floor(spec.cell/spec.columns)*ch,cw,ch,0,0,128,128);
  const pixels=ctx.getImageData(0,0,128,128).data;let x0=128,y0=128,x1=-1,y1=-1;
  for(let y=0;y<128;y++)for(let x=0;x<128;x++)if(pixels[(y*128+x)*4+3]>35){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
  if(x1<0)throw new Error('Ground item art is empty');
  x0=Math.max(0,x0-2);y0=Math.max(0,y0-2);x1=Math.min(127,x1+2);y1=Math.min(127,y1+2);
  const trimmed=document.createElement('canvas');trimmed.width=x1-x0+1;trimmed.height=y1-y0+1;
  trimmed.getContext('2d').drawImage(canvas,x0,y0,trimmed.width,trimmed.height,0,0,trimmed.width,trimmed.height);
  const texture=new THREE.CanvasTexture(trimmed);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=2;
  return {texture,ratio:trimmed.width/trimmed.height};
 }
 function acquire(id){
  const spec=artSpec(id);if(!spec)return null;
  const key=JSON.stringify([spec.url,spec.cell,spec.columns,spec.rows,spec.tint??'']);
  let resource=cache.get(key);
  if(!resource){
   resource={key,refs:0,mesh:null,texture:null};cache.set(key,resource);
   paint(spec).then(({texture,ratio})=>{
    if(disposed||resource.refs===0){texture.dispose();return;}
    resource.texture=texture;resource.ratio=ratio;
    const material=new THREE.MeshLambertMaterial({map:texture,color:'#d5cebb',emissiveMap:texture,emissive:'#ffffff',emissiveIntensity:.08,alphaTest:.16,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
    const mesh=new THREE.InstancedMesh(geometry,material,288);mesh.count=0;mesh.receiveShadow=true;mesh.frustumCulled=false;resource.mesh=mesh;root.add(mesh);dirty=true;
   }).catch(()=>{resource.failed=true;}); // Pickup remains available even if an image is unavailable.
  }
  resource.refs++;return resource;
 }
 function release(resource){
  if(!resource||--resource.refs)return;
  if(resource.mesh){root.remove(resource.mesh);resource.mesh.dispose();resource.mesh.material.dispose();}resource.texture?.dispose();cache.delete(resource.key);
 }
 function remove(id){
  const old=records.get(id);if(!old)return;
  old.parts.forEach(part=>release(part.resource));records.delete(id);dirty=true;
 }
 function set(drop,y){
  const signature=JSON.stringify([drop.items,drop.coins,drop.x,drop.z,y]);
  const previous=records.get(drop.id);
  if(previous?.signature===signature){if(previous.canPick!==drop.canPick){previous.canPick=drop.canPick;dirty=true;}return;}
  remove(drop.id);
  let hash=2166136261;for(const c of drop.id)hash=Math.imul(hash^c.charCodeAt(0),16777619);hash>>>=0;
  const items=drop.items.slice(0,3);if(!items.length&&drop.coins)items.push({id:'cowrie-pile'});
  const parts=items.map((item,i)=>({resource:acquire(item.id),i,angle:((hash>>>i*5)%100)/100*1.2-.6,size:itemDef(item.id)?.kind==='gear'?.86:.68})).filter(p=>p.resource);
  records.set(drop.id,{signature,canPick:drop.canPick,x:drop.x,z:drop.z,y,parts});dirty=true;
 }
 function flush(){
  if(!dirty||disposed)return;dirty=false;
  shadows.count=0;for(const r of cache.values())if(r.mesh)r.mesh.count=0;
  for(const drop of records.values()){
   if(shadows.count<96){
    pose.position.set(drop.x,drop.y+.043,drop.z);pose.rotation.set(-Math.PI/2,0,0);pose.scale.set(.68,.47,1);pose.updateMatrix();shadows.setMatrixAt(shadows.count++,pose.matrix);
   }
   for(const part of drop.parts){
    const r=part.resource;if(!r.mesh||r.mesh.count>=288)continue;
    const w=part.size*Math.min(1,r.ratio),h=part.size*Math.min(1,1/r.ratio),offset=(part.i-(drop.parts.length-1)/2)*.22;
    pose.position.set(drop.x+offset,drop.y+.073+part.i*.007,drop.z+part.i*.08);pose.rotation.set(-Math.PI/2,0,part.angle);pose.scale.set(w,h,1);pose.updateMatrix();
    matrix.copy(pose.matrix);r.mesh.setColorAt(r.mesh.count,drop.canPick?white:reserved);r.mesh.setMatrixAt(r.mesh.count++,matrix);
   }
  }
  shadows.instanceMatrix.needsUpdate=true;for(const r of cache.values())if(r.mesh){r.mesh.instanceMatrix.needsUpdate=true;if(r.mesh.instanceColor)r.mesh.instanceColor.needsUpdate=true;}
 }
 function dispose(){
  if(disposed)return;disposed=true;for(const id of [...records.keys()])remove(id);root.removeFromParent();geometry.dispose();shadows.dispose();shadowMaterial.dispose();shadowTexture.dispose();images.clear();
 }
 return {set,remove,flush,dispose};
}
