import {loadout,skillById} from './catalog.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const unit=(id,name,team,x,z,hp=650)=>({id,name,team,x,z,hp,maxHp:hp,shield:0,status:{},target:'hero',attack:2.5,boss:false,stagger:0});
const harmful=['poison','curse','fear','root','slow','break','brand','mark'];
const allyKinds=new Set(['heal','cleanse','revive','greatRevive','link','intercept','reflect']);
export function createTraining(classId='swordsman',branchId=''){
 const kit=loadout(classId,branchId),mods=Object.fromEntries(kit.passives.map(p=>[p.modifier,p.value]));
 const hero=unit('hero',kit.role.name,'ally',-2,0,1000*(1+(mods.maxHp??0)));
 const state={kit,mods,hero,allies:[hero,unit('ally','เพื่อนร่วมทาง','ally',-1,2,850)],enemies:[unit('enemy','หุ่นฝึก / มอน','enemy',2,0),unit('enemy2','มอนแนวหลัง','enemy',3,-1.4),unit('enemy3','มอนขนาบ','enemy',2.8,1.8)],mp:180,maxMp:180,cooldowns:{},fields:[],summons:[],pending:null,lastCast:null,combo:0,time:0,battle:false,selected:'enemy',log:[],events:[]};
 const all=()=>[...state.allies,...state.enemies],get=id=>all().find(u=>u.id===id);
 const note=text=>{state.log.unshift({time:state.time,text});state.log.length=Math.min(8,state.log.length);};
 const status=(u,key,time,power=0)=>{u.status[key]={time,power};};
 const alliesNear=at=>state.allies.filter(u=>u.hp>0&&distance(u,at)<=4.5);
 const enemiesNear=(at,r)=>state.enemies.filter(u=>u.hp>0&&distance(u,at)<=r);
 function heal(u,power){if(u.hp<=0)return;u.hp=Math.min(u.maxHp,u.hp+power*(1+(mods.healBonus??0)));}
 function shield(u,power,time=7){u.shield=Math.max(u.shield,power*(1+(mods.shieldBonus??0)));status(u,'shield',time);}
 function cleanse(u){for(const key of harmful)delete u.status[key];}
 function crowd(u,key,seconds){
  if(u.boss){u.stagger=clamp(u.stagger+35,0,100);if(u.stagger>=100){delete u.status.casting;status(u,'stagger',2);u.stagger=0;note('บอสเสียหลัก · ขัดท่าสำเร็จ');}}
  else{status(u,key,seconds);delete u.status.casting;}
 }
 function hit(u,power,source=hero,kind='skill',secondary=false){
  if(!u||u.hp<=0||!Number.isFinite(power)||power<=0)return 0;
  let n=power;
  if(u.team==='enemy'){
   if(u.status.mark)n*=1.2+(mods.markBonus??0);
   if(u.status.brand)n*=1.2;
   if(u.status.break)n*=1.3*(1+(mods.brokenBonus??0));
   if(mods.farBonus&&distance(source,u)>4)n*=1+mods.farBonus;
   if(mods.venomFinish&&u.status.poison&&u.hp/u.maxHp<.35)n*=1+mods.venomFinish;
  }else{
   if(u.status.evade||u.status.smoke)n*=.2;
   if(u.status.guard){const d=u.status.guard.facing??{x:1,z:0},dx=source.x-u.x,dz=source.z-u.z;if(dx*d.x+dz*d.z>0)n*=.35;}
   let protection=0;for(const f of state.fields)if(['sanctuary','yantra'].includes(f.kind)&&distance(u,f)<=f.radius)protection=Math.max(protection,f.power/100);
   n*=1-clamp(protection,0,.7);
   if(u===hero&&mods.zoneGuard&&state.fields.some(f=>['zone','wall'].includes(f.kind)))n*=1-mods.zoneGuard;
   if(u===hero&&mods.lowGuard&&u.hp/u.maxHp<.35)n*=1-mods.lowGuard;
   if(u.status.link&&hero.hp>0&&u!==hero&&!secondary){const share=n*u.status.link.power/100;n-=share;hit(hero,share,source,kind,true);}
   if(!secondary&&u.status.counter){const counter=u.status.counter;delete u.status.counter;n*=.3;hit(source,counter.power,hero,'counter',true);if(mods.counterRecovery)state.cooldowns.cleave=Math.max(0,(state.cooldowns.cleave??0)-mods.counterRecovery);note('รับแล้วสวนกลับ!');}
   const reflection=(u.status.reflect?.power??0)/100+(u.status.guard?(mods.reflect??0):0);
   if(!secondary&&reflection)hit(source,n*reflection,hero,'reflect',true);
  }
  const absorbed=Math.min(u.shield,n);u.shield-=absorbed;n-=absorbed;u.hp=Math.max(0,u.hp-n);
  if(u.hp<=0){u.status={};u.shield=0;note(u.name+' ล้มลง');if(u===hero&&state.pending){state.pending=null;note('การร่ายถูกยกเลิก');}}
  state.events.push({type:'hit',targetId:u.id,amount:Math.round(n),kind});return n;
 }
 function field(s,at,kind=s.kind){state.fields.push({kind,x:at.x,z:at.z,radius:s.radius*(1+(mods.zoneRadius??0)),power:s.power,time:s.seconds+(['sanctuary','yantra'].includes(kind)?mods.sanctuaryDuration??0:0),pulse:0,skill:s});}
 function pet(s,kind){state.summons=state.summons.filter(p=>p.kind!==kind);state.summons.push({kind,x:hero.x+.6,z:hero.z-.7,time:s.seconds,pulse:.2,power:(['greatSummon','greatSpirit'].includes(s.kind)?50:28)*(1+(mods.summonPower??0))});}
 function lineTargets(s,t){const dx=t.x-hero.x,dz=t.z-hero.z,l=Math.hypot(dx,dz)||1;return state.enemies.filter(u=>{const x=u.x-hero.x,z=u.z-hero.z,along=(x*dx+z*dz)/l,side=Math.abs(x*dz-z*dx)/l;return u.hp>0&&along>=0&&along<=s.range&&side<1.15;});}
 function release(s,t){
  const from={x:hero.x,z:hero.z},to={x:t.x,z:t.z},near=()=>enemiesNear(t,s.radius),around=()=>enemiesNear(hero,s.radius+1),damage=(u,n=s.power)=>hit(u,n),each=(list,fn)=>list.forEach(fn);
  switch(s.kind){
   case 'taunt':case 'anchor':each(around(),u=>{u.target='hero';status(u,'taunt',s.seconds+(mods.tauntDuration??0));});if(s.kind==='anchor')shield(hero,s.power);break;
   case 'guard':{status(hero,'guard',s.seconds);const l=distance(hero,t);hero.status.guard.facing=l?{x:(t.x-hero.x)/l,z:(t.z-hero.z)/l}:{x:1,z:0};break;}
   case 'counter':status(hero,'counter',s.seconds,s.power);break;
   case 'riposte':damage(t);crowd(t,'root',1);status(hero,'counter',3,90);break;
   case 'intercept':hero.x=t.x-.6;hero.z=t.z;status(t,'link',s.seconds,40);shield(hero,60);break;
   case 'link':status(t,'link',s.seconds,s.power);break;
   case 'lastStand':heal(hero,hero.maxHp*s.power/100);shield(hero,250);break;
   case 'cleave':each(around(),u=>damage(u));break;
   case 'break':case 'brand':damage(t);status(t,s.kind,s.seconds);break;
   case 'execute':damage(t,s.power*(t.hp/t.maxHp<.35?2:1));break;
   case 'line':case 'drill':case 'chainLine':case 'phalanx':{
    const victims=lineTargets(s,t);each(victims,u=>{damage(u,s.power*(s.kind==='chainLine'?1+.15*Math.max(0,victims.length-1):1));if(s.kind==='drill')status(u,'break',6);});
    if(s.kind==='phalanx')each(alliesNear(hero),u=>shield(u,90));if(victims.length>1&&mods.lineRecovery)state.cooldowns[s.id]=Math.max(0,state.cooldowns[s.id]-mods.lineRecovery);break;
   }
   case 'interrupt':case 'bind':damage(t);crowd(t,'root',s.seconds);break;
   case 'massBind':case 'uppercut':case 'flock':each(near(),u=>{damage(u);crowd(u,'root',2);});break;
   case 'push':case 'pull':each(near(),u=>{damage(u);if(u.boss){crowd(u,'root',1);return;}const dx=u.x-hero.x,dz=u.z-hero.z,l=Math.hypot(dx,dz)||1,n=s.kind==='pull'?-1.8:1.8;u.x+=dx/l*n;u.z+=dz/l*n;});break;
   case 'evade':hero.x=clamp(hero.x-2,-6,5);status(hero,'evade',s.seconds);break;
   case 'retreatShot':damage(t);hero.x=clamp(hero.x-2,-6,5);break;
   case 'meteor':each(near(),u=>damage(u));break;
   case 'zone':case 'wall':case 'storm':case 'trap':case 'rain':case 'thorns':case 'regen':case 'lifeTree':case 'sanctuary':case 'yantra':case 'holyField':case 'mine':field(s,t);break;
   case 'summon':case 'greatSummon':pet(s,'rooster');break;
   case 'spirit':case 'greatSpirit':pet(s,'spirit');shield(hero,s.kind==='greatSpirit'?130:70);break;
   case 'peck':{const rooster=state.summons.find(p=>p.kind==='rooster');rooster.x=t.x-.5;rooster.z=t.z;damage(t,s.power*(1+(mods.summonPower??0)));crowd(t,'root',1.5);break;}
   case 'mark':damage(t);status(t,'mark',s.seconds);break;
   case 'cone':{const a=Math.atan2(t.z-hero.z,t.x-hero.x);each(state.enemies.filter(u=>u.hp>0&&distance(hero,u)<=s.range&&Math.cos(Math.atan2(u.z-hero.z,u.x-hero.x)-a)>.65),u=>damage(u));break;}
   case 'ambush':damage(t,s.power*(t.status.mark?1.25:1));status(hero,'stealth',3);break;
   case 'crow':each(alliesNear(hero),u=>{status(u,'inspired',s.seconds,.2);delete u.status.fear;});break;
   case 'jab':damage(t);state.combo=Math.min(3,state.combo+1);break;
   case 'combo':damage(t);state.combo=3;state.mp=Math.min(state.maxMp,state.mp+(mods.comboMana??0));break;
   case 'comboFinish':case 'comboBurst':damage(t,s.power*(1+state.combo*.35)*(1+(mods.comboBonus??0)));state.combo=0;state.mp=Math.min(state.maxMp,state.mp+(mods.comboMana??0));break;
   case 'leap':hero.x=t.x-1;hero.z=t.z;damage(t);crowd(t,'root',1);break;
   case 'stealth':status(hero,'stealth',s.seconds+(mods.stealthDuration??0));break;
   case 'backstab':{const hidden=!!hero.status.stealth;hero.x=t.x-1;hero.z=t.z;damage(t,s.power*(hidden?1.6:1));delete hero.status.stealth;if(hidden)state.mp=Math.min(state.maxMp,state.mp+(mods.stealthMana??0));break;}
   case 'slow':damage(t);status(t,'slow',s.seconds);break;
   case 'poison':case 'venom':damage(t,s.power*.5);status(t,'poison',s.seconds+(mods.poisonDuration??0),s.power);break;
   case 'detonatePoison':damage(t,s.power+t.status.poison.time*t.status.poison.power*.7);delete t.status.poison;break;
   case 'smoke':each(alliesNear(t),u=>{status(u,'smoke',s.seconds);delete u.status.fear;});field({...s,power:0},t);break;
   case 'clones':status(hero,'stealth',s.seconds+(mods.stealthDuration??0));each(around(),u=>{u.target='clone';status(u,'decoy',s.seconds);});field({...s,power:0},hero);break;
   case 'curse':damage(t);status(t,'curse',s.seconds);break;
   case 'detonateCurse':each(near(),u=>damage(u,s.power));delete t.status.curse;state.mp=Math.min(state.maxMp,state.mp+(mods.curseMana??0));break;
   case 'soulWave':case 'curseWave':each(near(),u=>{damage(u,s.power*(u.status.curse?1.4:1));status(u,'slow',4);});break;
   case 'ward':each(alliesNear(t),u=>{shield(u,s.power,s.seconds);status(u,'reflect',s.seconds,15+(mods.reflect??0)*100);});break;
   case 'reflect':shield(t,80,s.seconds);status(t,'reflect',s.seconds,s.power+(mods.reflect??0)*100);break;
   case 'holy':damage(t,s.power*(t.status.curse?1.35+(mods.holyBonus??0):1));break;
   case 'heal':heal(t,s.power);break;
   case 'cleanse':cleanse(t);heal(t,s.power);break;
   case 'revive':case 'greatRevive':t.hp=t.maxHp*clamp((s.power+(mods.reviveBonus??0))/100,0,1);t.status={};if(s.kind==='greatRevive')shield(t,120);break;
   case 'groupHeal':each(alliesNear(t),u=>{heal(u,s.power);delete u.status.poison;});break;
   case 'purify':each(alliesNear(t),u=>cleanse(u));each(near(),u=>damage(u));break;
   default:throw new Error('Unimplemented skill kind: '+s.kind);
  }
  // Inspiration boosts offensive release only; casting a shield must not damage a selected enemy.
  if(hero.status.inspired&&t.team==='enemy'&&!['guard','counter','taunt','anchor','lastStand','stealth','summon','greatSummon','spirit','greatSpirit','crow','clones'].includes(s.kind))hit(t,s.power*.2);
  note(s.name+' · ออกผล');state.events.push({type:'release',skill:s,from,to,targetId:t.id});
 }
 function validate(s,t){
  if(!s||!kit.active.includes(s))return 'สกิลนี้ไม่ได้อยู่ในแขนงที่เลือก';
  if(hero.hp<=0)return 'ตัวละครล้มอยู่';if(state.pending)return 'กำลังร่ายสกิล';
  if(state.cooldowns[s.id]>0)return 'สกิลยังไม่พร้อม';if(state.mp<s.mp)return 'MP ไม่พอ';
  if(!t)return 'เลือกเป้าหมายก่อน';
  const revive=['revive','greatRevive'].includes(s.kind);
  if(allyKinds.has(s.kind)&&t.team!=='ally')return 'เลือกตัวเองหรือเพื่อนก่อนใช้ท่านี้';
  if(revive&&t.hp>0)return 'ใช้ชุบกับเพื่อนที่ล้มเท่านั้น';if(!revive&&t.hp<=0)return 'เป้านี้ล้มแล้ว';
  const selfKinds=['guard','counter','taunt','anchor','lastStand','evade','stealth','clones','summon','greatSummon','spirit','greatSpirit','crow','smoke','ward','sanctuary','regen','lifeTree','yantra','purify','groupHeal'];
  const groundKinds=['zone','wall','storm','trap','rain','thorns','holyField','mine'];
  if(!allyKinds.has(s.kind)&&!selfKinds.includes(s.kind)&&!groundKinds.includes(s.kind)&&t.team!=='enemy')return 'เลือกศัตรูเพื่อโจมตี';
  if(!selfKinds.includes(s.kind)&&distance(hero,t)>s.range)return 'อยู่นอกระยะสกิล';
  if(['peck','crow'].includes(s.kind)&&!state.summons.some(p=>p.kind==='rooster'))return 'เรียกไก่ชนก่อน';
  if(s.kind==='detonatePoison'&&!t.status.poison)return 'เป้าต้องติดพิษก่อน';
  if(s.kind==='detonateCurse'&&!t.status.curse)return 'เป้าต้องติดคำสาปก่อน';return null;
 }
 const api={state,get,validate: id=>validate(skillById(id),get(state.selected)),
  cast(id,targetId=state.selected){const s=skillById(id),t=get(targetId),error=validate(s,t);if(error){note(error);return {ok:false,error};}state.mp-=s.mp;state.cooldowns[s.id]=s.cd*(mods.arrowCooldown&&['rain','cone','ambush','mark','retreatShot'].includes(s.kind)?1-mods.arrowCooldown:1);state.pending={skill:s,targetId,remaining:s.windup};state.lastCast={skill:s,time:0,from:{x:hero.x,z:hero.z}};state.events.push({type:'cast',skill:s,from:{x:hero.x,z:hero.z},to:{x:t.x,z:t.z}});note('เตรียม '+s.name);return {ok:true};},
  select(id){if(get(id)){state.selected=id;}},
  damage:(id,power,sourceId='enemy')=>hit(get(id),power,get(sourceId)),
  scenario(name){state.pending=null;state.fields=[];state.summons=[];state.cooldowns={};state.mp=180;state.combo=0;for(const u of all()){u.hp=u.maxHp;u.shield=0;u.status={};u.boss=false;u.stagger=0;u.target='hero';u.attack=2.5;}hero.x=-2;hero.z=0;state.allies[1].x=-1;state.allies[1].z=2;state.enemies.forEach((u,i)=>{u.x=[2,3,2.8][i];u.z=[0,-1.4,1.8][i];});state.lastCast=null;state.events=[];state.selected='enemy';
   if(name==='swarm'){state.allies[1].hp=240;state.enemies.forEach(u=>u.target='ally');}
   if(name==='boss'){state.enemies[0].boss=true;state.enemies[0].maxHp=1800;state.enemies[0].hp=1800;status(state.enemies[0],'casting',4);}
   else{state.enemies[0].maxHp=650;state.enemies[0].hp=650;}
   if(name==='poison'){state.selected='ally';state.allies[1].hp=280;status(state.allies[1],'poison',18,14);status(state.allies[1],'fear',8);}
   if(name==='down'){state.allies[1].hp=0;state.selected='ally';}
   if(name==='setup'){status(state.enemies[0],'poison',8,30);status(state.enemies[0],'curse',8);status(state.enemies[0],'mark',8);state.combo=3;status(hero,'stealth',8);pet({kind:'summon',seconds:18},'rooster');}
   note('จัดสถานการณ์ใหม่');},
  tick(dt){if(!Number.isFinite(dt)||dt<=0)return;dt=Math.min(dt,.1);state.time+=dt;state.mp=Math.min(state.maxMp,state.mp+dt*4);if(state.lastCast)state.lastCast.time+=dt;
   for(const key in state.cooldowns)state.cooldowns[key]=Math.max(0,state.cooldowns[key]-dt);
   for(const u of all())for(const [key,v] of Object.entries(u.status)){
    const elapsed=Math.min(dt,v.time);if(key==='poison')hit(u,v.power*elapsed,hero,'poison',true);v.time-=dt;
    if(v.time<=0){delete u.status[key];if(key==='shield')u.shield=0;if(key==='taunt')u.target='ally';if(key==='decoy')u.target='hero';}
   }
   if(state.pending){const cast=state.pending;cast.remaining-=dt;if(cast.remaining<=0){state.pending=null;const t=get(cast.targetId),revive=['revive','greatRevive'].includes(cast.skill.kind);if(hero.hp>0&&t&&(revive?t.hp<=0:t.hp>0)&&(!['peck','crow'].includes(cast.skill.kind)||state.summons.some(p=>p.kind==='rooster'))&&(!['detonatePoison','detonateCurse'].includes(cast.skill.kind)||t.status[cast.skill.kind==='detonatePoison'?'poison':'curse']))release(cast.skill,t);else note('เป้าหรือเงื่อนไขเปลี่ยนระหว่างร่าย · ท่ายกเลิก');}}
   for(const f of [...state.fields]){f.time-=dt;f.pulse-=dt;if(f.time<=0){state.fields.splice(state.fields.indexOf(f),1);continue;}if(f.pulse<=0){f.pulse+=1;
     if(['regen','lifeTree'].includes(f.kind))for(const u of state.allies)if(u.hp>0&&distance(u,f)<=f.radius)heal(u,f.power);
     if(['zone','wall','storm','trap','rain','thorns','holyField','mine','yantra'].includes(f.kind))for(const u of enemiesNear(f,f.radius)){
      if(f.kind==='yantra'){status(u,'slow',1.2);continue;}hit(u,f.power*(f.kind==='holyField'&&u.status.curse?1.35+(mods.holyBonus??0):1));
      if(['trap','wall'].includes(f.kind))crowd(u,'root',1);else if(['zone','thorns'].includes(f.kind))status(u,'slow',1.2);
      if(f.kind==='mine')f.time=0;
     }
    }}
   for(const summon of [...state.summons]){summon.time-=dt;const selected=get(state.selected),target=selected?.team==='enemy'&&selected.hp>0?selected:state.enemies.find(u=>u.hp>0);if(summon.time<=0){state.summons.splice(state.summons.indexOf(summon),1);continue;}if(target){const dx=target.x-.6-summon.x,dz=target.z-summon.z,l=Math.hypot(dx,dz)||1,move=Math.min(l,dt*4);summon.x+=dx/l*move;summon.z+=dz/l*move;summon.pulse-=dt;if(l<1&&summon.pulse<=0){summon.pulse=1.1;hit(target,summon.power);if(mods.bondHeal&&target.status.mark)heal(hero,mods.bondHeal);state.events.push({type:'petHit',kind:summon.kind,from:{x:summon.x,z:summon.z},to:{x:target.x,z:target.z}});}}}
   if(state.battle)for(const enemy of state.enemies){if(enemy.hp<=0||enemy.status.root||enemy.status.stagger)continue;enemy.attack-=dt;if(enemy.attack<=0){enemy.attack=enemy.boss?3.5:3;const target=get(enemy.target);if(target?.hp>0)hit(target,enemy.boss?180:60,enemy);if(enemy.boss)status(enemy,'casting',2.5);}}
  },
  drainEvents(){return state.events.splice(0);}
 };return api;
}
