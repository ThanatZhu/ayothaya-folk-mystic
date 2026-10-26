import * as THREE from './vendor/build/three.module.js';
import {ROLES} from './assets/skills-next/catalog.js';
import {SKILL_PROFILES} from './assets/skill-polish/library-profiles.js';
import {roleTiming} from './combat-timing.js';
import {NOVICE} from './classes.js?v=novice174';
import {VFX_SHEETS,VFX_UNMATCHED} from './assets/skills-next/vfx-2026-10/vfx-map.js';
import {createSheetVfx,vfxPlacement} from './role-sheet-vfx.js?v=vfx119';
// Lab for the 0.119 painted sheets: the real sheet player, real cast timing and simulated damage events.
const $=id=>document.getElementById(id),params=new URLSearchParams(location.search);
const canvas=$('stage'),renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(2,devicePixelRatio));
const scene=new THREE.Scene();scene.background=new THREE.Color('#1c2f26');
const camera=new THREE.PerspectiveCamera(40,1,.1,200);camera.position.set(0,11,13);camera.lookAt(1.5,0,0);
scene.add(new THREE.HemisphereLight('#fff4d8','#203528',2.4));
const floor=new THREE.Mesh(new THREE.CircleGeometry(16,48),new THREE.MeshLambertMaterial({color:'#3d5a3a'}));floor.rotation.x=-Math.PI/2;scene.add(floor);
const body=(color)=>{const m=new THREE.Mesh(new THREE.CapsuleGeometry(.35,.9,4,10),new THREE.MeshLambertMaterial({color}));m.position.y=.8;const g=new THREE.Group();g.add(m);scene.add(g);return g;};
const world={player:{x:-2,z:0},nav:null,networkSelfId:'self'},caster=body('#e5b867'),others=Array.from({length:6},()=>body('#8fb6d8')),targets=Array.from({length:8},()=>body('#c8584c'));
let vfx=null,serial=0,timers=[],last=0,repeatAt=0;
function build(){vfx?.dispose();vfx=createSheetVfx(scene,world,{tier:$('tier').value||params.get('tier')||null});vfx.locate=id=>id.startsWith('o')?others[+id.slice(1)].position:null;}
const live=[{id:'novice',name:NOVICE.name,skills:Object.keys(VFX_SHEETS).filter(id=>id.startsWith('novice:')).map(id=>({id,name:VFX_SHEETS[id].name,kind:{'novice:0':'jab','novice:4':'rest','novice:5':'guard'}[id],windup:.3}))},
 ...ROLES.map(r=>({id:r.id,name:r.name,skills:[...r.base.map(s=>({...s,branch:'อาชีพ'})),...r.branches.flatMap(b=>b.active.map(s=>({...s,branch:b.name})))]}))];
for(const r of live)$('profession').add(new Option(r.name,r.id));
function skills(){$('skill').replaceChildren(...live.find(r=>r.id===$('profession').value).skills.map(s=>new Option((s.ultimate?'★ ':'')+s.name+(s.branch?' · '+s.branch:''),s.id)));info();}
const pick=()=>live.find(r=>r.id===$('profession').value).skills.find(s=>s.id===$('skill').value);
function info(){const s=pick(),e=VFX_SHEETS[s.id];$('info').textContent=`${s.id} · ${s.kind} → วาง ${vfxPlacement(s.kind)} · ชีต ${e?.effect??'ไม่มี'}${e?.ground?' + พื้น':''}`;}
function layout(){const d=+$('distance').value,n=+$('targets').value;caster.position.set(-2,0,0);world.player={x:-2,z:0};
 targets.forEach((t,i)=>{t.visible=i<n;const a=(i-(n-1)/2)*.55;t.position.set(-2+d*Math.cos(a)+(i?Math.sin(i)*.6:0),0,d*Math.sin(a));});
 others.forEach((o,i)=>{o.visible=$('crowd').checked;o.position.set(-6+i*2.4,0,-5);});}
function cast(actor,skill,from,to){
 const speed=+$('speed').value,lag=+$('lag').value,base=roleTiming({...skill,type:skill.kind},SKILL_PROFILES[skill.id]),castId=++serial;
 const timing={...base,impacts:base.impacts.map(t=>t/speed),duration:base.duration/speed};
 vfx.spawn({type:'cast',roleSkillId:skill.id,actor,castId,timing,from,to,lag,kind:skill.kind});
 // Damage arrives from the authority on each release, on every target in reach, after the same network delay.
 timing.impacts.forEach((at,hitIndex)=>targets.filter(t=>t.visible).forEach(t=>timers.push({due:performance.now()/1000+at-lag,e:{type:'damage',actor,castId,hitIndex,x:t.position.x,z:t.position.z,lag}})));
 return castId;
}
let lastOwn=null;
function castNow(){layout();const s=pick(),to=targets[0].position;lastOwn=cast('self',s,{x:-2,z:0},{x:to.x,z:to.z});
 if($('crowd').checked){const pool=live.slice(1).flatMap(r=>r.skills);others.forEach((o,i)=>{const k=pool[(serial*7+i*13)%pool.length];cast('o'+i,k,{x:o.position.x,z:o.position.z},{x:to.x,z:to.z});});}}
$('profession').onchange=skills;$('skill').onchange=info;$('cast').onclick=castNow;
$('next').onclick=()=>{const el=$('skill');el.selectedIndex=(el.selectedIndex+1)%el.options.length;info();castNow();};
$('die').onclick=()=>{if(lastOwn!=null)vfx.cancel(lastOwn,'self');timers=timers.filter(t=>t.e.castId!==lastOwn);};
$('travel').onclick=()=>{vfx.clear();timers=[];};
$('tier').onchange=build;['distance','targets','crowd'].forEach(id=>$(id).oninput=layout);
function resize(){const w=innerWidth,h=innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.fov=w<700?55:40;camera.updateProjectionMatrix();}
addEventListener('resize',resize);resize();
const requested=params.get('skill');if(requested){const owner=live.find(r=>r.skills.some(s=>s.id===requested));if(owner)$('profession').value=owner.id;}
skills();if(requested)$('skill').value=requested;info();build();layout();
function frame(now){now/=1000;const dt=last?now-last:0;last=now;
 for(const t of timers.filter(t=>t.due<=now))vfx.hit(t.e);timers=timers.filter(t=>t.due>now);
 if($('repeat').checked&&now>=repeatAt){repeatAt=now+.35/+$('speed').value;castNow();}
 vfx.update(dt);renderer.render(scene,camera);
 const m=vfx.metrics,mem=renderer.info.memory;$('metrics').textContent=`เล่นอยู่ ${m.clips} · ออบเจ็กต์ ${m.pool} · ชีตในแคช ${m.sheets} (โหลดแล้ว ${m.loaded}) · คุณภาพ ${m.tier} · GPU textures ${mem.textures} · ยังไม่จับคู่ ${VFX_UNMATCHED.length}`;
 requestAnimationFrame(frame);}
requestAnimationFrame(frame);
window.skillVfxLab={get vfx(){return vfx;},castNow,renderer};
