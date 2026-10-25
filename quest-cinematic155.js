import {storyScene,sceneUnlocked,taskScene,sampleScene} from './quest-cinematic-data155.js?v=155';
import {sceneImage,loadNPCPortrait,npcActorId} from './npc-portrait155.js?v=155';
import {loadPaintedCharacter} from './painted-character.js?v=podium153';
import {loadLifeArt,lifeFrameAt} from './character-life-art.js';
import {MONSTER_TYPES} from './combat-core.js?v=role116';
import {loadChapter2Monster,chapter2FrameAt,drawChapter2Monster} from './chapter2-monster-art.js';

const monsterCache=new Map();
async function monsterArt(id){
 const type=MONSTER_TYPES.find(t=>t.id===id);if(!type)return null;
 if(!monsterCache.has(id))monsterCache.set(id,(async()=>{
  if(type.chapter2Art)return {type,authored:await loadChapter2Monster({...type,animation:'animations/'+type.chapter2Art+'.json'})};
  if(!type.sheet)return null;
  const [image,response]=await Promise.all([sceneImage('./assets/frontier38/'+type.sheet+'.png'),fetch('./assets/frontier38/'+type.sheet+'.json')]);if(!response.ok)throw Error('monster-art');
  const meta=await response.json();return {type,frames:meta.rects.slice(type.row*8,type.row*8+8).map(rect=>{const c=document.createElement('canvas');c.width=rect[2];c.height=rect[3];c.getContext('2d').drawImage(image,...rect,0,0,...rect.slice(2));return c;})};
 })().catch(e=>{monsterCache.delete(id);throw e;}));return monsterCache.get(id);
}
export function createQuestCinematics({game,account,catalog,map,state}){
 const css=document.createElement('link');css.rel='stylesheet';css.href='./quest-cinematic155.css?v=155';document.head.append(css);
 const dialog=document.createElement('dialog');dialog.id='quest-cinematic';dialog.setAttribute('aria-labelledby','cinematic-title');
 dialog.innerHTML='<header><div><small>AYOTHAYA · STORY</small><h2 id="cinematic-title"></h2></div><button type="button" id="cinematic-skip">ข้ามฉาก / กลับ</button></header><div class="cinematic-stage"><canvas width="1280" height="720" aria-label="คัตซีนตัวละครของคุณ"></canvas><p class="cinematic-loading" role="status">กำลังเตรียมฉาก…</p><div class="cinematic-caption"><small id="cinematic-speaker"></small><p id="cinematic-caption" aria-live="polite"></p></div></div><footer><button type="button" id="cinematic-pause">พักฉาก</button><button type="button" id="cinematic-replay">ดูอีกครั้ง</button><input id="cinematic-seek" type="range" min="0" max="14" step="0.05" value="0" aria-label="ตำแหน่งคัตซีน"><small id="cinematic-time"></small></footer>';
 (document.getElementById('game-shell')??document.body).append(dialog);const $=id=>dialog.querySelector('#cinematic-'+id),canvas=dialog.querySelector('canvas'),ctx=canvas.getContext('2d'),loading=dialog.querySelector('.cinematic-loading'),reduced=matchMedia('(prefers-reduced-motion:reduce)');
 const key='ayothaya-cinematic155:'+(account?.serverId??'local')+':'+(account?.slotId??'guest');let seen=new Set();try{seen=new Set(JSON.parse(localStorage.getItem(key)??'[]'));}catch{}
 let active=null,assets=null,generation=0,frame=0,time=0,last=0,paused=false,ready=false,lastCaption='',hp=0,lastObserved='',queued=null,autoAt=0;
 const saveSeen=id=>{seen.add(id);try{localStorage.setItem(key,JSON.stringify([...seen].slice(-150)));}catch{}};
 function danger(){const p=game.world.player;return p.hp<=0||!map.safe&&game.world.mobs.some(m=>m.hp>0&&Math.hypot(m.x-p.x,m.z-p.z)<12);}
 function close(){generation++;cancelAnimationFrame(frame);frame=0;active=null;assets=null;ready=false;if(dialog.open)dialog.close();game.clearInput();}
 function stopDamage(){if(game.world.player.hp<hp||game.world.player.hp<=0){close();game.world.notice('กลับสู่เกม · ตัวละครกำลังได้รับความเสียหาย');return true;}return false;}
 function sprite(image,x,foot,height,flip=false,padded=false){if(!image)return;ctx.save();ctx.translate(x,foot);if(flip)ctx.scale(-1,1);ctx.imageSmoothingEnabled=false;
  const scale=height/(padded?210:image.height);ctx.drawImage(image,-image.width*scale/2,-(padded?276:image.height)*scale,image.width*scale,image.height*scale);ctx.restore();}
 function paint(){
  if(!active||!assets)return;const s=sampleScene(active,time,reduced.matches),{background,hero,npc,life,monster}=assets;ctx.clearRect(0,0,1280,720);
  ctx.fillStyle='#0c211c';ctx.fillRect(0,0,1280,720);ctx.save();ctx.translate(640,360);ctx.scale(s.camera,s.camera);ctx.translate(-640,-360);
  if(background){const scale=Math.max(1280/background.width,720/background.height);ctx.drawImage(background,(1280-background.width*scale)/2,(720-background.height*scale)/2,background.width*scale,background.height*scale);}
  const shade=ctx.createLinearGradient(0,100,0,720);shade.addColorStop(0,'#09252108');shade.addColorStop(1,'#041a16b0');ctx.fillStyle=shade;ctx.fillRect(0,0,1280,720);
  const foot=590,x=s.heroX*1280;for(const sx of [x,896]){ctx.fillStyle='#05100c60';ctx.beginPath();ctx.ellipse(sx,foot,64,15,0,0,Math.PI*2);ctx.fill();}
  const index=s.heroAction==='walk'?12+Math.floor(time*9)%8:s.heroAction==='attack'?[5,6,7,10][Math.floor(time*5)%4]:0;
  sprite(hero?.[index]??hero?.[0],x,foot+(s.heroAction==='walk'?Math.sin(time*18)*2:0),245,false,true);
  if(monster){if(monster.authored){const action=s.phase===1?'attack':'idle',f=chapter2FrameAt(monster.authored.meta,action,time*1000);drawChapter2Monster(ctx,monster.authored,f.index,s.monsterX*1280,foot,monster.type.boss?280:185);}else sprite(monster.frames[Math.floor(time*(s.phase===1?7:2))%monster.frames.length],s.monsterX*1280,foot,monster.type.boss?280:185,true);}
  else {const clip=life?.clips[s.npcAction]??life?.clips.idle,pose=clip?.frames[lifeFrameAt(clip,time,reduced.matches)];sprite(pose??npc,s.npcX*1280,foot,235,false,!!pose);}
  if(s.glow>0){ctx.save();ctx.globalCompositeOperation='screen';const combat=active.step.type==='defeat';ctx.strokeStyle=combat?'#f1d18c':'#82e7d1';ctx.lineWidth=3;
   ctx.globalAlpha=s.glow*.6;ctx.beginPath();for(let i=0;i<=50;i++){const q=i/50,xx=x+(896-x)*q,yy=425+Math.sin(q*7-time*2)*18; i?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy);}ctx.stroke();
   if(combat&&!reduced.matches){ctx.globalAlpha=.65*(1-time*2%1);ctx.lineWidth=7;ctx.beginPath();ctx.arc(866,440,70,-1.1,1);ctx.stroke();}ctx.restore();}
  // Fixed, deterministic spirit motes; reduced motion removes moving effects and camera zoom.
  if(!reduced.matches){for(let i=0;i<18;i++){const xx=(i*83+time*(7+i%4))%1280,yy=150+(i*47-time*11)%420;ctx.fillStyle=`rgba(247,221,138,${.15+.25*(1+Math.sin(time+i))/2})`;ctx.beginPath();ctx.arc(xx,yy,2,0,7);ctx.fill();}}
  ctx.restore();ctx.fillStyle='#020b08';ctx.fillRect(0,0,1280,38);ctx.fillRect(0,665,1280,55);
  if(s.caption!==lastCaption){lastCaption=s.caption;$('caption').textContent=s.caption;$('speaker').textContent=s.phase===1?(active.npc?.name??active.step.npc??active.title):active.title;}
  $('seek').value=time;$('time').textContent=Math.floor(time)+' / '+active.duration+'s';dialog.dataset.phase=String(s.phase);dialog.dataset.playerFrame=String(index);
 }
 function tick(now){frame=0;if(!dialog.open||!active||!ready)return;if(stopDamage())return;
  if(last&&!paused&&!document.hidden)time=Math.min(active.duration,time+Math.min(.1,(now-last)/1000));last=now;paint();
  if(time>=active.duration){paused=true;$('pause').textContent='เล่นต่อ';dialog.dataset.finished='true';}
  if(!document.hidden&&!paused)frame=requestAnimationFrame(tick);
 }
 function resumeLoop(){last=0;if(!frame&&ready&&!document.hidden)frame=requestAnimationFrame(tick);}
 async function open(scene,{automatic=false}={}){
  if(!scene||danger()){if(!automatic)game.world.notice('ดูคัตซีนได้เมื่อพ้นการต่อสู้');return false;}
  if(scene.questIndex!=null&&!sceneUnlocked(scene,state()))return false;
  close();active=scene;time=0;paused=false;ready=false;hp=game.world.player.hp;lastCaption='';const token=++generation;
  game.cancelWalk?.();game.clearInput();if(game.world.auto)game.world.setAuto?.(false);
  $('title').textContent=scene.title;$('caption').textContent='';$('seek').max=scene.duration;$('seek').value=0;$('pause').textContent='พักฉาก';dialog.dataset.finished='false';dialog.dataset.scene=scene.id;dialog.dataset.artState='loading';loading.hidden=false;loading.textContent='กำลังเตรียมฉาก…';dialog.showModal();$('skip').focus();
  const n=scene.npc??catalog.maps.flatMap(m=>m.npcs).find(n=>n.name===scene.step.npc)??catalog.maps.flatMap(m=>m.npcs).find(n=>n.name==='ขุนอินทร์'),c=account?.character??{classId:game.world.profession.id,gender:'male'},look=JSON.stringify([c.classId,c.gender,c.appearance,account?.equipment]);dialog.dataset.playerLook=look;
  try{const [background,all,npc,life,monster]=await Promise.all([sceneImage(scene.art.src),loadPaintedCharacter(c.classId,c.appearance??{},account?.equipment),n?loadNPCPortrait(n):null,n?loadLifeArt(npcActorId(n)).catch(()=>null):null,scene.step.monster?monsterArt(scene.step.monster):null]);
   if(token!==generation||!dialog.open)return false;assets={background,hero:all[c.gender==='female'?'female':'male'],npc,life,monster};ready=true;loading.hidden=true;dialog.dataset.artState='ready';saveSeen(scene.id);paint();resumeLoop();return true;
  }catch{if(token===generation){loading.textContent='โหลดฉากไม่สำเร็จ · กดดูอีกครั้งเพื่อลองใหม่ หรือกลับไปเล่นต่อ';dialog.dataset.artState='error';}return false;}
 }
 function skip(){if(active)saveSeen(active.id);close();}
 $('skip').onclick=skip;dialog.addEventListener('cancel',e=>{e.preventDefault();skip();});dialog.addEventListener('close',()=>{if(!dialog.open)close();});
 $('pause').onclick=()=>{paused=!paused;$('pause').textContent=paused?'เล่นต่อ':'พักฉาก';if(!paused&&active&&time>=active.duration)time=0;resumeLoop();};
 $('replay').onclick=()=>{if(!ready){if(active)open(active);return;}time=0;paused=false;dialog.dataset.finished='false';$('pause').textContent='พักฉาก';paint();resumeLoop();};
 $('seek').oninput=()=>{time=+$('seek').value;paint();};
 dialog.addEventListener('keydown',e=>{if(e.code==='Space'&&e.target.tagName!=='INPUT'){e.preventDefault();e.stopImmediatePropagation();$('pause').click();}},true);
 document.addEventListener('visibilitychange',()=>{last=0;if(document.hidden){cancelAnimationFrame(frame);frame=0;}else resumeLoop();});
 addEventListener('quest-cinematic-request',e=>open(e.detail?.scene??taskScene(e.detail??{})));
 function observe(){
  if(dialog.open){stopDamage();return;}if(game.online&&!game.world.story)return;
  const current=state(),id=current.done?'done':`${current.quest}:${current.step}`;
  if(id!==lastObserved){lastObserved=id;queued=current.done?null:storyScene(current.quest,current.step);autoAt=performance.now()+4000;}
  if(!queued||seen.has(queued.id)||performance.now()<autoAt||document.hidden||danger()||game.walking||game.world.auto||document.querySelector('dialog[open],#account-panel:not([hidden])')||document.body.matches('.mobile-chat-open,.mobile-menu-open,.controls-editing')||[...document.querySelectorAll('.journey-loading,#travel-loading')].some(e=>!e.classList.contains('leaving')&&e.checkVisibility?.({checkVisibilityCSS:true})))return;
  const pending=queued;queued=null;open(pending,{automatic:true});
 }
 return {open,observe,close,story:(q,s)=>open(storyScene(q,s)),get isOpen(){return dialog.open;}};
}
