import {readFile,writeFile,readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const base=path.join(repo,'assets/character-life100'),next=path.join(repo,'assets/character-life101');
const read=async file=>JSON.parse(await readFile(file,'utf8'));
const players=await read(path.join(base,'players.json')),npcs=await read(path.join(base,'npcs.json'));
const manifest={version:2,bodyHeight:210,frameSize:320,foot:276,review:'preview-only',actors:{...players.actors,...npcs.actors}};
const fragments=(await readdir(next)).filter(name=>name.endsWith('.json')&&name!=='coverage.json').sort();
for(const name of fragments){
 const fragment=await read(path.join(next,name));
 if(!fragment.actors)continue;
 for(const [id,part] of Object.entries(fragment.actors)){
  const actor=manifest.actors[id];if(!actor)throw new Error(`Unknown actor ${id} in ${name}`);
  const offset=actor.frames.length;
  for(const frame of part.frames){
   const source=frame.source??part.source;
   if(!source)throw new Error(`No image source for ${id} in ${name}`);
   actor.frames.push({...frame,source:source.startsWith('../')||source.startsWith('./assets/')?source:'../character-life101/'+source});
  }
  if(part.sitDownOrder){
   const down=part.sitDownOrder.map(i=>i+offset),up=part.standUpOrder.map(i=>i+offset);
   const originalIdle=actor.clips.idle.frames[0],originalSit=actor.clips.sit.frames[0];
   actor.clips.sitDown={frames:[originalIdle,...down,originalSit],frameDurations:[.08,...part.frameDurations,.15],loop:false,
    note:'ย่อเข่า → นั่งยอง → พับเข่าลงพื้น → นั่งพัก · ภาพวาดต่อเนื่อง คงฝั่งกระเป๋า'};
   actor.clips.standUp={frames:[originalSit,...up,originalIdle],frameDurations:[.1,...part.frameDurations.toReversed(),.1],loop:false,
    note:'คลายขา → ใช้เท้ารับน้ำหนัก → เหยียดเข่า → ยืน · ใช้ลำดับภาพย้อนจากท่านั่งลง'};
  }
  for(const [action,clip] of Object.entries(part.clips??{})){
   if(!['walk','run'].includes(action))throw new Error(`Unexpected locomotion clip ${action}`);
   actor.clips[action]={...clip,frames:clip.frames.map(i=>i+offset)};
  }
  actor.review='draft';
  actor.life101Sources??=[];actor.life101Sources.push(name);
  if(part.gaitReview)actor.gaitReview=part.gaitReview;
 }
}
const actions=['idle','walk','run','sit','sleep','sitDown','standUp'];
const coverage=Object.fromEntries(actions.map(action=>[action,Object.values(manifest.actors).filter(a=>a.clips[action]?.frames.length).length]));
await writeFile(path.join(base,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
await writeFile(path.join(next,'coverage.json'),JSON.stringify({actors:Object.keys(manifest.actors).length,coverage,productionDeployed:false},null,2)+'\n');
console.log(JSON.stringify(coverage));
