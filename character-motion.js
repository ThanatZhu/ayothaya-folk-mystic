import {motionFrame} from './animation-frames.js?v=37';
import {neutralJoints} from './character-rig.js?v=37';
// Joint targets drive fixed-length arms/legs. Root motion is translation, not scale.
export const MOTION_MODES=['idle','walk','attack','cast','guard','hit','dash','bow','celebrate','rest'];
const clamp=v=>Math.max(0,Math.min(1,v));
const ease=v=>{v=clamp(v);return v*v*(3-2*v);};
// World units walked per full 8-frame walk cycle, measured from the art so the planted foot does not slide:
// novice (0.55 hand-off): the stance foot travels ~99.5 source px per step → 199 px × 0.778 × 0.971 × 2.1·1.25/320 ≈ 1.23.
// Other classes keep the old value until their walk art is redrawn and measured.
// Which walk cycle a facing shows on screen: side, front (toward the camera = down the screen) or back (up).
// Hysteresis: a diagonal keeps the previous view, so the sprite does not flicker between cycles.
export function walkView(face,azimuth,previous='side'){
 const right=face.x*Math.cos(azimuth)-face.z*Math.sin(azimuth),toward=face.x*Math.sin(azimuth)+face.z*Math.cos(azimuth);
 const vertical=Math.abs(toward)/(Math.abs(right)||1e-6);
 if(vertical>1.4)return toward>0?'front':'back';
 if(vertical<.8)return 'side';
 return previous;
}
// Owner: steps looked too quick. At town pace the art's short stride needs ~4 cycles/s (8-9 steps/s, a sprint), so the
// cadence is capped: up to WALK_CADENCE cycles per second the planted foot keeps pace, above it the feet slide a little.
export const WALK_CADENCE=2;
export const gaitStep=(distance,dt,classId)=>Math.min(distance/walkCycle(classId),Math.max(0,dt)*WALK_CADENCE);
export const walkCycle=classId=>classId==='novice'?1.23:2.1;
export const attackDuration=id=>({boxer:.40,rogue:.36,lancer:.66,hunter:.64,swordsman:.60,shaman:.70,acolyte:.78}[id]??.6);
export function characterMotion({time=0,mode='idle',classId='shaman',reduced=false,phase=null,view='side'}={}){
 const t=Math.max(0,Number.isFinite(time)?time:0),p={artFrame:0,frame:0,x:0,y:0,sx:1,sy:1,rotation:0,body:0,lean:0,head:0,armL:0,armR:0,armLY:0,armRY:0,legL:0,legR:0,liftL:0,liftR:0,crouch:0,...neutralJoints()};
 if(reduced)return p;
 if(mode==='walk'){
  // 0.29: livelier gait. Bigger stride and arm swing, a forward lean, a rise while the feet pass,
  // with planted stance feet and a lifted swing leg.
  const a=(phase??t*1.65)*Math.PI*2,s=Math.sin(a),c=Math.cos(a),step=Math.max(0,-Math.cos(a*2))**2;
  p.legL=s*.075;p.legR=-s*.075;p.liftL=Math.max(0,c)*.07;p.liftR=Math.max(0,-c)*.07;
  const stride=classId==='acolyte'?.65:classId==='rogue'?1.12:1,arms=['lancer','shaman'].includes(classId)?.45:classId==='boxer'?.65:1;
  p.legL*=stride;p.legR*=stride;p.liftL*=stride;p.liftR*=stride;
  p.armL=-s*.042*arms;p.armR=s*.042*arms;p.body=Math.cos(a*2)*.008;p.lean=.022+s*.008+(classId==='rogue'?.012:0);p.head=-s*.005;
  // A stance travels backwards relative to the moving body; the swing returns
  // through a raised arc. Distance-based phase stops stepping against a wall.
  for(const side of ['L','R']){
   const cycle=(((phase??t*1.65)+(side==='R'?.5:0))%1+1)%1;
   const swing=cycle<.5,progress=swing?cycle*2:(cycle-.5)*2;
   p['foot'+side+'X']=(swing?-.065+.13*ease(progress):.065-.13*progress)*stride;
   p['foot'+side+'Y']=swing?-Math.sin(progress*Math.PI)*.06*stride:0;
  }
  p.handLX=-s*.035*arms;p.handLY=Math.max(0,-s)*-.012;p.handRX=s*.035*arms;p.handRY=Math.max(0,s)*-.012;
  p.crouch=.012+.008*Math.cos(a*2);p.body=0;p.y=classId==='novice'?0:Math.abs(Math.sin(a))*.03; // footfall rise; the redrawn novice cycle bobs in the art, so the planted foot stays on the ground
 }else if(mode==='attack'){
  const q=t/attackDuration(classId);if(q>=1)return p;
  const wind=ease(q/.28),strike=ease((q-.28)/.16),recover=ease((q-.55)/.45),power=strike*(1-recover);
  p.frame=q>=.29&&q<.78?3:0;p.lean=-.025*wind*(1-strike)+.045*power;p.crouch=.018*wind*(1-strike);
  p.armR=power*(classId==='lancer'?.06:.035);p.armL=-power*.012;p.head=-p.lean*.25;
  p.legL=-power*.010;p.legR=power*.018;
  const load=wind*(1-strike);
  if(['swordsman','rogue'].includes(classId)){p.handLY=-load*.1+power*.045;p.handLX=power*.08;p.wristL=-load*.6+power*1.1;p.handRX=power*.05;p.wristR=-power*.6;}
  else if(classId==='lancer'){p.handLX=power*.15-load*.03;p.handLY=-power*.045;p.wristL=power*1.15;p.handRX=power*.08;}
  else if(classId==='hunter'){p.handLX=-load*.04+power*.1;p.handLY=-wind*.09*(1-recover);p.handRY=-wind*.07*(1-recover);p.wristR=power*.1;}
  else{p.handRX=power*.1-load*.025;p.handRY=classId==='boxer'?power*.025:-power*.11;p.handLY=-load*.02;}
  p.footLX=-power*.015;p.footRX=power*.025;
 }else if(mode==='cast'){
  const lift=ease(t/.25)*(1-ease((t-.55)/.25));p.frame=t>.18&&t<.7?3:0;p.armL=-lift*.022;p.armR=lift*.022;p.body=lift*.012;p.head=-lift*.006;
 }else if(mode==='guard'){p.crouch=.028;p.lean=-.015;p.armL=.012;p.armR=-.012;}
 else if(mode==='hit'){const recoil=Math.sin(clamp(t/.28)*Math.PI)*(1-clamp(t/.28));p.lean=-.07*recoil;p.head=-.012*recoil;p.crouch=.022*recoil;}
 else if(mode==='dash'){const drive=Math.sin(clamp(t/.42)*Math.PI);p.lean=.06*drive;p.crouch=.025*drive;p.legL=-.04*drive;p.legR=.025*drive;}
 else if(mode==='bow'){const b=ease(t/.65)*(1-ease((t-1.5)/.7));p.lean=.045*b;p.head=.025*b;p.crouch=.012*b;}
 else if(mode==='celebrate'){const q=t%1.2,up=Math.sin(clamp((q-.16)/.7)*Math.PI);p.y=up*.14;p.crouch=q<.16?Math.sin(q/.16*Math.PI)*.025:0;p.armL=-up*.04;p.armR=up*.04;}
 else if(mode==='rest'){p.crouch=ease(t/.6)*.06;p.armL=.012;p.armR=-.012;p.head=.006;}
 else{p.body=Math.sin(t*2.1)*.003;p.armL=Math.sin(t*2.1-.3)*.002;p.armR=-p.armL;}
 if(!['walk','attack'].includes(mode)){
  p.handLX=p.armL;p.handRX=p.armR;p.handLY=-(p.armLY??0)-p.armL*.5;p.handRY=-(p.armRY??0)-p.armR*.5;
  p.footLX=p.legL;p.footRX=p.legR;p.footLY=-p.liftL;p.footRY=-p.liftR;
 }
 p.artFrame=motionFrame(mode,mode==='attack'?t/attackDuration(classId):t,phase,reduced,classId,view);
 return p;
}
// Continuous soft weights avoid cutting a sprite into disconnected rectangles.
export function deformPoint(u,v,p){
 const smooth=(a,b,x)=>ease((x-a)/(b-a));
 const torso=1-smooth(.61,.95,v),head=1-smooth(.40,.56,v),legs=smooth(.68,.96,v);
 const left=1-smooth(.35,.65,u),right=1-left,arms=smooth(.40,.54,v)*(1-smooth(.67,.76,v));
 const side=smooth(.08,.21,Math.abs(u-.5));
 let x=u+p.lean*torso+p.head*head+(p.armL*left+p.armR*right)*arms*side+(p.legL*left+p.legR*right)*legs;
 let y=v-p.body*torso+p.crouch*torso-(p.liftL*left+p.liftR*right)*legs;
 y-=((p.armLY??0)*left+(p.armRY??0)*right)*arms*side;
 // Squash and stretch around the planted feet.
 x=.5+(x-.5)*(p.sx??1);y=1+(y-1)*(p.sy??1);
 // Rotate around planted feet, not the centre of the texture.
 const r=p.rotation??0,c=Math.cos(r),s=Math.sin(r),dx=x-.5,dy=y-1;
 x=.5+dx*c-dy*s;y=1+dx*s+dy*c;
 return {x,y};
}
