import test from 'node:test';import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {ITEMS} from '../items.js';
import {cardArt,cardTier,cardBackground,cardImageHTML} from '../card-art.js';

// Owner's card rule (CLAUDE.md, 9 Nov): a pixel picture per card plus one of four tier frames laid on top.
test('every card in the catalog has its new picture and a frame by tier',()=>{
 const cards=Object.keys(ITEMS).filter(id=>ITEMS[id].kind==='card'&&!id.startsWith('card-dg'));
 assert.ok(cards.length>=49);
 for(const id of cards){const a=cardArt(id);assert.ok(a,id);assert.ok(existsSync(new URL('../'+a.src,import.meta.url)),a.src);assert.ok(existsSync(new URL('../'+a.frame,import.meta.url)),a.frame);}
});
test('tiers follow the rule: awakened rainbow, world bosses and MVPs red, room bosses orange, the rest normal',()=>{
 assert.equal(cardTier('card-rat-chief-awakened'),'rainbow');
 assert.equal(cardTier('card-woodland-elephant'),'red');assert.equal(cardTier('card-straw-king'),'red');
 assert.equal(cardTier('card-lantern-lord'),'orange');assert.equal(cardTier('card-mill-keeper'),'orange');
 assert.equal(cardTier('card-rat-chief'),'normal');assert.equal(cardTier('card-vine-tiger'),'normal');
 assert.equal(cardArt('hp-small'),null);
});
test('the frame sits on top of the picture in both CSS and HTML forms',()=>{
 const css=cardBackground('card-vine-tiger');assert.match(css,/url\(assets\/cards278\/frame-normal\.webp\),url\(assets\/cards278\/vine-tiger\.webp\)/);
 const html=cardImageHTML('card-woodland-elephant',{name:'การ์ดคชสารพฤกษ์'});
 assert.ok(html.indexOf('woodland-elephant.webp')<html.indexOf('frame-red.webp'),'picture first, frame over it');
 assert.match(html,/card-art-name">คชสารพฤกษ์</);
});
test('the picture sits inside the frame window, never past the frame (owner 9 Nov)',()=>{
 const html=cardImageHTML('card-woodland-elephant');assert.match(html,/card-art-picture" style="left:8.2%;top:13.3%;width:83.5%;height:70.5%/);
 assert.match(cardBackground('card-vine-tiger'),/background-size:contain,59.13% 79%/);
});
