// Proportional WebP exports of generated UI art; retain the original alpha.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.argv[2]).href),browser=await chromium.launch({channel:'msedge',headless:true});
const output=new URL('../assets/ui-skill150/',import.meta.url);await mkdir(output,{recursive:true});
try{
 const page=await browser.newPage();
 for(const [id,width] of [['window',1536],['node',1024]]){
  const png=await readFile(new URL('../outputs/imagegen/skill150/'+id+'.png',import.meta.url));
  const data=await page.evaluate(async({src,width})=>{
   const image=new Image();image.src=src;await image.decode();const canvas=document.createElement('canvas');canvas.width=width;canvas.height=Math.round(width*image.height/image.width);
   const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0,canvas.width,canvas.height);
   const {data:pixels}=ctx.getImageData(0,0,canvas.width,canvas.height);let transparent=0;
   for(let i=3;i<pixels.length;i+=4)if(pixels[i]===0)transparent++;
   const centerAlpha=pixels[(Math.floor(canvas.height/2)*canvas.width+Math.floor(canvas.width/2))*4+3];
   if(centerAlpha>8||transparent<canvas.width*canvas.height*.3)throw Error('Expected clear transparent center');
   return {image:canvas.toDataURL('image/webp',.95),width:canvas.width,height:canvas.height,transparent,centerAlpha};
  },{src:'data:image/png;base64,'+png.toString('base64'),width});
  const bytes=Buffer.from(data.image.split(',')[1],'base64');await writeFile(new URL(id+'.webp',output),bytes);delete data.image;console.log(JSON.stringify({id,...data,bytes:bytes.length}));
 }
}finally{await browser.close();}
