// 0.53 sound, music and hit feedback; 0.116 the music and effects are real audio files (assets/audio180, made from
// code in outputs/audio-v2: Thai 7-tone scale, ranat, khong wong, ching, pi, so u, klong). Each kind of place has its
// own looping track, a boss in a fight nearby crossfades to the boss track. Effects follow the game events.
import {itemDef,RARITY_NAME} from './items.js?v=107';
import {createLevelUpNotice} from './level-up-notice.js?v=1';
import {MONSTER_TYPES} from './combat-core.js?v=novice174';
import {BGM,SFX,themeOf,audioUrl,COMBAT_CLASSES,COMBAT_FAMILIES,combatFile,combatUrl} from './audio-catalog180.js?v=180';
import {SKILL_PROFILES} from './assets/skill-polish/library-profiles.js';
import {ROLE_FRIEND_KINDS,ROLE_SELF_KINDS} from './role-combat.js';
const KEY='ayothaya-audio';

export function createFeedback({game,map}){
 if(!document.querySelector('link[data-feedback]')){const css=document.createElement('link');css.rel='stylesheet';css.href='feedback.css?v=109.4';css.dataset.feedback='';document.head.append(css);}
 const world=game.world,levelNotice=createLevelUpNotice({clearInput:()=>game.clearInput()});let settings={music:.35,sfx:.7};try{settings={...settings,...JSON.parse(localStorage.getItem(KEY))};}catch{}
 let ctx=null,master,musicBus,sfxBus;const buffers=new Map(),loading=new Map();
 function start(){ // browsers only allow audio after a tap / key press
  if(ctx)return ctx.state==='suspended'&&!document.hidden&&ctx.resume();
  const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
  // 0.121 a limiter on the way out: a crowd of hits no longer clips
  ctx=new AC();master=ctx.createGain();const limiter=ctx.createDynamicsCompressor();master.connect(limiter);limiter.connect(ctx.destination);
  limiter.threshold.value=-10;limiter.knee.value=6;limiter.ratio.value=12;limiter.attack.value=.002;limiter.release.value=.15;
  musicBus=ctx.createGain();sfxBus=ctx.createGain();musicBus.connect(master);sfxBus.connect(master);
  levels();for(const s of Object.values(SFX))s.files.forEach(load);preloadClass();music();
 }
 for(const t of ['pointerdown','keydown'])addEventListener(t,start,{capture:true,passive:true});
 document.addEventListener('visibilitychange',()=>{if(!ctx)return;document.hidden?ctx.suspend():ctx.resume();});
 function levels(){if(!ctx)return;musicBus.gain.value=settings.music*.6;sfxBus.gain.value=settings.sfx;}
 const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(settings));}catch{}levels();};
 function load(file){
  if(!loading.has(file))loading.set(file,fetch(/^(fam|cls)-/.test(file)?combatUrl(file):audioUrl(file)).then(r=>r.ok?r.arrayBuffer():Promise.reject(r.status))
   .then(data=>new Promise((ok,no)=>ctx.decodeAudioData(data,ok,no))).then(buffer=>{buffers.set(file,buffer);return buffer;}).catch(()=>null));
  return loading.get(file);
 }

 // ---- effects: a random variant, slightly varied pitch for the frequent ones
 const play=name=>{const fx=SFX[name];if(fx)playFile(fx.files[Math.floor(Math.random()*fx.files.length)],{vary:fx.files.length>1});};
 // one file now or `at` seconds from now; at most 14 effects sound at once, the rest are skipped
 let voices=0;
 function playFile(file,{gain=1,at=0,vary=true}={}){
  if(!ctx||ctx.state!=='running'||!settings.sfx||voices>=14)return;const buffer=buffers.get(file);if(!buffer)return void load(file);
  const src=ctx.createBufferSource(),level=ctx.createGain();src.buffer=buffer;if(vary)src.playbackRate.value=.96+Math.random()*.08;level.gain.value=gain;
  src.connect(level);level.connect(sfxBus);voices++;src.onended=()=>{voices--;level.disconnect();};src.start(ctx.currentTime+Math.max(0,at));
 }

 // ---- 0.121 combat: the class's own swing and hit for basic attacks; a skill plays its effect family's cast when it
 // starts (the client's predicted start, else the realm's), its family hit when its damage lands (once per blow, however
 // many it hits) and, for heals and buffs that deal none, at its impact time; an ultimate adds the class sting.
 const classId=()=>world.profession?.id,classSet=id=>COMBAT_CLASSES.includes(id);
 const variant=n=>Math.floor(Math.random()*n);
 const familyOf=id=>{const f=SKILL_PROFILES[id]?.layers?.[0]?.sheet;return COMBAT_FAMILIES.includes(f)?f:null;};
 function preloadClass(){
  const c=classId();if(!classSet(c))return;for(const part of ['swing','hit'])for(const v of [0,1,2])load(combatFile('cls',c,part,v));load(combatFile('cls',c,'ult',0));
  for(const p of Object.values(SKILL_PROFILES))if(p.classId===c&&familyOf(p.id))for(const part of ['cast','hit'])for(const v of [0,1])load(combatFile('fam',familyOf(p.id),part,v));
 }
 const predicted=new Map(),blows=new Set();
 function skillCast(e){
  const family=familyOf(e.roleSkillId),profile=SKILL_PROFILES[e.roleSkillId],now=performance.now()/1000;
  if(!family)return play('cast');
  if(e.predicted)predicted.set(e.roleSkillId,now);
  else if(now-(predicted.get(e.roleSkillId)??-9)<1.5)return void predicted.delete(e.roleSkillId); // already sounded on the press
  playFile(combatFile('fam',family,'cast',variant(2)),{gain:.75});
  if(profile?.skill?.ultimate&&classSet(profile.classId))playFile(combatFile('cls',profile.classId,'ult',0),{gain:.9,vary:false});
  const kind=profile?.skill?.kind??e.kind;
  if(ROLE_SELF_KINDS.has(kind)||ROLE_FRIEND_KINDS.has(kind))playFile(combatFile('fam',family,'hit',variant(2)),{at:(e.timing?.impacts?.[0]??.36)-Math.max(0,e.lag??0),gain:.8});
 }
 function damageSound(e){
  if(e.source==='poison')return;
  if(e.source==='skill'||e.source==='spirit'){
   const key=(e.castId??e.shotId)+':'+(e.hitIndex??0),family=familyOf(e.roleSkillId);if(blows.has(key))return;if(blows.size>200)blows.clear();blows.add(key);
   if(family)playFile(combatFile('fam',family,'hit',variant(2)),{gain:e.source==='spirit'?.55:1});else play('hit');
  }else if(classSet(classId()))playFile(combatFile('cls',classId(),'hit',variant(3)));
  else play('hit');
  if(e.crit)play('crit');
 }

 // ---- music: the map's track, the boss track while a boss nearby is in a fight; 1.6 s crossfades
 const home=themeOf(map);let current=null,playing=null,bossUntil=0;
 async function want(theme){
  if(theme===current)return;current=theme;const buffer=await load('bgm-'+theme);if(current!==theme||!buffer)return;
  const t=ctx.currentTime;if(playing){const old=playing;old.gain.gain.setValueAtTime(old.gain.gain.value,t);old.gain.gain.linearRampToValueAtTime(0,t+1.6);old.src.stop(t+1.7);}
  const src=ctx.createBufferSource(),gain=ctx.createGain();src.buffer=buffer;src.loop=true;src.loopEnd=Math.min(BGM[theme].seconds,buffer.duration);
  gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(1,t+1.6);src.connect(gain);gain.connect(musicBus);src.start(t);playing={src,gain};
 }
 function bossNear(){
  const p=world.player;if(!p||map.safe)return false;
  return (world.mobs??[]).some(m=>m.hp>0&&MONSTER_TYPES[m.type]?.boss&&Math.hypot(m.x-p.x,m.z-p.z)<22&&(m.aggro||m.hp<m.maxHp));
 }
 function music(){
  want(home);
  setInterval(()=>{if(!ctx||ctx.state!=='running')return;const now=performance.now();if(bossNear())bossUntil=now+6000;want(now<bossUntil?'boss':home);},1000);
 }
 // button presses anywhere in the interface (not the 3D view)
 document.addEventListener('click',e=>{if(e.target.closest?.('button,[role="button"],summary,.tab'))play('click');},{capture:true,passive:true});

 // ---- event → sound / visuals
 let lastHit=0;
 const banner=(html,cls)=>{const b=document.createElement('div');b.className='big-banner '+cls;b.innerHTML=html;document.body.append(b);setTimeout(()=>b.remove(),3200);};
 game.onEvent(e=>{
  if(e.type==='cast'||e.type==='playerHit')levelNotice.hide();
  if(e.type==='cast'){if(e.roleSkillId)skillCast(e);else if(Number.isInteger(e.skillIndex))play('cast');else if(classSet(classId()))playFile(combatFile('cls',classId(),'swing',variant(3)),{gain:.7});else play('swing');}
  else if(e.type==='damage'){const now=performance.now();if(now-lastHit>45||e.source==='skill'){lastHit=now;damageSound({...e,crit:e.crit??e.color==='#ffd27a'});}}
  else if(e.type==='playerHit')play('hurt');
  else if(e.type==='dodge')play('dodge');
  else if(e.type==='defeat')play('defeat');
  else if(e.type==='used')play('potion');
  else if(e.type==='heal')play('potion');
  else if(e.type==='experience'&&(e.baseUp||e.jobUp)){play('level');levelUp(e);}
  else if(e.type==='drop'){const best=e.items.map(i=>itemDef(i.id)).filter(Boolean).sort((a,b)=>b.rarity-a.rarity)[0];if(best?.rarity>=2){play('rare');world.notice(`✦ ของ${RARITY_NAME[best.rarity]}! ${best.name}`);if(best.rarity>=3)banner(`<strong>✦ ${RARITY_NAME[best.rarity]}!</strong><span>${best.name}</span>`,'levelup rare-drop');}}
  else if(['mvp','dungeonClear'].includes(e.type))play('fanfare');
  else if(e.type==='refined')play('forge');
  else if(e.type==='stallSold')play('coin');
  else if(['daily','tamed'].includes(e.type))play('chime');
 });
 // Level ups: Thai lettering between gold kanok scrolls above the hero's name tag with an
 // English line, a ring of light and lotus petals rising from the feet (~2.6 s).
 // Gains use a short HUD-corner button; the equipment list opens only on request.
 const KANOK='<svg viewBox="0 0 64 30" aria-hidden="true"><path class="k-line" d="M64 18C52 18 46 8 34 8 22 8 15 16 19 23 23 29 33 26 31 18 30 13 24 14 25 19"/><path d="M38 9C37 3 42 0 47 0 44 3 45 6 42 10Z M27 9C24 4 26 0 30-1 29 3 31 6 30 9Z M50 13C51 8 56 6 60 7 56 9 56 12 53 15Z"/><circle cx="64" cy="18" r="2.4"/></svg>';
 function levelUp(e){
  const fx=document.createElement('div');fx.className='rank-up';
  const en=globalThis.I18N?.lang==='en'?'':`<span class="rank-en">${e.baseUp?'Level Up':'Job Level Up'}</span>`; // English mode already translates the title
  const petals=Array.from({length:10},(_,i)=>`<i class="petal" style="--x:${(i-4.5)*13+Math.round(Math.random()*10-5)}px;--r:${Math.round(Math.random()*300+60)}deg;animation-delay:${(i%3)*.09}s"></i>`).join('');
  fx.innerHTML=`<div class="rank-banner"><strong>${KANOK}<b>${e.baseUp?'ขึ้นระดับ':'Job ขึ้นระดับ'}</b>${KANOK}</strong>${en}<i class="rank-rule"></i><span class="rank-lv">${e.baseUp?'Base Lv. '+e.baseLevel:'Job Lv. '+e.jobLevel}</span></div><i class="ring"></i>${petals}`;
  const tag=document.querySelector('#world-labels .hero-label:has(.rank-title)'); // the player's own name tag (game-controls.js)
  const follow=()=>{const r=tag?.getBoundingClientRect();if(r?.width){fx.style.left=r.left+r.width/2+'px';fx.style.top=r.top+'px';}if(fx.isConnected)requestAnimationFrame(follow);};
  document.body.append(fx);follow();setTimeout(()=>fx.remove(),2700);
  if(!e.baseUp)return;
  levelNotice.show(e.baseLevel,world.profession?.id);
 }

 // ---- settings in the profile panel
 const box=document.createElement('div');box.id='audio-settings';
 box.innerHTML='<label>เพลง<input type="range" id="vol-music" min="0" max="100" step="5"></label><label>เสียงเอฟเฟกต์<input type="range" id="vol-sfx" min="0" max="100" step="5"></label>';
 document.getElementById('return-lobby')?.before(box);
 const music$=box.querySelector('#vol-music'),sfx$=box.querySelector('#vol-sfx');music$.value=String(settings.music*100);sfx$.value=String(settings.sfx*100);
 music$.oninput=()=>{settings.music=+music$.value/100;save();};sfx$.oninput=()=>{settings.sfx=+sfx$.value/100;save();play('hit');};
 return {play,get running(){return ctx?.state==='running';}};
}
