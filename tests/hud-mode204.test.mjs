import test from 'node:test';import assert from 'node:assert/strict';
import {MOBILE_HUD_QUERY,mobileHudMedia,usesMobileHud} from '../hud-mode204.js';
test('wide short phone views use mobile HUD with a mouse, while full desktop views retain desktop HUD',()=>{
 for(const [width,height]of [[844,390],[932,430],[1024,600],[900,900],[568,320]])assert.equal(usesMobileHud({width,height}),true,width+'x'+height);
 for(const [width,height]of [[901,601],[1440,900],[1920,1080]])assert.equal(usesMobileHud({width,height}),false,width+'x'+height);
 assert.equal(usesMobileHud({width:1440,height:900,coarse:true}),true);
});
test('all HUD media subscriptions receive the same live query',()=>{
 const media={matches:true,addEventListener(){}};let seen;
 assert.equal(mobileHudMedia({matchMedia:q=>(seen=q,media)}),media);assert.equal(seen,MOBILE_HUD_QUERY);
 assert.ok(MOBILE_HUD_QUERY.includes('any-pointer:coarse'));assert.ok(MOBILE_HUD_QUERY.includes('max-height:600px'));
});
