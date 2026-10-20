import {MeshLambertMaterial} from './vendor/build/three.module.js';
// 0.77 performance settings (per device): a frame-rate cap and a graphics level. The cap skips whole frames, so a
// phone that cannot hold 60 runs a steady 30 instead of swinging between them, and the battery lasts longer.
// The graphics level trades sharpness, sun shadows, the soft-look pass and meadow density for speed.
const KEY='ayothaya-perf';
export const FPS_CHOICES=[30,60,120,0]; // 0 = follow the screen
export const QUALITY={
 // ratio = sharpest render scale, min = how far the automatic resolution may drop to hold the frame rate
 low:{label:'ต่ำ · ลื่นสุด',ratio:.8,min:.5,shadows:false,soft:false,meadow:'low',light:true},
 mid:{label:'กลาง',ratio:1,min:.6,shadows:true,soft:true,meadow:'low'},
 high:{label:'สูง · สวยสุด',ratio:1.5,min:.75,shadows:true,soft:true,meadow:'high'},
};
const phone=()=>matchMedia('(pointer:coarse),(max-width:900px)').matches;
export function readPerf(){
 let saved={};try{saved=JSON.parse(localStorage.getItem(KEY))??{};}catch{}
 const fps=FPS_CHOICES.includes(saved.fps)?saved.fps:60,quality=QUALITY[saved.quality]?saved.quality:phone()?'mid':'high';
 return {fps,quality};
}
// 0.80 which GPU the browser actually draws with. Laptops with a dedicated card often run the browser on the
// built-in one; a page cannot change that (Windows owns it), so the panel names the GPU and opens the right
// Windows settings page in one tap, with the three steps beside it.
export function gpuName(gl){try{const d=gl.getExtension('WEBGL_debug_renderer_info');const raw=d?gl.getParameter(d.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);// "ANGLE (Intel, Intel(R) UHD Graphics 630 (0x00003E9B) Direct3D11 ..., D3D11)" -> "Intel(R) UHD Graphics 630"
const text=String(raw),parts=text.startsWith('ANGLE (')?text.slice(7,-1).split(', '):[text];
return (parts[1]??parts[0]).replace(/\s*\(0x[0-9a-f]+\).*$/i,'').replace(/\s*Direct3D.*$/i,'').trim();}catch{return '';}}
export const integratedGpu=name=>/intel|radeon\(tm\) graphics|radeon graphics|vega \d+ graphics/i.test(name)&&!/\barc\b/i.test(name);
export function createPerfSettings({renderer,scene,sun,softLook,resize,onApply=()=>{}}){
 const state=readPerf();let last=-Infinity,scale=1,windowStart=-1,drawn=0;
 const ratio=()=>{const q=QUALITY[state.quality],top=Math.min(devicePixelRatio,q.ratio);return Math.max(Math.min(q.min,top),top*scale);};
 // 0.78 measured on Intel UHD 630 at 1920x1032: the frame is bound by per-pixel shading, not triangles or shadows.
 // The low level swaps the PBR (MeshStandard) materials for Lambert, about 20% cheaper per pixel, and swaps back.
 const lambert=new Map();
 function lightMaterials(on){
  scene.traverse(o=>{if(!o.isMesh)return;
   if(on&&o.material?.isMeshStandardMaterial){const s=o.material;if(!lambert.has(s)){const L=new MeshLambertMaterial();for(const k of ['name','color','map','alphaTest','transparent','opacity','side','vertexColors','emissive','emissiveMap','emissiveIntensity','polygonOffset','polygonOffsetFactor','polygonOffsetUnits','depthWrite','alphaMap'])if(s[k]!==undefined)L[k]=s[k];L.onBeforeCompile=s.onBeforeCompile;if(s.customProgramCacheKey!==MeshLambertMaterial.prototype.customProgramCacheKey)L.customProgramCacheKey=s.customProgramCacheKey;lambert.set(s,L);}o.userData.pbr=s;o.material=lambert.get(s);}
   else if(!on&&o.userData.pbr){o.material=o.userData.pbr;delete o.userData.pbr;}});
 }
 function apply(initial=false){
  if(!initial)scale=1;
  const q=QUALITY[state.quality];lightMaterials(!!q.light);
  renderer.setPixelRatio(ratio());
  if(renderer.shadowMap.enabled!==q.shadows){renderer.shadowMap.enabled=q.shadows;sun.castShadow=q.shadows;scene.traverse(o=>{for(const m of [].concat(o.material??[]))m.needsUpdate=true;});}
  // On load only the low level forces the soft-look pass off; otherwise the player's own toggle is kept.
  if(!initial||!q.soft)softLook.setEnabled(q.soft);resize();onApply();
 }
 // Automatic resolution: every 2 s compare the drawn frame rate with the goal (28 under a 30 cap, else 55). Too slow:
 // render 10% fewer pixels per side, down to the level's floor. Comfortably fast again: creep back up 5%.
 function adapt(ms){
  if(windowStart<0){windowStart=ms;drawn=0;return;}drawn++;if(ms-windowStart<2000)return;
  const fps=drawn*1000/(ms-windowStart),goal=state.fps===30?28:55,before=ratio();windowStart=ms;drawn=0;
  if(fps<goal*.9)scale=Math.max(.3,scale-.1);else if(fps>=goal&&scale<1)scale=Math.min(1,scale+.05);
  if(ratio()!==before){renderer.setPixelRatio(ratio());resize();}
 }
 function save(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch{}}
 apply(true);
 return {
  get fps(){return state.fps;},get quality(){return state.quality;},
  // Called with the animation-loop timestamp; false means skip this frame entirely. The 1 ms slack keeps a 60 Hz
  // screen at 60 when the cap is 60 (vsync timestamps jitter around 16.67 ms).
  shouldDraw(ms){if(state.fps&&ms-last<1000/state.fps-1)return false;last=ms;adapt(ms);return true;},
  get renderScale(){return scale;},
  mount(box){
   const wrap=document.createElement('div');wrap.className='perf-settings';
   wrap.innerHTML=`<label>จำกัด FPS<select id="perf-fps">${FPS_CHOICES.map(f=>`<option value="${f}">${f?f+' FPS':'ตามหน้าจอ'}</option>`).join('')}</select></label>`+
    `<label>กราฟิก<select id="perf-quality">${Object.entries(QUALITY).map(([k,q])=>`<option value="${k}">${q.label}</option>`).join('')}</select></label>`+
    '<label>ภาษา · Language<button type="button" data-lang-toggle>TH / EN</button></label><small>เกมลดความละเอียดเองเมื่อ FPS ตก · ยังกระตุกลอง 30 FPS หรือกราฟิกต่ำ · ความหนาแน่นหญ้าเปลี่ยนตอนย้ายแมพ · 120 FPS ใช้ได้กับจอ 120Hz เท่านั้น</small>';
   const gpu=gpuName(renderer.getContext?.()),windows=/Windows/.test(navigator.userAgent);
   if(gpu){const p=document.createElement('div');p.className='perf-gpu';
    p.innerHTML=`<span>การ์ดจอที่ใช้อยู่: <b></b></span>`+(integratedGpu(gpu)&&windows?'<p>นี่คือการ์ดจอในตัว ถ้าเครื่องมีการ์ดจอแยก (NVIDIA / AMD) เกมจะลื่นกว่ามาก</p><a class="perf-open" href="ms-settings:display-advancedgraphics">เปิดตั้งค่าการ์ดจอของ Windows</a><ol><li>Browse หรือเลือกเบราว์เซอร์นี้ (Chrome / Edge)</li><li>Options › High performance › Save</li><li>ปิดเบราว์เซอร์ทุกหน้าต่างแล้วเปิดใหม่</li></ol>':'');
    p.querySelector('b').textContent=gpu;wrap.append(p);}
   box.append(wrap);
   const fps=wrap.querySelector('#perf-fps'),quality=wrap.querySelector('#perf-quality');fps.value=String(state.fps);quality.value=state.quality;
   fps.onchange=()=>{state.fps=+fps.value;save();};
   quality.onchange=()=>{state.quality=quality.value;save();apply();};
  },
 };
}
