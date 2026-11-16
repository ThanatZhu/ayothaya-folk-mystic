// 2D articulated rig. Coordinates use the neutral atlas cell (x right, y down).
// Limbs solve two-bone IK; only the small joint cuffs blend influences. Faces,
// hands, feet and weapons keep rigid transforms, never whole-card squash/stretch.
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const point=(x,y)=>({x,y});
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const angle=(a,b)=>Math.atan2(b.y-a.y,b.x-a.x);
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
const identity=()=>[1,0,0,1,0,0];
export const JOINT_CHANNELS=['handLX','handLY','handRX','handRY','footLX','footLY','footRX','footRY','wristL','wristR'];
export const neutralJoints=()=>Object.fromEntries(JOINT_CHANNELS.map(k=>[k,0]));
// Shared painter order for WebGL and the character-creation canvas.
export function boneLayer(name){return ({thigh:0,shin:1,foot:2,pelvis:3,torso:4,head:5,upper:6,lower:7,hand:8})[name.replace(/[LR]$/,'')]??0;}
const layouts={
 novice:{head:[.53,.43],L:[[.41,.48],[.37,.59],[.375,.68]],R:[[.62,.48],[.65,.58],[.67,.67]],hips:[.44,.58],knee:.85,sole:.955},
 swordsman:{head:[.55,.50],L:[[.43,.55],[.35,.585],[.29,.58]],R:[[.64,.55],[.69,.62],[.73,.66]],hips:[.43,.62],knee:.865,sole:.97},
 lancer:{head:[.51,.52],L:[[.40,.57],[.35,.61],[.29,.61]],R:[[.60,.56],[.64,.65],[.67,.72]],hips:[.40,.58],knee:.875,sole:.975},
 hunter:{head:[.53,.48],L:[[.40,.55],[.33,.64],[.28,.72]],R:[[.64,.55],[.71,.61],[.79,.62]],hips:[.42,.62],knee:.865,sole:.975},
 boxer:{head:[.55,.49],L:[[.43,.55],[.34,.63],[.43,.53]],R:[[.65,.55],[.73,.63],[.69,.53]],hips:[.43,.62],knee:.84,sole:.97},
 rogue:{head:[.51,.50],L:[[.38,.56],[.31,.61],[.24,.64]],R:[[.60,.56],[.67,.62],[.73,.65]],hips:[.39,.60],knee:.86,sole:.97},
 shaman:{head:[.63,.51],L:[[.51,.56],[.45,.60],[.38,.58]],R:[[.76,.56],[.80,.65],[.82,.74]],hips:[.52,.72],knee:.875,sole:.98},
 acolyte:{head:[.50,.48],L:[[.38,.54],[.33,.64],[.45,.62]],R:[[.59,.54],[.65,.64],[.55,.61]],hips:[.39,.61],knee:.89,sole:.975}
};
const cached=new Map();
export function rigDefinition(classId='novice',gender='male'){
 const key=classId+gender;if(cached.has(key))return cached.get(key);
 const a=layouts[classId]??layouts.novice,dy=gender==='female'&&classId==='novice'?.015:0;
 const nodes={pelvis:{parent:null,at:point((a.hips[0]+a.hips[1])/2,.735)},torso:{parent:'pelvis',at:point((a.hips[0]+a.hips[1])/2,.675)},head:{parent:'torso',at:point(a.head[0],a.head[1]+dy)}};
 for(const side of ['L','R']){
  const [s,e,w]=a[side];nodes['upper'+side]={parent:'torso',at:point(s[0],s[1]+dy)};nodes['lower'+side]={parent:'upper'+side,at:point(e[0],e[1]+dy)};nodes['hand'+side]={parent:'lower'+side,at:point(w[0],w[1]+dy)};
  const x=a.hips[side==='L'?0:1];nodes['thigh'+side]={parent:'pelvis',at:point(x,.76)};nodes['shin'+side]={parent:'thigh'+side,at:point(x+(side==='L'?-.025:.015),a.knee)};nodes['foot'+side]={parent:'shin'+side,at:point(x+(side==='L'?-.045:.035),a.sole)};
 }
 const rig={classId,gender,nodes,order:Object.keys(nodes),sole:a.sole,headY:a.head[1]+dy};cached.set(key,rig);return rig;
}
export function transformPoint(m,p){return {x:m[0]*p.x+m[2]*p.y+m[4],y:m[1]*p.x+m[3]*p.y+m[5]};}
function inversePoint(m,p){return {x:m[0]*(p.x-m[4])+m[1]*(p.y-m[5]),y:m[2]*(p.x-m[4])+m[3]*(p.y-m[5])};}
function around(parent,pivot,r){
 const c=Math.cos(r),s=Math.sin(r),a=parent[0]*c+parent[2]*s,b=parent[1]*c+parent[3]*s,d=-parent[0]*s+parent[2]*c,e=-parent[1]*s+parent[3]*c,q=transformPoint(parent,pivot);
 return [a,b,d,e,q.x-a*pivot.x-d*pivot.y,q.y-b*pivot.x-e*pivot.y];
}
export function solveLimb(a,b,c,target){
 const l1=distance(a,b),l2=distance(b,c),d=clamp(distance(a,target),Math.abs(l1-l2)+1e-5,l1+l2-1e-5);
 const bend=Math.sign((b.x-a.x)*(c.y-b.y)-(b.y-a.y)*(c.x-b.x))||1;
 const elbow=bend*Math.acos(clamp((d*d-l1*l1-l2*l2)/(2*l1*l2),-1,1));
 const upper=angle(a,target)-Math.atan2(l2*Math.sin(elbow),l1+l2*Math.cos(elbow));
 return [wrap(upper-angle(a,b)),wrap(elbow-wrap(angle(b,c)-angle(a,b)))];
}
export function sampleRig(rig,p={}){
 const n=rig.nodes,m={},root=identity();root[5]=(p.crouch??0)-(p.body??0);
 m.pelvis=root;m.torso=around(root,n.torso.at,-(p.lean??0)*2.2+(p.rotation??0));
 m.head=around(m.torso,n.head.at,(p.lean??0)*1.5-(p.rotation??0)*.65+(p.head??0)*2);
 for(const side of ['L','R']){
  for(const leg of [false,true]){
   const names=(leg?['thigh','shin','foot']:['upper','lower','hand']).map(k=>k+side),[a,b,c]=names.map(k=>n[k].at),parent=leg?m.pelvis:m.torso;
   const key=(leg?'foot':'hand')+side,desired={x:c.x+(p[key+'X']??0),y:c.y+(p[key+'Y']??0)};
   // Feet target world-local ground; hands target torso space and follow its turn.
   const target=leg?inversePoint(parent,desired):desired,[upper,lower]=solveLimb(a,b,c,target);
   m[names[0]]=around(parent,a,upper);m[names[1]]=around(m[names[0]],b,lower);
   const wrist=leg?-(upper+lower):(p['wrist'+side]??0);
   m[names[2]]=around(m[names[1]],c,wrist);
  }
 }
 return m;
}
function inPolygon(x,y,poly){let inside=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const [a,b]=poly[i],[c,d]=poly[j];if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)inside=!inside;}return inside;}
function segmentDistance(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy),0,1);return distance(p,point(a.x+dx*t,a.y+dy*t));}
export function skinWeights(rig,u,v){
 const id=rig.classId,n=rig.nodes,p=point(u,v),one=name=>[[name,1]];
 // These masks isolate each weapon from the face and legs, so blades, bows and
 // staffs rotate as rigid objects attached to the hand instead of bending.
 if(id==='swordsman'&&u<.325&&v<.74)return one('handL');
 if(id==='lancer'&&u<.335)return one('handL');
 if(id==='shaman'&&u<.415)return one('handL');
 if(id==='hunter'&&v<.905&&u>(v>.7?.70+(.90-v)*.35:.755))return one('handR');
 if(id==='rogue'&&v<.76&&(u<.265||u>.715))return one(u<.5?'handL':'handR');
 let side=null;
 if(id==='boxer'){
  if(inPolygon(u,v,[[.29,.64],[.37,.48],[.46,.48],[.50,.55],[.43,.65],[.36,.69]]))side='L';
  if(inPolygon(u,v,[[.63,.48],[.72,.48],[.80,.64],[.74,.69],[.64,.63]]))side='R';
 }
 if(!side&&v<rig.headY+.015)return one('head');
 if(!side&&v<(id==='acolyte'?.69:.76)){
  for(const s of ['L','R']){const a=n['upper'+s].at,b=n['lower'+s].at,c=n['hand'+s].at;
   if((s==='L'?u<a.x+.012:u>a.x-.012)&&Math.min(segmentDistance(p,a,b),segmentDistance(p,b,c))<.085){side=s;break;}
  }
 }
 function limb(a,b,c){
  const joint=n[b].at,near=distance(p,joint),upper=segmentDistance(p,n[a].at,joint),lower=segmentDistance(p,joint,n[c].at);
  if(distance(p,n[c].at)<.052)return one(c);
  if(near<.035){const w=clamp(.5+(lower-upper)*15,.08,.92);return [[a,w],[b,1-w]];}
  return one(upper<lower?a:b);
 }
 if(side)return limb('upper'+side,'lower'+side,'hand'+side);
 // The acolyte's long robe is one garment; don't slice its hem into two thighs.
 if(id==='acolyte'&&v>.69&&v<.925)return one(v>.72?'pelvis':'torso');
 const center=n.pelvis.at.x;
 if(v>.78&&Math.abs(u-center)>.037){side=u<center?'L':'R';if(v>rig.sole-.035)return one('foot'+side);return limb('thigh'+side,'shin'+side,'foot'+side);}
 return one(v>.72?'pelvis':'torso');
}
export function rigPoint(u,v,weights,matrices){let x=0,y=0;for(const [name,w] of weights){const q=transformPoint(matrices[name],point(u,v));x+=q.x*w;y+=q.y*w;}return {x,y};}

// Covered joint backing supplies the pixels that a flattened illustration never
// drew behind an arm. The textured cutouts render over these rounded seams.
export function jointBackings(rig){
 const n=rig.nodes,result=[{bone:'pelvis',a:n.torso.at,b:n.pelvis.at,r:.085,skin:rig.classId==='boxer',sample:point(n.torso.at.x,.675)}];
 for(const side of ['L','R'])for(const [a,b,r] of [['upper','lower',.038],['lower','hand',.031],['thigh','shin',.041],['shin','foot',.027]]){
  result.push({bone:a+side,a:n[a+side].at,b:n[b+side].at,r,skin:a==='lower'||a==='shin'||rig.classId==='boxer',sample:a==='upper'&&rig.classId!=='boxer'?point(n.torso.at.x,.57):n['hand'+side].at});
 }
 return result;
}
