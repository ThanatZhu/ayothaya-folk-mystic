import {getLoadingScreen} from './loading-screen.js?v=39';
const loading=getLoadingScreen();loading.show(new URLSearchParams(location.search).get('map')||'ayutthaya');
import('./viewer-world.js?v=life100-preview').catch(error=>{console.error(error);loading.fail();});
