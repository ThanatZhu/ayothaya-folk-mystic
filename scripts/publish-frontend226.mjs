import {execFileSync} from 'node:child_process';import {verifyReleases} from './verify-releases223.mjs';
const run=(cmd,args,options={})=>execFileSync(cmd,args,{encoding:'utf8',stdio:['ignore','pipe','pipe'],...options}).trim();
run('git',['fetch','origin','main','frontend-live']);
if(run('git',['status','--porcelain','--untracked-files=no']))throw Error('Commit tracked changes before publication.');
run('git',['merge-base','--is-ancestor','origin/frontend-live','HEAD']);
console.log(run(process.execPath,['scripts/check-frontend226.mjs','origin/main']));
await verifyReleases(process.cwd());
const before=run('git',['ls-remote','origin','refs/heads/main']).split(/\s/)[0],sha=run('git',['rev-parse','HEAD']);
if(process.argv.includes('--push')){
 console.log(run('git',['push','origin','HEAD:refs/heads/frontend-live']));
 const after=run('git',['ls-remote','origin','refs/heads/main']).split(/\s/)[0];if(after!==before)throw Error('Backend source changed concurrently. Stop and investigate before production publication.');
}
console.log(JSON.stringify({frontendOnly:true,backendSourceUntouched:before,sha,vercel:{teamId:'team_WrA2wlKT8Yda9e1ayCEBkqwY',requestBody:{name:'ayothaya-folk-mystic',project:'prj_Xc7ovSs6wANLMS6G1jA69zI2ntav',target:'production',gitSource:{type:'github',repoId:1412245217,ref:'frontend-live',sha}}}},null,2));
