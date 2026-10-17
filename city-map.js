// Draw the actual city footprint in world coordinates; never a menu of destinations.
// 0.59: `photo` = a straight-down render of the real scene over map.bounds; it replaces the vector ground layers.
export function drawMap(canvas,map,player,{detailed=false,photo=null}={}){
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
  for(const d of map.districts??[]){const x=X(d.x),y=Y(d.z)-27,text=d.name,w=c.measureText(text).width+24;c.fillStyle='#f5e8c8ed';c.strokeStyle='#92724e';c.lineWidth=2;c.beginPath();c.roundRect(x-w/2,y-22,w,44,9);c.fill();c.stroke();c.fillStyle='#493822';c.fillText(text,x,y);}
  c.textAlign='left';c.font='bold 30px Mali, Tahoma, sans-serif';c.fillStyle='#294f48';c.fillText('N ↑',pad,pad/2);
  c.strokeStyle='#725b37';c.lineWidth=5;c.strokeRect(6,6,W-12,H-12);
 }
 for(const p of map.portals??[]){c.fillStyle='#f7ce70';c.beginPath();c.arc(X(p.x),Y(p.z),detailed?10:3.5,0,Math.PI*2);c.fill();if(detailed){c.font='bold 21px Mali, Tahoma';c.fillText('ทางเดินทาง',X(p.x),Y(p.z)-18);}}
 if(map.masterCourt){const x=X(map.masterCourt.x),y=Y(map.masterCourt.z);c.fillStyle='#674726';c.beginPath();c.arc(x,y,detailed?16:5,0,Math.PI*2);c.fill();c.fillStyle='#ffda78';c.textAlign='center';c.textBaseline='middle';c.font=`bold ${detailed?27:10}px sans-serif`;c.fillText('★',x,y);}
 const px=X(player.x),py=Y(player.z),r=detailed?13:4;c.fillStyle='#183d35';c.beginPath();c.arc(px,py,r+5,0,Math.PI*2);c.fill();c.fillStyle='#a8ffe0';c.beginPath();c.arc(px,py,r,0,Math.PI*2);c.fill();
 if(detailed){c.font='bold 25px Mali, Tahoma, sans-serif';c.textAlign='center';c.strokeStyle='#19392f';c.lineWidth=7;c.strokeText('คุณ',px,py+34);c.fillStyle='#f4ffeb';c.fillText('คุณ',px,py+34);}
}
