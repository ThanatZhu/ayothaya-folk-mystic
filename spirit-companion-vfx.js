import * as THREE from './vendor/build/three.module.js';
import {groundHeight} from './combat-core.js?v=surfaces222';

const clamp=v=>Math.max(0,Math.min(1,v)),smooth=v=>{v=clamp(v);return v*v*(3-2*v);},mix=(a,b,t)=>a+(b-a)*t;
const jade='#72ffe2',gold='#e7c47a';
// Online effects share the buffered event clock, even when prediction time drifts.
export function spiritPresentationTime(now,event,stamp='launchAt'){
 if(event.actor&&Number.isFinite(event.at))return now-Math.max(0,event.lag??0)+(Number.isFinite(event[stamp])?event[stamp]-event.at:0);
 return event[stamp]??now;
}
// Shared character atlas and bounded presentation pools; damage remains server-owned.
export function createSpiritCompanionVfx(scene,world,{camera=null,unit=1,actorLayer=0}={}){
 const group=new THREE.Group();group.name='spirit-companions';scene.add(group);
 const pets=new Map(),shots=new Map(),origins=new Map(),attackStarts=new Map(),impactPool=[],frames=[],fxFrames=[];
 let disposed=false,loaded=false,error=null,base=null,fxBase=null,shotCount=0,hitCount=0;
 const compact=matchMedia('(pointer:coarse),(max-width:900px)').matches,limit=compact?8:16,ring=new THREE.RingGeometry(.93,1,64);
 function near(point){return point&&Math.hypot(point.x-world.player.x,point.z-world.player.z)<35;}
 const glowCanvas=document.createElement('canvas');glowCanvas.width=glowCanvas.height=128;
 const ctx=glowCanvas.getContext('2d'),gradient=ctx.createRadialGradient(64,64,0,64,64,64);
 gradient.addColorStop(0,'rgba(255,255,255,1)');gradient.addColorStop(.14,'rgba(255,255,255,.92)');gradient.addColorStop(.36,'rgba(255,255,255,.36)');gradient.addColorStop(.7,'rgba(255,255,255,.05)');gradient.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
 const glowTexture=new THREE.CanvasTexture(glowCanvas);glowTexture.colorSpace=THREE.SRGBColorSpace;
 const characterReady=new Promise((resolve,reject)=>new THREE.TextureLoader().load('./assets/spirit-companion182/spirit-human-v2.png',texture=>{
  if(disposed){texture.dispose();resolve();return;}base=texture;base.colorSpace=THREE.SRGBColorSpace;base.generateMipmaps=false;base.minFilter=base.magFilter=THREE.LinearFilter;
  for(let i=0;i<16;i++){const t=base.clone(),inset=.0015;t.repeat.set(.25-inset*2,.25-inset*2);t.offset.set((i%4)/4+inset,1-(Math.floor(i/4)+1)/4+inset);t.needsUpdate=true;frames.push(t);}loaded=true;resolve();
 },undefined,e=>{error='โหลดภาพพรายไม่สำเร็จ';reject(e);}));
 const effectsReady=new Promise((resolve,reject)=>new THREE.TextureLoader().load('./assets/spirit-companion182/spirit-shot-v3.png',texture=>{
  if(disposed){texture.dispose();resolve();return;}fxBase=texture;texture.colorSpace=THREE.SRGBColorSpace;texture.generateMipmaps=false;texture.minFilter=texture.magFilter=THREE.LinearFilter;
  for(let i=0;i<8;i++){const t=texture.clone(),inset=.002;t.repeat.set(.25-inset*2,.5-inset*2);t.offset.set((i%4)/4+inset,1-(Math.floor(i/4)+1)/2+inset);t.needsUpdate=true;fxFrames.push(t);}resolve();
 },undefined,e=>{error='โหลดภาพพลังพรายไม่สำเร็จ';reject(e);}));
 const ready=Promise.all([characterReady,effectsReady]);
 function softenCell(material){
  material.userData.cellOffset={value:new THREE.Vector2()};material.userData.cellScale={value:new THREE.Vector2(1,1)};
  material.onBeforeCompile=shader=>{shader.uniforms.cellOffset=material.userData.cellOffset;shader.uniforms.cellScale=material.userData.cellScale;shader.fragmentShader='uniform vec2 cellOffset;uniform vec2 cellScale;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\n#ifdef USE_MAP\nvec2 tileUV=(vMapUv-cellOffset)/cellScale;vec2 edge=smoothstep(vec2(0.),vec2(.12),tileUV)*smoothstep(vec2(0.),vec2(.12),1.-tileUV);diffuseColor.a*=edge.x*edge.y;\n#endif');};
  material.customProgramCacheKey=()=> 'spirit-painted-soft-edge184';return material;
 }
 function painted(parent,index,size=1){
  const material=softenCell(new THREE.SpriteMaterial({transparent:true,depthWrite:false,alphaTest:.01})),s=new THREE.Sprite(material);s.layers.set(actorLayer);s.scale.setScalar(size);s.visible=false;parent.add(s);setPaint(s,index);return s;
 }
 function setPaint(s,index){if(!fxFrames[index])return;s.visible=true;if(s.userData.frame===index)return;s.userData.frame=index;s.material.map=fxFrames[index];s.material.userData.cellOffset.value.copy(fxFrames[index].offset);s.material.userData.cellScale.value.copy(fxFrames[index].repeat);s.material.needsUpdate=true;}
 function makeThread(parent){
  const n=16,geometry=new THREE.BufferGeometry(),positions=new Float32Array((n+1)*6),uv=new Float32Array((n+1)*4),indices=[];
  for(let i=0;i<=n;i++){uv.set([i/n,0,i/n,1],i*4);if(i<n){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}}
  geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));geometry.setIndex(indices);
  const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,uniforms:{opacity:{value:0}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 vUv;uniform float opacity;void main(){float edge=pow(max(0.,1.-abs(vUv.y*2.-1.)),1.6);float fade=smoothstep(0.,.08,vUv.x);vec3 color=mix(vec3(.1,.72,.57),vec3(.75,1.,.89),edge);gl_FragColor=vec4(color,edge*fade*opacity);}' });
  const mesh=new THREE.Mesh(geometry,material);mesh.layers.set(actorLayer);mesh.frustumCulled=false;parent.add(mesh);return {mesh,positions,n};
 }
 function sprite(parent,color,size=1,opacity=1){const material=new THREE.SpriteMaterial({map:glowTexture,color,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,opacity}),s=new THREE.Sprite(material);s.layers.set(actorLayer);s.scale.setScalar(size);parent.add(s);return s;}
 function floorRing(parent,color=jade){const material=new THREE.MeshBasicMaterial({color,transparent:true,depthWrite:false,side:THREE.DoubleSide,opacity:0,blending:THREE.AdditiveBlending}),s=new THREE.Mesh(ring,material);s.rotation.x=-Math.PI/2;parent.add(s);return s;}
 function floorGlow(parent,color=jade){const material=new THREE.MeshBasicMaterial({map:glowTexture,color,transparent:true,depthWrite:false,side:THREE.DoubleSide,opacity:0,blending:THREE.AdditiveBlending}),s=new THREE.Mesh(new THREE.PlaneGeometry(2,2),material);s.rotation.x=-Math.PI/2;parent.add(s);return s;}
 function makePet(id,pet){
  const g=new THREE.Group();g.scale.setScalar(unit);group.add(g);const material=softenCell(new THREE.SpriteMaterial({transparent:true,depthWrite:false,alphaTest:.025})),body=new THREE.Sprite(material);body.layers.set(actorLayer);body.center.set(.5,.12);g.add(body);
  const palm=painted(g,0,.75),glow=sprite(g,jade,1.4,.13),summon=new THREE.Group();g.add(summon);const outer=floorRing(summon,gold),inner=floorRing(summon,jade),wash=floorGlow(summon);
  const marks=new THREE.Group();summon.add(marks);
  for(let i=0;i<12;i++){const theta=i*Math.PI/6,shape=new THREE.Shape();shape.moveTo(0,.12);shape.quadraticCurveTo(.08,0,0,-.12);shape.quadraticCurveTo(-.08,0,0,.12);const leaf=new THREE.Mesh(new THREE.ShapeGeometry(shape),new THREE.MeshBasicMaterial({color:i%2?jade:gold,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending}));leaf.rotation.x=-Math.PI/2;leaf.rotation.z=-theta;leaf.position.set(Math.sin(theta)*.76,.025,Math.cos(theta)*.76);marks.add(leaf);}
  const motes=Array.from({length:compact?4:8},(_,i)=>{const s=sprite(g,i%3?jade:gold,.09,.25);return {s,phase:i*Math.PI*.25};});
  const result={id,g,body,palm,glow,summon,outer,inner,wash,marks,motes,born:origins.get(id)?.born??(Number.isFinite(pet.maxLeft)?world.time-Math.max(0,pet.maxLeft-pet.left):pet.spawnedAt??world.time),origin:origins.get(id)??{x:pet.x,z:pet.z},vanish:null,last:pet,frame:-1};origins.delete(id);pets.set(id,result);return result;
 }
 function frame(p,i){if(p.frame===i||!frames[i])return;p.body.material.map=frames[i];p.body.material.userData.cellOffset.value.copy(frames[i].offset);p.body.material.userData.cellScale.value.copy(frames[i].repeat);p.body.material.needsUpdate=p.frame<0;p.frame=i;}
 function disposePet(p){group.remove(p.g);p.g.traverse(o=>{if(o.material)o.material.dispose();if(o.geometry&&o.geometry!==ring&&!o.isSprite)o.geometry.dispose();});pets.delete(p.id);attackStarts.delete(p.id);}
 function addShot(e){
  const id=e.shotId??`${e.petId}:${e.launchAt??world.time}`;if(shots.has(id)||(!near(e.from)&&!near(e.to)))return;
  if(shots.size>=limit)removeShot(shots.values().next().value);
  const g=new THREE.Group();group.add(g);const core=sprite(g,'#eafffb',.27*unit,1),aura=sprite(g,jade,1.05*unit,.6),tail=Array.from({length:compact?8:14},(_,i)=>sprite(g,i%4===0?'#ddfff3':jade,.13*unit,.4));
  const from=e.from??{x:e.x,z:e.z},to=e.to??from,body=painted(g,2),charge=painted(g,0),thread=makeThread(g);
  const s={id,g,core,aura,tail,body,charge,thread,from:{...from},to:{...to},start:spiritPresentationTime(world.time,e),duration:e.duration??.3,petId:e.petId};shots.set(id,s);attackStarts.set(e.petId,s.start);while(attackStarts.size>limit*2)attackStarts.delete(attackStarts.keys().next().value);shotCount++;
 }
 function shotPoint(s,t,out){const a=s.from,b=s.to,q=clamp(t),dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz)||1,curve=Math.sin(q*Math.PI)*.48;
  out.set(mix(a.x,b.x,q)-dz/length*curve*unit,mix(groundHeight(world.nav,a.x,a.z)+1.7*unit,groundHeight(world.nav,b.x,b.z)+.8*unit,q)+Math.sin(q*Math.PI)*1.5*unit,mix(a.z,b.z,q)+dx/length*curve*unit);return out;
 }
 function removeShot(s){group.remove(s.g);s.g.traverse(o=>{if(o.material)o.material.dispose();if(o.geometry&&!o.isSprite)o.geometry.dispose();});shots.delete(s.id);}
 function impact(e){if(e.hit===false||!near(e.to??e))return;let p=impactPool.find(p=>!p.active);if(!p&&impactPool.length>=limit)p=impactPool.reduce((a,b)=>a.start<b.start?a:b);if(!p){const g=new THREE.Group();g.scale.setScalar(unit);group.add(g);p={g,seal:painted(g,4),ring:floorRing(g,jade),goldRing:floorRing(g,gold),glow:sprite(g,jade,1,1),sparks:Array.from({length:9},(_,i)=>sprite(g,i%3?jade:gold,.12,.9)),active:false};impactPool.push(p);}p.active=true;p.start=e.actor?world.time-Math.max(0,e.lag??0):world.time;p.g.visible=true;p.g.position.set(e.x??e.to?.x??0,groundHeight(world.nav,e.x??e.to?.x??0,e.z??e.to?.z??0)+.06,e.z??e.to?.z??0);hitCount++;}
 const v=new THREE.Vector3(),ahead=new THREE.Vector3(),behind=new THREE.Vector3();
 function update(dt=0){
  if(disposed)return;const time=world.time,all=world.rolePetsView??world.roleCombat?.state.pets??[],seen=new Set();
  for(const pet of all.filter(p=>p.kind==='spirit'&&p.left>0&&near(p)).slice(0,limit)){if(pet.kind!=='spirit'||pet.left<=0)continue;const id=pet.id??`${pet.owner??'self'}:spirit`;seen.add(id);const p=pets.get(id)??makePet(id,pet);p.last=pet;p.vanish=null;p.body.visible=loaded;const age=time-p.born,attackAge=time-(attackStarts.get(id)??(world.networkSelfId?-99:pet.attackAt??-99)),fly=Math.sin(time*2.4+p.born)*.055;
   p.g.position.set(pet.x,groundHeight(world.nav,pet.x,pet.z),pet.z);p.body.position.set(0,.95+fly,0);
   const face=pet.face??{x:1,z:0},flipped=camera?(face.x*camera.matrixWorld.elements[0]+face.z*camera.matrixWorld.elements[2]<0):face.x<-.1;
   const master=pet.tier==='master',scale=master?1.9:1.65,appear=smooth(age/.55);p.body.scale.set(scale*(flipped?-1:1),scale*(.84+.16*appear),1);p.body.material.opacity=appear;
   const precharge=pet.targetId!=null&&pet.tick>0&&pet.tick<.22&&age>.2,chargeProgress=precharge?1-pet.tick/.22:0;
   const index=attackAge>=0&&attackAge<.4?(attackAge<.04?8:attackAge<.09?9:attackAge<.3?10:11):precharge?(chargeProgress<.5?8:9):age<.68?4+Math.min(3,Math.floor(age/.17)):Math.floor(time*5)%4;frame(p,index);
   setPaint(p.palm,0);p.palm.visible=precharge;p.palm.position.set((flipped?-.27:.27)*(camera?camera.matrixWorld.elements[0]:1),1.7+fly,(flipped?-.27:.27)*(camera?camera.matrixWorld.elements[2]:0));p.palm.scale.setScalar(.35+chargeProgress*.5);p.palm.material.opacity=.25+chargeProgress*.6;
   p.glow.position.set(0,1.4+fly,0);p.glow.material.opacity=appear*(.11*(1+.15*Math.sin(time*3))+(attackAge>=0&&attackAge<.3?.42*Math.sin(attackAge/.3*Math.PI):0));
   const summonFade=age<1.15?Math.sin(clamp(age/1.15)*Math.PI):0;p.summon.visible=summonFade>0;p.summon.position.set((p.origin.x-pet.x)/unit,.005,(p.origin.z-pet.z)/unit);p.outer.position.y=.025;p.inner.position.y=.03;p.wash.position.y=.02;p.outer.scale.setScalar(.4+smooth(age/.75)*.65);p.inner.scale.setScalar(.28+smooth(age/.75)*.43);p.outer.material.opacity=summonFade*.72;p.inner.material.opacity=summonFade*.6;p.wash.material.opacity=summonFade*.25;p.marks.rotation.y=time*.8;p.marks.children.forEach(m=>m.material.opacity=summonFade*.75);
   for(const {s,phase} of p.motes){const q=(time*.3+phase/(Math.PI*2))%1;s.position.set(Math.cos(phase+time*.35)*(.26+q*.13),.4+q*1.2+fly,Math.sin(phase+time*.35)*.22);s.material.opacity=Math.sin(q*Math.PI)*1.58*appear;}
  }
  for(const p of pets.values())if(!seen.has(p.id)){p.vanish??=time;const t=(time-p.vanish)/.48;if(t>=1){disposePet(p);continue;}frame(p,12+Math.min(3,Math.floor(t*4)));p.body.material.opacity=1-smooth(t);p.glow.material.opacity=(1-t)*.1;p.summon.visible=false;p.palm.visible=false;p.motes.forEach(({s})=>s.material.opacity*=Math.max(0,1-dt*8));}
  for(const s of shots.values()){
   const age=time-s.start,t=(age-.09)/Math.max(.08,s.duration-.09);if(age>s.duration+.08){removeShot(s);continue;}
   const chargeFade=1-smooth(age/.15);shotPoint(s,0,v);s.charge.position.copy(v);setPaint(s.charge,0);s.charge.visible=age<.16;s.charge.scale.setScalar((.55+Math.sin(clamp(age/.15)*Math.PI)*.45)*unit);s.charge.material.opacity=chargeFade*.95;
   shotPoint(s,t,v);s.core.position.copy(v);s.aura.position.copy(v);s.body.position.copy(v);setPaint(s.body,t<.15?1:t>.82?3:2);s.body.visible=t>=0;s.body.scale.set(2.15*unit,1.2*unit,1);if(camera){shotPoint(s,t+.012,ahead).applyMatrix4(camera.matrixWorldInverse);shotPoint(s,t-.012,behind).applyMatrix4(camera.matrixWorldInverse);s.body.material.rotation=Math.atan2((ahead.y-behind.y),(ahead.x-behind.x));}else s.body.material.rotation=Math.atan2(-(s.to.z-s.from.z)*.6-.65,s.to.x-s.from.x);s.body.material.opacity=t>=0&&t<=1?.92:0;s.core.material.opacity=t>=0&&t<=1?.85:0;s.aura.material.opacity=t>=0?.5*(1-clamp((t-1)*5)):0;
   s.tail.forEach((tail,i)=>{const q=t-(i+1)*.027;shotPoint(s,q,v);tail.position.copy(v);tail.scale.setScalar(.24*unit*(1-i/(s.tail.length+2)));tail.material.opacity=q<0?0:(1-i/(s.tail.length+1))*.55*(1-clamp((t-1)*5));});
   const {positions,n,mesh}=s.thread;mesh.visible=t>0;mesh.material.uniforms.opacity.value=t>0?.55*(1-clamp((t-1)*5)):0;
   for(let i=0;i<=n;i++){const q=clamp(t)*i/n;shotPoint(s,q,v);const width=(.055+Math.sin(i/n*Math.PI)*.045)*unit,flutter=Math.sin(time*24+i*.7)*.025*unit;positions.set([v.x,v.y-width+flutter,v.z,v.x,v.y+width+flutter,v.z],i*6);}mesh.geometry.attributes.position.needsUpdate=true;
  }
  for(const p of impactPool){if(!p.active)continue;const t=(time-p.start)/.42;if(t>=1){p.active=false;p.g.visible=false;continue;}setPaint(p.seal,4+Math.min(3,Math.floor(t*4)));p.seal.position.set(0,.95,0);p.seal.scale.setScalar(1.65+Math.sin(t*Math.PI)*1.1);p.seal.material.opacity=Math.pow(1-t,.8)*.9;p.ring.scale.setScalar(.18+t*.85);p.goldRing.scale.setScalar(.08+t*.55);p.goldRing.position.y=.01;p.ring.material.opacity=(1-t)*.6;p.goldRing.material.opacity=(1-t)*.45;p.glow.position.y=.6;p.glow.scale.setScalar(.55+Math.sin(t*Math.PI)*.7);p.glow.material.opacity=(1-t)*.8;p.sparks.forEach((s,i)=>{const a=i*Math.PI*2/9,r=t*.7;s.position.set(Math.cos(a)*r,.5+Math.sin(a)*r*.4+Math.sin(t*Math.PI)*.3,Math.sin(a)*r);s.material.opacity=(1-t)*.8;s.scale.setScalar(.1*(1-t*.65));});}
 }
 function handleEvent(e){if(disposed)return;if(e.type==='spiritSummon'&&e.from){origins.set(e.petId,{...e.from,born:spiritPresentationTime(world.time,e,'spawnedAt')});while(origins.size>limit*2)origins.delete(origins.keys().next().value);}if(e.type==='spiritShot')addShot(e);if(e.type==='spiritImpact'){const id=e.shotId,s=shots.get(id);if(s)removeShot(s);impact(e);}}
 function dispose(){disposed=true;for(const p of [...pets.values()])disposePet(p);for(const s of [...shots.values()])removeShot(s);for(const p of impactPool)p.g.traverse(o=>{if(o.material)o.material.dispose();});frames.forEach(t=>t.dispose());fxFrames.forEach(t=>t.dispose());base?.dispose();fxBase?.dispose();glowTexture.dispose();ring.dispose();scene.remove(group);}
 return {update,handleEvent,dispose,ready,get metrics(){return {ready:loaded&&fxFrames.length===8,error,pets:pets.size,shots:shots.size,shotCount,hitCount,impactSlots:impactPool.length,textures:loaded&&fxFrames.length===8?3:1};}};
}
