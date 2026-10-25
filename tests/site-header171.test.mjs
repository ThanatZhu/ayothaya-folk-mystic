import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url),read=p=>readFileSync(new URL(p,root),'utf8'),pages=['index.html','guide.html','equipment-journey.html'];
test('landing and both handbooks ship exactly the same static navigation from one source',()=>{
 const header=read('assets/site171/header.html').trim();
 for(const page of pages){const source=read(page),actual=source.match(/<header class="site-masthead">[\s\S]*?<\/header>/)?.[0];assert.equal(actual,header,page);assert.match(source,/site-header.css\?v=171/);assert.match(source,/site-header.js\?v=171/);assert.match(source,/i18n.js\?v=100/);}
 assert.match(read('build-vercel.mjs'),/sync-site-header171.mjs/);
 const before=pages.map(read);execFileSync(process.execPath,['scripts/sync-site-header171.mjs'],{cwd:fileURLToPath(root)});assert.deepEqual(pages.map(read),before,'header generation must be idempotent');
});
test('home section links resolve to the landing page from either handbook',()=>{
 const header=read('assets/site171/header.html'),links=[...header.matchAll(/href="([^"]+)"/g)].map(m=>m[1]);
 for(const page of pages)for(const section of ['features','classes','world','events','news']){
  const link=links.find(h=>h.endsWith('#'+section));assert.ok(link);const target=new URL(link,'https://ayothayaonline.com/'+page);assert.equal(target.pathname,'/');assert.equal(target.hash,'#'+section);
 }
 for(const target of ['guide.html','equipment-journey.html','play.html'])assert.ok(links.includes(target));
 assert.match(header,/aria-expanded="false" aria-controls="site-nav"/);assert.match(read('site-header.js'),/url.searchParams.set\('lang',next\)/);
});
test('luxury handbook theme retains real illustrations, shared Mali fonts and the source-specific tools',()=>{
 for(const page of pages)assert.match(read(page),/typography.css/);
 for(const page of pages.slice(1))assert.match(read(page),/companion-luxury171.css\?v=171/);
 assert.match(read('guide.js'),/setupPictureViewer/);assert.match(read('guide.html'),/id="guide-search"/);
 const journey=read('equipment-journey.html');assert.match(journey,/id="class-select"/);assert.match(journey,/id="level-input"/);assert.match(journey,/<section class="hero">[\s\S]*?<\/section>\s*<main>/);
 assert.doesNotMatch(read('landing.js'),/toggle.addEventListener/,'one owner handles the shared menu');
});
