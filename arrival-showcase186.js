import {createMotionPreview} from './motion-preview.js?v=arrival186';
import {characterMotion,attackDuration} from './character-motion.js?v=novice174';
import {atlasPath} from './classes.js?v=novice174';
import {ROLES} from './assets/skills-next/catalog.js';
import {reworkIconURL} from './assets/skills-next/rework-icon-map.js';

// A presentation-only gallery. Choosing a path here never changes the created
// character: every account still enters the world as the existing Novice class.
export function createArrivalShowcase(host){
 if(!host)return {setScreen(){},dispose(){}};
 const reduced=matchMedia('(prefers-reduced-motion:reduce)'),images=new Map();
 let selected=0,screen='login',elapsed=0,last=0,raf=0,disposed=false,loadToken=0,manualUntil=0,returnFocus=null;
 const node=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
 const button=(cls,text,label)=>{const e=node('button',cls,text);e.type='button';if(label)e.setAttribute('aria-label',label);return e;};
 const stage=node('div','arrival-stage'),orbit=node('div','arrival-orbit'),glow=node('div','arrival-glow'),hero=node('div','arrival-hero');
 orbit.setAttribute('aria-hidden','true');glow.setAttribute('aria-hidden','true');hero.setAttribute('aria-hidden','true');stage.append(orbit,glow,hero);
 const caption=node('div','arrival-caption'),kicker=node('small','arrival-kicker','หนึ่งโลก · เจ็ดเส้นทาง'),title=node('h3','arrival-class'),roleLabel=node('p','arrival-role');caption.append(kicker,title,roleLabel);
 const controls=node('div','arrival-controls'),prev=button('arrival-prev','‹','ดูอาชีพก่อนหน้า'),next=button('arrival-next','›','ดูอาชีพถัดไป'),dots=node('div','arrival-dots');
 const explore=button('arrival-explore','สำรวจ 7 อาชีพ');explore.setAttribute('aria-haspopup','dialog');explore.setAttribute('aria-controls','path-preview-dialog');
 const selections=ROLES.map((role,i)=>{const b=button('arrival-dot','',role.name);b.onclick=()=>choose(i,{manual:true});dots.append(b);return b;});
 controls.append(prev,dots,next);host.replaceChildren(stage,caption,controls,explore);
 const preview=createMotionPreview(hero);

 const dialog=node('dialog','path-dialog');dialog.id='path-preview-dialog';dialog.setAttribute('aria-labelledby','path-preview-title');
 const heading=node('header','path-heading'),headingText=node('div','path-heading-copy'),eyebrow=node('small','path-kicker','ค้นพบเส้นทางของคุณ'),headingTitle=node('h2',null,'7 อาชีพ · เลือกทางที่เป็นคุณ');headingTitle.id='path-preview-title';headingText.append(eyebrow,headingTitle);
 const close=button('path-close','×','ปิดพรีวิวอาชีพ');heading.append(headingText,close);
 const body=node('div','path-body'),list=node('nav','path-list');list.setAttribute('aria-label','พรีวิวอาชีพ');
 const pathStage=node('div','path-stage'),pathHero=node('div','path-hero'),poseLabel=node('span','path-pose','ท่ายืน');pathHero.setAttribute('aria-hidden','true');pathStage.append(pathHero,poseLabel);
 const detail=node('section','path-detail'),detailKicker=node('small','path-kicker','เส้นทางการผจญภัย'),name=node('h3','path-name'),roleText=node('p','path-role'),description=node('p','path-description'),skillTitle=node('h4','path-section-title','สกิลประจำเส้นทาง'),skills=node('div','path-skills'),masterTitle=node('h4','path-section-title','ต่อยอดเป็น Master'),masters=node('div','path-masters');detail.append(detailKicker,name,roleText,description,skillTitle,skills,masterTitle,masters);
 const note=node('footer','path-note','ทุกอาชีพเริ่มจากผู้ฝึกตน · เลือกเส้นทางเมื่อ Job 10');body.append(list,pathStage,detail);dialog.append(heading,body,note);document.body.append(dialog);
 const largePreview=createMotionPreview(pathHero);
 const choices=ROLES.map((role,i)=>{const b=button('path-choice'),portrait=node('span','path-portrait'),label=node('b',null,role.name);portrait.style.backgroundImage=`url("${atlasPath(role.id)}")`;portrait.setAttribute('aria-hidden','true');b.dataset.classId=role.id;b.append(portrait,label);b.onclick=()=>choose(i,{manual:true});list.append(b);return b;});

  function load(id){if(!images.has(id)){const image=new Image();image.src=atlasPath(id);images.set(id,image.decode().then(()=>image).catch(error=>{images.delete(id);throw error;}));}return images.get(id);}
 function renderDetails(role){
  name.textContent=role.name;roleText.textContent=role.role;description.textContent=role.weakness;
  skills.replaceChildren(...[role.base[0],role.base[1],role.base[5]].map(skill=>{
   const item=node('article','path-skill'),img=node('img'),copy=node('div','path-skill-copy');img.src=reworkIconURL(skill.art);img.alt='';img.width=img.height=48;img.decoding='async';copy.append(node('b',null,skill.name),node('small',null,skill.tip));item.append(img,copy);return item;
  }));
  masters.replaceChildren(...role.branches.map(branch=>{const item=node('article','path-master');item.append(node('b',null,branch.name),node('small',null,branch.role));return item;}));
 }
 async function choose(index,{manual=false}={}){
  if(disposed)return;selected=(index+ROLES.length)%ROLES.length;elapsed=0;if(manual)manualUntil=performance.now()+16000;
  const role=ROLES[selected],token=++loadToken;host.dataset.classId=role.id;host.style.setProperty('--path-color',role.color);dialog.style.setProperty('--path-color',role.color);title.textContent=role.name;roleLabel.textContent=role.role;
  selections.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===selected)));choices.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===selected)));renderDetails(role);
  host.dataset.artReady='loading';
  try{const img=await load(role.id);if(token!==loadToken||disposed)return;preview.setSource(img,'male',role.id);largePreview.setSource(img,'male',role.id);host.dataset.artReady='true';draw();}
  catch{if(token===loadToken){host.dataset.artReady='error';roleLabel.textContent=role.role;}}
 }
 function draw(){
  const role=ROLES[selected],phase=elapsed%14;let mode='idle',time=elapsed*.7;
  if(phase>=4.5&&phase<8)mode='walk';
  else if(phase>=8&&phase<10.5){mode='attack';time=((phase-8)*.7)%attackDuration(role.id);}
  const pose=characterMotion({time,mode,classId:role.id,reduced:false});
  if(screen!=='character')preview.draw(pose);if(dialog.open)largePreview.draw(pose);
  host.dataset.pose=mode;dialog.dataset.pose=mode;poseLabel.textContent=mode==='attack'?'ท่าโจมตี':mode==='walk'?'ท่าเดิน':'ท่ายืน';
 }
 function frame(now){
  raf=0;if(disposed||document.hidden)return;const dt=last?Math.min(.1,(now-last)/1000):0;last=now;
  elapsed+=dt*(reduced.matches?.65:1);
  if(screen!=='character'||dialog.open){
   if(!dialog.open&&elapsed>=14&&now>=manualUntil)choose(selected+1);
   draw();
  }
  raf=requestAnimationFrame(frame);
 }
 function visibility(){last=0;if(document.hidden){if(raf)cancelAnimationFrame(raf);raf=0;}else if(!raf&&!disposed)raf=requestAnimationFrame(frame);}
 function open(){if(disposed||dialog.open)return;returnFocus=document.activeElement;manualUntil=Infinity;dialog.showModal();draw();close.focus();}
 function onClose(){manualUntil=performance.now()+14000;elapsed=0;if(returnFocus?.isConnected&&returnFocus.getClientRects().length)returnFocus.focus();else if(explore.getClientRects().length)explore.focus();}
 close.onclick=()=>dialog.close();dialog.addEventListener('close',onClose);dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
 prev.onclick=()=>choose(selected-1,{manual:true});next.onclick=()=>choose(selected+1,{manual:true});explore.onclick=open;
 document.addEventListener('visibilitychange',visibility);reduced.addEventListener('change',draw);choose(0);visibility();
 return {
  setScreen(value){screen=value;host.hidden=value==='character';elapsed=0;last=0;draw();},
  open,choose(index){return choose(index,{manual:true});},
  get selected(){return ROLES[selected].id;},get dialog(){return dialog;},
  dispose(){disposed=true;if(raf)cancelAnimationFrame(raf);document.removeEventListener('visibilitychange',visibility);reduced.removeEventListener('change',draw);dialog.close();dialog.remove();host.replaceChildren();images.clear();}
 };
}
