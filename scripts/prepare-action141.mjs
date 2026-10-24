// Export matching-size transparent WebP buttons from the generated originals.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.argv[2]).href),browser=await chromium.launch({channel:'msedge',headless:true});
const output=new URL('../assets/ui-action141/',import.meta.url);await mkdir(output,{recursive:true});
try{
 const page=await browser.newPage();
 for(const id of ['add','remove','emote','run']){
  const png=await readFile(new URL('../outputs/imagegen/action141/'+id+'.png',import.meta.url));
  const data=await page.evaluate(async data=>{
   const image=new Image();image.src=data;await image.decode();const original=document.createElement('canvas');original.width=image.width;original.height=image.height;
   const ctx=original.getContext('2d');ctx.drawImage(image,0,0);const pixels=ctx.getImageData(0,0,image.width,image.height).data;
   let left=image.width,top=image.height,right=0,bottom=0;
   for(let y=0;y<image.height;y++)for(let x=0;x<image.width;x++)if(pixels[(y*image.width+x)*4+3]>180){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
   const scale=240/Math.max(right-left+1,bottom-top+1),canvas=document.createElement('canvas');canvas.width=canvas.height=256;
   const out=canvas.getContext('2d');out.drawImage(image,128-(left+right)/2*scale,128-(top+bottom)/2*scale,image.width*scale,image.height*scale);
   const alpha=out.getImageData(0,0,256,256).data;let transparent=0;for(let i=3;i<alpha.length;i+=4)if(alpha[i]===0)transparent++;
   if(transparent<5000)throw Error('Expected transparent button margins');return {image:canvas.toDataURL('image/webp',.94),transparent};
  },'data:image/png;base64,'+png.toString('base64'));
  const webp=Buffer.from(data.image.split(',')[1],'base64');await writeFile(new URL(id+'.webp',output),webp);console.log(JSON.stringify({id,bytes:webp.length,transparentPixels:data.transparent}));
 }
}finally{await browser.close();}
