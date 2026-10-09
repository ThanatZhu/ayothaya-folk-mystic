import * as THREE from 'three';

/** Deterministic, frame-rate-independent ambient animation. No timers or new assets. */
export function createAmbientMotion({scene,world,waterMaterial,plants,characters,leafSources}){
 const clock={value:0};let running=!matchMedia('(prefers-reduced-motion:reduce)').matches;
 let seed=708;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
 const nodes=[];world.traverse(o=>{if(o.isMesh)nodes.push(o);});
 const named=(o,prefix)=>o.name.replaceAll('_',' ').startsWith(prefix);

 // Water highlights are advected through world-space pixel cells, so they continue
 // downstream when the camera turns instead of moving with the screen.
 waterMaterial.onBeforeCompile=shader=>{
  shader.uniforms.uAmbientTime=clock;
  shader.vertexShader='varying vec2 vRiverXZ;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvRiverXZ = (modelMatrix * vec4(transformed, 1.0)).xz;');
  shader.fragmentShader='uniform float uAmbientTime;\nvarying vec2 vRiverXZ;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   vec2 cell = floor(vec2((vRiverXZ.x - uAmbientTime * .38) * 6., vRiverXZ.y * 19.));
   float fleck = fract(sin(dot(cell, vec2(127.1, 311.7))) * 43758.5453);
   float ripple = sin(floor(vRiverXZ.y * 22.) * .41 + floor((vRiverXZ.x - uAmbientTime*.23)*15.)*.15);
   diffuseColor.rgb *= .91 + .12 * ripple;
   diffuseColor.rgb += vec3(.12,.19,.15) * step(.943, fleck) * (.65 + .35*sin(uAmbientTime + cell.y));
  `);
 };
 waterMaterial.customProgramCacheKey=()=> 'folk-water-current-v1';waterMaterial.needsUpdate=true;
 nodes.filter(o=>named(o,'Waterfall')).forEach(o=>{
  o.material=new THREE.MeshLambertMaterial({color:'#72aaa5',side:THREE.DoubleSide});
  o.material.onBeforeCompile=shader=>{
   shader.uniforms.uAmbientTime=clock;
   shader.vertexShader='varying vec3 vFall;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvFall=transformed;');
   shader.fragmentShader='uniform float uAmbientTime;\nvarying vec3 vFall;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
    float stream=sin(floor(vFall.x*20.)*1.7+floor((vFall.y+uAmbientTime*1.8)*16.)*.6);
    diffuseColor.rgb+=vec3(.14,.21,.19)*step(.35,stream);
   `);
  };o.material.customProgramCacheKey=()=> 'folk-waterfall-v1';
 });
 nodes.filter(o=>named(o,'Water glints')).forEach(o=>o.visible=false);

 // Each boat part moves around the same waterline pivot, including its cargo.
 world.updateMatrixWorld(true);
 const boatParts=nodes.filter(o=>named(o,'River boat'));
 if(!boatParts.length)throw new Error('Boat animation group is missing');
 const boat=new THREE.Group();boat.name='Moored boat motion';boat.position.set(3.15,-.05,7.1);scene.add(boat);
 boatParts.forEach(o=>boat.attach(o));
 const ropeGeometry=new THREE.BufferGeometry();ropeGeometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(27),3));
 const rope=new THREE.Line(ropeGeometry,new THREE.LineBasicMaterial({color:'#bba076'}));rope.frustumCulled=false;scene.add(rope);
 const ropeStart=new THREE.Vector3(.65,.52,7.35),ropeEnd=new THREE.Vector3(),ropePoint=new THREE.Vector3(-1.65,.14,.23);

 // The canopy bends while the base of the sprite stays planted. Every species
 // shares a slow gust, with independent phase and a small leaf-level flutter.
 plants.forEach(({sprite,kind},i)=>{
  const amount=['tree','forest'].includes(kind)?.105:['banana','palm','bamboo'].includes(kind)?.16:kind==='rice'?.09:kind==='hedge'?.06:.026;
  sprite.material.onBeforeCompile=shader=>{
   shader.uniforms.uAmbientTime=clock;shader.uniforms.uWindAmount={value:amount};shader.uniforms.uWindPhase={value:i*1.713};
   const declarations='uniform float uAmbientTime;\nuniform float uWindAmount;\nuniform float uWindPhase;\n';
   shader.vertexShader=declarations+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('vec2 rotatedPosition;',`float gust = .68*sin(uAmbientTime*1.05 + uWindPhase) + .32*sin(uAmbientTime*.43);
    alignedPosition.x += uWindAmount * pow(position.y+.5, 2.) * gust;
    vec2 rotatedPosition;`);
   shader.fragmentShader=declarations+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#ifdef USE_MAP
    vec2 windUv = vMapUv;
    windUv.x += .0022 * smoothstep(.28, .95, vMapUv.y) * sin(uAmbientTime*1.65 + vMapUv.y*23. + uWindPhase);
    diffuseColor *= texture2D(map, windUv);
   #endif`);
  };
  sprite.material.customProgramCacheKey=()=> 'folk-leaf-wind-v1';sprite.material.needsUpdate=true;
 });

 function bendMeshes(prefix,body){
  nodes.filter(o=>named(o,prefix)).forEach(o=>{
   o.material=o.material.clone();o.material.onBeforeCompile=shader=>{
    shader.uniforms.uAmbientTime=clock;
    shader.vertexShader='uniform float uAmbientTime;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n'+body);
   };o.material.customProgramCacheKey=()=> 'folk-bend-'+prefix;o.material.needsUpdate=true;
   // These tiny moving details don't need stale, undeformed shadow silhouettes.
   o.castShadow=false;
  });
 }
 bendMeshes('River reeds','transformed.x += .06 * max(0., transformed.y) * sin(uAmbientTime*1.8 + transformed.x*1.9);');
 bendMeshes('Shrine ribbons','transformed.x += .085 * max(0., 1.55-transformed.y) * sin(uAmbientTime*2.4 + transformed.x*3.);');
 // Only the cloth mesh is deformed; posts and table remain solid.
 const cloth=nodes.find(o=>named(o,'Herbal stall')&&o.material.name==='cream');
 if(cloth){cloth.name='Awning cloth';bendMeshes('Awning cloth','transformed.y += .045 * smoothstep(1.9,3.7,transformed.z) * sin(uAmbientTime*2.0+transformed.x*2.2);');}
 bendMeshes('City banners','transformed.z += .09 * sin(uAmbientTime*2.0+transformed.x*2.0) * smoothstep(1.,2.8,transformed.y);');
 bendMeshes('Harbor sail','transformed.z += .15 * sin(uAmbientTime*1.4+transformed.x) * smoothstep(.5,3.,transformed.y);');
 bendMeshes('Rice shoots','transformed.x += .055 * max(0.,transformed.y-.2) * sin(uAmbientTime*1.7+transformed.z*1.2);');
 bendMeshes('Torch flames','float flameHeight=max(0.,transformed.y-1.21); transformed.x += flameHeight*.14*sin(uAmbientTime*7.+transformed.x*3.); transformed.y += flameHeight*.07*sin(uAmbientTime*9.+transformed.z);');
 const floating=nodes.filter(o=>named(o,'Water lilies')||named(o,'Lotus'));

 // Small geometry leaves stay sharp at game scale. One instanced draw call.
 const leafShape=new THREE.BufferGeometry();
 leafShape.setAttribute('position',new THREE.Float32BufferAttribute([0,.65,0,-.36,0,0,0,-.65,0,.36,0,0],3));leafShape.setIndex([0,1,2,0,2,3]);
 const leafCount=48,leafMesh=new THREE.InstancedMesh(leafShape,new THREE.MeshBasicMaterial({color:0xffffff,side:THREE.DoubleSide}),leafCount);
 leafMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);leafMesh.frustumCulled=false;scene.add(leafMesh);
 const sources=leafSources?.length?leafSources:[[-10.5,6.7,-7],[-10.5,7.8,-7],[-12.6,5,-11.8],[3,3.6,-11.5],[12.7,3.9,-8.7]];
 const leaves=Array.from({length:leafCount},(_,i)=>{
  const source=sources[i%sources.length],height=source[1]+random();
  leafMesh.setColorAt(i,new THREE.Color(['#d9b65c','#b8bb65','#829651','#d39a44'][i%4]));
  return {x:source[0]+(random()-.5)*2,y:height,z:source[2]+(random()-.5)*2,duration:height/(.3+random()*.12),phase:random()*30,size:.13+random()*.10};
 });
 const dummy=new THREE.Object3D();
 const rings=new THREE.InstancedMesh(new THREE.RingGeometry(.65,.68,24),new THREE.MeshBasicMaterial({color:'#92ac84',transparent:true,opacity:.16,depthWrite:false,side:THREE.DoubleSide}),7);
 rings.frustumCulled=false;scene.add(rings);
 const ringSources=Array.from({length:7},()=>({x:-13+random()*26,z:5.8+random()*3.2,phase:random()*4}));

 const harbor=nodes.filter(o=>named(o,'Harbor trader')||named(o,'Harbor sail'));
 function update(dt){
  if(running)clock.value+=Math.max(0,Math.min(.08,dt));
  const t=clock.value;
  harbor.forEach(o=>{o.position.y=Math.sin(t*1.2)*.025;});
  boat.position.set(3.15+Math.sin(t*.47)*.055,-.025+Math.sin(t*1.65)*.031,7.1+Math.sin(t*.6)*.035);
  boat.rotation.set(Math.sin(t*1.32)*.019,Math.sin(t*.48)*.009,Math.sin(t*1.1+.7)*.017);boat.updateMatrixWorld(true);
  ropeEnd.copy(ropePoint).applyMatrix4(boat.matrixWorld);
  const rp=ropeGeometry.attributes.position;
  for(let i=0;i<9;i++){const f=i/8;rp.setXYZ(i,THREE.MathUtils.lerp(ropeStart.x,ropeEnd.x,f),THREE.MathUtils.lerp(ropeStart.y,ropeEnd.y,f)-Math.sin(f*Math.PI)*.13,THREE.MathUtils.lerp(ropeStart.z,ropeEnd.z,f));}rp.needsUpdate=true;
  floating.forEach((o,i)=>{o.position.y=.009*Math.sin(t*1.35+i*.7);});
  characters.forEach(({sprite,height},i)=>{sprite.scale.y=height*(1+.016*Math.sin(t*1.65+i*1.3));sprite.material.rotation=.014*Math.sin(t*.85+i*1.7);sprite.position.y=.06+.01*(1+Math.sin(t*1.1+i));});
  leaves.forEach((leaf,i)=>{
   const age=(t+leaf.phase)%leaf.duration,f=age/leaf.duration;
   dummy.position.set(leaf.x+age*.32+Math.sin(age*1.9+i)*.23,.12+leaf.y*(1-f),leaf.z+age*.095+Math.sin(age*1.2+i)*.28);
   dummy.rotation.set(Math.sin(age*2.1+i)*.75,age*1.5+i,age*1.8+i);
   dummy.scale.setScalar(leaf.size*Math.min(1,age*2,(leaf.duration-age)*2));dummy.updateMatrix();leafMesh.setMatrixAt(i,dummy.matrix);
  });leafMesh.instanceMatrix.needsUpdate=true;
  ringSources.forEach((source,i)=>{
   const f=((t+source.phase)%4)/4;dummy.position.set(source.x+f*.22,-.113,source.z);
   dummy.rotation.set(-Math.PI/2,0,0);dummy.scale.set(1.6*f,.45*f,1);dummy.updateMatrix();rings.setMatrixAt(i,dummy.matrix);
  });rings.instanceMatrix.needsUpdate=true;
  return t;
 }
 update(0);
 return {update,toggle(){running=!running;return running;},get running(){return running;}};
}
