// Top-right menu bar above the minimap (MMO style). Every item opens an existing screen; nothing is a placeholder.
const items=[
 {id:'menu-profile',icon:'☺',label:'ตัวละคร',open:()=>click('open-account')},
 {id:'menu-map',icon:'⌖',label:'แผนที่',key:'M',open:()=>click('mini-open')},
 {id:'menu-players',icon:'♛',label:'ผู้เล่น',open:()=>click('online-button')},
 {id:'menu-chat',icon:'✉',label:'แชต',key:'Enter',open:()=>document.getElementById('online-text')?.focus(),online:true},
 {id:'menu-settings',icon:'⚙',label:'ตั้งค่า',open:()=>click('open-settings')}
];
function click(id){document.getElementById(id)?.click();}
export function createGameMenu(){
 const nav=document.createElement('nav');nav.id='game-menu';nav.setAttribute('aria-label','เมนูเกม');
 for(const item of items){
  const b=document.createElement('button');b.type='button';b.id=item.id;b.title=item.label+(item.key?' ('+item.key+')':'');b.setAttribute('aria-label',b.title);
  const icon=document.createElement('i');icon.setAttribute('aria-hidden','true');icon.textContent=item.icon;const label=document.createElement('span');label.textContent=item.label;
  b.append(icon,label);b.onclick=item.open;if(item.online)b.hidden=true;nav.append(b);
 }
 document.getElementById('game-shell').append(nav);
 // Chat only exists while connected; follow the dock's visibility.
 const chat=nav.querySelector('#menu-chat'),shell=document.getElementById('game-shell');let watched=null;
 const watch=()=>{const dock=document.getElementById('online-dock');if(dock&&dock!==watched){watched=dock;new MutationObserver(()=>{chat.hidden=dock.hidden;}).observe(dock,{attributes:true,attributeFilter:['hidden']});}chat.hidden=!dock||dock.hidden;};
 new MutationObserver(watch).observe(shell,{childList:true});watch();
 return nav;
}
