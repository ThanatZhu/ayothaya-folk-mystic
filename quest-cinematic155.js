import {storyScene,sceneUnlocked,sceneForNPCTalk,taskScene} from './quest-cinematic-data155.js?v=rebirth196';
import {sceneImage} from './npc-portrait155.js?v=chuk175';
import {createPlayback,advancePlayback,acceleratePlayback,playbackFrame} from './story-playback160.js?v=rebirth199';
import {loadPaintedStanding} from './painted-character.js?v=size1';
import {FRAME_SIZE,FRAME_FOOT} from './character-size.js?v=size1';

export function createQuestCinematics({game,account,map,state}){
 const css=document.createElement('link');css.rel='stylesheet';css.href='./quest-cinematic155.css?v=rebirth199';document.head.append(css);
 const dialog=document.createElement('dialog');dialog.id='quest-cinematic';dialog.setAttribute('aria-labelledby','cinematic-title');
 dialog.innerHTML='<header><h2 id="cinematic-title"></h2><button type="button" id="cinematic-skip">ข้าม</button></header><div class="cinematic-stage" tabindex="0" aria-label="แตะฉากหรือกด Space เพื่อเร่งข้อความ"><canvas width="1280" height="640" aria-hidden="true"></canvas><p class="cinematic-loading" role="status">กำลังเตรียมฉาก…</p><div class="cinematic-caption"><p id="cinematic-caption" aria-hidden="true"><span></span><span></span></p><p class="cinematic-accessible" role="status" aria-live="polite"></p></div></div>';
 (document.getElementById('game-shell')??document.body).append(dialog);
 const $=id=>dialog.querySelector('#cinematic-'+id),stage=dialog.querySelector('.cinematic-stage'),canvas=dialog.querySelector('canvas'),ctx=canvas.getContext('2d'),loading=dialog.querySelector('.cinematic-loading'),caption=$('caption'),[text,letter]=caption.children,accessible=dialog.querySelector('.cinematic-accessible'),reduced=matchMedia('(prefers-reduced-motion:reduce)');
 const key='ayothaya-storyboard160:'+(account?.serverId??'local')+':'+(account?.slotId??'guest');let seen=new Set();try{const value=JSON.parse(localStorage.getItem(key)??'[]');if(Array.isArray(value))seen=new Set(value);}catch{}
 let active=null,image=null,hero=null,playback=null,generation=0,frame=0,last=0,hp=0,lastShot=-1,openedAt=0,onDone=null;
 const translate=s=>globalThis.I18N?.t(s)??s;
 const saveSeen=scene=>{seen.add(scene.seenId??scene.id);try{localStorage.setItem(key,JSON.stringify([...seen].slice(-200)));}catch{}};
 function danger(){const p=game.world.player;return p.hp<=0||!map.safe&&game.world.mobs.some(m=>m.hp>0&&Math.hypot(m.x-p.x,m.z-p.z)<12);}
 // `how` tells the caller why the scene ended: 'done' (every caption played), 'skip', or 'closed' (replaced, damage, error)
 function close(how='closed'){generation++;cancelAnimationFrame(frame);frame=0;last=0;const done=onDone;onDone=null;active=null;image=null;hero=null;playback=null;if(dialog.open)dialog.close();game.clearInput();done?.(how);}
 function stopDamage(){if(active?.prologue)return false;if(game.world.player.hp<hp||game.world.player.hp<=0){close();game.world.notice('กลับสู่เกม · ตัวละครกำลังได้รับความเสียหาย');return true;}return false;}
 // Full-screen scenes draw the canvas at the screen's own shape: the 16:9 painting is cropped (never stretched), and the
 // crop leans down far enough to keep the player's feet on screen.
 function fit(){
  const height=dialog.dataset.mode==='fullscreen'?Math.round(1280*Math.max(1,stage.clientHeight)/Math.max(1,stage.clientWidth)):640;
  if(canvas.width!==1280||canvas.height!==height){canvas.width=1280;canvas.height=height;}
 }
 function cover(t){
  const W=image.width,H=image.height,still=reduced.matches||!active.art.drift,zoom=still?1:1+.045*Math.min(1,t/24);
  let w=W,h=W*canvas.height/canvas.width;if(h>H){h=H;w=H*canvas.width/canvas.height;}w/=zoom;h/=zoom;
  const x=(W-w)/2+(still?0:Math.sin(t*.09)*W*.006);let y=(H-h)/2;if(active.hero)y=Math.max(y,(active.hero.y+.035)*H-h);
  return [Math.max(0,Math.min(W-w,x)),Math.max(0,Math.min(H-h,y)),w,h];
 }
 function paintHero([cx,cy,cw],t){
  const s=active.hero,scale=canvas.width/cw,size=s.h*image.height*scale/.74,x=(s.x*image.width-cx)*scale,y=(s.y*image.height-cy)*scale;
  // the player appears where they stand (no run-in), breathes a little, and in the fading scene dissolves into light
  const enter=reduced.matches?1:Math.min(1,Math.max(0,(t-.5)/.9)),fade=s.fade&&!reduced.matches?Math.max(.28,1-Math.max(0,t-2)/14):1,h=size*(reduced.matches?1:1+.012*Math.sin(t*2.3)),top=y-h*FRAME_FOOT/FRAME_SIZE;
  ctx.save();ctx.globalAlpha=enter*.42*fade;ctx.fillStyle='#000';ctx.beginPath();ctx.ellipse(x,y,size*.15,size*.035,0,0,Math.PI*2);ctx.fill();
  ctx.globalAlpha=enter*fade;ctx.imageSmoothingEnabled=false;ctx.drawImage(hero,x-size/2,top,size,h);
  if(fade<1){ctx.globalCompositeOperation='lighter';ctx.globalAlpha=enter*(1-fade)*.55;ctx.drawImage(hero,x-size/2,top,size,h);}
  ctx.restore();
 }
 function paint(){
  if(!active||!image||!playback)return;fit();const s=playbackFrame(playback,reduced.matches),height=image.height/active.art.panels,W=canvas.width,H=canvas.height;
  ctx.fillStyle='#061510';ctx.fillRect(0,0,W,H);
  if(active.prologue){
   // one painting per scene: it fades in once and drifts slowly; only the captions change shot by shot
   const t=(performance.now()-openedAt)/1000,crop=cover(t);ctx.globalAlpha=reduced.matches?1:Math.min(1,t/.7);
   ctx.drawImage(image,...crop,0,0,W,H);ctx.globalAlpha=1;if(hero)paintHero(crop,t);
  }else{
   ctx.globalAlpha=s.opacity;
   // Generated triptychs can have unequal panel boundaries. Use measured crops
   // when supplied, retaining the original equal-panel contract for story atlases.
   let crop=active.art.frames?.[s.shot]??[0,s.shot*height,image.width,height];
   // rebirth intros drift in by a few percent around the centre of each shot, so faces stay in frame
   if(active.art.zoom&&!reduced.matches){const k=1+active.art.zoom*Math.min(1,playback.age/7),[x,y,w,h]=crop;crop=[x+w*(1-1/k)/2,y+h*(1-1/k)/2,w/k,h/k];}
   ctx.drawImage(image,...crop,0,0,W,H);ctx.globalAlpha=1;
  }
  if(s.shot!==lastShot){lastShot=s.shot;accessible.textContent=playback.lines[s.shot].join('');}
  if(text.textContent!==s.text)text.textContent=s.text;if(letter.textContent!==s.next)letter.textContent=s.next;
  letter.style.opacity=reduced.matches?'1':String(s.letterOpacity);caption.parentElement.style.opacity=String(s.opacity);
  dialog.dataset.shot=String(s.shot);dialog.dataset.textSpeed=String(playback.speed);dialog.dataset.textComplete=String(s.complete);
 }
 function tick(now){frame=0;if(!dialog.open||!image||!playback)return;if(stopDamage())return;
  if(last&&!document.hidden)advancePlayback(playback,Math.min(.1,(now-last)/1000));last=now;
  if(playback.done){close('done');return;}paint();if(!document.hidden)frame=requestAnimationFrame(tick);
 }
 function resume(){last=0;if(!frame&&image&&!document.hidden)frame=requestAnimationFrame(tick);}
 // scene.prologue: full screen, and it plays even with monsters near (the realm decides when it is due). scene.hero
 // ({x,y,h} as fractions of the painting + classId, gender, appearance, equipment) puts the player's own sprite in it.
 async function open(scene,{automatic=false,onDone:done=null}={}){
  if(!scene||!scene.prologue&&danger()){if(!automatic)game.world.notice('ดูคัตซีนได้เมื่อพ้นการต่อสู้');return false;}
  if(scene.questIndex!=null&&!sceneUnlocked(scene,state()))return false;
  close();active=scene;onDone=done;hp=game.world.player.hp;lastShot=-1;const token=++generation;
  game.cancelWalk?.();game.clearInput();if(game.world.auto)game.world.setAuto?.(false);
  $('title').textContent=scene.title;text.textContent='';letter.textContent='';accessible.textContent='';
  dialog.dataset.scene=scene.id;dialog.dataset.artState='loading';dialog.dataset.mode=scene.prologue?'fullscreen':'illustrated-story';dialog.dataset.captionAt=scene.captionAt??'bottom';
  dialog.dataset.shot='0';dialog.dataset.textSpeed='30';dialog.dataset.textComplete='false';
  loading.hidden=false;loading.textContent='กำลังเตรียมฉาก…';dialog.showModal();fit();ctx.clearRect(0,0,canvas.width,canvas.height);stage.focus({preventScroll:true});
  try{const [art,sprite]=await Promise.all([sceneImage(scene.art.src),scene.hero?.classId?loadPaintedStanding(scene.hero.classId,scene.hero.gender,scene.hero.appearance??{},scene.hero.equipment??null).catch(()=>null):null]);if(token!==generation||!dialog.open)return false;
   image=art;hero=sprite;playback=createPlayback(scene.captions.map(s=>translate(s).replace('{0}',()=>scene.name??account?.character?.name??game.world.heroName??'')),{tap:scene.tap});loading.hidden=true;dialog.dataset.artState='ready';dialog.dataset.hero=hero?'ready':'none';openedAt=performance.now();saveSeen(scene);paint();resume();return true;
  }catch{if(token===generation){loading.textContent='โหลดฉากไม่สำเร็จ · กดข้ามเพื่อกลับไปคุยต่อ';dialog.dataset.artState='error';}return false;}
 }
 function skip(){if(active)saveSeen(active);close('skip');}
 function tap(){if(!playback)return;acceleratePlayback(playback);if(playback.done)close('done');else paint();}
 $('skip').onclick=skip;stage.onclick=tap;
 dialog.addEventListener('cancel',e=>{e.preventDefault();skip();});dialog.addEventListener('close',()=>{if(!dialog.open&&active)close();});
 dialog.addEventListener('keydown',e=>{if(e.target===$('skip'))return;if(e.code==='Space'||e.code==='Enter'){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)tap();}},true);
 document.addEventListener('visibilitychange',()=>{last=0;if(document.hidden){cancelAnimationFrame(frame);frame=0;}else resume();});
 addEventListener('resize',()=>{if(dialog.open)paint();});
 addEventListener('quest-cinematic-request',e=>open(e.detail?.scene??taskScene(e.detail??{}),{onDone:e.detail?.onDone??null}));
 function onTalk(npc){
  // world-ui calls this only AFTER its distance guard and conversation.open().
  if(!document.querySelector('#npc-dialog[open],#mentor-panel[open]')||game.walking||Math.hypot(game.world.player.x-npc.x,game.world.player.z-npc.z)>3)return;
  const scene=sceneForNPCTalk(state(),npc,map.id);if(!scene||seen.has(scene.seenId))return;
  open(scene,{automatic:true});
 }
 // World updates only protect a viewer taking damage; they cannot launch a scene.
 return {open,onTalk,observe(){if(dialog.open)stopDamage();},close,story:(q,s)=>open(storyScene(q,s,state().campaign,state().cycle)),get isOpen(){return dialog.open;}};
}
