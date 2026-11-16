// One shared choreography for amulet seals and companion eggs. No draw/reward logic.
export const GACHA_MOTION=Object.freeze({gather:840,anticipation:300,impact:260,arrival:420,stagger:40});
export function createRitualFocus(scene,art){
 const focus=document.createElement('div');focus.className='gacha-ritual-focus';focus.setAttribute('aria-hidden','true');
 focus.innerHTML='<span class="gacha-ritual-aura"></span><span class="gacha-ritual-ring"></span><span class="gacha-ritual-ring gacha-ritual-ring-inner"></span><img alt="" draggable="false"><span class="gacha-ritual-impact"></span>';
 focus.querySelector('img').src=art;scene.prepend(focus);return focus;
}
