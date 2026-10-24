export function partyActions(party,selfId,online=true){
 const member=!!party?.members?.includes(selfId),count=party?.members?.length??0,leader=member&&party.leader===selfId;
 const reason=!online?'offline':!member?'no-party':!leader?'leader-only':count>=5?'full':null;
 return {count,member,leader,canLeave:member&&online,canInvite:reason===null,reason};
}
export function partyRoster(players,{mode='all',party=null,selfId,query=''}={}){
 const search=query.trim().toLocaleLowerCase();return players.filter(p=>(!search||p.name.toLocaleLowerCase().includes(search))&&(mode==='party'?party?.members?.includes(p.id):mode==='invite'?p.id!==selfId&&!p.partyId&&p.connected!==false:true));
}
