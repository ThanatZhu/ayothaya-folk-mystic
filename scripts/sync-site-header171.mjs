import {readFile,writeFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const header=(await readFile(new URL('assets/site171/header.html',root),'utf8')).trim();
for(const file of ['index.html','guide.html','equipment-journey.html']){
 const path=new URL(file,root),source=await readFile(path,'utf8');
 const pattern=/<header class="(?:nav|topbar|site-header|site-masthead)"[\s\S]*?<\/header>/;
 if(!pattern.test(source))throw Error('Missing public header in '+file);
 const next=source.replace(pattern,header);
 if(next!==source)await writeFile(path,next);
}
