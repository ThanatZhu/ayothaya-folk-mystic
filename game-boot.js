import {getLoadingScreen} from './loading-screen.js?v=105.0';
const loading=getLoadingScreen();loading.show(new URLSearchParams(location.search).get('map')||'ayutthaya');
import('./viewer-world.js?v=109.5').catch(error=>{console.error(error);loading.fail();});
