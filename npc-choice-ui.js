// Keep the farewell action visible while long service/quest lists scroll independently.
// Service hooks can still insert before the original close button without changing handlers.
export function skinNPCChoices(panel,leave){
 const actions=leave.parentElement;if(actions.querySelector('.npc-option-list'))return;
 actions.classList.add('npc-choice-actions');const list=document.createElement('div');list.className='npc-option-list';actions.prepend(list);
 const collect=()=>{for(const child of [...actions.children])if(child.tagName==='BUTTON'&&child!==leave)list.append(child);};
 collect();new MutationObserver(collect).observe(actions,{childList:true});
}
