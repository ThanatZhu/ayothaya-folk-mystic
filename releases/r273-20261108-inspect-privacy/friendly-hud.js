const $=id=>document.getElementById(id);
const settings=$('settings-panel');
$('close-settings').onclick=()=>settings.close();
settings.addEventListener('close',()=>$('open-account').focus());
$('overview').addEventListener('click',()=>settings.close());
$('mini-open').onclick=()=>$('open-world').click();
let bank=0;
$('skill-bank').onclick=()=>{
 bank=1-bank;document.body.dataset.skillBank=String(bank);
 $('skill-bank').textContent=bank?'สกิล 6–0 ⇄':'สกิล 1–5 ⇄';
 $('skill-bank').setAttribute('aria-label',bank?'แสดงสกิล 1 ถึง 5':'แสดงสกิล 6 ถึง 0');
};
// Keep the selected bank predictable after a resize, while desktop retains all ten slots.
document.body.dataset.skillBank='0';

for(const b of document.querySelectorAll('[data-emote]'))b.onclick=()=>{settings.close();dispatchEvent(new CustomEvent('hero-emote',{detail:b.dataset.emote}));};
