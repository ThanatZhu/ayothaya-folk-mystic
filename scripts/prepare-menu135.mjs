// Resize the image_gen artwork proportionally; retain the original alpha and painted outlines.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.argv[2]).href);
const source=new URL('../outputs/imagegen/menu135/sources/',import.meta.url);
const output=new URL('../assets/ui-menu135/',import.meta.url);await mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage();
 for(const id of ['mail','mvp']){
  const png=await readFile(new URL(id+'.png',source));
  const result=await page.evaluate(async data=>{
   const image=new Image();image.src=data;await image.decode();
   const source=document.createElement('canvas');source.width=image.width;source.height=image.height;
   const ctx=source.getContext('2d');ctx.drawImage(image,0,0);
   const pixels=ctx.getImageData(0,0,source.width,source.height).data;
   let left=image.width,top=image.height,right=0,bottom=0;
   for(let y=0;y<image.height;y++)for(let x=0;x<image.width;x++)if(pixels[(y*image.width+x)*4+3]>200){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
   const scale=92/Math.max(right-left+1,bottom-top+1),canvas=document.createElement('canvas');canvas.width=canvas.height=128;
   const out=canvas.getContext('2d');out.drawImage(image,64-(left+right)/2*scale,64-(top+bottom)/2*scale,image.width*scale,image.height*scale);
   const alpha=out.getImageData(0,0,128,128).data;let transparent=0;for(let i=3;i<alpha.length;i+=4)if(alpha[i]===0)transparent++;
   return {data:canvas.toDataURL('image/webp',.96),transparent};
  },'data:image/png;base64,'+png.toString('base64'));
  if(result.transparent<3000)throw new Error('Expected transparent icon: '+id);
  const webp=Buffer.from(result.data.split(',')[1],'base64');await writeFile(new URL(id+'.webp',output),webp);console.log(id,webp.length,'bytes; transparent pixels:',result.transparent);
 }
}finally{await browser.close();}
