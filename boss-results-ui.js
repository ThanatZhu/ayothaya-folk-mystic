import {className} from './classes.js?v=112.1';
const el=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!=null)node.textContent=text;return node;};
const format=n=>Math.max(0,Math.round(Number(n)||0)).toLocaleString();
export function createBossResultsUI({game}){
 const css=el('link');css.rel='stylesheet';css.href='boss-results-ui.css?v=129';document.head.append(css);
 const dialog=el('dialog');dialog.id='boss-results';dialog.setAttribute('aria-labelledby','boss-results-title');
 const header=el('header'),heading=el('div'),kicker=el('small','','BOSS REPORT'),title=el('h2');title.id='boss-results-title';heading.append(kicker,title);
 const close=el('button','boss-close','×');close.type='button';close.setAttribute('aria-label','ปิด');header.append(heading,close);
 const meta=el('p','boss-result-meta'),leader=el('section','boss-result-leader'),table=el('section','boss-result-table'),history=el('select'),foot=el('footer'),note=el('p','','นับดาเมจที่ลด HP จริง รวมพิษและสัตว์เลี้ยง · DPS ใช้เวลาตั้งแต่โจมตีครั้งแรกจนบอสล้ม');history.setAttribute('aria-label','ผลการต่อสู้ล่าสุด');foot.append(history,note);dialog.append(header,meta,leader,table,foot);
 (document.getElementById('game-shell')??document.body).append(dialog);
 const button=el('button');button.id='menu-boss-result';button.type='button';button.hidden=true;button.setAttribute('aria-label','สรุปดาเมจบอส');button.append(el('i','','♛'),el('span','','MVP'));document.getElementById('game-menu')?.append(button);
 let results=[],selected=null;
 function draw(){
  const result=results.find(r=>r.encounterId===selected)??results[0];if(!result)return;
  title.textContent=result.bossName;meta.textContent=`${result.mapName} · CH ${result.channel} · ${result.duration.toFixed(1)} s · ${format(result.total)} DMG`;
  leader.replaceChildren();const top=result.rows[0];if(top){leader.append(el('small','','ผู้ทำดาเมจสูงสุด'),el('strong','boss-winner',top.name),el('b','',format(top.damage)+' DMG'),el('span','',className(top.classId)));leader.querySelector('.boss-winner').dataset.i18nSkip='';}
  table.replaceChildren();const labels=el('div','boss-result-labels');for(const name of ['อันดับ','ผู้เล่น','ดาเมจ','สัดส่วน','DPS'])labels.append(el('span','',name));table.append(labels);
  const list=el('ol');for(const row of result.rows){const item=el('li','boss-result-row');item.style.setProperty('--damage-share',(row.share*100).toFixed(2)+'%');item.dataset.rank=row.rank;item.classList.toggle('is-self',row.id===game.world.networkSelfId);
   const who=el('div','boss-result-player'),name=el('strong','',row.name);name.dataset.i18nSkip='';who.append(name,el('small','',className(row.classId)+(row.connected?'':' · ออกจากแผนที่แล้ว')));item.append(el('b','boss-place',row.rank===1?'♛':String(row.rank)),who,el('b','',format(row.damage)),el('span','',(row.share*100).toFixed(1)+'%'),el('span','',format(row.dps)));list.append(item);
  }table.append(list);history.replaceChildren();for(const r of results){const option=el('option','',r.bossName);option.value=r.encounterId;option.selected=r.encounterId===result.encounterId;history.append(option);}
 }
 const open=()=>{draw();game.clearInput();if(!dialog.open)dialog.show();};
 close.onclick=()=>dialog.close();button.onclick=()=>dialog.open?dialog.close():open();history.onchange=()=>{selected=history.value;draw();};addEventListener('keydown',e=>{if(dialog.open&&e.key==='Escape'&&!e.defaultPrevented){e.preventDefault();dialog.close();}});
 game.onEvent(event=>{if(event.type!=='bossResult'||!Array.isArray(event.rows)||results.some(r=>r.encounterId===event.encounterId))return;results.unshift(event);results=results.slice(0,5);selected=event.encounterId;button.hidden=false;open();});
 return {dialog,get results(){return results;}};
}
