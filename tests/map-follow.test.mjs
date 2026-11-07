import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// The frozen game.html has <base href="/releases/<id>/">, and /releases/<id>/ redirects to the lobby.
test('a page reload never uses a bare ?query link, which the release base sends to the lobby',()=>{
 // frontier-lab.js is a dev page with no release base.
 for(const file of fs.readdirSync('.').filter(f=>f.endsWith('.js')&&f!=='frontier-lab.js')){
  assert.equal(/location\.(assign|replace)\(['"`]\?/.test(fs.readFileSync(file,'utf8')),false,file);
 }
});
test('following the server to another map stays on the game page',()=>{
 const source=fs.readFileSync('multiplayer-ui.js','utf8');
 assert.ok(source.includes("location.assign('/game.html?server='+account.serverId+'&channel='+currentChannel+'&map='"));
});
