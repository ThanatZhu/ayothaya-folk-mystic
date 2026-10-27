// 0.119 settings window: the controls other modules add to the profile card (sound, graphics, camera, controls,
// account), grouped into titled sections. It only moves existing elements, so their handlers stay; it runs on every
// open because some sections mount late. Blocking save/error screens are left as they are.
const $=id=>document.getElementById(id);
// [id, title, icon, column]: two independent columns, so a tall section never stretches its neighbour
const SECTIONS=[['sound','เสียง','♪',0],['view','ภาพและกล้อง','◐',1],['play','การเล่น','✦',0],['account','ตัวละครและบัญชี','⌂',0]];
function arrange(){
 const panel=$('account-panel'),card=panel?.querySelector('.account-card');
 if(!card||panel.dataset.blocking==='true')return;
 card.classList.add('settings-v2');
 let grid=card.querySelector('.settings-grid');
 if(!grid){
  grid=document.createElement('div');grid.className='settings-grid';$('account-message').after(grid);
  const cols=[0,1].map(()=>{const c=document.createElement('div');c.className='settings-col';grid.append(c);return c;});
  for(const [id,title,icon,col] of SECTIONS){const s=document.createElement('section');s.className='settings-section';s.dataset.section=id;s.innerHTML=`<h2><i aria-hidden="true">${icon}</i>${title}</h2>`;cols[col].append(s);}
 }
 const put=(id,...items)=>{const s=grid.querySelector(`[data-section="${id}"]`);for(const el of items)if(el&&el.parentElement!==s)s.append(el);};
 const perf=card.querySelector('.perf-settings');
 put('sound',$('audio-settings'));
 put('view',card.querySelector('.camera-tilt'),perf);
 put('play',perf?.querySelector('[data-lang-toggle]')?.closest('label'),$('open-controls'),card.querySelector('.account-guide'));
 put('account',$('return-lobby'),$('link-account'),$('logout-account'));
 // "back to the game" closes the card, full width, with the save note under it
 for(const el of [$('close-account'),card.querySelector('.minor')])if(el)card.append(el);
 for(const s of grid.querySelectorAll('.settings-section'))s.hidden=![...s.children].some(c=>c.tagName!=='H2'&&!c.hidden);
}
addEventListener('hud-panel-opening',e=>{if(e.detail==='account-panel')setTimeout(arrange,0);});
const panel=$('account-panel');
if(panel)new MutationObserver(()=>{if(!panel.hidden)arrange();}).observe(panel,{attributes:true,attributeFilter:['hidden','data-blocking']});
arrange();
