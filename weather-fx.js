// 0.97 weather on screen: rain streaks around the camera, darker light, thicker haze and storm lightning, easing over
// a few seconds when the weather turns. One LineSegments draw for all the rain; the drop count follows graphics quality.
import * as THREE from 'three';
import {weatherAt,WEATHERS} from './weather.js?v=97';
// ?weather=storm (or drizzle / mist / clear) previews one weather on this page only.
const forced=WEATHERS[new URLSearchParams(location.search).get('weather')]?new URLSearchParams(location.search).get('weather'):null;
const pick=(t,map)=>forced?{id:forced,...WEATHERS[forced],endsAt:weatherAt(t,map).endsAt}:weatherAt(t,map);

const DROPS={low:500,mid:1200,high:2200},BOX={w:72,h:28,d:72},GREY=new THREE.Color('#59646a');
export function createWeather({scene,controls,sun,map,game,quality='mid',reduced=false}){
 const hemi=scene.children.find(o=>o.isHemisphereLight),base={hemi:hemi?.intensity??1,sun:sun.intensity,sky:scene.background?.clone?.()??new THREE.Color('#d3dcc4'),fog:scene.fog.color.clone()};
 const n=reduced?0:DROPS[quality]??DROPS.mid,pos=new Float32Array(n*6),drop=new Float32Array(n*4); // drop: x, y, z offsets + speed
 for(let i=0;i<n;i++){drop[i*4]=Math.random()*BOX.w-BOX.w/2;drop[i*4+1]=Math.random()*BOX.h;drop[i*4+2]=Math.random()*BOX.d-BOX.d/2;drop[i*4+3]=17+Math.random()*9;}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(pos,3).setUsage(THREE.DynamicDrawUsage));
 const rain=new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color:'#c9dbe6',transparent:true,opacity:.5,depthWrite:false,fog:false}));
 rain.frustumCulled=false;rain.renderOrder=20;rain.visible=false;scene.add(rain);
 let now=pick(Date.now(),map),level={rain:0,dim:1,fog:1},flash=0,nextFlash=6,wind=.25;
 // HUD chip under the minimap, beside the MVP / surge chips.
 const chip=document.createElement('button');chip.type='button';chip.id='weather-chip';let chipText='';
 const place=()=>{const row=document.getElementById('hud-chips');if(row&&chip.parentElement!==row)row.prepend(chip);};
 chip.onclick=()=>game.world.notice(`${now.icon} ${now.name} · ${now.text}`);
 function paintChip(){const left=Math.max(0,Math.ceil((now.endsAt-Date.now())/6e4)),text=`${now.icon} ${now.name} · อีก ${left} นาที`;if(text!==chipText){chipText=text;chip.innerHTML=`<i aria-hidden="true">${now.icon}</i><span>${now.name}</span><b>อีก ${left} นาที</b>`;chip.setAttribute('aria-label','สภาพอากาศ '+text);chip.dataset.weather=now.id;}}
 return {
  get current(){return now;},
  update(dt){
   place();if(Date.now()>=now.endsAt){const before=now.id;now=pick(Date.now(),map);if(now.id!==before)game.world.notice(`${now.icon} สภาพอากาศเปลี่ยน · ${now.name}`);}
   paintChip();
   const k=Math.min(1,dt/3); // ~3 s ease toward the target weather
   level.rain+=(now.rain-level.rain)*k;level.dim+=(now.dim-level.dim)*k;level.fog+=(now.fog-level.fog)*k;
   if(now.lightning){nextFlash-=dt;if(nextFlash<=0){nextFlash=5+Math.random()*7;flash=1;}}
   flash=Math.max(0,flash-dt*4);const glow=flash>.5?1:flash*2;
   if(hemi)hemi.intensity=base.hemi*level.dim+glow*2.4;sun.intensity=base.sun*level.dim;
   const grey=1-level.dim;scene.background?.copy?.(base.sky).lerp(GREY,grey*1.6).offsetHSL(0,0,glow*.25);scene.fog.color.copy(base.fog).lerp(GREY,grey*1.6);
   // the frame loop sets the haze distance first; weather only pulls the far edge closer
   scene.fog.far=scene.fog.near+(scene.fog.far-scene.fog.near)*level.fog;
   const count=Math.round(n*level.rain);rain.visible=count>0;if(!count)return;
   const c=controls.target,len=.75+level.rain*.5,slant=wind+level.rain*.35;
   for(let i=0;i<count;i++){
    let y=drop[i*4+1]-drop[i*4+3]*dt;if(y<0)y+=BOX.h;drop[i*4+1]=y;
    const x=c.x+drop[i*4]+y*slant*.3,z=c.z+drop[i*4+2],o=i*6;
    pos[o]=x;pos[o+1]=y;pos[o+2]=z;pos[o+3]=x+slant*len*.3;pos[o+4]=y+len;pos[o+5]=z;
   }
   geometry.setDrawRange(0,count*2);geometry.attributes.position.needsUpdate=true;rain.material.opacity=.3+level.rain*.3;
  },
 };
}
