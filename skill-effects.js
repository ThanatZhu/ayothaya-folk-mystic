import * as THREE from './vendor/build/three.module.js';
import {FX_STYLES,createFxArt} from './skill-fx-art.js?v=37';
// Seekable releases, travel and impact stages shared by local/remote players.
export function createSkillEffects(scene){
 const art=createFxArt(),active=[],up=new THREE.Vector3(0,1,0);
 function remove(e){scene.remove(e.group);for(const m of e.materials)m.dispose();const i=active.indexOf(e);if(i>=0)active.splice(i,1);}
 function create(track,{from={x:0,z:0},to={x:1.8,z:0},color,reduced=false}={}){
  while(active.length>=16)remove(active[0]);
  const style=FX_STYLES[track.classId]??FX_STYLES.novice,kind=track.fx,group=new THREE.Group();group.userData.motif=style.motif;scene.add(group);
  const material=new THREE.MeshBasicMaterial({color:style.main,transparent:true,opacity:.8,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending});
  const accent=material.clone();accent.color.set(style.accent);
  const glyphMaterial=material.clone();glyphMaterial.map=art.seal;
  const flashMaterial=accent.clone();flashMaterial.map=art.soft;
  const paperMaterial=new THREE.MeshBasicMaterial({map:art.paper,color:'#ffffff',transparent:true,side:THREE.DoubleSide,depthWrite:false});
  const spiritMaterial=material.clone();spiritMaterial.map=art.spirit;spiritMaterial.blending=THREE.NormalBlending;
  const materials=[material,accent,glyphMaterial,flashMaterial,paperMaterial,spiritMaterial];
  const add=(geometry,mat=material)=>{const mesh=new THREE.Mesh(art.geometry[geometry],mat);group.add(mesh);return mesh;};
  const magical=['shaman','acolyte'].includes(track.classId),self=['heal','shield','motes','orbit'].includes(kind),origin=self?from:to;
  const projectile=['arrow','lance','spirit','light','talisman'].includes(kind),duration=track.duration,beats=track.strikes;
  const glyph=add('plane',glyphMaterial),flash=add('plane',flashMaterial),dome=add('shield');
  const shape=projectile?(kind==='arrow'||kind==='lance'?'arrow':kind==='talisman'?'plane':kind==='spirit'?'plane':'petal'):
    kind==='rain'?'arrow':['slash','arc','orbit'].includes(kind)?'crescent':kind==='flame'?'plane':
    ['heal','motes'].includes(kind)?(track.classId==='acolyte'?'petal':track.classId==='hunter'?'feather':'star'):
    kind==='trail'?(track.classId==='rogue'?'crescent':'streak'):['shield','bind','wave'].includes(kind)?'ring':'star';
  const count=reduced?1:['rain','flame','heal','motes','orbit','burst'].includes(kind)?8:projectile?3:5;
  const parts=[];
  for(const [b,beat] of beats.entries())for(let i=0;i<count;i++){
   const mat=kind==='talisman'?paperMaterial:kind==='spirit'||kind==='flame'?spiritMaterial:i%2?accent:material;
   const mesh=add(shape,mat);mesh.userData.beat=b;parts.push({mesh,i,b,beat});
  }
  const accents=Array.from({length:reduced?0:8},(_,i)=>add(style.motif==='lotus'?'petal':style.motif==='talisman'?'plane':style.motif==='feather'?'feather':style.motif==='blade'||style.motif==='twin'?'crescent':'streak',style.motif==='talisman'?paperMaterial:accent));
  const e={group,material,glyphMaterial,flashMaterial,materials,track,age:0,life:duration+.7,dispose:()=>remove(e)};active.push(e);
  e.sample=(time,camera)=>{
   const dx=to.x-from.x,dz=to.z-from.z,dist=Math.hypot(dx,dz),aim=new THREE.Vector3(dist?dx/dist:1,0,dist?dz/dist:0),q=time/duration;
   material.opacity=reduced?.25:.7;accent.opacity=reduced?.3:.9;paperMaterial.opacity=.95;spiritMaterial.opacity=.85;
   const first=beats[0]*duration,charge=Math.max(0,Math.min(1,time/Math.max(.1,first)));
   const remaining=Math.max(0,1-(time-first)/.28);
   glyph.visible=!reduced&&magical&&time>=0&&remaining>0;glyph.position.set(from.x,.08,from.z);glyph.rotation.set(-Math.PI/2,0,time*.5);glyph.scale.setScalar(1.1+charge*.7);glyphMaterial.opacity=.52*Math.min(charge*2,remaining);
   let impact=Infinity,release=Infinity;
   for(const beat of beats){const d=time-beat*duration;if(d>=0)release=Math.min(release,d);const h=d-(projectile?.27:0);if(h>=0)impact=Math.min(impact,h);}
   const pop=Math.min(1,impact/.24);
   flash.visible=!reduced&&pop>=0&&pop<1;flash.position.set(origin.x,self?.4:1.0,origin.z);flash.quaternion.copy(camera.quaternion);flash.scale.setScalar(.6+pop*1.4);flashMaterial.opacity=Math.max(0,.7*(1-pop));
   const shieldAge=release/.55;
   dome.visible=!reduced&&kind==='shield'&&shieldAge<1;dome.position.set(from.x,.04,from.z);dome.scale.setScalar(.8+Math.min(1,shieldAge)*.3);dome.material.opacity=kind==='shield'?Math.max(0,.2*(1-shieldAge)):.7;
   parts.forEach(({mesh:m,i,beat,b})=>{
    const age=time-beat*duration-i*(projectile?.035:kind==='rain'?.035:.012),life=projectile?.36:kind==='rain'?.55:kind==='heal'||kind==='motes'?.8:.48,f=age/life;
    m.visible=f>=0&&f<1;if(!m.visible)return;
    m.quaternion.identity();m.scale.setScalar(1);const fade=Math.sin(Math.PI*f),theta=i/count*Math.PI*2+b*.7;
    m.position.set(origin.x,.12,origin.z);
    if(reduced){m.rotation.x=-Math.PI/2;m.scale.setScalar(.3);return;}
    if(projectile){
     const travel=Math.min(1,age/.27),offset=(i-1)*.09;
     m.position.set(from.x+dx*travel-aim.z*offset,1.02+Math.sin(travel*Math.PI)*.16+offset,from.z+dz*travel+aim.x*offset);
     if(shape==='arrow'){m.quaternion.setFromUnitVectors(up,aim);m.scale.set(.65,kind==='lance'?1.8:1,1);}
     else{m.quaternion.copy(camera.quaternion);m.rotateZ(kind==='talisman'?Math.sin(f*9+i)*.45:Math.sin(f*4)*.12);m.scale.set(kind==='spirit'?.45:.25,kind==='spirit'?.65:.48,1);}
     m.scale.multiplyScalar(Math.min(1,fade*2));
    }else if(kind==='rain'){
     m.position.set(to.x+Math.cos(theta)*.85,3.3*(1-f)+.05,to.z+Math.sin(theta)*.85);m.rotation.z=Math.PI;m.scale.setScalar(.8*fade);
    }else if(['slash','arc','orbit'].includes(kind)){
     const around=kind==='orbit',radius=around?.8:.35;
     m.position.set(origin.x+Math.cos(theta+f*2)*radius,.85+(i%3)*.16,origin.z+Math.sin(theta+f*2)*radius*.4);
     m.quaternion.copy(camera.quaternion);m.rotateZ((style.motif==='twin'&&i%2?-1:1)*(f*2.7+theta));m.scale.setScalar((.65+i*.08)*fade);
    }else if(['heal','motes','flame'].includes(kind)){
     const r=.32+f*.38,a=theta+f*1.6;m.position.set(origin.x+Math.cos(a)*r,.15+f*(kind==='flame'?2:1.65),origin.z+Math.sin(a)*r);
     m.quaternion.copy(camera.quaternion);m.rotateZ(Math.sin(a)*.3);m.scale.setScalar((kind==='flame'?.65:kind==='heal'?.38:.22)*fade);
    }else if(kind==='trail'){
     m.position.set(from.x+dx*i/count,.22+Math.sin(theta)*.12,from.z+dz*i/count);m.quaternion.setFromUnitVectors(up,aim);m.scale.set(.4,.8,1).multiplyScalar(fade);
    }else if(['bind','shield','wave'].includes(kind)){
     m.position.y=kind==='bind'?.25+i*.24:.06+i*.025;m.rotation.x=-Math.PI/2;m.rotation.z=theta+f;const r=kind==='bind'?.5:kind==='shield'?.9:.6+f*1.2;m.scale.setScalar(r*fade);
    }else{
     // Punches/novice hits have a brief directional contact star, then debris.
     const spread=.12+f*.65;m.position.set(to.x+Math.cos(theta)*spread,1+Math.sin(theta)*spread-f*f*.35,to.z+Math.sin(theta*2)*spread*.3);
     m.quaternion.copy(camera.quaternion);m.rotateZ(theta+f);m.scale.setScalar((i===0?.65:.2)*fade);
    }
   });
   accents.forEach((m,i)=>{
    const f=release/.6;m.visible=Number.isFinite(f)&&f>=0&&f<1;if(!m.visible)return;
    const a=i/accents.length*Math.PI*2+f*.6,r=.35+f*.8;m.quaternion.identity();m.scale.setScalar(1);
    if(magical){
     m.position.set(origin.x+Math.cos(a)*r,.08+(style.motif==='lotus'?.1:f*.9),origin.z+Math.sin(a)*r);
     if(style.motif==='lotus'){m.rotation.set(-Math.PI/3,0,-a);m.scale.setScalar(.6*Math.sin(f*Math.PI));}
     else{m.quaternion.copy(camera.quaternion);m.rotateZ(Math.sin(a)*.5);m.scale.set(.16,.28,1).multiplyScalar(Math.sin(f*Math.PI));}
    }else{
     m.position.set(origin.x+Math.cos(a)*r,.25+Math.sin(f*Math.PI)*.45,origin.z+Math.sin(a)*r);m.quaternion.copy(camera.quaternion);m.rotateZ(-a);m.scale.set(.1,.25,1).multiplyScalar(1-f);
    }
   });
  };
  return e;
 }
 return {create,update(dt,camera){for(const e of [...active]){e.age+=dt;if(e.age>e.life)remove(e);else e.sample(e.age,camera);}},clear(){for(const e of [...active])remove(e);},dispose(){this.clear();art.dispose();},get count(){return active.length;}};
}

// Soft dust puffs at each footfall; at most 10 alive, each fades in 0.45 s.
export function createFootDust(scene){
 const geometry=new THREE.CircleGeometry(.2,14),puffs=[];
 const remove=p=>{scene.remove(p.mesh);p.mesh.material.dispose();puffs.splice(puffs.indexOf(p),1);};
 return {
  puff(x,y,z){if(puffs.length>=10)remove(puffs[0]);const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color:'#efe2c4',transparent:true,opacity:.4,depthWrite:false}));mesh.rotation.x=-Math.PI/2;mesh.position.set(x,y,z);scene.add(mesh);puffs.push({mesh,age:0});},
  update(dt){for(const p of [...puffs]){p.age+=dt;const f=p.age/.45;if(f>=1){remove(p);continue;}p.mesh.scale.set(.6+f*1.2,.6+f*1.2,1);p.mesh.position.y+=dt*.12;p.mesh.material.opacity=.4*(1-f);}},
  get count(){return puffs.length;}
 };
}
