// Runs tests/rules.emulator.mjs inside the Firestore emulator (offline demo project, no cloud access).
// Needs Java 11+: on PATH, in JAVA_HOME, or a portable runtime under %LOCALAPPDATA%/ayothaya-tools/jre/*.
import {spawnSync} from 'node:child_process';
import {readdirSync,existsSync} from 'node:fs';
import path from 'node:path';
const env={...process.env},portable=path.join(env.LOCALAPPDATA??'/nonexistent','ayothaya-tools','jre');
const bins=env.JAVA_HOME?[path.join(env.JAVA_HOME,'bin')]:existsSync(portable)?readdirSync(portable).map(d=>path.join(portable,d,'bin')):[];
const java=bins.find(d=>existsSync(path.join(d,'java.exe'))||existsSync(path.join(d,'java')));
if(java)env.PATH=java+path.delimiter+env.PATH;
const result=spawnSync('npx',['-y','firebase-tools@15.33.0','emulators:exec','--only','firestore','--project','demo-ayothaya','"node --test tests/rules.emulator.mjs"'],{stdio:'inherit',env,shell:true});
process.exit(result.status??1);
