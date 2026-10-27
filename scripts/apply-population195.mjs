// Run after re-exporting authored maps. Reapplying never doubles them again.
import {readFile,writeFile} from 'node:fs/promises';
import {lablaeCitizens} from '../lablae-citizens.js';
const path=new URL('../maps/world.json',import.meta.url),catalog=JSON.parse(await readFile(path,'utf8'));
catalog.version=Math.max(catalog.version??0,195);
for(const map of catalog.maps){
 if(!map.safe&&map.mobs?.length)map.mobPopulation=2;
 if(map.id==='ayutthaya')map.citizens=map.citizens.slice(0,16);
 if(map.id==='lablae')map.citizens=lablaeCitizens();
}
await writeFile(path,JSON.stringify(catalog,null,2)+'\n');
console.log('Ordinary monster population ×2; Ayutthaya 16 / Lablae 12 walking citizens.');
