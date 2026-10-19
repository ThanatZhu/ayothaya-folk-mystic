import {getLoadingScreen} from './loading-screen.js?v=39';
const loading=getLoadingScreen();loading.show(new URLSearchParams(location.search).get('map')||'ayutthaya');
import('./viewer-world.js?v=87').catch(error=>{console.error(error);loading.fail();});
