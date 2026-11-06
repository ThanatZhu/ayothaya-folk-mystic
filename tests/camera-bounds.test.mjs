import test from 'node:test';
import assert from 'node:assert/strict';
import {cameraFocus} from '../camera-bounds.js';

const bounds={x:-70,z:-70,w:140,d:140},view={halfWidth:10,halfDepth:10,azimuth:0,margin:1};
test('the camera follows freely inside the map and stops at its edge',()=>{
 assert.deepEqual(cameraFocus(5,-3,bounds,view),{x:5,z:-3});
 assert.deepEqual(cameraFocus(69,-69,bounds,view),{x:60,z:-60});
});
test('a view wider than the map stays on its centre, and maps without bounds are left alone',()=>{
 assert.deepEqual(cameraFocus(30,30,bounds,{...view,halfWidth:200,halfDepth:200}),{x:0,z:0});
 assert.deepEqual(cameraFocus(99,99,null,view),{x:99,z:99});
});
