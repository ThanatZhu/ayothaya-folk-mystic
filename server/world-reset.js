import {randomUUID,timingSafeEqual} from 'node:crypto';
import {resetSummary,resetPending} from './world-reset-store.js';
export const RESET_PHRASE='RESET CBT';
const publicJob=j=>j?Object.fromEntries(['id','status','phase','startedAt','updatedAt','completedAt','summary','backedUp','deleted','error'].map(k=>[k,j[k]??null])):null;
export class WorldReset{
 constructor({repository,quiesce,finish,online=()=>0,now=()=>Date.now(),log=console.info}){Object.assign(this,{repository,quiesce,finish,online,now,log});this.job=null;this.challenges=new Map();this.running=null;}
 async init(){this.job=await this.repository.state();return this;}
 get maintenance(){return !!this.running||!!resetPending(this.job);}
 status(){return {supported:true,maintenance:this.maintenance,job:publicJob(this.job)};}
 async preview(actor){
  if(this.running)throw Error('reset-busy');
  const summary=resetSummary(await this.repository.inventory()),token=randomUUID()+randomUUID(),id=resetPending(this.job)?this.job.id:randomUUID(),expiresAt=this.now()+5*60000;
  this.challenges.clear();this.challenges.set(token,{actor,id,expiresAt});
  return {challenge:token,expiresAt,summary,online:this.online(),resume:!!resetPending(this.job),backupId:resetPending(this.job)?id:null,phrase:RESET_PHRASE};
 }
 execute(actor,{challenge,confirmation,acknowledge}={}){
  const c=this.challenges.get(challenge);
  if(!c||c.actor!==actor||c.expiresAt<=this.now())throw Error('reset-challenge-expired');
  const expected=Buffer.from(RESET_PHRASE),actual=Buffer.from(String(confirmation??''));
  if(acknowledge!==true||actual.length!==expected.length||!timingSafeEqual(actual,expected))throw Error('reset-confirmation');
  if(this.running){if(this.job.id!==c.id)throw Error('reset-busy');return this.status();}
  // Consume the challenge before any async work. A double request cannot start a second wipe.
  this.challenges.delete(challenge);
  this.job=resetPending(this.job)?{...this.job,status:'preparing',error:null}:{id:c.id,status:'preparing',phase:'quiescing',actor,startedAt:this.now(),updatedAt:this.now(),backedUp:0,deleted:0,summary:null};
  this.running=this.run().finally(()=>{this.running=null;});this.running.catch(()=>{});return this.status();
 }
 async mark(fields){Object.assign(this.job,fields,{updatedAt:this.now()});await this.repository.mark({...this.job});}
 async run(){
  try{
   await this.mark({status:'preparing',phase:'quiescing'});this.log('world-reset-start',this.job.actor,this.job.id);
   await this.quiesce();
   for(let pass=0;pass<3;pass++){
    const docs=await this.repository.inventory();if(!this.job.summary)this.job.summary=resetSummary(docs);
    if(!docs.length)break;
    await this.mark({status:'running',phase:'backup'});
    const backedUp=await this.repository.archive(this.job,docs);
    // No delete is reachable before all targets in this pass have durable backups.
    await this.mark({phase:'deleting',backedUp});await this.repository.remove(this.job,docs);
    await this.mark({deleted:this.job.deleted+docs.length});
   }
   if((await this.repository.inventory()).length)throw Error('reset-data-changing');
   await this.finish();await this.mark({status:'completed',phase:'completed',error:null,completedAt:this.now()});
   this.log('world-reset-complete',this.job.actor,this.job.id,this.job.deleted);
  }catch(e){
   try{await this.mark({status:'failed',error:e.message,phase:this.job.phase});}catch{Object.assign(this.job,{status:'failed',error:e.message});}
   this.log('world-reset-failed',this.job.actor,this.job.id,e.message);
  }
 }
}
