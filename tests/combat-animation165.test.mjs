import test from 'node:test';
import assert from 'node:assert/strict';
import {ALL_PROFILES,sampleSkill} from '../assets/skill-polish/library-profiles.js';
import {roleTiming,basicTiming} from '../combat-timing.js';
import {createRoleAnimation,roleAnimationActive,roleEffectTime,sampleRolePose,sampleRoleEffect,ageQueuedCombatEvent} from '../combat-animation165.js';
import {createPaintedAvatar} from '../painted-avatar.js';
import {characterMotion} from '../character-motion.js';
import {skillPose,skillTrack} from '../skill-choreography.js';

const active=ALL_PROFILES.filter(p=>!p.passive),classes=['novice','swordsman','lancer','hunter','boxer','rogue','shaman','acolyte'];
const event=p=>({roleSkillId:p.id,castId:19,lag:.07,timing:roleTiming({type:p.skill.kind,windup:p.skill.windup},p)});

test('all 84 base/Master skills use the same advertised release clock for body and effect',()=>{
 assert.equal(active.length,84);
 for(const p of active){
  const e=event(p),a=createRoleAnimation(e,10),bodyEnd=a.start+a.duration,release=a.impacts.at(-1);
  assert.equal(a.start,9.93);assert.equal(sampleRolePose(a,a.start-.001),null);assert.equal(sampleRolePose(a,bodyEnd),null);assert.equal(roleAnimationActive(a,bodyEnd),false);
  for(const [i,at]of a.impacts.entries()){
   const authored=p.impacts[Math.min(i,p.impacts.length-1)]??.8;assert.ok(Math.abs(roleEffectTime(a,at)-authored)<1e-9,p.id+' release '+i);
   const pose=sampleRolePose(a,a.start+at),fx=sampleRoleEffect(a,at);assert.equal(pose.mode,'cast');assert.equal(pose.profileFrame,true);assert.ok(Number.isInteger(pose.artFrame)&&pose.artFrame>=0&&pose.artFrame<12);assert.equal(fx.time,authored);assert.equal(fx.heroX,-2);assert.equal(fx.heroZ,0);
  }
  const recover=sampleRolePose(a,a.start+release+(a.duration-release)*.95);assert.equal(recover.artFrame,0,p.id+' finishes recovery');
  const tail=sampleRoleEffect(a,a.duration+.2);assert.ok(tail.time< p.duration,p.id+' particles can outlast body recovery');
  assert.equal(sampleRolePose(a,a.start+release,{reduced:true}).artFrame,0);
 }
});

test('server timing overrides and delivery lag retime effects and poses without restarting or changing damage rules',()=>{
 const p=active.find(p=>p.id==='mae-mai'),original=JSON.stringify(p),e=event(p);e.timing={...e.timing,impacts:[.2,.4,.7],duration:.86};
 const local=createRoleAnimation(e,4),remote=createRoleAnimation({...e,lag:.19},4.12);
 for(let age=.01;age<.86;age+=.02){const l=sampleRolePose(local,local.start+age),r=sampleRolePose(remote,remote.start+age);assert.equal(l.artFrame,r.artFrame);assert.ok(Math.abs(l.time-r.time)<1e-9);}
 for(const [i,at]of e.timing.impacts.entries())assert.equal(roleEffectTime(local,at),p.impacts[i]);
 assert.equal(JSON.stringify(p),original);assert.equal(createRoleAnimation({roleSkillId:'unknown'},0),null);
 const retained=createRoleAnimation(event(p),0);assert.equal(roleAnimationActive(retained,.4),true);assert.equal(sampleRolePose(retained,.4).profileFrame,true);
});

const cell=label=>({width:320,height:320,label});
const directional=()=>({frames:Object.fromEntries(['male','female'].map(g=>[g,Object.fromEntries(['S','SW','W','NW','N','NE','E','SE'].map(d=>[d,{width:192,height:192,label:g+'/'+d}]))])),footV:180/192,manifest:{cell:192,anchor:[96,180]}});
const loaders={
 paintedArtLoader:async id=>Object.fromEntries(['male','female'].map(g=>[g,Array.from({length:36},(_,i)=>cell(id+'/'+g+'/'+i))])),
 lifeArtLoader:async id=>({clips:{idle:{frames:[cell(id+'/idle')],fps:1},cast:{frames:[cell(id+'/generic-cast')],fps:1},attack:{frames:Array.from({length:4},(_,i)=>cell(id+'/attack'+i)),fps:8}}}),
 directionalArtLoader:async()=>directional()
};

test('every profession and gender renders authored skill pixels instead of directional or generic cast art',async()=>{
 for(const classId of classes)for(const gender of ['male','female']){
  const mesh=createPaintedAvatar(null,{...loaders,classId,gender,directional:true});await mesh.userData.ready;
  mesh.userData.pose(characterMotion({classId,mode:'idle'}));assert.equal(mesh.userData.directionalActive,true);
  for(const profile of active.filter(p=>p.classId===classId)){
   const a=createRoleAnimation(event(profile),0);
   for(const at of [.1,...a.impacts,a.duration-.01]){
    const pose=sampleRolePose(a,a.start+at);mesh.userData.setFacing({x:-1,z:0},0,{mode:'idle',time:100});mesh.userData.pose(pose,true);
    assert.equal(mesh.userData.directionalActive,false,profile.id);assert.equal(mesh.material.visible,true);assert.equal(mesh.userData.lifeAction,null);assert.equal(mesh.material.map.image.label,classId+'/'+gender+'/'+pose.artFrame);
   }
  }
  // The Novice and older skill tracks must bypass an available generic cast clip too.
  for(let i=0;i<10;i++){const p=skillPose(classId,i,skillTrack(classId,i).duration*.5);mesh.userData.pose(p);assert.equal(p.profileFrame,true);assert.equal(mesh.material.map.image.label,classId+'/'+gender+'/'+p.artFrame);assert.equal(mesh.userData.directionalActive,false);}
  // An ordinary high-ASPD attack uses normalized progress in its authored action clip.
  const timing=basicTiming(classId,.2),pose={...characterMotion({classId,mode:'attack',time:.1}),actionPhase:.8};mesh.userData.pose(pose);assert.equal(mesh.userData.directionalActive,false);if(classId==='novice'){assert.equal(mesh.userData.lifeAction,null);assert.equal(mesh.material.map.image.label,classId+'/'+gender+'/'+pose.artFrame);}else{assert.equal(mesh.userData.lifeAction,'attack');assert.equal(mesh.userData.lifeFrame,3);}assert.ok(timing.duration<=.18+.00001);
  mesh.userData.pose(characterMotion({classId,mode:'idle'}));assert.equal(mesh.userData.directionalActive,true);assert.equal(mesh.material.visible,false);mesh.userData.dispose();
 }
});

test('in-world effect origins remain attached to the caster while the approved preview keeps its authored lunge',()=>{
 const p=active.find(p=>p.id==='flying-knee'),a=createRoleAnimation(event(p),0),t=p.impacts[0];
 assert.ok(sampleSkill(p.id,t).heroX>-2);assert.equal(sampleRoleEffect(a,t).heroX,-2);assert.equal(sampleRoleEffect(a,t).heroZ,0);
 assert.equal(sampleRoleEffect(a,t).heroY,sampleRolePose(a,a.start+t).y);
});

test('the local render queue includes its extra frame in delivery age instead of starting later than remote actors',()=>{
 const raw={...event(active[0]),lag:.02,presentationQueuedAt:5},aged=ageQueuedCombatEvent(raw,5.066);
 assert.ok(Math.abs(aged.lag-.086)<1e-9);assert.equal(aged.presentationQueuedAt,undefined);assert.equal(raw.lag,.02);
 const self=createRoleAnimation(aged,10.066),remote=createRoleAnimation({...raw,lag:.02},10);
 assert.ok(Math.abs(self.start-remote.start)<1e-9);assert.equal(ageQueuedCombatEvent(aged,100),aged,'already aged events cannot age twice');
});
