import * as THREE from 'three';
// A small arena built in world units; the same radius is enforced by combat nav.
export function createArenaStage({scene}){
 scene.background=new THREE.Color('#60745d');scene.fog=new THREE.Fog('#60745d',50,100);
 const root=new THREE.Group();root.name='Ayothaya circular dueling court';scene.add(root);
 const mat=color=>new THREE.MeshStandardMaterial({color,roughness:.75});
 const stone=mat('#b8ae89'),dark=mat('#203f36'),gold=mat('#c6a655'),edge=mat('#766d55');
 const add=(geo,material,x,y,z)=>{const m=new THREE.Mesh(geo,material);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;root.add(m);return m;};
 add(new THREE.CylinderGeometry(42,42,.2,64),mat('#425a44'),0,-.8,0);
 add(new THREE.CylinderGeometry(12.5,13,.5,96),edge,0,-.36,0);
 add(new THREE.CylinderGeometry(11.7,11.7,.14,96),stone,0,-.08,0);
 for(const [r,w,m]of [[11.15,.3,dark],[10.7,.08,gold],[8.6,.045,edge],[3.4,.12,gold],[2.9,.06,dark]]){
  const mesh=add(new THREE.RingGeometry(r,r+w,96),m,0,.003,0);mesh.rotation.x=-Math.PI/2;
 }
 for(let i=0;i<24;i++){
  const a=i*Math.PI/12,x=Math.cos(a),z=Math.sin(a);
  const seam=add(new THREE.BoxGeometry(.025,.008,2),edge,x*9.8,.002,z*9.8);seam.rotation.y=Math.PI/2-a;
  if(i%3===0){
   add(new THREE.CylinderGeometry(.38,.5,.35,8),gold,x*12,.05,z*12);
   add(new THREE.CylinderGeometry(.21,.3,1.75,8),dark,x*12,1.05,z*12);
   add(new THREE.CylinderGeometry(.4,.3,.18,8),gold,x*12,1.98,z*12);
   const flame=add(new THREE.SphereGeometry(.17,10,8),new THREE.MeshBasicMaterial({color:'#ffe3a0'}),x*12,2.2,z*12);flame.scale.y=1.8;
  }
 }
 for(const x of [-5,5]){const ring=add(new THREE.RingGeometry(.65,.75,32),gold,x,.008,0);ring.rotation.x=-Math.PI/2;}
 // Eight lotus petals, no large transparent planes or full-screen effects.
 for(let i=0;i<8;i++){const a=i*Math.PI/4,petal=add(new THREE.SphereGeometry(.46,12,8),dark,Math.cos(a)*1.3,.015,Math.sin(a)*1.3);petal.scale.set(1.8,.025,.6);petal.rotation.y=-a;}
 add(new THREE.CylinderGeometry(.45,.45,.035,32),gold,0,.012,0);
 return {root,update(){},toggle(){return false;}};
}
