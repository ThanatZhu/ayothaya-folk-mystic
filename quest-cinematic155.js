import {storyScene,sceneUnlocked,sceneForNPCTalk,taskScene} from './quest-cinematic-data155.js?v=story163';
import {sceneImage} from './npc-portrait155.js?v=chuk175';
import {createPlayback,advancePlayback,acceleratePlayback,playbackFrame} from './story-playback160.js?v=story160';

export function createQuestCinematics({game,account,map,state}){
 const css=document.createElement('link');css.rel='stylesheet';css.href='./quest-cinematic155.css?v=story160';document.head.append(css);
 const dialog=document.createElement('dialog');dialog.id='quest-cinematic';dialog.setAttribute('aria-labelledby','cinematic-title');
 dialog.innerHTML='<header><h2 id="cinematic-title"></h2><button type="button" id="cinematic-skip">ข้าม</button></header><div class="cinematic-stage" tabindex="0" aria-label="แตะฉากหรือกด Space เพื่อเร่งข้อความ"><canvas width="1280" height="640" aria-hidden="true"></canvas><p class="cinematic-loading" role="status">กำลังเตรียมฉาก…</p><div class="cinematic-caption"><p id="cinematic-caption" aria-hidden="true"><span></span><span></span></p><p class="cinematic-accessible" role="status" aria-live="polite"></p></div></div>';
 (document.getElementById('game-shell')??document.body).append(dialog);
 const $=id=>dialog.querySelector('#cinematic-'+id),stage=dialog.querySelector('.cinematic-stage'),canvas=dialog.querySelector('canvas'),ctx=canvas.getContext('2d'),loading=dialog.querySelector('.cinematic-loading'),caption=$('caption'),[text,letter]=caption.children,accessible=dialog.querySelector('.cinematic-accessible'),reduced=matchMedia('(prefers-reduced-motion:reduce)');
 const key='ayothaya-storyboard160:'+(account?.serverId??'local')+':'+(account?.slotId??'guest');let seen=new Set();try{const value=JSON.parse(localStorage.getItem(key)??'[]');if(Array.isArray(value))seen=new Set(value);}catch{}
 let active=null,image=null,playback=null,generation=0,frame=0,last=0,hp=0,lastShot=-1;
 const translate=s=>globalThis.I18N?.t(s)??s;
 const saveSeen=scene=>{seen.add(scene.seenId??scene.id);try{localStorage.setItem(key,JSON.stringify([...seen].slice(-200)));}catch{}};
 function danger(){const p=game.world.player;return p.hp<=0||!map.safe&&game.world.mobs.some(m=>m.hp>0&&Math.hypot(m.x-p.x,m.z-p.z)<12);}
 function close(){generation++;cancelAnimationFrame(frame);frame=0;last=0;active=null;image=null;playback=null;if(dialog.open)dialog.close();game.clearInput();}
 function stopDamage(){if(game.world.player.hp<hp||game.world.player.hp<=0){close();game.world.notice('กลับสู่เกม · ตัวละครกำลังได้รับความเสียหาย');return true;}return false;}
 function paint(){
  if(!active||!image||!playback)return;const s=playbackFrame(playback,reduced.matches),height=image.height/active.art.panels;
  ctx.fillStyle='#061510';ctx.fillRect(0,0,1280,640);ctx.globalAlpha=s.opacity;
  // Generated triptychs can have unequal panel boundaries. Use measured crops
  // when supplied, retaining the original equal-panel contract for story atlases.
  const crop=active.art.frames?.[s.shot]??[0,s.shot*height,image.width,height];
  ctx.drawImage(image,...crop,0,0,1280,640);ctx.globalAlpha=1;
  if(s.shot!==lastShot){lastShot=s.shot;accessible.textContent=playback.lines[s.shot].join('');}
  if(text.textContent!==s.text)text.textContent=s.text;if(letter.textContent!==s.next)letter.textContent=s.next;
  letter.style.opacity=reduced.matches?'1':String(s.letterOpacity);caption.parentElement.style.opacity=String(s.opacity);
  dialog.dataset.shot=String(s.shot);dialog.dataset.textSpeed=String(playback.speed);dialog.dataset.textComplete=String(s.complete);
 }
 function tick(now){frame=0;if(!dialog.open||!image||!playback)return;if(stopDamage())return;
  if(last&&!document.hidden)advancePlayback(playback,Math.min(.1,(now-last)/1000));last=now;
  if(playback.done){close();return;}paint();if(!document.hidden)frame=requestAnimationFrame(tick);
 }
 function resume(){last=0;if(!frame&&image&&!document.hidden)frame=requestAnimationFrame(tick);}
 async function open(scene,{automatic=false}={}){
  if(!scene||danger()){if(!automatic)game.world.notice('ดูคัตซีนได้เมื่อพ้นการต่อสู้');return false;}
  if(scene.questIndex!=null&&!sceneUnlocked(scene,state()))return false;
  close();active=scene;hp=game.world.player.hp;lastShot=-1;const token=++generation;
  game.cancelWalk?.();game.clearInput();if(game.world.auto)game.world.setAuto?.(false);
  ctx.clearRect(0,0,1280,640);$('title').textContent=scene.title;text.textContent='';letter.textContent='';accessible.textContent='';
  dialog.dataset.scene=scene.id;dialog.dataset.artState='loading';dialog.dataset.mode='illustrated-story';
  dialog.dataset.shot='0';dialog.dataset.textSpeed='30';dialog.dataset.textComplete='false';
  loading.hidden=false;loading.textContent='กำลังเตรียมฉาก…';dialog.showModal();stage.focus({preventScroll:true});
  try{const art=await sceneImage(scene.art.src);if(token!==generation||!dialog.open)return false;
   image=art;playback=createPlayback(scene.captions.map(translate));loading.hidden=true;dialog.dataset.artState='ready';saveSeen(scene);paint();resume();return true;
  }catch{if(token===generation){loading.textContent='โหลดฉากไม่สำเร็จ · กดข้ามเพื่อกลับไปคุยต่อ';dialog.dataset.artState='error';}return false;}
 }
 function skip(){if(active)saveSeen(active);close();}
 function tap(){if(!playback)return;acceleratePlayback(playback);if(playback.done)close();else paint();}
 $('skip').onclick=skip;stage.onclick=tap;
 dialog.addEventListener('cancel',e=>{e.preventDefault();skip();});dialog.addEventListener('close',()=>{if(!dialog.open&&active)close();});
 dialog.addEventListener('keydown',e=>{if(e.target===$('skip'))return;if(e.code==='Space'||e.code==='Enter'){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)tap();}},true);
 document.addEventListener('visibilitychange',()=>{last=0;if(document.hidden){cancelAnimationFrame(frame);frame=0;}else resume();});
 addEventListener('quest-cinematic-request',e=>open(e.detail?.scene??taskScene(e.detail??{})));
 function onTalk(npc){
  // world-ui calls this only AFTER its distance guard and conversation.open().
  if(!document.querySelector('#npc-dialog[open],#mentor-panel[open]')||game.walking||Math.hypot(game.world.player.x-npc.x,game.world.player.z-npc.z)>3)return;
  const scene=sceneForNPCTalk(state(),npc,map.id);if(!scene||seen.has(scene.seenId))return;
  open(scene,{automatic:true});
 }
 // World updates only protect a viewer taking damage; they cannot launch a scene.
 return {open,onTalk,observe(){if(dialog.open)stopDamage();},close,story:(q,s)=>open(storyScene(q,s)),get isOpen(){return dialog.open;}};
}
