// 0.101 the big sala between the two chedis (Ayutthaya, x -6.3..6.3, z -55..-39) stands on 2.55 m stilts, above the
// bake's STEP_MAX, so bake-nav-v2.py leaves it blocked. Stamp its deck and front stairs into the walk grid instead.
// Measured from maps/v2/ayutthaya.glb: floorboards top 2.55, rails at x ±6.2 and z -39 / -55, stairs x -2..2 from z -34.75.
// Idempotent; run again after re-baking the capital's grid into maps/world.json: node scripts/stamp-sala-deck.mjs
import {readFile,writeFile} from 'node:fs/promises';
const DECK=2.55,code=h=>String.fromCharCode(97+Math.round(h/.05));
function stampSalaDeck(g){
 const rows=g.rows.map(r=>[...r]),set=(x,z,c)=>{rows[(z-g.z0)/g.cell][(x-g.x0)/g.cell]=c;};
 // Rails and the outer posts stay solid; the deck keeps a 1 m margin inside them (cells x -5..5, z -54..-40).
 for(let z=-55;z<=-39;z++)for(let x=-6;x<=6;x++)set(x,z,Math.abs(x)===6||z===-55||z===-39?'.':code(DECK));
 for(const x of [-5,5])for(const z of [-54,-40])set(x,z,'.');
 // Stairs: an even ramp between ground (z -34) and the deck edge (z -39); bilinear groundHeight smooths it.
 // The stringers at x ±2 block, so only the middle three cells climb.
 for(let z=-39;z<=-35;z++)for(let x=-2;x<=2;x++)set(x,z,Math.abs(x)===2?'.':code(DECK*(-34-z)/5));
 return {...g,rows:rows.map(r=>r.join(''))};
}
const worldPath=new URL('../maps/world.json',import.meta.url),world=JSON.parse(await readFile(worldPath,'utf8')),map=world.maps.find(m=>m.id==='ayutthaya');
map.nav.grid=stampSalaDeck(map.nav.grid);await writeFile(worldPath,JSON.stringify(world,null,2)+'\n');
console.log('sala deck stamped');
