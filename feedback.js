// 0.53 sound, music and hit feedback. Everything is synthesised with WebAudio (no audio files, nothing to license):
// Thai pentatonic "ranat" plucks over a drone with ching cymbals in town, klong drums in the fields, a sparse
// minor-pentatonic air at the mill and in the dungeon. Effects follow the same game events the HUD uses.
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
 if(!document.querySelector('link[data-feedback]')){const css=document.createElement('link');css.rel='stylesheet';css.href='feedback.css?v=01';css.dataset.feedback='';document.head.append(css);}
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
  else if(e.type==='experience'&&(e.baseUp||e.jobUp)){play('level');banner(`<strong>${e.baseUp?'LEVEL UP!':'JOB LEVEL UP!'}</strong><span>${e.baseUp?'Base Lv. '+e.baseLevel:'Job Lv. '+e.jobLevel}</span>`,'levelup');levelGlow();}
  else if(['mvp','dungeonClear'].includes(e.type))play('fanfare');
  else if(['daily','tamed','stallSold','refined'].includes(e.type))play('chime');
 });
 // A ring of light on the hero for level ups (DOM, follows nothing: it is short).
 function levelGlow(){const g=document.createElement('div');g.className='level-glow';document.body.append(g);setTimeout(()=>g.remove(),1400);}

 // ---- settings in the profile panel
 const box=document.createElement('div');box.id='audio-settings';
 box.innerHTML='<label>เพลง<input type="range" id="vol-music" min="0" max="100" step="5"></label><label>เสียงเอฟเฟกต์<input type="range" id="vol-sfx" min="0" max="100" step="5"></label>';
 document.getElementById('return-lobby')?.before(box);
 const music$=box.querySelector('#vol-music'),sfx$=box.querySelector('#vol-sfx');music$.value=String(settings.music*100);sfx$.value=String(settings.sfx*100);
 music$.oninput=()=>{settings.music=+music$.value/100;save();};sfx$.oninput=()=>{settings.sfx=+sfx$.value/100;save();play('hit');};
 return {play,get running(){return ctx?.state==='running';}};
}
