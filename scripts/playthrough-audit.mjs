// Playthrough audit: a bot plays a fresh character from Lv.1 through the whole story with the real game rules
// (combat-core, loot, story, stats), the way a typical player would: AUTO on the quest target, skills when ready,
// potions under 40% HP, stat points into the main stat, potions bought in town. Reports time, deaths, level,
// coins per quest and flags steps that stall. Usage: node scripts/playthrough-audit.mjs [classId ...]
import fs from 'node:fs';
import {CombatWorld,MONSTER_TYPES,findPath} from '../combat-core.js';
import {STORY,storyEvent,normalizeStory} from '../story-quests.js';
import {rollLoot,addLoot,useItem,normalizeBag,ITEMS,SHOPS,buy} from '../items.js';
import {deriveStats,raiseStat,statPoints} from '../character-stats.js';
import {baseProgress,jobProgress,levelGifts} from '../experience.js';
import {advanceReady} from '../advancement.js';
const catalog=JSON.parse(fs.readFileSync(new URL('../maps/world.json',import.meta.url),'utf8'));
const mapOf=id=>catalog.maps.find(m=>m.id===id);
const MAIN={novice:'str',swordsman:'str',lancer:'str',boxer:'str',rogue:'agi',hunter:'dex',shaman:'int',acolyte:'int'};
const DT=.05,STEP_LIMIT=3*60*60; // seconds of play before a step is called stuck
let seed=7;const rand=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);

function play(startClass,goal=startClass==='novice'?'swordsman':null){
 let classId=startClass;
 const p={get classId(){return classId;},stats:null,bag:normalizeBag({coins:0,items:{}}),xp:{baseXp:0,jobXp:0},story:normalizeStory(null),time:0,deaths:0,kills:0,potions:0,rows:[]};
 const level=()=>baseProgress(p.xp).level;
 const spend=()=>{for(let g=0;g<200;g++){try{p.stats=raiseStat(p.stats,MAIN[classId],level());}catch{try{p.stats=raiseStat(p.stats,'vit',level());}catch{break;}}}};
 const grant=r=>{if(!r)return;p.xp.baseXp+=r.baseXp??0;p.xp.jobXp+=r.jobXp??0;p.bag=addLoot(p.bag,{coins:r.coins??0,items:r.items??[]}).bag;};
 const shop=()=>{ // in town: keep ~10 small potions if affordable (players buy more when rich)
  const want=Math.min(20,Math.floor(p.bag.coins*.4/ (ITEMS['hp-small'].buy||1)));const have=p.bag.items['hp-small']??0;
  for(let i=have;i<Math.min(want,10+level());i++){try{p.bag=buy(p.bag,'แม่บัว','hp-small',1);}catch{break;}}
 };
 for(let guard=0;guard<200&&!p.story.done;guard++){
  // a novice changes class at the teacher once Job 10 is maxed and the base floor is met (Job EXP resets)
  if(classId==='novice'&&goal&&advanceReady(p.xp,'novice').ok){p.time+=120;classId=goal;p.xp.jobXp=0;p.stats=null;p.rows.push({quest:'→ class '+goal,goal:'',min:2,kills:0,deaths:0,level:level(),coins:p.bag.coins,potions:p.bag.items['hp-small']??0,stuck:false});}
  const q=STORY[p.story.quest],step=q.steps[p.story.step],t0=p.time,k0=p.kills,d0=p.deaths,lv0=level();
  if(step.type!=='defeat'){p.time+=step.type==='enter'?60:25;const r=storyEvent(p.story,{type:step.type,npc:step.npc,mapId:step.mapId});p.story=r.state;grant(r.reward);if(step.mapId==='ayutthaya')shop();continue;}
  const map=mapOf(step.mapId),w=new CombatWorld({...map,classId});
  const refresh=()=>{spend();w.applyDerived(deriveStats({level:level(),classId,stats:p.stats,gear:null}));};
  Object.assign(w,p.xp);refresh();w.player.hp=w.player.maxHp;
  let need=step.count-p.story.count,stuck=false,route=[],routeFor=null;
  while(need>0){
   if(p.time-t0>STEP_LIMIT){stuck=true;break;}
   const pl=w.player;
   if(pl.hp>0&&!w.target){const goal=w.mobs.filter(m=>m.hp>0&&MONSTER_TYPES[m.type].id===step.monster).sort((a,b)=>Math.hypot(a.x-pl.x,a.z-pl.z)-Math.hypot(b.x-pl.x,b.z-pl.z))[0];
    // walk to the camp like the quest "walk there" button, then fight on AUTO
    if(goal){w.select(goal.id);w.anchor={x:goal.x,z:goal.z};w.auto=true;if(Math.hypot(goal.x-pl.x,goal.z-pl.z)>8&&routeFor!==goal.id){route=findPath(pl,goal,map.nav);routeFor=goal.id;}}}
   let input={x:0,z:0};
   if(route.length&&w.target&&Math.hypot(w.target.x-pl.x,w.target.z-pl.z)>6){while(route.length&&Math.hypot(route[0].x-pl.x,route[0].z-pl.z)<.5)route.shift();if(route[0])input={x:route[0].x-pl.x,z:route[0].z-pl.z};}else route=[];
   if(pl.hp>0&&pl.hp<pl.maxHp*.4&&p.bag.items['hp-small']){try{const r=useItem(p.bag,'hp-small',pl,w.status);p.bag=r.bag;pl.hp=r.hp;p.potions++;}catch{}}
   const t=w.target;if(t&&Math.hypot(t.x-pl.x,t.z-pl.z)<3.5)for(let i=0;i<4;i++)if(w.cooldowns[i]===0&&pl.mp>30){w.skill(i);break;}
   const before=pl.hp;w.update(DT,input);p.time+=DT;
   if(before>0&&pl.hp<=0)p.deaths++;
   for(const e of w.events.splice(0)){
    if(e.type==='defeat'){p.kills++;routeFor=null;const mob=w.mobs.find(m=>m.id===e.id),id=MONSTER_TYPES[mob.type].id;
     const loot=rollLoot(id,rand,null,mob.leader?3:1);p.bag=addLoot(p.bag,loot).bag;
     if(id===step.monster){const r=storyEvent(p.story,{type:'defeat',monster:id,mapId:step.mapId});p.story=r.state;grant(r.reward);need--;}}
    if(e.type==='experience'&&e.baseUp){for(const g of levelGifts(e.baseFrom,e.baseLevel))grant({coins:g.coins,items:g.items});}
   }
   p.xp={baseXp:w.baseXp,jobXp:w.jobXp};if(level()!==lv0&&w.player.hp>0)refresh();
  }
  p.rows.push({quest:q.title,goal:`${step.monster} x${step.count} @${step.mapId}`,min:+((p.time-t0)/60).toFixed(1),kills:p.kills-k0,deaths:p.deaths-d0,level:level(),coins:p.bag.coins,potions:p.bag.items['hp-small']??0,stuck});
  if(stuck)break;
 }
 return p;
}
for(const id of process.argv.slice(2).length?process.argv.slice(2):['novice','swordsman','hunter','shaman','acolyte']){
 const p=play(id);
 console.log(`\n### ${id}: ${p.story.done?'FINISHED':'STUCK'} in ${(p.time/60).toFixed(0)} min · Lv.${baseProgress(p.xp).level} · ${p.classId} Job ${jobProgress(p.xp,p.classId).level} · deaths ${p.deaths} · potions used ${p.potions} · coins ${p.bag.coins}`);
 for(const r of p.rows)console.log(`${r.stuck?'!! ':'   '}${r.quest.padEnd(20)} ${r.goal.padEnd(34)} ${String(r.min).padStart(6)} min  kills ${String(r.kills).padStart(4)}  deaths ${r.deaths}  Lv.${r.level}  coins ${r.coins}  pots ${r.potions}`);
}
