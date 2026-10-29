import './jade-surfaces222.js?v=surfaces222';
import {getLoadingScreen} from './loading-screen.js?v=105.0';
const loading=getLoadingScreen();loading.show(new URLSearchParams(location.search).get('map')||'ayutthaya');
import('./viewer-world.js?v=farm223-gait220').catch(error=>{console.error(error);loading.fail();});
