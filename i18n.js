// TH/EN switch. The game is written in Thai; in English mode every Thai text node and
// label attribute is looked up in i18n-en.js (Thai source -> English) as it reaches the DOM,
// so UI modules and server notices need no changes. Load after i18n-en.js, before any module.
// ponytail: phrase lookup, not message keys; a sentence the dictionary misses falls back to
// translating its known pieces. Run `node scripts/i18n-missing.mjs` to list gaps.
(()=>{
 const KEY='ayothaya.lang',THAI=/[฀-๿]/,ATTRS=['title','placeholder','aria-label','alt'];
 let stored=null;
 try{const q=new URLSearchParams(location.search).get('lang');if(q==='en'||q==='th')localStorage.setItem(KEY,q);stored=localStorage.getItem(KEY);}catch{}
 const lang=stored==='en'||stored==='th'?stored:(/^en\b/i.test(navigator.language||'')?'en':'th');
 const exact=new Map(),templates=[],cache=new Map();
 let phrases=null;
 const esc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 function load(dict){
  const plain=[];
  const add=(th,en)=>{
   if(!/\{\d+\}/.test(th)){
    if(exact.has(th))return;
    exact.set(th,en);
    // Very short words (ตัว, ได้) hide inside longer ones; only whole strings use them.
    if(th.length>=4)plain.push(th);
    return;
   }
   const order=[...th.matchAll(/\{(\d+)\}/g)].map(m=>+m[1]);
   const body=esc(th).replace(/\\\{\d+\\\}/g,'(.+?)'),weight=th.replace(/\{\d+\}/g,'').length;
   // Fixed text at both ends: the template can also be found inside a longer line ("ประกาศ: 🔥 ...").
   const inner=/^[^{].*[^}]$/.test(th)&&weight>=6?new RegExp(body,'g'):null;
   templates.push({re:new RegExp('^'+body+'$'),inner,en,order,weight});
   // `${icon(...)}ตั้งแผง` puts the icon in its own node: also learn the text without that edge slot.
   const head=/^\{\d+\}/.exec(th)?.[0],tail=/\{\d+\}$/.exec(th)?.[0];
   if(head&&en.startsWith(head))add(th.slice(head.length).trim(),en.slice(head.length).trim());
   if(tail&&en.endsWith(tail))add(th.slice(0,-tail.length).trim(),en.slice(0,-tail.length).trim());
  };
  for(const [th,en] of Object.entries(dict))add(th,en);
  templates.sort((a,b)=>b.weight-a.weight);
  plain.sort((a,b)=>b.length-a.length);
  phrases=plain.length?new RegExp(plain.map(esc).join('|'),'g'):null;
 }
 const word=c=>!!c&&/[\w฀-๿]/.test(c);
 function t(s){
  if(lang!=='en'||typeof s!=='string'||!THAI.test(s))return s;
  let out=cache.get(s);
  if(out!==undefined)return out;
  const core=s.trim();
  out=exact.get(core);
  const fill=(tp,parts)=>{
   const values={};
   tp.order.forEach((n,i)=>values[n]=t(parts[i]));
   return tp.en.replace(/\{(\d+)\}/g,(_,n)=>values[n]??'');
  };
  if(out===undefined)for(const tp of templates){
   const m=tp.re.exec(core);
   if(m){out=fill(tp,m.slice(1));break;}
  }
  if(out===undefined){
   const piece=(m,at,str)=>{
    const en=exact.get(m);
    if(en===undefined)return m;
    return (en&&word(str[at-1])?' ':'')+en+(en&&word(str[at+m.length])?' ':'');
   };
   out=core;
   for(const tp of templates)if(tp.inner&&THAI.test(out))out=out.replace(tp.inner,(...m)=>fill(tp,m.slice(1,tp.order.length+1)));
   if(phrases)out=out.replace(phrases,piece);
   out=out.replace(/[฀-๿]+/g,piece).replace(/ {2,}/g,' ').trim();
  }
  out=s.slice(0,s.length-s.trimStart().length)+(out??core)+s.slice(s.trimEnd().length);
  if(cache.size>4000)cache.clear();
  cache.set(s,out);
  return out;
 }
 // Player-written text (chat lines, names) carries data-i18n-skip and is never translated.
 const skip=el=>!el||el.closest('script,style,textarea,[data-i18n-skip]');
 function text(node){
  const v=node.nodeValue;
  if(!THAI.test(v)||skip(node.parentElement))return;
  const n=t(v);
  if(n!==v)node.nodeValue=n;
 }
 function attr(el,name){
  const v=el.getAttribute(name);
  if(v&&THAI.test(v)&&!skip(el.parentElement)){const n=t(v);if(n!==v)el.setAttribute(name,n);}
 }
 function walk(root){
  if(root.nodeType===3)return text(root);
  if(root.nodeType!==1)return;
  const it=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  for(let n=it.nextNode();n;n=it.nextNode())text(n);
  for(const name of ATTRS){
   if(root.hasAttribute(name))attr(root,name);
   for(const el of root.querySelectorAll('['+name+']'))attr(el,name);
  }
 }
 function setLang(next){
  try{localStorage.setItem(KEY,next);}catch{}
  location.reload();
 }
 globalThis.I18N={lang,t,setLang,locale:lang==='en'?'en-GB':'th-TH'};
 document.addEventListener('click',e=>{
  if(e.target.closest?.('[data-lang-toggle]'))setLang(lang==='en'?'th':'en');
 });
 if(lang!=='en')return;
 load(globalThis.I18N_EN||{});
 const root=document.documentElement;
 root.lang='en';
 root.style.setProperty('--chat-label','"Chat"');
 for(const k of ['alert','confirm','prompt']){
  const native=window[k].bind(window);
  window[k]=(message,...rest)=>native(t(String(message??'')),...rest);
 }
 walk(root);
 new MutationObserver(records=>{
  for(const r of records){
   if(r.type==='characterData')text(r.target);
   else if(r.type==='attributes')attr(r.target,r.attributeName);
   else for(const n of r.addedNodes)walk(n);
  }
 }).observe(root,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:ATTRS});
})();
