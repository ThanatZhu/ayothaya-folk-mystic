import test from 'node:test';
import assert from 'node:assert/strict';
import {planPartyLayout} from '../party-layout.js';
import {partyActions,partyRoster} from '../party-ui-state.js';
const rect=(left,top,width,height)=>({left,top,width,height,right:left+width,bottom:top+height});
const overlap=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
test('party starts after the real profile, wrapped buffs and online line, rather than a fixed top offset',()=>{
 const profile=rect(12,8,268,90),buffs=rect(12,108,210,58),online=rect(12,174,274,30);
 const plan=planPartyLayout({viewport:{width:1440,height:900},profile,above:[buffs,online],count:5});assert.equal(plan.top,212);assert.equal(plan.compact,false);assert.equal(plan.membersHeight,170);
});
test('compact party and fallback menu leave no panel over movement, chat, skills or another HUD',()=>{
 for(const [width,height,touch] of [[1920,1080,false],[1440,900,false],[1024,768,false],[844,390,true],[667,375,true],[568,320,true],[390,844,true]])for(const buffsHeight of [0,28,58,116,174]){
  const profile=rect(8,8,touch?190:268,touch?62:90),buffs=rect(8,profile.bottom+4,Math.min(300,width-16),buffsHeight),online=!touch?rect(8,buffs.bottom+8,280,30):null;
  const obstacles=[rect(8,height-124,108,108),rect(124,height-72,Math.max(0,width-400),56),rect(Math.max(140,width-264),height-210,250,200),rect(width-142,8,134,110)];
  const plan=planPartyLayout({viewport:{width,height},profile,above:[buffs,...online?[online]:[]],obstacles,count:5,touch});if(plan.hidden)continue;
  const h=plan.compact?(touch?44:36)+18:(touch?44:36)+44+30+plan.membersHeight,r=rect(plan.left,plan.top,plan.width,h);
  assert.ok(r.left>=8&&r.right<=width-8&&r.top>=8&&r.bottom<=height-8,JSON.stringify({width,height,plan}));for(const other of [profile,buffs,...online?[online]:[],...obstacles])assert.ok(!overlap(r,other),JSON.stringify({width,height,plan,other}));
 }
});
test('party layout respects visual viewport offsets and can decline a fully occupied screen',()=>{
 const viewport={left:0,top:180,width:844,height:220},profile=rect(8,188,190,62);const plan=planPartyLayout({viewport,profile,above:[rect(8,254,260,26)],count:2,touch:true});assert.ok(plan.top>=viewport.top);assert.ok(plan.top+62<=400);
 assert.deepEqual(planPartyLayout({viewport:{width:320,height:200},profile:rect(0,0,320,200),count:5}),{hidden:true});
});
test('only a connected leader with space can add, while every connected member can leave',()=>{
 const party={leader:'a',members:['a','b']};assert.equal(partyActions(party,'a').canInvite,true);assert.equal(partyActions(party,'b').canInvite,false);assert.equal(partyActions(party,'b').canLeave,true);assert.equal(partyActions(party,'b').reason,'leader-only');assert.equal(partyActions(party,'a',false).canLeave,false);assert.equal(partyActions({...party,members:['a','b','c','d','e']},'a').reason,'full');assert.equal(partyActions(party,'stranger').canLeave,false);
});
test('invite search excludes existing party members and self, and party management filters to the party',()=>{
 const party={leader:'a',members:['a','b']},players=[{id:'a',name:'Hero',partyId:'p'},{id:'b',name:'Friend',partyId:'p'},{id:'c',name:'New Friend',partyId:null},{id:'d',name:'Busy Friend',partyId:'other'},{id:'e',name:'Gone Friend',connected:false}];
 assert.deepEqual(partyRoster(players,{mode:'invite',party,selfId:'a',query:' FRIEND '}).map(p=>p.id),['c']);assert.deepEqual(partyRoster(players,{mode:'party',party,selfId:'a'}).map(p=>p.id),['a','b']);assert.equal(partyRoster(players,{query:'missing'}).length,0);
});
