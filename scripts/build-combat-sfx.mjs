// 0.121 combat sounds: one set per class (basic swing + hit, an ultimate sting) and one per skill effect family (cast +
// impact). Sources are Kenney's CC0 "Impact Sounds" and "RPG Audio" packs plus tones synthesised here with ffmpeg, so
// every file is CC0 or our own. node scripts/build-combat-sfx.mjs <folder holding kenney_impact-sounds, kenney_rpg-audio>
import {spawnSync} from 'node:child_process';
import {existsSync,mkdirSync,readdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {COMBAT_FAMILIES,COMBAT_CLASSES,combatFile} from '../audio-catalog180.js';

const kenney=process.argv[2];if(!kenney)throw new Error('usage: node scripts/build-combat-sfx.mjs <kenney folder>');
const out=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..','assets','audio-combat');mkdirSync(out,{recursive:true});
const tmp=path.join(tmpdir(),'ayothaya-sfx');mkdirSync(tmp,{recursive:true});
const files=new Map();for(const pack of ['kenney_impact-sounds','kenney_rpg-audio'])for(const f of readdirSync(path.join(kenney,pack,'Audio')))files.set(f.replace(/\.ogg$/,''),path.join(kenney,pack,'Audio',f));
const RATE=44100;

// ---- layers: a Kenney file (k) or a synthesised expression (s), each pitched, delayed and scaled
const K=(name,o={})=>{if(!files.has(name))throw new Error('missing '+name);return {k:files.get(name),...o};};
const S=(expr,dur,o={})=>({s:expr,dur,...o});
const noise='(random(0)*2-1)';
const env=d=>`pow(sin(PI*min(t/${d},1)),2)`;                  // smooth swell and fade over d seconds
const whoosh=(d,f,o={})=>S(`${noise}*${env(d)}`,d,{fx:`bandpass=f=${f}:width_type=o:w=1.6,bandpass=f=${f}:width_type=o:w=2`,...o});
const twang=(f,o={})=>S(`(sin(2*PI*(${f}*t-${f*.6}*t*t))*exp(-9*t)+.45*sin(2*PI*${2*f}*t)*exp(-14*t)+.25*${noise}*exp(-120*t))`,.45,o);
const boom=(f=78,o={})=>S(`(sin(2*PI*(${f}*t-${f*.35}*t*t))*exp(-6.5*t)+.35*${noise}*exp(-40*t))`,.7,{fx:'lowpass=f=900',...o});
const bell=(f,d=1.4)=>[1,2.76,5.4,8.93].map((r,i)=>`${[1,.5,.28,.14][i]}*sin(2*PI*${f*r}*t)*exp(-${(2.4+i*2.2).toFixed(1)}*t/${d})`).join('+');
const chime=(f,o={})=>S(`(${bell(f)})*min(t/.004,1)`,1.4,{fx:'aecho=0.8:0.5:90|170:0.25|0.15',...o});
const chord=(fs,o={})=>S(fs.map(f=>`(${bell(f,1.8)})`).join('+')+`*min(t/.01,1)*.4`,1.8,{fx:'aecho=0.8:0.6:110|230:0.3|0.2',...o});
const crackle=(d=.35,o={})=>S(`gt(random(0),0.985)*(random(1)*2-1)*exp(-5*t)`,d,{fx:'highpass=f=1800',...o});
const bubbles=(o={})=>S([0,.06,.13,.17,.26,.31].map((s,i)=>`gt(t,${s})*sin(2*PI*(${260+i*55}*(t-${s})+${1600+i*200}*pow(t-${s},2)))*exp(-38*(t-${s}))`).join('+'),.5,o);
const hiss=(d=.45,o={})=>S(`${noise}*exp(-7*t)*min(t/.02,1)`,d,{fx:'highpass=f=3500',...o});
const swell=(d,f,o={})=>S(`${noise}*pow(min(t/${d},1),3)`,d,{fx:`bandpass=f=${f}:width_type=o:w=2,lowpass=f=${f*2}`,...o}); // rises then cuts
const chirps=(o={})=>S([0,.12,.22,.4].map((s,i)=>`gt(t,${s})*lt(t,${s+.1})*sin(2*PI*(${900+i*120}*(t-${s})+${3000-i*400}*pow(t-${s},2)))*sin(PI*(t-${s})/.1)`).join('+'),.6,o);

// ---- what each sound is made of; v = variant number (0, 1, 2) for small pitch / file changes
const pick=(base,v)=>base+'_00'+(v%5);                       // Kenney Impact Sounds: name_000..004
const r=v=>[1,.94,1.07][v%3];
const FAMILY={
 fist:{cast:v=>[whoosh(.2,700+v*120,{gain:.7})],hit:v=>[K(pick('impactPunch_heavy',v),{rate:r(v)}),boom(70,{gain:.35})]},
 sword:{cast:v=>[whoosh(.26,2600+v*300,{gain:.8}),K('drawKnife'+(v+1),{gain:.35})],hit:v=>[K(v?'knifeSlice2':'knifeSlice',{rate:r(v)}),K(pick('impactMetal_light',v),{gain:.6})]},
 lance:{cast:v=>[whoosh(.32,1100+v*150,{gain:.85})],hit:v=>[K(pick('impactWood_heavy',v),{rate:r(v)}),K(pick('impactMetal_medium',v),{gain:.55}),boom(64,{gain:.3})]},
 arrow:{cast:v=>[twang(196+v*22,{gain:.7})],hit:v=>[K(pick('impactWood_light',v),{rate:r(v)*1.1}),K(pick('impactGeneric_light',v),{gain:.4})]},
 shield:{cast:v=>[K(pick('impactPlate_light',v),{gain:.7,rate:r(v)})],hit:v=>[K(pick('impactPlate_heavy',v)),K(pick('impactMetal_heavy',v),{gain:.6,rate:r(v)})]},
 dust:{cast:v=>[K('footstep0'+(v*3),{gain:.8}),whoosh(.3,500,{gain:.5})],hit:v=>[K(pick('impactSoft_heavy',v),{rate:.85*r(v)}),boom(58,{gain:.6})]},
 banner:{cast:v=>[K('cloth'+(v+1),{gain:.9}),K('clothBelt'+(v?'2':''),{gain:.5,delay:.08})],hit:v=>[boom(66+v*6,{gain:.9}),K(pick('impactBell_heavy',v),{gain:.25,rate:.8})]},
 shadow:{cast:v=>[swell(.4,420+v*60,{gain:.9})],hit:v=>[K(pick('impactSoft_heavy',v),{rate:.68}),boom(52,{gain:.5}),whoosh(.35,300,{gain:.35,delay:.05})],fx:'aecho=0.7:0.5:140:0.3'},
 holy:{cast:v=>[K(pick('impactBell_heavy',v),{rate:1.5+v*.12,gain:.45}),chime(880+v*110,{gain:.5,delay:.05})],hit:v=>[K(pick('impactGlass_light',v),{gain:.7}),chime(1320+v*90,{gain:.45})]},
 talisman:{cast:v=>[K('bookFlip'+(v+1),{gain:.9}),chime(1175+v*80,{gain:.25,delay:.12})],hit:v=>[K(pick('impactGlass_medium',v),{gain:.7,rate:r(v)}),crackle(.4,{gain:.6})]},
 spirit:{cast:v=>[whoosh(.55,1700+v*250,{gain:.7}),chime(660+v*70,{gain:.25,delay:.15})],hit:v=>[swell(.3,900,{gain:.6}),K(pick('impactSoft_medium',v),{rate:1.25,gain:.6,delay:.28})],fx:'aecho=0.8:0.6:120|260:0.35|0.2'},
 lotus:{cast:v=>[chime(784,{gain:.35}),chime(988,{gain:.3,delay:.09}),chime(1175+v*130,{gain:.28,delay:.18})],hit:v=>[K(pick('impactGlass_light',v),{rate:.82,gain:.6}),chime(1568,{gain:.3})]},
 venom:{cast:v=>[bubbles({gain:.8,rate:r(v)})],hit:v=>[K(pick('impactSoft_medium',v),{rate:.8}),bubbles({gain:.45,delay:.05}),hiss(.4,{gain:.3})]},
 vines:{cast:v=>[K('creak'+(v+1),{gain:.9})],hit:v=>[K(pick('impactWood_medium',v),{rate:r(v)}),K('cloth'+(v+3),{gain:.6,delay:.04})]},
 rooster:{cast:v=>[K('cloth'+(v+1),{gain:.8}),K('cloth'+(v+2),{gain:.6,delay:.09})],hit:v=>[K(pick('impactWood_light',v),{rate:1.2}),chirps({gain:.35})]},
 'rooster-crow':{cast:v=>[chirps({gain:.7,rate:r(v)})],hit:v=>[chirps({gain:.5,rate:1.1}),K(pick('impactBell_heavy',v),{gain:.2,rate:1.6})]},
 'life-tree':{cast:v=>[K('creak'+(v+2),{gain:.7}),chime(523,{gain:.3,delay:.1})],hit:v=>[chord([523,659,784],{gain:.7}),boom(70,{gain:.3})]},
};
const CLASS={
 swordsman:{swing:v=>[whoosh(.22,2400+v*350)],hit:v=>[K([v?'knifeSlice2':'knifeSlice','knifeSlice2'][v%2],{rate:r(v)}),K(pick('impactMetal_light',v),{gain:.5})],ult:[boom(60),K('impactMetal_heavy_002',{rate:.8}),chime(1046,{gain:.3,delay:.1})]},
 lancer:{swing:v=>[whoosh(.3,1000+v*160)],hit:v=>[K(pick('impactWood_heavy',v),{rate:r(v)}),K(pick('impactMetal_medium',v),{gain:.5})],ult:[boom(55),K('impactMetal_heavy_000',{rate:.7}),whoosh(.4,800,{gain:.5})]},
 hunter:{swing:v=>[twang(208+v*18)],hit:v=>[K(pick('impactWood_light',v),{rate:1.1*r(v)})],ult:[twang(147,{gain:.8}),twang(196,{gain:.6,delay:.07}),boom(62,{gain:.7,delay:.1})]},
 boxer:{swing:v=>[whoosh(.15,850+v*140,{gain:.85})],hit:v=>[K(pick(v===2?'impactPunch_heavy':'impactPunch_medium',v),{rate:r(v)})],ult:[boom(56),K('impactPunch_heavy_003',{rate:.85}),K('impactPunch_heavy_001',{rate:.8,delay:.12})]},
 rogue:{swing:v=>[whoosh(.13,3200+v*400,{gain:.8})],hit:v=>[K(v===1?'knifeSlice2':'knifeSlice',{rate:1.12*r(v)}),K(pick('impactSoft_medium',v),{gain:.4})],ult:[swell(.45,500),boom(50,{delay:.42})]},
 shaman:{swing:v=>[whoosh(.24,1500+v*200,{gain:.6}),crackle(.2,{gain:.4})],hit:v=>[K(pick('impactGlass_light',v),{gain:.7,rate:r(v)}),crackle(.25,{gain:.45})],ult:[chord([392,494,587]),crackle(.6,{gain:.5}),boom(58,{gain:.6})]},
 acolyte:{swing:v=>[whoosh(.26,1300+v*150,{gain:.5}),chime(1046+v*130,{gain:.2})],hit:v=>[K(pick('impactGlass_light',v),{gain:.55,rate:.9*r(v)}),chime(1568,{gain:.22})],ult:[chord([523,659,784,1046]),boom(64,{gain:.4})]},
};

// ---- one sound: every layer through ffmpeg into one mono mix, then levelled as mp3: the first 0.25 s (what the ear
// judges a hit by) to a mean of -16 dB, a limiter keeping peaks under -1 dB
function ff(args,level='error'){const r=spawnSync('ffmpeg',['-hide_banner','-loglevel',level,'-y',...args],{encoding:'utf8'});if(r.status!==0)throw new Error(r.stderr);return r.stderr;}
function render(name,layers,post=''){
 const inputs=[],chains=[];
 layers.forEach((l,i)=>{
  if(l.k)inputs.push('-i',l.k);else inputs.push('-f','lavfi','-i',`aevalsrc=exprs='${l.s}':s=${RATE}:d=${l.dur}`);
  const rate=l.rate&&l.rate!==1?`,asetrate=${Math.round(RATE*l.rate)},aresample=${RATE}`:'';
  chains.push(`[${i}:a]aformat=sample_rates=${RATE}:channel_layouts=mono${rate}${l.fx?','+l.fx:''},adelay=${Math.round((l.delay??0)*1000)},volume=${l.gain??1}[l${i}]`);
 });
 const mix=`${chains.join(';')};${layers.map((_,i)=>`[l${i}]`).join('')}amix=inputs=${layers.length}:normalize=0:duration=longest${post?','+post:''},areverse,silenceremove=start_periods=1:start_threshold=-60dB,afade=t=in:d=0.02,areverse[m]`; // trims the silent tail only
 const wav=path.join(tmp,name+'.wav');ff([...inputs,'-filter_complex',mix,'-map','[m]','-ac','1','-ar',String(RATE),'-c:a','pcm_f32le',wav]);
 const level=(af,k)=>+(new RegExp(k+': (-?[\\d.]+) dB').exec(ff(['-i',wav,'-af',af,'-f','null','-'],'info'))?.[1]);
 const gain=Math.min(-16-level('atrim=0:0.25,volumedetect','mean_volume'),3-level('volumedetect','max_volume'));if(!Number.isFinite(gain))throw new Error('no level for '+name);
 ff(['-i',wav,'-af',`volume=${gain.toFixed(2)}dB,alimiter=limit=0.89:level=false,afade=t=in:d=0.003`,'-ac','1','-ar',String(RATE),'-codec:a','libmp3lame','-b:a','64k',path.join(out,name+'.mp3')]);
 rmSync(wav);
}

let count=0;
for(const f of COMBAT_FAMILIES)for(const part of ['cast','hit'])for(const v of [0,1]){render(combatFile('fam',f,part,v),FAMILY[f][part](v),FAMILY[f].fx);count++;}
for(const c of COMBAT_CLASSES){for(const part of ['swing','hit'])for(const v of [0,1,2]){render(combatFile('cls',c,part,v),CLASS[c][part](v));count++;}render(combatFile('cls',c,'ult',0),CLASS[c].ult);count++;}
console.log(count+' sounds in '+out+(existsSync(out)?'':' (missing)'));
