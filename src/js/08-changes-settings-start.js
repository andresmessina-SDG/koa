/* changes trainer */
let pRun=false, pEnd=0, pCount=0, pSide=0, pTimer=null, pStable=0, pLastCount=0;
const RING=2*Math.PI*104; $('#pRing').style.strokeDasharray=RING; $('#pRing').style.strokeDashoffset=RING;
const pA=()=>byN[S.pairA]||byN.C, pB=()=>byN[S.pairB]||byN.G7;
function renderChanges(){
  const opts=CHORDS.map(c=>`<option value="${esc(c.n)}">${esc(chordName(c))}</option>`).join('');
  $('#pA').innerHTML=opts; $('#pB').innerHTML=opts; $('#pA').value=pA().n; $('#pB').value=pB().n; $('#pA').disabled=$('#pB').disabled=pRun;
  setSwitch($('#pAuto'),S.autoCount);
  const pace=S.pmode==='pace'; $$('#pMode button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.m===S.pmode)));
  $('#pLede').textContent=pace?'Change chords right on the beat, the way songs need you to. Start slow, then level up.':'One minute, two chords. Count every clean change.';
  $('#pAuto').parentElement.hidden=pace; $('#pPace').hidden=!pace;
  if(pace) $('#pPace').innerHTML=`<span>Level ${S.paceLevel+1} of ${PACE.length}: ${esc(paceLvl().t)}</span><span class="row" style="gap:2px"><button class="icon-btn sm" id="plDown" aria-label="Easier level" ${S.paceLevel?'':'disabled'}>${icon('minus',16)}</button><button class="icon-btn sm" id="plUp" aria-label="Harder level" ${S.paceLevel<PACE.length-1?'':'disabled'}>${icon('plus',16)}</button></span>`;
  if(pace){ $('#plDown').onclick=()=>{ S.paceLevel=Math.max(0,S.paceLevel-1); save(); renderChanges(); }; $('#plUp').onclick=()=>{ S.paceLevel=Math.min(PACE.length-1,S.paceLevel+1); save(); renderChanges(); }; }
  if(!pRun&&!paceRun) $('#pBtn').textContent='Start the minute';
  renderPair();
}
function renderPair(){
  const A=pA(), B=pB(), k=pairKey(A.n,B.n);
  $('#pDiaA').innerHTML=diagram(A,84); $('#pDiaB').innerHTML=diagram(B,84);
  if(!pRun){ $('#pNum').textContent=S.bests[k]!=null?S.bests[k]:'–'; $('#pLbl').textContent='best a minute'; $('#pClock').textContent='1:00'; $('#pRing').style.strokeDashoffset=RING; }
  $('#pChartTitle').textContent=`Your progress on ${chordName(A)} and ${chordName(B)}`;
  $('#pTip').textContent=A.n===B.n?'':pairTip(A,B);
  renderChart(S.hist[k]||[]); renderBests();
}
function renderChart(h){
  if(!h.length){ $('#pChart').innerHTML='<p class="empty">Each finished minute adds a point here, so you can watch your changes speed up over the days.</p>'; return; }
  const pts=h.slice(-20), W=560, H=150, pad=26, mx=Math.max(10,...pts.map(p=>p.v))*1.15;
  const X=i=>pts.length===1?W/2:pad+(W-pad*2)*i/(pts.length-1), Y=v=>H-pad-(H-pad*1.6)*v/mx;
  const d=pts.map((p,i)=>`${i?'L':'M'}${X(i).toFixed(1)} ${Y(p.v).toFixed(1)}`).join(' ');
  const fmt=s=>{ const [,m,dd]=s.split('-'); return `${+m}/${+dd}`; };
  $('#pChart').innerHTML=`<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Changes per minute over your last ${pts.length} sessions, most recently ${pts[pts.length-1].v}">
    <line x1="${pad}" y1="${H-pad}" x2="${W-pad}" y2="${H-pad}" stroke="var(--rule)"/>
    <path d="${d}" fill="none" stroke="var(--koa)" stroke-width="2" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
    ${pts.map((p,i)=>`<circle cx="${X(i)}" cy="${Y(p.v)}" r="3.5" fill="var(--koa)"/>`).join('')}
    <text x="${pad}" y="${H-6}" font-size="12" fill="var(--faint)" font-family="Instrument Sans,sans-serif">${fmt(pts[0].d)}</text>
    <text x="${W-pad}" y="${H-6}" font-size="12" fill="var(--faint)" text-anchor="end" font-family="Instrument Sans,sans-serif">${fmt(pts[pts.length-1].d)}</text>
    <text x="${X(pts.length-1)}" y="${Y(pts[pts.length-1].v)-10}" font-size="13" fill="var(--ink)" text-anchor="${pts.length===1?'middle':'end'}" font-family="Instrument Sans,sans-serif">${pts[pts.length-1].v}</text></svg>`;
}
function renderBests(){
  const e=Object.entries(S.bests).filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1]).slice(0,6), nm=n=>byN[n]?chordName(byN[n]):n;
  $('#pBest').innerHTML=e.length?e.map(([k,v])=>{ const [a,b]=k.split('|'); return `<li><span class="p">${esc(nm(a))} ⇄ ${esc(nm(b))}</span><span>${v}</span></li>`; }).join(''):'<li class="empty">Finish a minute to see your first score here.</li>';
}
function setSide(s){ pSide=s; $('#pSideA').classList.toggle('cur',s===0); $('#pSideB').classList.toggle('cur',s===1); }
function pTick(){
  const left=Math.max(0,pEnd-performance.now()), s=Math.ceil(left/1000);
  $('#pClock').textContent=`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`; $('#pRing').style.strokeDashoffset=String(RING*(left/60000));
  if(left>0) return;
  clearInterval(pTimer); pRun=false; const k=pairKey(pA().n,pB().n), prev=S.bests[k];
  if(pCount>0){ ACT.pair[k]=(ACT.pair[k]||0)+1; S.pairDay[k]=today(); if(prev==null||pCount>prev) S.bests[k]=pCount; (S.hist[k]=S.hist[k]||[]).push({d:today(),v:pCount}); if(S.hist[k].length>60) S.hist[k].shift(); save(); }
  $('#pLbl').textContent=pCount===1?'change':'changes'; $('#pClock').textContent='Done';
  $('#pCount').textContent=pCount===0?'No changes counted. Tap the button each time you switch.':(prev!=null&&pCount>prev?`A new best, up from ${prev}.`:`Your best is ${S.bests[k]}.`);
  $('#pCount').className='note center'+(prev!=null&&pCount>prev?' good':'');
  $('#pBtn').textContent='Go again'; $('#pA').disabled=$('#pB').disabled=false; renderChart(S.hist[k]||[]); renderBests();
  try{ const c=ac(); click(c.currentTime+0.02,true); click(c.currentTime+0.2,true); }catch(e){}
}
function pChange(){ pCount++; pLastCount=performance.now(); setSide(1-pSide); $('#pNum').textContent=pCount; $('#pLbl').textContent=pCount===1?'change':'changes'; }
async function pPress(){
  if(!pRun){
    if(pA().n===pB().n){ $('#pCount').className='note center off'; $('#pCount').textContent='Pick two different chords first.'; return; }
    if(S.autoCount){ try{ await mic.on(); }catch(e){ $('#pCount').textContent=micError(e)+' Tap to count instead.'; S.autoCount=false; save(); setSwitch($('#pAuto'),false); return; } }
    pRun=true; pCount=0; pStable=0; setSide(0); pEnd=performance.now()+60000; $('#pA').disabled=$('#pB').disabled=true;
    $('#pNum').textContent='0'; $('#pLbl').textContent='changes'; $('#pCount').className='note center';
    $('#pBtn').textContent=S.autoCount?'Tap if Koa misses one':'Changed'; $('#pCount').textContent=S.autoCount?`Koa is listening. Play ${chordName(pA())}, then switch.`:'Tap each time you land the next chord.';
    pTimer=setInterval(pTick,200); pTick(); return;
  }
  pChange();
}
function practiceListenFrame(){
  if(!pRun||!S.autoCount||!mic.an||mic.rms<TH.gate()*1.25){ pStable=0; return; }
  const pc=readChroma(), cur=pSide===0?pA():pB(), tgt=pSide===0?pB():pA(), st=sim(pc,template(tgt)), sc=sim(pc,template(cur));
  if(st>TH.match()+0.02 && st>sc+0.06) pStable++; else pStable=0;
  if(pStable>=4 && performance.now()-pLastCount>350){ pStable=0; pChange(); }
}
$('#pA').onchange=e=>{ S.pairA=e.target.value; save(); renderPair(); };
$('#pB').onchange=e=>{ S.pairB=e.target.value; save(); renderPair(); };
$('#pBtn').onclick=()=>{ if(S.pmode==='pace'){ if(paceRun) endPace(false); else startPace(); return; } pPress(); };
$$('#pMode button').forEach(b=>b.onclick=()=>{ if(pRun||paceRun) return; S.pmode=b.dataset.m; save(); renderChanges(); });
$('#pAuto').onclick=()=>{ if(pRun) return; S.autoCount=!S.autoCount; save(); setSwitch($('#pAuto'),S.autoCount); };
document.addEventListener('keydown',e=>{ const tag=document.activeElement&&document.activeElement.tagName;
  if(e.code==='Space' && !e.repeat && curTab==='practice' && S.ptab==='changes' && S.pmode!=='pace' && !['SELECT','BUTTON','INPUT','TEXTAREA'].includes(tag)){ e.preventDefault(); pPress(); } });

/* settings */
function openSettings(){ renderSettings(); const d=$('#settings'); if(d.open) return; if(typeof d.showModal==='function') d.showModal(); else d.setAttribute('open',''); }
function closeSettings(){ const d=$('#settings'); if(typeof d.close==='function') d.close(); else { d.removeAttribute('open'); afterSettings(); } }
$('#setClose').onclick=closeSettings;
$('#settings').addEventListener('click',e=>{ if(e.target===$('#settings')) closeSettings(); });
$('#settings').addEventListener('close',()=>afterSettings());
function afterSettings(){ if(curTab==='songs'&&openSong&&!editing) return renderPlayer(); ({learn:renderLearn,songs:renderSongs,practice:renderPractice,tune:renderTune})[curTab](); }
function renderSettings(){
  const t=S.theme||'auto';
  $('#setBody').innerHTML=`
    <div class="setrow"><h3>Tuning</h3><div class="chips" id="stTun">${Object.entries(TUNINGS).map(([k,v])=>`<button data-v="${k}" aria-pressed="${S.tuning===k}">${{high:'High G',low:'Low G',bari:'Baritone'}[k]}</button>`).join('')}</div></div>
    <div class="setrow"><h3>Playing hand</h3><div class="chips" id="stHand"><button data-v="r" aria-pressed="${!S.lefty}">Right-handed</button><button data-v="l" aria-pressed="${S.lefty}">Left-handed</button></div></div>
    <div class="setrow"><h3>Appearance</h3><div class="chips" id="stTheme"><button data-v="auto" aria-pressed="${t==='auto'}">Match device</button><button data-v="light" aria-pressed="${t==='light'}">Day</button><button data-v="dark" aria-pressed="${t==='dark'}">Night</button></div></div>
    <div class="setrow"><h3>Listening</h3><p class="small soft" style="margin-bottom:10px">${S.cal?`Calibrated on ${S.cal.date.split('-').slice(1).map(Number).join('/')}.`:'Not calibrated yet. Calibrating makes chord checks and rhythm timing more accurate.'}</p>
      <button class="btn line" id="stCal">${icon('mic',16)}${S.cal?'Calibrate again':'Calibrate listening'}</button>
      <h3 style="margin-top:16px">How strict</h3><div class="chips" id="stSens"><button data-v="1" aria-pressed="${S.sens===1}">Forgiving</button><button data-v="0" aria-pressed="${!S.sens}">Normal</button><button data-v="-1" aria-pressed="${S.sens===-1}">Strict</button></div></div>
    <div class="setrow"><h3>Back up your progress</h3><p class="small soft" style="margin-bottom:10px">Koa saves your progress in this browser only. Keep a backup so you never lose it.</p>
      <div class="row"><button class="btn line" id="bkSave">Save a backup</button><button class="btn quiet" id="bkCopy">Copy backup</button><label class="btn quiet" for="bkFile" style="cursor:pointer">Restore a backup</label><input type="file" id="bkFile" accept=".json,application/json" class="sr"></div>
      <p class="note" id="bkMsg" aria-live="polite"></p></div>
    <div class="setrow"><h3>Your progress</h3><button class="btn quiet" id="stReset" style="padding-left:0;color:var(--off)">Reset all progress</button><p class="note" id="stResetMsg"></p></div>`;
  $('#stCal').onclick=openCalib;
  $$('#stSens button').forEach(b=>b.onclick=()=>{ S.sens=+b.dataset.v; save(); renderSettings(); });
  $('#bkSave').onclick=()=>saveBackup($('#bkMsg')); $('#bkCopy').onclick=()=>copyBackup($('#bkMsg'));
  $('#bkFile').onchange=e=>{ const f=e.target.files&&e.target.files[0]; if(!f) return; const rd=new FileReader(); rd.onload=()=>{ const r=parseBackup(String(rd.result)), m=$('#bkMsg');
      if(r.err){ m.className='note off'; m.textContent=r.err; return; }
      m.className='note'; m.innerHTML=`Backup from ${esc((r.saved||'').slice(0,10)||'an earlier date')}. <button class="btn primary" id="bkApply" style="padding:7px 14px;margin-left:6px">Replace my progress</button>`;
      $('#bkApply').onclick=()=>{ applyBackup(r.state); renderSettings(); $('#bkMsg').className='note good'; $('#bkMsg').textContent='Progress restored.'; }; }; rd.readAsText(f); e.target.value=''; };
  $$('#stTun button').forEach(b=>b.onclick=()=>{ S.tuning=b.dataset.v; tplCache={}; tunedNow.clear(); save(); renderSettings(); });
  $$('#stHand button').forEach(b=>b.onclick=()=>{ S.lefty=b.dataset.v==='l'; save(); renderSettings(); });
  $$('#stTheme button').forEach(b=>b.onclick=()=>{ S.theme=b.dataset.v==='auto'?null:b.dataset.v; applyTheme(); save(); renderSettings(); });
  $('#stReset').onclick=()=>{ const b=$('#stReset'); if(!b.dataset.confirm){ b.dataset.confirm='1'; b.textContent='Tap again to erase lessons, scores, and your songs'; return; }
    clock.stop(); const keep={tuning:S.tuning,lefty:S.lefty,theme:S.theme,uke:S.uke,goal:S.goal,cal:S.cal,sens:S.sens}; for(const k in S) delete S[k]; Object.assign(S,JSON.parse(JSON.stringify(DEFAULTS)),keep);
    save(); openLesson=null; openSong=null; editing=null; openSet=null; setRun=null; wStep=0; introStep=null; $('#stResetMsg').textContent='Progress reset.'; b.textContent='Reset all progress'; delete b.dataset.confirm; };
}
function applyTheme(){ if(S.theme) document.documentElement.dataset.theme=S.theme; else delete document.documentElement.dataset.theme;
  const dark=S.theme?S.theme==='dark':matchMedia('(prefers-color-scheme: dark)').matches; const m=document.querySelector('meta[name=theme-color]'); if(m) m.content=dark?'#1B1714':'#F5EFE4'; }
try{ matchMedia('(prefers-color-scheme: dark)').addEventListener('change',applyTheme); }catch(e){}

/* one listening loop */
function onMicChange(){ if(curTab==='tune') renderTune(); if(!mic.stream){ resetTunerDisplay(); $('#tMsg').textContent='Tap a string to hear its reference note.'; } }
function mainLoop(){
  frame++;
  handFrame();
  if(mic.an){ readTime(); onset.frame(); songWaitListen(); if(cal){ const l=$('#calLevel'); if(l) l.style.width=Math.min(100,Math.max(2,Math.sqrt(mic.rms)*260))+'%'; } if(curTab==='tune') tunerFrame(); else { practiceListenFrame(); songListenFrame(); } }
  else if(curTab==='tune') tunerFrame();
  requestAnimationFrame(mainLoop);
}
document.addEventListener('visibilitychange',()=>{ if(!document.hidden) return; if(clock.on) clock.stop(); mic.off(); });

/* offline install when served with its service worker */
if('serviceWorker' in navigator && document.querySelector('meta[name="koa-offline"]')){
  const l=document.createElement('link'); l.rel='manifest'; l.href='manifest.webmanifest'; document.head.appendChild(l);
  navigator.serviceWorker.register('sw.js').catch(()=>{});
}

applyTheme();
show(SECTIONS.includes(S.tab)?S.tab:(['chords','rhythm'].includes(S.tab)?(S.ptab=S.tab,'practice'):'learn'));
drawSession();
requestAnimationFrame(mainLoop);
</script>
</body>
</html>
