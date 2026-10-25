import * as THREE from '../../vendor/build/three.module.js';
import {atlasUv} from './timing.js';
import {PAINTED_SHEETS} from './library-profiles.js';
const clamp=x=>Math.max(0,Math.min(1,x));
const lerp=(a,b,t)=>a+(b-a)*t;
const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};

// A small lazy atlas cache. All eight UV frames share their source image on the GPU.
export function createSkillLibraryRenderer(scene){
 const cache=new Map(),loader=new THREE.TextureLoader(),slots=[],plane=new THREE.PlaneGeometry(1,1);let coordinateMap=null;let generation=0,needed=new Set(),current=null,disposed=false,tick=0,visibleCount=0,cacheLimit=6;
 const sources=key=>{let item=cache.get(key);if(item)return item.promise;item={key,used:++tick,frames:null,base:null,promise:null};cache.set(key,item);
  item.promise=loader.loadAsync(PAINTED_SHEETS[key]).then(base=>{if(disposed){base.dispose();return null;}if(cacheLimit===4&&base.image.width>1024){const canvas=document.createElement('canvas');canvas.width=Math.round(base.image.width/2);canvas.height=Math.round(base.image.height/2);canvas.getContext('2d').drawImage(base.image,0,0,canvas.width,canvas.height);base.image=canvas;base.needsUpdate=true;}base.colorSpace=THREE.SRGBColorSpace;base.minFilter=base.magFilter=THREE.LinearFilter;base.generateMipmaps=false;item.base=base;item.frames=Array.from({length:8},(_,i)=>{const texture=base.clone(),uv=atlasUv(i);texture.offset.set(uv.x,uv.y);texture.repeat.set(uv.w,uv.h);texture.needsUpdate=true;return texture;});trim();return item;}).catch(error=>{cache.delete(key);throw new Error('Cannot load painted atlas '+key+': '+error.message);});return item.promise;
 };
 function release(item){item.frames?.forEach(t=>t.dispose());item.base?.dispose();cache.delete(item.key);}
 function trim(){const candidates=[...cache.values()].filter(item=>item.frames&&!needed.has(item.key)).sort((a,b)=>a.used-b.used);while(cache.size>Math.max(cacheLimit,needed.size)&&candidates.length)release(candidates.shift());}
 function slot(index){if(slots[index])return slots[index];const spriteMaterial=new THREE.SpriteMaterial({transparent:true,depthWrite:false,depthTest:true}),groundMaterial=new THREE.MeshBasicMaterial({transparent:true,depthWrite:false,depthTest:true,side:THREE.DoubleSide}),sprite=new THREE.Sprite(spriteMaterial),ground=new THREE.Mesh(plane,groundMaterial);sprite.visible=ground.visible=false;ground.rotation.x=-Math.PI/2;scene.add(sprite,ground);return slots[index]={sprite,ground,spriteMaterial,groundMaterial};}
 function hide(clearMaps=false){visibleCount=0;for(const s of slots){s.sprite.visible=s.ground.visible=false;if(clearMaps){s.spriteMaterial.map=s.groundMaterial.map=null;s.spriteMaterial.needsUpdate=s.groundMaterial.needsUpdate=true;}}}
 const projectA=new THREE.Vector3(),projectB=new THREE.Vector3();
 function angle(from,to,camera){if(coordinateMap){from=coordinateMap.point(from);to=coordinateMap.point(to);}projectA.set(from.x,from.y,from.z).project(camera);projectB.set(to.x,to.y,to.z).project(camera);return Math.atan2(projectB.y-projectA.y,projectB.x-projectA.x);}
 function draw(key,frame,position,scale,opacity,rotation=0,{ground=false,base=false,pet=false,color='#ffffff',additive=false,origin=null}={}){
  if(opacity<.005||visibleCount>=64)return;const atlas=cache.get(key);if(!atlas?.frames)throw new Error('Unprepared atlas '+key);const s=slot(visibleCount++),object=ground?s.ground:s.sprite,mat=ground?s.groundMaterial:s.spriteMaterial;
  const texture=atlas.frames[Math.max(0,Math.min(7,Math.floor(frame)))];if(!mat.map){mat.map=texture;mat.needsUpdate=true;}else mat.map=texture;
  mat.opacity=opacity;mat.color.set(color);mat.blending=additive?THREE.AdditiveBlending:THREE.NormalBlending;object.visible=true;if(coordinateMap)position=coordinateMap.point(position,origin);object.position.set(position.x,position.y,position.z);object.scale.setScalar(scale);
  if(ground){object.rotation.set(-Math.PI/2,0,rotation-(coordinateMap?.yaw??0));}else{s.sprite.center.set(.5,pet?.17:base?.12:.5);mat.rotation=rotation;}
 }
 function anchor(name,s){if(name==='hero')return {x:s.heroX,y:s.heroY??0,z:s.heroZ??0};if(name==='pet')return {x:-.9,y:0,z:-.55};return {x:s.targetX,y:0,z:0};}
 function sampleLayer(layer,s,camera,quality,reduced){
  const local=s.time-layer.start;if(local<0||local>layer.span)return;const q=clamp(local/layer.span),tail=1-smooth((q-.78)/.22),alpha=layer.opacity*smooth(q/.12)*tail;let frame=(layer.frameFrom??0)+(7-(layer.frameFrom??0))*q;
  if(layer.mode==='hold')frame=q<.25?q/.25*3:q<.7?3:4+(q-.7)/.3*3;
  const center=anchor(layer.anchor,s),n=Math.min(layer.count,quality==='low'?4:12),mid=(n-1)/2;
  for(let i=0;i<n;i++){
   const delay=layer.stagger!==undefined?layer.stagger*i:layer.mode==='rain'?(i%(layer.waves??3))*(layer.interval??.3):0,age=local-delay;if(age<0)continue;const p=clamp(age/Math.max(.01,layer.span-delay));let pos={x:center.x+layer.x,y:center.y+layer.y,z:center.z+layer.z},rotation=layer.rotation,opacity=alpha,size=layer.scale,currentFrame=frame,base=layer.base,ground=layer.ground,pet=false,origin=center;
   if(['travel','fan','rain'].includes(layer.mode)){
    origin=null;
    let from={x:s.heroX,y:1.05+s.heroY,z:s.heroZ??0},to={x:s.targetX+layer.x,y:1,z:(i-mid)*(layer.spread??.7)/Math.max(1,mid*2)+layer.z};
    if(layer.reverse)[from,to]=[to,from];
    if(layer.reflect){from={x:s.targetX,y:1,z:0};to={x:3.7,y:1,z:0};}
    const arrival=(layer.arrival??layer.start+.45)+delay,flight=clamp((s.time-layer.start-delay)/Math.max(.1,arrival-layer.start-delay));
    if(layer.mode==='rain'){to={x:s.targetX+Math.sin(i*2.4)*(layer.spread??2)*.6,y:.15,z:Math.cos(i*2.4)*(layer.spread??2)*.5};from={x:to.x-.5,y:4.5,z:to.z-.8};}
    pos={x:lerp(from.x,to.x,flight),y:lerp(from.y,to.y,flight),z:lerp(from.z,to.z,flight)};origin={x:layer.mode==='rain'?s.targetX:lerp(layer.reverse?s.targetX:s.heroX,layer.reflect?3.7:layer.reverse?s.heroX:s.targetX,flight),z:0};rotation+=angle(from,to,camera);currentFrame=flight<1?(flight<.4?1:3):4+clamp((s.time-arrival)/.45)*3;opacity*=1-smooth((s.time-arrival-.15)/.55);
   }else if(layer.mode==='link'){
    origin=null;
    let from={x:s.heroX,y:1+s.heroY,z:s.heroZ??0},to={x:s.targetX,y:1,z:0};if(layer.reverse)[from,to]=[to,from];const fraction=(i+.5)/n;pos={x:lerp(from.x,to.x,fraction),y:lerp(from.y,to.y,fraction)+Math.sin(fraction*Math.PI)*.18,z:lerp(from.z,to.z,fraction)};rotation+=angle(from,to,camera);currentFrame=1+((q*3+i*.3)%1)*3;opacity*=.7;
   }else if(['orbit','dome','planted'].includes(layer.mode)){
    const a=i*Math.PI*2/n+(reduced?0:q*.65),radius=layer.radius??1.3;pos.x+=Math.cos(a)*radius;pos.z+=Math.sin(a)*radius;
    if(layer.mode==='dome'){pos.y=.65+Math.max(0,Math.sin(a))*.25;opacity*=.6;size*=.83;currentFrame=q<.65?Math.min(3,q*7):4+(q-.65)/.35*3;}
    if(layer.mode==='planted'){pos.y=.9;rotation+=Math.PI/2;currentFrame=q<.7?3:5+(q-.7)/.3*2;}
   }else if(layer.mode==='wall'){
    pos.z+=(i-mid)*(layer.spacing??.8);pos.y=layer.base?.02:1;currentFrame=q<.7?Math.min(3,q*8):4+(q-.7)/.3*3;
   }else if(layer.mode==='clones'){
    pos.x+=(i-mid)*(layer.spread??1.7);pos.z-=.6;opacity*=.55;rotation+=(i-mid)*.12;
   }else if(layer.mode==='sweep'){rotation+=(q-.4)*.6;size*=.8+smooth(q/.35)*.2;}
   if(layer.mode==='pet'){
    const action=layer.petAction??'dash',st=s.time-delay;
    if(action==='dash'){origin=null;const flight=smooth((st-.43)/.52);pos={x:-1.1+1.85*flight,y:reduced?0:Math.sin(clamp((st-.43)/1.15)*Math.PI)*.42,z:(i-mid)*(layer.spread??0)-.08};currentFrame=st<.47?0:st<.63?1:st<.8?2:st<.94?3:st<1.12?4:st<1.37?5:st<1.6?6:7;opacity=layer.opacity*(1-smooth((q-.88)/.12));}
    else{pos={x:action==='crow'?-.65:-.9,y:0,z:-.5};currentFrame=action==='crow'?Math.min(7,q*8):q<.3?Math.min(6,Math.floor(q/.3*7)):7;opacity=layer.opacity*smooth(q/.15)*tail;}
    pet=true;base=false;rotation=0;
   }
   draw(layer.sheet,currentFrame,pos,size,opacity,rotation,{ground,base,pet,color:layer.color,additive:layer.additive,origin});
  }
 }
 const api={
  async prepare(profile,{quality='high'}={}){
   if(disposed)throw new Error('Painted library renderer disposed');const token=++generation;hide(true);current=null;needed=new Set(profile.layers.map(l=>l.sheet));if(profile.approved==='rooster')needed.add('sword');cacheLimit=quality==='low'?4:6;
   const items=await Promise.all([...needed].map(sources));if(token!==generation||disposed)return false;items.forEach(item=>{if(item)item.used=++tick;});current=profile;trim();return true;
  },
  sample(s,camera,{quality='high',reduced=false,hidden=false,space=null}={}){
   coordinateMap=space;hide();if(disposed||hidden||!current||s.profile.id!==current.id)return;
   if(s.approved==='sword'){draw('sword',s.fxFrame,{x:1.35,y:1.1,z:.08},s.fxSize,s.fxOpacity,0,{origin:anchor('target',s)});draw('sword',s.fxFrame,{x:1.35,y:1.1,z:.075},s.fxSize*1.045,s.fxOpacity*.12,0,{additive:true,origin:anchor('target',s)});return;}
   if(s.approved==='rooster'){draw('rooster',s.roosterFrame,{x:s.roosterX,y:s.roosterY,z:-.08},1.72,s.roosterOpacity,0,{pet:true});const alpha=Math.max(0,1-Math.abs(s.time-1.02)/.19);draw('sword',7,{x:1.64,y:1,z:.1},.9,alpha);return;}
   if(s.approved==='lotus'){draw('lotus',s.fxFrame,{x:1.55,y:.025,z:-.42},s.fxSize,s.fxOpacity,0,{base:true,origin:anchor('target',s)});return;}
   for(const layer of current.layers)sampleLayer(layer,s,camera,quality,reduced);
  },
  clear(){hide(true);current=null;},
  dispose(){if(disposed)return;disposed=true;generation++;hide(true);for(const s of slots){scene.remove(s.sprite,s.ground);s.spriteMaterial.dispose();s.groundMaterial.dispose();}plane.dispose();for(const item of [...cache.values()])release(item);},
  get metrics(){return {cachedAtlases:cache.size,loadedAtlases:[...cache.values()].filter(a=>a.frames).length,visibleLayers:visibleCount,allocatedSlots:slots.length,cacheLimit};}
 };return api;
}
