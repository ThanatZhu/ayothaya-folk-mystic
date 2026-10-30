// Daily login reward (0.48): once per Thai calendar day, a 7-day cycle; missing a day restarts at day 1.
export const DAILY=[{coins:100,items:[]},{coins:0,items:[{id:'hp-small',count:3}]},{coins:200,items:[]},{coins:0,items:[{id:'mp-small',count:3}]},
 {coins:300,items:[{id:'green-herb',count:2}]},{coins:0,items:[{id:'iron-ore',count:3}]},{coins:500,items:[{id:'lek-lai',count:1}]}];
export const thaiDay=ms=>new Date(ms+7*3600e3).toISOString().slice(0,10);
export function claimDaily(daily,now){
 const today=thaiDay(now),last=typeof daily?.day==='string'?daily.day:null,streak=Number.isInteger(daily?.streak)?daily.streak:0;
 if(last===today)return null;
 const next=last===thaiDay(now-864e5)?streak%DAILY.length+1:1;
 return {daily:{day:today,streak:next},reward:DAILY[next-1],streak:next};
}
