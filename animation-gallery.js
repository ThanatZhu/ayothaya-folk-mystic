import {drawCharacterFrame} from './character-size.js?v=41.2';
import {loadPaintedCharacter} from './painted-character.js?v=41.2';
import {characterMotion,attackDuration} from './character-motion.js?v=37';
import {skillPose,skillTrack} from './skill-choreography.js?v=101';
import {CLASSES,NOVICE} from './classes.js?v=112.1';
const reduced=matchMedia('(prefers-reduced-motion:reduce)'),cards=[],slot=document.getElementById('slot');
let mode='walk',paused=reduced.matches,time=0,previous=null,failures=0;
for(let n=0;n<10;n++){const o=document.createElement('option');o.value=n;o.textContent='สกิล '+(n===9?'0':n+1);slot.append(o);}
for(const c of [NOVICE,...CLASSES]){
 const article=document.createElement('article'),h=document.createElement('h2'),canvas=document.createElement('canvas'),caption=document.createElement('div'),link=document.createElement('a');
 h.textContent=c.name;canvas.width=560;canvas.height=330;canvas.setAttribute('aria-label',c.name+' ชายและหญิง');caption.className='caption';caption.innerHTML=c.id==='acolyte'?'<span>พระ</span><span>แม่ชี</span>':'<span>ชาย</span><span>หญิง</span>';link.className='link';link.textContent='ลองสกิลทั้ง 10 ท่า →';link.href='./skill-lab.html?class='+c.id;article.append(h,canvas,caption,link);document.getElementById('gallery').append(article);
 const card={id:c.id,ctx:canvas.getContext('2d'),art:null,parts:null,image:null};cards.push(card);
 card.ctx.imageSmoothingEnabled=false;
 loadPaintedCharacter(c.id).then(async art=>{card.art=art;const res=await fetch('./assets/animation37/'+c.id+'.json');const meta=await res.json();card.parts=meta.parts;card.image=new Image();card.image.src='./assets/animation37/'+c.id+'.png';await card.image.decode();card.ready=true;updateStatus();}).catch(e=>{failures++;article.dataset.error='true';console.error(e);updateStatus();});
}
function updateStatus(){document.getElementById('status').textContent=failures?'มีชุดภาพโหลดไม่สำเร็จ '+failures+' อาชีพ':'โหลดพร้อม '+cards.filter(c=>c.ready).length+' / 8 อาชีพ';}
for(const b of document.querySelectorAll('[data-mode]'))b.onclick=()=>{mode=b.dataset.mode;time=0;for(const v of document.querySelectorAll('[data-mode]'))v.setAttribute('aria-pressed',String(v===b));};
const pause=document.getElementById('pause');function pauseLabel(){pause.textContent=paused?'เล่นต่อ':'หยุดภาพ';}pauseLabel();pause.onclick=()=>{paused=!paused;pauseLabel();};reduced.addEventListener('change',()=>{paused=reduced.matches;pauseLabel();});
function draw(ms){const dt=previous===null?0:Math.min(.05,(ms-previous)/1000);previous=ms;if(!paused&&!document.hidden)time+=dt;
 for(const card of cards){if(!card.art)continue;const {ctx}=card;ctx.clearRect(0,0,560,330);
  if(mode==='parts'&&card.ready){for(const [gi,g] of ['male','female'].entries())for(const [i,r] of Object.values(card.parts[g]).entries()){const [x,y,w,h]=r,s=Math.min(80/w,128/h);ctx.drawImage(card.image,x,y,w,h,gi*280+(i%3)*90+(90-w*s)/2,Math.floor(i/3)*155+(150-h*s)/2,w*s,h*s);}continue;}
  const track=skillTrack(card.id,Number(slot.value)),duration=mode==='skill'?track.duration+.6:mode==='attack'?attackDuration(card.id)+.45:1,local=mode==='walk'?time:time%duration;
  const p=mode==='skill'?skillPose(card.id,Number(slot.value),local):characterMotion({classId:card.id,mode,time:local});
  for(const [gi,g] of ['male','female'].entries()){ctx.fillStyle='#11271c88';ctx.beginPath();ctx.ellipse(140+gi*280,298,53,12,0,0,Math.PI*2);ctx.fill();drawCharacterFrame(ctx,card.art[g][p.artFrame],gi*280+12+p.x*25,54-p.y*50);}
 }
 requestAnimationFrame(draw);
}requestAnimationFrame(draw);
