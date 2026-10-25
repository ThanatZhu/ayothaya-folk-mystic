import * as THREE from './vendor/build/three.module.js';
import {FX_STYLES,createFxArt} from './skill-fx-art.js?v=68';

// Presentation only: combat events and authored strike times remain unchanged.
const TAU=Math.PI*2,clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const finite=(x,fallback=0)=>Number.isFinite(x)?x:fallback,pulse=t=>Math.sin(Math.PI*clamp(t));
const styles={
 novice:{reach:1.4,attack:'punch',support:'feather',spark:14},
 swordsman:{reach:1.65,attack:'slash',support:'streak',spark:20},
 lancer:{reach:2.6,attack:'lance',support:'arrow',spark:18},
 hunter:{reach:6,attack:'arrow',support:'feather',spark:14},
 boxer:{reach:1.3,attack:'punch',support:'streak',spark:24},
 rogue:{reach:1.5,attack:'twin',support:'crescent',spark:18},
 shaman:{reach:3.3,attack:'spirit',support:'plane',spark:18},
 acolyte:{reach:4.2,attack:'light',support:'petal',spark:16}
};
export function combatVfxProfile(track,options={}){
 const classId=styles[track.classId]?track.classId:'novice',basic=options.skillIndex===null;
 const index=basic?0:clamp(Math.floor(finite(track.index)),0,9);
 const kind=basic?'attack':({1:'area',2:'bind',3:'push',4:'heal',5:'shield',7:'dash',8:'focus',9:'ultimate'}[index]??'attack');
 return {classId,...styles[classId],index,basic,kind,heavy:!basic&&index===6,signature:`${classId}:${basic?'basic':index}:${kind}`};
}
// Transparent feathered edges, a bright centre and tapered tips. World-space
// orientation keeps the blade sweep stable while the isometric camera orbits.
function ribbon(span){
 const p=[],c=[],indices=[],steps=48;
 for(let i=0;i<=steps;i++){
  const t=i/steps,a=(t-.5)*span,w=.2*Math.sin(t*Math.PI)**.65;
  for(const [r,alpha] of [[1-w,0],[1-w*.45,.9],[1,.75],[1+w*.22,0]]){p.push(Math.cos(a)*r,Math.sin(a)*r,0);c.push(1,1,1,alpha*Math.sin(t*Math.PI)**.4);}
 }
 for(let i=0;i<steps;i++)for(let k=0;k<3;k++){const n=i*4+k;indices.push(n,n+4,n+1,n+1,n+4,n+5);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('color',new THREE.Float32BufferAttribute(c,4));g.setIndex(indices);g.computeBoundingSphere();return g;
}
function spear(){
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([-.9,0,0,.45,-.055,0,1,0,0,.45,.055,0],3));
 g.setAttribute('color',new THREE.Float32BufferAttribute([1,1,1,0,1,1,1,.5,1,1,1,1,1,1,1,.5],4));g.setIndex([0,1,2,0,2,3]);return g;
}
export function createCombatVfxResources(){
 const art=createFxArt();art.geometry.sweep=ribbon(2.65);art.geometry.wideSweep=ribbon(4.7);art.geometry.spear=spear();
 art.geometry.ward=new THREE.RingGeometry(.77,.81,40,1,-Math.PI*.12,Math.PI*1.24);
 // MeshBasicMaterial has no default colour attribute. Supply white RGBA on
 // every shared shape so the gradient-enabled material cannot render it black.
 for(const geometry of Object.values(art.geometry))if(!geometry.attributes.color){
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(new Float32Array(geometry.attributes.position.count*4).fill(1),4));
 }
 for(const texture of [art.soft,art.seal,art.spirit,art.paper]){texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearFilter;}
 return art;
}

export function createCombatEffect(art,track,options={}){
 const profile=combatVfxProfile(track,options),palette=FX_STYLES[profile.classId];
 const reduced=!!options.reduced,low=reduced||options.quality==='low',from=options.from??{},to=options.to??{x:1.8,z:0};
 const groundY=finite(options.groundY,finite(from.y)),fx=finite(from.x),fz=finite(from.z),tx=finite(to.x,fx),tz=finite(to.z,fz);
 const dx=tx-fx,dz=tz-fz,dist=Math.hypot(dx,dz),direction=options.direction??{};
 const angle=dist>.00001?Math.atan2(dz,dx):Math.atan2(finite(direction.z),finite(direction.x,1));
 const targetY=finite(to.y,groundY)-groundY,reach=profile.reach,duration=Math.max(.05,finite(track.duration,1));
 const beats=(Array.isArray(track.strikes)&&track.strikes.length?track.strikes:[.5]).filter(Number.isFinite).slice(0,8);if(!beats.length)beats.push(.5);
 const group=new THREE.Group();group.name='CombatVFX';group.position.set(fx,groundY,fz);group.rotation.y=-angle;
 const radius=clamp(finite(options.radius,profile.kind==='ultimate'?4:Math.min(2.5,reach+.7)),.2,8);
 group.userData={...profile,motif:palette.motif,aim:[Math.cos(angle),Math.sin(angle)],radius,reduced,quality:low?'low':'high'};
 const material=new THREE.MeshBasicMaterial({color:options.color??palette.main,transparent:true,opacity:reduced?.3:profile.basic?.65:.82,side:THREE.DoubleSide,depthWrite:false,vertexColors:true,blending:THREE.AdditiveBlending,toneMapped:false});
 const accent=material.clone();accent.color.set(palette.accent);
 const glyphMaterial=material.clone();glyphMaterial.map=art.seal;glyphMaterial.opacity=.44;
 const flashMaterial=accent.clone();flashMaterial.map=art.soft;flashMaterial.opacity=.62;
 const paperMaterial=new THREE.MeshBasicMaterial({map:art.paper,color:'#fff0c9',transparent:true,side:THREE.DoubleSide,depthWrite:false,toneMapped:false});
 const spiritMaterial=material.clone();spiritMaterial.map=art.spirit;spiritMaterial.blending=THREE.NormalBlending;
 const materials=[material,accent,glyphMaterial,flashMaterial,paperMaterial,spiritMaterial];
 const specs=[],scratch=new THREE.Object3D(),cameraQ=new THREE.Quaternion(),inverseQ=new THREE.Quaternion(),billboardQ=new THREE.Quaternion();
 const meshBudget=reduced?9:low?26:50,magical=profile.classId==='shaman'||profile.classId==='acolyte';let disposed=false;
 const add=(shape,mat,beat,life,fn,delay=0)=>{
  if(specs.length>=meshBudget)return null;
  const mesh=new THREE.Mesh(art.geometry[shape],mat??material);mesh.name=`${profile.signature}/${shape}`;mesh.visible=false;mesh.frustumCulled=false;mesh.renderOrder=4;mesh.userData={beat,shape};group.add(mesh);
  specs.push({mesh,start:beats[beat]*duration+delay,life,fn});return mesh;
 };
 const bill=m=>m.quaternion.copy(billboardQ),floor=m=>m.rotation.set(-Math.PI/2,0,0);
 const place=(m,x,y,z,s)=>{m.position.set(x,y,z);m.scale.setScalar(s);};
 const contact=profile.kind==='area'&&['novice','swordsman','lancer','boxer','rogue'].includes(profile.classId)?0:dist;
 const impact=(b,x=dist,y=targetY+1,strength=1,delay=0)=>{if(options.synced)delay=0;strength*=profile.basic?1:1.35;
  add('star',accent,b,.19,(m,t)=>{place(m,x,y,0,(.25+t*.45)*pulse(t)*strength);bill(m);m.rotateZ(.22+b*.8);},delay);
  if(!low)add('plane',flashMaterial,b,.28,(m,t)=>{place(m,x,y,0,(.6+t*.8)*(1-t)*strength);bill(m);},delay);
  if(!profile.basic)add('ring',accent,b,.32,(m,t)=>{place(m,x,targetY+.06,0,(.5+t*1.6)*strength);floor(m);},delay);
 };
 const slash=(b,{wide=false,heavy=false,orbit=false,twin=false}={})=>{
  const r=orbit?radius:wide?radius*.78:Math.min(reach,Math.max(.95,dist*.85));
  for(let j=0;j<(twin?2:1);j++){
   add(wide||orbit?'wideSweep':'sweep',material,b,.34,(m,t)=>{place(m,orbit||wide?0:.12,1.02+(j?-.18:.12),0,r*(.88+t*.16)*pulse(t)**.2);m.rotation.set(wide||orbit?Math.PI/2:j?-.7:.6,0,(t-.5)*(heavy?-1.2:.75)+(j?-.5:.15));if(orbit)m.rotateZ(b*1.9+t*1.7);},j*.045);
   add('sweep',accent,b,.24,(m,t)=>{place(m,orbit||wide?0:.12,1.05+(j?-.18:.12),0,r*(.92+t*.12)*pulse(t)**.3);m.rotation.set(wide||orbit?Math.PI/2:j?-.7:.6,0,(t-.5)*(heavy?-1.2:.75)+(j?-.5:.15));m.scale.y*=.96;if(orbit)m.rotateZ(b*1.9+t*1.7);},.03+j*.045);
  }
  if(!orbit)impact(b,wide?Math.min(dist,r):dist,targetY+1,heavy?1.4:.8,.09);
 };
 const thrust=(b,heavy=false)=>{
  const length=Math.min(reach+.6,Math.max(1,dist));
  add('spear',material,b,.3,(m,t)=>{place(m,.2+length*clamp(t*2),.97,0,1);m.scale.set(length*(heavy?.85:.6)*pulse(t),heavy?2:1,1);});
  if(!low)add('spear',accent,b,.24,(m,t)=>{place(m,.3+length*clamp(t*2),.98,0,1);m.scale.set(length*.55*pulse(t),.3,1);m.rotation.x=Math.PI/2;},.025);
  impact(b,dist,targetY+1,heavy?1.3:.85,.1);
 };
 const shot=(b,attack=profile.attack,heavy=false)=>{
  const travel=options.synced?Math.min(beats[b]*duration,clamp(dist*.045,.16,.36)):clamp(dist*.045,.16,.36),shape=attack==='arrow'?'arrow':attack==='light'?'petal':'plane',mat=attack==='spirit'?spiritMaterial:attack==='talisman'?paperMaterial:accent;
  add(shape,mat,b,travel+.09,(m,t,age)=>{
   const f=clamp(age/travel);place(m,.3+(dist-.3)*f,1.04+targetY*f+Math.sin(f*Math.PI)*.12,0,1);
   if(attack==='arrow'||attack==='light'){m.rotation.z=-Math.PI/2;m.scale.set(attack==='light'?.55:heavy?.65:.46,attack==='light'?.8:heavy?.9:.7,1);}else{bill(m);m.scale.set(.36,.6,1);m.rotateZ(attack==='talisman'?Math.sin(f*6)*.35:0);}
   m.scale.multiplyScalar(Math.min(1,Math.max(0,(1-t)*8)));
  },options.synced?-travel:0);
  add('spear',material,b,travel+.12,(m,t,age)=>{const f=clamp(age/travel);place(m,dist*f-.18,1.02+targetY*f,0,1);m.scale.set((heavy?1.1:.65)*pulse(t),attack==='arrow'?.45:1.3,1);m.rotation.x=.4;},options.synced?-travel:.035);
  impact(b,dist,targetY+1,heavy?1.4:.8,travel);
 };
 const punch=(b,heavy=false,aoe=false)=>{
  if(profile.classId==='novice'&&!aoe){
   // Brief fist trail and contact sparks; no magic seal or screen-filling blast.
   add('spear',material,b,.16,(m,t)=>{place(m,.40+Math.min(dist,reach)*clamp(t*3),.98,0,1);m.scale.set(.28*pulse(t),.65*pulse(t),1);},options.synced?-.055:0);
   if(!options.air){impact(b,dist,targetY+1,heavy?1:.68);if(!low)add('sweep',accent,b,.18,(m,t)=>{place(m,dist,targetY+1,0,.24+t*.28);bill(m);m.rotateZ(.6);m.scale.y*=.45;});}
   return;
  }
  add('spear',material,b,.25,(m,t)=>{place(m,.35+Math.min(dist,reach)*clamp(t*2),.98,0,1);m.scale.set((heavy?.7:.4)*pulse(t),(heavy?4:2)*pulse(t),1);m.rotation.x=b%2?.55:-.5;});
  if(aoe)add('wideSweep',material,b,.3,(m,t)=>{place(m,0,.75,0,radius*.7*pulse(t)**.35);m.rotation.x=Math.PI/2;});
  impact(b,aoe?Math.min(dist,reach):dist,targetY+1,heavy?1.4:1,.07);
 };
 // Anticipation is a visual cue, not a persistent gameplay area or status timer.
 if(!reduced){
  const shape=magical?'plane':profile.classId==='hunter'?'feather':profile.classId==='lancer'?'spear':'sweep';
  const cue=new THREE.Mesh(art.geometry[shape],magical?glyphMaterial:material);cue.name='Anticipation';cue.userData.shape=shape;cue.renderOrder=2;cue.visible=false;group.add(cue);
  specs.push({mesh:cue,start:0,life:Math.max(.12,beats[0]*duration),fn:(m,t)=>{const aimed=['attack','bind','push'].includes(profile.kind);place(m,aimed?.5:0,.025,0,(magical?.9:.45)*Math.sin(Math.PI*t)*.8);floor(m);if(aimed)m.scale.x*=1.35;}});
 }
 // 0.74 cast circle: every skill (not basic attacks) draws the class seal under the caster while it winds up.
 if(!reduced&&!profile.basic&&profile.classId!=='novice'){const big=profile.kind==='ultimate'?radius*1.5:1.9;
  add('plane',glyphMaterial,0,Math.max(.5,beats[0]*duration+.45),(m,t)=>{place(m,0,.03,0,big*Math.min(1,t*5)*(1-Math.max(0,t-.75)*4));floor(m);m.rotation.z=t*2.2;},-beats[0]*duration);
  add('plane',flashMaterial,0,.42,(m,t)=>{place(m,0,.05,0,big*.9*pulse(t));floor(m);});}
 for(let b=0;b<beats.length;b++){
  if(reduced){
   const support=['heal','shield','focus'].includes(profile.kind),shape=profile.kind==='shield'?'ward':profile.kind==='heal'?'petal':profile.kind==='bind'?'ring':profile.attack==='lance'||profile.attack==='arrow'?'spear':profile.attack==='slash'||profile.attack==='twin'?'sweep':profile.attack==='light'?'petal':'star';
   add(shape,material,b,.45,(m,t)=>{place(m,support?0:profile.kind==='ultimate'?0:dist,.08,0,.45*(1-t*.35));floor(m);});continue;
  }
  if(profile.kind==='attack'){
   if(profile.attack==='slash'||profile.attack==='twin')slash(b,{heavy:profile.heavy,twin:profile.attack==='twin'});
   else if(profile.attack==='lance')thrust(b,profile.heavy);
   else if(['arrow','spirit','light'].includes(profile.attack))shot(b,profile.heavy&&profile.classId==='shaman'?'talisman':profile.attack,profile.heavy);
   else punch(b,profile.heavy);
  }else if(profile.kind==='area'){
   if(['slash','twin','lance'].includes(profile.attack))slash(b,{wide:true,twin:profile.attack==='twin'});
   else if(profile.attack==='punch')punch(b,false,true);
   else if(profile.classId==='hunter'){
    for(let j=0;j<(low?3:6);j++)add('arrow',accent,b,.52,(m,t)=>{const a=j*2.4,r=.3+(j%3)*radius*.22;place(m,dist+Math.cos(a)*r,targetY+2.9*(1-t)+.08,Math.sin(a)*r,.65*Math.min(1,(1-t)*6));m.rotation.z=Math.PI+.15;},j*.026);
    impact(b,dist,targetY+.1,1.1,.4);
   }else if(profile.classId==='shaman'){
    for(let j=0;j<(low?3:5);j++)add('plane',spiritMaterial,b,.68,(m,t)=>{const a=j*TAU/5;place(m,dist+Math.cos(a)*radius*.48,targetY+.2+t*1.25,Math.sin(a)*radius*.48,1);bill(m);m.scale.set(.6*pulse(t),1.3*pulse(t),1);},j*.035);
   }else for(let j=0;j<(low?4:6);j++)add('petal',accent,b,.65,(m,t)=>{const a=j*TAU/(low?4:6);place(m,dist+Math.cos(a)*radius*t*.65,targetY+.12,Math.sin(a)*radius*t*.65,1.2*pulse(t));m.rotation.set(-Math.PI/2,0,-a-Math.PI/2);});
  }else if(profile.kind==='bind'){
   for(let j=0;j<(low?2:3);j++)add(j===0?'wideSweep':'ring',material,b,.65,(m,t)=>{place(m,dist,targetY+.08+j*.32,0,(.68-t*.19)*pulse(t)**.25);m.rotation.set(-Math.PI/2+(j===0?0:.2*Math.sin(j)),0,j*1.8+t*.35);},j*.04);
   if(profile.classId==='shaman')for(let j=0;j<2;j++)add('plane',paperMaterial,b,.65,(m,t)=>{place(m,dist+(j?-.5:.5),targetY+.6+t*.2,0,pulse(t)*.45);bill(m);m.rotateZ(j?.35:-.35);});
   else if(profile.classId==='hunter')for(let j=0;j<2;j++)add('feather',accent,b,.5,(m,t)=>{place(m,dist+(j?-.4:.4),targetY+.2,0,pulse(t)*.7);m.rotation.z=j?-.8:.8;});
   else impact(b,dist,targetY+.75,.6);
  }else if(profile.kind==='push'){
   if(profile.classId==='hunter')shot(b,'arrow',true);
   else{
    for(let j=0;j<(low?2:3);j++)add('sweep',j===0?accent:material,b,.43,(m,t)=>{place(m,.4+Math.max(1,dist)*t,targetY*t+.75,0,(.65+t*.55)*pulse(t)**.3);m.rotation.set(0,Math.PI/2,Math.PI/2);m.scale.y*=1.12;},j*.045);
    impact(b,dist,targetY+.9,1,.19);
   }
  }else if(profile.kind==='heal'||profile.kind==='focus'){
   const healing=profile.kind==='heal',count=low?3:5,shape=profile.support;
   for(let j=0;j<count;j++)add(shape,profile.classId==='shaman'?paperMaterial:j%2?accent:material,b,.78,(m,t)=>{
    const a=j*TAU/count+(healing?.4:-.8)*t,r=healing?.3+t*.22:.85*(1-t)+.12;
    place(m,Math.cos(a)*r,.18+(healing?t:1-t)*1.4,Math.sin(a)*r,(healing?.32:.22)*pulse(t));bill(m);m.rotateZ(Math.sin(a)*.45);if(shape==='plane')m.scale.y*=1.5;
   },j*.035);
   if(profile.classId==='acolyte')add('plane',glyphMaterial,b,.8,(m,t)=>{place(m,0,.035,0,1.8*pulse(t)**.5);floor(m);});
   else if(healing)add('ward',accent,b,.7,(m,t)=>{place(m,0,.08,0,.8*pulse(t)**.5);floor(m);});
  }else if(profile.kind==='shield'){
   if(profile.classId==='hunter'||profile.classId==='rogue'){
    for(let j=0;j<(low?3:5);j++)add(profile.support,material,b,.8,(m,t)=>{const a=j*TAU/(low?3:5)+t*.5;place(m,Math.cos(a)*.65,.4+t*.9,Math.sin(a)*.65,.45*pulse(t));bill(m);m.rotateZ(a);});
   }else if(magical){
    for(let j=0;j<(low?3:6);j++)add(profile.classId==='shaman'?'plane':'petal',profile.classId==='shaman'?paperMaterial:accent,b,.8,(m,t)=>{const a=j*TAU/(low?3:6);place(m,Math.cos(a)*.85,.28,Math.sin(a)*.85,.8*pulse(t)**.4);m.rotation.set(-.45,a+Math.PI/2,0);});
    add('plane',glyphMaterial,b,.8,(m,t)=>{place(m,0,.03,0,2*pulse(t)**.3);floor(m);});
   }else{
    for(let j=0;j<2;j++)add('ward',j?material:accent,b,.8,(m,t)=>{place(m,.58+j*.035,1,0,(.75+j*.12)*pulse(t)**.25);m.rotation.set(0,Math.PI/2,-Math.PI/2);});
    add('star',accent,b,.55,(m,t)=>{place(m,.62,1,0,.22*pulse(t));m.rotation.y=Math.PI/2;});
   }
  }else if(profile.kind==='dash'){
   for(let j=0;j<(low?2:4);j++)add('spear',j%2?accent:material,b,.42,(m,t)=>{const side=(j%2?1:-1)*(.22+Math.floor(j/2)*.15);place(m,dist*clamp(t*1.2)-.3,.25+Math.floor(j/2)*.38,side,1);m.scale.set(Math.max(.5,Math.min(2,dist*.65))*pulse(t),.55,1);m.rotation.x=Math.PI/2;},j*.025);
   if(magical)add(profile.support,profile.classId==='shaman'?paperMaterial:accent,b,.5,(m,t)=>{place(m,dist*t,.65,0,.5*pulse(t));bill(m);});
  }else if(profile.kind==='ultimate'){
   if(['slash','twin','lance'].includes(profile.attack))slash(b,{wide:true,orbit:true,twin:profile.attack==='twin'});
   else if(profile.attack==='punch'){
    punch(b,true,true);add('wideSweep',accent,b,.5,(m,t)=>{place(m,0,.055,0,radius*.8*t*pulse(t)**.2);floor(m);});
   }else{
    const count=low?3:5;
    for(let j=0;j<count;j++)add(profile.classId==='hunter'?'arrow':profile.classId==='shaman'?'plane':'petal',profile.classId==='shaman'?paperMaterial:accent,b,.62,(m,t)=>{const a=j*TAU/count+b*.85+t*.38,r=.45+radius*.65*t;place(m,Math.cos(a)*r,.65+Math.sin(t*Math.PI)*.7,Math.sin(a)*r,pulse(t)*.7);if(profile.classId==='shaman'){bill(m);m.rotateZ(a*.3);}else m.rotation.set(Math.PI/2,0,-a-Math.PI/2);});
    if(magical)add('plane',glyphMaterial,b,.65,(m,t)=>{place(m,0,.035,0,radius*1.4*pulse(t)**.5);floor(m);});
   }
  }
 }
 // A single instanced draw, seeded analytic paths, no per-frame geometry or RNG.
 const particleCount=!reduced&&['attack','area','push','ultimate','dash'].includes(profile.kind)?(low?8:profile.basic?10:profile.spark):0;
 const particles=particleCount?new THREE.InstancedMesh(art.geometry.streak,accent,particleCount):null;
 if(particles){particles.name='Contact sparks';particles.frustumCulled=false;particles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);particles.renderOrder=5;group.add(particles);}
 group.userData.particleBudget=particleCount;group.userData.meshBudget=meshBudget+2;
 const projectile=['arrow','spirit','light'].includes(profile.attack)&&(profile.kind==='attack'||profile.kind==='push'&&profile.classId==='hunter');
 const particleDelay=options.synced?0:projectile?clamp(dist*.045,.16,.36):profile.kind==='area'&&profile.classId==='hunter'?.4:.09;
 const e={group,material,glyphMaterial,flashMaterial,materials,track,profile,age:0,life:duration+1.1,
  releaseResources(){if(disposed)return;disposed=true;particles?.dispose();for(const m of materials)m.dispose();},
  sample(time,camera){
   group.visible=!disposed&&Number.isFinite(time)&&time>=0&&time<=e.life;if(!group.visible)return;
   if(camera?.getWorldQuaternion)camera.getWorldQuaternion(cameraQ);else cameraQ.identity();
   group.getWorldQuaternion(inverseQ).invert();billboardQ.copy(inverseQ).multiply(cameraQ);
   for(const {mesh,start,life,fn} of specs){
    const age=time-start,t=age/life;mesh.visible=t>=0&&t<1;
    mesh.position.set(0,0,0);mesh.quaternion.identity();mesh.scale.set(1,1,1);
    if(mesh.visible){fn(mesh,t,age);if(mesh.material===paperMaterial){mesh.scale.x*=.55;mesh.scale.y*=1.25;}}
   }
   if(particles){
    let age=Infinity;for(const beat of beats){const a=time-beat*duration-particleDelay;if(a>=0&&a<age)age=a;}
    particles.visible=age<.52;
    for(let i=0;i<particleCount;i++){
     scratch.position.set(0,0,0);scratch.quaternion.identity();scratch.scale.setScalar(0);
     if(particles.visible){
      const seed=(i*.61803398875)%1,a=seed*TAU,speed=.65+((i*37)%11)*.13,t=age/.52,self=profile.kind==='ultimate'||profile.kind==='dash';
      scratch.position.set((self?0:contact)+Math.cos(a)*speed*age,(self?.12:targetY+.95)+(.55+(i%4)*.2)*age-1.8*age*age,Math.sin(a)*speed*age);
      scratch.quaternion.copy(billboardQ);scratch.rotateZ(-a);scratch.scale.set(.022*(1-t),(.11+(i%3)*.025)*(1-t),1);
     }
     scratch.updateMatrix();particles.setMatrixAt(i,scratch.matrix);
    }
    particles.instanceMatrix.needsUpdate=true;
   }
  }
 };
 e.sample(0);return e;
}
