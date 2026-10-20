import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {walkable,moveBody,groundHeight,findPath} from '../combat-core.js';

const catalog=JSON.parse(fs.readFileSync(new URL('../maps/world.json',import.meta.url),'utf8'));
const nav=catalog.maps.find(m=>m.id==='ayutthaya').nav;
const walk=(body,dx,dz,steps)=>{for(let i=0;i<steps;i++)moveBody(body,dx,dz,nav);return body;};

test('the sala stairs rise smoothly from the yard to the 2.55 m deck',()=>{
 let last=groundHeight(nav,0,-33);assert.equal(last,0);
 for(let z=-33.1;z>=-41;z-=.1){
  const h=groundHeight(nav,0,z);
  assert.ok(h>=last-1e-9&&h-last<.06,`no jump at z ${z.toFixed(1)}: ${last} -> ${h}`);last=h;
 }
 assert.ok(Math.abs(groundHeight(nav,0,-47)-2.55)<.01&&Math.abs(groundHeight(nav,5,-50)-2.55)<.01,'deck height, edges included');
});

test('walk up the stairs, around the deck, into the rails, and back down',()=>{
 const body=walk({x:0,z:-32},0,-.2,120);
 assert.ok(body.z<-53&&groundHeight(nav,body.x,body.z)>2.5,'reached the back of the deck');
 walk(body,0,.2,35);walk(body,.2,0,60);assert.ok(body.x>4.5&&body.x<5.5,'east rail stops the walk at '+body.x);
 walk(body,-.2,0,120);assert.ok(body.x<-4.5&&body.x>-5.5,'west rail stops the walk at '+body.x);
 walk(body,0,.2,120);assert.ok(body.z<-39.5,'front rail holds off the stairs: '+body.z);
 walk(body,.2,0,26);walk(body,0,.2,60);
 assert.ok(body.z>-34&&groundHeight(nav,body.x,body.z)===0,'came back down to the yard at '+body.x+','+body.z);
 for(const [x,z] of [[0,-55],[-6.3,-47],[6.3,-47],[-3,-39],[2,-36]])assert.ok(!walkable(x,z,.28,nav),`rail/stringer at ${x},${z} blocks`);
});

test('auto-walk routes up the front stairs onto the deck',()=>{
 const path=findPath({x:12,z:-30},{x:0,z:-48},nav);
 assert.ok(path.length,'path found');
 assert.ok(path.filter(p=>p.z<-34.5&&p.z>-39.5).every(p=>Math.abs(p.x)<1.6),'enters through the stair opening');
});
