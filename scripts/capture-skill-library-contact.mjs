import {writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {ROLES} from '../assets/skills-next/catalog.js';
import {ALL_PROFILES} from '../assets/skill-polish/library-profiles.js';
import './mobile-review-server.mjs';
const {chromium}=await import(pathToFileURL(process.argv[2]).href),browser=await chromium.launch({channel:'msedge',headless:true});
const out=new URL('../outputs/all-skill-library/',import.meta.url);await mkdir(out,{recursive:true});const page=await browser.newPage({viewport:{width:1280,height:980}}),port=process.env.MOBILE_REVIEW_PORT||8896;
try{
 for(const role of ROLES){const html='<!doctype html><html lang="th"><meta charset="utf-8"><link rel="stylesheet" href="../../typography.css"><style>body{margin:15px;background:#13261e;color:#fff0ce;font:13px Mali,Tahoma}h1{font-size:22px}h2{font-size:11px;margin:5px}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}article{border:1px solid #7e6a41;background:#102017}img{width:100%;display:block}small{font-size:9px;color:#c1b887}</style><h1>'+role.name+' · ครบ 16 รายการ</h1><div class="grid">'+ALL_PROFILES.filter(p=>p.classId===role.id).map(p=>`<article><h2>${p.title} <small>${p.passive?'พาสซีฟ':p.branch?.name??'หลัก'}</small></h2><img src="${p.id}.png" alt="${p.title}"></article>`).join('')+'</div></html>';await writeFile(new URL(role.id+'-contact.html',out),html);await page.goto(`http://127.0.0.1:${port}/outputs/all-skill-library/${role.id}-contact.html`);await page.screenshot({path:fileURLToPath(new URL(role.id+'-contact.png',out)),fullPage:true});}
 await page.goto(`http://127.0.0.1:${port}/skill-library-art.html`);await page.screenshot({path:fileURLToPath(new URL('all-atlases.png',out)),fullPage:true});console.log('Captured 7 class contact sheets and all atlas art');
}finally{await browser.close();}process.exit(0);
