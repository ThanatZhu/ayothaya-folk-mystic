// Two-level travel journal. Each action reuses an existing screen or save flow.
const $=id=>document.getElementById(id),click=id=>$(id)?.click();
const paths={
 lotus:'M24 38C8 35 5 25 7 18c8 0 13 6 17 20Zm0 0c16-3 19-13 17-20-8 0-13 6-17 20Zm0-4C12 25 16 12 24 5c8 7 12 20 0 29ZM10 42h28',
 hero:'M16 18a8 8 0 1 0 16 0 8 8 0 0 0-16 0ZM8 41c0-11 7-16 16-16s16 5 16 16M18 29l6 7 6-7',
 skill:'m24 5 5 13 14 6-14 5-5 14-5-14-14-5 14-6ZM8 7v7M5 10h6M39 36v8M35 40h8',
 map:'m5 12 12-5 14 5 12-5v29l-12 5-14-5-12 5V12Zm12-5v29m14-24v29M23 17v7m-3-4h6',
 people:'M7 40v-5c0-8 6-12 13-12s13 4 13 12v5M13 14a7 7 0 1 0 14 0 7 7 0 0 0-14 0Zm22-7a7 7 0 0 1 0 14m3 5c5 2 6 6 6 14',
 chat:'M6 8h36v25H23L12 42v-9H6V8Zm9 10h18m-18 7h12',
 emote:'M8 24a16 16 0 1 0 32 0 16 16 0 0 0-32 0Zm8 5c5 6 11 6 16 0M16 19h1m14 0h1',
 settings:'M24 5v6m0 26v6M5 24h6m26 0h6M10 10l5 5m18 18 5 5M10 38l5-5m18-18 5-5M12 24a12 12 0 1 0 24 0 12 12 0 0 0-24 0Zm7 0a5 5 0 1 0 10 0 5 5 0 0 0-10 0Z',
 door:'M6 42h36M12 42V9l24-4v37M20 15v27m9-18v5',
 eye:'M3 24S12 10 24 10s21 14 21 14-9 14-21 14S3 24 3 24Zm14 0a7 7 0 1 0 14 0 7 7 0 0 0-14 0Z',
 bow:'M20 8a5 5 0 1 0 10 0 5 5 0 0 0-10 0Zm5 10-9 9 8 6-4 10m-4-16-9 4m18-13 7 12 9 3m-17 0 11 10',
 celebrate:'M18 10a6 6 0 1 0 12 0 6 6 0 0 0-12 0ZM24 18v14m-14-20 6 11 8 2 8-2 6-11M24 32l-9 11m9-11 9 11M5 5v6m35-6v6',
 rest:'M18 9a6 6 0 1 0 12 0 6 6 0 0 0-12 0ZM24 17v14m-8-9-6 9h28l-6-9M24 31 8 41h32L24 31Z',
 guard:'M24 5 40 11v13c0 10-16 19-16 19S8 34 8 24V11L24 5Zm0 9v20M15 23h18',
 fullscreen:'M6 18V6h12m12 0h12v12m0 12v12H30m-12 0H6V30'
};
function icon(name){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 48 48');svg.setAttribute('aria-hidden','true');const p=document.createElementNS(svg.namespaceURI,'path');p.setAttribute('d',paths[name]||paths.lotus);svg.append(p);return svg;}
export function createGameMenu({game,account}){
 const shell=$('game-shell');document.body.classList.add('field-hud');
 const nav=document.createElement('nav');nav.id='game-menu';nav.setAttribute('aria-label','เมนูเกม');
 const items=[['menu-profile','hero','ตัวละคร',()=>click('open-account')],['menu-skills','skill','สกิล',()=>dispatchEvent(new CustomEvent('open-skill-window'))],['menu-players','people','ผู้เล่น',()=>click('online-button')],['menu-chat','chat','แชต',()=>{if($('dock-toggle')?.getAttribute('aria-expanded')==='false')click('dock-toggle');document.querySelector('#online-dock [data-channel="room"]')?.click();$('online-text')?.focus();}]];
 for(const [id,art,label,run] of items){const b=document.createElement('button');b.id=id;b.type='button';b.setAttribute('aria-label',label);b.title=label;const emblem=document.createElement('i');emblem.append(icon(art));const text=document.createElement('span');text.textContent=label;b.append(emblem,text);b.onclick=()=>{game.clearInput();run();};nav.append(b);}
 shell.append(nav);
 const dock=$('online-dock'),chat=$('menu-chat');const sync=()=>{chat.hidden=!dock||dock.hidden;};if(dock)new MutationObserver(sync).observe(dock,{attributes:true,attributeFilter:['hidden']});sync();
 const exp=document.querySelector('.experience-bars');exp.setAttribute('aria-label','ค่าประสบการณ์ตัวละครและอาชีพ');shell.append(exp);
 const attack=$('attack');attack.replaceChildren();const blade=document.createElement('img');blade.src='./assets/attack-sword34.svg';blade.alt='';blade.draggable=false;attack.append(blade);const key=document.createElement('small');key.textContent='Space';attack.append(key);
 const title=document.createElement('span');title.className='field-map-title';title.textContent='อยุธยา · CH '+account.serverId.slice(-1);document.querySelector('.mini-panel').prepend(title);
 return nav;
}
