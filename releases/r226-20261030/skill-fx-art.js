import * as THREE from './vendor/build/three.module.js';
// Small deterministic procedural textures: no downloads and no per-cast canvas.
export const FX_STYLES={
 novice:{main:'#e2cba3',accent:'#fff3ce',motif:'dust',projectile:'impact'},
 swordsman:{main:'#ffbd65',accent:'#fff2bd',motif:'blade',projectile:'slash'},
 lancer:{main:'#f4b96e',accent:'#ffead5',motif:'spear',projectile:'lance'},
 hunter:{main:'#a9e5ab',accent:'#eefad1',motif:'feather',projectile:'arrow'},
 boxer:{main:'#ff9b55',accent:'#ffe1ac',motif:'knuckle',projectile:'impact'},
 rogue:{main:'#be94ec',accent:'#f0dafb',motif:'twin',projectile:'slash'},
 shaman:{main:'#60ead5',accent:'#d4fff0',motif:'talisman',projectile:'spirit'},
 acolyte:{main:'#f5d27a',accent:'#fff6d9',motif:'lotus',projectile:'light'}
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
 const spirit=texture(64,96,(u,v)=>{const x=(u-.5)*2,y=(v-.5)*2,r=.53*(1-y*.42),flame=Math.abs(x-.15*Math.sin(y*6))<r*(1-Math.abs(y)**2),eyes=v>.46&&v<.53&&(Math.abs(u-.35)<.055||Math.abs(u-.65)<.055);return eyes?[12,68,70,255]:flame?[128,255,226,Math.round(255*(.6+.4*(1-Math.abs(x))))]:[0,0,0,0];});
 const seal=texture(256,256,(u,v)=>{const x=u-.5,y=v-.5,r=Math.hypot(x,y),a=Math.atan2(y,x),ring=Math.abs(r-.43)<.006||Math.abs(r-.34)<.004,spoke=Math.abs(Math.sin(a*8))<.06&&r>.35&&r<.42,diamond=Math.abs(Math.abs(x)+Math.abs(y)-.29)<.006,core=Math.abs(r-.12)<.006;return [255,243,201,ring||spoke||diamond||core?240:0];});
 const soft=texture(48,48,(u,v)=>{const a=Math.round(255*Math.max(0,1-Math.hypot(u-.5,v-.5)*2)**2);return [255,255,255,a];});
 const crescent=new THREE.BufferGeometry(),vertices=[];
 for(let i=0;i<32;i++){const a=-1.2+i*2.4/32,b=-1.2+(i+1)*2.4/32,w=.22*Math.sin((i+.5)/32*Math.PI),points=[[Math.cos(a),Math.sin(a)],[Math.cos(b),Math.sin(b)],[(1-w)*Math.cos(a),(1-w)*Math.sin(a)],[(1-w)*Math.cos(b),(1-w)*Math.sin(b)]];for(const j of [0,1,2,1,3,2])vertices.push(...points[j],0);}crescent.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
 const petal=new THREE.Shape();petal.moveTo(0,0);petal.bezierCurveTo(-.27,.25,-.22,.6,0,.82);petal.bezierCurveTo(.22,.6,.27,.25,0,0);
 const star=[];for(let i=0;i<16;i++){const a=i/16*Math.PI*2,r=i%2?.16:.5;star.push([Math.cos(a)*r,Math.sin(a)*r]);}
 const geometry={crescent,arrow:polygon([[-.035,-.55],[.035,-.55],[.035,.33],[.14,.25],[0,.65],[-.14,.25],[-.035,.33]]),feather:polygon([[0,-.4],[.15,-.23],[.1,.15],[0,.4],[-.1,.15],[-.15,-.23]]),star:polygon(star),petal:new THREE.ShapeGeometry(petal),streak:polygon([[-.035,-.7],[.04,-.7],[.1,.4],[0,.7],[-.1,.4]]),plane:new THREE.PlaneGeometry(1,1),ring:new THREE.RingGeometry(.65,.69,40),shield:new THREE.SphereGeometry(.85,20,12,0,Math.PI*2,0,Math.PI/2)};
 return {geometry,paper,spirit,seal,soft,dispose(){Object.values(geometry).forEach(g=>g.dispose());for(const t of [paper,spirit,seal,soft])t.dispose();}};
}
