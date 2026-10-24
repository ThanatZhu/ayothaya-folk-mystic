// Compile AI-generated transparent PNGs into small browser-native WebP assets.
// Only resizing/encoding: the artwork and alpha come from image_gen unchanged.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.argv[2]).href);
const source=new URL('../outputs/imagegen/event-icons-v1/sources/',import.meta.url);
const output=new URL('../assets/ui-mobile/status-ai-v1/',import.meta.url);await mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage();
 for(const id of ['weather','mvp','festival','frenzy','events','players']){
  const png=await readFile(new URL(id+'.png',source));
  const result=await page.evaluate(async data=>{
   const image=new Image();image.src=data;await image.decode();
   const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;
   canvas.getContext('2d').drawImage(image,0,0,128,128);
   const pixels=canvas.getContext('2d').getImageData(0,0,128,128).data;
   let transparent=0,visible=0;for(let i=3;i<pixels.length;i+=4){if(pixels[i]===0)transparent++;if(pixels[i]>0)visible++;}
   return {data:canvas.toDataURL('image/webp',.94),transparent,visible};
  },'data:image/png;base64,'+png.toString('base64'));
  if(!result.transparent||!result.visible)throw new Error('Missing art or alpha: '+id);
  const webp=Buffer.from(result.data.split(',')[1],'base64');await writeFile(new URL(id+'.webp',output),webp);
  console.log(id,png.length,'→',webp.length,'bytes; transparent pixels:',result.transparent);
 }
}finally{await browser.close();}
