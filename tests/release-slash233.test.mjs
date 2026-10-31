import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {releaseRedirect} from '../server/public-files223.js';

// 1 Nov 2026: a new character reloads into the prologue with a relative '?server=…' URL; under <base href="/releases/r233-…/">
// that became /releases/r233-…/?server=… and Vercel answered 404 (the local server already redirects it).
test('Vercel sends a release folder with or without the trailing slash to the game page, like the local server',()=>{
 const rules=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8')).redirects;
 for(const source of ['/releases/:release','/releases/:release/'])assert.ok(rules.some(r=>r.source===source&&r.destination==='/game.html'&&r.permanent===false),source);
 assert.equal(releaseRedirect('releases/r233-20261031-mobile-warp/'),'/game.html');
});
// multiplayer-ui.js still reloads with a relative '?server=…'; make it absolute ('/game.html?…') in the next frozen
// release (runtime files can only change together with a new release ID, see scripts/verify-releases223.mjs).
