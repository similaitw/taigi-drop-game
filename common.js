/* 台語闖關・共用程式：題庫、音效音樂、過關畫面 */
(function(){
const T = window.T = {};
const $ = id => document.getElementById(id);
T.$ = $;

/* ---------- 小工具 ---------- */
T.store = {
  get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},
  set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
};
T.shuffle = a => {for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}return a};
T.esc = s => String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
T.sleep = ms => new Promise(r=>setTimeout(r,ms));
T.fitSize = (el,text,base) => { const n=[...String(text)].length; const s=n<=2?base:n<=3?base*.85:n<=4?base*.7:n<=6?base*.55:base*.42;
  el.style.fontSize=`clamp(${Math.round(s*.5)}px,${(s/11).toFixed(2)}vw,${Math.round(s)}px)`; };

/* ---------- 題庫（雲端 → 快取 → 預設） ---------- */
T.loadWords = async function(){
  const cached = T.store.get('tg_cloud_words', null);
  if (/^https?:/.test(location.protocol)) {
    try {
      const r = await fetch('/api/words', {cache:'no-cache'});
      if (r.ok) { const j = await r.json();
        if (j && Array.isArray(j.words) && j.words.length >= 8) {
          const w = j.words.map(x=>({hj:x.hj,tl:x.tl||'',zh:x.zh,lv:+x.lv||1}));
          T.store.set('tg_cloud_words',{updatedAt:j.updatedAt,words:w}); T.wordSource='雲端'; return w; } }
    } catch(e){}
  }
  if (cached && Array.isArray(cached.words) && cached.words.length >= 8) { T.wordSource='雲端（快取）'; return cached.words; }
  try { const r = await fetch('/words-default.json'); const j = await r.json(); T.wordSource='預設'; return j.words; } catch(e){}
  T.wordSource='內建'; return T.FALLBACK || [];
};
T.byLevel = (words, levels) => { const p = words.filter(w=>levels.includes(+w.lv)); return p.length>=8?p:words; };
T.LEVELS = { easy:{name:'入門',lv:[1]}, mid:{name:'進階',lv:[1,2]}, hard:{name:'達人',lv:[2,3]} };

/* ---------- 音效與音樂（Web Audio 即時合成） ---------- */
let actx=null, musicGain=null, sfxGain=null;
let musicOn = T.store.get('tg2_music', true);
function init(){
  if (actx) { if (actx.state==='suspended') actx.resume(); return; }
  try { actx = new (window.AudioContext||window.webkitAudioContext)();
    const m = actx.createGain(); m.gain.value=.9; m.connect(actx.destination);
    musicGain = actx.createGain(); musicGain.gain.value = musicOn?.3:0; musicGain.connect(m);
    sfxGain = actx.createGain(); sfxGain.gain.value=.5; sfxGain.connect(m);
  } catch(e){ actx=null; }
}
T.audioInit = init;
const hz = m => 440*Math.pow(2,(m-69)/12);
function note(m,t,d,type,vol,dest){ if(!actx)return; const o=actx.createOscillator(),g=actx.createGain();
  o.type=type;o.frequency.value=hz(m);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+.01);
  g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g);g.connect(dest);o.start(t);o.stop(t+d+.02); }
function noise(t,d,vol,dest,hp=6000){ if(!actx)return; const len=Math.max(1,actx.sampleRate*d|0),buf=actx.createBuffer(1,len,actx.sampleRate),da=buf.getChannelData(0);
  for(let i=0;i<len;i++)da[i]=Math.random()*2-1; const s=actx.createBufferSource();s.buffer=buf;
  const f=actx.createBiquadFilter();f.type='highpass';f.frequency.value=hp;const g=actx.createGain();
  g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);s.connect(f);f.connect(g);g.connect(dest);s.start(t); }
function kick(t,dest,v=.7){ if(!actx)return; const o=actx.createOscillator(),g=actx.createGain();o.frequency.setValueAtTime(150,t);o.frequency.exponentialRampToValueAtTime(45,t+.12);
  g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.0001,t+.18);o.connect(g);g.connect(dest);o.start(t);o.stop(t+.2); }
const _=null;
const SONGS = {
  title:{bpm:100,lead:'sine',lv:.24,bell:true,drum:'soft',
    mel:[79,_,_,76,74,_,76,_,79,_,81,_,79,_,_,_,76,_,74,_,71,_,74,_,76,_,_,_,_,_,_,_,74,_,76,79,81,_,79,_,76,_,74,_,76,_,_,_,74,_,71,_,69,_,71,74,67,_,_,_,_,_,_,_],
    bas:[43,50,40,47,36,43,38,45,43,50,40,47,36,38,43,43]},
  fun:{bpm:122,lead:'triangle',lv:.22,drum:'pop',
    mel:[72,_,74,76,79,_,76,74,72,74,76,_,69,_,_,_,67,69,72,_,74,76,74,72,69,_,72,_,74,_,_,_,76,_,79,81,79,76,74,_,76,79,76,74,72,_,69,_,67,_,69,72,74,_,76,74,72,_,_,74,72,_,_,_],
    bas:[48,55,45,52,41,48,43,50,48,55,45,52,41,43,48,48]},
  drive:{bpm:136,lead:'square',lv:.09,drum:'pop',
    mel:[74,74,_,76,78,_,76,74,71,_,74,_,76,_,_,_,78,78,_,81,78,_,76,74,76,_,71,_,74,_,_,_,81,_,78,_,76,78,76,74,71,_,69,_,71,74,_,_,69,_,71,74,76,_,78,76,74,_,71,_,74,_,_,_],
    bas:[50,57,47,54,43,50,45,52,50,57,47,54,43,45,50,50]},
  battle:{bpm:148,lead:'sawtooth',lv:.075,drum:'rock',
    mel:[81,_,79,81,84,_,81,79,76,_,79,_,81,_,_,76,74,76,79,_,76,74,72,74,69,_,72,_,74,_,76,_,81,81,_,84,81,_,79,76,79,_,81,_,84,_,86,_,84,81,79,76,74,_,76,79,81,_,_,_,69,_,_,_],
    bas:[45,52,41,48,43,50,40,47,45,52,41,48,43,50,45,45]}
};
const music = T.music = { step:0,next:0,timer:null,rate:1,song:null,name:'',
  play(name){ init(); if(!actx)return; if(this.name===name&&this.timer)return; this.stop();
    this.name=name;this.song=SONGS[name];this.rate=1;this.step=0;this.next=actx.currentTime+.08;
    this.timer=setInterval(()=>this.tick(),25); },
  stop(){ clearInterval(this.timer);this.timer=null;this.name=''; },
  tick(){ const S=this.song,spb=60/(S.bpm*this.rate)/2,hurry=this.rate>1.01;
    while(this.next<actx.currentTime+.12){ const s=this.step%64,t=this.next,m=S.mel[s];
      if(m){note(m,t,spb*1.8,S.lead,S.lv,musicGain);if(S.bell)note(m+12,t,spb*2.5,'sine',.06,musicGain)}
      if(s%8===0||s%8===4){const b=S.bas[(s>>2)%16];note(b,t,spb*3.5,'sine',.34,musicGain);if(S.drum!=='soft')note(b+12,t,spb*1.2,'square',.035,musicGain)}
      if(S.drum==='soft'){if(s%8===0)kick(t,musicGain,.35);if(s%4===2)noise(t,.05,.05,musicGain)}
      else if(S.drum==='pop'){if(s%4===0)kick(t,musicGain);if(s%2===1)noise(t,.04,.11,musicGain);if(s%8===4)noise(t,.12,.18,musicGain,1800)}
      else{if(s%2===0)kick(t,musicGain);noise(t,.03,.09,musicGain);if(s%8===4)noise(t,.14,.24,musicGain,1500)}
      if(hurry){noise(t+spb/2,.025,.08,musicGain);if(s%2===0)note((m||76)+12,t,spb*.6,'square',.03,musicGain)}
      this.next+=spb;this.step++; } }
};
T.sfx = {
  ok(c=1){ if(!actx)return; const t=actx.currentTime,b=72+Math.min(c,8); [0,4,7,12].forEach((d,i)=>note(b+d,t+i*.05,.18,'square',.12,sfxGain)); },
  bad(){ if(!actx)return; const t=actx.currentTime; note(52,t,.18,'sawtooth',.16,sfxGain); note(47,t+.14,.3,'sawtooth',.16,sfxGain); },
  tick(){ if(!actx)return; note(79,actx.currentTime,.12,'square',.12,sfxGain); },
  flip(){ if(!actx)return; note(88,actx.currentTime,.06,'triangle',.12,sfxGain); },
  go(){ if(!actx)return; const t=actx.currentTime; note(84,t,.3,'square',.14,sfxGain); note(91,t+.08,.35,'triangle',.14,sfxGain); },
  win(){ if(!actx)return; const t=actx.currentTime; [72,76,79,84,79,84,88].forEach((m,i)=>note(m,t+i*.11,.32,'triangle',.2,sfxGain)); },
  ding(){ if(!actx)return; const t=actx.currentTime; note(96,t,.5,'sine',.2,sfxGain); note(103,t+.06,.6,'sine',.12,sfxGain); }
};
T.bindMusicBtn = function(btn){
  const upd=()=>btn.textContent=musicOn?'🎵':'🔇'; upd();
  btn.onclick=()=>{ init(); musicOn=!musicOn; T.store.set('tg2_music',musicOn); upd();
    if(musicGain) musicGain.gain.setTargetAtTime(musicOn?.3:0, actx.currentTime, .05); };
};
// 第一次互動就開啟音訊（瀏覽器規定）
['pointerdown','keydown'].forEach(ev=>document.addEventListener(ev,()=>{init(); if(T.onFirstTouch){const f=T.onFirstTouch;T.onFirstTouch=null;f()}},{passive:true}));

/* ---------- 畫面效果 ---------- */
T.toast = function(msg, cls='ok', ms=750){
  let t=document.querySelector('.toast'); if(!t){t=document.createElement('div');t.className='toast';document.body.appendChild(t)}
  t.textContent=msg; t.className='toast show '+cls; clearTimeout(T.toast._t); T.toast._t=setTimeout(()=>t.className='toast',ms);
};
T.confetti = function(x,y,n=24){
  const cols=['#d9412b','#f6c343','#1f8a7f','#2b74c9','#ff8aa1','#25a566'];
  for(let i=0;i<n;i++){const c=document.createElement('div');c.className='conf';c.style.left=x+'px';c.style.top=y+'px';c.style.background=cols[i%cols.length];
    const a=Math.random()*Math.PI*2,d=60+Math.random()*140;c.style.setProperty('--dx',Math.cos(a)*d+'px');c.style.setProperty('--dy',(Math.sin(a)*d-70)+'px');c.style.setProperty('--r',(Math.random()*720-360)+'deg');
    document.body.appendChild(c);setTimeout(()=>c.remove(),950)}
};
T.countdown = function(cb){
  let el=$('cd'); if(!el){el=document.createElement('div');el.id='cd';document.body.appendChild(el)}
  el.style.display='flex'; let n=3; el.innerHTML='<span>3</span>'; T.sfx.tick();
  const iv=setInterval(()=>{ n--; if(n>0){el.innerHTML='<span>'+n+'</span>';T.sfx.tick()}
    else{clearInterval(iv);el.innerHTML='<span>開始！</span>';T.sfx.go();setTimeout(()=>el.style.display='none',450);cb()} },750);
  return ()=>{clearInterval(iv);el.style.display='none'};
};
T.fullscreen = function(){ const el=document.documentElement,req=el.requestFullscreen||el.webkitRequestFullscreen;
  if(!req||document.fullscreenElement||document.webkitFullscreenElement)return; try{const p=req.call(el);p&&p.catch&&p.catch(()=>{})}catch(e){} };

/* ---------- 開始畫面：點外面空白處回首頁 ---------- */
document.addEventListener('DOMContentLoaded',()=>{const ov=document.getElementById('startOv');if(!ov)return;
  ov.style.cursor='pointer';ov.title='點外面回遊戲選單';
  ov.addEventListener('click',e=>{if(e.target===ov)location.href='/'});
  const p=ov.querySelector('.panel');if(p){p.style.cursor='auto';const h=document.createElement('p');h.className='muted';h.style.cssText='text-align:center;margin:8px 0 0';h.textContent='點視窗外面可以回遊戲選單';p.appendChild(h)}});

/* ---------- 關卡與過關畫面 ---------- */
T.STATIONS = [
  {id:'drop',   name:'台語接接樂', icon:'🏮', url:'/drop',    desc:'接住掉落的台語詞'},
  {id:'duel',   name:'搶答對決',   icon:'⚔️', url:'/duel',    desc:'兩人比快，先拿分的贏'},
  {id:'memory', name:'翻牌記憶',   icon:'🃏', url:'/memory',  desc:'台語華語配成對'},
  {id:'proverb',name:'俗語接龍',   icon:'📜', url:'/proverb', desc:'接出俗語的下半句'},
  {id:'whack',  name:'台語打地鼠', icon:'🔨', url:'/whack',   desc:'打中舉對答案的地鼠'},
  {id:'quiz',   name:'著毋著快問快答', icon:'⭕', url:'/quiz', desc:'台語華語對不對？'}
];
// 過關／未過關大字結果，給關主看
T.showResult = function(el, win, tip=''){
  el.innerHTML = win
    ? `<div class="pass"><div class="ok-big">🎉 過關！</div><b>請把畫面給關主看</b>${tip?`<div class="muted">${T.esc(tip)}</div>`:''}</div>`
    : `<div class="fail">${T.esc(tip||'這次沒過關，再挑戰一次吧！')}</div>`;
};
})();
