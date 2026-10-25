import {STORY} from './story-quests.js?v=refine136';
import {STORY_RECAP,storyArt} from './story-dialogue.js?v=pets125';
// Presentation only: neither sampling nor watching a scene can grant progress or rewards.
const CHAPTER_BEATS={
 t1:['ค่ำคืนหนึ่งที่ท่าน้ำอโยธยา แสงประทีปดับลงพร้อมกัน','เสียงของคนเมืองนำทางผู้มาเยือนสู่จุดเริ่มต้น'],
 t2:['อาวุธในมือคือคำสัญญาว่าจะปกป้องตนเอง','ก่อนออกเดินทาง จงเตรียมสิ่งที่ครูมอบให้'],
 t3:['เส้นด้ายสีทองเชื่อมผู้คนกับเมืองที่พวกเขารัก','เรื่องเล่าจากสามคนกำลังต่อเป็นร่องรอยเดียว'],
 t4:['นอกประตูเมือง ทุ่งข้าวยังไหวทั้งที่ลมหยุดนิ่ง','แสงประหลาดทอดยาวไปถึงยุ้งข้าว'],
 t5:['ร่างฟางลุกขึ้นท่ามกลางรวงข้าว','จงเตรียมเผชิญหน้า แล้วนำคำตอบกลับมาหาป้าละไม'],
 t6:['กำลังเพียงอย่างเดียวอาจไม่พอให้เดินทางต่อ','วิชาแรกกำลังรอให้ผู้ฝึกตนค้นพบ'],
 t7:['เสียงข่วนดังมาจากใต้ยุ้งข้าว','เศษสายใยกระจัดกระจายอยู่ในที่ที่ไม่มีใครมอง'],
 t8:['คมอาวุธสะท้อนแสงจากเตาหลอม','เหล็กน้ำพี้จะมีค่า เมื่ออยู่ในมือของช่างผู้ชำนาญ'],
 t9:['รอยประทับเล็ก ๆ เก็บพลังของผู้เคยอาศัยอยู่ที่นี่','เรียนรู้การใช้การ์ด ก่อนก้าวสู่เส้นทางถัดไป'],
 t10:['คลองเก่าพาเรื่องเล่าลึกเข้าไปในสวนหมาก','ระหว่างต้นไม้ มีแสงโคมที่ไม่ได้แขวนไว้โดยคน'],
 t11:['กลิ่นสมุนไพรช่วยให้ใจสงบลงชั่วขณะ','ผู้เดินทางต้องเรียนรู้การดูแลตนเองด้วย'],
 t12:['โคมลอยผ่านสวนที่เงียบเกินไป','ตามหาร่องรอยของสายใย ท่ามกลางแสงที่หลอกตา'],
 t14:['เสียงผู้คนกลับมาคึกคักที่ตลาดแม่บัว','การเดินทางยาวไกล เริ่มจากเสบียงที่เตรียมพร้อม'],
 t15:['เงาจันทร์ทอดลงบนโรงสีที่หยุดหมุน','เรื่องของจ้อยจะนำทางไปสู่ต้นตอในความมืด'],
 t16:['ใต้พื้นไม้ เสียงกระซิบยังไม่เงียบลง','ก้าวลงไปอย่างระมัดระวัง ยังมีสิ่งที่ต้องค้นหา'],
 t17:['เมื่อวิชาเดิมฝึกจนชำนาญ เส้นทางใหม่จึงเปิดออก','ผู้เป็นครูจะทดสอบความพร้อมของผู้ฝึกตน'],
 t18:['ข่าวจากบึงบัวเดินทางมาถึงเมืองหลวง','สายใยที่ขาดไปอาจทอดยาวกว่าที่ทุกคนคิด'],
 t19:['ผิวน้ำแตกออกพร้อมเสียงฝีเท้าจากพงอ้อ','อย่าประมาทเจ้าถิ่นแห่งบึงบัว'],
 t20:['แสงโคมลวงตากลับมาท่ามกลางหมอกเหนือบึง','จับตาร่องรอยที่แท้จริง แทนที่จะหลงตามแสง'],
 t21:['เงาใหญ่ไหวอยู่หลังดอกบัวและรากไม้','เตรียมเผชิญหน้าพญาวานร แล้วนำข่าวกลับเมือง'],
 t22:['สายใยไม่ได้ผูกเพียงเมือง แต่เชื่อมผู้คนเข้าด้วยกัน','บางเส้นทางจะเดินได้ไกลกว่า เมื่อมีพวกพ้อง'],
 t23:['ลานประลองเปิดรับผู้ที่ต้องการพิสูจน์วิชา','ความกล้าหาญมาพร้อมการให้เกียรติคู่ประลอง']
};
export function storyScene(questIndex,stepIndex){
 const quest=STORY[questIndex],step=quest?.steps[stepIndex];if(!step)return null;
 const beats=CHAPTER_BEATS[quest.id];if(!beats)throw Error('Missing cinematic '+quest.id);
 return {id:`story:${quest.id}:${stepIndex}`,questIndex,stepIndex,title:quest.title,step,art:storyArt(quest.id,stepIndex+1),duration:14,
  captions:[beats[0],step.say??beats[1],step.hint+(step.how?' · '+step.how:'')],recap:STORY_RECAP[quest.id]};
}
export function sceneUnlocked(scene,state){return !!scene&&!!state&&(scene.questIndex<state.quest||scene.questIndex===state.quest&&(state.done||scene.stepIndex<=state.step));}
export function taskScene({kind='training',title,goal,npc,monster}){
 return {id:kind+':'+title,title,step:{type:monster?'defeat':'talk',npc:npc?.name,monster},npc,art:storyArt(monster?.startsWith('marsh')||monster==='bog-lantern'?'t19':'t4'),duration:12,
 captions:[kind==='training'?'เส้นทางสู่ความชำนาญ เริ่มต้นจากบททดสอบของครู':'คำขอจากผู้คนแห่งอโยธยา',goal??title,'กลับไปทำภารกิจในโลกจริง · ฉากตัวอย่างนี้ไม่เปลี่ยนความคืบหน้า']};
}
const clamp=x=>Math.max(0,Math.min(1,x)),smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
export function sampleScene(scene,seconds,reduced=false){
 const t=Math.max(0,Math.min(scene.duration,Number.isFinite(seconds)?seconds:0)),phase=t<3?0:t<10?1:2,p=smooth(t/3),combat=scene.step.type==='defeat',practice=scene.step.type==='do'&&['equip','skill','auto','refine','card'].includes(scene.step.action);
 return {time:t,phase,caption:scene.captions[phase],camera:reduced?1:1+.065*smooth(t/scene.duration),
  heroX:reduced?.43:.16+.27*p,heroAction:!reduced&&t<3?'walk':!reduced&&phase===1&&(combat||practice)?'attack':'idle',
  npcX:.69,npcAction:phase===1?'talk':'idle',monsterX:.7-(combat&&!reduced?.025*Math.sin(t*1.6):0),
  glow:phase===1?Math.sin((t-3)/7*Math.PI):0,done:t>=scene.duration};
}
