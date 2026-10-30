// 0.96 weekly duel tournament: every duel between two different accounts scores (win 3, draw 1, loss 0), at most
// pairDaily scored bouts per pair per day so friends cannot farm each other. The week runs Monday 00:00 to Sunday
// 23:59 Thai time; the top three get prizes (claimed on their next login if they are offline at the rollover).
export const ARENA={win:3,draw:1,pairDaily:3,prizes:[
 {coins:10000,items:[{id:'break-guard',count:2},{id:'lek-lai',count:2}]},
 {coins:5000,items:[{id:'break-guard',count:1},{id:'lek-lai',count:1}]},
 {coins:3000,items:[{id:'lek-lai',count:1}]},
]};
const TH=7*36e5,DAY=864e5,WEEK=7*DAY;
export const arenaWeek=now=>Math.floor((now+TH-4*DAY)/WEEK); // 1 Jan 1970 was a Thursday; +4 days lands on Monday
export const arenaDay=now=>Math.floor((now+TH)/DAY);
export const arenaEnds=now=>(arenaWeek(now)+1)*WEEK+4*DAY-TH;
export const byPoints=(a,b)=>b[1].points-a[1].points||b[1].wins-a[1].wins||a[1].t-b[1].t;
