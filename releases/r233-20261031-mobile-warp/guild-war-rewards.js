import {CONQUEST_SHARD,conquestCount} from './rainbow-crafting.js';
import {composeMail} from './mailbox.js';
export const warBoardKey=serverId=>'guild-war:'+serverId;
export function warRound(board,start,holder=null){
 const id=String(start);if(board?.active?.id===id)return board.active;
 return {id,start,holder,guilds:{},participants:{}};
}
export function warContribution(round,player,guild,{damage=0,capture=false,kill=false}={}){
 if(!round||!guild||player.observer||player.suspended)return;
 if(round.participants[player.key]?.guildId&&round.participants[player.key].guildId!==guild.id)return;
 const g=round.guilds[guild.id]??={id:guild.id,name:guild.name,damage:0,captures:0,kills:0};
 g.damage+=Math.max(0,Math.round(damage));if(capture)g.captures++;if(kill)g.kills++;
 // The first guild represented in a round owns this character's participation.
 round.participants[player.key]??={uid:player.uid,slotId:player.slotId,serverId:player.serverId,key:player.key,name:player.character.name,guildId:guild.id};
}
export function warRankings(round){
 if(!round)return [];
 return Object.values(round.guilds).filter(g=>g.id===round.holder||g.damage>0).sort((a,b)=>(b.id===round.holder)-(a.id===round.holder)||b.damage-a.damage||b.captures-a.captures||b.kills-a.kills||a.id.localeCompare(b.id)).map((g,i)=>({...g,rank:i+1}));
}
export function finishWarRound(board,round,serverId,now,random=Math.random){
 board??={};if((board.finished??[]).includes(round.id))return {board,changed:false};
 const ranks=warRankings(round).slice(0,3),byGuild=new Map(ranks.map(g=>[g.id,g])),pending={...(board.pending??{})};
 const participants=Object.values(round.participants).filter(p=>byGuild.has(p.guildId)).sort((a,b)=>a.key.localeCompare(b.key));
 for(const [i,p] of participants.entries()){
  const g=byGuild.get(p.guildId),id=`gwar-${serverId}-${round.id}-${i}`,count=conquestCount(random);
  const mail=composeMail({id,title:'รางวัลกิลด์วอร์ อันดับ '+g.rank,body:`กิลด์ ${g.name} ได้อันดับ ${g.rank} · รางวัลสำหรับสมาชิกที่ร่วมรบ: เศษตราพิชิตอโยธยา ${count} ชิ้น`,sender:'กองรางวัลกิลด์วอร์',serverId,attachments:{items:[{id:CONQUEST_SHARD,count}]}},now);
  pending[id]={...p,rank:g.rank,mail};
 }
 return {board:{...board,active:null,last:{id:round.id,at:now,rankings:ranks},pending,finished:[...(board.finished??[]),round.id].slice(-20)},changed:true};
}
