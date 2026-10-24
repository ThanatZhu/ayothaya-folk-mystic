import test from 'node:test';
import assert from 'node:assert/strict';
import {realmAnnouncement,createAnnouncementQueue} from '../announcement-state.js';
import {characterHead} from '../character-label.js';
import * as THREE from '../vendor/build/three.module.js';

test('only server announcements, including refine world chat, enter the ribbon',()=>{
 for(const channel of ['world','system'])assert.equal(realmAnnouncement({actor:null,name:'ประกาศ',channel,text:'boss'}),true);
 for(const message of [{actor:'player',name:'ประกาศ',channel:'world',text:'fake'},{name:'ประกาศ',channel:'system',text:'local'},{actor:null,name:'ระบบ',channel:'system',text:'EXP'},{actor:null,name:'ประกาศ',channel:'room',text:'room'}])assert.equal(realmAnnouncement(message),false);
});
test('flood is bounded, duplicate deliveries are suppressed, stale weather is replaced',()=>{
 let time=0;const queue=createAnnouncementQueue({limit:3,now:()=>time});
 assert.equal(queue.push({id:'1',text:'refine'}),true);assert.equal(queue.push({id:'1',text:'refine'}),false);
 queue.push({text:'rain',kind:'weather'});queue.push({text:'boss'});queue.push({text:'sun',kind:'weather'});
 assert.deepEqual([queue.next().text,queue.next().text,queue.next().text],['refine','boss','sun']);assert.equal(queue.next(),null);
 for(let i=0;i<100;i++)queue.push({id:'f'+i,text:String(i)});
 assert.equal(queue.size,3);assert.equal(queue.next().text,'97');
 time=61000;assert.equal(queue.push({id:'1',text:'refine'}),true);assert.equal(queue.push({text:'  '}),false);
});
test('head anchor stays over the camera-facing body across camera angles, heights and root motion',()=>{
 const camera=new THREE.PerspectiveCamera(45,1.6,.1,100),sprite=new THREE.Object3D();sprite.scale.set(2.1,2.1,1);
 for(const yaw of [0,.7,1.8,3.2])for(const y of [0,2.5]){
  sprite.position.set(3.2,y,-1.4);camera.position.set(3+Math.sin(yaw)*10,10,-1+Math.cos(yaw)*10);camera.lookAt(3,1,-1);camera.updateMatrixWorld();
  const head=characterHead(sprite,camera),p=new THREE.Vector3(head.x,head.y,head.z).project(camera),feet=sprite.position.clone().project(camera);
  assert.ok(Math.abs(p.x-feet.x)<1e-12);assert.ok(p.y>feet.y);
 }
});
