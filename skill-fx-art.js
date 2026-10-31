import * as THREE from './vendor/build/three.module.js';
// Detailed Thai fantasy procedural & kranok-motif textures: no per-cast canvas allocations.
export const FX_STYLES={
 novice:{main:'#edd5a4',accent:'#fff6d6',motif:'dust',projectile:'impact'},
 swordsman:{main:'#ffae42',accent:'#fff3b8',motif:'blade',projectile:'slash'},
 lancer:{main:'#f5bc62',accent:'#ffefd2',motif:'spear',projectile:'lance'},
 hunter:{main:'#7be89e',accent:'#effcd2',motif:'feather',projectile:'arrow'},
 boxer:{main:'#ff853b',accent:'#ffe4ad',motif:'knuckle',projectile:'impact'},
 rogue:{main:'#4ce8ab',accent:'#e2c4ff',motif:'twin',projectile:'slash'},
 shaman:{main:'#4cf2d8',accent:'#ffe89e',motif:'talisman',projectile:'spirit'},
 acolyte:{main:'#ffcf60',accent:'#fff7d6',motif:'lotus',projectile:'light'}
};
function texture(w,h,pixel){const data=new Uint8Array(w*h*4);for(let y=0;y<h;y++)for(let x=0;x<w;x++)data.set(pixel((x+.5)/w,(y+.5)/h,x,y),(y*w+x)*4);const t=new THREE.DataTexture(data,w,h);t.colorSpace=THREE.SRGBColorSpace;t.magFilter=THREE.NearestFilter;t.needsUpdate=true;return t;}
function polygon(points){const shape=new THREE.Shape();points.forEach(([x,y],i)=>shape[i?'lineTo':'moveTo'](x,y));shape.closePath();return new THREE.ShapeGeometry(shape);}
export function createFxArt(){
 const paper=texture(96,192,(u,v,x,y)=>{
  const edge=Math.min(u,1-u,v*2,(1-v)*2),grain=Math.sin(x*1.73+y*.81)*Math.sin(y*2.17)*5;
  if(edge<.016+.006*Math.sin(y*1.4))return [0,0,0,0];
  const px=(u-.5)*2,py=(v-.43)*3.6,r=Math.hypot(px,py),a=Math.atan2(py,px);
  const medallion=Math.abs(r-.44)<.017||Math.abs(r-.34)<.012||(r>.34&&r<.44&&Math.abs(Math.sin(a*8))<.11);
  const knot=Math.abs(Math.abs(px)+Math.abs(py)-.28)<.018||Math.abs(r-.12)<.016;
  const top=Math.abs(Math.hypot(px,(v-.17)*3.6)-.12)<.016;
  const stem=v>.59&&v<.84&&Math.abs(px-.05*Math.sin(v*48))<.022;
  const curls=v>.63&&v<.85&&(Math.abs(Math.abs(px)-(.13+.04*Math.sin(v*50)))<.018);
  const border=edge<.045||Math.abs(u-.105)<.008||Math.abs(u-.895)<.008;
  return medallion||knot||top||stem||curls?[155,56,34,255]:border?[178,112,55,255]:[250+grain,223+grain,165+grain,255];
 });
 // Thai ghostfire naga vortex + golden yantra filigree
 const spirit=texture(96,128,(u,v)=>{
  const x=(u-.5)*2,y=(v-.5)*2,r=Math.hypot(x,y),a=Math.atan2(y,x);
  const swirl=Math.sin(a*3-r*8.5+y*2.4)*.5+.5;
  const flame=r<.88*(1-Math.max(0,y)*.28)&&Math.abs(x-.14*Math.sin(y*6.5))<.62*(1-y*y*.65);
  const yantra=Math.abs(r-.48)<.025||Math.abs(r-.32)<.02||(r>.32&&r<.52&&Math.abs(Math.sin(a*8))<.14);
  const core=r<.22;
  if(!flame&&r>.72)return [0,0,0,0];
  if(core)return [255,250,215,255];
  if(yantra)return [255,222,120,Math.round(255*Math.max(0,1-r*1.1))];
  const alpha=Math.round(255*Math.max(0,1-r*1.08)*(.55+.45*swirl));
  return [Math.round(70+140*swirl),255,Math.round(210+40*swirl),alpha];
 });
 // Sacred Thai Dharma lotus & 8-direction yantra mandala
 const seal=texture(256,256,(u,v)=>{
  const x=u-.5,y=v-.5,r=Math.hypot(x,y),a=Math.atan2(y,x);
  const lotusPetal=Math.abs(r-(.31+.09*Math.abs(Math.cos(a*4))))<.011;
  const outerLotus=Math.abs(r-(.38+.06*Math.abs(Math.sin(a*8))))<.009;
  const ring=Math.abs(r-.43)<.007||Math.abs(r-.34)<.006||Math.abs(r-.21)<.006;
  const spoke=Math.abs(Math.sin(a*8))<.055&&r>.21&&r<.43;
  const diamond=Math.abs(Math.abs(x)+Math.abs(y)-.29)<.006;
  const core=r<.08||Math.abs(r-.12)<.007;
  const hit=lotusPetal||outerLotus||ring||spoke||diamond||core;
  const glow=Math.max(0,1-r*2.1)**2;
  return [255,hit?246:225,hit?195:140,hit?248:Math.round(glow*95)];
 });
 // Kranok starburst & lotus glow
 const soft=texture(64,64,(u,v)=>{
  const x=(u-.5)*2,y=(v-.5)*2,r=Math.hypot(x,y),a=Math.atan2(y,x);
  const rays=.72+.28*Math.cos(a*8)*Math.exp(-r*1.8);
  const alpha=Math.round(255*Math.max(0,1-r)**1.75*rays);
  return [255,250,232,alpha];
 });
 // Painted Thai kranok flame-blade & crescent energy arc texture for sweep ribbons
 const blade=texture(128,64,(u,v)=>{
  const arc=Math.sin(u*Math.PI),edge=1-Math.abs(v-.58)*2.1;
  if(arc<=0||edge<=0)return [0,0,0,0];
  const kranok=Math.sin(u*28-v*9)*.5+.5;
  const spine=Math.exp(-(((v-.64)/.14)**2));
  const jag=v>.22&&v<.68?Math.pow(kranok,1.6)*Math.sin(u*Math.PI):0;
  const lum=Math.min(1,spine*1.15+jag*.65+edge*.35);
  const alpha=Math.min(1,arc*(spine*.95+jag*.75+edge*.45));
  return [255,Math.round(185+70*spine),Math.round(115+140*spine*spine),Math.round(alpha*255)];
 });
 const crescent=new THREE.BufferGeometry(),vertices=[];
 for(let i=0;i<32;i++){const a=-1.2+i*2.4/32,b=-1.2+(i+1)*2.4/32,w=.22*Math.sin((i+.5)/32*Math.PI),points=[[Math.cos(a),Math.sin(a)],[Math.cos(b),Math.sin(b)],[(1-w)*Math.cos(a),(1-w)*Math.sin(a)],[(1-w)*Math.cos(b),(1-w)*Math.sin(b)]];for(const j of [0,1,2,1,3,2])vertices.push(...points[j],0);}crescent.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
 const petal=new THREE.Shape();petal.moveTo(0,0);petal.bezierCurveTo(-.27,.25,-.22,.6,0,.82);petal.bezierCurveTo(.22,.6,.27,.25,0,0);
 const star=[];for(let i=0;i<16;i++){const a=i/16*Math.PI*2,r=i%2?.16:.5;star.push([Math.cos(a)*r,Math.sin(a)*r]);}
 const geometry={crescent,arrow:polygon([[-.035,-.55],[.035,-.55],[.035,.33],[.14,.25],[0,.65],[-.14,.25],[-.035,.33]]),feather:polygon([[0,-.4],[.15,-.23],[.1,.15],[0,.4],[-.1,.15],[-.15,-.23]]),star:polygon(star),petal:new THREE.ShapeGeometry(petal),streak:polygon([[-.035,-.7],[.04,-.7],[.1,.4],[0,.7],[-.1,.4]]),plane:new THREE.PlaneGeometry(1,1),ring:new THREE.RingGeometry(.65,.69,40),shield:new THREE.SphereGeometry(.85,20,12,0,Math.PI*2,0,Math.PI/2)};
 return {geometry,paper,spirit,seal,soft,blade,dispose(){Object.values(geometry).forEach(g=>g.dispose());for(const t of [paper,spirit,seal,soft,blade])t.dispose();}};
}
