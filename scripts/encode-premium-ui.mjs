// Runtime encodings only: keep all generated PNG masters and their alpha intact.
const {default:sharp}=await import(process.env.SHARP_MODULE??'sharp');
import {fileURLToPath} from 'node:url';
import {readFile,writeFile,stat} from 'node:fs/promises';import {createHash} from 'node:crypto';
const packs=[['premium-ui',{'menu-gacha':256,'menu-store':256,'close-button':128,'window-frame':768,'button-jade':960,'button-gold':960,'gacha-banner':1440,'store-banner':1440}],['amulet-ritual-v2',{sealed:960,awakening:960,revealed:960,flash:768}],['gacha-neutral',{sealed:960,awakening:960,revealed:960,'help-button':128}]];
for(const [folder,specs] of packs){if(process.argv[2]&&process.argv[2]!==folder)continue;const manifest=[];
for(const [name,width] of Object.entries(specs)){
 const source=new URL('../assets/'+folder+'/'+name+'.png',import.meta.url),output=new URL('../assets/'+folder+'/'+name+'.webp',import.meta.url),bytes=await readFile(source);
 const info=await sharp(bytes).resize({width,withoutEnlargement:true}).webp({quality:90,alphaQuality:100,effort:6}).toFile(fileURLToPath(output));
 manifest.push({source:'assets/'+folder+'/'+name+'.png',runtime:'assets/'+folder+'/'+name+'.webp',sha256:createHash('sha256').update(bytes).digest('hex'),sourceBytes:bytes.length,bytes:(await stat(output)).size,width:info.width,height:info.height});
}
await writeFile(new URL('../assets/'+folder+'/runtime-assets.json',import.meta.url),JSON.stringify(manifest,null,2)+'\n');console.log(JSON.stringify({folder,sourceBytes:manifest.reduce((n,r)=>n+r.sourceBytes,0),runtimeBytes:manifest.reduce((n,r)=>n+r.bytes,0)}));}
