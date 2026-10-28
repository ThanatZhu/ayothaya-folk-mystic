import {roleTiming} from './combat-timing.js';
import {skillHit} from './skill-critical.js';
import {applyPoison,poisonFor,takePoison,tickPoison} from './role-poison.js';
import {petIncoming} from './pet-combat.js?v=skill-crit1';
import {roleById} from './assets/skills-next/catalog.js';
import {SKILL_PROFILES} from './assets/skill-polish/library-profiles.js';
import {scaledSkill} from './skill-progress.js?v=novice174';
import {liveRoleSkills,PASSIVE_SLOTS,MASTER_PASSIVE_SLOTS} from './role-skill-progress.js';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z),harmful=['poison','curse','fear','root','slow','break','brand','mark'];
const groundKinds=new Set(['zone','wall','storm','trap','rain','thorns','holyField','mine','meteor']);
const friends=new Set(['heal','cleanse','revive','greatRevive','link','intercept','reflect']);
const selfKinds=new Set(['taunt','anchor','guard','counter','evade','stealth','clones','summon','greatSummon','spirit','greatSpirit','crow','smoke','ward','sanctuary','regen','lifeTree','yantra','groupHeal','lastStand','purify']);
export {groundKinds as ROLE_GROUND_KINDS,friends as ROLE_FRIEND_KINDS,selfKinds as ROLE_SELF_KINDS};
// 0.119 owner: one second between skills. After a skill's last release every active skill waits at least this long.
export const ROLE_GLOBAL_CD=1;
export function createRoleCombat(world,{moveBody,lineClear,types}={}){
 const specific=roleById(world.profession.id),role=specific??{id:'novice',color:'#ffe3a0',branches:[],passives:[]};
 const branch=role.branches.find(b=>b.id===world.jobId),state={fields:[],pets:[],spiritShots:[],petSerial:0,shotSerial:0,combo:0,shield:0,pending:null,meta:{},passiveAt:{}};
 const w=world,p=w.player,me=()=>({id:w.roleOwnerId??'self',world:w,player:p}),allies=()=>w.roleAllies?.()??[me()],enemies=()=>w.foes().filter(m=>m.hp>0),visible=(a,b)=>lineClear(a,b,w.nav);
 const spiritEnabled=()=>w.spiritPrototype===true||w.spiritCompanion===true;
 // 0.119 class passives sit in slots 6-8 and the Master branch passives in 14-16 (role-skill-progress.js); each passive
 // adds value x its level (1-3), and passives sharing a modifier stack.
 const passives=[...role.passives.map((s,i)=>[s,PASSIVE_SLOTS[i]]),...(branch?.passives??[]).map((s,i)=>[s,MASTER_PASSIVE_SLOTS[i]])];
 const mods=()=>{const out={};for(const [s,slot] of passives){const lv=w.skillLevels[slot]??0;if(lv>0)out[s.modifier]=(out[s.modifier]??0)+s.value*lv;}return out;};
 function trigger(mod,at=p){const skill=passives.find(([s,slot])=>s.modifier===mod&&(w.skillLevels[slot]??0)>0)?.[0];if(!skill||w.time-(state.passiveAt[skill.id]??-9)<1)return;state.passiveAt[skill.id]=w.time;w.emit('rolePassive',{roleSkillId:skill.id,from:{x:p.x,z:p.z},to:{x:at.x,z:at.z},kind:'passive',color:role.color});}
 const status=(a,key,seconds,power=0)=>{a.world.status[key]=Math.max(a.world.status[key]??0,seconds);if(a.world.roleCombat)a.world.roleCombat.state.meta[key]={power,owner:w.roleOwnerId??'self',facing:{...p.face}};};
 function enemyStatus(m,key,seconds,power=0){const victim=m.pvp?w.roleEnemy?.(m):null;if(victim){victim.status[key]=Math.max(victim.status[key]??0,seconds);m.roleStatus=victim.roleDebuffs??={};} const effects=m.roleStatus??={},effect={left:seconds,power,owner:w.roleOwnerId??'self',pvpId:m.pvp?m.id:null};if(key==='poison')applyPoison(effects,effect);else effects[key]=effect;if(key==='root')m.root=Math.max(m.root??0,seconds);}
 function shield(a,amount,seconds=7){if(!a.world.roleCombat)return;const m=mods();a.world.roleCombat.state.shield=Math.max(a.world.roleCombat.state.shield,amount*(1+(m.shieldBonus??0)));status(a,'shield',seconds);trigger('shieldBonus',a.player);}
 function heal(a,amount){if(a.player.hp<=0)return;const n=Math.max(0,Math.min(a.player.maxHp-a.player.hp,amount*(1+(mods().healBonus??0))));if(n){a.player.hp+=n;a.world.emit('heal',{x:a.player.x,z:a.player.z,amount:Math.round(n),color:'#a6efaa'});trigger('healBonus',a.player);}}
 function clean(a){for(const key of harmful)delete a.world.status[key];if(a.world.roleCombat)for(const key of harmful)delete a.world.roleCombat.state.meta[key];}
 function crowd(m,seconds){if(types[m.type]?.boss||m.pvp){m.roleStagger=clamp((m.roleStagger??0)+35,0,100);if(m.roleStagger>=100){m.roleStagger=0;m.charge=0;m.windup=0;m.slamming=false;m.attackCD=Math.max(m.attackCD??0,.6);w.emit('combo',{x:m.x,z:m.z});}return;}enemyStatus(m,'root',seconds);m.charge=0;m.windup=0;}
 function damage(m,n,kind='skill',resolved=0){
  if(!m||m.hp<=0||!visible(p,m))return;if(kind==='reflection'){const previous=w.damageContext;w.damageContext={source:'reflection',crit:false};w.roleSecondary=true;try{w.hurt(m,Math.round(n),role.color);}finally{w.roleSecondary=false;w.damageContext=previous;}return;}if(w.status.inspired)n*=1.2;const a=mods(),s=m.roleStatus??{};
  if(s.mark)n*=1.2+(a.markBonus??0);if(s.brand)n*=1.2;if(s.break)n*=1.3*(1+(a.brokenBonus??0));
  if(a.farBonus&&dist(p,m)>4){n*=1+a.farBonus;trigger('farBonus',m);}
  if(a.markBonus&&s.mark)trigger('markBonus',m);if(a.brokenBonus&&s.break)trigger('brokenBonus',m);
  if(a.damageDealt)n*=1+a.damageDealt;
  w.roleSecondary=kind!=='skill';try{skillHit(w,m,w.power(n,m)+resolved,role.color,kind==='skill'?{}:{source:kind});}finally{w.roleSecondary=false;}
 }
 // Match basic attacks: offensive reach ends at the body's edge, not its centre.
 // Ground points and friendly/self targets keep their original centre-based range.
 const radius=m=>Math.max(0,w.bodyRadius?.(m)??0),reach=(at,m)=>dist(at,m)-radius(m);
 function area(at,r=3){return enemies().filter(m=>reach(at,m)<=r&&visible(at,m));}
 function team(at,r=4.5){return allies().filter(a=>a.player.hp>0&&dist(a.player,at)<=r&&visible(at,a.player));}
 function line(at,range=8){const dx=at.x-p.x,dz=at.z-p.z,len=Math.hypot(dx,dz)||1;return enemies().filter(m=>{const x=m.x-p.x,z=m.z-p.z,t=(x*dx+z*dz)/len,c=Math.abs(x*dz-z*dx)/len;return Math.hypot(Math.max(0,-t,t-range),Math.max(0,c-1.25))<=radius(m)&&visible(p,m);});}
 function pet(s,kind){
  state.pets=state.pets.filter(a=>a.kind!==kind);
  const owner=w.roleOwnerId??'self',tier=s.kind.startsWith('great')?'master':'base',id=owner+':'+kind+':'+(++state.petSerial),a={id,owner,kind,tier,x:p.x+.7,z:p.z+.4,left:s.seconds,power:s.kind.startsWith('great')?48:28,tick:.4,skillId:s.roleSkillId,spawnedAt:w.time,endsAt:w.time+s.seconds,maxLeft:s.seconds,face:{...p.face},attackAt:null};
  state.pets.push(a);status(me(),kind,s.seconds);
  if(kind==='spirit'&&spiritEnabled()){for(const shot of state.spiritShots)if(!state.pets.some(pet=>pet.id===shot.petId))w.emit('spiritImpact',{owner:shot.owner,petId:shot.petId,skillId:shot.skillId,tier:shot.tier,shotId:shot.shotId,targetId:shot.targetId,x:shot.to.x,z:shot.to.z,to:{...shot.to},hit:false,impactAt:w.time});state.spiritShots=state.spiritShots.filter(shot=>state.pets.some(pet=>pet.id===shot.petId));w.emit('spiritSummon',{owner,petId:id,skillId:a.skillId,tier,x:a.x,z:a.z,from:{x:p.x,z:p.z},to:{x:a.x,z:a.z},duration:.55,spawnedAt:a.spawnedAt,endsAt:a.endsAt});}
 }
 // Companion bolts resolve on the simulation clock; each hit keeps its pet and shot identity.
 function spiritShot(pet,target){
  const duration=.3,from={x:pet.x,z:pet.z},to={x:target.x,z:target.z},owner=w.roleOwnerId??'self',shotId=pet.id+':shot:'+(++state.shotSerial),launchAt=w.time,impactAt=launchAt+duration;
  const data={owner,petId:pet.id,skillId:pet.skillId,tier:pet.tier,shotId,x:pet.x,z:pet.z,from,to,targetId:target.id,duration,launchAt,impactAt};
  pet.attackAt=launchAt;pet.targetId=target.id;pet.face={x:to.x-from.x,z:to.z-from.z};
  state.spiritShots.push({...data,target,left:duration,power:pet.power*(1+(mods().summonPower??0))});w.emit('spiritShot',data);
 }
 function spiritImpacts(dt){
  for(const shot of state.spiritShots){
   shot.left-=dt;
   const pet=state.pets.find(a=>a.id===shot.petId&&a.left>dt),target=shot.target;
   const valid=!!pet&&p.hp>0&&target?.hp>0&&w.foes().includes(target)&&visible(p,target);
   if(!valid||shot.left<=1e-8){
    const hit=valid&&shot.left<=1e-8,at=hit?target:shot.to;
    if(hit){const previous=w.damageContext;w.damageContext={source:'spirit',petId:shot.petId,shotId:shot.shotId,roleSkillId:shot.skillId,owner:shot.owner};try{damage(target,shot.power);}finally{w.damageContext=previous;}trigger('summonPower',target);if(mods().bondHeal&&target.roleStatus?.mark){heal(me(),mods().bondHeal);trigger('bondHeal');}}
    w.emit('spiritImpact',{owner:shot.owner,petId:shot.petId,skillId:shot.skillId,tier:shot.tier,shotId:shot.shotId,targetId:shot.targetId,x:at.x,z:at.z,to:{x:at.x,z:at.z},hit,impactAt:w.time});shot.done=true;
   }
  }
  state.spiritShots=state.spiritShots.filter(s=>!s.done);
 }
 function field(s,at){state.fields=state.fields.filter(f=>f.skillId!==s.roleSkillId);state.fields.push({x:at.x,z:at.z,left:s.seconds+(['sanctuary'].includes(s.type)?mods().sanctuaryDuration??0:0),tick:0,radius:s.radius*(1+(['zone','wall'].includes(s.type)?mods().zoneRadius??0:0)),power:s.power,kind:s.type,skillId:s.roleSkillId});if(['zone','wall'].includes(s.type))trigger('zoneRadius');if(s.type==='sanctuary')trigger('sanctuaryDuration');}
 function perform(s,target){
  const firstHit=(w.damageContext?.hitIndex??0)===0,m=mods(),kind=s.type,at=target?.player??target??p,n=s.power??0,around=()=>area(p,s.radius),near=()=>area(at,s.radius),a=target?.world?target:me();
  switch(kind){
   case 'taunt':case 'anchor':for(const enemy of around())enemyStatus(enemy,'taunt',s.seconds+(m.tauntDuration??0));if(kind==='anchor')shield(me(),n);trigger('tauntDuration');break;
   case 'guard':status(me(),'guard',s.seconds,.65);break;
   case 'counter':status(me(),'counter',s.seconds,n);break;
   case 'riposte':damage(target,n);if(firstHit){crowd(target,1);status(me(),'counter',3,90);}break;
   case 'intercept':{const dx=at.x-p.x,dz=at.z-p.z,d=Math.hypot(dx,dz)||1;moveBody(p,dx/d*Math.max(0,d-.8),dz/d*Math.max(0,d-.8),w.nav);status(a,'link',s.seconds,40);shield(me(),60);break;}
   case 'link':status(a,'link',s.seconds,n);break;
   case 'lastStand':heal(me(),p.maxHp*n/100);shield(me(),p.maxHp*.25);break;
   case 'cleave':for(const enemy of around())damage(enemy,n);break;
   case 'break':case 'brand':damage(target,n);enemyStatus(target,kind,s.seconds);break;
   case 'execute':damage(target,n*(target.hp/target.maxHp<.35?2:1));break;
   case 'line':case 'drill':case 'chainLine':case 'phalanx':{const victims=line(at,s.range);for(const enemy of victims){damage(enemy,n*(kind==='chainLine'?1+.15*Math.max(0,victims.length-1):1));if(kind==='drill')enemyStatus(enemy,'break',6);}if(kind==='phalanx')for(const ally of team(p))shield(ally,90);if(firstHit&&victims.length>1&&m.lineRecovery){for(let i=0;i<6;i++)w.cooldowns[i]=Math.max(0,w.cooldowns[i]-m.lineRecovery);trigger('lineRecovery');}break;}
   case 'interrupt':case 'bind':damage(target,n);crowd(target,s.seconds);break;
   case 'massBind':case 'uppercut':case 'flock':for(const enemy of near()){damage(enemy,n);if(firstHit)crowd(enemy,2);}break;
   case 'push':case 'pull':for(const enemy of near()){damage(enemy,n);if(types[enemy.type]?.boss||enemy.pvp){crowd(enemy,1);continue;}const dx=enemy.x-p.x,dz=enemy.z-p.z,d=Math.hypot(dx,dz)||1,k=kind==='pull'?-1.8:1.8;moveBody(enemy,dx/d*k,dz/d*k,w.nav);}break;
   case 'evade':{const d=Math.hypot(p.face.x,p.face.z)||1;moveBody(p,-p.face.x/d*2,-p.face.z/d*2,w.nav);status(me(),'evade',s.seconds);break;}
   case 'retreatShot':{damage(target,n);const d=dist(p,at)||1;moveBody(p,(p.x-at.x)/d*2,(p.z-at.z)/d*2,w.nav);break;}
   case 'meteor':for(const enemy of near())damage(enemy,n);break;
   case 'zone':case 'wall':case 'storm':case 'trap':case 'rain':case 'thorns':case 'regen':case 'lifeTree':case 'sanctuary':case 'yantra':case 'holyField':case 'mine':field(s,at);break;
   case 'summon':case 'greatSummon':pet(s,'rooster');break;
   case 'spirit':case 'greatSpirit':pet(s,'spirit');shield(me(),kind==='greatSpirit'?130:70);break;
   case 'peck':{const bird=state.pets.find(p=>p.kind==='rooster');if(!bird)return;bird.x=at.x-.5;bird.z=at.z;damage(target,n*(1+(m.summonPower??0)));crowd(target,1.5);break;}
   case 'mark':damage(target,n);enemyStatus(target,'mark',s.seconds);break;
   case 'cone':{const dx=at.x-p.x,dz=at.z-p.z,d=Math.hypot(dx,dz)||1;for(const enemy of enemies()){const x=enemy.x-p.x,z=enemy.z-p.z,l=Math.hypot(x,z)||1;if(l-radius(enemy)<=s.range&&(x*dx+z*dz)/(l*d)>.65)damage(enemy,n);}break;}
   case 'ambush':damage(target,n*(target.roleStatus?.mark?1.25:1));status(me(),'stealth',3);break;
   case 'crow':for(const ally of team(p)){status(ally,'inspired',s.seconds,.2);delete ally.world.status.fear;}break;
   case 'jab':damage(target,n);state.combo=Math.min(3,state.combo+1);break;
   case 'combo':damage(target,n);state.combo=3;if(firstHit&&m.comboMana){p.mp=Math.min(p.maxMp,p.mp+m.comboMana);trigger('comboMana');}break;
   case 'comboFinish':case 'comboBurst':for(const enemy of kind==='comboBurst'?near():[target])damage(enemy,n*(1+state.combo*.35)*(1+(m.comboBonus??0)));state.combo=0;if(firstHit&&m.comboMana)p.mp=Math.min(p.maxMp,p.mp+m.comboMana);trigger('comboBonus');trigger('comboMana');break;
   case 'leap':{const d=dist(p,at)||1;moveBody(p,(at.x-p.x)/d*Math.max(0,d-1),(at.z-p.z)/d*Math.max(0,d-1),w.nav);damage(target,n);crowd(target,1);break;}
   case 'stealth':status(me(),'stealth',s.seconds+(m.stealthDuration??0));trigger('stealthDuration');break;
   case 'backstab':{const hidden=!!w.status.stealth,d=dist(p,at)||1;moveBody(p,(at.x-p.x)/d*Math.max(0,d-.9),(at.z-p.z)/d*Math.max(0,d-.9),w.nav);damage(target,n*(hidden?1.6:1));delete w.status.stealth;if(hidden&&m.stealthMana){p.mp=Math.min(p.maxMp,p.mp+m.stealthMana);trigger('stealthMana');}break;}
   case 'slow':damage(target,n);enemyStatus(target,'slow',s.seconds);break;
   case 'poison':case 'venom':damage(target,n*.5);enemyStatus(target,'poison',s.seconds+(m.poisonDuration??0),w.power(n,target));trigger('poisonDuration');break;
   case 'detonatePoison':{const poison=poisonFor(target.roleStatus,w.roleOwnerId??'self');damage(target,n,'skill',Math.round((poison?.left??0)*(poison?.power??0)*.7));takePoison(target.roleStatus??{},w.roleOwnerId??'self');if(target.pvp&&!target.roleStatus?.poison){const victim=w.roleEnemy?.(target);if(victim)delete victim.status.poison;}break;}
   case 'smoke':for(const ally of team(at)){status(ally,'smoke',s.seconds);delete ally.world.status.fear;}break;
   case 'clones':status(me(),'stealth',s.seconds+(m.stealthDuration??0));for(const enemy of around())if(!types[enemy.type]?.boss&&!enemy.pvp)enemyStatus(enemy,'decoy',s.seconds);trigger('stealthDuration');break;
   case 'curse':damage(target,n);enemyStatus(target,'curse',s.seconds);break;
   case 'detonateCurse':for(const enemy of near())damage(enemy,n);delete target.roleStatus.curse;if(m.curseMana){p.mp=Math.min(p.maxMp,p.mp+m.curseMana);trigger('curseMana');}break;
   case 'soulWave':case 'curseWave':for(const enemy of near()){damage(enemy,n*(enemy.roleStatus?.curse?1.4:1));enemyStatus(enemy,'slow',4);}break;
   case 'ward':for(const ally of team(at)){shield(ally,n,s.seconds);status(ally,'reflect',s.seconds,15+(m.reflect??0)*100);}break;
   case 'reflect':shield(a,80,s.seconds);status(a,'reflect',s.seconds,n+(m.reflect??0)*100);break;
   case 'holy':damage(target,n*(target.roleStatus?.curse?1.35+(m.holyBonus??0):1));if(target.roleStatus?.curse)trigger('holyBonus',target);break;
   case 'heal':heal(a,n);break;
   case 'cleanse':clean(a);heal(a,n);break;
   case 'revive':case 'greatRevive':a.player.hp=a.player.maxHp*clamp((n+(m.reviveBonus??0))/100,0,1);a.player.down=0;a.world.status={};if(kind==='greatRevive')shield(a,120);a.world.emit('heal',{x:at.x,z:at.z,amount:Math.round(a.player.hp),color:'#ffe3a0'});trigger('reviveBonus',at);break;
   case 'groupHeal':for(const ally of team(at)){heal(ally,n);delete ally.world.status.poison;}break;
   case 'purify':for(const ally of team(at))clean(ally);for(const enemy of near())damage(enemy,n);break;
   default:throw new Error('unimplemented-role-kind:'+kind);
  }
 }
 function targetFor(s){if(friends.has(s.type))return allies().find(a=>a.id===w.supportTargetId)??me();if(groundKinds.has(s.type)&&w.roleGround)return w.roleGround;if(selfKinds.has(s.type))return me();return w.target;}
 function valid(s,target,release=false){
  const at=target?.player??target;if(!at)return 'เลือกเป้าหมายก่อน';
  if(friends.has(s.type)){if(!allies().some(a=>a.id===target.id))return 'เลือกเพื่อนในปาร์ตี้เดียวกัน';if(['revive','greatRevive'].includes(s.type)?at.hp>0:at.hp<=0)return 'เป้าหมายไม่ตรงกับสกิล';}
  else if(!selfKinds.has(s.type)&&target.hp<=0)return 'เป้าหมายหมดแรงแล้ว';
  // A friend or foe that steps away during the wind-up still receives the release (2 m grace).
  const hostile=!friends.has(s.type)&&!selfKinds.has(s.type)&&!(groundKinds.has(s.type)&&target===w.roleGround);
  if((hostile?reach(p,at):dist(p,at))>(s.range??7)+(release?2.6:.6)||!visible(p,at))return 'เป้าหมายไกลหรือมีสิ่งกีดขวาง';
  if(w.safe&&!selfKinds.has(s.type)&&!friends.has(s.type))return 'เขตปลอดภัย';
  if(['peck','flock'].includes(s.type)&&!state.pets.some(a=>a.kind==='rooster'))return 'เรียกไก่ชนก่อน';
  if(s.type==='detonatePoison'&&!poisonFor(target.roleStatus,w.roleOwnerId??'self'))return 'เป้าหมายต้องติดพิษก่อน';
  if(s.type==='detonateCurse'&&!target.roleStatus?.curse)return 'เป้าหมายต้องติดคำสาปก่อน';
  return null;
 }
 function incoming(amount,source){
  if(!Number.isFinite(amount)||amount<=0)return 0;if(source?.roleStatus?.curse)amount*=.75;const m=mods(),st=w.status;let n=petIncoming(w,amount);
  if((st.evade||st.smoke)&&Math.random()<.65){w.emit('dodge',{x:p.x,z:p.z});return 0;}
  const guard=state.meta.guard,facing=guard?.facing??p.face;if(st.guard&&(!source||(source.x-p.x)*facing.x+(source.z-p.z)*facing.z>=0))n*=.35;
  let protection=0;for(const ally of allies())for(const f of ally.world.roleCombat?.state.fields??[])if(['sanctuary','yantra'].includes(f.kind)&&dist(p,f)<=f.radius)protection=Math.max(protection,f.power/100);n*=1-clamp(protection,0,.7);
  if(m.zoneGuard&&state.fields.some(f=>['zone','wall'].includes(f.kind)&&dist(p,f)<=f.radius)){n*=1-m.zoneGuard;trigger('zoneGuard');}if(m.lowGuard&&p.hp/p.maxHp<.35){n*=1-m.lowGuard;trigger('lowGuard');}
  if(st.link&&!source?.linked){const owner=allies().find(a=>a.id===state.meta.link?.owner);if(owner&&owner.player!==p&&owner.player.hp>0&&dist(owner.player,p)<10){const share=n*(state.meta.link.power??0)/100;n-=share;const taken=owner.world.roleCombat?.incoming(share,{...source,linked:true,secondary:true})??share;owner.player.hp=Math.max(0,owner.player.hp-taken);owner.world.emit('playerHit',{x:owner.player.x,z:owner.player.z,amount:Math.round(taken)});if(owner.player.hp<=0)owner.world.fall();}}
  if(!source?.secondary&&st.counter&&source?.hp>0){delete st.counter;n*=.3;damage(source,state.meta.counter?.power??90,'counter');if(m.counterRecovery){const i=w.skills.findIndex(s=>s.roleSkillId==='cleave');if(i>=0)w.cooldowns[i]=Math.max(0,w.cooldowns[i]-m.counterRecovery);trigger('counterRecovery',source);}}
  if(!source?.secondary&&source?.hp>0&&(st.reflect||m.reflect)){const reflection=(st.reflect?(state.meta.reflect?.power??0)/100:0)+(st.guard?m.reflect??0:0);if(reflection){damage(source,n*reflection,'reflection');trigger('reflect',source);}}
  if(st.shield){const absorbed=Math.min(n,state.shield);state.shield-=absorbed;n-=absorbed;if(state.shield<=0)delete st.shield;}
  if(m.damageTaken)n*=1-Math.min(.5,m.damageTaken);return Math.max(0,Math.round(n));
 }
 return {state,mods,trigger,incoming,damage,outgoing(m,n){if(!m)return n;const bonus=mods().venomFinish??0;if(bonus&&poisonFor(m.roleStatus,w.roleOwnerId??'self')&&m.hp/m.maxHp<.35){trigger('venomFinish',m);return n*(1+bonus);}return n;},legacy:!specific,skills:liveRoleSkills(w.profession.id,w.jobId)??w.skills,
  cast(index){const s=scaledSkill(w.skills[index],w.skillLevels[index]??0);if(!s||s.reserved||s.passive||p.hp<=0||state.pending||w.basicPending||w.status.stun||w.status.sleep)return false;if(w.status.silence){w.notice('ใบ้ · ใช้สกิลไม่ได้');return false;}const cost=Math.round(s.cost*(1-(w.derived?.mpCut??0)));if(w.cooldowns[index]>0||p.mp<cost)return false;const target=targetFor(s),error=valid(s,target);if(error){w.notice(error);return false;}const at=target.player??target,profile=SKILL_PROFILES[s.roleSkillId];const aim=selfKinds.has(s.type)?w.target??at:at;if(dist(p,aim)>.01)p.face={x:aim.x-p.x,z:aim.z-p.z};p.mp-=cost;w.cooldowns[index]=s.cd*(1-Math.min(.5,(w.derived?.cdr??0)+(mods().cdr??0)))*(role.id==='hunter'&&['rain','cone','ambush','retreatShot'].includes(s.type)?1-(mods().arrowCooldown??0):1);if(mods().arrowCooldown)trigger('arrowCooldown');const timing=roleTiming(s,profile),castId=++w.castSerial||(w.castSerial=1);state.pending={s,index,cost,target,hit:0,combo:state.combo,times:timing.impacts,left:timing.impacts[0],castId,origin:{x:p.x,z:p.z}};w.emit('cast',{skillIndex:index,roleSkillId:s.roleSkillId,castId,timing,from:{x:p.x,z:p.z},to:{x:at.x,z:at.z},color:role.color,kind:s.type});return true;},
  // 0.119 AUTO: rescue skills (revive, a needed heal or cleanse, last stand) at once; otherwise the ready skill with the
  // longest cooldown, so the big ones fire as they come back and a short one (หมัดนำ) fills the gaps instead of
  // winning every pick when the 1 s gap between skills ends. Ties keep the hotbar order.
  autoIndex(config){if(state.pending||w.basicPending||w.legacyPending)return -1;let best=-1,bestCd=-1;for(const i of config.skills){const s=scaledSkill(w.skills[i],w.skillLevels[i]??0);if(!s||s.reserved||s.passive||w.cooldowns[i]>0||p.mp<s.cost)continue;const target=targetFor(s);if(valid(s,target))continue;if(['poison','venom'].includes(s.type)){const old=poisonFor(target.roleStatus,w.roleOwnerId??'self');if(old?.left>1&&old.power>=w.power(s.power,target))continue;}if(['revive','greatRevive'].includes(s.type))return i;if(s.type==='heal'){if(target.player.hp>target.player.maxHp*.6)continue;return i;}if(['guard','counter','stealth','smoke'].includes(s.type)&&w.status[s.type])continue;if(['summon','greatSummon'].includes(s.type)&&state.pets.some(a=>a.kind==='rooster'))continue;if(['spirit','greatSpirit'].includes(s.type)&&state.pets.some(a=>a.kind==='spirit'))continue;if(['sanctuary','regen','lifeTree','yantra','ward'].includes(s.type)&&(!w.target||state.fields.some(f=>f.kind===s.type)))continue;if(['lastStand'].includes(s.type)){if(p.hp>p.maxHp*.35)continue;return i;}if(s.type==='cleanse'){if(!harmful.some(k=>target.world.status[k]))continue;return i;}if((s.cd??0)>bestCd){best=i;bestCd=s.cd??0;}}return best;},
  step(dt,input){
   const hpMod=mods().maxHp??0;if(hpMod!==(state.hpMod??0)){const base=w.derived?.maxHp??p.maxHp/(1+(state.hpMod??0));p.maxHp=Math.round(base*(1+hpMod));p.hp=Math.min(p.hp,p.maxHp);state.hpMod=hpMod;trigger('maxHp');}
   for(const [key,effect] of Object.entries(w.roleDebuffs??{})){if(!w.status[key]){delete w.roleDebuffs[key];continue;}effect.left=w.status[key];if(key==='poison')tickPoison(w.roleDebuffs,dt,e=>{const owner=w.roleResolveOwner?.(e.owner),victim=owner?.foes().find(m=>m.id===e.pvpId);if(victim)skillHit(owner,victim,e.power,'#a9d86f',{source:'poison'});});if(key==='poison'&&!w.roleDebuffs.poison)delete w.status.poison;}
   for(const k of Object.keys(state.meta))if(!w.status[k])delete state.meta[k];if(p.hp<=0){if(state.pending)w.emit('castCancel',{castId:state.pending.castId});state.pending=null;state.fields=[];state.pets=[];if(spiritEnabled())for(const shot of state.spiritShots)w.emit('spiritImpact',{owner:shot.owner,petId:shot.petId,skillId:shot.skillId,tier:shot.tier,shotId:shot.shotId,targetId:shot.targetId,x:shot.to.x,z:shot.to.z,to:{...shot.to},hit:false,impactAt:w.time});state.spiritShots=[];state.combo=0;state.shield=0;return;}
   if(state.pending){const c=state.pending;if(w.status.stun||w.status.sleep||w.status.silence||(['revive','greatRevive'].includes(c.s.type)&&(Math.hypot(input.x??0,input.z??0)>.08||dist(p,c.origin)>.15))){w.emit('castCancel',{castId:c.castId});state.pending=null;w.notice('การร่ายถูกยกเลิก');}else if((c.left-=dt)<=1e-8){if(!valid(c.s,c.target,true)){w.damageContext={castId:c.castId,hitIndex:c.hit,roleSkillId:c.s.roleSkillId,source:'skill'};try{if(['comboBurst','comboFinish'].includes(c.s.type))state.combo=c.combo;perform(c.times?{...c.s,power:c.s.power/c.times.length}:c.s,c.target);}finally{w.damageContext=null;}w.emit('roleRelease',{roleSkillId:c.s.roleSkillId,castId:c.castId,hitIndex:c.hit});c.hit++;if(c.times&&c.hit<c.times.length)c.left+=c.times[c.hit]-c.times[c.hit-1];else{state.pending=null;p.attackCD=Math.max(p.attackCD,.16);w.skills.forEach((x,i)=>{if(x&&!x.passive&&!x.reserved)w.cooldowns[i]=Math.max(w.cooldowns[i]??0,ROLE_GLOBAL_CD);});}}else{w.emit('castCancel',{castId:c.castId});state.pending=null;if(c.hit===0){p.mp=Math.min(p.maxMp,p.mp+c.cost);w.cooldowns[c.index]=0;w.notice('สกิลไม่สำเร็จ · คืน MP');}}}}
   for(const f of state.fields){f.left-=dt;f.tick-=dt;if(f.tick>0)continue;f.tick=1;
    if(['regen','lifeTree'].includes(f.kind))for(const ally of team(f,f.radius)){heal(ally,f.power);status(ally,f.kind,1.2);}else if(['sanctuary','yantra'].includes(f.kind)){for(const ally of team(f,f.radius))status(ally,'sanctuary',1.2);if(f.kind==='yantra')for(const enemy of area(f,f.radius))enemyStatus(enemy,'slow',1.2);}else{for(const enemy of area(f,f.radius)){damage(enemy,f.power*(f.kind==='holyField'&&enemy.roleStatus?.curse?1.35+(mods().holyBonus??0):1));if(['trap','wall'].includes(f.kind))crowd(enemy,1.1);if(['zone','thorns'].includes(f.kind))enemyStatus(enemy,'slow',1.2);}if(f.kind==='mine'&&area(f,f.radius).length)f.left=0;}}
   state.fields=state.fields.filter(f=>f.left>0);
   if(spiritEnabled())spiritImpacts(dt);else state.spiritShots=[];
   for(const pet of state.pets){
    pet.left-=dt;pet.tick-=dt;const target=w.target;
    if(pet.kind==='spirit'&&spiritEnabled()){
     if(pet.left<=0){w.emit('spiritDismiss',{owner:pet.owner,petId:pet.id,skillId:pet.skillId,tier:pet.tier,x:pet.x,z:pet.z,duration:.4});continue;}
     // The lab has a fixed camera; live companions rotate their shoulder offset with the owner's facing.
     const length=Math.hypot(p.face.x,p.face.z)||1,fx=p.face.x/length,fz=p.face.z/length;
     const anchor=w.spiritCompanion===true?{x:p.x-fx*1.15+fz*.5,z:p.z-fz*1.15-fx*.5}:{x:p.x-1.15,z:p.z-.5},blend=1-Math.exp(-dt*7);
     pet.x+=(anchor.x-pet.x)*blend;pet.z+=(anchor.z-pet.z)*blend;
     if(target?.hp>0&&visible(p,target)&&dist(p,target)<12){pet.face={x:target.x-pet.x,z:target.z-pet.z};if(pet.tick<=0){pet.tick=1.2;spiritShot(pet,target);}}
     else{pet.targetId=null;pet.face={...p.face};}
     continue;
    }
    if(target?.hp>0&&visible(p,target)&&dist(p,target)<12){const d=dist(pet,target)||1,n=Math.min(d,dt*5);pet.x+=(target.x-pet.x)/d*n;pet.z+=(target.z-pet.z)/d*n;if(pet.tick<=0&&dist(pet,target)<(pet.kind==='spirit'?6:1.4)){pet.tick=1.2;damage(target,pet.power*(1+(mods().summonPower??0)));trigger('summonPower',target);if(mods().bondHeal&&target.roleStatus?.mark){heal(me(),mods().bondHeal);trigger('bondHeal');}}}else{pet.x+=(p.x+.7-pet.x)*Math.min(1,dt*3);pet.z+=(p.z+.4-pet.z)*Math.min(1,dt*3);}
   }
   state.pets=state.pets.filter(a=>a.left>0);if(state.combo)w.status.combo=.2;
  }
 };
}
// One call per shared room, not per player. The original owner retains kill credit for poison.
export function stepRoleMonsters(mobs,dt,resolve){for(const m of mobs){if(m.hp<=0){m.roleStatus={};continue;}const status=m.roleStatus??{};tickPoison(status,dt,s=>{if(m.hp>0){const owner=resolve(s.owner);if(owner){owner.damageContext={source:'poison'};try{skillHit(owner,m,s.power,'#a9d86f',{source:'poison'});}finally{owner.damageContext=null;}}}});for(const [key,s] of Object.entries(status)){if(key==='poison')continue;s.left-=dt;if(s.left<=0)delete status[key];}if(m.hp<=0)m.roleStatus={};}}
