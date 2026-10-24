// Local HUD-only review. Uses production HTML/styles and menu/wheel code, no login or game saves.
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const fixture=async()=>{
 let html=(await readFile(path.join(root,'game.html'),'utf8')).replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'');
 const online=await readFile(path.join(root,'multiplayer-ui.js'),'utf8');
 const dock=online.match(/dock\.innerHTML='([^\n]*)';/)[1];
 const channelBody=online.match(/chPop\.innerHTML='([^\n]*)';/)[1],channelButton=online.match(/chButton\.innerHTML='([^\n]*)';/)[1];
 const extra=`<button id="online-button"><span id="online-label">ออนไลน์ · 1 คน</span></button><button id="channel-button">${channelButton}</button><div id="channel-popover" class="mp-channel-popover" hidden>${channelBody}</div>
 <section id="online-dock" class="collapsed">${dock}</section>
 <section id="quest-tracker"><strong id="quest-title">เพื่อนร่วมทาง</strong><span id="quest-hint">คุยกับลุงเรืองเพื่อเริ่มการผจญภัย</span><button id="quest-go">เดินไป</button></section>
 <div id="hud-chips"><button>☀ กลางวัน</button><button>กิจกรรม</button></div>
 <div id="quick-slots"><button>ยาแดง</button><button>ยาฟ้า</button></div>
 <dialog id="bag-window" data-hud-panel><header><h2>กระเป๋า · ทดสอบหน้าต่าง</h2><button onclick="this.closest('dialog').close()">ปิด</button></header><p>ตัวอย่างหน้าต่างบนมือถือ</p><input placeholder="ค้นหาสิ่งของ"></dialog>
 <div id="ailment-row"><span class="buff" title="เกราะอาคม">◇<b>8</b></span><span title="ติดพิษ">☠<b>5</b></span></div>
 <div class="review-monster"><div class="review-monster-art"></div><button class="mob-label" id="review-mob" aria-label="เลือกเป้าหมูป่า"><span>หมูป่า</span><i><b style="width:65%"></b></i></button></div>
 <script type="module">
 import {paintTargetHud,targetHudState} from './target-hud.js';import {createLevelUpNotice} from './level-up-notice.js';
 import {createHud63} from './hud-63.js';import {createSkillWindow} from './skill-window.js';import {createAutoSettings} from './auto-settings.js';import {CombatWorld} from './combat-core.js';import {applySkillArt} from './skill-art.js';import {HOTBAR_KEYS} from './skill-progress.js';import {activeStatusIcons,statusBadgeHTML,loadStatusStyles} from './status-icons.js';import {createMmoHud} from './mmo-hud.js';import {createGameMenu} from './game-menu.js';
 document.querySelector('#journey-loading')?.remove();document.querySelector('#orientation-gate')?.remove();
 document.querySelector('#game-shell').append(document.querySelector('#online-button'),document.querySelector('#channel-button'),document.querySelector('#online-dock'));
 const params=new URL(location.href).searchParams,classId=params.get('class')||'swordsman',roleSkills=params.has('role'),jobId=params.get('branch')||'',world=new CombatWorld({classId,jobId,roleSkills});world.skillLevels=world.skills.map((_,i)=>roleSkills?(world.skills[i].reserved?0:i>=13?1:10):i===14?0:5);world.skillPoints=12;world.player.shield=8;world.status={poison:5};world.food={id:'miang-kham',left:540};let bar=world.skills.map((_,i)=>i);
 const reviewKey='ayothaya-auto-ui-review:'+classId+(roleSkills?':role:'+jobId:'');try{const saved=JSON.parse(localStorage.getItem(reviewKey));if(saved){bar=saved.bar;world.autoConfig=saved.config;}}catch{}
 const save=()=>{try{localStorage.setItem(reviewKey,JSON.stringify({bar,config:world.autoConfig}));}catch{}};
 const paintReview=()=>{const buttons=[...document.querySelectorAll('#skills .skill')];buttons.forEach((b,i)=>{b.querySelector('kbd').textContent=HOTBAR_KEYS[i];b.querySelector('strong').textContent=world.skills[bar[i]].icon;b.title=world.skills[bar[i]].name;});applySkillArt(buttons,classId,bar,roleSkills?world.skills:null);};
 const game={clearInput(){},world,get hotbar(){return [...bar];},setHotbar(next){bar=[...next];paintReview();save();},setAutoConfig(cfg){world.autoConfig=cfg;save();},upgradeSkill(i){world.skillLevels[i]++;return true;}},account={serverId:'server-1'};
 window.__autoReview=game;
 const skillWindow=createSkillWindow({game,classId});
 createGameMenu({game,account});
 for(const [id,label] of [['menu-bag','กระเป๋า'],['menu-quests','เควส'],['menu-status','สถานะ'],['menu-social','สังคม'],['menu-pet','สัตว์เลี้ยง']]){const b=document.createElement('button');b.id=id;b.innerHTML='<i>✦</i><span>'+label+'</span>';document.querySelector('#game-menu').append(b);}
 for(let i=0;i<15;i++){const b=document.createElement('button');b.className='skill'+(i>=10?' master-slot':'');b.innerHTML='<strong>✦</strong><kbd>'+(i+1)+'</kbd>';document.querySelector('#skills').append(b);}
 document.querySelector('#skills').classList.add('skills');paintReview();
 createMmoHud({game,account});createAutoSettings({game,classId});createHud63({game});window.__levelReview=createLevelUpNotice({clearInput:()=>game.clearInput()});if(new URL(location.href).searchParams.has("levelup"))window.__levelReview.show(45,classId);
 const auto=document.getElementById('auto-attack');auto.disabled=false;auto.onclick=()=>{world.auto=!world.auto;auto.setAttribute('aria-pressed',String(world.auto));auto.classList.toggle('active',world.auto);document.getElementById('auto-state').textContent=world.auto?'เปิด':'ปิด';};
 loadStatusStyles();document.getElementById('ailment-row').innerHTML=activeStatusIcons(world).map(statusBadgeHTML).join('');
 const types=[{name:'หมูป่า'},{name:'ราชาฟาง',boss:true}],normal={type:0,hp:65,maxHp:100,x:4,z:4},boss={type:1,hp:750,maxHp:1000,x:6,z:6,aggro:true};
 window.__hudReviewSelect=kind=>{const state=targetHudState({types,player:{x:0,z:0},target:kind==='normal'?normal:null,mobs:kind==='boss'?[boss]:[]});paintTargetHud(document,state);document.querySelector('#review-mob').classList.toggle('selected',kind==='normal');};
 window.__hudReviewSelect(new URL(location.href).searchParams.get('target')||'none');
 document.querySelector('#review-mob').onclick=()=>window.__hudReviewSelect('normal');
 document.querySelector('#menu-bag').onclick=()=>document.querySelector('#bag-window').show();
 const dock=document.querySelector('#online-dock');document.querySelector('#dock-toggle').onclick=()=>dock.classList.toggle('collapsed');
 const channel=document.querySelector('#channel-popover');document.querySelector('#channel-button').onclick=()=>channel.hidden=!channel.hidden;document.querySelector('#channel-pop-close').onclick=()=>channel.hidden=true;
 for(let i=1;i<=5;i++){const b=document.createElement('button');b.type='button';b.className='mp-channel';b.textContent='CH '+i;b.onclick=()=>{document.querySelector('#channel-btn-mob').textContent='CH '+i;document.querySelector('#channel-btn-label').textContent='แนล '+i;channel.hidden=true;};document.querySelector('#channel-pop-list').append(b);}
 document.querySelector('#online-chat').onsubmit=e=>e.preventDefault();
 document.querySelector('#online-messages').innerHTML='<p>ลุงเรือง: ยินดีต้อนรับสู่อโยธยา</p>';
 await Promise.all([...document.querySelectorAll('link[rel=stylesheet]')].map(link=>link.sheet?Promise.resolve():new Promise(resolve=>{link.addEventListener('load',resolve,{once:true});link.addEventListener('error',resolve,{once:true});})));
 document.body.dataset.review='ready';
 </script><link rel="stylesheet" href="life-ui.css"><style>body{background:radial-gradient(ellipse at center,#849a6c,#304a36)}#game-shell{background:repeating-linear-gradient(35deg,#ffffff05 0 1px,transparent 1px 70px)}#journey-loading{display:none}#bag-window{background:#152925;color:#fff0ce;padding:16px}#bag-window header{display:flex;justify-content:space-between;gap:20px}.review-monster{position:fixed;left:42%;top:48%;width:64px;height:64px;pointer-events:none}.review-monster-art{width:64px;height:64px;background:url('assets/monsters.png') 0 0/200% 200% no-repeat}.review-monster .mob-label{position:absolute;left:50%;top:0;transform:translate(-50%,-100%);pointer-events:auto}</style>`;
 return html.replace('</body>',extra+'</body>');
};
const reviewPage=()=>`<!doctype html><html lang="th"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>พรีวิว HUD</title><style>body{background:#152925;color:#fff0ce;font:16px Tahoma;margin:20px}a{color:#ffe1a0}button{padding:10px;margin:4px}main{max-width:1440px}.device-stage{position:relative;overflow:hidden;outline:1px solid #b99a5b;width:100%;margin:12px 0}iframe{position:absolute;left:0;top:0;border:0;max-width:none;transform-origin:0 0}small{font-size:12px}</style><main><h1>พรีวิว HUD คอมและมือถือ</h1><p>พรีวิวตำแหน่ง UI ไม่ใช่การเล่นจริง ช่องแต่ละขนาดรักษาความละเอียดจริง แล้วลดสเกลภาพให้พอดีพื้นที่แสดงผล</p><p><a href="/mobile-fixture.html">เปิดเต็มจอ</a></p><button onclick="location.reload()">โหลดใหม่</button>${['none','normal','boss'].map((id,i)=>`<button data-target="${id}" onclick="document.querySelectorAll('iframe').forEach(f=>f.src='/mobile-fixture.html?target='+this.dataset.target)">${['ไม่เลือกเป้า','เลือกมอนธรรมดา','ต่อสู้บอส'][i]}</button>`).join('')}${[[1440,900],[1024,768],[667,375],[844,390],[390,844],[360,800]].map(([w,h])=>`<h2>${w} × ${h} <small data-scale-for="${w}x${h}"></small></h2><div class="device-stage" data-width="${w}" data-height="${h}"><iframe title="พรีวิว ${w} × ${h}" src="/mobile-fixture.html" width="${w}" height="${h}" style="width:${w}px;height:${h}px"></iframe></div>`).join('')}</main><script>const fit=()=>document.querySelectorAll('.device-stage').forEach(stage=>{const w=Number(stage.dataset.width),h=Number(stage.dataset.height),scale=Math.min(1,stage.clientWidth/w);stage.querySelector('iframe').style.transform='scale('+scale+')';stage.style.height=(h*scale)+'px';document.querySelector('[data-scale-for="'+w+'x'+h+'"]').textContent='แสดงที่ '+Math.round(scale*100)+'%';});new ResizeObserver(fit).observe(document.querySelector('main'));fit();</script></html>`;
http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/mobile-lobby-fixture.html'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(await (await import('./mobile-lobby-fixture.mjs')).mobileLobbyFixture());return;}
 if(url.pathname==='/mobile-review.html'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(reviewPage());return;}
 if(url.pathname==='/mobile-fixture.html'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(await fixture());return;}
 const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
 if(!file.startsWith(root)||path.basename(file).startsWith('.')||!['.js','.css','.html','.png','.svg','.ttf','.json','.glb','.txt'].includes(path.extname(file))){res.writeHead(404).end();return;}
 const mime={'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png','.svg':'image/svg+xml','.ttf':'font/ttf','.json':'application/json','.txt':'text/plain; charset=utf-8'};
 res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(await readFile(file));
 }catch{res.writeHead(404).end();}}).listen(Number(process.env.MOBILE_REVIEW_PORT||8896),'127.0.0.1',()=>console.log('Mobile HUD review: http://127.0.0.1:8896/mobile-review.html'));
