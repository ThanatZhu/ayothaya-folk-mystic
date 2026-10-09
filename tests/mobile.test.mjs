import test from 'node:test';
import assert from 'node:assert/strict';
import {needsLandscape} from '../mobile-layout.js';
test('portrait phones and touch tablets are blocked, including wider tablets',()=>{
 for(const [width,height,coarse,touchPoints] of [[390,844,false,0],[430,932,true,5],[820,1180,true,5],[1024,1366,false,5]])assert.equal(needsLandscape({width,height,coarse,touchPoints}),true);
});
test('landscape phones can play, while desktop portrait windows remain usable',()=>{
 for(const config of [{width:844,height:390,coarse:true},{width:667,height:375,touchPoints:5},{width:1180,height:820,coarse:true},{width:1000,height:1200},{width:1920,height:1080}])assert.equal(needsLandscape(config),false);
});
