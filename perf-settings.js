// 0.77 performance settings (per device): a frame-rate cap and a graphics level. The cap skips whole frames, so a
// phone that cannot hold 60 runs a steady 30 instead of swinging between them, and the battery lasts longer.
// The graphics level trades sharpness, sun shadows, the soft-look pass and meadow density for speed.
const KEY='ayothaya-perf';
export const FPS_CHOICES=[30,60,120,0]; // 0 = follow the screen
export const QUALITY={
 low:{label:'ต่ำ · ลื่นสุด',ratio:1,shadows:false,soft:false,meadow:'low'},
 mid:{label:'กลาง',ratio:1,shadows:true,soft:true,meadow:'low'},
 high:{label:'สูง · สวยสุด',ratio:1.5,shadows:true,soft:true,meadow:'high'},
};
const phone=()=>matchMedia('(pointer:coarse),(max-width:900px)').matches;
export function readPerf(){
 let saved={};try{saved=JSON.parse(localStorage.getItem(KEY))??{};}catch{}
 const fps=FPS_CHOICES.includes(saved.fps)?saved.fps:60,quality=QUALITY[saved.quality]?saved.quality:phone()?'mid':'high';
 return {fps,quality};
}
export function createPerfSettings({renderer,scene,sun,softLook,resize,onApply=()=>{}}){
 const state=readPerf();let last=-Infinity;
 function apply(initial=false){
  const q=QUALITY[state.quality];
  renderer.setPixelRatio(Math.min(devicePixelRatio,q.ratio));
  if(renderer.shadowMap.enabled!==q.shadows){renderer.shadowMap.enabled=q.shadows;sun.castShadow=q.shadows;scene.traverse(o=>{for(const m of [].concat(o.material??[]))m.needsUpdate=true;});}
  // On load only the low level forces the soft-look pass off; otherwise the player's own toggle is kept.
  if(!initial||!q.soft)softLook.setEnabled(q.soft);resize();onApply();
 }
 function save(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch{}}
 apply(true);
 return {
  get fps(){return state.fps;},get quality(){return state.quality;},
  // Called with the animation-loop timestamp; false means skip this frame entirely. The 1 ms slack keeps a 60 Hz
  // screen at 60 when the cap is 60 (vsync timestamps jitter around 16.67 ms).
  shouldDraw(ms){if(!state.fps)return true;if(ms-last<1000/state.fps-1)return false;last=ms;return true;},
  mount(box){
   const wrap=document.createElement('div');wrap.className='perf-settings';
   wrap.innerHTML=`<label>จำกัด FPS<select id="perf-fps">${FPS_CHOICES.map(f=>`<option value="${f}">${f?f+' FPS':'ตามหน้าจอ'}</option>`).join('')}</select></label>`+
    `<label>กราฟิก<select id="perf-quality">${Object.entries(QUALITY).map(([k,q])=>`<option value="${k}">${q.label}</option>`).join('')}</select></label>`+
    '<small>ถ้าเกมกระตุก ลอง 30 FPS หรือกราฟิกต่ำ · ความหนาแน่นหญ้าเปลี่ยนตอนย้ายแมพ · 120 FPS ใช้ได้กับจอ 120Hz เท่านั้น</small>';
   box.append(wrap);
   const fps=wrap.querySelector('#perf-fps'),quality=wrap.querySelector('#perf-quality');fps.value=String(state.fps);quality.value=state.quality;
   fps.onchange=()=>{state.fps=+fps.value;save();};
   quality.onchange=()=>{state.quality=quality.value;save();apply();};
  },
 };
}
