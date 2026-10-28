import {className} from './classes.js?v=novice174';
import {bossResultGroups,mergeBossLoot} from './boss-results.js?v=victory197';
const el=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!=null)node.textContent=text;return node;};
export const format=n=>Math.max(0,Math.round(Number(n)||0)).toLocaleString();
// 0.122 one party/solo ranking renderer for the report and the Victory screen: [hint, labels, list] nodes.
export function bossRanking(result,selfId){
 const hint=el('p','boss-result-hint','อันดับรวมปาร์ตี้และผู้เล่นเดี่ยว · กดแถวปาร์ตี้เพื่อดูสมาชิก'),labels=el('div','boss-result-labels');for(const name of ['อันดับ','ปาร์ตี้ / ผู้เล่น','ดาเมจ','สัดส่วน','DPS'])labels.append(el('span','',name));
 function cells(node,row,{member=false,party=false}={}){
  node.style.setProperty('--damage-share',((row.share??0)*100).toFixed(2)+'%');node.dataset.rank=row.rank;
  node.classList.toggle('is-self',member?row.id===selfId:row.members.some(m=>m.id===selfId));
  const who=el('div','boss-result-player'),name=el('strong');
  if(party){const player=el('span','',row.leaderName??row.name);player.dataset.i18nSkip='';name.append(el('span','','ปาร์ตี้ของ '),player);}else{name.textContent=row.name;name.dataset.i18nSkip='';}
  const sub=party?`${row.members.length} คน · กดดูสมาชิก`:className((member?row:row.members[0]).classId)+((member?row:row.members[0]).connected?'':' · ออกจากแผนที่แล้ว');
  const share=el('span','boss-share'),dps=el('span','boss-dps');share.append(el('span','boss-stat-label','สัดส่วน '),((row.share??0)*100).toFixed(1)+'%');dps.append(el('span','boss-stat-label','DPS '),format(row.dps));
  who.append(name,el('small','',sub));node.append(el('b','boss-place',member?String(row.rank):row.rank===1?'♛':String(row.rank)),who,el('b','boss-damage',format(row.damage)),share,dps);
  if(party){const arrow=el('span','boss-party-arrow','⌄');arrow.setAttribute('aria-hidden','true');who.append(arrow);}
 }
 const list=el('ol');for(const group of bossResultGroups(result)){
  const item=el('li','boss-result-entry');item.dataset.kind=group.kind;
  if(group.kind==='party'){
   const details=el('details','boss-party'),summary=el('summary','boss-result-row');cells(summary,group,{party:true});
   const members=el('ol','boss-party-members');members.setAttribute('aria-label','สมาชิกปาร์ตี้');
   for(const member of group.members){const row=el('li','boss-member-row');cells(row,member,{member:true});members.append(row);}details.append(summary,members);item.append(details);
  }else{const row=el('div','boss-result-row');cells(row,group);item.append(row);}
  list.append(item);
 }
 return [hint,labels,list];
}
export function createBossResultsUI({game,container=null,onOpen=null,onClose=null}){
 const css=el('link');css.rel='stylesheet';css.href='boss-results-ui.css?v=victory197';document.head.append(css);
 const dialog=el(container?'section':'dialog');if(container)dialog.hidden=true;dialog.id='boss-results';dialog.setAttribute('aria-labelledby','boss-results-title');
 const header=el('header'),heading=el('div'),kicker=el('small','','BOSS REPORT'),title=el('h2');title.id='boss-results-title';heading.append(kicker,title);
 const close=el('button','boss-close','×');close.type='button';close.setAttribute('aria-label','ปิด');header.append(heading,close);
 const meta=el('p','boss-result-meta'),leader=el('section','boss-result-leader'),table=el('section','boss-result-table'),history=el('select'),foot=el('footer'),note=el('p','','สัดส่วนเทียบดาเมจบอสทั้งหมด · DPS = ดาเมจ ÷ เวลาต่อสู้เดียวกันทุกทีม · รวมพิษและสัตว์เลี้ยง · นับให้ปาร์ตี้ที่อยู่ตอนโจมตี');history.setAttribute('aria-label','ผลการต่อสู้ล่าสุด');table.setAttribute('aria-label','อันดับดาเมจปาร์ตี้และผู้เล่น');foot.append(history,note);dialog.append(header,meta,leader,table,foot);
 (container??document.getElementById('game-shell')??document.body).append(dialog);
 const button=el('button');button.id='menu-boss-result';button.type='button';button.hidden=true;button.setAttribute('aria-label','สรุปดาเมจบอส');const icon=el('i');icon.setAttribute('aria-hidden','true');button.append(icon,el('span','','MVP'));if(!container)document.getElementById('game-menu')?.append(button);
 let results=[],selected=null;
 function draw(){
  const result=results.find(r=>r.encounterId===selected)??results[0];if(!result){title.textContent='ยังไม่มีผลการต่อสู้';meta.textContent='ปราบบอสเพื่อดูอันดับดาเมจ สัดส่วน และ DPS ของผู้ร่วมต่อสู้';leader.hidden=true;table.replaceChildren();history.replaceChildren();return;}leader.hidden=false;
  title.textContent=result.bossName;meta.textContent=`${result.mapName} · CH ${result.channel} · ${result.duration.toFixed(1)} s · ${format(result.total)} DMG`;
  leader.replaceChildren();const top=result.rows[0];if(top){leader.append(el('small','','MVP · ผู้ทำดาเมจสูงสุด'),el('strong','boss-winner',top.name),el('b','',format(top.damage)+' DMG'),el('span','',className(top.classId)));leader.querySelector('.boss-winner').dataset.i18nSkip='';}
  table.replaceChildren(...bossRanking(result,game.world.networkSelfId));history.replaceChildren();for(const r of results){const option=el('option','',r.bossName);option.value=r.encounterId;option.selected=r.encounterId===result.encounterId;history.append(option);}
 }
 const open=encounterId=>{if(typeof encounterId==='string')selected=encounterId;draw();game.clearInput();if(container){dialog.hidden=false;onOpen?.();}else if(!dialog.open)dialog.show();};
 const shut=()=>{if(container){dialog.hidden=true;onClose?.();}else dialog.close();};
 close.onclick=shut;button.onclick=()=>dialog.open?shut():open();history.onchange=()=>{selected=history.value;draw();};if(!container)addEventListener('keydown',e=>{if(dialog.open&&e.key==='Escape'&&!e.defaultPrevented){e.preventDefault();shut();}});
 // 0.122 the Victory screen (victory-ui.js) pops up after a kill; this report keeps the history for the MVP menu and
 // folds in late loot confirmations, but no longer opens itself (it used to stack under the Victory screen).
 game.onEvent(event=>{
  if(event.type==='bossLoot'){results=results.map(r=>mergeBossLoot(r,event));if(!container||!dialog.hidden)draw();return;}
  if(event.type!=='bossResult'||!Array.isArray(event.rows)||results.some(r=>r.encounterId===event.encounterId))return;results.unshift(event);results=results.slice(0,5);selected=event.encounterId;button.hidden=false;
 });
 return {dialog,open,get results(){return results;}};
}
