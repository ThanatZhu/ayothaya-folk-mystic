import {getLoadingScreen} from './loading-screen.js?v=39';
import {LOADING_THEMES} from './loading-theme.js?v=39';
const loading=getLoadingScreen(),select=document.querySelector('select');let step=2;
const requested=new URLSearchParams(location.search).get('map');select.value=Object.hasOwn(LOADING_THEMES,requested)?requested:'ayutthaya';
function show(){loading.show(select.value,{watchdog:false});loading.stage(step);document.querySelector('#journey-loading').removeAttribute('aria-modal');history.replaceState(null,'','?map='+select.value);}
select.onchange=()=>{step=2;show();};document.getElementById('next').onclick=()=>{step=(step+1)%7;show();};document.getElementById('error').onclick=()=>loading.fail();show();
