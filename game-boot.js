import {getLoadingScreen} from './loading-screen.js?v=105.0';
const loading=getLoadingScreen();loading.show(new URLSearchParams(location.search).get('map')||'ayutthaya');
import('./viewer-world.js?v=106.6-lablae').catch(error=>{console.error(error);loading.fail();});
