// How hard a landed hit feels on screen. Pure numbers: combat results never read this.
// stop: seconds the blow hangs in the air. push: metres the target is shoved. kick: camera shake. flash: seconds of white.
const NORMAL={stop:.035,push:.16,kick:0,flash:.12},HEAVY={stop:.06,push:.28,kick:.5,flash:.16},CRIT={stop:.085,push:.38,kick:1,flash:.18};
export const KILL_STOP=.11,KILL_KICK=1.1;
export function hitFeel({amount,crit=false,maxHp=0,armor=false}){
 if(typeof amount!=='number'||amount<=0)return null; // MISS and blocked hits have nothing to land
 const base=crit?CRIT:maxHp>0&&amount>=maxHp*.15?HEAVY:NORMAL;
 // Bosses wear super armor: they flash, but no shove and no hurt pose.
 return {...base,push:armor?0:base.push,hurt:!armor};
}
// Metres off the target's spot, age seconds after the hit: out fast, trembling while the blow hangs, then back.
export function impactPush(impact,time){
 if(!impact)return 0;
 const age=time-impact.at;if(age<0||age>.36)return 0;
 const push=age<.05?impact.push*age/.05:impact.push*(1-(age-.05)/.31)**2;
 return age<impact.stop?push+Math.sin(age*180)*.04*Math.min(1,impact.push/.16):push;
}
// A finishing blow throws the body back with a small hop before it fades.
export function deathFlight(age,scale=1){
 const q=Math.min(1,Math.max(0,age/.32));
 return {back:.7*scale*(1-(1-q)**2),lift:.45*scale*Math.sin(Math.PI*q)};
}
