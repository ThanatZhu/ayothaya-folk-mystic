export const PET_SKILL_ERRORS={'pet-cooldown':'สกิลสัตว์เลี้ยงยังไม่พร้อม','pet-not-equipped':'เลือกสัตว์เลี้ยงติดตามก่อน','pet-safe-zone':'ออกนอกเมืองก่อนใช้สกิลโจมตี','pet-no-target':'เลือกมอนสเตอร์ในระยะก่อน','pet-cannot-act':'ยังใช้สกิลไม่ได้ในขณะนี้'};
import {skillHit} from './skill-critical.js';
// Pet effects are separate from class shields and cannot erase a class skill's state.
export function tickPetEffects(w,dt){const s=w.petEffects;if(!s)return;for(const k of ['shieldLeft','guardLeft','blessingLeft'])s[k]=Math.max(0,(s[k]??0)-dt);if(!s.shieldLeft)s.shield=0;if(w.player.hp<=0)w.petEffects=null;}
export function petIncoming(w,amount){const s=w.petEffects;if(!s)return amount;let n=amount*(s.guardLeft>0?1-s.guard:1);if(s.shieldLeft>0){const absorb=Math.min(n,s.shield);s.shield-=absorb;n-=absorb;}return Math.max(0,Math.round(n));}
export const petBlessing=w=>w.petEffects?.blessingLeft>0?1.08:1;
export function castPremiumPet(w,pet,{lineClear,types}={}){
 const p=w.player;if(p.hp<=0||w.emote||['stun','sleep','silence'].some(k=>w.status[k]>0))throw Error('pet-cannot-act');
 const s=pet.skill,offensive=['fireBurst','trueSight','flowerBind','echoSlow'].includes(s.kind),target=w.target;
 const visible=m=>m&&!m.pvp&&m.hp>0&&Math.hypot(m.x-p.x,m.z-p.z)<=9&&lineClear(p,m,w.nav);
 if(offensive&&(w.safe||!visible(target)))throw Error(w.safe?'pet-safe-zone':'pet-no-target');
 const fx=w.petEffects??={shield:0,shieldLeft:0,guard:0,guardLeft:0,blessingLeft:0};
 const heal=share=>{const n=Math.max(0,Math.min(p.maxHp-p.hp,Math.round(p.maxHp*share)));p.hp+=n;w.emit('heal',{x:p.x,z:p.z,amount:n,color:s.color});};
 const magic=!!w.derived?.magic,power=magic?w.derived?.matk:w.derived?.atk;
 const damage=m=>skillHit(w,m,Math.max(1,Math.round((power??w.profession.damage??30)*s.power*w.guardOf(m,magic))),s.color,{source:'petSkill',magic});
 if(s.kind==='fireBurst')w.mobs.filter(m=>visible(m)&&Math.hypot(m.x-target.x,m.z-target.z)<=3).forEach(damage);
 if(s.kind==='lotusCleanse'){heal(s.power);delete w.status.poison;delete w.roleDebuffs?.poison;}
 if(s.kind==='riceHeal')heal(s.power);
 if(['moonBarrier','jadeShell'].includes(s.kind)){fx.shield=Math.max(fx.shield,Math.round(p.maxHp*s.power));fx.shieldLeft=s.duration;if(s.kind==='moonBarrier')fx.blessingLeft=s.duration;}
 if(s.kind==='roarGuard'){fx.guard=s.power;fx.guardLeft=s.duration;}
 if(s.kind==='trueSight')target.petArmor={left:s.duration,power:s.power};
 if(s.kind==='flowerBind'){damage(target);if(!types[target.type]?.boss)target.root=Math.max(target.root??0,s.duration);}
 if(s.kind==='echoSlow'){damage(target);target.petSlow=Math.max(target.petSlow??0,s.duration);}
 if(s.kind==='waterMana'){const n=Math.max(0,Math.min(p.maxMp-p.mp,Math.round(p.maxMp*s.power)));p.mp+=n;w.emit('heal',{x:p.x,z:p.z,amount:n,color:s.color});}
 w.emit('petSkill',{pet:pet.id,name:s.name,kind:s.kind,color:s.color,x:p.x,z:p.z,to:offensive?{x:target.x,z:target.z}:null});return true;
}
