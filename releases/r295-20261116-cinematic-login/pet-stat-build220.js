// One character-owned selection shared by S companions. Numeric bonuses are never accepted from clients.
export const PET_BUILD_STATS=Object.freeze(['str','agi','vit','int','dex','luk']);
export const PET_BUILD_COMBAT_SECONDS=6;
export const PET_BUILD_ERRORS={'bad-pet-build':'เลือกสเตตัส 3 ค่าที่ไม่ซ้ำกัน','pet-build-no-s':'ต้องมีสัตว์เลี้ยงระดับ S ก่อนตั้งสเตตัส','pet-build-combat':'ตั้งสเตตัสได้เมื่อพ้นการต่อสู้และปิด AUTO ต่อสู้','pet-build-unavailable':'ยังตั้งสเตตัสสัตว์เลี้ยงตอนนี้ไม่ได้'};
export function normalizePetBuild(raw){
 const stats=raw?.stats;if(!Array.isArray(stats)||stats.length!==3||new Set(stats).size!==3||stats.some(k=>!PET_BUILD_STATS.includes(k)))return null;
 return {stats:[...stats]};
}
export function recommendPetBuild(raw){
 return {stats:PET_BUILD_STATS.map((stat,index)=>({stat,index,value:Number.isSafeInteger(raw?.[stat])?Math.max(1,Math.min(99,raw[stat])):1})).sort((a,b)=>b.value-a.value||a.index-b.index).slice(0,3).map(s=>s.stat)};
}
export function petWithBuild(pet,raw){
 const build=normalizePetBuild(raw);if(pet.tier!=='S'||!build)return pet;
 const budget=Object.values(pet.bonus).reduce((n,v)=>n+v,0),weights=[.5,.3,.2],values=weights.map(w=>Math.floor(budget*w));
 let remainder=budget-values.reduce((n,v)=>n+v,0);
 const order=weights.map((w,i)=>({i,f:budget*w-values[i]})).sort((a,b)=>b.f-a.f||a.i-b.i);
 for(let i=0;i<remainder;i++)values[order[i%3].i]++;
 return {...pet,baseBonus:pet.bonus,bonus:Object.fromEntries(build.stats.map((k,i)=>[k,values[i]])),statBuild:build};
}
export function petBuildStatus(peer,time){
 const w=peer.world;
 if(peer.suspended||peer.observer||!w||w.player.hp<=0)return {blocked:true,reason:'pet-build-unavailable',remaining:0};
 const queued=w.events?.some(e=>['damage','playerHit','cast','petSkill'].includes(e.type));
 const remaining=Math.max(0,Math.ceil(PET_BUILD_COMBAT_SECONDS-(time-(peer.petBuildCombatAt??-Infinity))));
 if(w.auto||peer.duel||w.rivals?.length||w.roleCombat?.state.pending||w.basicPending||w.legacyPending||queued||remaining)return {blocked:true,reason:'pet-build-combat',remaining:queued?PET_BUILD_COMBAT_SECONDS:remaining};
 return {blocked:false,reason:null,remaining:0};
}
