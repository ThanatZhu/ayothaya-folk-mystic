// Authored timing over existing artwork, with independently weighted body motion.
export const MOTION_MODES=['idle','walk','attack','cast','guard','hit','dash','bow','celebrate','rest'];
const clamp=v=>Math.max(0,Math.min(1,v));
const ease=v=>{v=clamp(v);return v*v*(3-2*v);};
export const attackDuration=id=>({boxer:.40,rogue:.36,lancer:.66,hunter:.64,swordsman:.60,shaman:.70,acolyte:.78}[id]??.6);
export function characterMotion({time=0,mode='idle',classId='shaman',reduced=false,phase=null}={}){
 const t=Math.max(0,Number.isFinite(time)?time:0),p={frame:0,x:0,y:0,sx:1,sy:1,rotation:0,body:0,lean:0,head:0,armL:0,armR:0,armLY:0,armRY:0,legL:0,legR:0,liftL:0,liftR:0,crouch:0};
 if(reduced)return p;
 if(mode==='walk'){
  // 0.29: livelier gait. Bigger stride and arm swing, a forward lean, a rise while the feet pass,
  // and a small squash at each footfall (step=1 when the feet are furthest apart, 0 while passing).
  const a=(phase??t*1.65)*Math.PI*2,s=Math.sin(a),c=Math.cos(a),step=Math.max(0,-Math.cos(a*2))**2;
  p.legL=s*.075;p.legR=-s*.075;p.liftL=Math.max(0,c)*.07;p.liftR=Math.max(0,-c)*.07;
  const stride=classId==='acolyte'?.65:classId==='rogue'?1.12:1,arms=['lancer','shaman'].includes(classId)?.45:classId==='boxer'?.65:1;
  p.legL*=stride;p.legR*=stride;p.liftL*=stride;p.liftR*=stride;
  p.armL=-s*.042*arms;p.armR=s*.042*arms;p.body=Math.cos(a*2)*.008;p.lean=.022+s*.008+(classId==='rogue'?.012:0);p.head=-s*.005;
  p.y=.07*Math.max(0,Math.cos(a*2));p.sy=1-.05*step;p.sx=1+.03*step;
 }else if(mode==='attack'){
  const q=t/attackDuration(classId);if(q>=1)return p;
  const wind=ease(q/.28),strike=ease((q-.28)/.16),recover=ease((q-.55)/.45),power=strike*(1-recover);
  p.frame=q>=.29&&q<.78?3:0;p.lean=-.025*wind*(1-strike)+.045*power;p.crouch=.018*wind*(1-strike);
  p.armR=power*(classId==='lancer'?.06:.035);p.armL=-power*.012;p.head=-p.lean*.25;
  p.legL=-power*.010;p.legR=power*.018;
 }else if(mode==='cast'){
  const lift=ease(t/.25)*(1-ease((t-.55)/.25));p.frame=t>.18&&t<.7?3:0;p.armL=-lift*.022;p.armR=lift*.022;p.body=lift*.012;p.head=-lift*.006;
 }else if(mode==='guard'){p.crouch=.028;p.lean=-.015;p.armL=.012;p.armR=-.012;}
 else if(mode==='hit'){const recoil=Math.sin(clamp(t/.28)*Math.PI)*(1-clamp(t/.28));p.lean=-.07*recoil;p.head=-.012*recoil;p.crouch=.022*recoil;}
 else if(mode==='dash'){const drive=Math.sin(clamp(t/.42)*Math.PI);p.lean=.06*drive;p.crouch=.025*drive;p.legL=-.04*drive;p.legR=.025*drive;}
 else if(mode==='bow'){const b=ease(t/.65)*(1-ease((t-1.5)/.7));p.lean=.045*b;p.head=.025*b;p.crouch=.012*b;}
 else if(mode==='celebrate'){const q=t%1.2,up=Math.sin(clamp((q-.16)/.7)*Math.PI);p.y=up*.14;p.crouch=q<.16?Math.sin(q/.16*Math.PI)*.025:0;p.armL=-up*.04;p.armR=up*.04;}
 else if(mode==='rest'){p.crouch=ease(t/.6)*.06;p.armL=.012;p.armR=-.012;p.head=.006;}
 else{p.body=Math.sin(t*2.1)*.003;p.armL=Math.sin(t*2.1-.3)*.002;p.armR=-p.armL;}
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
