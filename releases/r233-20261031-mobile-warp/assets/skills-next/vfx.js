import * as THREE from '../../vendor/build/three.module.js';
const TAU=Math.PI*2;
const supports=new Set(['heal','regen','lifeTree','groupHeal','revive','greatRevive','cleanse','purify','sanctuary','ward','yantra','reflect','guard','counter','lastStand','intercept','link','smoke','stealth','clones','crow','summon','greatSummon','spirit','greatSpirit']);
const projectiles=new Set(['line','drill','chainLine','phalanx','cone','mark','retreatShot','holy','curse','bind','massBind','peck','flock']);
const falling=new Set(['meteor','storm','rain','holyField']);
const fields=new Set(['zone','wall','storm','trap','rain','thorns','regen','lifeTree','sanctuary','yantra','holyField','mine','smoke','clones']);
const hash=id=>[...id].reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,7);
export function createRoleVfx(scene,{quality='high',reduced=false}={}){
 const blade=new THREE.Shape();blade.moveTo(-.06,0);blade.lineTo(-.13,.58);blade.lineTo(0,1);blade.lineTo(.13,.58);blade.lineTo(.06,0);blade.closePath();
 const geometries={ring:new THREE.TorusGeometry(1,.018,4,64),orb:new THREE.IcosahedronGeometry(1,1),spark:new THREE.OctahedronGeometry(1),blade:new THREE.ShapeGeometry(blade),dome:new THREE.SphereGeometry(1,24,12,0,TAU,0,Math.PI/2),beam:new THREE.CylinderGeometry(.035,.035,1,5),petal:new THREE.SphereGeometry(1,10,6),cone:new THREE.ConeGeometry(.18,1,5)};
 const active=[],persistent=new THREE.Group();scene.add(persistent);let disposed=false,shake=0;
 const disposeGroup=g=>{scene.remove(g);const mats=new Set(g.userData.materials??[]);g.traverse(o=>{if(o.material)mats.add(o.material);});mats.forEach(m=>m.dispose());};
 function material(color,opacity=1){return new THREE.MeshBasicMaterial({color,transparent:true,opacity,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending});}
 function mesh(g,key,mat,x=0,y=0,z=0,scale=1){const m=new THREE.Mesh(geometries[key],mat);m.position.set(x,y,z);m.scale.setScalar(scale);g.add(m);return m;}
 function ring(g,mat,r,y=.04){const m=mesh(g,'ring',mat,0,y,0,r);m.rotation.x=Math.PI/2;return m;}
 function beam(g,mat,from,to){const a=new THREE.Vector3(from.x,from.y??.7,from.z),b=new THREE.Vector3(to.x,to.y??.7,to.z),d=b.clone().sub(a),m=mesh(g,'beam',mat);m.position.copy(a.add(b).multiplyScalar(.5));m.scale.y=d.length();m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return m;}
 function clearPersistent(){while(persistent.children.length){const g=persistent.children[0];persistent.remove(g);g.traverse(o=>o.material?.dispose());}}
 const api={
  configure(next){quality=next.quality??quality;reduced=next.reduced??reduced;},
  burst(skill,from,to,color,charge=false){
   if(disposed)return;while(active.length>=(reduced?6:12)){const old=active.shift();disposeGroup(old.group);}
   const master=skill.tier==='master',seed=hash(skill.id),g=new THREE.Group(),main=material(color),gold=material('#fff0b5',.85),haze=material(color,.14),group=new THREE.Group();scene.add(group);group.add(g);
   group.userData.materials=[main,gold,haze];
   const support=supports.has(skill.kind),center=charge?from:support&&['guard','counter','stealth','lastStand','summon','greatSummon','spirit','greatSpirit','crow','clones'].includes(skill.kind)?from:to;
   group.position.set(center.x,0,center.z);const size=charge?.65:master?1.55:1.05;
   const a=ring(g,main,size),b=ring(g,gold,size*.72,.06);b.rotation.z=(seed%8)*Math.PI/4;
   const details=[],shots=[],petals=[],spokes=master?8:4;
   // Four-petal prajam-yam geometry grounds the spell language in Thai ornament.
   for(let i=0;i<spokes;i++){const angle=i*TAU/spokes,m=mesh(g,'spark',gold,Math.cos(angle)*size,.12,Math.sin(angle)*size,.1);m.scale.y=2.5;details.push(m);}
   if(charge){for(let i=0;i<4;i++){const m=mesh(g,'orb',main,0,.5,0,.045);shots.push(m);}}
   else if(['guard','sanctuary','yantra','ward','reflect','counter','lastStand'].includes(skill.kind)){
    const dome=mesh(g,'dome',haze,0,.04,0,skill.kind==='guard'?1.2:2.1);details.push(dome);ring(g,gold,dome.scale.x,.07);
    for(let i=0;i<4;i++){const r=ring(g,main,1);r.rotation.set(0,i*Math.PI/4,0);r.position.y=1;r.scale.set(1.2,1.2,1.2);details.push(r);}
   }else if(['heal','regen','lifeTree','groupHeal','revive','greatRevive','cleanse','purify','holyField'].includes(skill.kind)){
    const count=master?10:6;for(let i=0;i<count;i++){const theta=i*TAU/count,m=mesh(g,'petal',i%2?gold:main,Math.cos(theta)*.55,.24,Math.sin(theta)*.55);m.scale.set(.14,.38,.16);m.rotation.set(Math.sin(theta)*.7,0,-Math.cos(theta)*.7);petals.push(m);}
    if(['revive','greatRevive','lifeTree'].includes(skill.kind)){const m=mesh(g,'cone',gold,0,1.4,0);m.scale.set(1,2.8,1);details.push(m);}
   }else if(skill.kind==='smoke'||skill.kind==='stealth'||skill.kind==='clones'){
    for(let i=0;i<5;i++){const m=mesh(g,'orb',haze,Math.cos(i)*.8,.4,Math.sin(i)*.8,.6);details.push(m);}
   }else if(!projectiles.has(skill.kind)&&!falling.has(skill.kind)&&!['summon','greatSummon','spirit','greatSpirit','crow'].includes(skill.kind)){
    const count=master?6:3;for(let i=0;i<count;i++){const m=mesh(g,'blade',i%2?gold:main);m.rotation.z=i*Math.PI/count;shots.push(m);}
   }
   if(projectiles.has(skill.kind)){const n=reduced?1:skill.kind==='cone'?5:master?3:1;for(let i=0;i<n;i++){const m=mesh(group,'blade',i%2?gold:main);m.userData.shot=i;m.scale.set(.8,1.8,.8);shots.push(m);}}
   if(falling.has(skill.kind)){const n=reduced?2:master?9:6;for(let i=0;i<n;i++){const m=mesh(g,'blade',i%2?gold:main,(i%3-1)*.65,4+i*.22,(Math.floor(i/3)-1)*.65);m.rotation.z=Math.PI;shots.push(m);}}
   if(['link','intercept','reflect'].includes(skill.kind))beam(group,gold,{x:from.x-center.x,z:from.z-center.z},{x:to.x-center.x,z:to.z-center.z});
   const particles=[],count=reduced?4:quality==='low'?12:master?42:26;
   for(let i=0;i<count;i++){const m=mesh(g,'spark',i%3?main:gold,0,0,0,.035+(i%3)*.012);particles.push(m);}
   active.push({group,g,main,gold,haze,age:0,life:charge?skill.windup:master?1.9:1.25,skill,from,to,center,charge,size,seed,a,b,details,shots,petals,particles});
   if(!charge&&!support)shake=Math.max(shake,master?.2:.08);
  },
  syncFields(list,color){
   const signature=list.map(f=>f.kind+':'+f.x.toFixed(2)+':'+f.z.toFixed(2)).join('|');if(persistent.userData.signature===signature)return;persistent.userData.signature=signature;clearPersistent();
   for(const f of list.slice(-10)){const g=new THREE.Group();g.position.set(f.x,.015,f.z);persistent.add(g);const mat=material(color,.35);ring(g,mat,f.radius);ring(g,mat,f.radius*.94);if(f.kind==='sanctuary'||f.kind==='yantra'){mesh(g,'dome',material(color,.05),0,0,0,f.radius);}if(f.kind==='lifeTree'){for(let i=0;i<4;i++){const m=mesh(g,'spark',mat,Math.sin(i)*.4,.4+i*.4,Math.cos(i)*.4,.3);m.scale.y=2;}}}
  },
  update(dt){for(const e of [...active]){e.age+=dt;if(e.age>=e.life){active.splice(active.indexOf(e),1);disposeGroup(e.group);continue;}const t=e.age/e.life,attack=Math.min(1,t*4),fade=Math.min(1,(1-t)*3);e.main.opacity=.85*fade;e.gold.opacity=.8*fade;e.haze.opacity=.12*fade;
    const spread=e.charge?1-t*.7:1+attack*.8;e.a.scale.setScalar(e.size*spread);e.b.rotation.z=(reduced?0:e.age*.5)+(e.seed%8)*.4;e.g.rotation.y=reduced?0:Math.sin(e.age)*.1;
    e.particles.forEach((m,i)=>{const a=i*2.399+(e.seed%16),r=(e.charge?1-t:t)*(e.skill.tier==='master'?2.5:1.7);m.position.set(Math.cos(a)*r,.15+Math.sin(i*9.2)*.2+(e.charge?t:Math.sin(t*Math.PI))*1.9,Math.sin(a)*r);m.scale.setScalar((.025+i%3*.012)*fade);});
    e.petals.forEach((m,i)=>{m.position.y=.25+(reduced?0:Math.sin(t*Math.PI))*1.1;m.rotation.y=i*.15+t;});
    e.shots.forEach((m,i)=>{
     if(e.charge){const a=e.age*3+i*Math.PI/2;m.position.set(Math.cos(a)*(.8-t*.5),.4+t,Math.sin(a)*(.8-t*.5));}
     else if(falling.has(e.skill.kind)){m.position.y=Math.max(.12,4-((t*1.9+i*.13)%1)*5);}
     else if(projectiles.has(e.skill.kind)){const q=Math.min(1,t*3);m.position.set((e.from.x-e.center.x)*(1-q),.8+Math.sin(q*Math.PI)*.25,(e.from.z-e.center.z)*(1-q)+(i-(e.shots.length-1)/2)*.2);m.rotation.z=-Math.PI/2;}
     else{const a=i*TAU/e.shots.length+t*(e.skill.classId==='rogue'?5:2);m.position.set(Math.cos(a)*(.6+attack*.5),.65+Math.sin(a)*.4,Math.sin(a)*.25);m.rotation.z=a-Math.PI/2;}
    });
   }shake=Math.max(0,shake-dt*.55);persistent.rotation.y=0;
  },
  shake(time,enabled=true){if(!enabled||reduced)return {x:0,y:0};return {x:Math.sin(time*83)*shake,y:Math.cos(time*67)*shake*.55};},
  clear(){for(const e of active)disposeGroup(e.group);active.length=0;clearPersistent();persistent.userData.signature=null;shake=0;},
  dispose(){if(disposed)return;api.clear();scene.remove(persistent);Object.values(geometries).forEach(g=>g.dispose());disposed=true;},
  get count(){return active.length;},get geometryCount(){return Object.keys(geometries).length;}
 };return api;
}
// A persistent, articulated summon, not a billboard cut from an opaque icon.
export function createRooster(){
 const g=new THREE.Group(),geos=[],mats=[],part=(geo,color,x,y,z)=>{geos.push(geo);const mat=new THREE.MeshLambertMaterial({color});mats.push(mat);const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);g.add(m);return m;};
 part(new THREE.SphereGeometry(.22,12,8),'#b76a2d',0,.36,0).scale.set(1.2,1,1);
 const head=part(new THREE.SphereGeometry(.13,12,8),'#f5d49a',.21,.61,0);
 part(new THREE.ConeGeometry(.07,.19,4),'#e8bc57',.36,.6,0).rotation.z=-Math.PI/2;
 for(let i=0;i<3;i++)part(new THREE.SphereGeometry(.05,8,6),'#c53626',.14+i*.055,.75,0);
 part(new THREE.SphereGeometry(.04,6,6),'#160d09',.24,.64,.11);
 part(new THREE.SphereGeometry(.05,6,6),'#b72924',.28,.49,0);
 const wing=part(new THREE.SphereGeometry(.17,10,7),'#9a4327',-.03,.38,.16);wing.scale.set(1,.65,.25);
 for(let i=0;i<5;i++){const feather=part(new THREE.SphereGeometry(.13,8,7),i%2?'#164b45':'#276c62',-.2-i*.035,.5+i*.065,(i-2)*.035);feather.scale.set(.45,2.3,.4);feather.rotation.z=-.65-i*.08;}
 const legs=[-.09,.09].map(z=>part(new THREE.CylinderGeometry(.022,.02,.23,6),'#d8ab4e',.03,.13,z));
 g.userData.animate=(time,moving)=>{head.rotation.z=Math.sin(time*8)*(moving?.2:.06);wing.rotation.x=Math.sin(time*11)*.12;legs.forEach((m,i)=>m.rotation.z=moving?Math.sin(time*12+i*Math.PI)*.45:0);};
 g.userData.dispose=()=>{geos.forEach(v=>v.dispose());mats.forEach(v=>v.dispose());};return g;
}
