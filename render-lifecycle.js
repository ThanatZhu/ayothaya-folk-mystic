// A page kept in the back/forward cache must retain its GPU resources.
export function bindRenderLifecycle({target=window,dispose,resize}){
 const hide=e=>{if(!e.persisted)dispose();};
 const show=e=>{if(e.persisted)resize();};
 target.addEventListener('pagehide',hide);target.addEventListener('pageshow',show);
 return ()=>{target.removeEventListener('pagehide',hide);target.removeEventListener('pageshow',show);};
}
