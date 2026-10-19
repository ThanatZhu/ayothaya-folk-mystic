// Draw the actual city footprint in world coordinates; never a menu of destinations.
// 0.59: `photo` = a straight-down render of the real scene over map.bounds; it replaces the vector ground layers.
import {MONSTER_TYPES} from './combat-core.js?v=97';
import {SHOPS} from './items.js?v=94';
import {MARKET_ZONE} from './market-board.js?v=70';
// 0.65 painted map markers from the UI icon sheet (assets/ui63, 6x4 cells of 256 px); dots are the fallback until it loads.
const ui=new Image();ui.src=new URL('./assets/ui63/ui-menu63.png?v=65',import.meta.url).href;
const ICON={portal:13,talk:14,shop:16,you:17,court:18,boss:19};
function mark(c,cell,x,y,size){if(!ui.complete||!ui.naturalWidth)return false;const i=cell-1;c.drawImage(ui,(i%6)*256,Math.floor(i/6)*256,256,256,x-size/2,y-size/2,size,size);return true;}
export function drawMap(canvas,map,player,{detailed=false,photo=null,mobs=[],npcs=[]}={}){
 const c=canvas.getContext('2d'),W=canvas.width,H=canvas.height,b=map.bounds,pad=detailed?48:7;
 const sx=(W-pad*2)/b.w,sz=(H-pad*2)/b.d,X=x=>pad+(x-b.x)*sx,Y=z=>pad+(z-b.z)*sz;
 const rect=(r,color)=>{c.fillStyle=color;c.fillRect(X(r.x),Y(r.z),r.w*sx,r.d*sz);};
 c.fillStyle='#9cae79';c.fillRect(0,0,W,H);
 if(photo){c.drawImage(photo,X(b.x),Y(b.z),b.w*sx,b.d*sz);if(detailed){c.fillStyle='#00000014';c.fillRect(0,0,W,H);}}else{
 for(const r of map.nav.zones)rect(r,'#bcc293');
 c.lineCap='round';c.strokeStyle='#eddbaf';
 for(const r of map.roads??[]){c.lineWidth=r.width*sx;c.beginPath();c.moveTo(X(r.a[0]),Y(r.a[1]));c.lineTo(X(r.b[0]),Y(r.b[1]));c.stroke();}
 c.fillStyle='#eddbaf';for(const [x,z,rx,rz] of map.plazas??[]){c.beginPath();c.ellipse(X(x),Y(z),rx*sx,rz*sz,0,0,Math.PI*2);c.fill();}
 for(const r of map.waterAreas??[]){rect(r,'#669a97');if(detailed){c.save();c.beginPath();c.rect(X(r.x),Y(r.z),r.w*sx,r.d*sz);c.clip();c.strokeStyle='#acd0bf66';c.lineWidth=3;for(let z=Y(r.z)+18;z<Y(r.z+r.d);z+=26){c.beginPath();c.moveTo(X(r.x),z);for(let x=X(r.x);x<X(r.x+r.w);x+=8)c.lineTo(x,z+Math.sin(x*.055+z)*3);c.stroke();}c.restore();}}
 for(const r of map.bridges??[]){rect(r,'#aa8054');if(detailed){c.strokeStyle='#e6c698';c.lineWidth=2;for(let x=X(r.x)+5;x<X(r.x+r.w);x+=9){c.beginPath();c.moveTo(x,Y(r.z));c.lineTo(x,Y(r.z+11));c.stroke();}}}
 for(const r of map.nav.obstacles){if((map.waterAreas??[]).some(a=>r.x>=a.x&&r.z>=a.z&&r.x+r.w<=a.x+a.w&&r.z+r.d<=a.z+a.d))continue;if(detailed)rect({...r,x:r.x+.45,z:r.z+.5},'#6b785a80');rect(r,'#906044');if(detailed){c.strokeStyle='#e0ac70';c.lineWidth=3;c.strokeRect(X(r.x)+2,Y(r.z)+2,r.w*sx-4,r.d*sz-4);c.beginPath();c.moveTo(X(r.x+r.w*.5),Y(r.z));c.lineTo(X(r.x+r.w*.5),Y(r.z+r.d));c.stroke();}}
 for(const p of map.plants??[]){if(!['tree','canopy19'].includes(p[0]))continue;const x=X(p[1]),y=Y(p[2]),r=detailed?12:2.4;c.fillStyle='#456c4b';c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();if(detailed){c.fillStyle='#739058';c.beginPath();c.arc(x-3,y-4,r*.7,0,Math.PI*2);c.fill();}}
 }
 if(detailed){
  c.textAlign='center';c.textBaseline='middle';c.font='bold 28px Mali, Tahoma, sans-serif';
  // 0.68.1 iOS Safari offsets centred text drawn with a maxWidth; centre it by its measured width instead.
  c.textAlign='left';for(const d of map.districts??[]){const x=X(d.x),y=Y(d.z)-27,text=d.name,tw=c.measureText(text).width,w=Math.ceil(tw)+30;c.fillStyle='#f5e8c8ed';c.strokeStyle='#92724e';c.lineWidth=2;c.beginPath();c.roundRect(x-w/2,y-22,w,44,9);c.fill();c.stroke();c.fillStyle='#493822';c.fillText(text,x-tw/2,y);}
  c.textAlign='left';c.font='bold 30px Mali, Tahoma, sans-serif';c.fillStyle='#294f48';c.fillText('N ↑',pad,pad/2);
  c.strokeStyle='#725b37';c.lineWidth=5;c.strokeRect(6,6,W-12,H-12);
 }
 // 0.64.1 live markers: monsters (red, gold for camp leaders) and NPCs, redrawn while the map is open.
 for(const m of mobs){if(m.hp<=0)continue;if(MONSTER_TYPES[m.type]?.boss&&mark(c,ICON.boss,X(m.x),Y(m.z),detailed?40:12))continue;c.fillStyle=m.leader?'#ffc23d':'#d9534a';c.beginPath();c.arc(X(m.x),Y(m.z),detailed?(m.leader?7:4.5):(m.leader?2.4:1.5),0,Math.PI*2);c.fill();}
 for(const n of npcs){if(!n.mentorId&&mark(c,SHOPS[n.name]?ICON.shop:ICON.talk,X(n.x),Y(n.z),detailed?30:9))continue;c.fillStyle=n.mentorId?'#ffe9a8':'#f4f0dc';c.strokeStyle='#3b2c1a';c.lineWidth=detailed?2:1;c.beginPath();c.arc(X(n.x),Y(n.z),detailed?6:2,0,Math.PI*2);c.fill();c.stroke();}
 for(const p of map.portals??[]){if(!mark(c,ICON.portal,X(p.x),Y(p.z),detailed?44:14)){c.fillStyle='#f7ce70';c.beginPath();c.arc(X(p.x),Y(p.z),detailed?10:3.5,0,Math.PI*2);c.fill();}c.fillStyle='#f7ce70';if(detailed){c.font='bold 21px Mali, Tahoma';c.textAlign='left';c.fillText('ทางเดินทาง',X(p.x)-c.measureText('ทางเดินทาง').width/2,Y(p.z)-26);}}
 // 0.70 the market street, where shops may be opened
 if(map.id===MARKET_ZONE.mapId){const z=MARKET_ZONE;c.save();c.setLineDash(detailed?[10,6]:[3,2]);c.strokeStyle='#e9c46a';c.lineWidth=detailed?3:1;c.strokeRect(X(z.x),Y(z.z),z.w*sx,z.d*sz);c.restore();mark(c,ICON.shop,X(z.x+z.w/2),Y(z.z+z.d/2),detailed?40:12);if(detailed){c.font='bold 22px Mali, Tahoma';c.textAlign='left';const t='ตลาดกลาง';c.fillStyle='#ffe5ab';c.fillText(t,X(z.x+z.w/2)-c.measureText(t).width/2,Y(z.z+z.d/2)+34);}}
 if(map.masterCourt&&mark(c,ICON.court,X(map.masterCourt.x),Y(map.masterCourt.z),detailed?48:14)){}else if(map.masterCourt){const x=X(map.masterCourt.x),y=Y(map.masterCourt.z);c.fillStyle='#674726';c.beginPath();c.arc(x,y,detailed?16:5,0,Math.PI*2);c.fill();c.fillStyle='#ffda78';c.textAlign='center';c.textBaseline='middle';c.font=`bold ${detailed?27:10}px sans-serif`;c.fillText('★',x,y);}
 const px=X(player.x),py=Y(player.z),r=detailed?13:4;if(!mark(c,ICON.you,px,py,detailed?40:13)){c.fillStyle='#183d35';c.beginPath();c.arc(px,py,r+5,0,Math.PI*2);c.fill();c.fillStyle='#a8ffe0';c.beginPath();c.arc(px,py,r,0,Math.PI*2);c.fill();}
 if(detailed){c.font='bold 25px Mali, Tahoma, sans-serif';c.textAlign='center';c.strokeStyle='#19392f';c.lineWidth=7;c.strokeText('คุณ',px,py+34);c.fillStyle='#f4ffeb';c.fillText('คุณ',px,py+34);}
}
