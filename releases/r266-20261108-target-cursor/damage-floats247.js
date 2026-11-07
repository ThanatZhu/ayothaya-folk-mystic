// Presentation only: one popup per confirmed hit; never merge or change damage.
export function createDamageFloats({container,project,reducedMotion}){
 if(!document.querySelector('link[data-damage-floats247]')){const css=document.createElement('link');css.rel='stylesheet';css.href=new URL('./damage-floats247.css',import.meta.url).href;css.dataset.damageFloats247='';css.addEventListener('load',()=>{document.fonts.load('24px "Lilita One"').catch(()=>{});},{once:true});document.head.append(css);}
 const media=matchMedia('(prefers-reduced-motion: reduce)'),isReduced=reducedMotion??(()=>media.matches);
 const active=[];
 const remove=f=>{f.el.remove();active.splice(active.indexOf(f),1);};
 function place(f,reduced=isReduced()){
  const p=project(f.pos());
  // A shared launch point, then a vertical stream: retain each confirmed hit.
  const age=Math.max(0,f.age),flight=Math.min(1,age/f.life);
  const rise=reduced?0:14*(1-Math.exp(-age*22))+66*flight;
  f.el.style.scale=String(reduced?1:1-.22*Math.max(0,(flight-.2)/.8));
  f.el.style.translate=`calc(${p.x}px - 50%) calc(${p.y-rise}px - 100%)`;
  f.el.style.visibility=p.visible===false||f.age<0?'hidden':'visible';
  f.el.style.opacity=String(Math.min(1,Math.max(0,(f.life-f.age)/.24)));
 }
 function add(e,{positive=false,big=false,anchor}={}){
  const word=typeof e.amount==='string',crit=!positive&&!word&&!e.hurt&&!!(e.crit||e.color==='#ffd27a');
  const companion=e.source==='spirit',kind=word?'word':positive?'heal':e.hurt?'hurt':e.magic?(crit?'magic-crit':'magic'):(crit?'crit':'normal');
  const el=document.createElement('span'),glyph=document.createElement('span');
  el.className='damage-number damage-float247';el.dataset.kind=kind;el.dataset.damageSource=companion?'spirit':'player';
  el.classList.toggle('critical',crit);el.classList.toggle('heavy',big&&!crit);el.classList.toggle('companion',companion);
  glyph.className='damage-glyph247';glyph.textContent=String(e.amount);el.append(glyph);
  if(companion){const tag=document.createElement('small');tag.textContent='พราย';el.prepend(tag);}
  // No horizontal lanes or summed damage. Older hits continue their own flight.
  const previous=active.filter(f=>f.key===anchor.key);
  // A stationary latest value avoids overlapping text in reduced-motion mode.
  if(isReduced())for(const old of previous)remove(old);
  else if(previous.length>=8)remove(previous[0]);
  if(active.length>=40)remove(active[0]);
  // Same-frame multi-hit packets still read as individual hits, at most 420 ms apart.
  const last=previous.at(-1),delay=isReduced()?0:Math.min(.42,Math.max(0,.06-(last?.age??1)));
  el.style.setProperty('--damage-delay',delay+'s');
  const f={el,key:anchor.key,pos:anchor.pos,crit,age:-delay,life:crit?.96:.84};
  place(f);container.append(el);active.push(f);return el;
 }
 function update(dt){
  const step=Math.max(0,Number.isFinite(dt)?dt:0),reduced=isReduced();
  for(const f of [...active]){
   f.age+=step;if(f.age>=f.life){remove(f);continue;}
   place(f,reduced);
  }
 }
 return {add,update,clear(){for(const f of [...active])remove(f);},get size(){return active.length;}};
}
