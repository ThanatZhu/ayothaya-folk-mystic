import * as THREE from './vendor/build/three.module.js';
import {ROLES} from './assets/skills-next/catalog.js';
import {SKILL_PROFILES} from './assets/skill-polish/library-profiles.js';
import {roleTiming} from './combat-timing.js';
import {NOVICE} from './classes.js?v=novice174';
import {VFX_SHEETS,VFX_UNMATCHED} from './assets/skills-next/vfx-2026-10/vfx-map.js';
import {POSE_SHEETS} from './assets/skills-next/poses-2026-10/pose-map.js';
import {createSheetVfx,vfxPlacement} from './role-sheet-vfx.js?v=surfaces222';
import {createPaintedAvatar} from './painted-avatar.js?v=pose119';
import {createRoleAnimation,sampleRolePose,retimeRoleAnimation} from './combat-animation165.js?v=pose119';
import {characterMotion} from './character-motion.js?v=novice174';
import {poseMetrics} from './skill-pose-art.js?v=pose119';
import {loadPaintedCharacter} from './painted-character.js?v=size1';
import {CHARACTER_WORLD_SCALE,FRAME_FOOT,BODY_HEIGHT} from './character-size.js?v=size1';
// Lab for the 0.119 painted sheets: the game's own character sprite and sheet player, real cast timing,
// simulated release/damage events from the authority.
const $=id=>document.getElementById(id),params=new URLSearchParams(location.search);
const canvas=$('stage'),renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(2,devicePixelRatio));
const scene=new THREE.Scene();scene.background=new THREE.Color('#1c2f26');
const camera=new THREE.PerspectiveCamera(40,1,.1,200);camera.position.set(0,7,13);camera.lookAt(1,1,0);
scene.add(new THREE.HemisphereLight('#fff4d8','#203528',2.4));
const floor=new THREE.Mesh(new THREE.CircleGeometry(16,48),new THREE.MeshLambertMaterial({color:'#3d5a3a'}));floor.rotation.x=-Math.PI/2;scene.add(floor);
const body=(color)=>{const m=new THREE.Mesh(new THREE.CapsuleGeometry(.35,.9,4,10),new THREE.MeshLambertMaterial({color}));m.position.y=.8;const g=new THREE.Group();g.add(m);scene.add(g);return g;};
const blank=new THREE.CanvasTexture(document.createElement('canvas'));
function avatar(classId,gender){const a=createPaintedAvatar(blank,{directional:false,classId,gender});a.scale.set(CHARACTER_WORLD_SCALE,CHARACTER_WORLD_SCALE,1);scene.add(a);return {sprite:a,classId,gender,action:null};}
const world={player:{x:-2,z:0},nav:null,networkSelfId:'self'},targets=Array.from({length:8},()=>body('#c8584c'));
let caster=null,others=[],vfx=null,serial=0,timers=[],last=0,repeatAt=0;
function build(){vfx?.dispose();vfx=createSheetVfx(scene,world,{tier:$('tier').value||params.get('tier')||null});vfx.locate=id=>id.startsWith('o')?others[+id.slice(1)]?.sprite.position:null;}
const live=[{id:'novice',name:NOVICE.name,skills:Object.keys(VFX_SHEETS).filter(id=>id.startsWith('novice:')).map(id=>({id,name:VFX_SHEETS[id].name,kind:{'novice:0':'jab','novice:4':'rest','novice:5':'guard'}[id],windup:.3}))},
 ...ROLES.map(r=>({id:r.id,name:r.name,skills:[...r.base.map(s=>({...s,branch:'อาชีพ'})),...r.branches.flatMap(b=>b.active.map(s=>({...s,branch:b.name})))]}))];
for(const r of live)$('profession').add(new Option(r.name,r.id));
function hero(){const id=$('profession').value,g=$('gender').value;if(caster?.classId===id&&caster.gender===g)return;caster?.sprite.userData.dispose();if(caster)scene.remove(caster.sprite);caster=avatar(id,g);}
function skills(){$('skill').replaceChildren(...live.find(r=>r.id===$('profession').value).skills.map(s=>new Option((s.ultimate?'★ ':'')+s.name+(s.branch?' · '+s.branch:''),s.id)));hero();info();}
const pick=()=>live.find(r=>r.id===$('profession').value).skills.find(s=>s.id===$('skill').value);
function info(){const s=pick(),e=VFX_SHEETS[s.id],p=POSE_SHEETS[s.id];$('info').textContent=`${s.id} · ${s.kind} → วาง ${vfxPlacement(s.kind)} · ชีต ${e?.effect??'ไม่มี'}${e?.ground?' + พื้น':''} · ท่า ${p?'pose-'+s.id+' ×'+p.scale[$('gender').value]:'ระบบเดิม'}`;}
function layout(){const d=+$('distance').value,n=+$('targets').value;caster.sprite.position.set(-2,0,0);world.player={x:-2,z:0};
 targets.forEach((t,i)=>{t.visible=i<n;const a=(i-(n-1)/2)*.55;t.position.set(-2+d*Math.cos(a)+(i?Math.sin(i)*.6:0),0,d*Math.sin(a));});
 if($('crowd').checked&&!others.length){const ids=ROLES.map(r=>r.id);others=Array.from({length:6},(_,i)=>avatar(ids[i%ids.length],i%2?'female':'male'));}
 others.forEach((o,i)=>{o.sprite.visible=$('crowd').checked;o.sprite.position.set(-6+i*2.4,0,-5);});}
function cast(actor,who,skill,from,to){
 const speed=+$('speed').value,lag=+$('lag').value,base=roleTiming({...skill,type:skill.kind},SKILL_PROFILES[skill.id]),castId=++serial;
 const timing={...base,impacts:base.impacts.map(t=>t/speed),duration:base.duration/speed},e={type:'cast',roleSkillId:skill.id,actor,castId,timing,from,to,lag,kind:skill.kind};
 vfx.spawn(e);if(who)who.action=createRoleAnimation(e,vfx.time);
 // The authority releases each beat once (roleRelease), then damages every target in reach; like the cast, each reaches us lag late.
 timing.impacts.forEach((at,hitIndex)=>{const due=vfx.time+at;timers.push({due,who,e:{type:'roleRelease',actor,castId,hitIndex,lag}});
  targets.filter(t=>t.visible).forEach(t=>timers.push({due,e:{type:'damage',actor,castId,hitIndex,x:t.position.x,z:t.position.z,lag}}));});
 return castId;
}
let lastOwn=null;
function castNow(){layout();const s=pick(),to=targets[0].position;lastOwn=cast('self',caster,s,{x:-2,z:0},{x:to.x,z:to.z});
 if($('crowd').checked)others.forEach((o,i)=>{const pool=live.find(r=>r.id===o.classId).skills,k=pool[(serial*7+i*13)%pool.length];cast('o'+i,o,k,{x:o.sprite.position.x,z:o.sprite.position.z},{x:to.x,z:to.z});});}
$('profession').onchange=skills;$('skill').onchange=info;$('gender').onchange=()=>{hero();info();layout();};$('cast').onclick=castNow;
$('next').onclick=()=>{const el=$('skill');el.selectedIndex=(el.selectedIndex+1)%el.options.length;info();castNow();};
$('die').onclick=()=>{if(lastOwn!=null)vfx.cancel(lastOwn,'self');caster.action=null;timers=timers.filter(t=>t.e.castId!==lastOwn);};
$('travel').onclick=()=>{vfx.clear();timers=[];for(const a of [caster,...others])a.action=null;};
$('tier').onchange=build;['distance','targets','crowd'].forEach(id=>$(id).oninput=layout);
// Size check against the game's own class frames: standing body (crown with a head-wide run → ground anchor),
// measured on the class's frame 0 and on every pose sheet's ready/recover cell after its scale.
function bodyHeight(img,sx,sy,sw,sh,k){
 const w=Math.round(sw*k),h=Math.round(sh*k),c=new OffscreenCanvas(w,h),ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,sx,sy,sw,sh,0,0,w,h);
 const px=ctx.getImageData(0,0,w,h).data,foot=FRAME_FOOT*k,run=Math.round(BODY_HEIGHT*.1);
 for(let y=0;y<foot;y++){let n=0;for(let x=0;x<w;x++){if(px[(y*w+x)*4+3]>100){if(++n>=run)return foot-y;}else n=0;}}return 0;
}
async function sizeCheck(){
 $('sizes').textContent='กำลังวัด…';const rows=[];
 for(const r of ROLES){const art=await loadPaintedCharacter(r.id);
  for(const g of ['male','female']){const f=art[g][0],game=bodyHeight(f,0,0,f.width,f.height,1);
   for(const [id,p] of Object.entries(POSE_SHEETS).filter(([,p])=>p.classId===r.id)){
    const img=new Image();img.src='./assets/skills-next/poses-2026-10/game/hd/pose-'+id+'.webp';await img.decode();
    const row=g==='female'?320:0,pose=Math.max(bodyHeight(img,0,row,320,320,p.scale[g]),bodyHeight(img,1600,row,320,320,p.scale[g]));
    rows.push({id,g,game,pose,ratio:pose/game});
   }}}
 rows.sort((a,b)=>Math.abs(b.ratio-1)-Math.abs(a.ratio-1));window.sizeRows=rows;
 const within=rows.filter(r=>Math.abs(r.ratio-1)<=.05).length;
 $('sizes').textContent=`ขนาดตัว: ${within}/${rows.length} อยู่ใน ±5% ของเฟรมเดิม · ต่างมากสุด `+rows.slice(0,4).map(r=>`${r.id}/${r.g[0]} ${(r.ratio*100-100).toFixed(1)}%`).join(', ');
 return rows;
}
$('measure').onclick=sizeCheck;
// Wide screens: the panel sits on the left, so the stage is framed to its right.
function resize(){const w=innerWidth,h=innerHeight,x=w<700?0:-3.2;renderer.setSize(w,h,false);camera.aspect=w/h;camera.fov=w<700?55:34;camera.position.set(x,6,12);camera.lookAt(x,1.2,0);camera.updateProjectionMatrix();}
addEventListener('resize',resize);resize();
const requested=params.get('skill');if(requested){const owner=live.find(r=>r.skills.some(s=>s.id===requested));if(owner)$('profession').value=owner.id;}
if(params.get('gender')==='female')$('gender').value='female';
skills();if(requested)$('skill').value=requested;info();build();layout();
let shown='';
function animate(a,now,toX){
 const pose=sampleRolePose(a.action,vfx.time)??characterMotion({classId:a.classId,mode:'idle',time:now});if(!$('poses').checked)pose.skillArt=null;
 a.sprite.userData.pose(pose,toX<a.sprite.position.x);a.sprite.position.y=a.sprite.userData.skillArt?0:pose.y??0;
 return pose;
}
function frame(now){now/=1000;const dt=last?now-last:0;last=now;tick(dt,now);requestAnimationFrame(frame);}
// One rendered frame; also driven by hand (skillVfxLab.step) for checks in a background tab.
function tick(dt,now){
 const paused=$('pause').checked;vfx.update(paused?0:dt);
 for(const t of timers.filter(t=>t.due<=vfx.time)){if(t.e.type==='roleRelease')retimeRoleAnimation(t.who?.action,t.e,vfx.time);vfx.hit(t.e);}timers=timers.filter(t=>t.due>vfx.time);
 if(!paused&&$('repeat').checked&&now>=repeatAt){repeatAt=now+.35/+$('speed').value;castNow();}
 const p=animate(caster,now,targets[0].position.x);for(const o of others)if(o.sprite.visible)animate(o,now,targets[0].position.x);
 shown=p.skillArt?`ท่า ${caster.sprite.userData.skillArt?'ชีตใหม่':'เฟรมเดิม (กำลังโหลด/ไม่รองรับ)'} เฟรม ${p.skillArt.frame}`:'ท่ายืน';
 renderer.render(scene,camera);
 const m=vfx.metrics,pm=poseMetrics(),mem=renderer.info.memory;$('metrics').textContent=`${shown} · เอฟเฟกต์เล่นอยู่ ${m.clips} · ออบเจ็กต์ ${m.pool} · ชีต VFX ${m.sheets} (โหลด ${m.loaded}) · ชีตท่า ${pm.sheets} (โหลด ${pm.loaded}) · คุณภาพ ${m.tier}/${pm.tier} · GPU textures ${mem.textures} · VFX ยังไม่จับคู่ ${VFX_UNMATCHED.length}`;
 return p;}
requestAnimationFrame(frame);
let manual=0;
window.skillVfxLab={get vfx(){return vfx;},get caster(){return caster;},castNow,renderer,sizeCheck,step:(dt=1/60)=>tick(dt,manual+=dt)};
