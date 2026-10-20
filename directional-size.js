import {BODY_HEIGHT,LOGICAL_SIZE} from './character-size.js';

// Crown (including hair/bun) to sandal sole at the runtime alpha-test threshold (115/255).
// Every view was checked against the source art. Lancer crowns exclude the spear in the outer
// columns; no other current class has a weapon above its hair. Tuples are
// [source, crop x, crop y, crop width, crop height, crown y, sole y] in source pixels.
// Crop/source guards and PNG hashes in the tests require remeasurement after art replacement.
export const DIRECTIONAL_BODY_MEASUREMENTS={
 novice:{
  male:{S:["atlas",123,18,159,316,0,315],SE:["atlas",417,17,158,317,1,317],E:["atlas",690,22,162,313,0,312],NE:["atlas",986,19,154,312,0,312],N:["atlas",120,342,163,303,0,303],NW:["atlas",408,343,157,302,0,301],W:["atlas",693,341,160,308,1,308],SW:["atlas",995,343,160,306,1,305]},
  female:{S:["atlas",117,656,156,311,1,310],SE:["atlas",419,656,150,314,1,311],E:["atlas",698,662,162,306,0,305],NE:["atlas",1006,658,147,308,0,307],N:["atlas",120,972,154,279,0,278],NW:["atlas",412,970,150,280,0,280],W:["atlas",688,972,162,282,1,282],SW:["atlas",999,974,152,280,0,280]},
 },
 swordsman:{
  male:{S:["atlas",105,8,204,302,0,302],SE:["atlas",408,8,206,305,0,304],E:["atlas",717,12,158,301,0,301],NE:["atlas",994,18,210,295,0,295],N:["atlas",98,321,213,302,0,302],NW:["atlas",412,326,191,297,1,297],W:["atlas",691,320,163,304,1,303],SW:["atlas",976,323,193,302,0,302]},
  female:{S:["atlas",83,629,207,304,0,304],SE:["atlas",384,629,209,305,0,304],E:["atlas",702,631,162,303,0,303],NE:["atlas",995,639,198,294,0,294],N:["atlas",97,940,209,298,1,298],NW:["atlas",404,942,197,294,0,294],W:["atlas",690,938,164,301,0,301],SW:["atlas",975,940,189,299,0,299]},
 },
 lancer:{
  male:{S:["atlas",70,19,197,314,11,314],SE:["atlas",382,27,198,309,3,309],E:["atlas",690,28,172,308,0,308],NE:["rear",729,46,375,566,29,566],N:["rear",167,42,353,568,13,568],NW:["atlas",388,353,192,292,0,292],W:["atlas",689,350,169,300,0,300],SW:["atlas",986,346,196,304,0,304]},
  female:{S:["atlas",69,645,196,310,12,310],SE:["atlas",384,654,201,303,5,303],E:["atlas",691,658,175,300,0,300],NE:["rear",719,649,384,569,31,569],N:["rear",171,648,349,569,14,569],NW:["atlas",390,970,188,278,0,278],W:["atlas",692,962,173,288,3,288],SW:["atlas",985,958,198,292,8,292]},
 },
 hunter:{
  male:{S:["atlas",64,17,199,299,0,299],SE:["atlas",372,18,210,299,0,299],E:["atlas",685,18,168,299,0,299],NE:["atlas",995,17,191,299,0,299],N:["atlas",58,330,192,296,0,296],NW:["atlas",383,329,178,298,1,298],W:["atlas",705,329,158,299,0,299],SW:["sw63",253,79,757,1115,3,1112]},
  female:{S:["atlas",69,634,196,299,0,299],SE:["atlas",383,634,196,299,0,299],E:["atlas",699,635,158,299,0,299],NE:["atlas",991,639,194,294,0,294],N:["atlas",56,941,198,297,0,297],NW:["atlas",381,942,166,297,0,297],W:["atlas",699,942,152,297,0,297],SW:["atlas",992,942,196,298,0,298]},
 },
 boxer:{
  male:{S:["atlas",65,13,189,306,0,306],SE:["atlas",369,13,207,306,0,306],E:["atlas",683,13,198,306,0,306],NE:["atlas",996,13,188,305,0,305],N:["atlas",92,323,176,307,0,307],NW:["atlas",391,325,192,305,0,305],W:["atlas",700,325,193,305,0,305],SW:["atlas",996,325,201,305,0,305]},
  female:{S:["atlas",52,631,207,315,1,315],SE:["atlas",364,632,211,313,0,313],E:["atlas",676,633,203,312,0,312],NE:["atlas",996,632,203,313,0,313],N:["atlas",87,948,191,298,0,298],NW:["atlas",390,949,193,297,0,297],W:["atlas",696,950,198,296,0,296],SW:["atlas",996,948,196,298,0,298]},
 },
 rogue:{
  male:{S:["atlas",73,8,193,302,0,302],SE:["atlas",374,8,198,302,0,302],E:["atlas",674,8,198,303,0,302],NE:["atlas",995,8,200,302,0,302],N:["atlas",71,318,199,305,0,305],NW:["atlas",370,318,190,305,0,304],W:["atlas",674,318,191,305,0,305],SW:["atlas",993,319,209,304,0,304]},
  female:{S:["atlas",57,633,207,304,0,304],SE:["atlas",367,633,202,304,0,304],E:["atlas",675,633,198,305,0,305],NE:["atlas",993,633,214,304,0,304],N:["atlas",72,943,196,306,0,306],NW:["atlas",371,943,201,306,0,306],W:["atlas",671,945,195,305,0,305],SW:["atlas",1002,946,197,304,0,304]},
 },
 shaman:{
  male:{S:["front",62,8,253,386,0,386],SE:["front",477,9,264,385,0,385],E:["front",887,8,228,388,0,388],NE:["rear",772,64,386,534,0,534],N:["rear",180,49,371,540,0,540],NW:["left",1100,15,344,488,0,488],W:["left",615,15,305,489,0,489],SW:["left",137,15,321,488,0,488]},
  female:{S:["front",62,402,261,383,1,383],SE:["front",487,402,256,384,0,383],E:["front",890,402,224,384,0,384],NE:["rear",772,662,390,538,0,538],N:["rear",180,646,372,546,0,546],NW:["left",1104,521,340,475,0,475],W:["left",611,520,302,478,0,478],SW:["left",137,520,320,482,0,482]},
 },
 acolyte:{
  male:{S:["atlas",83,39,160,305,1,305],SE:["atlas",393,39,156,305,0,305],E:["atlas",706,42,145,302,0,302],NE:["atlas",1017,37,156,307,0,307],N:["atlas",87,361,154,301,0,301],NW:["atlas",389,361,153,301,0,301],W:["atlas",711,364,144,299,0,299],SW:["atlas",1011,361,152,303,0,303]},
  female:{S:["atlas",84,684,160,294,0,294],SE:["atlas",393,682,157,297,0,296],E:["atlas",707,685,145,293,0,293],NE:["atlas",1016,682,158,296,0,296],N:["atlas",89,986,152,267,0,267],NW:["atlas",393,986,146,267,0,267],W:["atlas",709,989,144,265,0,265],SW:["atlas",1012,986,149,268,0,268]},
 },
};

export const DIRECTIONAL_SOURCE_SHA256={
 "./assets/directional/novice-63.png": "2031350d0a952b220293be75f7eff63f1fa19265bbd9bb0e060a03488f4b979e",
 "./assets/directional/swordsman-17.png": "0e5457a78227f6d14fb7768594cea48d44d721ca86189ee510659f6946756051",
 "./assets/directional/lancer-17.png": "8ac414fe559872e612c4f8b26407b29b1996a8eed09480fd296e984779bc3642",
 "./assets/directional/lancer-rear-17.png": "cba40074e028fe92a8ec73ca019e750fee9da02bd35ff2be963762c371eb36d9",
 "./assets/directional/hunter-17.png": "1d0b2b7de844947a682d87d48fed26abcbab474f05151972815ff32404a9e4f1",
 "./assets/directional/hunter-sw-63.png": "a64f12f61602fcb4b78b9915d65dd2f742cb218e814558134c5f479bb671ac9a",
 "./assets/directional/boxer-17.png": "382dbddedf987479dc00bfed3e6a48cf95ce01ddbb01993319d0e795b1d63a99",
 "./assets/directional/rogue-17.png": "9d4abbed96243520fb38ff1254dba5be9b08f7481689f0393906726ed4b32049",
 "./assets/directional/shaman-front-16.png": "bd78b47ca008fcf3e1dd1eaa4128e680017ae0ff28b01c3caf884ac6b3c4e096",
 "./assets/directional/shaman-rear-16.png": "b486794d21198d795ddcd2c13a8ef9335a1ec08cb8acd55ff6941307ec78d3b1",
 "./assets/directional/shaman-left-16.png": "936d1c5a8cb7230989d9e1c3e4b3381766a49dbd64269e9bfd9f9e51cc3e95eb",
 "./assets/directional/acolyte-17.png": "9ba582e2d64b7ce0bdfcd999d2aad6c9caf74b10dbd7b1611ced28d3df0180b8"
};

// Texture placement and rig UVs stay unchanged; enlarge the mesh around the measured sole.
export function directionalBodyMetrics(classId,gender,direction,frame,dest,cell=192){
 const measured=DIRECTIONAL_BODY_MEASUREMENTS[classId]?.[gender]?.[direction];
 if(!measured||frame.source!==measured[0]||frame.rect.some((v,i)=>v!==measured[i+1]))throw new Error('Directional body calibration needs remeasurement: '+classId+'/'+gender+'/'+direction);
 const [, , ,width, ,crown,sole]=measured,scale=dest.w/width;
 if(!(cell>0&&scale>0&&sole>crown))throw new Error('Invalid directional body size');
 const crownV=(dest.y+crown*scale)/cell,footV=(dest.y+sole*scale)/cell;
 return {crownV,footV,bodyScale:(BODY_HEIGHT/LOGICAL_SIZE)/(footV-crownV)};
}
