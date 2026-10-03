/* icons, drawn for Koa */
const ICON={
  learn:'<path d="M4 19.5c4.2 0 4.2-5.5 8-5.5s3.8-5.5 8-5.5"/><circle cx="4" cy="19.5" r="1.4"/><path d="M20 8.5V3.2l3 1.4-3 1.5"/>',
  songs:'<path d="M9 17.6V6.3l10-2.1v11.2"/><circle cx="6.8" cy="17.6" r="2.3"/><circle cx="16.8" cy="15.4" r="2.3"/>',
  practice:'<path d="M6 4.2h12M7 4.2V20M10.3 4.2V20M13.7 4.2V20M17 4.2V20M7 9.5h10M7 14.8h10"/><circle cx="13.7" cy="12.1" r="1.8" fill="currentColor" stroke="none"/>',
  tune:'<path d="M9 3v6.6a3 3 0 0 0 6 0V3M12 12.6V21"/>',
  settings:'<path d="M4 7.5h9M17 7.5h3M4 16.5h3M11 16.5h9"/><circle cx="15" cy="7.5" r="2"/><circle cx="9" cy="16.5" r="2"/>',
  play:'<path d="M8.5 5.6v12.8L19 12z" fill="currentColor" stroke="none"/>',
  stop:'<rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor" stroke="none"/>',
  back:'<path d="M14.5 5.5 8 12l6.5 6.5"/>',
  close:'<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
  mic:'<rect x="9" y="3.5" width="6" height="11" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v2.5"/>',
  stage:'<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  minus:'<path d="M6.5 12h11"/>', plus:'<path d="M6.5 12h11M12 6.5v11"/>',
  check:'<path d="M6 12.5l4 4L18 8"/>',
  loop:'<path d="M17 3.5l3 3-3 3"/><path d="M4 11.5v-1a4 4 0 0 1 4-4h12M7 20.5l-3-3 3-3"/><path d="M20 12.5v1a4 4 0 0 1-4 4H4"/>',
  hear:'<path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z"/><path d="M15.5 9.2a4 4 0 0 1 0 5.6M18 6.8a7.4 7.4 0 0 1 0 10.4"/>',
  up:'<path d="M6.5 14.5 12 9l5.5 5.5"/>', down:'<path d="M6.5 9.5 12 15l5.5-5.5"/>', fwd:'<path d="M9.5 5.5 16 12l-6.5 6.5"/>'
};
const icon=(n,s=22,sw=1.6)=>`<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[n]}</svg>`;
function setSwitch(el,v){ if(el) el.setAttribute('aria-checked',String(!!v)); }
function setPlay(el,on,labelOn,labelOff){ if(!el) return; el.innerHTML=icon(on?'stop':'play',el.classList.contains('sm')?22:28); el.setAttribute('aria-label',on?labelOn:labelOff); }

/* navigation */
let curTab='learn';
const SECTIONS=['learn','songs','practice','tune'];
const NAVLABEL={learn:'Learn',songs:'Songs',practice:'Practice',tune:'Tune'};
$$('.dock [data-s]').forEach(b=>{ b.innerHTML=`${icon(b.dataset.s,24)}<span>${NAVLABEL[b.dataset.s]}</span>`; b.onclick=()=>show(b.dataset.s); });
$('#setBtn').innerHTML=icon('settings',22); $('#setClose').innerHTML=icon('close',20); $('#stExit').innerHTML=icon('close',22);
$('#rMinus').innerHTML=icon('minus',20); $('#rPlus').innerHTML=icon('plus',20);
function hold(btn,fn){ let t1=null,t2=null,lastPress=-1e9; const stop=()=>{ clearTimeout(t1); clearInterval(t2); t1=t2=null; };
  btn.addEventListener('pointerdown',e=>{ if(e.button>0) return; e.preventDefault(); lastPress=performance.now(); fn(); stop(); t1=setTimeout(()=>{ t2=setInterval(fn,75); },400); });
  ['pointerup','pointerleave','pointercancel','blur'].forEach(ev=>btn.addEventListener(ev,stop));
  btn.addEventListener('click',()=>{ if(performance.now()-lastPress>700) fn(); }); }
function show(id,sub){
  if(!SECTIONS.includes(id)) id='learn';
  if(clock.owner==='pace' && !(id==='practice' && (sub||S.ptab)==='changes')) clock.stop();
  if(id!=='songs' && clock.owner==='song') clock.stop();
  if(sub) S.ptab=sub;
  document.body.classList.remove('songmode');
  curTab=id; S.tab=id; save();
  $$('main > section').forEach(s=>{ s.hidden=s.id!==id; });
  $$('.dock [data-s]').forEach(b=>{ if(b.dataset.s===id) b.setAttribute('aria-current','page'); else b.removeAttribute('aria-current'); });
  if(id==='learn') openLesson=null;
  ({learn:renderLearn,songs:renderSongs,practice:renderPractice,tune:renderTune})[id]();
  window.scrollTo(0,0); drawSession();
}
$('#brandBtn').onclick=()=>show('learn');
$('#setBtn').onclick=openSettings;
$('#micPill').onclick=()=>mic.off();

/* activity, minutes and streak */
function active(){ return clock.on || pRun || checking || (mic.stream && curTab==='tune'); }
setInterval(()=>{ if(document.hidden||!active()) return; const d=today(); S.mins[d]=(S.mins[d]||0)+5; save(); },5000);
function streak(){ let n=0; const d=new Date(); if(!(S.mins[today(d)]>=30)) d.setDate(d.getDate()-1);
  while(S.mins[today(d)]>=30){ n++; d.setDate(d.getDate()-1); } return n; }

/* learn */
let openLesson=null;
function lessonProgress(l){
  if(lessonDone(l)) return 1;
  switch(l.type){
    case 'tune': return tunedNow.size/4;
    case 'learn': return 0;
    case 'intro': return 0;
    case 'pair': return Math.min(1,(S.bests[pairKey(l.a,l.b)]||0)/l.n);
    case 'song': return Math.min(1,(S.songBest[l.song]||0)/l.bpm);
    case 'time': return Math.min(1,(S.secs[l.key]||0)/l.s);
  } return 0;
}
function renderLearn(){
  if(!S.onboarded) return renderWelcome();
  document.body.classList.remove('onboard');
  if(introStep!=null) return renderIntro();
  const next=LESSONS.findIndex(l=>!lessonDone(l)); if(openLesson==null) openLesson=next;
  const st=streak(), days=[], d=new Date(); d.setDate(d.getDate()-6);
  for(let i=0;i<7;i++){ days.push({k:today(d),l:['S','M','T','W','T','F','S'][d.getDay()]}); d.setDate(d.getDate()+1); }
  const practiced=days.filter(x=>(S.mins[x.k]||0)>=30).length, tmin=Math.round((S.mins[today()]||0)/60), tuned=S.tunedDay===today();
  const hero=planCard();
  $('#learn').innerHTML=`<div class="today">
      <div class="streak">${st?`<span class="t-hero">${st}</span><span class="small">${st===1?'day':'days'} in a row${tmin?`<br>${tmin} min today`:''}</span>`:Object.keys(S.mins).some(k=>k!==today())?`<span class="t-title">Welcome back</span>`:`<span class="t-title">Day one</span>`}</div>
      <div class="dots" role="img" aria-label="Practiced on ${practiced} of the last 7 days">${days.map((x,i)=>`<div><i class="${(S.mins[x.k]||0)>=30?'on':''}${i===6?' now':''}"></i>${x.l}</div>`).join('')}</div>
    </div>
    ${keepNote()}${hero}
    <h3 class="label">Your path</h3>
    <ol class="path">${LESSONS.map((l,i)=>{ const dn=lessonDone(l), cls=dn?'done':i===next?'current':'todo';
      return `<li class="step ${cls}"><button class="step-h" data-i="${i}" aria-expanded="${i===openLesson}">
        <span class="node">${dn?icon('check',14,2.2):''}</span><span class="st-t">${esc(lessonText(l.t))}</span><span class="st-g">${dn?'Done':esc(goalText(l))}</span></button>
        ${i===openLesson?`<div class="step-b"><p>${esc(lessonText(l.d))}</p><div class="row"><button class="btn ${dn?'line':'primary'}" data-go="${i}">${esc(lessonText(l.cta))}</button>${dn?'':`<button class="btn quiet" data-mark="${i}">Mark as done</button>`}</div></div>`:''}</li>`; }).join('')}</ol>`;
  $$('#learn .step-h').forEach(b=>b.onclick=()=>{ const i=+b.dataset.i; openLesson=openLesson===i?-1:i; renderLearn(); const el=$(`#learn .step-h[data-i="${i}"]`); if(el) el.focus(); });
  $$('#learn [data-go]').forEach(b=>b.onclick=()=>goLesson(LESSONS[+b.dataset.go]));
  $$('#learn [data-mark]').forEach(b=>b.onclick=()=>{ const l=LESSONS[+b.dataset.mark]; if(!S.manual.includes(l.id)) S.manual.push(l.id); save(); openLesson=-1; renderLearn(); });
  wirePlanCard(); wireKeepNote(); askToKeep();
}
function goLesson(l){
  if(l.type==='intro'){ introStep=0; introOk=false; zoomed=false; if(curTab!=='learn') show('learn'); else renderLearn(); window.scrollTo(0,0); return; }
  if(l.type==='tune') show('tune');
  else if(l.type==='learn'){ S.sel=CHORDS.findIndex(c=>c.n===l.c); save(); show('practice','chords'); }
  else if(l.type==='time'){ clock.stop(); if(l.key==='pick'){ S.mode='pick'; S.pick=l.pick||0; } else { S.mode='strum'; S.pattern=l.pat; } if(l.bpm) S.bpm=l.bpm; save(); show('practice','rhythm'); }
  else if(l.type==='pair'){ S.pairA=l.a; S.pairB=l.b; save(); show('practice','changes'); }
  else if(l.type==='song'){ openSong=l.song; S.songBpm[l.song]=l.bpm; save(); show('songs'); }
}

/* tune */
let phase=0, tCents=null, hist=[], lastHeard=0, frame=0; const tunedNow=new Set();
function renderTune(){
  const o=TUNINGS[S.tuning].open;
  $('#tTuning').textContent=TUNINGS[S.tuning].label;
  $('#tStrings').innerHTML=o.map((m,i)=>`<button data-i="${i}" class="${tunedNow.has(i)?'done':''}" aria-label="Play the ${NOTES[m%12]} string"><span>${NOTES[m%12]}</span><small>${['4th','3rd','2nd','1st'][i]}</small></button>`).join('');
  $$('#tStrings button').forEach(b=>b.onclick=()=>pluck(o[+b.dataset.i],0,0.6));
  $('#earRow').innerHTML=o.map((m,i)=>`<button class="switch" role="switch" aria-checked="${tunedNow.has(i)}" data-i="${i}"><span class="sw" aria-hidden="true"></span>${NOTES[m%12]} matches</button>`).join('');
  $$('#earRow button').forEach(b=>b.onclick=()=>{ const i=+b.dataset.i; if(tunedNow.has(i)) tunedNow.delete(i); else tunedNow.add(i); setSwitch(b,tunedNow.has(i)); $$('#tStrings button').forEach((x,k)=>x.classList.toggle('done',tunedNow.has(k)));
    if(tunedNow.size===4){ S.tunedDay=today(); S.tunedOnce=true; save(); $('#earMsg').className='note good'; $('#earMsg').textContent='All four strings match. You\u2019re in tune.'; } else $('#earMsg').textContent=''; });
  $('#micBtn').innerHTML=mic.stream?'Stop listening':`${icon('mic',18)}Start listening`;
}
$('#tTuning').onclick=openSettings;
$('#micBtn').onclick=async()=>{
  if(mic.stream){ mic.off(); return; }
  try{ await mic.on(); $('#tMsg').textContent='Listening. Pluck one string and let it ring.'; $('#tCents').textContent='Play a string'; }
  catch(e){ $('#tMsg').textContent=micError(e)+' Tune by ear below instead.'; $('#earBox').open=true; }
};
function resetTunerDisplay(){ tCents=null; hist=[]; $('#tNote').textContent='–'; $('#tNote').style.color=''; $('#tNote').classList.add('idle'); $('#tCents').textContent=mic.stream?'Play a string':'Waiting to listen'; $$('#tStrings button').forEach(b=>b.classList.remove('hit')); }
let waveFlat=false;
function tunerFrame(tick){
  if(tick && mic.an && frame%2===0){
    const f=autoCorrelate(mic.td.subarray(mic.td.length-4096),ctx.sampleRate);
    if(f>0){
      const midi=69+12*Math.log2(f/440); hist.push(midi); if(hist.length>5) hist.shift();
      const m=[...hist].sort((a,b)=>a-b)[Math.floor(hist.length/2)];
      const o=TUNINGS[S.tuning].open; let bi=0; o.forEach((t,i)=>{ if(Math.abs(m-t)<Math.abs(m-o[bi])) bi=i; });
      const cents=Math.round((m-o[bi])*100);
      if(Math.abs(cents)<350){
        tCents=cents; lastHeard=performance.now(); const ok=Math.abs(cents)<=5;
        $('#tNote').textContent=NOTES[o[bi]%12]; $('#tNote').classList.remove('idle'); $('#tNote').style.color=ok?'var(--good)':'';
        $('#tCents').textContent=ok?'In tune':(cents>0?`${cents} cents sharp, loosen a little`:`${-cents} cents flat, tighten a little`);
        if(ok){ tunedNow.add(bi); if(tunedNow.size===4){ if(S.tunedDay!==today()){ S.tunedDay=today(); S.tunedOnce=true; save(); } $('#tMsg').textContent='All four strings are in tune.'; } }
        $$('#tStrings button').forEach((b,i)=>{ b.classList.toggle('hit',i===bi); b.classList.toggle('done',tunedNow.has(i)); });
        $$('#earRow button').forEach((b,i)=>setSwitch(b,tunedNow.has(i)));
      }
    } else hist=[];
    if(tCents!=null && performance.now()-lastHeard>1500) resetTunerDisplay();
  }
  if(tCents==null && waveFlat) return; waveFlat=tCents==null; // nothing heard: draw the flat string once, not every frame
  const amp=tCents==null?0:Math.min(30,Math.abs(tCents)*0.6);
  phase+=tCents==null?0:0.12+Math.min(0.4,Math.abs(tCents)/200);
  const mk=$('#tMark'); if(mk){ mk.classList.toggle('on',tCents!=null); if(tCents!=null){ mk.style.left=(50+clamp(tCents,-50,50))+'%'; mk.style.background=Math.abs(tCents)<=5?'var(--good)':'var(--koa)'; } }
  let d='M0 42'; for(let x=0;x<=400;x+=8){ const env=Math.sin(Math.PI*x/400); d+=` L${x} ${(42+Math.sin(x/22+phase)*amp*env).toFixed(1)}`; }
  const p=$('#tWave'); p.setAttribute('d',d); p.setAttribute('stroke',tCents==null?'var(--nylon)':(Math.abs(tCents)<=5?'var(--good)':'var(--koa)'));
}

/* practice shell */
function renderPractice(){
  if(!['chords','changes','rhythm'].includes(S.ptab)) S.ptab='chords';
  $$('#pTabs button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.p===S.ptab)));
  ['chords','changes','rhythm'].forEach(k=>{ $('#pv-'+k).hidden=k!==S.ptab; });
  if(S.ptab!=='rhythm' && clock.owner==='rhythm') {} // metronome keeps going across tools on purpose
  ({chords:renderChords,changes:renderChanges,rhythm:renderRhythm})[S.ptab]();
}
$$('#pTabs button').forEach(b=>b.onclick=()=>{ S.ptab=b.dataset.p; save(); renderPractice(); });

/* chords */
let checking=false;
const GROUPS=[['Start here',['C','Am','F','G']],['Next',['G7','C7','Em','Dm','D','A','A7','E7']],['Further along',['D7','F7','Am7','Cmaj7','B♭','Bm','E','Gm','Cm']],['More shapes',['Em7','Dm7','Gm7','Bm7','F♯m','C♯m','B7','B♭7','Fm','E♭','C♯','F♯','A♭','B','A♭7','C♯7','E♭7','F♯7','B♭m','E♭m','A♭m']]];
function renderChords(){
  const c=CHORDS[S.sel]||CHORDS[0], nm=chordName(c), bari=TUNINGS[S.tuning].shift?` On baritone this shape sounds as ${nm}.`:'';
  const steps=chordSteps(c);
  $('#pv-chords').innerHTML=`<div class="focus"><div id="cDia">${diagram(c,180)}</div><div>
      <div class="big">${esc(nm)}</div>
      <div class="meta" id="cMeta">${learned(c.n)?'In your hand.':'Not learned yet.'}${esc(bari)}</div>
      <button class="switch" role="switch" id="cLearn" aria-checked="${learned(c.n)}"><span class="sw" aria-hidden="true"></span>I know this chord</button>
    </div></div>
    <div class="howto"><div class="row" style="justify-content:space-between;margin-bottom:8px"><h3 style="margin:0">How to play ${esc(nm)}</h3><button class="btn line" id="cShow" style="padding:8px 14px">${icon('play',14)}Show me</button></div>
      <ol id="cSteps">${steps.map(st=>`<li${st.open?' class="op"':''}>${esc(st.text)}</li>`).join('')}</ol>
      <p class="tip">${esc(chordTip(c))}</p></div>
    <div class="row actions"><button class="btn primary" id="cCheck">${icon('mic',18)}${checking?'Listening…':'Check my chord'}</button><button class="btn line" id="cHear">${icon('hear',18)}Hear it</button></div>
    <details class="opts selfchk" id="selfBox"><summary>Check by ear instead</summary><div class="inner">
      <p class="small soft" style="margin:4px 0 10px">Strum once, then pluck each string slowly, one at a time. How did it sound?</p>
      <div class="row" style="gap:6px"><button class="btn line" data-self="good">Every string rang clearly</button><button class="btn line" data-self="buzz">A string buzzed or sounded dull</button><button class="btn line" data-self="wrong">It sounds wrong</button></div>
    </div></details>
    <p class="note" id="cMsg" aria-live="polite"></p>
    ${GROUPS.map(([g,names])=>`<h3 class="label">${g}</h3><div class="cgroup" role="group" aria-label="${g}">${names.map(n=>{ const i=CHORDS.findIndex(x=>x.n===n), ch=CHORDS[i];
      return `<button class="ctile" data-i="${i}" aria-pressed="${i===S.sel}" aria-label="${esc(chordName(ch))}${learned(ch.n)?', learned':''}"><div class="nm">${esc(chordName(ch))}${learned(ch.n)?'<i aria-hidden="true"></i>':''}</div>${diagram(ch,66)}</button>`; }).join('')}</div>`).join('')}`;
  $('#cHear').onclick=()=>strumChord(c);
  $('#cShow').onclick=()=>showMe(c);
  $('#cCheck').onclick=()=>checkChord(c);
  $$('#pv-chords [data-self]').forEach(b=>b.onclick=()=>{ const m=$('#cMsg'), v=b.dataset.self;
    if(v==='good'){ m.className='note good'; m.textContent=`Nice. That\u2019s ${chordName(c)}.`; if(!learned(c.n)){ toggleLearned(c.n); setSwitch($('#cLearn'),true); const mt=$('#cMeta'); if(mt) mt.textContent='In your hand.'; const tile=$(`#pv-chords .ctile[data-i="${CHORDS.indexOf(c)}"] .nm`); if(tile&&!tile.querySelector('i')) tile.insertAdjacentHTML('beforeend','<i aria-hidden="true"></i>'); } }
    else if(v==='buzz'){ m.className='note'; m.textContent='Press with your fingertip just behind the fret wire, not on top of it. Curve your fingers so they don\u2019t touch the strings next to them, and press a little firmer.'; }
    else { m.className='note'; m.textContent=`Tap Hear it and compare. Then check each dot: the line it sits on is the string, and the number is the finger. Strings with an open circle ring without a finger.`; } });
  $('#cLearn').onclick=()=>{ toggleLearned(c.n); renderChords(); };
  $$('#pv-chords .ctile').forEach(b=>b.onclick=()=>{ showT.forEach(clearTimeout); S.sel=+b.dataset.i; save(); renderChords(); strumChord(CHORDS[S.sel]); const t=$(`#pv-chords .ctile[data-i="${S.sel}"]`); if(t) t.focus({preventScroll:true}); $('#practice .tabs').scrollIntoView({behavior:'smooth',block:'start'}); });
}
function toggleLearned(n){ const i=S.learned.indexOf(n); if(i>=0) S.learned.splice(i,1); else S.learned.push(n); save(); }
const STRING_NAMES=['4th','3rd','2nd','1st'];
async function checkChord(c){
  if(checking) return;
  const msgEl=()=>$('#cMsg');
  try{ await mic.on(); }catch(e){ msgEl().className='note off'; msgEl().textContent=micError(e)+' You can check by ear below.'; const sb=$('#selfBox'); if(sb) sb.open=true; return; }
  checking=true; const btn=$('#cCheck'); if(btn) btn.innerHTML=`${icon('mic',18)}Listening…`; msgEl().className='note'; msgEl().textContent=`Strum ${chordName(c)} once and let it ring.`;
  const t0=performance.now(); let started=null, frames=[], energy=[0,0,0,0], frets=c.f.map(()=>null), quiet=0, fresh=false; const sub=()=>{ fresh=true; }; onset.subs.add(sub);
  await new Promise(res=>{ const step=()=>{
    if(!mic.an){ res(); return; }
    const r=readTime(), now=performance.now();
    if(started==null){ if(fresh) started=now; else if(now-t0>6000){ res(); return; } }
    else if(now-started>80){ frames.push(readChroma()); const e=stringEnergy(c), fe=fretEnergy(c); for(let i=0;i<4;i++){ energy[i]+=e[i]; if(fe[i]){ if(!frets[i]) frets[i]={want:0,alts:{}}; frets[i].want+=fe[i].want; for(const a in fe[i].alts) frets[i].alts[a]=(frets[i].alts[a]||0)+fe[i].alts[a]; } } if(r<TH.gate()*0.75) quiet++; if(frames.length>=14||quiet>3){ res(); return; } }
    requestAnimationFrame(step); }; step(); });
  onset.subs.delete(sub); checking=false; const b2=$('#cCheck'); if(b2) b2.innerHTML=`${icon('mic',18)}Check my chord`;
  const msg=msgEl(); if(!msg) return;
  if(frames.length<4){ msg.className='note off'; msg.textContent=started==null?'Didn\u2019t hear anything. Strum a little louder, or move closer.':'That faded too fast to hear clearly. Strum again and let it ring.'; return; }
  const avg=new Float32Array(12); frames.forEach(f=>{ for(let i=0;i<12;i++) avg[i]+=f[i]/frames.length; });
  const res=matches(avg,c), notes=notesOf(c), dup=i=>notes.some((m,j)=>j!==i&&(m===notes[i]||Math.abs(m-notes[i])===12)), med=median(energy)||1e-12;
  const weak=energy.map((e,i)=>({e,i})).filter(x=>x.e<med*0.06&&!dup(x.i)).map(x=>x.i);
  const FRET=['open','1st','2nd','3rd','4th','5th'];
  const openN=TUNINGS[S.tuning].open;
  let wrongFret=frets.map((f,i)=>{ if(!f) return null; let ba=null,be=0; for(const a in f.alts) if(f.alts[a]>be){ be=f.alts[a]; ba=+a; } return ba!=null&&be>med*0.35&&(dup(i)||be>f.want*1.2)?{i,a:ba,e:be}:null; }).filter(Boolean);
  wrongFret=wrongFret.map(w=>{ if(w.a===0) return w; const m=openN[w.i]+w.a, j=c.f.findIndex((fr,k)=>k!==w.i&&fr>0&&openN[k]===m); return j>=0?{i:j,a:0,e:w.e}:w; })
    .filter((w,k,arr)=>arr.findIndex(v=>v.i===w.i)===k).sort((x,y)=>(x.a===0?0:1)-(y.a===0?0:1)||y.e-x.e);
  const fretTip=w=>w.a===0?`the ${STRING_NAMES[w.i]} string is ringing open, so press it at the ${FRET[c.f[w.i]]} fret`:`the ${STRING_NAMES[w.i]} string sounds like the ${FRET[w.a]} fret, so move that finger to the ${FRET[c.f[w.i]]} fret`;
  if(!res.ok && res.top.c!==c){ msg.className='note off'; msg.textContent=`That sounded more like ${chordName(res.top.c)}.`+(wrongFret.length?` Start here: ${fretTip(wrongFret[0])}.`:' Check each finger against the diagram and try again.')+(S.cal?'':' If Koa keeps mishearing, calibrate listening in Settings.'); }
  else if(wrongFret.length){ const w=wrongFret[0]; msg.className='note off';
    msg.textContent=w.a===0?`Almost. The ${STRING_NAMES[w.i]} string is ringing open. Press it at the ${FRET[c.f[w.i]]} fret.`:`Almost. The ${STRING_NAMES[w.i]} string sounds like the ${FRET[w.a]} fret. Move that finger to the ${FRET[c.f[w.i]]} fret.`; }
  else if(res.ok && !weak.length){ msg.className='note good'; msg.textContent=`That\u2019s a clean ${chordName(c)}.`;
    if(!learned(c.n)){ toggleLearned(c.n); setSwitch($('#cLearn'),true); const mt=$('#cMeta'); if(mt) mt.textContent='In your hand.'+(TUNINGS[S.tuning].shift?` On baritone this shape sounds as ${chordName(c)}.`:'');
      const tile=$(`#pv-chords .ctile[data-i="${CHORDS.indexOf(c)}"] .nm`); if(tile && !tile.querySelector('i')) tile.insertAdjacentHTML('beforeend','<i aria-hidden="true"></i>'); } }
  else if(res.ok){ msg.className='note'; msg.textContent=`That\u2019s ${chordName(c)}, but the ${weak.map(i=>STRING_NAMES[i]).join(' and ')} string${weak.length>1?'s':''} may be quiet. Press closer to the fret, and check no finger is touching ${weak.length>1?'them':'it'}.`; }
  else { msg.className='note off'; msg.textContent=`That sounded more like ${chordName(res.top.c)}. Check each finger against the diagram and try again.`+(S.cal?'':' If Koa keeps mishearing, calibrate listening in Settings.'); }
}
