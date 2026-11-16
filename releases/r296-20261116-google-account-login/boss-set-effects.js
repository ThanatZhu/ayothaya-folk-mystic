// Rainbow boss set mechanics: the 2-, 3- and 5-piece effects written in gear-sets.js BOSS_SETS (owner, 8 Nov).
// One instance per combat world (role-combat creates it). The client and the realm server run the same rules; the
// server's results are the ones that count. Every proc emits 'setProc' so the wearer sees what fired.
export const SET_FX={
 swordShieldBelow:.3,swordShield:.2,swordShieldEvery:60,swordShieldFor:8,swordRage:10,swordRageMult:2,
 lancerRange:.5,lancerFar:4,lancerFarBonus:.15,lancerWaveEvery:5,lancerWavePower:120,lancerWaveRange:6,
 hunterExtra:.15,hunterChain:5,
 boxerStack:.03,boxerMax:10,boxerWindow:3,
 rogueHaste:3,rogueHasteBonus:.2,rogueLowHp:.3,rogueFinish:.4,
 shamanBurn:3,shamanBurnShare:.15,shamanEvery:4,
 acolyteHeal:.15,acolyteOverheal:.15,acolyteAura:.1,acolyteAuraRange:6,
};
// {cls, count} of the rainbow set worn, from deriveStats().sets.
export function wornBossSet(derived){const a=derived?.sets?.find(s=>s.boss);return a?{cls:a.boss,count:a.count}:{cls:null,count:0};}
export const hasBossSet=(derived,cls,count)=>{const s=wornBossSet(derived);return s.cls===cls&&s.count>=count;};
export const bossRangeBonus=derived=>hasBossSet(derived,'lancer',2)?SET_FX.lancerRange:0;

const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
// tools: the role-combat helpers the effects reuse (shield, damage, line, enemies, allies, field, me).
export function createSetEffects(w,tools,random=Math.random){
 const F=SET_FX,p=w.player,state={rage:0,rageCast:null,shieldAt:-Infinity,stacks:0,stackAt:-Infinity,free:false,chainTarget:null,chain:0,lanceHits:0,casts:0,procAt:{}};
 const has=(cls,n)=>hasBossSet(w.derived,cls,n);
 function proc(key,text,at=p){if(w.time-(state.procAt[key]??-Infinity)<.8)return;state.procAt[key]=w.time;w.emit('setProc',{key,text,x:at.x,z:at.z});}
 const stacks=()=>w.time-state.stackAt<=F.boxerWindow?state.stacks:0;
 return {
  state,
  // Any of our blows on a monster, before it lands.
  outgoing(m,n){
   if(m.pvp)return n; // monsters only: PvP balance is left as it is
   let k=1;
   if(has('rogue',5)&&m.maxHp>0&&m.hp/m.maxHp<F.rogueLowHp){k*=1+F.rogueFinish;proc('rogue5','ปิดฉาก +40%',m);}
   if(has('lancer',3)&&dist(p,m)>F.lancerFar)k*=1+F.lancerFarBonus;
   if(has('boxer',3))k*=1+F.boxerStack*stacks();
   if(state.rageCast!=null&&w.damageContext?.castId===state.rageCast)k*=F.swordRageMult;
   return n*k;
  },
  // After a blow landed (crit = it was a critical).
  landed(m,crit){
   if(has('boxer',3)){state.stacks=Math.min(F.boxerMax,stacks()+1);state.stackAt=w.time;
    if(state.stacks===F.boxerMax&&has('boxer',5)&&!state.free){state.free=true;proc('boxer5','หนุมานเต็ม · สกิลถัดไปไม่ติดคูลดาวน์');}}
   if(crit&&has('rogue',3)){w.status.haste=Math.max(w.status.haste??0,F.rogueHaste);proc('rogue3','เงาเร็ว +20%');}
  },
  // Damage we are about to take, after guards and fields, before our shield absorbs it.
  incoming(n){
   if(n<=0)return n;
   for(const ally of tools.allies())if(ally.player.hp>0&&dist(ally.player,p)<=F.acolyteAuraRange&&hasBossSet(ally.world.derived,'acolyte',5)){n*=1-F.acolyteAura;break;}
   if(has('swordsman',5)&&state.rage<F.swordRage){state.rage++;if(state.rage===F.swordRage)proc('sword5','แค้นเต็ม · สกิลถัดไป x2');}
   if(has('swordsman',3)&&(p.hp-n)/p.maxHp<F.swordShieldBelow&&w.time-state.shieldAt>=F.swordShieldEvery){
    state.shieldAt=w.time;tools.shield(tools.me(),p.maxHp*F.swordShield,F.swordShieldFor);proc('sword3','โล่ขุนศึก');
   }
   return n;
  },
  // A role skill just started: s, its slot, its target and cast id.
  cast(index,s,target,castId){
   if(state.free&&has('boxer',5)){state.free=false;state.stacks=0;w.cooldowns[index]=0;proc('boxer5use','ไม่ติดคูลดาวน์!');}
   if(has('swordsman',5)&&state.rage>=F.swordRage){state.rage=0;state.rageCast=castId;proc('sword5use','ระบายแค้น x2');}
   if(has('shaman',3)&&tools.groundKinds.has(s.type)&&target&&Number.isFinite(target.x)&&!['sanctuary','yantra','regen','lifeTree'].includes(s.type)){
    tools.addField({x:target.x,z:target.z,left:F.shamanBurn,tick:0,radius:Math.min(3,s.radius??2.5),power:(s.power??100)*F.shamanBurnShare,kind:'burn',skillId:'set-burn'});proc('shaman3','ไฟอาคมเผาพื้น',target);
   }
   if(has('shaman',5)&&++state.casts%F.shamanEvery===0){
    const foe=target?.hp>0&&target.maxHp?target:tools.enemies().sort((a,b)=>dist(a,p)-dist(b,p))[0];
    if(foe){tools.damage(foe,s.power??100,'spirit');proc('shaman5','วิญญาณนวหรคุณ',foe);}
   }
  },
  // Basic attacks: may force this shot to crit (hunter 5 pieces).
  forceCrit(m){
   if(!has('hunter',5)||state.chainTarget!==m.id||state.chain<F.hunterChain)return false;
   state.chain=0;proc('hunter5','ศรคริแน่นอน',m);return true;
  },
  basicHit(m,amount,hurt){
   if(state.chainTarget===m.id)state.chain++;else{state.chainTarget=m.id;state.chain=1;}
   if(has('hunter',3)&&m.hp>0&&random()<F.hunterExtra){hurt(m,amount);proc('hunter3','ยิงซ้ำ',m);}
   if(has('lancer',5)&&++state.lanceHits>=F.lancerWaveEvery){state.lanceHits=0;
    for(const foe of tools.line(m,F.lancerWaveRange))tools.damage(foe,F.lancerWavePower,'wave');proc('lancer5','คลื่นทวนพญาครุฑ',m);}
  },
  healMultiplier:()=>has('acolyte',2)?1+F.acolyteHeal:1,
  // Healing past full HP: an acolyte with 3 pieces turns the rest into a shield (up to 15% of the target's HP).
  overheal(a,extra){
   if(extra<=0||!has('acolyte',3)||!a.world.roleCombat)return;
   tools.shield(a,Math.min(extra,a.player.maxHp*F.acolyteOverheal),7);proc('acolyte3','ฮีลเกินเป็นโล่',a.player);
  },
 };
}
