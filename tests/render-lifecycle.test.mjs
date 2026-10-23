import test from 'node:test';
import assert from 'node:assert/strict';
import {bindRenderLifecycle} from '../render-lifecycle.js';
test('back/forward cache retains the scene and resizes it on return; real exit disposes',()=>{
 const target=new EventTarget();let disposed=0,resized=0;
 const unbind=bindRenderLifecycle({target,dispose:()=>disposed++,resize:()=>resized++});
 const fire=(name,persisted)=>target.dispatchEvent(Object.assign(new Event(name),{persisted}));
 fire('pagehide',true);assert.equal(disposed,0);
 fire('pageshow',true);assert.equal(resized,1);
 fire('pagehide',false);assert.equal(disposed,1);
 unbind();fire('pagehide',false);assert.equal(disposed,1);
});
