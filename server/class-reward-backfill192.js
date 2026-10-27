import {grantClassReward,classRewardEligible,classRewardDelivered} from '../class-reward192.js';

export const initialClassRewardState=()=>({version:192,after:null,scanned:0,eligible:0,delivered:0,scanComplete:false,pending:[]});
// Cursor is committed after each page. Replaying a page after a crash is safe because the
// reward's fixed mail ID survives both claims and deletions in the character's private inbox.
export async function classRewardBackfill({store,deliver,canWrite=()=>true,pageSize=100}){
 const state=structuredClone(await store.loadClassRewardState()??initialClassRewardState());
 if(state.scanComplete&&!state.pending.length)return state;
 const pending=state.pending.splice(0,25);
 async function attempt(row){
  if(!canWrite())throw Error('authority-lost');
  try{await deliver(row,grantClassReward);return true;}
  catch(e){if(e.message==='character-not-found')return false;if(e.message==='authority-lost')throw e;state.pending.push({uid:row.uid,slotId:row.slotId,serverId:row.serverId??row.record?.serverId??'server-1'});return false;}
 }
 for(const row of pending)if(await attempt(row))state.delivered++;
 if(!state.scanComplete){
  const page=await store.classRewardPage({after:state.after,limit:pageSize});
  for(const row of page.rows){
   if(!canWrite())throw Error('authority-lost');
   state.scanned++;
   if(!classRewardEligible(row.record))continue;
   state.eligible++;
   if(classRewardDelivered(row.record)||await attempt(row))state.delivered++;
  }
  state.after=page.after;state.scanComplete=page.done;
 }
 if(!canWrite())throw Error('authority-lost');
 if(state.scanComplete&&!state.pending.length)state.completedAt=Date.now();
 await store.saveClassRewardState(state);return state;
}
