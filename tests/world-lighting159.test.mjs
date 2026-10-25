import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../vendor/build/three.module.js';
import {lightingProfile,applyWorldLighting,applyMeadowLighting,createActorLighting,isWorldActor} from '../world-lighting159.js';

test('all maps select a usable mood while night, cave, cellar and summit keep their own light',()=>{
 const maps=JSON.parse(fs.readFileSync(new URL('../maps/world.json',import.meta.url))).maps;
 for(const map of maps){const p=lightingProfile(map);assert.ok(p.hemi[2]>0&&p.sun[1]>0);assert.equal(p.finish.blur,0);assert.equal(p.offset.length,3);}
 assert.equal(lightingProfile(maps.find(m=>m.id==='moonlit-mill')).mood,'night');assert.equal(lightingProfile(maps.find(m=>m.id==='naga-cave')).mood,'cave');assert.equal(lightingProfile(maps.find(m=>m.id==='kailash-peak')).mood,'summit');assert.equal(lightingProfile({instance:true}).mood,'cellar');
 assert.notEqual(lightingProfile({mood:'night'}).sky,lightingProfile({}).sky);
});
test('raised geometry casts, water/cloud/terrain do not, and blade shadows use the same wind clock',()=>{
 const scene=new THREE.Scene(),model=new THREE.Group(),clock={value:2},grass=new THREE.MeshStandardMaterial({name:'grassblade'});
 grass.onBeforeCompile=s=>s.uniforms.clock=clock;
 const blade=new THREE.Mesh(new THREE.PlaneGeometry(),grass);blade.name='Fine_meadow_grass_blades';model.add(blade);
 for(const [name,material] of [['Ground_floor','grass'],['Water_surface','water'],['Cloud_sea','cloud sea soft alpha'],['Timber_post','wood']]){const m=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial({name:material}));m.name=name;model.add(m);}
 const sun=new THREE.DirectionalLight(),hemi=new THREE.HemisphereLight(),light=applyWorldLighting({scene,model,map:{id:'rice-fields'},sun,hemi});
 assert.ok(blade.castShadow);assert.ok(model.children.at(-1).castShadow);for(const m of model.children.slice(1,4))assert.equal(m.castShadow,false,m.name);
 const shader=()=>({uniforms:{},vertexShader:'#include <begin_vertex>',fragmentShader:'#include <color_fragment>'}),a=shader(),b=shader();grass.onBeforeCompile(a);blade.customDepthMaterial.onBeforeCompile(b);assert.equal(a.uniforms.clock,b.uniforms.clock);assert.equal(b.uniforms.clock,clock);light.dispose();
});
test('lit Sprite proxy keeps picking, anchor, animation maps, opacity and cloned-material depth correct',()=>{
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-3,3,3,-3,.1,100);camera.position.set(0,1.5,5);camera.lookAt(0,1.5,0);camera.updateMatrixWorld();
 const material=new THREE.SpriteMaterial({map:new THREE.Texture(),alphaTest:.45}),sprite=new THREE.Sprite(material);sprite.center.set(.5,0);sprite.scale.set(2,3,1);scene.add(sprite);scene.updateMatrixWorld();
 const ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2(0,0),camera);assert.ok(ray.intersectObject(sprite).length);
 const controller=createActorLighting({scene,camera,renderer:{shadowMap:{enabled:true}},map:{nav:{}}});controller.update();const s=controller.actors.get(sprite);assert.ok(s.proxy.castShadow&&s.proxy.receiveShadow);assert.equal(sprite.visible,true);assert.equal(sprite.material.visible,true);assert.equal(sprite.layers.mask,1);assert.ok(ray.intersectObject(sprite).length);
 s.proxy.geometry.computeBoundingBox();assert.ok(Math.abs(s.proxy.geometry.boundingBox.min.y)<1e-6);assert.equal(s.proxy.geometry.boundingBox.max.y,1);
 const reused=s.proxy.geometry;sprite.center.set(.45,.1);sprite.renderOrder=6;sprite.material.depthTest=false;sprite.layers.set(2);controller.update();assert.equal(s.proxy.geometry,reused);assert.ok(Math.abs(s.proxy.geometry.boundingBox.min.y+.1)<1e-6);assert.equal(s.lit.depthTest,false);assert.equal(s.proxy.renderOrder,6);assert.equal(s.proxy.layers.mask,1<<2);assert.equal(sprite.layers.mask,1<<2);sprite.layers.set(0);
 const next=new THREE.Texture();sprite.material.map=next;sprite.material.opacity=.4;sprite.material.transparent=true;controller.update();assert.equal(s.lit.map,next);assert.equal(s.lit.opacity,.4);assert.equal(s.lit.transparent,true);
 sprite.material=sprite.material.clone();controller.update();assert.equal(s.lit.depthWrite,true);controller.dispose();assert.equal(sprite.material.depthWrite,true);assert.equal(sprite.material.colorWrite,true);assert.equal(material.depthWrite,true);
});
test('posed mesh geometry remains owned by playback; hidden/dead/removed actors and low contact shadows synchronize',()=>{
 const scene=new THREE.Scene(),camera=new THREE.Camera(),renderer={shadowMap:{enabled:false}},geometry=new THREE.PlaneGeometry(),mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({map:new THREE.Texture(),alphaTest:.45}));scene.add(mesh);let disposals=0;geometry.addEventListener('dispose',()=>disposals++);
 const controller=createActorLighting({scene,camera,renderer,map:{nav:{}}});controller.update();const s=controller.actors.get(mesh);assert.equal(s.proxy.geometry,geometry);assert.equal(s.foot.visible,true);
 geometry.attributes.position.setX(0,-2);controller.update();assert.equal(s.proxy.geometry.attributes.position.getX(0),-2);
 mesh.visible=false;controller.update();assert.equal(s.proxy.visible,false);assert.equal(s.foot.visible,false);
 scene.remove(mesh);controller.update();assert.equal(controller.actors.size,0);assert.equal(disposals,0);assert.equal(mesh.material.depthWrite,true);controller.dispose();
});
test('shared actor materials restore only after their last user, and UI labels are excluded',()=>{
 const scene=new THREE.Scene(),camera=new THREE.Camera(),m=new THREE.SpriteMaterial({map:new THREE.Texture(),alphaTest:.4}),a=new THREE.Sprite(m),b=new THREE.Sprite(m);scene.add(a,b);
 const label=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.Texture(),alphaTest:.4,fog:false,toneMapped:false}));scene.add(label);assert.equal(isWorldActor(label),false);
 const controller=createActorLighting({scene,camera,renderer:{shadowMap:{enabled:true}},map:{nav:{}}});controller.update();assert.equal(controller.actors.size,2);scene.remove(a);controller.update();assert.equal(m.colorWrite,false);scene.remove(b);controller.update();assert.equal(m.colorWrite,true);assert.equal(m.depthWrite,true);controller.dispose();
});
