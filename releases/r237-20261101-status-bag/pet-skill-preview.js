// Isolated skill sandbox, using catalog powers/cooldowns. It never touches the combat world or player saves.
import {petAtStars} from './premium-pets.js';
const copy=s=>({...s,player:{...s.player},enemies:s.enemies.map(e=>({...e})),cooldowns:{...s.cooldowns},events:[]});
export function newPetSandbox(id,stars=1){const p=petAtStars(id,stars),b=p.bonus,maxHp=1000+(b.vit??0)*15,maxMp=200+(b.int??0)*6;return {time:0,player:{maxHp,hp:Math.round(maxHp*.65),maxMp,mp:Math.round(maxMp*.4),atk:100+(b.str??0)*2+(b.dex??0),shield:0,shieldUntil:0,poison:true,guard:0,guardUntil:0,blessingUntil:0},enemies:Array.from({length:3},(_,i)=>({id:i+1,hp:2000,maxHp:2000,def:20,broken:0,brokenUntil:0,rootUntil:0,slowUntil:0,nextHit:0})),cooldowns:{},events:[]};}
export function stepPetSandbox(raw,dt){const s=copy(raw);s.time+=Math.max(0,Math.min(1,Number.isFinite(dt)?dt:0));const p=s.player;if(p.shieldUntil<=s.time)p.shield=0;if(p.guardUntil<=s.time)p.guard=0;return s;}
export function petSandboxAction(raw,action,id,stars=1){
 const s=copy(raw),p=s.player,target=s.enemies.find(e=>e.hp>0),pet=petAtStars(id,stars),skill=pet.skill;
 const damage=(e,amount)=>{const def=e.def*(e.brokenUntil>s.time?1-e.broken:1),n=Math.max(1,Math.round(amount-def));e.hp=Math.max(0,e.hp-n);s.events.push({kind:'damage',target:e.id,amount:n});};
 if(p.hp<=0)throw new Error('sandbox-defeated');
 if(action==='attack'){if(!target)throw new Error('no-target');damage(target,p.atk*(p.blessingUntil>s.time?1.08:1));return s;}
 if(action==='enemy'){
  if(!target)throw new Error('no-target');if(target.rootUntil>s.time){s.events.push({kind:'root',target:target.id});return s;}
  if(target.nextHit>s.time){s.events.push({kind:'waiting',target:target.id});return s;}
  target.nextHit=s.time+(target.slowUntil>s.time?3:2);const hit=Math.round(120*(1-p.guard)),blocked=Math.min(p.shield,hit);p.shield-=blocked;p.hp=Math.max(0,p.hp-(hit-blocked));s.events.push({kind:'enemy-hit',amount:hit-blocked,blocked});return s;
 }
 if(action!=='skill')throw new Error('bad-action');if((s.cooldowns[id]??0)>s.time)throw new Error('skill-cooldown');
 const offensive=['fireBurst','trueSight','flowerBind','echoSlow'].includes(skill.kind);if(offensive&&!target)throw new Error('no-target');
 s.cooldowns[id]=s.time+skill.cooldown;
 if(skill.kind==='fireBurst')s.enemies.filter(e=>e.hp>0).forEach(e=>damage(e,p.atk*skill.power));
 if(['lotusCleanse','riceHeal'].includes(skill.kind)){const n=Math.min(p.maxHp-p.hp,Math.round(p.maxHp*skill.power));p.hp+=n;s.events.push({kind:'heal',amount:n});if(skill.kind==='lotusCleanse'){p.poison=false;s.events.push({kind:'cleanse'});}}
 if(['moonBarrier','jadeShell'].includes(skill.kind)){p.shield=Math.round(p.maxHp*skill.power);p.shieldUntil=s.time+(skill.duration??8);s.events.push({kind:'shield',amount:p.shield});if(skill.kind==='moonBarrier')p.blessingUntil=s.time+skill.duration;}
 if(skill.kind==='roarGuard'){p.guard=skill.power;p.guardUntil=s.time+skill.duration;s.events.push({kind:'guard',amount:Math.round(p.guard*100)});}
 if(skill.kind==='trueSight'){target.broken=skill.power;target.brokenUntil=s.time+skill.duration;s.events.push({kind:'armor-break',amount:Math.round(skill.power*100),target:target.id});}
 if(skill.kind==='flowerBind'){damage(target,p.atk*skill.power);target.rootUntil=s.time+skill.duration;s.events.push({kind:'root',target:target.id});}
 if(skill.kind==='waterMana'){const n=Math.min(p.maxMp-p.mp,Math.round(p.maxMp*skill.power));p.mp+=n;s.events.push({kind:'mana',amount:n});}
 if(skill.kind==='echoSlow'){damage(target,p.atk*skill.power);target.slowUntil=s.time+skill.duration;s.events.push({kind:'slow',target:target.id});}
 return s;
}
