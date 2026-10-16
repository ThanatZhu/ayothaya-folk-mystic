import {validateAppearance} from './appearance-state.js';
// Runtime layers keep the original illustrated sprite and are shared by lobby and game.
export function customizeAtlas(image,input={},classId='shaman',layout=null){
 const a=validateAppearance(input),c=document.createElement('canvas');c.width=image.width;c.height=image.height;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);c.appearance=a;
 if(Object.values(a).every(v=>v==='original'||v==='none'))return c;
 const anchors={novice:[[53,35],[51,35],[49,35],[54,34]],shaman:[[64,42],[57,42],[49,43],[51,44]],swordsman:[[57,41],[56,41],[51,42],[61,48]],lancer:[[52,44],[51,45],[48,47],[39,55]],hunter:[[57,38],[55,39],[50,40],[45,43]],boxer:[[55,40],[54,41],[51,42],[46,42]],rogue:[[53,42],[51,42],[49,42],[62,56]],acolyte:[[53,36],[51,36],[50,37],[49,39]]};
 const colors={indigo:[73,108,169],crimson:[165,59,68],ivory:[215,200,159],black:[38,34,39],brown:[100,65,45],silver:[163,174,178],green:[60,139,98],blue:[63,122,181]};
 const columns=layout?.columns??4,rows=layout?.rows??2,faceAnchors=layout?.anchors??anchors[classId];
 const data=ctx.getImageData(0,0,c.width,c.height),p=data.data,w=c.width/columns,h=c.height/rows;
 for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){
  const i=(y*c.width+x)*4;if(p[i+3]<100)continue;
  const u=(x%w)/w,v=(y%h)/h,r=p[i],g=p[i+1],b=p[i+2],lum=(r+g+b)/3;
  const [faceX,eyeY]=faceAnchors[Math.floor(x/w)];
  const hair=classId!=='acolyte'&&((u-faceX/100)/.23)**2+((v-(eyeY/100-.19))/.23)**2<1&&v<eyeY/100-.035&&lum<115&&r<g*1.7;
  // Target the original indigo fabric, never the skin, white hand wraps, red
  // weapon bindings, jade or steel. The old broad RGB test dyed bare arms blue.
  const indigo=b>r*.9&&b>g*1.04&&g<r*1.4&&r<150&&g<170&&lum>20;
  const robe=classId==='acolyte'&&(r>g*1.35&&b<g*.5||r>110&&g>r*.86&&b>r*.72);
  const cloth=v>.52&&v<.9&&u>.22&&u<.80&&(classId==='acolyte'?robe:indigo);
  const iris=Math.abs(v-eyeY/100)<.018&&(Math.abs(u-(faceX/100-.065))<.035||Math.abs(u-(faceX/100+.065))<.035)&&lum<65;
  const tint=hair&&a.hairColor!=='original'?colors[a.hairColor]:cloth&&a.outfit!=='original'?colors[a.outfit]:iris&&a.eyes!=='original'?colors[a.eyes]:null;
  if(tint)for(let k=0;k<3;k++)p[i+k]=Math.min(255,tint[k]*(.4+lum/150));
 }
 ctx.putImageData(data,0,0);
 for(let row=0;row<rows;row++)for(let col=0;col<columns;col++){
  ctx.save();ctx.translate(col*w,row*h);ctx.scale(w/100,h/100);ctx.imageSmoothingEnabled=false;
  const [fx,ey]=faceAnchors[col],hair=colors[a.hairColor]??[49,38,38];
  const paint=(k=1)=>`rgb(${hair.map(v=>Math.min(255,Math.round(v*k))).join(',')})`;
  if(a.garment==='cloak'){
   ctx.save();ctx.globalCompositeOperation='destination-over';ctx.fillStyle=a.outfit==='crimson'?'#843d48':a.outfit==='ivory'?'#c4b895':'#384d70';ctx.strokeStyle='#302f32';ctx.lineWidth=1;
   ctx.beginPath();ctx.moveTo(fx-15,ey+12);ctx.lineTo(fx+12,ey+12);ctx.lineTo(fx+21,88);ctx.quadraticCurveTo(fx,94,fx-27,87);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
  }
  if(a.garment==='shouldercloth'){
   ctx.fillStyle=a.outfit==='crimson'?'#a84a51':a.outfit==='ivory'?'#d4c49e':'#48648a';ctx.strokeStyle='#d6ad66';ctx.lineWidth=.6;
   ctx.beginPath();ctx.moveTo(fx-14,ey+12);ctx.lineTo(fx-9,ey+12);ctx.lineTo(fx+7,ey+29);ctx.lineTo(fx+3,ey+33);ctx.closePath();ctx.fill();ctx.stroke();
  }
  ctx.fillStyle=paint();ctx.strokeStyle=paint(.5);ctx.lineWidth=.65;
  if(a.hair==='topknot'&&classId!=='acolyte'){
   ctx.beginPath();ctx.ellipse(fx-10,Math.max(4,ey-32),6,4,-.25,0,Math.PI*2);ctx.fill();ctx.stroke();
   ctx.strokeStyle=paint(1.35);for(let k=0;k<4;k++){ctx.beginPath();ctx.ellipse(fx-12+k*1.5,Math.max(4,ey-32),1,3,-.3,0,Math.PI*2);ctx.stroke();}ctx.fillStyle='#c6a266';ctx.fillRect(fx-16,ey-29,11,1.2);
  }
  if(a.hair==='braid'&&classId!=='acolyte'){
   for(let k=0;k<9;k++){
    const bx=fx-19+(k%2)*1.1,by=ey-2+k*2;
    ctx.fillStyle=paint(k%2?1.05:.8);ctx.strokeStyle=paint(.5);ctx.beginPath();ctx.ellipse(bx,by,1.8,1.5,-.3,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.strokeStyle=paint(1.4);ctx.beginPath();ctx.moveTo(bx-.7,by-.5);ctx.lineTo(bx+.5,by+.6);ctx.stroke();
   }ctx.fillStyle='#b85c4d';ctx.fillRect(fx-20,ey+15,3,1);
  }
  if(a.beard!=='none'){
   ctx.strokeStyle='#44302a';ctx.lineWidth=.85;ctx.beginPath();ctx.moveTo(fx-4,ey+5);ctx.quadraticCurveTo(fx-2,ey+3.8,fx,ey+4.6);ctx.quadraticCurveTo(fx+2,ey+3.8,fx+4,ey+5);ctx.stroke();
   if(a.beard==='goatee'){ctx.fillStyle='#44302a';ctx.beginPath();ctx.moveTo(fx-2,ey+8);ctx.lineTo(fx+2,ey+8);ctx.lineTo(fx,ey+10);ctx.fill();}
  }
  if(a.tattoo!=='none'){
   ctx.strokeStyle='#354e50';ctx.lineWidth=.45;const ox=a.tattoo==='forehead'?fx:fx-12,oy=a.tattoo==='forehead'?ey-8:ey+15;
   ctx.beginPath();ctx.moveTo(ox,oy-2);ctx.lineTo(ox-1.5,oy);ctx.lineTo(ox,oy+2);ctx.lineTo(ox+1.5,oy);ctx.closePath();ctx.moveTo(ox-2,oy-2);ctx.lineTo(ox+2,oy-2);ctx.stroke();
  }
  ctx.restore();
 }
 return c;
}
