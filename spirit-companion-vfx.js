import * as THREE from './vendor/build/three.module.js';
import {groundHeight} from './combat-core.js?v=novice174';

const clamp=v=>Math.max(0,Math.min(1,v)),smooth=v=>{v=clamp(v);return v*v*(3-2*v);},mix=(a,b,t)=>a+(b-a)*t;
const jade='#72ffe2',gold='#e7c47a';
// Prototype renderer: one shared character atlas, pooled effects, no gameplay damage.
export function createSpiritCompanionVfx(scene,world){
 const group=new THREE.Group();group.name='spirit-companion-prototype';scene.add(group);
 const pets=new Map(),shots=new Map(),impactPool=[],frames=[];
 let disposed=false,loaded=false,error=null,base=null,shotCount=0,hitCount=0;
 const compact=matchMedia('(pointer:coarse),(max-width:900px)').matches,ring=new THREE.RingGeometry(.93,1,64);
 const glowCanvas=document.createElement('canvas');glowCanvas.width=glowCanvas.height=128;
 const ctx=glowCanvas.getContext('2d'),gradient=ctx.createRadialGradient(64,64,0,64,64,64);
 gradient.addColorStop(0,'rgba(255,255,255,1)');gradient.addColorStop(.14,'rgba(255,255,255,.92)');gradient.addColorStop(.36,'rgba(255,255,255,.36)');gradient.addColorStop(.7,'rgba(255,255,255,.05)');gradient.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
 const glowTexture=new THREE.CanvasTexture(glowCanvas);glowTexture.colorSpace=THREE.SRGBColorSpace;
 const ready=new Promise((resolve,reject)=>new THREE.TextureLoader().load('./assets/spirit-companion182/spirit-human-v2.png',texture=>{
  if(disposed){texture.dispose();resolve();return;}base=texture;base.colorSpace=THREE.SRGBColorSpace;base.generateMipmaps=false;base.minFilter=base.magFilter=THREE.LinearFilter;
  for(let i=0;i<16;i++){const t=base.clone(),inset=.0015;t.repeat.set(.25-inset*2,.25-inset*2);t.offset.set((i%4)/4+inset,1-(Math.floor(i/4)+1)/4+inset);t.needsUpdate=true;frames.push(t);}loaded=true;resolve();
 },undefined,e=>{error='โหลดภาพพรายไม่สำเร็จ';reject(e);}));
 function sprite(parent,color,size=1,opacity=1){const material=new THREE.SpriteMaterial({map:glowTexture,color,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,opacity}),s=new THREE.Sprite(material);s.scale.setScalar(size);parent.add(s);return s;}
 function floorRing(parent,color=jade){const material=new THREE.MeshBasicMaterial({color,transparent:true,depthWrite:false,side:THREE.DoubleSide,opacity:0,blending:THREE.AdditiveBlending}),s=new THREE.Mesh(ring,material);s.rotation.x=-Math.PI/2;parent.add(s);return s;}
 function floorGlow(parent,color=jade){const material=new THREE.MeshBasicMaterial({map:glowTexture,color,transparent:true,depthWrite:false,side:THREE.DoubleSide,opacity:0,blending:THREE.AdditiveBlending}),s=new THREE.Mesh(new THREE.PlaneGeometry(2,2),material);s.rotation.x=-Math.PI/2;parent.add(s);return s;}
 function makePet(id,pet){
  const g=new THREE.Group();group.add(g);const material=new THREE.SpriteMaterial({transparent:true,depthWrite:false,alphaTest:.025}),body=new THREE.Sprite(material);body.center.set(.5,.12);g.add(body);
  const glow=sprite(g,jade,1.4,.13),summon=new THREE.Group();g.add(summon);const outer=floorRing(summon,gold),inner=floorRing(summon,jade),wash=floorGlow(summon);
  const marks=new THREE.Group();summon.add(marks);
  for(let i=0;i<12;i++){const theta=i*Math.PI/6,shape=new THREE.Shape();shape.moveTo(0,.12);shape.quadraticCurveTo(.08,0,0,-.12);shape.quadraticCurveTo(-.08,0,0,.12);const leaf=new THREE.Mesh(new THREE.ShapeGeometry(shape),new THREE.MeshBasicMaterial({color:i%2?jade:gold,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending}));leaf.rotation.x=-Math.PI/2;leaf.rotation.z=-theta;leaf.position.set(Math.sin(theta)*.76,.025,Math.cos(theta)*.76);marks.add(leaf);}
  const motes=Array.from({length:compact?4:8},(_,i)=>{const s=sprite(g,i%3?jade:gold,.09,.25);return {s,phase:i*Math.PI*.25};});
  const result={id,g,body,glow,summon,outer,inner,wash,marks,motes,born:pet.spawnedAt??world.time,origin:{x:world.player.x,z:world.player.z},vanish:null,last:pet,frame:-1};pets.set(id,result);return result;
 }
 function frame(p,i){if(p.frame===i||!frames[i])return;p.body.material.map=frames[i];p.body.material.needsUpdate=p.frame<0;p.frame=i;}
 function disposePet(p){group.remove(p.g);p.g.traverse(o=>{if(o.material)o.material.dispose();if(o.geometry&&o.geometry!==ring)o.geometry.dispose();});pets.delete(p.id);}
 function addShot(e){
  const id=e.shotId??`${e.petId}:${e.launchAt??world.time}`;if(shots.has(id))return;
  const g=new THREE.Group();group.add(g);const core=sprite(g,'#eafffb',.23,1),aura=sprite(g,jade,.68,.7),tail=Array.from({length:compact?7:12},(_,i)=>sprite(g,i%4===0?gold:jade,.1,.3));
  const from=e.from??{x:e.x,z:e.z},to=e.to??from;shots.set(id,{id,g,core,aura,tail,from:{...from},to:{...to},start:e.launchAt??world.time,duration:e.duration??.3,petId:e.petId});shotCount++;
 }
 function shotPoint(s,t,out){const a=s.from,b=s.to,q=clamp(t),dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz)||1,curve=Math.sin(q*Math.PI)*.38;
  out.set(mix(a.x,b.x,q)-dz/length*curve,mix(groundHeight(world.nav,a.x,a.z)+1.55,groundHeight(world.nav,b.x,b.z)+.8,q)+Math.sin(q*Math.PI)*.2,mix(a.z,b.z,q)+dx/length*curve);return out;
 }
 function removeShot(s){group.remove(s.g);s.g.children.forEach(o=>o.material.dispose());shots.delete(s.id);}
 function impact(e){if(e.hit===false)return;let p=impactPool.find(p=>!p.active);if(!p){const g=new THREE.Group();group.add(g);p={g,ring:floorRing(g,jade),goldRing:floorRing(g,gold),glow:sprite(g,jade,1,1),sparks:Array.from({length:9},(_,i)=>sprite(g,i%3?jade:gold,.12,.9)),active:false};impactPool.push(p);}p.active=true;p.start=world.time;p.g.visible=true;p.g.position.set(e.x??e.to?.x??0,groundHeight(world.nav,e.x??e.to?.x??0,e.z??e.to?.z??0)+.06,e.z??e.to?.z??0);hitCount++;}
 const v=new THREE.Vector3();
 function update(dt=0){
  if(disposed)return;const time=world.time,all=world.rolePetsView??world.roleCombat?.state.pets??[],seen=new Set();
  for(const pet of all.filter(p=>p.kind==='spirit'&&p.left>0).slice(0,compact?8:16)){if(pet.kind!=='spirit'||pet.left<=0)continue;const id=pet.id??`${pet.owner??'self'}:spirit`;seen.add(id);const p=pets.get(id)??makePet(id,pet);p.last=pet;p.vanish=null;p.body.visible=loaded;const age=time-p.born,attackAge=time-(pet.attackAt??-99),fly=Math.sin(time*2.4+p.born)*.055;
   p.g.position.set(pet.x,groundHeight(world.nav,pet.x,pet.z),pet.z);p.body.position.set(0,.95+fly,0);
   const master=pet.tier==='master',scale=master?1.9:1.65,appear=smooth(age/.55);p.body.scale.set(scale*(pet.face?.x<-.1?-1:1),scale*(.84+.16*appear),1);p.body.material.opacity=appear;
   const index=age<.68?4+Math.min(3,Math.floor(age/.17)):attackAge>=0&&attackAge<.4?8+Math.min(3,Math.floor(attackAge/.1)):Math.floor(time*5)%4;frame(p,index);
   p.glow.position.set(0,1.4+fly,0);p.glow.material.opacity=.11*appear*(1+.15*Math.sin(time*3));
   const summonFade=age<1.15?Math.sin(clamp(age/1.15)*Math.PI):0;p.summon.visible=summonFade>0;p.summon.position.set(p.origin.x-pet.x,.005,p.origin.z-pet.z);p.outer.position.y=.025;p.inner.position.y=.03;p.wash.position.y=.02;p.outer.scale.setScalar(.4+smooth(age/.75)*.65);p.inner.scale.setScalar(.28+smooth(age/.75)*.43);p.outer.material.opacity=summonFade*.72;p.inner.material.opacity=summonFade*.6;p.wash.material.opacity=summonFade*.25;p.marks.rotation.y=time*.8;p.marks.children.forEach(m=>m.material.opacity=summonFade*.75);
   for(const {s,phase} of p.motes){const q=(time*.3+phase/(Math.PI*2))%1;s.position.set(Math.cos(phase+time*.35)*(.26+q*.13),.4+q*1.2+fly,Math.sin(phase+time*.35)*.22);s.material.opacity=Math.sin(q*Math.PI)*.28*appear;}
  }
  for(const p of pets.values())if(!seen.has(p.id)){p.vanish??=time;const t=(time-p.vanish)/.48;if(t>=1){disposePet(p);continue;}frame(p,12+Math.min(3,Math.floor(t*4)));p.body.material.opacity=1-smooth(t);p.glow.material.opacity=(1-t)*.1;p.summon.visible=false;p.motes.forEach(({s})=>s.material.opacity*=Math.max(0,1-dt*8));}
  for(const s of shots.values()){const age=time-s.start,t=(age-.06)/Math.max(.08,s.duration-.06);if(age>s.duration+.08){removeShot(s);continue;}s.g.visible=t>=0;shotPoint(s,t,v);s.core.position.copy(v);s.aura.position.copy(v);s.core.material.opacity=t<=1?1:0;s.aura.material.opacity=.65*(1-clamp((t-1)*5));s.tail.forEach((tail,i)=>{const q=t-(i+1)*.035;shotPoint(s,q,v);tail.position.copy(v);tail.scale.setScalar(.19*(1-i/14));tail.material.opacity=q<0?0:(1-i/13)*.52*(1-clamp((t-1)*5));});}
  for(const p of impactPool){if(!p.active)continue;const t=(time-p.start)/.42;if(t>=1){p.active=false;p.g.visible=false;continue;}p.ring.scale.setScalar(.18+t*.85);p.goldRing.scale.setScalar(.08+t*.55);p.goldRing.position.y=.01;p.ring.material.opacity=(1-t)*.6;p.goldRing.material.opacity=(1-t)*.45;p.glow.position.y=.6;p.glow.scale.setScalar(.55+Math.sin(t*Math.PI)*.7);p.glow.material.opacity=(1-t)*.8;p.sparks.forEach((s,i)=>{const a=i*Math.PI*2/9,r=t*.7;s.position.set(Math.cos(a)*r,.5+Math.sin(a)*r*.4+Math.sin(t*Math.PI)*.3,Math.sin(a)*r);s.material.opacity=(1-t)*.8;s.scale.setScalar(.1*(1-t*.65));});}
 }
 function handleEvent(e){if(disposed)return;if(e.type==='spiritShot')addShot(e);if(e.type==='spiritImpact'){const id=e.shotId,s=shots.get(id);if(s)removeShot(s);impact(e);}}
 function dispose(){disposed=true;for(const p of [...pets.values()])disposePet(p);for(const s of [...shots.values()])removeShot(s);for(const p of impactPool)p.g.traverse(o=>{if(o.material)o.material.dispose();});frames.forEach(t=>t.dispose());base?.dispose();glowTexture.dispose();ring.dispose();scene.remove(group);}
 return {update,handleEvent,dispose,ready,get metrics(){return {ready:loaded,error,pets:pets.size,shots:shots.size,shotCount,hitCount,impactSlots:impactPool.length,textures:loaded?2:1};}};
}
