import * as THREE from '../../vendor/build/three.module.js';
import {atlasUv} from './timing.js';

// Atlas pixels stay untouched. Each frame is addressed by UVs, with a small bleed inset.
export async function createPaintedVfx(scene){
 const loader=new THREE.TextureLoader(),owned=[],layers=[];
 const sheets=Object.fromEntries(await Promise.all(Object.entries({sword:'cross-slash-v1.png',rooster:'rooster-dash-v1.png',lotus:'lotus-revive-v1.png'}).map(async([id,file])=>{
  const original=await loader.loadAsync('./assets/skill-polish/'+file);original.colorSpace=THREE.SRGBColorSpace;original.magFilter=THREE.LinearFilter;original.minFilter=THREE.LinearFilter;original.generateMipmaps=false;owned.push(original);
  const frames=Array.from({length:8},(_,i)=>{const t=original.clone(),uv=atlasUv(i);t.offset.set(uv.x,uv.y);t.repeat.set(uv.w,uv.h);t.needsUpdate=true;owned.push(t);return t;});return [id,frames];
 })));
 function layer(key,{opacity=1,glow=false}={}){const mat=new THREE.SpriteMaterial({map:sheets[key][0],transparent:true,opacity,depthWrite:false,depthTest:true,blending:glow?THREE.AdditiveBlending:THREE.NormalBlending});const sprite=new THREE.Sprite(mat);scene.add(sprite);sprite.visible=false;layers.push(sprite);return sprite;}
 const slash=layer('sword'),glow=layer('sword',{glow:true}),lotus=layer('lotus'),rooster=layer('rooster'),contact=layer('sword');
 lotus.center.set(.5,.12);rooster.center.set(.5,.17);
 const canvas=document.createElement('canvas');canvas.width=canvas.height=32;const ctx=canvas.getContext('2d'),gradient=ctx.createRadialGradient(16,16,0,16,16,16);gradient.addColorStop(0,'#fff9d9');gradient.addColorStop(.25,'#ffd77aaa');gradient.addColorStop(1,'#ffd77a00');ctx.fillStyle=gradient;ctx.fillRect(0,0,32,32);const dot=new THREE.CanvasTexture(canvas);owned.push(dot);
 const geometry=new THREE.BufferGeometry(),positions=new Float32Array(36*3);geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));const particleMat=new THREE.PointsMaterial({map:dot,color:'#ffe3a2',size:4,sizeAttenuation:false,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending});const particles=new THREE.Points(geometry,particleMat);scene.add(particles);particles.frustumCulled=false;
 function show(sprite,key,frame,opacity,x,y,z,size){sprite.visible=opacity>.005;sprite.material.map=sheets[key][Math.max(0,Math.min(7,frame))];sprite.material.opacity=opacity;sprite.position.set(x,y,z);sprite.scale.setScalar(size);}
 return {
  sample(sample,{old=false,quality='high',reduced=false}={}){
   const s=sample,t=s.time;for(const layer of layers)layer.visible=false;particles.visible=!old;particleMat.opacity=0;if(old)return;
   if(s.id==='sword'){
    show(slash,'sword',s.fxFrame,s.fxOpacity,1.35,1.1,.08,s.fxSize);
    show(glow,'sword',s.fxFrame,s.fxOpacity*.12,1.35,1.1,.075,s.fxSize*1.045);
   }else if(s.id==='rooster'){
    show(rooster,'rooster',s.roosterFrame,s.roosterOpacity,s.roosterX,s.roosterY,-.08,1.72);
    const alpha=Math.max(0,1-Math.abs(t-1.02)/.19);show(contact,'sword',7,alpha,1.64,1,.1,.9);
   }else{
    // Behind the restored actor: opaque human pixels remain legible through the bloom.
    show(lotus,'lotus',s.fxFrame,s.fxOpacity,1.55,.025,-.42,s.fxSize);
   }
   const start=s.id==='sword'?.65:s.id==='rooster'?.94:.5,span=s.id==='lotus'?3.2:.9,q=Math.max(0,Math.min(1,(t-start)/span));particleMat.opacity=(s.id==='lotus'?s.fxOpacity*.65:Math.sin(q*Math.PI)*.65);
   geometry.setDrawRange(0,reduced?8:quality==='low'?16:36);
   for(let i=0;i<36;i++){const angle=i*2.399,seed=(Math.sin(i*42.7)+1)/2,spread=(s.id==='lotus'?.5:q*1.7);positions[i*3]=1.55+Math.cos(angle)*spread*(.3+seed);positions[i*3+1]=s.id==='lotus'?.3+((i*.073+(reduced?0:t*.26))%1)*2.4:1+Math.sin(angle)*q*.9-q*q*.7;positions[i*3+2]=Math.sin(angle)*spread*.65;}
   geometry.attributes.position.needsUpdate=true;
  },
  get textures(){return owned.length;},
  dispose(){for(const s of layers){scene.remove(s);s.material.dispose();}scene.remove(particles);geometry.dispose();particleMat.dispose();owned.forEach(t=>t.dispose());}
 };
}
