import {getLoadingScreen} from './loading-screen.js?v=105.0';
const loading=getLoadingScreen();loading.show(new URLSearchParams(location.search).get('map')||'ayutthaya');
import('./viewer-world.js?v=112.6').catch(error=>{console.error(error);loading.fail();});
