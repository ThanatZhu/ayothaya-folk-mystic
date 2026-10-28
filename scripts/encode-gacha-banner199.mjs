import {fileURLToPath} from 'node:url';
import {readFile,writeFile,mkdir,copyFile,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {AMULETS} from '../amulets.js';
const sharp=(await import(process.env.SHARP_MODULE??'sharp')).default;
const source=process.argv[2];if(!source)throw Error('Pass the approved background PNG path');
const out=new URL('../assets/gacha-banner199/',import.meta.url);await mkdir(out,{recursive:true});
const rows=[];
async function save(name,operation){const file=new URL(name,out);await operation.toFile(fileURLToPath(file));const bytes=await readFile(file),meta=await sharp(bytes).metadata();rows.push({file:name,width:meta.width,height:meta.height,bytes:bytes.length,alpha:meta.hasAlpha,sha256:createHash('sha256').update(bytes).digest('hex')});}
await save('sanctuary.webp',sharp(source).resize({width:1920,withoutEnlargement:true}).webp({quality:82}));
await save('sanctuary-mobile.webp',sharp(source).resize({width:960,withoutEnlargement:true}).webp({quality:78}));
for(const a of AMULETS)await save('amulet-'+a.art+'.webp',sharp(fileURLToPath(new URL('../assets/amulets-rainbow/'+a.art+'.png',import.meta.url))).trim({threshold:14}).extend({top:18,bottom:18,left:18,right:18,background:{r:0,g:0,b:0,alpha:0}}).resize({height:640,withoutEnlargement:true}).webp({quality:88}));
await writeFile(new URL('runtime-assets.json',out),JSON.stringify(rows,null,2));console.log(JSON.stringify(rows));
