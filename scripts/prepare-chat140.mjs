// Proportional export of the generated bitmap, keeping its transparent alpha.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.argv[2]).href),browser=await chromium.launch({channel:'msedge',headless:true});
const output=new URL('../assets/ui-chat140/',import.meta.url);await mkdir(output,{recursive:true});
try{
 const page=await browser.newPage(),png=await readFile(new URL('../outputs/imagegen/chat140/chat.png',import.meta.url));
 const data=await page.evaluate(async data=>{
  const image=new Image();image.src=data;await image.decode();const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
  const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0,256,256);const pixels=ctx.getImageData(0,0,256,256).data;
  let transparent=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i]===0)transparent++;
  if(transparent<5000)throw Error('Expected transparent chat artwork');
  return {image:canvas.toDataURL('image/webp',.94),transparent};
 },'data:image/png;base64,'+png.toString('base64'));
 const webp=Buffer.from(data.image.split(',')[1],'base64');await writeFile(new URL('chat.webp',output),webp);console.log(JSON.stringify({bytes:webp.length,transparentPixels:data.transparent,width:256,height:256}));
}finally{await browser.close();}
