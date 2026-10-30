// 0.116 audio catalogue: one list for the game (feedback.js) and the asset gallery. The files are original, rendered
// offline from code (outputs/audio-v2: Thai 7-tone scale, ranat, khong wong, ching, pi, so u, klong), no licences.
export const AUDIO_BASE='assets/audio180/';
export const AUDIO_VERSION='180';
// seconds = exact loop length (the music loops seamlessly at this point)
export const BGM={
 town:{name:'เมืองหลวงยามสงบ',note:'ระนาดเอก ฆ้องวง ฉิ่ง · 84 bpm',seconds:68.571},
 guild:{name:'ทุ่งชุมพล',note:'ฆ้องวงนำ กลองเดินแถว · 76 bpm',seconds:63.158},
 field:{name:'ท้องทุ่งออกเดินทาง',note:'ระนาดเอก ซออู้ตอบ กลองทัด · 104 bpm',seconds:64.615},
 night:{name:'ราตรีลึกลับ',note:'ซออู้ ระนาดรัว ลมกลางคืน · 64 bpm',seconds:60},
 dungeon:{name:'ใต้ดินชื้นเย็น',note:'ระนาดทุ้ม โหม่ง หยดน้ำ · 56 bpm',seconds:60},
 ruins:{name:'ซากโบราณ',note:'ปี่ใน ฆ้องวง ตะโพน · 88 bpm',seconds:65.455},
 peak:{name:'ยอดเขาศักดิ์สิทธิ์',note:'ฆ้องวง ระฆัง ลมภูเขา · 70 bpm',seconds:61.714},
 arena:{name:'ลานประลอง',note:'ปี่ใน กลองศึก · 126 bpm',seconds:60.952},
 boss:{name:'ศึกบอส',note:'ปี่ใน กลองศึกหนัก โหม่ง · 138 bpm',seconds:55.652},
};
// which track each map plays; a boss nearby switches to 'boss'
export const THEME_OF={ayutthaya:'town',lablae:'town','guild-hall':'guild','rice-fields':'field','old-orchard':'field',
 'moonlit-mill':'night','lotus-marsh':'night','bamboo-grove':'night','mill-cellar':'dungeon','naga-cave':'dungeon',
 'ruined-temple':'ruins','himmapan-edge':'ruins','kailash-peak':'peak','duel-arena':'arena'};
export const themeOf=map=>THEME_OF[map.id]??(map.safe?'town':'field');
// files: name -> variants (a random one plays each time)
export const SFX={
 swing:{name:'ฟันโจมตีปกติ',on:'โจมตีปกติ',files:['swing0','swing1','swing2']},
 hit:{name:'โดนเป้า',on:'สร้างความเสียหาย',files:['hit0','hit1','hit2']},
 crit:{name:'คริติคอล',on:'ความเสียหายคริติคอล',files:['crit']},
 cast:{name:'ร่ายสกิล',on:'ใช้สกิล',files:['cast']},
 hurt:{name:'โดนตี',on:'ผู้เล่นโดนโจมตี',files:['hurt']},
 dodge:{name:'หลบ',on:'หลบการโจมตี',files:['dodge']},
 defeat:{name:'ล้มศัตรู',on:'มอนสเตอร์ตาย',files:['defeat']},
 potion:{name:'ยา / ฟื้นพลัง',on:'ใช้ไอเทม · ฮีล',files:['potion']},
 level:{name:'เลเวลอัป',on:'ขึ้น Base / Job Lv.',files:['level']},
 fanfare:{name:'ชัยชนะ',on:'MVP · เคลียร์ดันเจี้ยน',files:['fanfare']},
 chime:{name:'สำเร็จ',on:'ภารกิจรายวัน · จับสัตว์เลี้ยง',files:['chime']},
 rare:{name:'ของหายาก',on:'ดรอปของระดับหายากขึ้นไป',files:['rare']},
 coin:{name:'เหรียญ',on:'ขายของในแผงสำเร็จ',files:['coin']},
 forge:{name:'ตีเหล็ก',on:'ตีบวกอุปกรณ์',files:['forge']},
 click:{name:'กดปุ่ม',on:'กดปุ่มในหน้าจอ',files:['click']},
};
export const audioUrl=file=>`${AUDIO_BASE}${file}.mp3?v=${AUDIO_VERSION}`;
// 0.121 combat sounds (scripts/build-combat-sfx.mjs: Kenney CC0 + our own synthesis). Each class has its own basic
// swing / hit (3 variants) and an ultimate sting; each skill plays its effect family's cast at the start and its hit on
// every impact (2 variants). The family is the skill's first effect sheet in the skill profiles.
export const COMBAT_BASE='assets/audio-combat/',COMBAT_VERSION='121';
export const COMBAT_CLASSES=['swordsman','lancer','hunter','boxer','rogue','shaman','acolyte'];
export const COMBAT_FAMILIES=['fist','sword','lance','arrow','shield','dust','banner','shadow','holy','talisman','spirit','lotus','venom','vines','rooster','rooster-crow','life-tree'];
export const COMBAT_NAMES={swordsman:'นักดาบ',lancer:'นักทวน',hunter:'นายพราน',boxer:'นักมวย',rogue:'จอมโจร',shaman:'หมอผี',acolyte:'พระ / แม่ชี',
 fist:'หมัด',sword:'ดาบ',lance:'ทวน',arrow:'ธนู',shield:'โล่',dust:'ฝุ่นดิน',banner:'ธงศึก',shadow:'เงา',holy:'แสงศักดิ์สิทธิ์',talisman:'ยันต์',spirit:'วิญญาณ',
 lotus:'บัว',venom:'พิษ',vines:'เถาวัลย์',rooster:'ไก่ชน','rooster-crow':'ไก่ขัน','life-tree':'ต้นไม้แห่งชีวิต'};
export const combatFile=(kind,id,part,v)=>`${kind}-${id}-${part}${v}`;
export const combatUrl=file=>`${COMBAT_BASE}${file}.mp3?v=${COMBAT_VERSION}`;
