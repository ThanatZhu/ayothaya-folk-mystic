import {refineTier,refinePercent,REFINE_TIERS} from './refine-tiers.js';
export function refineTierBadge(item){
 if(!item||!refineTier(item.refine))return '';
 return `<span class="refine-tier" data-refine-tier="${refineTier(item.refine)}">Tier ${refineTier(item.refine)} · +${refinePercent(item.refine)}%</span>`;
}
export function refineTierTrack(level){
 return REFINE_TIERS.map(t=>`<li class="${level>=t.level?'reached':''} ${refineTier(level)===t.tier?'current':''}"><b>Tier ${t.tier}</b><span>+${t.level}</span><strong>+${t.percent}%</strong></li>`).join('');
}
