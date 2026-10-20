import test from 'node:test';
import assert from 'node:assert/strict';
import {createRiggedSprite} from '../rigged-sprite.js';
import {createPaintedAvatar} from '../painted-avatar.js';
import {characterMotion} from '../character-motion.js';
import {skillPose,skillTrack} from '../skill-choreography.js';

const cell=label=>({width:320,height:320,label});
const painted=id=>Object.fromEntries(['male','female'].map(g=>[g,Array.from({length:20},(_,i)=>cell(id+'/'+g+'/'+i))]));
function life(id){const still=cell(id+'/still');return {clips:{idle:{frames:[still,still],fps:1},sit:{frames:[still],fps:1},sleep:{frames:[still],fps:1},run:{frames:[cell(id+'/run0'),cell(id+'/run1')],fps:2}}};}
const loaders={paintedArtLoader:async id=>painted(id),lifeArtLoader:async id=>life(id)};
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
const directional=()=>({frames:Object.fromEntries(['male','female'].map(g=>[g,Object.fromEntries(['S','SW','W','NW','N','NE','E','SE'].map(d=>[d,{width:192,height:192,label:g+'/'+d}]))])),footV:180/192,manifest:{cell:192,anchor:[96,180]}});

test('shared authored frames release once across clips; repeated disposal and poses cannot revive resources',async()=>{
 const mesh=createRiggedSprite(null,loaders);await mesh.userData.ready;
 assert.equal(mesh.userData.supportsAction('sleep'),true);
 mesh.userData.pose(characterMotion({mode:'sit'}));const shared=mesh.material.map;let textures=0,geometry=0,materials=0;
 shared.addEventListener('dispose',()=>textures++);mesh.geometry.addEventListener('dispose',()=>geometry++);mesh.material.addEventListener('dispose',()=>materials++);
 mesh.userData.pose(characterMotion({mode:'sleep'}));assert.equal(mesh.material.map,shared);
 mesh.userData.pose(characterMotion({mode:'idle',time:.1}));assert.equal(mesh.material.map,shared);
 mesh.userData.dispose();mesh.userData.dispose();assert.deepEqual([textures,geometry,materials],[1,1,1]);
 mesh.userData.pose(characterMotion({mode:'run'}));assert.equal(mesh.material.map,shared);assert.equal(await mesh.userData.setRig('hunter','male'),false);
});

test('failed appearance/class loads preserve usable old pixels and a late failure cannot mark the latest art broken',async t=>{
 t.mock.method(console,'error',()=>{});const requests=new Map();
 const mesh=createRiggedSprite(null,{...loaders,paintedArtLoader:(id,look)=>id==='novice'&&!look.bad?Promise.resolve(painted(id)):(requests.set(id,deferred()),requests.get(id).promise)});await mesh.userData.ready;
 mesh.userData.pose(characterMotion({mode:'walk',phase:0}));const old=mesh.material.map;let disposed=0;old.addEventListener('dispose',()=>disposed++);
 const appearance=mesh.userData.setAppearance({bad:true});assert.equal(mesh.material.map,old);assert.equal(disposed,0);requests.get('novice').reject(new Error('missing look'));await appearance;assert.equal(mesh.material.map,old);assert.equal(disposed,0);assert.equal(mesh.userData.supportsAction('sit'),true);
 const older=mesh.userData.setRig('lancer','male'),latest=mesh.userData.setRig('hunter','male');requests.get('hunter').resolve(painted('hunter'));await latest;
 const newest=mesh.material.map;assert.ok(newest.image.label.startsWith('hunter/'));assert.equal(disposed,1);
 requests.get('lancer').reject(new Error('stale failure'));await older;assert.equal(mesh.material.map,newest);assert.equal(mesh.userData.artError,undefined);assert.equal(mesh.userData.artReady,true);mesh.userData.dispose();
});

test('equipment swaps keep the previous full artwork until ready, honor the latest request and ignore post-disposal completion',async()=>{
 const pending=new Map(),mesh=createRiggedSprite(null,{...loaders,paintedArtLoader:(id,look,gear)=>!gear?Promise.resolve(painted(id)):(pending.set(gear,deferred()),pending.get(gear).promise)});await mesh.userData.ready;
 const initial=mesh.material.map,first=mesh.userData.setEquipment('first'),second=mesh.userData.setEquipment('second');assert.equal(mesh.material.map,initial);
 pending.get('second').resolve(painted('second'));assert.equal(await second,true);const shown=mesh.material.map;assert.ok(shown.image.label.startsWith('second/'));
 pending.get('first').resolve(painted('first'));assert.equal(await first,false);assert.equal(mesh.material.map,shown);
 const late=mesh.userData.setEquipment('late');let count=0;shown.addEventListener('dispose',()=>count++);mesh.userData.dispose();pending.get('late').resolve(painted('late'));assert.equal(await late,false);assert.equal(count,1);assert.equal(mesh.material.map,shown);
});

test('authored run samples distance phase, while missing clips never claim capabilities',async()=>{
 const mesh=createRiggedSprite(null,loaders);await mesh.userData.ready;
 for(const [phase,index] of [[0,0],[.49,0],[.5,1],[.99,1]]){
  mesh.userData.pose(characterMotion({mode:'run',phase,time:0}));const first=mesh.material.map;assert.equal(mesh.userData.lifeFrame,index);
  mesh.userData.pose(characterMotion({mode:'run',phase,time:100}));assert.equal(mesh.material.map,first);
 }
 mesh.userData.pose(characterMotion({mode:'run',phase:.75,reduced:true}));assert.equal(mesh.userData.lifeFrame,0);mesh.userData.dispose();
 const absent=createRiggedSprite(null,{...loaders,lifeArtLoader:async()=>null});await absent.userData.ready;
 for(const mode of ['run','sit','sleep'])assert.equal(absent.userData.supportsAction(mode),false);absent.userData.dispose();
});

test('cast metadata keeps idle artwork out of all skill endpoints and active frames',async()=>{
 const mesh=createRiggedSprite(null,loaders);await mesh.userData.ready;
 for(const time of [0,.1,.4,skillTrack('novice',0).duration]){
  const p=skillPose('novice',0,time);mesh.userData.pose(p);assert.equal(p.mode,'cast');assert.equal(mesh.userData.lifeAction,null);assert.equal(mesh.material.map.image.label,'novice/male/'+p.artFrame);
 }
 mesh.userData.dispose();
});

test('directional avatars use authored run/sit/sleep even when pose is called without a facing update',async()=>{
 const mesh=createPaintedAvatar(null,{...loaders,directional:true,directionalArtLoader:async()=>directional()});await mesh.userData.ready;
 mesh.userData.pose(characterMotion({mode:'idle'}));assert.equal(mesh.userData.directionalActive,true);
 for(const mode of ['run','sit','sleep']){
  mesh.userData.pose(characterMotion({mode,time:.2,phase:.25}));assert.equal(mesh.userData.directionalActive,false);assert.equal(mesh.material.visible,true);assert.equal(mesh.userData.lifeAction,mode);
 }
 mesh.userData.pose(characterMotion({mode:'idle'}));assert.equal(mesh.userData.directionalActive,true);assert.equal(mesh.material.visible,false);mesh.userData.dispose();
});
