// 0.53 sound, music and hit feedback. Everything is synthesised with WebAudio (no audio files, nothing to license):
// Thai pentatonic "ranat" plucks over a drone with ching cymbals in town, klong drums in the fields, a sparse
// minor-pentatonic air at the mill and in the dungeon. Effects follow the same game events the HUD uses.
import {ITEMS,itemDef,RARITY_NAME} from './items.js?v=107';
import {earnedStatPoints} from './character-stats.js?v=107';
const KEY='ayothaya-audio';
const THEMES={
 town:{bpm:84,root:72,scale:[0,2,4,7,9],drum:false,ching:true,drone:[48,55],rest:.32},
 field:{bpm:100,root:67,scale:[0,2,4,7,9],drum:true,ching:true,drone:[43,50],rest:.28},
 night:{bpm:68,root:64,scale:[0,3,5,7,10],drum:true,ching:false,drone:[40,47],rest:.45},
};
const themeFor=map=>map.safe?'town':map.procedural==='mill'?'night':'field';
const hz=m=>440*2**((m-69)/12);
// Small deterministic RNG so a map keeps its own tune between visits.
const rng=seed=>()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
const seedOf=s=>[...s].reduce((h,c)=>(h*31+c.charCodeAt(0))>>>0,7);

export function createFeedback({game,map}){
 if(!document.querySelector('link[data-feedback]')){const css=document.createElement('link');css.rel='stylesheet';css.href='feedback.css?v=106.6';css.dataset.feedback='';document.head.append(css);}
 const world=game.world;let settings={music:.35,sfx:.7};try{settings={...settings,...JSON.parse(localStorage.getItem(KEY))};}catch{}
 let ctx=null,master,musicBus,sfxBus,noise,timer=null;
 function start(){ // browsers only allow audio after a tap / key press
  if(ctx)return ctx.state==='suspended'&&ctx.resume();
  const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
  ctx=new AC();master=ctx.createGain();master.connect(ctx.destination);
  musicBus=ctx.createGain();sfxBus=ctx.createGain();musicBus.connect(master);sfxBus.connect(master);
  const echo=ctx.createDelay(1),fb=ctx.createGain(),wet=ctx.createGain();echo.delayTime.value=.32;fb.gain.value=.28;wet.gain.value=.22;
  musicBus.connect(echo);echo.connect(fb);fb.connect(echo);echo.connect(wet);wet.connect(master);
  noise=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate);const d=noise.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
  levels();music();
 }
 for(const t of ['pointerdown','keydown'])addEventListener(t,start,{capture:true,passive:true});
 function levels(){if(!ctx)return;musicBus.gain.value=settings.music*.5;sfxBus.gain.value=settings.sfx;}
 const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(settings));}catch{}levels();};

 // ---- building blocks
 function tone(freq,{type='triangle',at=0,dur=.3,gain=.3,to=null,bus=sfxBus,attack=.005}={}){
  const t=ctx.currentTime+at,o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);
  if(to)o.frequency.exponentialRampToValueAtTime(to,t+dur);
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(gain,t+attack);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
  o.connect(g);g.connect(bus);o.start(t);o.stop(t+dur+.05);
 }
 function hiss({at=0,dur=.1,gain=.2,freq=2000,to=null,q=1.2,bus=sfxBus}={}){
  const t=ctx.currentTime+at,s=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();s.buffer=noise;
  f.type='bandpass';f.Q.value=q;f.frequency.setValueAtTime(freq,t);if(to)f.frequency.exponentialRampToValueAtTime(to,t+dur);
  g.gain.setValueAtTime(gain,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);s.connect(f);f.connect(g);g.connect(bus);s.start(t,Math.random()*.5);s.stop(t+dur+.02);
 }
 const SFX={
  swing:()=>hiss({dur:.13,gain:.22,freq:700,to:3200,q:.9}),
  cast:()=>{hiss({dur:.3,gain:.14,freq:1200,to:300,q:.7});tone(523,{type:'sine',dur:.35,gain:.12,to:1046});},
  hit:()=>{tone(170,{type:'sine',dur:.11,gain:.5,to:55});hiss({dur:.04,gain:.25,freq:2500});},
  crit:()=>{tone(150,{type:'sine',dur:.14,gain:.6,to:45});hiss({dur:.06,gain:.3,freq:3000});tone(1568,{dur:.45,gain:.18});tone(2093,{dur:.35,gain:.1,at:.03});},
  hurt:()=>{tone(110,{type:'sawtooth',dur:.12,gain:.16,to:55});hiss({dur:.08,gain:.18,freq:600,q:.6});},
  dodge:()=>hiss({dur:.16,gain:.14,freq:2600,to:900,q:1.5}),
  defeat:()=>{tone(392,{dur:.28,gain:.18,to:98});tone(80,{type:'sine',dur:.2,gain:.35,to:40,at:.05});[1319,1760].forEach((f,i)=>tone(f,{dur:.18,gain:.12,at:.22+i*.07}));},
  potion:()=>{tone(420,{type:'sine',dur:.22,gain:.18,to:940});[0,1,2].forEach(i=>tone(900+i*240,{type:'sine',dur:.06,gain:.08,at:.08+i*.06}));},
  level:()=>{[72,74,76,79,81,84,88].forEach((m,i)=>tone(hz(m),{dur:.5,gain:.2,at:i*.075}));hiss({at:.4,dur:.9,gain:.08,freq:7000,q:.5});tone(hz(48),{type:'sine',dur:1.2,gain:.25,at:.45});},
  fanfare:()=>{[67,72,76,79,84].forEach((m,i)=>tone(hz(m),{type:'square',dur:.35,gain:.07,at:i*.11}));tone(hz(84),{dur:1,gain:.18,at:.6});},
  chime:()=>[79,84,88].forEach((m,i)=>tone(hz(m),{dur:.7,gain:.15,at:i*.12})),
  rare:()=>{[84,88,91,96].forEach((m,i)=>tone(hz(m),{type:'sine',dur:.6,gain:.13,at:i*.07}));hiss({at:.05,dur:.6,gain:.06,freq:8000,q:.6});},
 };
 const play=name=>{if(!ctx||ctx.state!=='running'||!settings.sfx)return;try{SFX[name]();}catch{}};

 // ---- generative music: an 8-bar A A' B A phrase on the map's pentatonic scale, ching on the off-beats
 const theme=THEMES[themeFor(map)],rand=rng(seedOf(map.id));
 const motif=len=>{let n=Math.floor(rand()*5);return Array.from({length:len},()=>{if(rand()<theme.rest)return null;n=Math.max(0,Math.min(9,n+Math.round((rand()-.5)*3)));return n;});};
 const A=motif(16),B=motif(16),A2=A.map(n=>n===null||rand()<.6?n:Math.min(9,n+1)),song=[...A,...A2,...B,...A];
 const note=i=>theme.root+theme.scale[i%5]+12*Math.floor(i/5)-12;
 function music(){
  if(timer||!ctx)return;let step=0,next=ctx.currentTime+.1;const beat=60/theme.bpm/2;
  timer=setInterval(()=>{
   if(!settings.music||document.hidden){next=ctx.currentTime+.1;return;}
   while(next<ctx.currentTime+.25){
    const at=next-ctx.currentTime,i=song[step%song.length];
    if(i!==null){tone(hz(note(i)),{at,dur:.55,gain:.16,bus:musicBus});tone(hz(note(i))*2,{type:'sine',at,dur:.25,gain:.04,bus:musicBus});}
    if(step%16===0)theme.drone.forEach(m=>tone(hz(m),{type:'sine',at,dur:beat*16,gain:.07,attack:.6,bus:musicBus}));
    if(theme.ching&&step%4===2)hiss({at,dur:step%8===2?.28:.06,gain:.05,freq:7500,q:6,bus:musicBus});
    if(theme.drum&&step%8===0)tone(70,{type:'sine',at,dur:.3,gain:.22,to:45,bus:musicBus});
    if(theme.drum&&step%8===5)tone(110,{type:'sine',at,dur:.15,gain:.1,to:70,bus:musicBus});
    next+=beat;step++;
   }
  },60);
 }

 // ---- event → sound / visuals
 let lastHit=0;
 const banner=(html,cls)=>{const b=document.createElement('div');b.className='big-banner '+cls;b.innerHTML=html;document.body.append(b);setTimeout(()=>b.remove(),3200);};
 game.onEvent(e=>{
  if(e.type==='cast')play(Number.isInteger(e.skillIndex)?'cast':'swing');
  else if(e.type==='damage'){const now=performance.now();if(now-lastHit>45){lastHit=now;play(e.color==='#ffd27a'?'crit':'hit');}}
  else if(e.type==='playerHit')play('hurt');
  else if(e.type==='dodge')play('dodge');
  else if(e.type==='defeat')play('defeat');
  else if(e.type==='used')play('potion');
  else if(e.type==='heal')play('potion');
  else if(e.type==='experience'&&(e.baseUp||e.jobUp)){play('level');levelUp(e);}
  else if(e.type==='drop'){const best=e.items.map(i=>itemDef(i.id)).filter(Boolean).sort((a,b)=>b.rarity-a.rarity)[0];if(best?.rarity>=2){play('rare');world.notice(`✦ ของ${RARITY_NAME[best.rarity]}! ${best.name}`);if(best.rarity>=3)banner(`<strong>✦ ${RARITY_NAME[best.rarity]}!</strong><span>${best.name}</span>`,'levelup rare-drop');}}
  else if(['mvp','dungeonClear'].includes(e.type))play('fanfare');
  else if(['daily','tamed','stallSold','refined'].includes(e.type))play('chime');
 });
 // What a new Base level gives: stat points and gear that just became wearable for this class.
 function gains(level){
  const pts=earnedStatPoints(level)-earnedStatPoints(level-1),cls=world.profession?.id;
  const unlocked=Object.values(ITEMS).filter(it=>it.kind==='gear'&&it.level===level&&(!it.classes||it.classes.includes(cls))).map(it=>it.name);
  return `<em>+${pts} แต้มสถานะ · กด สถานะ (C) เพื่ออัปค่า</em>${unlocked.length?`<em>ใส่ได้แล้ว: ${unlocked.join(' · ')}</em>`:''}`;
 }
 // Level ups: Thai lettering between gold kanok scrolls above the hero's name tag with an
 // English line, a ring of light and lotus petals rising from the feet (~2.6 s), and a note under the HP panel with
 // what the new Base level gave. No box over the action.
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
  const note=document.createElement('div'),panel=(document.getElementById('online-button')??document.querySelector('.player-panel'))?.getBoundingClientRect();note.className='rank-note';
  if(panel?.width){note.style.left=panel.left+'px';note.style.top=panel.bottom+6+'px';}
  note.innerHTML=gains(e.baseLevel);document.body.append(note);setTimeout(()=>note.remove(),4300);
 }

 // ---- settings in the profile panel
 const box=document.createElement('div');box.id='audio-settings';
 box.innerHTML='<label>เพลง<input type="range" id="vol-music" min="0" max="100" step="5"></label><label>เสียงเอฟเฟกต์<input type="range" id="vol-sfx" min="0" max="100" step="5"></label>';
 document.getElementById('return-lobby')?.before(box);
 const music$=box.querySelector('#vol-music'),sfx$=box.querySelector('#vol-sfx');music$.value=String(settings.music*100);sfx$.value=String(settings.sfx*100);
 music$.oninput=()=>{settings.music=+music$.value/100;save();};sfx$.oninput=()=>{settings.sfx=+sfx$.value/100;save();play('hit');};
 return {play,get running(){return ctx?.state==='running';}};
}
