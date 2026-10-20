// Every browser module must parse: one bad line in any of them stops the whole game from loading.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
test('every root module parses',()=>{
 for(const f of readdirSync('.').filter(f=>f.endsWith('.js'))){const r=spawnSync(process.execPath,['--check',f],{encoding:'utf8'});assert.equal(r.status,0,f+'\n'+r.stderr);}
});
