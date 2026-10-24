import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeHudLayout,hudPixelPosition,hudRelativePosition} from '../mobile-hud-layout-model.js';
test('HUD preferences keep finite known positions and separate orientations',()=>{
 const p=normalizeHudLayout({landscape:{'skill-1':{x:2,y:-1},attack:{x:NaN,y:.5},unknown:{x:.1,y:.1}},portrait:{joystick:{x:.2,y:.8}}});
 assert.deepEqual(p.landscape,{'skill-1':{x:1,y:0}});assert.deepEqual(p.portrait,{joystick:{x:.2,y:.8}});assert.deepEqual(normalizeHudLayout(null),{v:1,landscape:{},portrait:{}});
});
test('HUD centers scale between resolutions while the whole control stays reachable',()=>{
 const p=hudRelativePosition({x:100,y:200,width:44,height:44},{width:400,height:800});const scaled=hudPixelPosition(p,{width:800,height:1600},{width:44,height:44});assert.ok(Math.abs(scaled.x-222)<1e-8&&Math.abs(scaled.y-422)<1e-8);
 assert.deepEqual(hudPixelPosition({x:1,y:0},{width:320,height:568},{width:88,height:88}),{x:228,y:4});
});
