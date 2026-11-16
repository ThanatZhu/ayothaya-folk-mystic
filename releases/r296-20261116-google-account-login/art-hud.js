// Render atlas cells in the browser. Keep the generated source PNG intact.
const cells={
 portrait:[37,41,295,293],status:[380,76,494,232],map:[891,24,351,344],
 parchment:[13,410,419,225],panel:[438,381,423,267],tray:[859,463,383,126],
 slot:[88,698,254,236],selected:[503,694,247,246],attack:[903,682,292,276],
 button:[24,1036,396,140],pressed:[425,1036,405,140],gold:[840,1036,396,140]
};
const atlas=new Image();atlas.src=new URL('./assets/ui-kit20.png',import.meta.url).href;
try{
 await atlas.decode();
 for(const [name,[x,y,w,h]] of Object.entries(cells)){
  const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
  canvas.getContext('2d').drawImage(atlas,x,y,w,h,0,0,w,h);
  document.documentElement.style.setProperty('--art-'+name,`url("${canvas.toDataURL()}")`);
 }
 document.body.classList.add('art-ready');
}catch(error){console.warn('UI artwork unavailable; using readable fallback panels.',error);}

// A location guide uses existing city travel, not a pretend quest or chat system.
document.getElementById('city-guide').onclick=()=>document.getElementById('open-world').click();
document.getElementById('guide-toggle').onclick=event=>{
 const button=event.currentTarget,collapsed=button.getAttribute('aria-expanded')==='true';
 button.setAttribute('aria-expanded',String(!collapsed));
 document.querySelector('.city-guide').classList.toggle('collapsed',collapsed);
};
