/* rhythm */
const STRUMS=[{n:'Down',p:'D.D.D.D.'},{n:'Down up',p:'DUDUDUDU'},{n:'Island',p:'D.DU.UDU'},{n:'Folk',p:'D.DUD.DU'},{n:'Waltz',p:'D.D.D.',three:true}];
const PICKS=[
  {n:'Roll',p:[[4],[3],[2],[1],[4],[3],[2],[1]]},{n:'Up and back',p:[[4],[3],[2],[1],[2],[3],[2],[3]]},
  {n:'Pinch',p:[[4,1],[3],[2],[3],[4,1],[3],[2],[3]]},{n:'Alternating',p:[[4],[2],[3],[1],[4],[2],[3],[1]]},
  {n:'Waltz pick',p:[[4],[3],[2],[1],[2],[3]],three:true}];
let rCycles=0, rLastSave=0;
const rPat=()=>S.mode==='pick'?PICKS[S.pick]||PICKS[0]:STRUMS[S.pattern]||STRUMS[0];
const rCounts=n=>n===6?['1','&','2','&','3','&']:['1','&','2','&','3','&','4','&'];
function renderRhythm(){
  $$('#rMode button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.m===S.mode)));
  const list=S.mode==='pick'?PICKS:STRUMS, sel=S.mode==='pick'?S.pick:S.pattern;
  $('#rPatterns').innerHTML=list.map((x,i)=>`<button aria-pressed="${i===sel}" data-i="${i}">${x.n}</button>`).join('');
  $$('#rPatterns button').forEach(b=>b.onclick=()=>{ if(S.mode==='pick') S.pick=+b.dataset.i; else S.pattern=+b.dataset.i; save(); rCycles=0; renderRhythm(); });
  const P=rPat(), n=P.p.length, counts=rCounts(n);
  if(S.mode==='strum'){
    const arrow=(down,ghost)=>`<svg width="26" height="36" viewBox="0 0 26 36" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="${ghost?1.8:2.4}" stroke-linecap="round" stroke-linejoin="round" ${ghost?'stroke-dasharray="3 4"':''}>${down?'<path d="M13 4v26M5.5 22.5 13 30l7.5-7.5"/>':'<path d="M13 32V6M5.5 13.5 13 6l7.5 7.5"/>'}</g></svg>`;
    $('#rGrid').innerHTML=`<div class="grid8" style="grid-template-columns:repeat(${n},1fr)">${[...P.p].map((ch,i)=>{ const ghost=ch==='.'; const down=ghost?i%2===0:ch==='D';
      return `<div class="cell${i%2===0&&i>0?' beat':''}" data-i="${i}"><div class="ct">${counts[i]}</div><div class="ar${ghost?' ghost':''}" role="img" aria-label="${ghost?'ghost strum':down?'down':'up'}">${arrow(down,ghost)}</div></div>`; }).join('')}<i class="rhand" id="rHand" aria-hidden="true"></i></div>`;
    $('#rLegend').textContent='Faint arrows are ghost strums. Keep your hand moving and miss the strings.';
  } else {
    const names=TUNINGS[S.tuning].open.map(m=>NOTES[m%12]);
    let h=`<div class="tab" style="grid-template-columns:34px repeat(${n},1fr)"><span></span>${counts.map((c,i)=>`<span class="cnt" data-i="${i}">${c}</span>`).join('')}`;
    const FING={4:'T',3:'I',2:'M',1:'R'};
    for(let s=1;s<=4;s++){ h+=`<span class="sl">${names[4-s]}<small>${s}</small></span>`; for(let i=0;i<n;i++) h+=`<span class="tc r${s}" data-i="${i}">${P.p[i].includes(s)?`<i>${FING[s]}</i>`:''}</span>`; }
    $('#rGrid').innerHTML=h+'</div>';
    $('#rLegend').textContent='Tab shows the strings upside down from what you see: the top line is the A string, nearest the floor. T is your thumb, and I, M, and R are your index, middle, and ring fingers.';
  }
  $('#rBpm').textContent=S.bpm; $('#rRange').value=S.bpm; $('#rTarget').value=S.target;
  setSwitch($('#rHear'),S.hearPat); setSwitch($('#rSpeed'),S.speedUp); setSwitch($('#rTime'),S.timing); drawTiming();
  $('#rChord').innerHTML=CHORDS.map(c=>`<option value="${esc(c.n)}">${esc(chordName(c))}</option>`).join(''); $('#rChord').value=byN[S.patChord]?S.patChord:'C';
  setPlay($('#rPlay'),clock.owner==='rhythm','Stop metronome','Start metronome');
}
function rhythmSched(tick,time){
  timingSlot(tick,time);
  const P=rPat(), i=tick%P.p.length;
  if(i%2===0) click(time,i===0);
  if(S.hearPat){ const c=byN[S.patChord]||byN.C;
    if(S.mode==='strum'){ const ch=P.p[i]; if(ch!=='.') strumAt(c,time,ch==='U',0.22); }
    else { const notes=notesOf(c); P.p[i].forEach(s=>pluckAt(notes[4-s],time,0.32)); } }
}
function rhythmVis(tick){
  handTick={i:tick,t:ctx.currentTime};
  if(S.timing) timingSweep();
  const P=rPat(), n=P.p.length, i=tick%n;
  $$('#rGrid [data-i]').forEach(el=>el.classList.toggle('now',+el.dataset.i===i));
  const key=S.mode==='pick'?'pick':'strum:'+P.n, dt=30/clock.bpm;
  S.secs[key]=(S.secs[key]||0)+dt; if(S.mode==='strum') S.secs.strum=(S.secs.strum||0)+dt;
  if(performance.now()-rLastSave>3000){ rLastSave=performance.now(); save(); }
  if(i===0 && tick>0){ rCycles++; if(S.speedUp && rCycles%4===0 && S.bpm<S.target) setBpm(Math.min(S.target,S.bpm+4)); }
}
function setBpm(v){ S.bpm=Math.max(40,Math.min(180,Math.round(v))); $('#rBpm').textContent=S.bpm; $('#rRange').value=S.bpm; if(clock.owner==='rhythm') clock.bpm=S.bpm; save(); }
$$('#rMode button').forEach(b=>b.onclick=()=>{ S.mode=b.dataset.m; save(); rCycles=0; renderRhythm(); });
$('#rRange').oninput=e=>setBpm(+e.target.value);
hold($('#rMinus'),()=>setBpm(S.bpm-1)); hold($('#rPlus'),()=>setBpm(S.bpm+1));
$('#rTarget').onchange=e=>{ S.target=Math.max(50,Math.min(200,Math.round(+e.target.value||120))); e.target.value=S.target; save(); };
$('#rHear').onclick=()=>{ S.hearPat=!S.hearPat; save(); setSwitch($('#rHear'),S.hearPat); };
$('#rSpeed').onclick=()=>{ S.speedUp=!S.speedUp; save(); setSwitch($('#rSpeed'),S.speedUp); };
$('#rChord').onchange=e=>{ S.patChord=e.target.value; save(); };
$('#rTime').onclick=async()=>{ S.timing=!S.timing; save(); setSwitch($('#rTime'),S.timing);
  if(S.timing){ try{ await mic.on(); }catch(e){ S.timing=false; save(); setSwitch($('#rTime'),false); $('#rLegend').textContent=micError(e); return; } if(!tchk) timingReset(); }
  drawTiming(); };
$('#rPlay').onclick=async()=>{
  if(clock.owner==='rhythm'){ clock.stop(); return; }
  if(S.timing){ try{ await mic.on(); }catch(e){ S.timing=false; save(); setSwitch($('#rTime'),false); } }
  timingReset(); clock.start('rhythm',S.bpm,Infinity,rhythmSched,rhythmVis,()=>{ $$('#rGrid [data-i]').forEach(el=>el.classList.remove('now')); save(); setPlay($('#rPlay'),false,'Stop metronome','Start metronome'); drawTiming(); });
  setPlay($('#rPlay'),true,'Stop metronome','Start metronome');
};

/* songs */
let openSong=null, songFilter='all', editing=null, songRun=null;
function renderSongs(){ document.body.classList.remove('songmode'); if(editing) return renderEditor(); if(openSong && getSong(openSong)) return renderPlayer(); openSong=null; if(openSet&&songFilter==='sets') return renderSetDetail(); renderSongList(); }
function chordNames(song){ return songChords(song).map(n=>{ const sh=shapeFor(n); return `<b class="${sh&&learned(sh.n)?'':'no'}">${esc(n)}</b>`; }).join(''); }
function renderSongList(){
  const rank=s=>(S.goal&&S.goal!=='all'&&(s.tags||[]).includes(S.goal)?0:1);
  const songs=allSongs().map(s=>getSong(s.id)).sort((a,b)=>rank(a)-rank(b)), shown=songFilter==='now'?songs.filter(playable):songs, sets=songFilter==='sets';
  $('#songs').innerHTML=`<div class="ph"><h1 class="t-display">Songs</h1><button class="btn quiet" id="sAdd">${icon('plus',18)}Add a song</button></div>
    <div class="tabs" role="group" aria-label="Filter songs"><button data-f="all" aria-pressed="${songFilter==='all'}">All songs</button><button data-f="now" aria-pressed="${songFilter==='now'}">Playable now</button><button data-f="sets" aria-pressed="${sets}">Setlists</button></div>
    ${sets?renderSetlists():shown.length?`<ul class="songs">${shown.map(s=>`<li><button class="song" data-id="${esc(s.id)}"><span><span class="s-t">${esc(s.title)}</span>
      <span class="s-m"><span class="cn">${chordNames(s)}</span><span>${esc(s.time)}</span>${s.user?'<span>Your song</span>':''}</span></span>${S.songBest[s.id]?`<span class="best">${S.songBest[s.id]} bpm</span>`:''}</button></li>`).join('')}</ul>`
      :`<p class="lede">No songs use only the chords you know yet. Mark chords as learned in Practice, or start with Down in the Valley, which needs only C and G7.</p>`}`;
  $$('#songs [data-f]').forEach(b=>b.onclick=()=>{ songFilter=b.dataset.f; renderSongList(); });
  $$('#songs .song[data-id]').forEach(b=>b.onclick=()=>{ setRun=null; openSong=b.dataset.id; renderPlayer(); window.scrollTo(0,0); });
  if(sets) wireSetlists();
  $('#sAdd').onclick=()=>{ editing={id:null}; renderEditor(); };
}
function renderEditor(){
  const ex=editing.id?S.userSongs.find(s=>s.id===editing.id):null;
  $('#songs').innerHTML=`<div class="ph"><button class="icon-btn" id="eBack" aria-label="Back to songs" style="margin-left:-10px">${icon('back')}</button></div>
    <h1 class="t-display" style="margin-bottom:12px">${ex?'Edit your song':'Add a song'}</h1>
    <p class="lede">Paste a chord sheet in ChordPro format, with each chord in square brackets just before the syllable where it changes. A chord lasts one bar unless you give it beats, like [G:2].</p>
    <label class="sr" for="eText">Chord sheet</label>
    <textarea id="eText" spellcheck="false" placeholder="{title: My song}&#10;{time: 4/4}&#10;{tempo: 90}&#10;I [C]walked along the [G]road,&#10;and [F]sang a song I [C]know.">${esc(ex?ex.src:'')}</textarea>
    <p class="note off" id="eErr" aria-live="polite"></p>
    <div class="row" style="margin-top:6px"><button class="btn primary" id="eSave">Save song</button>${ex?'<button class="btn quiet" id="eDel">Delete song</button>':''}</div>`;
  $('#eBack').onclick=()=>{ editing=null; renderSongs(); };
  $('#eText').oninput=()=>{ $('#eErr').textContent=''; };
  $('#eSave').onclick=()=>{ const src=$('#eText').value, p=parseSong(src);
    if(!src.trim()){ $('#eErr').textContent='Paste a chord sheet first.'; return; }
    if(!p.nbars){ $('#eErr').textContent='Add at least one chord in square brackets, like [C].'; return; }
    if(ex){ ex.src=src; openSong=ex.id; } else { const id='u'+Date.now().toString(36); S.userSongs.push({id,src,credit:'Your song'}); openSong=id; }
    editing=null; save(); renderSongs(); window.scrollTo(0,0); };
  if(ex) $('#eDel').onclick=()=>{ const b=$('#eDel'); if(b.dataset.confirm){ S.userSongs=S.userSongs.filter(s=>s.id!==ex.id); delete S.songBest[ex.id]; editing=null; openSong=null; save(); renderSongs(); } else { b.dataset.confirm='1'; b.textContent='Tap again to delete'; } };
}
function renderPlayer(){
  if(clock.owner==='rhythm') clock.stop();
  const s=getSong(openSong), bpm=S.songBpm[s.id]||s.tempo||80; S.songBpm[s.id]=bpm;
  const names=songChords(s), missing=names.filter(n=>!shapeFor(n));
  let bi=0; const sheet=s.lines.map(l=>{ if(l.gap) return '<div class="gap"></div>'; if(!l.bars.length) return `<div class="line plain">${esc(l.plain)}</div>`;
    return `<div class="line">${l.pre?`<span class="pre">${esc(l.pre)}</span>`:''}${l.bars.map((b,i)=>`<span class="bar" data-b="${bi++}"><span class="ch${i&&l.bars[i-1].name===b.name?' rep':''}">${esc(b.name)}${b.beats!==s.beats?`<span class="sr">, ${b.beats} beats</span>`:''}</span><span class="ly">${esc(b.lyric)||' '}</span></span>`).join('')}</div>`; }).join('');
  $('#songs').innerHTML=`<div class="ph" style="margin-bottom:4px"><button class="icon-btn" id="sBack" aria-label="${setRun?'Back to the setlist':'All songs'}" style="margin-left:-10px">${icon('back')}</button><span class="row" style="gap:0">${s.user?'<button class="btn quiet" id="sEdit">Edit</button>':''}<button class="btn quiet" id="sToSet" aria-expanded="false">${icon('plus',16)}Setlist</button></span></div>
    ${addToSetPanel(s)}
    <h1 class="t-display">${esc(s.title)}</h1><p class="credit">${s.credit?esc(s.credit)+'<br>':''}${esc(s.time)} time</p>
    ${setBarHtml(s)}
    <div class="keyrow"><span class="lbl">Key</span><div class="keyctl"><button class="icon-btn sm" id="kDown" aria-label="Lower the key">${icon('minus',18)}</button><b id="kName" aria-live="polite">${esc(s.key)}</b><button class="icon-btn sm" id="kUp" aria-label="Raise the key">${icon('plus',18)}</button></div>
      <span class="row" style="gap:2px">${s.semis?`<button class="btn quiet" id="kReset" style="padding:6px 8px">Back to ${esc(s.origKey)}</button>`:''}<button class="btn quiet" id="kEasy" style="padding:6px 8px">Easiest for me</button></span></div>
    <p class="note" id="kMsg" aria-live="polite" style="margin-top:0"></p>
    <details class="opts"><summary>Play-along options</summary><div class="inner">
      <button class="switch" role="switch" id="sWait" aria-checked="${S.songWait}"><span class="sw" aria-hidden="true"></span><span>Wait for me at each chord change<span class="hint">The song pauses until you’re ready</span></span></button>
      <button class="switch" role="switch" id="sBacking" aria-checked="${S.songBacking}"><span class="sw" aria-hidden="true"></span>Backing strum plays the pattern</button>
      <button class="switch" role="switch" id="sSpeed" aria-checked="${S.songSpeed}"><span class="sw" aria-hidden="true"></span>Speed up 5 bpm after each play</button>
    </div></details>
    <p class="note" id="sMsg" aria-live="polite"></p>
    <div class="countin" id="sCount" aria-hidden="true"></div>
    <div class="sheet" id="sheet">${sheet}</div>
    <h3 class="label">Chords in this song</h3>
    <div class="strip">${names.map(n=>{ const sh=shapeFor(n); return `<div class="sc"><div class="nm">${esc(n)}</div>${diagram(sh,68,n)}</div>`; }).join('')}</div>
    ${missing.length?`<p class="note off">No diagram yet for ${esc(missing.join(', '))}. Those bars will play, but Koa can\u2019t check them.</p>`:''}
    ${(()=>{ const P=songPattern(s); return P?`<div class="strumrow"><span class="lbl">Strum</span><span class="mini" role="img" aria-label="${esc(P.n)} strum pattern">${[...P.p].slice(0,s.beats*2).map((ch,i)=>{ const g=ch==='.', down=g?i%2===0:ch==='D'; return `<svg class="${g?'g':''}" width="12" height="18" viewBox="0 0 26 36" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="${g?2.4:3}" stroke-linecap="round" stroke-linejoin="round" ${g?'stroke-dasharray="3 4"':''}>${down?'<path d="M13 4v26M5.5 22.5 13 30l7.5-7.5"/>':'<path d="M13 32V6M5.5 13.5 13 6l7.5 7.5"/>'}</g></svg>`; }).join('')}</span><span class="spn">${esc(P.n)}</span><button class="btn quiet" id="sStrumGo" style="padding:4px 6px">Practice it</button></div>`:''; })()}
    <div class="nowcard" id="nowCard" hidden aria-live="polite">
      <div class="nc"><span class="lbl">Now</span><b id="ncNow">–</b><div id="ncNowDia" class="ncd"></div></div>
      <div class="nc next"><span class="lbl">Next</span><b id="ncNext">–</b><div id="ncNextDia" class="ncd"></div></div>
      <div class="ncw" id="ncWait" hidden><p id="ncWaitTxt"></p><button class="btn primary" id="ncReady">Ready</button></div>
    </div>
    <div class="transport">
      <button class="play sm" id="sPlay"></button>
      <div class="tempo"><button class="icon-btn sm" id="sMinus" aria-label="Slower">${icon('minus',20)}</button><div class="bpmv"><b id="sBpm">${bpm}</b><span>bpm</span></div><button class="icon-btn sm" id="sPlus" aria-label="Faster">${icon('plus',20)}</button></div>
      <div class="row" style="gap:2px"><button class="icon-btn" id="sLoop" aria-pressed="false" aria-label="Loop this line" title="Loop this line">${icon('loop')}</button><button class="icon-btn" id="sListen" aria-pressed="${S.songListen}" aria-label="Listen to my playing" title="Listen to my playing">${icon('mic')}</button><button class="icon-btn" id="sStage" aria-label="Stage view" title="Stage view">${icon('stage')}</button></div>
    </div>`;
  document.body.classList.add('songmode');
  setPlay($('#sPlay'),clock.owner==='song','Stop','Play along');
  $('#sBack').onclick=()=>{ clock.stop(); clearTimeout(advanceT); openSong=null; if(setRun){ openSet=setRun.id; songFilter='sets'; setRun=null; } document.body.classList.remove('songmode'); renderSongs(); window.scrollTo(0,0); };
  wireSetBar(); wireAddPanel(s);
  const setKey=k=>{ clock.stop(); k=((k+6)%12+12)%12-6; S.songKey[s.id]=k; save(); renderPlayer(); };
  $('#kDown').onclick=()=>setKey(s.semis-1); $('#kUp').onclick=()=>setKey(s.semis+1);
  if($('#kReset')) $('#kReset').onclick=()=>setKey(0);
  $('#kEasy').onclick=()=>{ const k=easiestKey(s.id); if(k===s.semis){ $('#kMsg').textContent=`${s.key} is already the easiest key for the chords you know.`; return; } setKey(k); const n=getSong(s.id); $('#kMsg').textContent=`Moved to ${n.key}, which uses chords you know best.`; };
  const setSongBpm=v=>{ v=Math.max(40,Math.min(180,Math.round(v))); S.songBpm[s.id]=v; $('#sBpm').textContent=v; if(clock.owner==='song') clock.bpm=v; save(); };
  hold($('#sMinus'),()=>setSongBpm((S.songBpm[s.id]||80)-1)); hold($('#sPlus'),()=>setSongBpm((S.songBpm[s.id]||80)+1));
  $('#sPlay').onclick=()=>{ if(clock.owner==='song'){ clock.stop(); return; } playSong(s); };
  $('#sStage').onclick=()=>enterStage(s);
  $('#sListen').onclick=async()=>{ S.songListen=!S.songListen; save(); $('#sListen').setAttribute('aria-pressed',String(S.songListen));
    if(S.songListen){ try{ await mic.on(); $('#sMsg').className='note'; $('#sMsg').textContent='Listening. Each bar turns green when Koa hears the right chord.'; }
      catch(e){ S.songListen=false; save(); $('#sListen').setAttribute('aria-pressed','false'); $('#sMsg').textContent=micError(e); } }
    else $('#sMsg').textContent=''; };
  $('#sBacking').onclick=()=>{ S.songBacking=!S.songBacking; save(); setSwitch($('#sBacking'),S.songBacking); };
  $('#sWait').onclick=()=>{ S.songWait=!S.songWait; save(); setSwitch($('#sWait'),S.songWait); if(!S.songWait) releaseWait(); };
  $('#sLoop').onclick=()=>{ const R=songRun; if(!R||R.cur<0){ $('#sMsg').className='note'; $('#sMsg').textContent='Start playing, then tap loop to repeat the line you\u2019re on.'; return; }
    if(R.loop){ R.loop=null; $('#sLoop').setAttribute('aria-pressed','false'); $$('#sheet .bar.lp').forEach(e=>e.classList.remove('lp')); return; }
    const li=R.bars[R.cur].li, idx=R.bars.map((b,i)=>b.li===li?i:-1).filter(i=>i>=0); R.loop={from:idx[0],to:idx[idx.length-1]};
    $('#sLoop').setAttribute('aria-pressed','true'); idx.forEach(i=>{ const e=$(`#sheet .bar[data-b="${i}"]`); if(e) e.classList.add('lp'); }); };
  $('#ncReady').onclick=releaseWait;
  const sg=$('#sStrumGo'); if(sg) sg.onclick=()=>{ const P=songPattern(s); clock.stop(); S.mode='strum'; S.pattern=STRUMS.indexOf(P); S.bpm=Math.min(S.songBpm[s.id]||80,90); save(); show('practice','rhythm'); };
  $('#sSpeed').onclick=()=>{ S.songSpeed=!S.songSpeed; save(); setSwitch($('#sSpeed'),S.songSpeed); };
  if(s.user) $('#sEdit').onclick=()=>{ clock.stop(); editing={id:s.id}; document.body.classList.remove('songmode'); renderEditor(); };
}
function flatBars(s){ const out=[]; s.lines.forEach((l,li)=>{ if(l.bars) l.bars.forEach(b=>out.push({...b,li,shape:shapeFor(b.name)})); }); return out; }
function playSong(s){
  if(clock.on) clock.stop();
  const bars=flatBars(s), starts=[]; let t=s.beats*2; bars.forEach(b=>{ starts.push(t); t+=b.beats*2; });
  const barAt=tick=>{ let lo=0,hi=starts.length-1,r=-1; while(lo<=hi){ const m=(lo+hi)>>1; if(starts[m]<=tick){ r=m; lo=m+1; } else hi=m-1; } return r; };
  const holdAt=new Set(); bars.forEach((b,i)=>{ if(i>0&&b.name!==bars[i-1].name) holdAt.add(starts[i]); });
  songRun={s,bars,starts,limit:t,cur:-1,hit:new Array(bars.length).fill(false),lineOf:bars.map(b=>b.li),barAt,holdAt,released:new Set(),wait:null,loop:null,P:songPattern(s)};
  $$('#sheet .bar').forEach(el=>el.classList.remove('now','hit','miss')); if($('#sMsg')){ $('#sMsg').textContent=''; $('#sMsg').className='note'; }
  clock.start('song',S.songBpm[s.id]||80,t,(tick,time)=>{
    if(tick>=t) return; const R=songRun, b=barAt(tick);
    if(tick%2===0) click(time, b<0?tick===0:tick===starts[b]);
    if(S.songBacking && b>=0 && bars[b].shape){ const P=R.P, k=tick-starts[b];
      if(P){ const ch=P.p[k%P.p.length]; if(ch&&ch!=='.') strumAt(bars[b].shape,time,ch==='U',ch==='U'?0.13:0.17); } else if(k===0) strumAt(bars[b].shape,time,false,0.2); }
    if(R.loop && b===R.loop.to && tick===starts[b]+bars[b].beats*2-1) return starts[R.loop.from];
  },songVis,endSong);
  clock.gate=(tick,time)=>{ const R=songRun; if(!R||!S.songWait||!R.holdAt.has(tick)||R.released.has(tick)) return false;
    R.wait=tick; const b=R.barAt(tick); setTimeout(()=>showWait(b),Math.max(0,(time-ctx.currentTime+outLat())*1000)); return true; };
  setPlay($('#sPlay'),true,'Stop','Play along'); setPlay($('#stPlay'),true,'Stop','Play along');
}
function songVis(tick){
  const R=songRun; if(!R) return; const s=R.s;
  if(tick>=R.limit){ finishSong(); return; }
  const b=R.barAt(tick), beat=Math.floor(tick/2), cnt=$('#sCount');
  if(b<0){ if(cnt) cnt.textContent=`Count in ${beat+1}`; stageUpdate(null,R.bars[0],'',String(beat+1)); return; }
  if(cnt && tick===R.starts[0]) cnt.textContent='';
  if(b!==R.cur){
    const prev=R.cur; R.cur=b;
    if(prev>=0 && S.songListen && mic.stream && R.bars[prev].shape){ const el=$(`#sheet .bar[data-b="${prev}"]`); if(el) el.classList.add(R.hit[prev]?'hit':'miss'); }
    $$('#sheet .bar.now').forEach(el=>el.classList.remove('now'));
    const el=$(`#sheet .bar[data-b="${b}"]`); if(el){ el.classList.add('now'); if(prev<0||R.lineOf[prev]!==R.lineOf[b]) el.scrollIntoView({behavior:'smooth',block:'center'}); }
    const line=s.lines[R.bars[b].li]; stageUpdate(R.bars[b],R.bars[b+1],(line.pre||'')+line.bars.map(x=>x.lyric).join(''),'');
    nowCard(R.bars[b],R.bars[b+1]);
  }
  if(document.body.classList.contains('stage')) $('#stCount').textContent=S.songListen&&R.hit[b]?'Heard it':'';
}
function finishSong(){
  const R=songRun; if(!R) return; const s=R.s, bpm=clock.bpm;
  if(S.songListen && mic.stream && R.cur>=0 && R.bars[R.cur].shape){ const el=$(`#sheet .bar[data-b="${R.cur}"]`); if(el) el.classList.add(R.hit[R.cur]?'hit':'miss'); }
  const checked=R.bars.filter(b=>b.shape).length, hits=R.hit.filter((h,i)=>h&&R.bars[i].shape).length;
  const listened=S.songListen&&!!mic.stream, passed=!listened||checked===0||hits/checked>=0.6;
  R.done=true; clock.stop();
  let msg=listened&&checked?`Koa heard ${hits} of ${checked} bars. `:'';
  if(passed){ S.songBest[s.id]=Math.max(S.songBest[s.id]||0,Math.round(bpm)); S.songDay[s.id]=today(); ACT.song[s.id]=(ACT.song[s.id]||0)+1; msg+=`Played through at ${Math.round(bpm)} bpm.`;
    if(S.songSpeed){ S.songBpm[s.id]=Math.min(180,Math.round(bpm)+5); msg+=` Next time, ${S.songBpm[s.id]} bpm.`; } }
  else msg+='Aim for 60 percent to count it as played. Try a slower tempo.';
  save();
  const m=$('#sMsg'); if(m){ m.textContent=msg; m.dataset.base=msg; m.className='note'+(passed?' good':''); m.scrollIntoView({behavior:'smooth',block:'center'}); }
  if(setRun) setAdvanceAfterFinish();
  if(document.body.classList.contains('stage')){ $('#stLyric').textContent=msg; $('#stCur').textContent=passed?'Well played':'Once more'; $('#stCur').style.fontSize='clamp(54px,10vw,96px)'; $('#stNext').textContent=''; $('#stDia').innerHTML=''; }
  if($('#sBpm')) $('#sBpm').textContent=S.songBpm[s.id];
}
function endSong(){
  hideWait(); const nc=$('#nowCard'); if(nc) nc.hidden=true;
  setPlay($('#sPlay'),false,'Stop','Play along'); setPlay($('#stPlay'),false,'Stop','Play along');
  $$('#sheet .bar.now').forEach(el=>el.classList.remove('now')); if($('#sCount')) $('#sCount').textContent='';
  if(songRun && !songRun.done && $('#sMsg')) $('#sMsg').textContent='Stopped.';
  songRun=null;
}
function songListenFrame(){
  const R=songRun; if(!R||R.cur<0||!S.songListen||!mic.an) return; const b=R.bars[R.cur]; if(!b.shape||R.hit[R.cur]) return;
  if(mic.rms<TH.gate()) return; if(matches(readChroma(),b.shape).ok) R.hit[R.cur]=true;
}
function songWaitListen(){ const R=songRun; if(!R||R.wait==null||!S.songListen||!mic.an||mic.rms<TH.gate()) { if(R) R.wl=0; return; }
  const nb=R.bars[R.barAt(R.wait)]; if(!nb||!nb.shape) return; if(matches(readChroma(),nb.shape).ok){ R.wl=(R.wl||0)+1; if(R.wl>=4) releaseWait(); } else R.wl=0;
}
/* stage */
let stageSong=null;
function enterStage(s){ stageSong=s; document.body.classList.add('stage'); const x=setRun&&setById(setRun.id); $('#stTitle').textContent=x?`${s.title}, ${setRun.i+1} of ${x.songs.length}`:s.title; $('#stCur').style.fontSize=''; const bars=flatBars(s);
  if(songRun&&songRun.cur>=0){ const b=songRun.cur, line=s.lines[bars[b].li]; stageUpdate(songRun.bars[b],songRun.bars[b+1],(line.pre||'')+line.bars.map(x=>x.lyric).join(''),''); }
  else stageUpdate(null,bars[0],clock.owner==='song'?'':'Press play when you\u2019re ready.','');
  setPlay($('#stPlay'),clock.owner==='song','Stop','Play along'); window.scrollTo(0,0); $('#stExit').focus(); }
$('#stPlay').onclick=()=>{ if(songRun&&songRun.wait!=null){ releaseWait(); return; } if(clock.owner==='song') clock.stop(); else if(stageSong){ $('#stCur').style.fontSize=''; playSong(stageSong); } };
$('#stExit').onclick=()=>{ document.body.classList.remove('stage'); if($('#sStage')) $('#sStage').focus(); };
document.addEventListener('keydown',e=>{ if(e.key==='Escape' && document.body.classList.contains('stage')) $('#stExit').click(); });
function stageUpdate(cur,next,lyric,count){
  if(!document.body.classList.contains('stage')) return;
  const show_=cur||next; $('#stCur').textContent=show_?show_.name:'–'; $('#stDia').innerHTML=diagram(show_&&show_.shape,240,show_&&show_.name);
  $('#stNext').textContent=cur&&next?`Next ${next.name}`:''; $('#stCount').textContent=count; if(lyric!=null) $('#stLyric').textContent=lyric;
}

/* ---------- play-along helpers ---------- */
function songPattern(s){ const n=(s.strum||'').trim().toLowerCase(); if(!n) return s.beats===3?STRUMS.find(p=>p.n==='Waltz'):STRUMS[0];
  const P=STRUMS.find(p=>p.n.toLowerCase()===n); return P&&(P.p.length===s.beats*2||s.beats*2%P.p.length===0||P.p.length%(s.beats*2)===0)?P:(s.beats===3?STRUMS.find(p=>p.n==='Waltz'):STRUMS[0]); }
function nowCard(cur,next){ const nc=$('#nowCard'); if(!nc) return; nc.hidden=false;
  $('#ncNow').textContent=cur?cur.name:'–'; $('#ncNowDia').innerHTML=cur?diagram(cur.shape,60,cur.name):'';
  $('#ncNext').textContent=next?next.name:'End'; $('#ncNextDia').innerHTML=next?diagram(next.shape,48,next.name):''; }
function showWait(b){ const R=songRun; if(!R||R.wait==null) return; const nb=R.bars[b]; if(!nb) return;
  const w=$('#ncWait'); if(w){ w.hidden=false; $('#ncWaitTxt').textContent=`Change to ${nb.name}${S.songListen&&mic.stream?', then strum it':''}. Tap Ready or press Space when your fingers are set.`; }
  const el=$(`#sheet .bar[data-b="${b}"]`); if(el) el.classList.add('wait');
  if(document.body.classList.contains('stage')){ $('#stCur').textContent=nb.name; $('#stDia').innerHTML=diagram(nb.shape,240,nb.name); $('#stNext').textContent='Ready? Tap Play or press Space'; } }
function hideWait(){ const w=$('#ncWait'); if(w) w.hidden=true; $$('#sheet .bar.wait').forEach(e=>e.classList.remove('wait')); }
function releaseWait(){ const R=songRun; if(!R||R.wait==null) return; R.released.add(R.wait); R.wait=null; hideWait(); clock.resume(); }
document.addEventListener('keydown',e=>{ if(e.code!=='Space'||e.repeat) return; const R=songRun; if(!R||R.wait==null) return; const tag=document.activeElement&&document.activeElement.tagName; if(['INPUT','TEXTAREA','SELECT'].includes(tag)) return; e.preventDefault(); releaseWait(); });
