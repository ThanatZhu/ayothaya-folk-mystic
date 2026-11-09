import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
// game-ui.css sizes every canvas to 100dvh; the fitting-room hero must set its own height or it stretches over the window (owner screenshot 9 Nov)
test('the fitting-room canvas keeps its square size inside the game',()=>{
 const rule=readFileSync(new URL('../shop-mall.css',import.meta.url),'utf8').match(/\.mall-stage canvas\{[^}]*\}/)[0];
 assert.match(rule,/height:auto/);assert.match(rule,/aspect-ratio:1/);
});
