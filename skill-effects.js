import * as THREE from './vendor/build/three.module.js';
// Deterministic, seekable presentation shared by the game and the rehearsal room.
// One material per cast, shared geometry, at most 16 live casts.
export function createSkillEffects(scene){
 const geometry={
  arc:new THREE.RingGeometry(.65,.72,28,1,0,Math.PI*1.25),
  ring:new THREE.RingGeometry(.7,.74,40),
  spark:new THREE.IcosahedronGeometry(.11,0),
  lance:new THREE.ConeGeometry(.045,.9,4),
  paper:new THREE.PlaneGeometry(.18,.38)
 },active=[];
 function remove(e){scene.remove(e.group);e.material.dispose();const i=active.indexOf(e);if(i>=0)active.splice(i,1);}
 function create(track,{from={x:0,z:0},to={x:1.8,z:0},color='#e6cb92',reduced=false}={}){
  while(active.length>=16)remove(active[0]);
  const material=new THREE.MeshBasicMaterial({color,transparent:true,opacity:.8,side:THREE.DoubleSide,depthWrite:false});
  const group=new THREE.Group();scene.add(group);
  const kind=track.fx,projectile=['arrow','lance','spirit','light','talisman'].includes(kind);
  const shape=['slash','arc'].includes(kind)?'arc':['arrow','lance','rain'].includes(kind)?'lance':kind==='talisman'?'paper':['impact','spirit','motes','flame'].includes(kind)?'spark':'ring';
  const count=['rain','flame','motes','orbit','burst'].includes(kind)?8:kind==='trail'?5:3;
  const parts=Array.from({length:count},()=>{const m=new THREE.Mesh(geometry[shape],material);group.add(m);return m;});
  const e={group,material,track,age:0,life:track.duration+.45,dispose:()=>remove(e)};active.push(e);
  e.sample=(time,camera)=>{
   const q=time/track.duration,dx=to.x-from.x,dz=to.z-from.z,n=Math.hypot(dx,dz)||1,aim=new THREE.Vector3(dx/n,0,dz/n);
   material.opacity=reduced?.4:.8;
   parts.forEach((m,i)=>{
    const beat=track.strikes[i%track.strikes.length],f=(q-beat)/.27;
    m.visible=f>=0&&f<1;if(!m.visible)return;
    m.quaternion.identity();m.scale.setScalar(1);const fade=Math.sin(f*Math.PI);
    const angle=i/count*Math.PI*2+f*.8;
    const self=['heal','shield','motes','orbit','burst'].includes(kind),origin=self?from:to;
    m.position.set(origin.x,.1,origin.z);
    if(reduced){m.rotation.x=-Math.PI/2;m.scale.setScalar(.45);return;}
    if(projectile){
     m.position.set(from.x+dx*f,.9+Math.sin(f*Math.PI)*.15,from.z+dz*f);
     if(shape==='lance')m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),aim);
     else m.quaternion.copy(camera.quaternion);
     m.scale.setScalar((kind==='light'?2:1)*fade);
     if(i>0)m.position.y+=(i-1)*.14;
    }else if(['arc','slash','impact','wave'].includes(kind)){
     m.position.y=.8+(i-1)*.16;m.quaternion.copy(camera.quaternion);m.rotateZ((kind==='slash'?-1:1)*f*2.5+i*1.2);
     m.scale.setScalar((kind==='impact'?(2+i*.7):(.5+i*.16))*fade);
    }else if(kind==='rain'){
     m.position.set(to.x+Math.cos(angle)*.8,2.5*(1-f)+.12,to.z+Math.sin(angle)*.8);m.rotation.z=Math.PI;m.scale.setScalar(fade);
    }else if(kind==='trail'){
     m.position.set(from.x+dx*i/count,.16,from.z+dz*i/count);m.rotation.x=-Math.PI/2;m.scale.setScalar((.3+f*.4)*fade);
    }else if(['flame','motes','heal'].includes(kind)){
     m.position.set(origin.x+Math.cos(angle)*(.35+f*.35),.15+f*1.8,origin.z+Math.sin(angle)*(.35+f*.35));
     m.quaternion.copy(camera.quaternion);m.scale.setScalar((kind==='heal'?.2:1)*fade);
    }else{
     m.rotation.x=-Math.PI/2;m.position.y=.06+i*(kind==='bind'?.3:.03);
     m.rotation.z=angle;m.scale.setScalar((kind==='shield'?.65:kind==='bind'?.4:1.1)*(1+f)*(1-i*.13)*fade);
    }
   });
  };
  return e;
 }
 return {create,update(dt,camera){for(const e of [...active]){e.age+=dt;if(e.age>e.life)remove(e);else e.sample(e.age,camera);}},clear(){for(const e of [...active])remove(e);},dispose(){this.clear();Object.values(geometry).forEach(g=>g.dispose());},get count(){return active.length;}};
}
