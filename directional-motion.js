// Procedural articulation of the painted turnaround art. These are rig poses,
// not newly authored walk/attack frames. Coordinates are normalized canvas UVs
// (x right, y down), shared by all eight views and their fixed sole baseline.
import {isClass} from './classes.js?v=novice174';
import {DIRECTIONS,viewDirection} from './directional-sprite.js';
import {sampleRig,transformPoint} from './character-rig.js';
import {attackDuration} from './character-motion.js?v=novice174';
import {DIRECTIONAL_LANDMARKS} from './directional-landmarks.js';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const finite=(v,fallback=0)=>Number.isFinite(v)?v:fallback;
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
const p=(x,y)=>({x,y});
const TAU=Math.PI*2;
export const DIRECTIONAL_RIG_MODES=['idle','walk','attack','cast','guard','hit','dash','bow','celebrate','rest'];

export function stableViewDirection(face,azimuth=0,previous='S',margin=Math.PI/36){
 const next=viewDirection(face,azimuth,previous),index=DIRECTIONS.indexOf(previous);
 if(index<0||!Number.isFinite(face?.x)||!Number.isFinite(face?.z)||!Number.isFinite(azimuth)||Math.hypot(face.x,face.z)<1e-6)return next;
 const right=face.x*Math.cos(azimuth)-face.z*Math.sin(azimuth),toward=face.x*Math.sin(azimuth)+face.z*Math.cos(azimuth);
 const delta=Math.atan2(Math.sin(Math.atan2(right,toward)-index*Math.PI/4),Math.cos(Math.atan2(right,toward)-index*Math.PI/4));
 return Math.abs(delta)<=Math.PI/8+clamp(finite(margin),0,Math.PI/12)?previous:next;
}

function polygonContains(x,y,polygon){let inside=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
 const [a,b]=polygon[i],[c,d]=polygon[j];if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)inside=!inside;
}return inside;}
function segmentDistance(q,a,b){const x=b.x-a.x,y=b.y-a.y,t=clamp(((q.x-a.x)*x+(q.y-a.y)*y)/(x*x+y*y||1),0,1);return Math.hypot(q.x-a.x-x*t,q.y-a.y-y*t);}
function nearPolygon(q,polygon,margin){
 if(polygonContains(q.x,q.y,polygon))return true;
 return polygon.some((a,i)=>segmentDistance(q,p(...a),p(...polygon[(i+1)%polygon.length]))<=margin);
}
function rect(x0,y0,x1,y1){return [[x0,y0],[x1,y0],[x1,y1],[x0,y1]];}

// Artist corrections may override nodes, headY, robe and rigid weapon polygons
// on manifest.frames[gender][direction].rig without changing the controller.
export function directionalRigDefinition(classId='novice',gender='male',direction='S',override={}){
 if(!isClass(classId))throw new Error('directional-rig-class');
 if(!['male','female'].includes(gender)||!DIRECTIONS.includes(direction))throw new Error('directional-rig-view');
 const measured=DIRECTIONAL_LANDMARKS[classId]?.[gender]?.[direction]??{};
 override={...measured,...override,nodes:{...measured.nodes,...override.nodes}};
 const index=DIRECTIONS.indexOf(direction),side=direction==='E'||direction==='W',rear=['NE','N','NW'].includes(direction),sign=index<4?1:-1;
 const center=.5,headY=classId==='shaman'?.49:classId==='lancer'?.50:.52;
 const hipWidth=side?.037:.080,sole=.9375;
 const nodes={pelvis:{parent:null,at:p(center,.755)},torso:{parent:'pelvis',at:p(center,.665)},head:{parent:'torso',at:p(center,headY)}};
 for(const [i,s] of ['L','R'].entries()){
  const k=i?1:-1,x=center+k*hipWidth;
  let shoulder=p(center+k*(side?.048:.102),.570),elbow=p(center+k*(side?.064:.160),.635),hand=p(center+k*(side?.074:.197),.670);
  if(classId==='boxer'){elbow.y=.660;hand=p(center+k*(side?.072:.125),.584);}
  if(classId==='acolyte'){elbow=p(center+k*.113,.645);hand=p(center+k*.043,.638);}
  if(side){shoulder.x+=sign*.008;elbow.x+=sign*.018;hand.x+=sign*.027;}
  if(classId==='swordsman'||classId==='lancer'||classId==='shaman'){
   const weapon=(rear?s==='R':s==='L');if(weapon){hand.y=.609;elbow.y=.620;if(!side)hand.x=center+k*.205;}
  }
  nodes['upper'+s]={parent:'torso',at:shoulder};nodes['lower'+s]={parent:'upper'+s,at:elbow};nodes['hand'+s]={parent:'lower'+s,at:hand};
  nodes['thigh'+s]={parent:'pelvis',at:p(x,.775)};nodes['shin'+s]={parent:'thigh'+s,at:p(x+k*.008,.855)};nodes['foot'+s]={parent:'shin'+s,at:p(x+k*.016,sole)};
 }
 const weapons=[];
 if(['swordsman','lancer','shaman'].includes(classId)){
  if(!side){const hand=rear?'handR':'handL',x=rear?.72:.28;
   weapons.push({bone:hand,polygon:rect(x-.075,.035,x+.065,.70)});
   if(classId==='swordsman')weapons.push({bone:rear?'handL':'handR',polygon:rect(rear?.20:.65,.565,rear?.35:.80,.775)});
  }else{
   // The narrow profile blade/staff must not pull the visible face with it.
   const x=direction==='E'?.527:.473;
   weapons.push({bone:rear?'handR':'handL',polygon:rect(x-.020,.17,x+.020,.62)});
  }
 }else if(classId==='hunter'){
  weapons.push({bone:rear?'handL':'handR',polygon:rect(rear?.17:.72,.33,rear?.29:.84,.84)});
 }else if(classId==='rogue'){
  weapons.push({bone:'handL',polygon:rect(.17,.50,.29,.76)},{bone:'handR',polygon:rect(.71,.50,.83,.76)});
 }
 for(const [name,point] of Object.entries(override.nodes??{})){
  if(!nodes[name]||!Array.isArray(point)||point.length!==2||!point.every(Number.isFinite))throw new Error('directional-rig-landmark');
  nodes[name]={...nodes[name],at:p(...point)};
 }
 const rigidRegions=override.weapons??weapons;
 if(!Array.isArray(rigidRegions)||rigidRegions.some(r=>!nodes[r.bone]||!Array.isArray(r.polygon)||r.polygon.length<3||r.polygon.some(q=>!Array.isArray(q)||q.length!==2||!q.every(Number.isFinite))))throw new Error('directional-rig-weapon-mask');
 return {classId,gender,direction,nodes,order:Object.keys(nodes),headY:finite(override.headY,headY),sole:finite(override.sole,sole),side,rear,
  robe:override.robe??classId==='acolyte',weapons:rigidRegions,headCore:override.headCore??rect(.36,.11,.64,headY-.018)};
}

export function directionalSkinWeights(rig,u,v){
 const n=rig.nodes,q=p(u,v),one=bone=>[[bone,1]];
 // Protect the central painted face/hair before testing overlapping weapon masks.
 if(polygonContains(u,v,rig.headCore))return one('head');
 // Include the surrounding grid vertices, not only pixels inside a thin blade.
 // Otherwise alternate triangles straddle head/weapon weights and saw the edge.
 const padding=['lancer','shaman'].includes(rig.classId)?.04:0;
 for(const region of rig.weapons)if(nearPolygon(q,region.polygon,padding))return one(region.bone);
 if(v<=rig.headY)return one('head');
 if(v<rig.headY+.04){const w=smooth(rig.headY,rig.headY+.04,v);return [['head',1-w],['torso',w]];}
 const weights={};const add=(bone,w)=>{if(w>1e-7)weights[bone]=(weights[bone]??0)+w;};
 if(v>.765&&!(rig.robe&&v<.897)){
  const center=n.pelvis.at.x,side=u<center?'L':'R',hip=n['thigh'+side].at,knee=n['shin'+side].at,foot=n['foot'+side].at;
  const split=smooth(.007,rig.side?.027:.045,Math.abs(u-center)),leg=smooth(.765,.805,v)*split;
  const shin=smooth(knee.y-.026,knee.y+.026,v),shoe=smooth(foot.y-.080,foot.y-.055,v);
  add('pelvis',1-leg);add('thigh'+side,leg*(1-shin));add('shin'+side,leg*shin*(1-shoe));add('foot'+side,leg*shin*shoe);
 }else{
  let strongest=null;
  for(const side of ['L','R']){
   const a=n['upper'+side].at,b=n['lower'+side].at,c=n['hand'+side].at;
   const d=Math.min(segmentDistance(q,a,b),segmentDistance(q,b,c));
   const outside=smooth(.055,.115,Math.abs(u-n.torso.at.x)),weight=(1-smooth(.030,.075,d))*outside*(1-smooth(.705,.77,v));
   if(!strongest||weight>strongest.weight)strongest={side,weight,a,b,c};
  }
  const {side,weight,a,b,c}=strongest;
  const upper=segmentDistance(q,a,b),lower=segmentDistance(q,b,c),blend=smooth(-.025,.025,upper-lower),hand=1-smooth(.025,.052,Math.hypot(u-c.x,v-c.y));
  add(v>.720?'pelvis':'torso',1-weight);add('upper'+side,weight*(1-blend)*(1-hand));add('lower'+side,weight*blend*(1-hand));add('hand'+side,weight*hand);
 }
 return Object.entries(weights);
}

export function directionalPose({classId='novice',direction='S',mode='idle',time=0,phase=null,reduced=false,pose=null}={}){
 const t=Math.max(0,finite(time)),q={body:0,crouch:0,lean:0,head:0,rotation:0,handLX:0,handLY:0,handRX:0,handRY:0,footLX:0,footLY:0,footRX:0,footRY:0,wristL:0,wristR:0};
 if(reduced)return q;
 const profile=DIRECTIONS.indexOf(direction),side=direction==='E'||direction==='W',rear=['NE','N','NW'].includes(direction),screen=profile>4?-1:1;
 const weaponOnRight=rear||(['lancer','shaman'].includes(classId)&&['W','SW'].includes(direction));
 if(mode==='walk'){
  const gait=finite(phase,t*1.65),stride=classId==='acolyte'?.011:side?.018:.019;
  for(const [i,s] of ['L','R'].entries()){
   const cycle=((gait+i*.5)%1+1)%1,swing=cycle<.5,a=swing?cycle*2:(cycle-.5)*2;
   q['foot'+s+'X']=(swing?-1+2*a:1-2*a)*stride*(side?screen:1);
   q['foot'+s+'Y']=swing?-Math.sin(a*Math.PI)*(classId==='acolyte'?.008:side?.012:.020):0;
   q['hand'+s+'X']=-Math.sin(cycle*TAU)*.010*(side?screen:1);q['hand'+s+'Y']=Math.sin(cycle*TAU)*.003;
  }
  q.crouch=.004+.003*Math.cos(gait*TAU*2);q.lean=side?.004*screen:0;
 }else if(mode==='attack'||mode==='cast'){
  const progress=clamp(t/(mode==='cast'?.85:attackDuration(classId)),0,1),load=smooth(0,.26,progress)*(1-smooth(.26,.43,progress)),strike=smooth(.26,.43,progress)*(1-smooth(.58,1,progress));
  const weapon=weaponOnRight?'R':'L',other=weapon==='L'?'R':'L',sign=weapon==='L'?1:-1;
  q['hand'+weapon+'X']=(strike*.027-load*.012)*sign;q['hand'+weapon+'Y']=load*-.017+strike*.011;
  q['wrist'+weapon]=(strike*.13-load*.08)*sign;
  q['hand'+other+'X']=strike*-.008*sign;q['hand'+other+'Y']=-load*.007;
  q.crouch=load*.007;q.lean=(strike*.008-load*.004)*(side?screen:sign);
  if(mode==='cast'||['shaman','acolyte'].includes(classId)){q.handLY=q.handRY=-strike*.021-load*.006;q.wristL=-strike*.05;q.wristR=strike*.05;}
  if(classId==='hunter'){q.handRX=strike*.018;q.handLX=-load*.012;q.wristL=q.wristR=0;}
  if(classId==='boxer'||classId==='novice'){q.handRX=strike*.031-load*.012;q.handRY=-strike*.009;q.handLX=-load*.008;q.wristR=0;}
 }else if(mode==='hit'){q.lean=-Math.sin(clamp(t/.28,0,1)*Math.PI)*.010;q.crouch=.003;}
 else if(mode==='guard'){q.handLY=-.010;q.handRY=-.014;q.crouch=.008;}
 else if(mode==='dash'){const a=Math.sin(clamp(t/.42,0,1)*Math.PI);q.lean=a*.012*screen;q.crouch=a*.008;q.footLX=-a*.018;q.footRX=a*.018;}
 else if(mode==='bow'||mode==='rest'){q.lean=smooth(0,.6,t)*.012;q.crouch=smooth(0,.6,t)*.009;}
 else if(mode==='celebrate'){q.handLY=q.handRY=-Math.max(0,Math.sin(t*5))*.020;}
 else{q.body=Math.sin(t*2.1)*.0015;q.head=Math.sin(t*1.4)*.0006;}
 // Existing skill choreography is accepted conservatively; large original-side
 // arm ranges would expose missing pixels in a flattened turnaround drawing.
 if(pose)for(const key of Object.keys(q)){
  const source=weaponOnRight?key.replace(/([LR])(?=[XY]?$)/,s=>s==='L'?'R':'L'):key;
  if(!Number.isFinite(pose[source]))continue;
  const limit=key.startsWith('wrist')?.14:key.startsWith('hand')?.032:key.startsWith('foot')?.030:key==='lean'?.012:.009;
  q[key]=clamp(pose[source]*.45*(weaponOnRight&&(/X$/.test(key)||key.startsWith('wrist'))?-1:1),-limit,limit);
 }
 // In these flattened views the spear touches/overlaps the painted hair. A
 // separate weapon layer is required to reveal the pixels behind it. Keep that
 // gripping arm with the torso, retaining the other arm, legs and world VFX.
 if(classId==='lancer'&&['W','SW','NW'].includes(direction)){q.handRX=0;q.handRY=0;q.wristR=0;q.head=0;}
 return q;
}

export function sampleDirectionalRig(rig,pose={}){
 const matrices=sampleRig(rig,pose),torsoAngle=Math.atan2(matrices.torso[1],matrices.torso[0]);
 // An almost straight painted arm may solve a large elbow rotation for a tiny
 // target change. The hand grips the weapon at its explicitly authored wrist
 // angle; that elbow solution must not unexpectedly spin a long blade/staff.
 for(const side of ['L','R']){
  const name='hand'+side,bind=rig.nodes[name].at,target=transformPoint(matrices[name],bind);
  const angle=torsoAngle+finite(pose['wrist'+side]),c=Math.cos(angle),s=Math.sin(angle);
  matrices[name]=[c,s,-s,c,target.x-c*bind.x+s*bind.y,target.y-s*bind.x-c*bind.y];
  // Painted sandals keep their sole orientation while the knee bends. Letting
  // them inherit the shin's full IK rotation made a lifted foot fold into a tip.
  const foot='foot'+side,sole=rig.nodes[foot].at,planted=transformPoint(matrices[foot],sole);
  matrices[foot]=[1,0,0,1,planted.x-sole.x,planted.y-sole.y];
 }
 return matrices;
}
export function directionalRigPoint(u,v,weights,matrices){let x=0,y=0;for(const [bone,w] of weights){const q=transformPoint(matrices[bone],p(u,v));x+=q.x*w;y+=q.y*w;}return {x,y};}
