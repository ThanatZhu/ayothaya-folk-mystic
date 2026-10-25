import test from 'node:test';
import assert from 'node:assert/strict';
import {storyReady} from '../story-navigation173.js';
import {resolveMap} from '../world-state.js';

test('an expected online session cannot use offline or default quests before its first snapshot',()=>{
 const game={world:{},online:false,networkExpected:true,networkStatus:null};
 assert.equal(storyReady(game),false);
 game.online=true;game.networkStatus='online';assert.equal(storyReady(game),false);
 game.world.story={v:3,quest:4,step:0,count:4};assert.equal(storyReady(game),true);
 game.networkStatus='reconnecting';assert.equal(storyReady(game),false);
 game.networkStatus='error';assert.equal(storyReady(game),false);
});
test('cloud boot and map redirects wait for a matching authoritative story while offline guests still work',()=>{
 const offline={world:{},online:false};assert.equal(storyReady(offline,{cloud:false}),true);
 assert.equal(storyReady(offline,{cloud:true}),false);
 const game={world:{story:{v:3,quest:4},networkMapId:'rice-fields'},online:true,networkStatus:'online'};
 assert.equal(storyReady(game,{},'ayutthaya'),false);
 assert.equal(storyReady(game,{},'rice-fields'),true);
});
test('the navigation destination wins over a stale saved map; absent or invalid destinations fall back safely',()=>{
 const catalog={capital:'ayutthaya',maps:[{id:'ayutthaya'},{id:'rice-fields'},{id:'old-orchard'}]};
 for(const saved of catalog.maps)for(const requested of catalog.maps)assert.equal(resolveMap(catalog,requested.id,saved.id).id,requested.id);
 assert.equal(resolveMap(catalog,null,'rice-fields').id,'rice-fields');
 assert.equal(resolveMap(catalog,'not-a-map','old-orchard').id,'old-orchard');
 assert.equal(resolveMap(catalog,'not-a-map','also-invalid').id,'ayutthaya');
});
