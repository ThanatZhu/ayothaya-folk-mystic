// Monster card art (owner's rule, 9 Nov 2026 — see CLAUDE.md "Monster card art"): one pixel picture per card in
// assets/cards278/<monster id>.webp and one of four tier frames laid on top. The game writes the card name on the plaque.
import {MONSTER_TYPES} from './combat-core.js?v=surfaces222';
export const CARD_ART_DIR='assets/cards278/';
const TYPES=new Map(MONSTER_TYPES.map(t=>[t.id,t]));
const ART=new Set(['straw','rat','hopper','monkey','vine','lantern','rat-chief','rat-chief-awakened','rice-world-guardian','monkey-chief','monkey-chief-awakened',
 'orchard-world-guardian','mill-keeper','mill-keeper-awakened','straw-king','mill-world-guardian','marsh-rat','bog-hopper','lotus-vine','bog-lantern','marsh-ape',
 'marsh-ape-awakened','marsh-world-guardian','bamboo-sprout','hungry-pop','bamboo-bat','bamboo-ward','pop-grove-lord','clay-temple-doll','haunted-bell',
 'walking-bricks','stone-gate-guardian','abandoned-bell-curse','mist-cap','crystal-tusk-boar','leaf-flame-bird','vine-tiger','woodland-elephant',
 'cave-crystal-toad','jade-scale-hatchling','glowstone-crab','stream-serpent','underwater-naga-guardian','stone-mist-hare','wind-mountain-bird',
 'crystal-horn-goat','stone-garuda','cloud-peak-yaksha','lantern-lord']);
// Each frame's transparent window, % of the card [left,right,top,bottom], measured from the frames and grown .6% under
// the frame edge. The pictures are cropped to these shapes, so they fill the window exactly and never spill outside.
export const CARD_WINDOW={normal:[6.3,6.2,8.6,15],orange:[7.7,7.7,11.1,15],red:[8.8,8.9,15,16.8],rainbow:[8.7,8.7,16,17.2]};
const base=id=>typeof id==='string'&&id.startsWith('card-')?id.slice(5):null;
// ธรรมดา normal monsters and chiefs · ส้ม room bosses · แดง map world bosses and MVPs · รุ้ง awakened bosses
export function cardTier(id){const t=TYPES.get(base(id));if(!t)return 'normal';return t.awakened?'rainbow':t.worldBoss||t.mvp?'red':t.boss?'orange':'normal';}
export function cardArt(id){const b=base(id);if(!ART.has(b))return null;const tier=cardTier(id);return {src:CARD_ART_DIR+b+'.webp',frame:CARD_ART_DIR+'frame-'+tier+'.webp',tier,window:CARD_WINDOW[tier]};}
// For icons drawn as a CSS background: the frame is the top layer.
// The icon box is square: the 2:3 card is centred in it (frame 'contain') and the picture fills only the frame's window.
export function cardBackground(id){const a=cardArt(id);if(!a)return '';const [l,r,t,b]=a.window.map(v=>v/100),k=2/3;
 const w=(1-l-r)*k,h=1-t-b,x=(1-k)/2+l*k,y=t,pct=(off,size)=>+(off/(1-size)*100).toFixed(2)+'%',p=v=>+(v*100).toFixed(2)+'%';
 return `background-image:url(${a.frame}),url(${a.src});background-size:contain,${p(w)} ${p(h)};background-position:center,${pct(x,w)} ${pct(y,h)};background-repeat:no-repeat,no-repeat;background-color:transparent`;}
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
// For larger views: picture, frame over it, and the name on the plaque.
export function cardImageHTML(id,{name='',cls='',lazy=true}={}){
 const a=cardArt(id);if(!a)return '';const load=lazy?' loading="lazy"':'';
 const [l,r,t,b]=a.window;
 return `<span class="card-art card-art-${a.tier} ${esc(cls)}"><img class="card-art-picture" style="left:${l}%;top:${t}%;width:${+(100-l-r).toFixed(2)}%;height:${+(100-t-b).toFixed(2)}%" src="${a.src}" alt="${esc(name)}" width="384" height="576"${load} decoding="async"><img class="card-art-frame" src="${a.frame}" alt="" width="384" height="576"${load} decoding="async" aria-hidden="true">${name?`<span class="card-art-name">${esc(name)}</span>`:''}</span>`;
}
// Layout of the layered card, injected once in the browser (the server never loads this file for drawing).
if(typeof document!=='undefined'&&!document.getElementById('card-art-style')){const st=document.createElement('style');st.id='card-art-style';
 st.textContent='.card-art{position:relative;display:inline-block;aspect-ratio:2/3;line-height:0;container-type:inline-size;overflow:hidden}.card-art>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.card-art-picture{image-rendering:pixelated}.card-art-name{position:absolute;left:9%;right:9%;bottom:4%;height:10%;display:flex;align-items:center;justify-content:center;font-family:var(--font-game);font-weight:700;font-size:clamp(7px,6.5cqw,18px);line-height:1;color:#fff0ce;text-shadow:0 1px 2px #000;white-space:nowrap;overflow:hidden}.card-art-normal .card-art-name{color:#4a2a12;text-shadow:0 1px 0 #fff8}';
 document.head.append(st);}
