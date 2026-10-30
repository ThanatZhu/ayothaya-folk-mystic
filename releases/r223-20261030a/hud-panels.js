// Nonmodal HUD panels: one open utility window, world/input remain live.
export function openHudPanel(panel,{modal=true}={}){
 dispatchEvent(new CustomEvent('hud-panel-opening',{detail:panel.id}));
 for(const other of document.querySelectorAll('dialog[data-hud-panel][open]'))if(other!==panel)other.close();
 panel.dataset.hudPanel='true';
 if(!panel.open){if(modal&&document.body.classList.contains('mobile-play'))panel.showModal();else panel.show();}
}
addEventListener('keydown',e=>{
 if(e.code!=='Escape'||e.defaultPrevented)return;
 const panel=document.querySelector('dialog[data-hud-panel][open]');
 if(panel){e.preventDefault();panel.close();}
});
