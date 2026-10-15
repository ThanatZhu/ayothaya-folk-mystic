import {readFile,writeFile} from 'node:fs/promises';
const path=new URL('../maps/world.json',import.meta.url),catalog=JSON.parse(await readFile(path,'utf8'));
const city=catalog.maps.find(m=>m.id==='ayutthaya');
city.portals=[{to:'rice-fields',x:0,z:2.5}];
city.bridges=[0,-32,-70].map(z=>({x:-32,z:z-5.5,w:8,d:11}));
const base=(id,name,theme,level)=>({id,name,subtitle:level+' · '+(theme==='mill'?'โรงสีร้างและลานหุ่นฟาง':theme==='rice'?'คันนา โรงสี และศาลขวัญข้าว':'สวนหมาก ศาลริมน้ำ และสวนผลไม้'),safe:false,kind:theme==='mill'?'dungeon':'field',region:'ayutthaya',procedural:theme,color:theme==='mill'?'#809898':'#c9bc7b',spawn:{x:0,z:55},bounds:{x:-76,z:-82,w:152,d:150},nav:{zones:[{x:-72,z:-78,w:144,d:142}],obstacles:[],props:[]},plants:[],npcs:[],mobs:[],portals:[],landmarks:[],leafSources:[],roads:[{a:[0,61],b:[0,-68],width:10},{a:[-60,14],b:[60,14],width:8},{a:[-50,-38],b:[50,-38],width:8}],plazas:[[0,55,12,9],[0,14,11,10],[0,-38,13,11]],waterAreas:[],bridges:[],decor:[],districts:[]});
const rice=base('rice-fields','ทุ่งขวัญข้าว','rice','Lv. 1–12'),orchard=base('old-orchard','สวนหมากคลองเก่า','orchard','Lv. 10–22'),mill=base('moonlit-mill','โรงสีใต้เงาจันทร์','mill','Lv. 15–25 · แนะนำปาร์ตี้');
rice.portals=[{to:'ayutthaya',x:0,z:59},{to:orchard.id,x:0,z:-68}];orchard.portals=[{to:rice.id,x:0,z:59},{to:mill.id,x:0,z:-68}];mill.portals=[{to:orchard.id,x:0,z:59}];
for(const m of [rice,orchard,mill]){
 const canalX=m===orchard?-22:32;
 m.waterAreas.push({x:canalX,z:-77,w:7,d:140});
 for(const [z,d] of [[-77,35],[-34,44],[18,45]])m.nav.obstacles.push({x:canalX,z,w:7,d});
 for(const z of [-38,14])m.bridges.push({x:canalX-2,z:z-4,w:11,d:8});
 m.districts=[{name:m===rice?'ลานขวัญข้าว':m===orchard?'ศาลริมคลอง':'ท่าโรงสี',x:0,z:48},{name:m===rice?'ยุ้งข้าวเก่า':m===orchard?'สวนมะม่วง':'ลานหุ่นฟาง',x:-25,z:14},{name:m===rice?'คันนาปลายคลอง':m===orchard?'ดงโคมหลง':'โรงสีร้าง',x:0,z:-38}];
 // Leave roads and arrival plazas clear; all hard footprints enter server navigation.
 let seed=m===rice?381:m===orchard?382:383;const rnd=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
 for(let i=0;i<100;i++){const x=-68+rnd()*136,z=-73+rnd()*132;if(Math.abs(x)<12||Math.abs(z-14)<8||Math.abs(z+38)<8||x>canalX-4&&x<canalX+11)continue;const h=5+rnd()*3;m.plants.push(['canopy19',x,z,h*.85,h,false]);m.nav.props.push([x,z,.45]);m.leafSources.push([x,h*.8,z]);}
 const structures=m===mill?[[-13,-49,0,12,13],[22,-52,1,7,7],[-35,4,1,6,6]]:m===rice?[[-24,30,1,7,7],[50,-28,0,10,11],[-26,-49,2,3,4]]:[[-12,31,2,3,4],[45,-50,1,7,7],[-48,30,1,7,7]];
 for(const [x,z,asset,w,h]of structures){m.decor.push({x,z,asset,w,h});m.nav.obstacles.push({x:x-w*.3,z:z-1.8,w:w*.6,d:3.6});}
 m.npcs.push({name:m===rice?'ป้าละไม':m===orchard?'ยายสาย':'จ้อย',x:-4,z:53,texture:m===rice?1:m===orchard?0:2,text:m===rice?'ช่วยดูยุ้งข้าวให้ป้าที หุ่นฟางขยับเองเมื่อคืน… ถ้าเหนื่อยกลับเข้าประตูเมืองได้เลย':m===orchard?'โคมที่ลอยอยู่ในสวนกำลังตามหาชื่อของมัน อย่าเดินเข้าใกล้ตอนมันรวบแสงนะลูก':'ข้างในมีคนเฝ้าโรงสี เขาจำไม่ได้แล้วว่าตัวเองกำลังรอใครอยู่… ชวนเพื่อนมาด้วยนะ'});m.nav.props.push([-4,53,.45]);
}
rice.mobs=[[5,43,4],[-7,36,5],[13,27,6],[-19,15,4],[-34,17,5],[-49,12,6],[19,8,5],[47,14,4],[53,1,6],[-15,-18,4],[-40,-34,5],[12,-40,6],[48,-39,4],[-43,-60,10]];
orchard.mobs=[[7,40,7],[-8,29,8],[15,21,9],[-37,14,7],[38,14,8],[52,-4,9],[-42,-16,7],[12,-27,8],[27,-38,9],[-45,-49,11]];
mill.mobs=[[8,38,4],[-9,28,9],[20,14,8],[-27,14,4],[-14,-9,9],[17,-21,4],[0,-40,12]];
catalog.version=38;catalog.maps=[city,rice,orchard,mill];await writeFile(path,JSON.stringify(catalog,null,2)+'\n');console.log('Four connected maps written');
