// Proportional production exports of the generated raster assets; preserve alpha.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.argv[2]).href),browser=await chromium.launch({channel:'msedge',headless:true});
const output=new URL('../assets/ui-overlay143/',import.meta.url);await mkdir(output,{recursive:true});
try{
 const page=await browser.newPage();
 for(const [id,width,height] of [['quest',256,256],['party',256,256],['fold',256,160],['chat-frame',768,1152],['send',512,172],['close',256,256],['chat-tab',512,172]]){
  const png=await readFile(new URL('../outputs/imagegen/overlay143/'+id+'.png',import.meta.url));
  const data=await page.evaluate(async({src,width,height,id})=>{
   const image=new Image();image.src=src;await image.decode();const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
   const ctx=canvas.getContext('2d'),scale=Math.min(width/image.width,height/image.height);ctx.drawImage(image,(width-image.width*scale)/2,(height-image.height*scale)/2,image.width*scale,image.height*scale);
   const pixels=ctx.getImageData(0,0,width,height).data;let transparent=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i]===0)transparent++;
   const centerAlpha=pixels[(Math.floor(height/2)*width+Math.floor(width/2))*4+3];
   if(transparent<width*height*.025)throw Error(id+' missing transparent margins');
   if(id==='chat-frame'&&centerAlpha>8)throw Error('Frame center must be transparent');
   return {image:canvas.toDataURL('image/webp',.95),transparent,centerAlpha};
  },{src:'data:image/png;base64,'+png.toString('base64'),width,height,id});
  const webp=Buffer.from(data.image.split(',')[1],'base64');await writeFile(new URL(id+'.webp',output),webp);console.log(JSON.stringify({id,width,height,bytes:webp.length,transparentPixels:data.transparent,centerAlpha:data.centerAlpha}));
 }
}finally{await browser.close();}
