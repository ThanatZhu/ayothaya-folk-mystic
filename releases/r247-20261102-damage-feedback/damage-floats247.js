// Presentation only: one popup per confirmed hit; never merge or change damage.
export function createDamageFloats({container,project,reducedMotion}){
 if(!document.querySelector('link[data-damage-floats247]')){const css=document.createElement('link');css.rel='stylesheet';css.href=new URL('./damage-floats247.css',import.meta.url).href;css.dataset.damageFloats247='';document.head.append(css);}
 const media=matchMedia('(prefers-reduced-motion: reduce)'),isReduced=reducedMotion??(()=>media.matches);
 const active=[],lanes=new Map();
 const remove=f=>{f.el.remove();active.splice(active.indexOf(f),1);};
 function place(f,reduced=isReduced()){
  const p=project(f.pos());
  const rise=reduced?0:36*f.age;
  f.el.style.translate=`calc(${p.x+f.side}px - 50%) calc(${p.y-f.offset-rise}px - 100%)`;
  f.el.style.visibility=p.visible===false?'hidden':'visible';
  f.el.style.opacity=String(Math.min(1,Math.max(0,(f.life-f.age)/.2)));
 }
 function add(e,{positive=false,big=false,anchor}={}){
  const word=typeof e.amount==='string',crit=!positive&&!word&&!e.hurt&&!!(e.crit||e.color==='#ffd27a');
  const companion=e.source==='spirit',kind=word?'word':positive?'heal':e.hurt?'hurt':e.magic?(crit?'magic-crit':'magic'):(crit?'crit':'normal');
  const el=document.createElement('span'),glyph=document.createElement('span');
  el.className='damage-number damage-float247';el.dataset.kind=kind;el.dataset.damageSource=companion?'spirit':'player';
  el.classList.toggle('critical',crit);el.classList.toggle('heavy',big&&!crit);el.classList.toggle('companion',companion);
  glyph.className='damage-glyph247';glyph.textContent=String(e.amount);el.append(glyph);
  if(companion){const tag=document.createElement('small');tag.textContent='พราย';el.prepend(tag);}
  const same=active.filter(f=>f.key===anchor.key);
  if(same.length>=5)remove(same.find(f=>!f.crit)??same[0]);
  if(active.length>=40)remove(active.find(f=>!f.crit)??active[0]);
  for(const f of active)if(f.key===anchor.key)f.targetOffset+=crit?34:27;
  const sequence=lanes.get(anchor.key)??0;lanes.set(anchor.key,sequence+1);
  const side=[0,-27,27][sequence%3];
  const f={el,key:anchor.key,pos:anchor.pos,crit,age:0,life:crit?1.02:.84,offset:0,targetOffset:0,side};
  place(f);container.append(el);active.push(f);return el;
 }
 function update(dt){
  const step=Math.max(0,Number.isFinite(dt)?dt:0),reduced=isReduced();
  for(const f of [...active]){
   f.age+=step;if(f.age>=f.life){remove(f);continue;}
   f.offset=reduced?f.targetOffset:f.offset+(f.targetOffset-f.offset)*(1-Math.exp(-24*step));place(f,reduced);
  }
  for(const key of lanes.keys())if(!active.some(f=>f.key===key))lanes.delete(key);
 }
 return {add,update,clear(){for(const f of [...active])remove(f);lanes.clear();},get size(){return active.length;}};
}
