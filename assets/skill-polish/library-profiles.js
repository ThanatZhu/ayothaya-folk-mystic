import {ALL_SKILLS,roleById} from '../skills-next/catalog.js';
import {LEGACY_SKILLS} from '../skills-next/catalog-legacy.js';
import {sampleClip} from './timing.js';

export const PAINTED_SHEETS={
 sword:'./assets/skill-polish/cross-slash-v1.png',rooster:'./assets/skill-polish/rooster-dash-v1.png',lotus:'./assets/skill-polish/lotus-revive-v1.png',
 ...Object.fromEntries(['shield','lance','arrow','fist','shadow','venom','spirit','talisman','holy','vines','banner','dust','life-tree','rooster-crow'].map(k=>[k,`./assets/skill-polish/library/${k}-v1.png`]))
};
const L=(sheet,start=.6,span=1.2,scale=2.4,extra={})=>({sheet,start,span,scale,anchor:'target',mode:'pulse',count:1,rotation:0,opacity:1,...extra});
const castGlow=(sheet='talisman',extra={})=>L(sheet,.12,.65,1.15,{anchor:'hero',opacity:.55,...extra});
const self=(sheet,scale=2.4,extra={})=>L(sheet,.45,1.8,scale,{anchor:'hero',...extra});
const hit=(sheet='sword',at=.72,scale=2.6,extra={})=>L(sheet,at-.12,1.1,scale,extra);
const shot=(sheet='arrow',at=.72,extra={})=>L(sheet,.28,1.1,1.7,{mode:'travel',arrival:at,...extra});
const field=(sheet,at=.7,scale=3.6,extra={})=>L(sheet,at-.2,2.4,scale,{mode:'hold',ground:true,y:.035,...extra});
const ring=(sheet,at=.7,scale=1.8,extra={})=>L(sheet,at-.2,2,scale,{mode:'orbit',count:4,radius:1.35,...extra});
const poses={swordsman:{cast:5,strike:6,second:7,guard:8},lancer:{cast:5,strike:6,second:7,guard:8},hunter:{cast:6,strike:7,second:8,guard:5},boxer:{cast:5,strike:6,second:7,guard:0},rogue:{cast:5,strike:6,second:7,guard:5},shaman:{cast:8,strike:9,second:6,guard:8},acolyte:{cast:11,strike:7,second:8,guard:9}};
const profiles={};
function define(id,layers,extra={}){
 const skill=LEGACY_SKILLS.find(s=>s.id===id);if(!skill)throw new Error('Missing skill '+id);
 profiles[id]={id,skill,classId:skill.classId,title:skill.name,color:roleById(skill.classId).color,layers,impacts:[.72],duration:3.6,movement:'none',target:'enemy',scenario:skill.tip,...extra};
 return profiles[id];
}
// Each entry explicitly composes shapes, origins, timings and travel for its role.
define('challenge',[castGlow('banner'),self('banner',3.2),ring('banner',.8,1.2,{anchor:'hero',radius:2,count:3})],{target:'self',scenario:'มอนกำลังรุมเพื่อน → คำรามดึงความสนใจกลับมาที่นักดาบ'});
define('guard',[self('shield',2.6,{mode:'hold'}),hit('sword',1.12,1,{anchor:'hero',x:.8})],{target:'self',impacts:[1.12],motion:'guard',scenario:'หันโล่รับการโจมตีจากด้านหน้า → โล่สะเทือนและเกิดประกาย'});
define('intercept',[self('dust',1.7,{ground:true,span:1}),L('shield',.56,1.6,2.1,{anchor:'hero',mode:'hold'}),L('holy',.72,1.1,.65,{mode:'link',count:4})],{target:'ally',movement:'intercept',motion:'guard'});
define('cleave',[hit('sword',.72,3,{rotation:-.65,mode:'sweep'}),hit('dust',.82,2.4,{ground:true,opacity:.5})],{target:'group',movement:'lunge'});
define('break',[hit('sword',.78,2.7,{rotation:.3}),hit('shield',.8,1.7,{frameFrom:5}),hit('holy',.87,.85)],{movement:'lunge',impacts:[.78],motion:'heavy'});
define('counter',[self('shield',2.2,{mode:'hold',span:1.15}),hit('sword',1.12,2.7,{mode:'sweep'})],{target:'self',motion:'counter',impacts:[1.12],scenario:'ตั้งดาบรับก่อน → ถูกตีหนึ่งครั้ง → สวนคมกลับทันที'});
define('bastion',[castGlow('holy'),ring('shield',.8,2.2,{anchor:'ally',radius:1.4,count:5,mode:'dome'}),field('holy',.8,4.4,{anchor:'ally',opacity:.35})],{target:'ally',duration:4.1,motion:'guard'});
define('shield-link',[self('shield',1.7,{mode:'hold'}),L('shield',.6,2.1,.7,{mode:'link',count:5}),L('shield',.7,2.1,2,{anchor:'ally',mode:'hold'})],{target:'ally',motion:'guard',scenario:'เชื่อมโล่กับเพื่อน → เส้นพลังไหลกลับมารับแรงแทน'});
define('last-stand',[self('banner',3.1),self('lotus',2.2,{y:.02,base:true}),self('shield',2.7,{start:.9,mode:'hold'})],{target:'self',duration:4.2,scenario:'HP ใกล้หมด → ฮึดคืนขวัญและสร้างโล่คุ้มกาย'});
define('gale-riposte',[self('shield',1.8,{span:1}),hit('sword',.95,2.7,{rotation:.45,mode:'sweep'}),hit('sword',1.2,2.4,{rotation:-.45})],{movement:'lunge',impacts:[.95,1.2],motion:'counter'});
define('blade-brand',[hit('sword',.76,2.3),L('talisman',.78,2.2,1.35,{mode:'hold'}),hit('shield',.84,1.5,{frameFrom:5,opacity:.55})],{movement:'lunge',impacts:[.76]});
define('cross-finish',[hit('sword',.74,2.65)],{approved:'sword',duration:3.2,impacts:[.74,1.08],movement:'lunge'});

define('pierce',[shot('lance',.76),hit('lance',.8,1.6,{x:1.2,opacity:.5})],{movement:'lunge',impacts:[.76],motion:'thrust',target:'group'});
define('brace',[L('lance',.42,1.6,2.3,{mode:'hold',anchor:'hero',rotation:.3}),hit('fist',.85,1.5)],{impacts:[.85],motion:'guard',scenario:'ลดปลายทวนสกัดท่าพุ่ง → แรงปะทะหยุดมอนที่แนวทวน'});
define('sweep',[hit('lance',.72,3.3,{rotation:-.5,mode:'sweep'}),field('dust',.76,3,{span:1.3,opacity:.65})],{target:'group',movement:'lunge',targetMotion:'push'});
define('spear-zone',[field('talisman',.8,3.9,{opacity:.45}),ring('lance',.8,1.8,{count:5,rotation:Math.PI/2,mode:'planted'})],{target:'group',duration:4.2,motion:'plant'});
define('step',[self('dust',2.5,{ground:true,span:1.2}),self('lance',1.4,{start:.7,opacity:.3})],{target:'self',movement:'retreat',motion:'evade',impacts:[]});
define('sky-spear',[field('talisman',.7,2.7,{opacity:.3,span:.9}),L('lance',.75,1.5,2.4,{mode:'rain',count:1,arrival:1.12}),hit('dust',1.16,3,{ground:true})],{impacts:[1.12],duration:4,motion:'sky'});
define('spear-wall',[L('lance',.55,2.5,2.6,{mode:'wall',count:5,spacing:.8,rotation:Math.PI/2}),field('talisman',.8,4.5,{opacity:.25})],{target:'group',motion:'plant',duration:4.2});
define('hook',[shot('lance',.7,{reverse:true}),L('talisman',.7,1,.7,{mode:'link',count:4,reverse:true}),hit('dust',1.02,1.8,{ground:true})],{impacts:[.7],targetMotion:'pull',motion:'thrust'});
define('phalanx',[shot('lance',.85,{count:3,spread:1.4}),L('shield',.55,2.2,2,{mode:'wall',count:3,anchor:'ally',spacing:1.1})],{target:'group',impacts:[.85],movement:'lunge',motion:'thrust'});
define('naga-drill',[shot('lance',.9,{scale:2.65,rotation:.12}),shot('spirit',.9,{scale:2.3,opacity:.5}),hit('shield',.94,2,{frameFrom:5})],{movement:'lunge',impacts:[.9],motion:'thrust',target:'group'});
define('chain-pierce',[shot('lance',.68,{scale:2.3}),shot('lance',.98,{start:.58,scale:1.9,x:1}),shot('lance',1.2,{start:.84,scale:1.6,x:2})],{target:'group',impacts:[.68,.98,1.2],motion:'thrust'});
define('spear-storm',[field('talisman',.9,4.3,{opacity:.3}),L('lance',.9,2.2,2.1,{mode:'rain',count:9,arrival:1.2,spread:2.7}),hit('dust',1.5,4.5,{ground:true,opacity:.6})],{target:'group',impacts:[1.2,1.5,1.8],duration:4.5,motion:'sky'});

define('rooster',[self('vines',1.6,{ground:true}),L('rooster',.65,2.7,1.7,{anchor:'pet',mode:'pet',petAction:'summon'})],{target:'self',motion:'call',impacts:[.65],duration:4.2});
define('peck',[L('rooster',0,3.2,1.72,{mode:'pet',petAction:'dash'})],{approved:'rooster',duration:3.2,impacts:[.96],motion:'call'});
define('mark',[shot('arrow',.72),L('talisman',.74,2,1.6,{mode:'hold',y:1.2})],{motion:'shoot'});
define('vine-trap',[field('vines',.8,3),L('vines',.9,1.8,1.5,{y:.45,opacity:.5})],{motion:'plant',target:'group',impacts:[.9],duration:4});
define('retreat-shot',[shot('arrow',.65),self('dust',2.1,{ground:true,span:1.1})],{movement:'retreat',motion:'shoot',impacts:[.65]});
define('arrow-rain',[L('arrow',.7,2.2,1.4,{mode:'rain',count:7,arrival:1,spread:2.5}),field('vines',1.1,3.3,{opacity:.28,span:1.6})],{target:'group',impacts:[1,1.35,1.7,2.05],motion:'sky',duration:4.2});
define('scatter',[shot('arrow',.8,{mode:'fan',count:5,spread:2.8}),hit('arrow',.9,1.5,{count:3,spread:1.8})],{target:'group',impacts:[.8],motion:'shoot'});
define('ambush',[self('shadow',2.2,{opacity:.5,span:1.2}),shot('arrow',1.05,{start:.7,scale:2.3}),hit('holy',1.07,1.3,{opacity:.6})],{impacts:[1.05],motion:'shoot',cloak:true});
define('thicket',[field('vines',.9,4.6),ring('vines',1,1.5,{count:5,radius:1.5,y:.25}),L('arrow',1.2,1.8,.8,{mode:'rain',count:4,spread:2})],{target:'group',impacts:[.9,1.5,2.1],duration:4.4,motion:'plant'});
define('mythic-rooster',[self('spirit',2.4,{opacity:.55}),L('rooster',.7,2.8,2.2,{mode:'pet',petAction:'summon',anchor:'pet'}),ring('holy',.8,.6,{anchor:'pet',radius:.65,count:3,opacity:.45})],{target:'self',motion:'call',duration:4.4,impacts:[.7]});
define('flock',[L('rooster',.3,2.6,1.55,{mode:'pet',petAction:'dash',count:3,spread:1.35,stagger:.15}),hit('spirit',1.1,2.6,{opacity:.5})],{target:'group',impacts:[.96,1.11,1.26],motion:'call',duration:4});
define('crow',[L('rooster',.15,2.8,1.9,{mode:'pet',petAction:'crow',anchor:'pet'}),ring('banner',.9,1.4,{anchor:'hero',radius:1.65,count:3}),self('holy',2.5,{start:.9,opacity:.4})],{target:'ally',impacts:[.9],motion:'call',duration:4.2});

define('jab',[hit('fist',.5,1.65,{span:.72}),self('dust',.9,{ground:true,span:.7,opacity:.3})],{movement:'lunge',impacts:[.5],motion:'jab',duration:2.7});
define('elbow',[hit('fist',.7,2.1,{rotation:-.6}),hit('dust',.72,1.8,{ground:true,opacity:.4})],{movement:'lunge',motion:'elbow',impacts:[.7]});
define('knee',[hit('fist',.78,2.4,{rotation:1.1}),hit('holy',.82,1.2,{opacity:.5})],{movement:'leap',motion:'knee',impacts:[.78]});
define('triangle',[self('dust',1.8,{ground:true,count:3,spread:1.2,stagger:.13})],{movement:'sidestep',target:'self',motion:'evade',impacts:[],duration:3});
define('parry',[self('shield',1.8,{span:1.1,opacity:.65}),hit('fist',1,2.1,{mode:'sweep'})],{target:'self',impacts:[1],motion:'counter'});
define('hanuman',[hit('fist',.84,3.1,{rotation:.8}),L('fist',.9,1.2,2,{y:2.1,opacity:.45}),field('dust',.84,2.9,{opacity:.45,span:1.1})],{movement:'leap',motion:'uppercut',impacts:[.84],target:'group'});
define('mae-mai',[hit('fist',.64,1.9,{x:-.3}),hit('fist',.92,2.2,{x:.2,rotation:.5}),hit('fist',1.21,2.6,{rotation:-.3})],{movement:'lunge',impacts:[.64,.92,1.21],motion:'combo',duration:3.9});
define('twin-fists',[hit('fist',.95,2.7,{x:-.45,rotation:.2}),hit('fist',.99,2.7,{x:.45,rotation:-.2}),hit('holy',1.06,2.2,{opacity:.5})],{movement:'lunge',impacts:[.95,.99],motion:'combo',target:'group'});
define('flying-knee',[self('dust',2.3,{ground:true,span:1}),hit('fist',.9,2.8,{rotation:1}),hit('banner',.92,1.3,{opacity:.4})],{movement:'leap',impacts:[.9],motion:'knee'});
define('iron-body',[self('shield',2.45,{mode:'hold',span:2.1}),self('talisman',1.8,{start:.8,opacity:.5})],{target:'self',motion:'guard',duration:4.1,impacts:[1.2]});
define('anchor',[self('banner',2.7),field('dust',.8,2.3,{anchor:'hero',span:1,opacity:.5}),self('shield',2.6,{start:.8,mode:'hold'})],{target:'self',motion:'plant',impacts:[.8]});
define('mountain-fist',[self('shield',2.5,{mode:'hold',span:1.25}),hit('fist',1.28,3.4,{rotation:.2}),hit('dust',1.3,3,{ground:true,opacity:.6})],{target:'self',impacts:[1.28],motion:'counter',duration:4});

define('stealth',[self('shadow',3,{span:1.8}),self('dust',2.4,{ground:true,opacity:.3})],{target:'self',cloak:true,impacts:[],motion:'cloak'});
define('backstab',[self('shadow',1.9,{span:1}),hit('shadow',.82,2.7),hit('sword',.87,1.7,{opacity:.6,rotation:.5})],{movement:'lunge',cloak:true,impacts:[.82],motion:'thrust'});
define('hamstring',[hit('shadow',.72,2,{y:.55,rotation:-.4}),L('venom',.8,1.4,1.3,{y:.25,opacity:.4})],{movement:'lunge',impacts:[.72],motion:'low'});
define('poison',[hit('venom',.78,2.2,{mode:'sweep'}),L('venom',.85,2.1,1.1,{mode:'orbit',count:3,radius:.6})],{movement:'lunge',impacts:[.78]});
define('smoke',[field('shadow',.7,3.5,{opacity:.65}),ring('dust',.8,1.7,{count:4,radius:1.2,opacity:.45})],{target:'ally',impacts:[],duration:4,motion:'cloak'});
define('execution',[hit('shadow',.78,2.7,{rotation:.55}),hit('shadow',1.05,2.9,{rotation:-.55}),hit('sword',1.09,1.4,{opacity:.6})],{movement:'lunge',impacts:[.78,1.05],motion:'combo'});
define('clones',[self('shadow',2.8),L('shadow',.65,2,1.7,{anchor:'hero',mode:'clones',count:2,spread:1.8}),self('dust',2,{ground:true,opacity:.4})],{target:'self',cloak:true,motion:'cloak',impacts:[],duration:4});
define('shadow-curtain',[field('shadow',.9,4.7,{opacity:.7}),ring('shadow',.95,2,{count:4,radius:1.7,opacity:.35})],{target:'ally',impacts:[],motion:'cloak',duration:4.3});
define('moon-dive',[self('shadow',2.2,{span:1}),L('shadow',.55,1,2.7,{mode:'travel',arrival:1.02}),hit('sword',1.03,2.7,{rotation:.9})],{movement:'leap',cloak:true,impacts:[1.02],motion:'thrust'});
define('venom-blade',[hit('sword',.78,1.8,{opacity:.4}),hit('venom',.8,3),ring('venom',1,1.3,{count:4,radius:.85})],{movement:'lunge',impacts:[.8]});
define('venom-burst',[L('venom',.2,.75,1.3,{mode:'hold'}),hit('venom',.92,3.5,{frameFrom:3}),hit('shadow',1.04,2.4,{opacity:.4})],{impacts:[.92],motion:'seal',scenario:'เป้าหมายติดพิษอยู่แล้ว → รวบพิษที่แผล → ระเบิดออกเป็นหยดพิษ'});
define('sunset-blade',[self('shadow',2.5,{span:1.1}),hit('venom',.92,3.1,{rotation:.6}),hit('sword',1.18,3,{rotation:-.45}),hit('shadow',1.23,2.1,{opacity:.5})],{movement:'lunge',impacts:[.92,1.18],motion:'combo',duration:4.2});

define('curse',[shot('spirit',.8,{scale:1.8}),L('talisman',.85,2.1,1.45,{mode:'hold'})],{impacts:[.8],motion:'seal'});
define('thread',[L('talisman',.38,2,.65,{mode:'link',count:6}),L('spirit',.7,1.5,1.6,{mode:'orbit',count:3,radius:.75,opacity:.6})],{impacts:[.75],motion:'seal'});
define('spirit',[self('talisman',1.6),L('spirit',.6,2.7,1.8,{anchor:'hero',mode:'orbit',count:1,radius:.95}),self('shield',1.9,{start:.7,opacity:.4})],{target:'self',motion:'call',duration:4.3,impacts:[.6]});
define('talisman',[field('talisman',.6,2.7,{span:1.4}),hit('holy',1.18,2.3),hit('spirit',1.22,2.8,{opacity:.5})],{impacts:[1.18],motion:'plant',scenario:'วางยันต์รอ → ศัตรูเข้าระยะ → ยันต์แตกเป็นกระดาษและแสง'});
define('curse-burst',[L('talisman',.25,.8,1.5,{mode:'hold'}),hit('spirit',.95,3.3),ring('talisman',1.05,1.1,{count:5,radius:1.6,opacity:.6})],{target:'group',impacts:[.95],motion:'seal'});
define('great-spirit',[castGlow('spirit'),shot('spirit',.95,{scale:3.4}),hit('spirit',1.15,3.5,{opacity:.65})],{target:'group',impacts:[.95,1.15],motion:'sky'});
define('spirit-lord',[self('talisman',2.1),L('spirit',.75,3,2.8,{anchor:'hero',mode:'orbit',count:2,radius:1.2}),self('shield',2.4,{start:.95,mode:'hold',opacity:.4})],{target:'self',duration:4.6,impacts:[.75],motion:'call'});
define('soul-chain',[L('talisman',.45,2.1,.85,{mode:'link',count:6}),ring('spirit',.9,1.8,{count:5,radius:1.5}),field('talisman',1,3.8,{opacity:.35})],{target:'group',impacts:[.9],motion:'seal',duration:4.1});
define('hundred-souls',[shot('spirit',1.05,{mode:'fan',count:5,scale:2,spread:2.6}),hit('spirit',1.15,3.8),ring('talisman',1.2,.8,{radius:1.4,count:4,opacity:.4})],{target:'group',impacts:[1.05,1.2],motion:'sky',duration:4.4});
define('twin-seals',[L('talisman',.5,2.5,1.5,{mode:'wall',anchor:'ally',count:2,spacing:1.25}),L('shield',.75,2.3,2.8,{anchor:'ally',mode:'hold',opacity:.65})],{target:'ally',impacts:[.75],motion:'guard',duration:4.2});
define('great-yantra',[field('talisman',1,4.7),ring('shield',1.05,2,{count:5,mode:'dome',radius:1.55}),ring('spirit',1.1,1.3,{count:3,radius:2,opacity:.45})],{target:'ally',impacts:[1],motion:'sky',duration:4.7});
define('reverse-fate',[L('shield',.55,1.6,2.4,{anchor:'ally',mode:'hold'}),L('talisman',.8,1.4,.8,{mode:'link',count:4,reverse:true}),shot('holy',1.3,{reverse:true,start:.9,scale:1.8})],{target:'ally',impacts:[1.3],motion:'guard',scenario:'เพื่อนรับการโจมตีในยันต์ → แสงสะท้อนย้อนกลับไปหาศัตรู'});

define('holy',[castGlow('holy'),shot('holy',.82,{scale:1.8}),hit('holy',.85,2.3)],{impacts:[.82],motion:'pray'});
define('heal',[L('lotus',.35,1.8,2.2,{anchor:'ally',base:true,y:.02}),L('holy',.6,1.2,1.4,{anchor:'ally',y:1.3,opacity:.5})],{target:'ally',impacts:[.8],motion:'pray',duration:3.8});
define('regen',[field('vines',.7,3.4,{anchor:'ally',opacity:.55}),L('lotus',.55,2.8,2.6,{anchor:'ally',base:true,mode:'hold',y:.02}),ring('holy',1,1,{anchor:'ally',count:3,radius:1.4,opacity:.45})],{target:'ally',impacts:[.85,1.55,2.25],motion:'pray',duration:4.6});
define('cleanse',[L('venom',.1,.9,1.1,{anchor:'ally',frameFrom:4,opacity:.4}),L('holy',.55,1.6,2.4,{anchor:'ally'}),L('lotus',.8,1.5,1.9,{anchor:'ally',base:true,y:.02})],{target:'ally',impacts:[.8],motion:'pray',scenario:'เพื่อนติดพิษ → แสงธรรมชะล้าง → เศษอาถรรพ์สลายออกจากตัว'});
define('revive',[L('lotus',.25,3.4,2.55,{anchor:'ally',base:true,y:.025}),L('holy',1.8,1.4,1.2,{anchor:'ally',y:1.5,opacity:.4})],{target:'down',impacts:[2],motion:'pray',duration:4.7});
define('sanctuary',[field('holy',.8,3.8,{anchor:'ally',opacity:.35}),ring('shield',.85,1.8,{anchor:'ally',mode:'dome',count:4,radius:1.35,opacity:.75})],{target:'ally',impacts:[.85],motion:'pray',duration:4.3});
define('great-lotus',[L('lotus',.5,2.7,3.2,{anchor:'ally',base:true,y:.02}),ring('lotus',.8,1.5,{anchor:'ally',base:true,count:3,radius:1.4,opacity:.7}),ring('holy',.95,1,{anchor:'ally',count:4,radius:1.7,opacity:.5})],{target:'ally',impacts:[1.05],motion:'pray',duration:4.5});
define('great-revive',[L('lotus',.2,3.9,2.95,{anchor:'ally',base:true,y:.025})],{approved:'lotus',target:'down',impacts:[2.08],duration:4.8,motion:'pray'});
define('life-tree',[L('vines',.4,2.9,3.3,{anchor:'ally',base:true,mode:'hold',y:.025}),L('lotus',.8,2.7,2.3,{anchor:'ally',base:true,y:.6}),ring('holy',1.1,.8,{anchor:'ally',count:5,radius:1.4,opacity:.6})],{target:'ally',impacts:[1,1.7,2.4],motion:'pray',duration:4.7});
define('dharma-dome',[field('holy',.9,4.6,{anchor:'ally',opacity:.4}),ring('shield',1,2.5,{anchor:'ally',mode:'dome',count:6,radius:1.65}),L('lotus',.8,2.5,2.2,{anchor:'ally',base:true,y:.02,opacity:.55})],{target:'ally',impacts:[1],motion:'pray',duration:4.6});
define('curse-cut',[L('talisman',.2,.9,1.6,{anchor:'ally',frameFrom:4,opacity:.45}),ring('holy',.95,1.7,{anchor:'ally',count:5,radius:1.6}),hit('holy',1.05,2.8,{anchor:'ally'})],{target:'ally',impacts:[1],motion:'seal',duration:4});
define('holy-flame',[field('holy',.9,4.3,{opacity:.55}),L('holy',1,2.4,2.2,{mode:'wall',count:3,spacing:1.1,base:true}),ring('lotus',1.2,1.1,{count:4,radius:1.6,base:true,opacity:.6})],{target:'group',impacts:[1,1.6,2.2],motion:'sky',duration:4.6});

// Passives show their trigger in isolation, rather than looping full-screen auras in play.
const P=(id,layers,scenario,extra={})=>define(id,layers,{target:'self',impacts:[.9],duration:3.4,motion:'guard',passive:true,scenario,...extra});
P('iron-call',[self('banner',2.2),L('banner',.9,1.6,1.1,{mode:'link',count:3})],'ยั่วศัตรูสำเร็จ → บารมีแนวหน้าช่วยคงความสนใจให้นานขึ้น');
P('shield-edge',[self('shield',2,{span:1.2}),shot('sword',1.2,{start:.85,reverse:true,scale:1.35})],'รับแรงขณะตั้งโล่ → คมโล่สะท้อนกลับ');
P('open-wound',[hit('shield',.7,1.4,{frameFrom:5}),hit('sword',.98,2.1)],'ศัตรูเกราะแตกแล้ว → ฟันซ้ำแผลเดิมให้แรงขึ้น',{target:'enemy',movement:'lunge',impacts:[.98]});
P('riposte-flow',[self('shield',1.7,{span:1}),hit('sword',.95,2.1),self('holy',1.2,{start:1.1,opacity:.5})],'สวนดาบสำเร็จ → แรงส่งคืนคูลดาวน์');
P('long-wall',[field('talisman',.7,4),ring('lance',.8,1.4,{count:5,radius:1.6,mode:'planted'})],'ปักเขตทวน → แนวสกัดขยายออก',{target:'group',motion:'plant'});
P('planted',[field('dust',.7,1.7,{anchor:'hero',opacity:.4}),self('shield',2.1,{start:.75,mode:'hold'})],'อยู่ในเขตทวนของตน → ตั้งหลักรับแรงได้มั่นคง');
P('far-point',[shot('lance',.9,{start:.3,scale:2.4}),hit('holy',.93,1.4,{opacity:.5})],'แทงโดนจากระยะไกล → ปลายทวนส่งแรงเพิ่ม',{target:'enemy',impacts:[.9],motion:'thrust'});
P('pierce-rhythm',[shot('lance',.75),shot('lance',1.05,{start:.68,scale:1.6}),self('holy',1.2,{start:1.2,opacity:.5})],'แทงผ่านศัตรูหลายตัว → จังหวะทวนกลับมาเร็วขึ้น',{target:'group',impacts:[.75,1.05],motion:'thrust'});
P('weakpoint',[L('talisman',.25,1.8,1.2,{mode:'hold'}),shot('arrow',.9,{start:.5}),hit('holy',.93,1.2,{opacity:.5})],'ยิงเป้าที่มีหมายตา → ศรเข้าจุดอ่อน',{target:'enemy',impacts:[.9],motion:'shoot'});
P('quick-nock',[self('banner',1.4,{opacity:.5}),shot('arrow',.65),shot('arrow',1,{start:.65,scale:1.3})],'ยิงศรสำเร็จ → ขึ้นสายท่าถัดไปไวขึ้น',{target:'enemy',impacts:[.65,1],motion:'shoot'});
P('rooster-heart',[L('rooster',.2,2.5,1.9,{mode:'pet',petAction:'dash'}),L('holy',.8,1.2,1.2,{anchor:'pet',opacity:.5})],'ไก่เข้าจิก → ใจนักสู้เพิ่มแรงจิก',{target:'enemy',impacts:[.96],motion:'call'});
P('bond',[L('rooster',.2,2.6,1.6,{mode:'pet',petAction:'dash'}),L('lotus',1,1.8,1.8,{anchor:'hero',base:true,y:.02})],'ไก่จิกเป้าที่มีหมายตา → ขวัญกลับมาฮีลเจ้าของ',{target:'enemy',impacts:[.96],motion:'call'});
P('rhythm',[hit('fist',.64,1.7),hit('fist',.88,1.9),hit('fist',1.17,2.6)],'สะสมจังหวะมวยครบ → ท่าปิดคอมโบส่งแรงเต็ม',{target:'enemy',impacts:[.64,.88,1.17],movement:'lunge',motion:'combo'});
P('breath',[self('holy',1.9,{opacity:.55}),self('banner',1.3,{start:.95,opacity:.45})],'จบท่าคอมโบ → ผ่อนลมหายใจคืนมานา',{impacts:[.95],motion:'pray'});
P('iron-blood',[self('banner',2.2),self('shield',1.8,{start:.85,opacity:.55})],'เลือดนักสู้ → พลังชีวิตสูงสุดเพิ่ม',{motion:'guard'});
P('unbroken',[self('shield',2.55,{mode:'hold'}),self('fist',1.2,{start:.9,opacity:.4})],'HP ต่ำกว่าเกณฑ์ → ตั้งกายคงกระพันลดแรงที่รับ');
P('long-shadow',[self('shadow',2.6,{span:2.4}),self('shadow',1.7,{start:1.35,opacity:.4})],'เข้าสู่พรางตัว → เงาคงอยู่นานขึ้น',{cloak:true,impacts:[],motion:'cloak'});
P('shadow-step',[hit('shadow',.85,2.2),self('spirit',1.5,{start:1,opacity:.55})],'โจมตีออกจากพราง → รับมานาคืน',{target:'enemy',movement:'lunge',cloak:true,impacts:[.85]});
P('deep-venom',[hit('venom',.8,2),L('venom',.95,2.1,.8,{mode:'orbit',count:3,radius:.5})],'พิษลงเป้า → ฝังอยู่ในแผลนานขึ้น',{target:'enemy',impacts:[.8]});
P('last-drop',[L('venom',.2,1,.9,{mode:'hold'}),hit('venom',1,2.8,{frameFrom:3}),hit('shadow',1.05,1.6,{opacity:.5})],'เป้าติดพิษและ HP ต่ำ → พิษหยดสุดท้ายส่งแรงเพิ่ม',{target:'enemy',impacts:[1]});
P('spirit-force',[self('spirit',2.4,{mode:'orbit',count:2,radius:.8}),shot('spirit',1.1,{start:.65,scale:1.6})],'พรายออกโจมตี → พลังวิญญาณเพิ่ม',{target:'enemy',impacts:[1.1],motion:'call'});
P('soul-return',[hit('spirit',.9,2.5),L('spirit',.95,1.5,.75,{mode:'link',count:4,reverse:true})],'คำสาปแตก → ขวัญวิญญาณไหลกลับคืนมานา',{target:'enemy',impacts:[.9],motion:'seal'});
P('ward-craft',[self('talisman',1.8),self('shield',2.7,{start:.8,mode:'hold'})],'กางยันต์ → ชั้นเกราะอาคมหนาขึ้น',{motion:'guard'});
P('return-force',[L('shield',.4,1.7,2.2,{anchor:'ally',mode:'hold'}),shot('holy',1.1,{start:.8,reverse:true,scale:1.4})],'เพื่อนรับแรงในอาคม → ส่งแรงสะท้อนกลับเพิ่ม',{target:'ally',impacts:[1.1],motion:'guard'});
P('kindness',[L('lotus',.5,2.1,2.35,{anchor:'ally',base:true,y:.02}),L('holy',.8,1.4,1.4,{anchor:'ally',opacity:.5})],'ฮีลเพื่อนสำเร็จ → เมตตาเพิ่มแรงฟื้นฟู',{target:'ally',motion:'pray'});
P('return-life',[L('lotus',.3,3.5,2.8,{anchor:'ally',base:true,y:.025}),L('shield',2.2,1.2,1.5,{anchor:'ally',opacity:.4})],'คืนขวัญเพื่อน → ฟื้นด้วย HP มากขึ้น',{target:'down',impacts:[2.08],duration:4.6,motion:'pray'});
P('sacred-ground',[field('holy',.7,4,{anchor:'ally',opacity:.4}),ring('shield',.8,1.7,{anchor:'ally',mode:'dome',count:4,radius:1.3})],'อยู่ในเขตธรรม → พื้นที่คุ้มครองคงอยู่นานขึ้น',{target:'ally',motion:'pray',duration:4.2});
P('light-edge',[L('talisman',.2,.9,1.4,{frameFrom:4,opacity:.5}),shot('holy',.9,{start:.5,scale:2.1}),hit('holy',.95,2.5)],'โจมตีศัตรูติดคำสาป → แสงธรรมตัดอาถรรพ์',{target:'enemy',impacts:[.9],motion:'pray'});

profiles.crow.layers[0].sheet='rooster-crow';
profiles['life-tree'].layers[0].sheet='life-tree';
profiles.regen.layers[0].sheet='holy';
profiles['shield-edge'].layers[1].reverse=false;
profiles['reverse-fate'].layers[2].reflect=true;
profiles['return-force'].layers[1].reflect=true;
Object.assign(profiles['arrow-rain'].layers[0],{waves:4,interval:.35});
profiles.clones.ghosts=true;
// 0.119 each reworked skill borrows the painted profile of its catalog `fx` skill until its own VFX lands; the
// pre-0.119 profiles stay keyed by their old ids (pet effects reuse them).
for(const skill of ALL_SKILLS){const from=profiles[skill.fx];if(!from)throw new Error('Missing fx profile '+skill.fx);profiles[skill.id]={...from,layers:from.layers.map(l=>({...l})),id:skill.id,skill,classId:skill.classId,title:skill.name,color:roleById(skill.classId).color,scenario:skill.name+' · '+skill.tip};}
for(const p of Object.values(profiles)){
 p.passive=!!p.skill.passive;
 p.branch=roleById(p.classId).branches.find(b=>b.id===p.skill.branchId)??null;
 p.tag=roleById(p.classId).name+(p.branch?' · '+p.branch.name:' · สกิลหลัก');
 p.layers.forEach((layer,index)=>{layer.index=index;layer.y??=(layer.base||layer.ground)?0.04:1;layer.z??=layer.base&&['ally','down'].includes(p.target)?-.5:0;layer.x??=0;});
 p.beats=[{time:.3,name:p.passive?'เงื่อนไขเริ่ม':'เตรียมท่า'},{time:p.impacts[0]??.8,name:p.passive?'พาสซีฟทำงาน':'ออกสกิล'},{time:(p.impacts.at(-1)??.8)+.4,name:'ส่งแรง / ผลสกิล'},{time:p.duration-.7,name:'จาง / คืนหลัก'}];
}
export const SKILL_PROFILES=profiles;
export const ALL_PROFILES=ALL_SKILLS.map(s=>{if(!profiles[s.id])throw new Error('Unpainted skill: '+s.id);return profiles[s.id];});
const clamp=x=>Math.max(0,Math.min(1,x));
const ease=x=>{x=clamp(x);return x*x*(3-2*x);};
const ramp=(a,b,t)=>ease((t-a)/(b-a));
export function sampleSkill(id,time,{reduced=false}={}){
 const p=profiles[id];if(!p)throw new Error('Unknown skill profile');const t=Math.max(0,Math.min(p.duration,Number.isFinite(time)?time:0));
 if(p.approved){const s=sampleClip(p.approved,t,{reduced});return {...s,id,profile:p,approved:p.approved,targetMode:p.target==='down'?s.targetMode:'idle',targetTime:s.targetTime??0};}
 const first=p.impacts[0]??.8,last=p.impacts.at(-1)??first,pose=poses[p.classId],motion=p.motion??'strike';
 let frame=t<.16?0:t<first?pose.cast:t<last+.28?pose.strike:t<last+.75?10:0;
 if(motion==='guard'||motion==='plant')frame=t<.2?0:t<last+.9?pose.guard:t<last+1.3?10:0;
 if(motion==='pray')frame=t<.18?0:t<first*.6?11:t<first?pose.second:t<last+.55?pose.strike:t<last+1?11:0;
 if(motion==='sky'||motion==='call')frame=t<.18?0:t<first?8:t<last+.45?pose.strike:0;
 if(motion==='low')frame=t<.2?0:t<first?5:t<first+.3?7:t<first+.8?10:0;
 if(motion==='knee'||motion==='uppercut')frame=t<.2?0:t<first?5:t<first+.2?8:t<first+.5?9:t<first+1?10:0;
 if(motion==='elbow')frame=t<.2?0:t<first?5:t<first+.3?7:t<first+.7?10:0;
 if(motion==='counter')frame=t<.2?0:t<first?pose.guard:t<last+.3?pose.second:t<last+.8?10:0;
 if(motion==='combo'){const n=p.impacts.filter(at=>t>=at).length;frame=t<.2?0:t<first?pose.cast:t<last+.25?(n%2?pose.strike:pose.second):t<last+.8?10:0;}
 let heroX=-2,heroZ=0,heroY=0;
 const travel=ramp(Math.max(.2,first-.25),first,t)*(1-ramp(last+.5,last+1.4,t));
 if(p.movement==='lunge'||p.movement==='leap'){heroX+=1.85*travel;if(p.movement==='leap')heroY=Math.sin(travel*Math.PI)*.5;}
 if(p.movement==='retreat')heroX-=1.5*ramp(first-.18,first+.25,t);
 if(p.movement==='sidestep'){heroZ=Math.sin(clamp((t-.25)/1.8)*Math.PI)*1.1;heroX-=ramp(.3,.7,t)*.6*(1-ramp(1.5,2.2,t));}
 if(p.movement==='intercept'){heroX+=2.6*travel;heroZ=.8*travel;}
 const reaction=Math.max(0,...p.impacts.map(at=>1-Math.abs(t-at-.04)/.18));
 const offensive=['enemy','group'].includes(p.target)&&!p.passive;
 const targetMode=p.target==='down'?(t<first?'sleep':t<first+1.22?'standUp':'idle'):'idle';
 const heal=['ally','down'].includes(p.target),hp=heal?(t<first?p.target==='down'?0:280:p.target==='down'?525:620):700-p.impacts.filter(at=>t>=at).length*(offensive?110:0);
 return {id,profile:p,time:t,frame,heroX:reduced?-2:heroX,heroY:reduced?0:heroY,heroZ:reduced?0:heroZ,targetX:1.55+(p.targetMotion==='push'?ramp(first,first+.5,t)*1.25:p.targetMotion==='pull'?-ramp(first,first+.5,t)*1.2:0),targetY:0,targetMode,targetTime:t<first?3:t-first,hp:Math.max(0,hp),reaction:reduced||!offensive?0:reaction,shake:reduced||!offensive?0:reaction*(p.skill.tier==='master'?.09:.045),phase:t<.2?'พร้อม':t<first?p.passive?'เงื่อนไขเริ่มทำงาน':'เตรียม / ร่าย':t<last+.4?p.passive?'พาสซีฟทำงาน':'ออกสกิล / กระแทก':t<p.duration-.7?'ผลสกิล / ประกายสลาย':'คืนหลัก',cloak:p.cloak&&t>.25&&t<first+.2};
}
