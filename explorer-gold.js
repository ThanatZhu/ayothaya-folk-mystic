// Pure helper for the explorer's gold section. Old servers send no `gold`, so null keeps the section hidden.
export function goldStats(view){
 const g=view?.gold;if(!g||typeof g!=='object')return null;
 const t=g.days?.at(-1);
 return {held:g.held??0,holders:g.characters??0,mailGold:g.pending??0,shops:Number.isFinite(g.shops)?g.shops:null,todayIn:t?.totalIn??0,todayOut:t?.totalOut??0};
}
