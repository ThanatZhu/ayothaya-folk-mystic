// Persist the random reward before delivery. Retry immutable mail IDs after crashes,
// full inboxes or live account leases; mailbox receipts make replay harmless.
export async function drainWarMailbox({boards,save,deliver,canWrite=()=>true}){
 for(const [key,board] of boards){
  if(!key.startsWith('guild-war:')||!Object.keys(board.pending??{}).length)continue;
  if(!canWrite())return;
  await save(key,board);
  for(const [id,gift] of Object.entries(board.pending)){
   if(!canWrite()||boards.get(key)!==board)return;
   try{await deliver(gift);}catch(e){if(e.message!=='character-not-found')continue;}
   // A new round can replace the board while a profile write is in flight.
   // Remove the receipt on the latest board, never overwrite its new active round.
   const current=boards.get(key);if(!current)return;
   if(current.pending?.[id]?.mail.id===gift.mail.id)delete current.pending[id];
   await save(key,current);
  }
 }
}
