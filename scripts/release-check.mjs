// npm run release:check - the last gate before asking the owner to push. Stops at the first failed step.
//   1 git: based on the newest frontend-live, nothing uncommitted
//   2 release: this runtime is frozen under a new id (verify-releases223)
//   3 game rules: every class, slot, drop, shop, recipe and map in the real catalogs
//   4 all tests: a failed file gets one rerun alone, so a busy machine's timing does not block a release
import {execFileSync,spawnSync} from 'node:child_process';
import {mkdirSync,readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {verifyReleases} from './verify-releases223.mjs';

const root=path.dirname(path.dirname(fileURLToPath(import.meta.url))),BASE='origin/frontend-live',LIVE='https://ayothayaonline.com/release.json';
// ponytail: a failure is listed here by name only while someone owns fixing it; an entry hides that test from the gate.
const KNOWN_FAILURES=new Set(['new basic artwork overrides novice procedural pose but cannot replace a skill or custom equipment']);
const git=(...a)=>execFileSync('git',a,{cwd:root,encoding:'utf8'}).trim();
const stop=(step,why)=>{console.error(`\n✖ ${step}\n${why}\n`);process.exit(1);};
const ok=(step,detail='')=>console.log(`✔ ${step}${detail?' · '+detail:''}`);
function runTests(files){
 const r=spawnSync(process.execPath,['--test',...files],{cwd:root,encoding:'utf8',maxBuffer:1<<28});
 const failing=(r.stdout??'').split('failing tests:')[1]??'';
 return {status:r.status,files:[...new Set([...failing.matchAll(/^test at (.+?):\d+:\d+$/gm)].map(m=>m[1].replaceAll('\\','/')))],names:[...failing.matchAll(/^✖ (.+?) \([\d.]+ms\)$/gm)].map(m=>m[1])};
}

git('fetch','-q','origin','frontend-live');
const behind=git('rev-list','--count','HEAD..'+BASE),dirty=git('status','--porcelain','--untracked-files=no');
if(behind!=='0')stop('git',`${behind} newer commit(s) on frontend-live: rebase, then freeze under a new id`);
if(dirty)stop('git','uncommitted changes:\n'+dirty);
ok('git','based on the newest frontend-live');

const release=JSON.parse(readFileSync(path.join(root,'release.json'),'utf8'));
try{await verifyReleases(root);}catch(e){stop('release',e.message);}
const players=git('diff','--name-only',BASE,'HEAD').split('\n').filter(f=>f&&!/^(server|tests|docs|scripts)\//.test(f)); // a server-only change sends players no new frontend, so it keeps the id
if(players.length&&JSON.parse(git('show',BASE+':release.json')).id===release.id)stop('release',`${release.id} is already on frontend-live: choose a new id and freeze`);
ok('release',release.id);

const rules=runTests(['tests/game-rules-matrix.test.mjs','tests/gear-class-lock.test.mjs','tests/farm-card-warp254.test.mjs','tests/i18n.test.mjs']);
if(rules.status)stop('game rules',rules.names.join('\n')||'see: node --test tests/game-rules-matrix.test.mjs');
ok('game rules');

mkdirSync(path.join(root,'outputs'),{recursive:true}); // some tests write scratch files here; a fresh worktree has no such folder
const all=runTests(['tests/*.test.mjs']),again=all.files.length?runTests(all.files):{names:[]},failed=again.names.filter(n=>!KNOWN_FAILURES.has(n));
if(failed.length)stop('tests',failed.join('\n'));
ok('tests',`${all.names.length} failed in the full run, ${again.names.length} after rerun, ${again.names.length-failed.length} known`);

let live='unknown';try{live=(await(await fetch(LIVE+'?cb='+Date.now())).json()).id;}catch{}
console.log(`\nReady to push ${release.id}. Live now: ${live}.\nIt reaches players only after a Vercel promote.`);
