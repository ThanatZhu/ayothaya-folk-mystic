import * as THREE from './vendor/build/three.module.js';
import {CombatWorld} from './combat-core.js?v=surfaces222';
import {createRiggedSprite} from './rigged-sprite.js?v=novice174';
import {characterMotion} from './character-motion.js?v=novice174';
import {skillPose,skillTrack} from './skill-choreography.js?v=novice174';
import {createSpiritCompanionVfx} from './spirit-companion-vfx.js?v=surfaces222';

const $=id=>document.getElementById(id),reduced=matchMedia('(prefers-reduced-motion:reduce)'),stage=$('stage');
const nav={zones:[{x:-18,z:-16,w:36,d:32}],obstacles:[],props:[]};
const world=new CombatWorld({nav,spawn:{x:-2,z:.7},mobs:[[3,0,0]],classId:'shaman',jobId:'spirit-master',roleSkills:true});world.spiritPrototype=true;world.roleOwnerId='lab-shaman';
world.player.hp=world.player.maxHp=1000;world.player.mp=world.player.maxMp=1000;world.heroName='หมอผีอโยธยา';
const dummy=world.mobs[0];Object.assign(dummy,{x:3,z:0,hp:1200,maxHp:1200,home:{x:3,z:0}});
const skillIndex=world.skills.findIndex(s=>s.type==='greatSpirit'),skill=world.skills[skillIndex];world.skillLevels[skillIndex]=1;
let walking=false,attacking=false,loaded=false,disposed=false,castAt=-100,last=0,damageFlash=-100,phaseUntil=0,walkIndex=0,demo=false,walkPhase=0,paused=false;
const walkPoints=[{x:-3.8,z:1.7},{x:-2.6,z:-1.4},{x:-.2,z:-.7},{x:-1.1,z:2.2}],ownedGeometry=[],ownedMaterials=[],ownedTextures=[],numbers=[],eventHistory=[];
const scene=new THREE.Scene();scene.background=new THREE.Color('#3e5545');scene.fog=new THREE.Fog('#3e5545',20,45);
const camera=new THREE.OrthographicCamera(-9,9,5,-5,.1,90);camera.position.set(0,11,15);camera.lookAt(0,.7,0);
let renderer;try{renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'low-power'});}catch(error){$('load-status').textContent='เบราว์เซอร์นี้เปิดกราฟิกไม่ได้ ลองเปิดใน Safari หรือ Chrome รุ่นปัจจุบัน';throw error;}
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));stage.prepend(renderer.domElement);
scene.add(new THREE.HemisphereLight('#fff2cd','#436448',2));const sunlight=new THREE.DirectionalLight('#ffe0a5',1.4);sunlight.position.set(-5,10,5);scene.add(sunlight);
const ownMat=m=>(ownedMaterials.push(m),m),ownGeo=g=>(ownedGeometry.push(g),g),loader=new THREE.TextureLoader();
const groundMaterial=ownMat(new THREE.MeshLambertMaterial({color:'#d2d8b8'})),ground=new THREE.Mesh(ownGeo(new THREE.PlaneGeometry(100,100)),groundMaterial);ground.rotation.x=-Math.PI/2;ground.position.y=-.04;scene.add(ground);
function radialTexture(inner='rgba(1,12,6,.45)',outer='rgba(0,0,0,0)'){
 const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d'),g=ctx.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,inner);g.addColorStop(.45,inner);g.addColorStop(1,outer);ctx.fillStyle=g;ctx.fillRect(0,0,128,128);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;ownedTextures.push(t);return t;
}
const shadowMap=radialTexture(),softShadow=(x,z,sx,sz,opacity=.6)=>{const m=new THREE.Mesh(ownGeo(new THREE.PlaneGeometry(1,1)),ownMat(new THREE.MeshBasicMaterial({map:shadowMap,transparent:true,opacity,depthWrite:false})));m.rotation.x=-Math.PI/2;m.position.set(x,.012,z);m.scale.set(sx,sz,1);scene.add(m);return m;};
const hero=createRiggedSprite(null,{classId:'shaman',gender:'male'});hero.scale.set(2.9,2.9,1);hero.visible=false;scene.add(hero);const heroShadow=softShadow(world.player.x,world.player.z,1.1,.62,.7);
const dummyMaterial=ownMat(new THREE.SpriteMaterial({transparent:true,alphaTest:.2,depthWrite:true})),dummySprite=new THREE.Sprite(dummyMaterial);dummySprite.center.set(.5,.12);dummySprite.scale.setScalar(2.7);dummySprite.position.set(dummy.x,.02,dummy.z);dummySprite.visible=false;scene.add(dummySprite);softShadow(dummy.x,dummy.z,1.6,.85,.75);
const targetRing=new THREE.Mesh(ownGeo(new THREE.RingGeometry(.66,.7,48)),ownMat(new THREE.MeshBasicMaterial({color:'#e6cf7c',transparent:true,opacity:.55,side:THREE.DoubleSide,depthWrite:false})));targetRing.rotation.x=-Math.PI/2;targetRing.position.set(dummy.x,.025,dummy.z);scene.add(targetRing);
// Small plants and warm lanterns frame the clearing without covering the demonstration.
const grassMaterials=['#597f4a','#73934c','#8eaa5e'].map(color=>ownMat(new THREE.MeshLambertMaterial({color,side:THREE.DoubleSide})));
const leafGeo=ownGeo(new THREE.PlaneGeometry(.12,.65));leafGeo.translate(0,.325,0);
let seed=182;function rand(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
const grassMeshes=grassMaterials.map(material=>{const m=new THREE.InstancedMesh(leafGeo,material,400);m.count=0;scene.add(m);return m;}),grassTransform=new THREE.Object3D();
for(let i=0;i<250;i++){
 const x=(rand()-.5)*30,z=(rand()-.5)*23;if(Math.hypot(x*.75,z)<5.6)continue;
 for(let j=0;j<4;j++){const m=grassMeshes[(i+j)%3];grassTransform.position.set(x,0,z);grassTransform.rotation.set((rand()-.5)*.5,j*1.7,(rand()-.5)*.6);grassTransform.scale.set(.8+rand(),.55+rand()*.65,1);grassTransform.updateMatrix();m.setMatrixAt(m.count++,grassTransform.matrix);}
}
for(const m of grassMeshes)m.instanceMatrix.needsUpdate=true;
const bark=ownMat(new THREE.MeshLambertMaterial({color:'#5e4a31'})),foliage=ownMat(new THREE.MeshLambertMaterial({color:'#3b6546'}));
for(const [x,z,h] of [[-9,-5,4],[8,-6,4.8],[-11,4,4.2],[11,1,4.3],[-4,-9,5],[4,-11,4.7]]){
 const trunk=new THREE.Mesh(ownGeo(new THREE.CylinderGeometry(.14,.32,h,7)),bark);trunk.position.set(x,h/2,z);scene.add(trunk);softShadow(x+.6,z+.1,3.6,1.6,.4);
 for(let k=0;k<3;k++){const crown=new THREE.Mesh(ownGeo(new THREE.IcosahedronGeometry(1.5+k*.16,1)),foliage);crown.position.set(x+Math.sin(k*2)*.8,h-.1+k*.4,z+Math.cos(k*2)*.6);crown.scale.set(1.35,.65,1);scene.add(crown);}
}
const lanternGlow=radialTexture('rgba(255,192,70,.34)');
for(const [x,z] of [[-5.6,-1.5],[5.7,-2.4]]){
 const post=new THREE.Mesh(ownGeo(new THREE.CylinderGeometry(.045,.065,1.75,7)),bark);post.position.set(x,.875,z);scene.add(post);
 const lantern=new THREE.Mesh(ownGeo(new THREE.BoxGeometry(.28,.42,.28)),ownMat(new THREE.MeshBasicMaterial({color:'#ffdb8f'})));lantern.position.set(x,1.7,z);scene.add(lantern);
 const glow=new THREE.Sprite(ownMat(new THREE.SpriteMaterial({map:lanternGlow,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending})));glow.position.set(x,1.7,z);glow.scale.set(2.3,2.3,1);scene.add(glow);
}
const vfx=createSpiritCompanionVfx(scene,world),project=new THREE.Vector3();
function projectAt(x,y,z){project.set(x,y,z).project(camera);const r=stage.getBoundingClientRect();return {x:(project.x+1)*r.width/2,y:(1-project.y)*r.height/2};}
function phase(text,seconds=1.2){$('phase').textContent=text;phaseUntil=world.time+seconds;}
function event(e){
 vfx.handleEvent(e);eventHistory.push({...e,labTime:world.time});if(eventHistory.length>150)eventHistory.shift();
 if(e.type==='spiritSummon')phase('พรายปรากฏตัว · พร้อมคุ้มกาย',1.5);
 if(e.type==='spiritShot')phase('ปล่อยลูกไฟพราย →',e.duration??.3);
 if(e.type==='spiritImpact'){phase(e.hit?'ลูกไฟกระทบ · ดาเมจทำงานตรงจังหวะ':'เป้าหมายหายไป · ลูกไฟสลาย',.6);if(e.hit)damageFlash=world.time;}
 if(e.type==='damage'){
  const p=projectAt(e.x,1.8,e.z),node=document.createElement('span');node.className='damage-number'+(e.source==='spirit'?' spirit-damage':'');node.dataset.damageSource=e.source??'player';if(e.source==='spirit'){const label=document.createElement('small');label.textContent='พราย';node.append(label,document.createTextNode(Math.round(e.amount)));}else node.textContent=Math.round(e.amount);node.style.left=p.x+'px';node.style.top=p.y+'px';$('damage-layer').append(node);numbers.push({node,left:.75});
 }
}
function summon(){
 if(!loaded)return false;world.cooldowns[skillIndex]=0;world.player.mp=world.player.maxMp;world.roleCombat.state.pending=null;
 const ok=world.skill(skillIndex);if(ok){castAt=world.time;phase('หมอผีกำลังเรียกพราย…',1);$('status').textContent='วงยันต์รวมขวัญ → พรายปรากฏตัว → ลอยคุ้มกายเจ้าของ';}return ok;
}
function setAttack(value){attacking=value;world.targetId=value?dummy.id:null;$('attack').setAttribute('aria-pressed',String(value));if(value){if(!world.roleCombat.state.pets.length&&!world.roleCombat.state.pending)summon();$('status').textContent='พรายยิงทุก 1.2 วินาที · เลขดาเมจขึ้นเมื่อลูกไฟถึงเป้าหมายจริง';}else $('status').textContent='หยุดโจมตี · พรายกลับมาลอยคุ้มกายข้างเจ้าของ';}
function setWalk(value){walking=value;$('follow').setAttribute('aria-pressed',String(value));if(value){if(!world.roleCombat.state.pets.length&&!world.roleCombat.state.pending)summon();$('status').textContent='ลองดูพรายลอยตามข้างไหล่ ขณะเจ้าของเดินเปลี่ยนตำแหน่ง';}}
function reset(){
 demo=false;walking=false;attacking=false;world.targetId=null;world.auto=false;world.path=[];world.status={};world.cooldowns.fill(0);world.roleCombat.state.pets=[];world.roleCombat.state.spiritShots=[];world.roleCombat.state.pending=null;world.roleCombat.state.shield=0;world.events=[];
 Object.assign(world.player,{x:-2,z:.7,hp:1000,mp:1000,moving:false,attackCD:0,face:{x:1,z:0}});Object.assign(dummy,{x:3,z:0,hp:1200,maxHp:1200,hit:0,dead:0,roleStatus:{}});castAt=-100;walkIndex=0;
 $('attack').setAttribute('aria-pressed','false');$('follow').setAttribute('aria-pressed','false');numbers.splice(0).forEach(n=>n.node.remove());phase('พร้อมเรียกพราย',1);$('status').textContent='เรียกพราย แล้วกดสั่งโจมตีเพื่อดูจังหวะลูกไฟกระทบเป้าหมาย';
}
let demoStarted=0;
function playDemo(){reset();demo=true;demoStarted=world.time;summon();}
$('summon').onclick=summon;$('attack').onclick=()=>{demo=false;setAttack(!attacking);};$('target-label').onclick=()=>{demo=false;setAttack(!attacking);};$('follow').onclick=()=>{demo=false;setWalk(!walking);};$('reset').onclick=reset;$('replay').onclick=playDemo;
function resize(){const r=stage.getBoundingClientRect();if(!r.width||!r.height)return;const height=r.width<500?11.5:9.2;camera.top=height/2;camera.bottom=-height/2;camera.right=height*r.width/r.height/2;camera.left=-camera.right;camera.updateProjectionMatrix();renderer.setSize(r.width,r.height);}
const observer=new ResizeObserver(resize);observer.observe(stage);resize();
function ui(){
 const pet=world.roleCombat.state.pets.find(p=>p.kind==='spirit'&&p.left>0),left=pet?.left??0;
 $('companion-state').textContent=pet?'พรายคุ้มกายติดตามอยู่':world.roleCombat.state.pending?'กำลังเรียกพราย…':'ยังไม่มีพรายติดตาม';$('life-time').textContent=pet?Math.ceil(left)+' วิ':'—';$('life-fill').style.width=Math.max(0,left/skill.seconds*100)+'%';$('shield-status').textContent=world.roleCombat.state.shield>0?'โล่คุ้มกาย '+Math.ceil(world.roleCombat.state.shield):'เรียกพรายเพื่อรับโล่คุ้มกาย';
 $('target-hp').textContent=Math.ceil(dummy.hp).toLocaleString()+' / '+dummy.maxHp.toLocaleString();$('target-fill').style.width=(dummy.hp/dummy.maxHp*100)+'%';$('target-label').classList.toggle('hit',world.time-damageFlash<.17);
 if(world.time>phaseUntil)$('phase').textContent=pet?(attacking?'พรายพร้อมยิงช่วยเจ้าของ':walking?'พรายกำลังลอยตามเจ้าของ':'พรายลอยคุ้มกายอยู่ข้างไหล่'):'พร้อมเรียกพราย';
 const hp=projectAt(world.player.x,2.5,world.player.z),tp=projectAt(dummy.x,2.5,dummy.z);$('hero-label').style.left=hp.x+'px';$('hero-label').style.top=hp.y+'px';$('target-label').style.left=tp.x+'px';$('target-label').style.top=tp.y+'px';
}
renderer.setAnimationLoop(ms=>{
 const dt=last?Math.min(.05,(ms-last)/1000):0;last=ms;if(!loaded||disposed||document.hidden)return;if(paused){renderer.render(scene,camera);return;}
 if(demo){const t=world.time-demoStarted;if(t>1.9&&!attacking)setAttack(true);if(t>5.2&&!walking)setWalk(true);if(t>10.5)demo=false;}
 let direction={x:0,z:0,attack:false};if(walking){const to=walkPoints[walkIndex%walkPoints.length],dx=to.x-world.player.x,dz=to.z-world.player.z,d=Math.hypot(dx,dz);if(d<.15)walkIndex++;else direction={x:dx/d,z:dz/d,attack:false};}
 const before={x:world.player.x,z:world.player.z};world.update(dt,direction,{monsters:false});walkPhase+=Math.hypot(world.player.x-before.x,world.player.z-before.z)*1.1;
 for(const e of world.events.splice(0))event(e);
 if(dummy.hp<=0){setAttack(false);phase('เป้าฝึกล้มแล้ว · กดเริ่มใหม่เพื่อทดลองอีกครั้ง',10);}
 hero.position.set(world.player.x,0,world.player.z);heroShadow.position.set(world.player.x,.012,world.player.z);dummySprite.position.set(dummy.x,.02,dummy.z);dummyMaterial.color.setRGB(1,world.time-damageFlash<.15?.75:1,world.time-damageFlash<.15?.7:1);
 const castTime=world.time-castAt,track=skillTrack('shaman',8);
 if(castTime<1.05)hero.userData.pose(skillPose('shaman',8,Math.min(track.duration,castTime*track.duration/1.05),{reduced:reduced.matches}),false);else hero.userData.pose(characterMotion({classId:'shaman',mode:world.player.moving?'walk':'idle',time:world.time,phase:walkPhase,reduced:reduced.matches}),world.player.face.x<0);
 targetRing.material.opacity=attacking?.8:.32;targetRing.scale.setScalar(attacking?1+Math.sin(world.time*3)*.035:1);
 vfx.update(dt);for(let i=numbers.length-1;i>=0;i--)if((numbers[i].left-=dt)<=0){numbers[i].node.remove();numbers.splice(i,1);}ui();renderer.render(scene,camera);
});
try{
 const terrain=await loader.loadAsync('./assets/capital-materials19.png');terrain.colorSpace=THREE.SRGBColorSpace;terrain.minFilter=THREE.LinearFilter;ownedTextures.push(terrain);
 groundMaterial.onBeforeCompile=shader=>{shader.uniforms.terrainAtlas={value:terrain};shader.vertexShader='varying vec2 groundXZ;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ngroundXZ=(modelMatrix*vec4(transformed,1.)).xz;');shader.fragmentShader='varying vec2 groundXZ;uniform sampler2D terrainAtlas;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>\nvec2 p=groundXZ;float edge=sin(p.x*.7)*.35+sin(p.y*1.1+p.x)*.25;float meadow=smoothstep(3.5,6.7,length(p*vec2(.72,1.))+edge);vec3 grass=texture2D(terrainAtlas,vec2(.005,.505)+fract(p/5.)*.49).rgb;vec3 dirt=texture2D(terrainAtlas,vec2(.505,.505)+fract(p/6.)*.49).rgb;diffuseColor.rgb*=mix(dirt,grass,meadow)*.82;`);};groundMaterial.needsUpdate=true;
 const monster=await loader.loadAsync('./assets/monsters.png');monster.colorSpace=THREE.SRGBColorSpace;monster.repeat.set(.5,.5);monster.offset.set(0,.5);ownedTextures.push(monster);dummyMaterial.map=monster;dummyMaterial.needsUpdate=true;
 await Promise.all([hero.userData.ready,vfx.ready]);if(vfx.metrics.error)throw Error(vfx.metrics.error);if(hero.userData.artError)throw Error(hero.userData.artError);hero.visible=dummySprite.visible=true;loaded=true;$('loading').hidden=true;document.body.dataset.ready='true';
}catch(error){console.error(error);$('load-status').textContent='เตรียมภาพไม่สำเร็จ · '+error.message;document.body.dataset.ready='error';}
function dispose(){if(disposed)return;disposed=true;renderer.setAnimationLoop(null);observer.disconnect();hero.userData.dispose();vfx.dispose();ownedGeometry.forEach(g=>g.dispose());ownedMaterials.forEach(m=>m.dispose());ownedTextures.forEach(t=>t.dispose());renderer.dispose();}
addEventListener('pagehide',e=>{if(!e.persisted)dispose();});
window.__spiritLab={pause(value=true){paused=!!value;},world,scene,camera,renderer,vfx,actions:{summon,attack:()=>setAttack(true),stop:()=>setAttack(false),walk:()=>setWalk(true),reset,demo:playDemo},get loaded(){return loaded;},get events(){return [...eventHistory];},get metrics(){return {textures:renderer.info.memory.textures,geometries:renderer.info.memory.geometries,drawCalls:renderer.info.render.calls,vfx:vfx.metrics};}};
