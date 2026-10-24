// Isolate an atlas cell before fitting it to a button. CSS percentage sampling
// assumes equal cells and cannot handle the measured source dividers safely.
const images=new Map(),pictures=new Map(),owners=new WeakMap();
function load(url){if(!images.has(url)){const img=new Image();img.src=url;images.set(url,img.decode().then(()=>img).catch(error=>{images.delete(url);throw error;}));}return images.get(url);}
export function clearSkillIcon(el){if(!el)return;owners.set(el,null);el.style.backgroundImage='none';delete el.dataset.iconReady;delete el.dataset.skillIcon;}
export async function paintSkillRegion(el,url,region){
 if(!el)return false;const token={};owners.set(el,token);el.classList.add('skill-art');el.setAttribute('aria-hidden','true');el.style.backgroundImage='none';el.dataset.iconReady='pending';
 const key=url+'#'+region.rect.join(',');
 try{
  if(!pictures.has(key))pictures.set(key,load(url).then(img=>{
   const [x,y,w,h]=region.rect;if(img.naturalWidth!==region.width||img.naturalHeight!==region.height||w<=0||h<=0||x<0||y<0||x+w>img.width||y+h>img.height)throw new Error('Skill atlas dimensions changed; remeasure icon regions');
   const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const ctx=canvas.getContext('2d'),scale=128/Math.max(w,h);ctx.fillStyle='#102a24';ctx.fillRect(0,0,128,128);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(img,x,y,w,h,(128-w*scale)/2,(128-h*scale)/2,w*scale,h*scale);return canvas.toDataURL('image/png');
  }).catch(error=>{pictures.delete(key);throw error;}));
  const data=await pictures.get(key);if(owners.get(el)!==token)return false;
  el.style.backgroundImage=`url("${data}")`;el.style.backgroundSize='100% 100%';el.style.backgroundPosition='center';el.style.backgroundRepeat='no-repeat';el.dataset.iconReady='ready';return true;
 }catch(error){if(owners.get(el)===token)el.dataset.iconReady='error';console.error('Skill icon could not load',error);return false;}
}
