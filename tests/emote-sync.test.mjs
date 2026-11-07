import test from 'node:test';
import assert from 'node:assert/strict';
import {reconcileEmote} from '../character-action-state.js';

const bow={name:'bow',time:10};
test('a snapshot sent before the server saw the press does not cancel the emote',()=>{
 const pending={name:'bow',until:5};
 assert.deepEqual(reconcileEmote(bow,null,pending,4),{emote:bow,pending});
});
test('the server confirming the press keeps the clip running from where it is',()=>{
 const served={name:'bow',time:10.25};
 assert.deepEqual(reconcileEmote(bow,served,{name:'bow',until:5},4),{emote:bow,pending:null});
 assert.deepEqual(reconcileEmote(bow,served,null,4),{emote:bow,pending:null});
});
test('standing up is not undone by a snapshot that still carries the old pose',()=>{
 const pending={name:'idle',until:5},served={name:'sit',time:9};
 assert.deepEqual(reconcileEmote(null,served,pending,4),{emote:null,pending});
 assert.deepEqual(reconcileEmote(null,null,pending,4),{emote:null,pending:null});
});
test('a press the server never answers gives way, and with nothing pending the server decides',()=>{
 assert.deepEqual(reconcileEmote(bow,null,{name:'bow',until:5},6),{emote:null,pending:null});
 assert.deepEqual(reconcileEmote(null,bow,null,4),{emote:bow,pending:null});
});
