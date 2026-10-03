/* ---------- precise onset detection (strums and plucks) ---------- */
/* Strum onset detector.
   Two cues: a burst of very high-frequency sound when a string is struck or restarted (second difference,
   measured above the room's own hiss), and a jump in loudness. Windows of about 11 ms are longer than one
   vibration of the lowest string, and each is compared with sound from 12 to 26 ms earlier, so a string's
   own waveform never looks like a new strum. */
const onset={last:-1,hist:[],floor:0.002,ddFloor:0.004,lastNow:0,subs:new Set(),
  frame(){
    if(!mic.an2) return; mic.an2.getFloatTimeDomainData(mic.td2);
    const w=mic.td2, N=w.length, W=512, H=128, sr=ctx.sampleRate, now=ctx.currentTime, g0=now-N/sr;
    let s0=Math.max(W,N-Math.round((now-this.lastNow)*sr)); s0=Math.ceil(s0/H)*H; this.lastNow=now;
    for(let p=s0;p<=N;p+=H){
      let dd=0,e=0; for(let j=p-W+2;j<p;j++){ const v=w[j]-2*w[j-1]+w[j-2]; dd+=v*v; e+=w[j]*w[j]; } dd=Math.sqrt(dd/W); e=Math.sqrt(e/W);
      const t=g0+p/sr; let rd=0,rE=0,rn=0; for(const h of this.hist) if(h.t>=t-0.026&&h.t<=t-0.012){ rd+=h.dd; rE+=h.e; rn++; }
      rd=rn?rd/rn:dd; rE=rn?rE/rn:e; const nf=this.ddFloor*1.15, val=Math.max(0,dd-nf), rv=Math.max(0,rd-nf);
      const attack=val>rv*1.9+this.ddFloor*0.6+1e-5, louder=e>rE*1.45&&e-rE>this.floor*2;
      if(e>Math.max(this.floor*2.2,TH.gate()*0.8) && t-this.last>0.09 && (attack||louder)){
        let tt=t-W/sr/2; for(let k=p-W;k<p;k+=64){ let b=0; for(let j=Math.max(2,k);j<k+64;j++){ const v=w[j]-2*w[j-1]+w[j-2]; b+=v*v; } b=Math.sqrt(b/64); if(b>rd*2.2+this.ddFloor){ tt=g0+k/sr; break; } }
        this.last=t; this.subs.forEach(f=>{ try{ f(tt,e); }catch(_){} }); }
      this.hist.push({t,dd,e}); if(this.hist.length>40) this.hist.shift();
      if(e<this.floor*1.6||e<0.004){ this.floor=this.floor*0.96+e*0.04; this.ddFloor=this.ddFloor*0.96+dd*0.04; }
    }
  }
};
const median=a=>{ if(!a.length) return null; const s=[...a].sort((x,y)=>x-y); const m=s.length>>1; return s.length%2?s[m]:(s[m-1]+s[m])/2; };

/* ---------- calibration ---------- */
let cal=null; const calDlg=$('#calib');
$('#calClose').innerHTML=icon('close',20);
function openCalib(){ if($('#settings').open) $('#settings').close(); cal={step:0,cancel:false,data:{}}; calRender(); if(typeof calDlg.showModal==='function') calDlg.showModal(); else calDlg.setAttribute('open',''); }
function closeCalib(){ if(cal) cal.cancel=true; cal=null; if(typeof calDlg.close==='function'&&calDlg.open) calDlg.close(); else calDlg.removeAttribute('open'); }
$('#calClose').onclick=closeCalib; calDlg.addEventListener('close',()=>{ if(cal) cal.cancel=true; cal=null; });
const CAL_STEPS=[
  {h:'Calibrate listening',t:'Koa will listen to your room and your ukulele for about twenty seconds, then set its listening to match. Tune up first for the best result.',go:'Start'},
  {h:'Stay quiet for a moment',t:'Koa is measuring the background sound in your room.',go:null},
  {h:'Strum a C chord',t:'Strum once and let all four strings ring.',go:null,chord:'C'},
  {h:'Now strum G7',t:'Strum once and let it ring.',go:null,chord:'G7'},
  {h:'Strum on each click',t:'Koa will play eight clicks. Strum once on each one, right on the beat.',go:'Play the clicks',skip:true},
  {h:'All set',t:'',go:'Done'}
];
function calRender(){
  if(!cal) return; const st=CAL_STEPS[cal.step];
  $('#calStep').textContent=cal.step===0||cal.step===5?'':`Step ${cal.step} of 4`;
  $('#calHead').textContent=st.h; $('#calText').textContent=cal.step===5?calSummary():st.t;
  $('#calDia').innerHTML=st.chord?diagram(shapeFor(st.chord)||byN[st.chord],110,st.chord):'';
  $('#calGo').hidden=!st.go; $('#calGo').textContent=st.go||''; $('#calSkip').hidden=!st.skip; $('#calMsg').textContent=''; $('#calMsg').className='note';
  $('#calMeter').hidden=cal.step===0||cal.step===5;
}
function calSummary(){ const c=S.cal; if(!c) return '';
  const lat=c.latency!=null?` Your device\u2019s audio delay is about ${Math.round(c.latency*1000)} ms, and rhythm checks will account for it.`:' Timing was skipped, so rhythm checks use a typical delay.';
  return `Koa now knows how your room and ukulele sound.${lat}${c.warn?' '+c.warn:''}`; }
$('#calGo').onclick=async()=>{
  if(!cal) return;
  if(cal.step===0){ try{ await mic.on(); }catch(e){ $('#calMsg').className='note off'; $('#calMsg').textContent=micError(e); return; } cal.step=1; calRender(); calRunQuiet(); }
  else if(cal.step===4) calRunTiming();
  else if(cal.step===5) closeCalib();
};
$('#calSkip').onclick=()=>{ if(!cal) return; if(cal.step===4){ cal.data.latency=null; calFinish(); } };
const waitFrames=ms=>new Promise(r=>setTimeout(r,ms));
async function calRunQuiet(){
  const c=cal, vals=[]; const t0=performance.now();
  while(c===cal && performance.now()-t0<2000){ await waitFrames(40); if(mic.an) vals.push(mic.rms); }
  if(c!==cal) return; c.data.noise=median(vals)||0.002; c.step=2; calRender(); calRunChord('C');
}
async function calRunChord(name){
  const c=cal, shape=shapeFor(name)||byN[name], thr=Math.max(c.data.noise*5,0.012), t0=performance.now();
  let fresh=false; const sub=()=>{ fresh=true; }; onset.subs.add(sub);
  while(c===cal && !fresh){ await waitFrames(30); if(performance.now()-t0>15000){ $('#calMsg').className='note off'; $('#calMsg').textContent='Still listening. Strum a little louder, or move closer to the microphone.'; } }
  onset.subs.delete(sub); if(c!==cal) return; await waitFrames(90);
  const frames=[]; let peak=0;
  for(let i=0;i<14 && c===cal;i++){ frames.push(readChroma()); peak=Math.max(peak,mic.rms); await waitFrames(22); }
  if(c!==cal) return;
  const avg=new Float32Array(12); frames.forEach(f=>{ for(let i=0;i<12;i++) avg[i]+=f[i]/frames.length; });
  const r=rankChords(avg), s=sim(avg,template(shape));
  c.data[name]={s,top:r[0].c.n,peak};
  $('#calMsg').className='note good'; $('#calMsg').textContent=(r[0].c===shape||addsOneNote(r[0].c,shape))?`Heard ${chordName(shape)}.`:`That sounded closest to ${chordName(r[0].c)}. Koa will adjust.`;
  await waitFrames(900); if(c!==cal) return;
  if(name==='C'){ c.step=3; calRender(); calRunChord('G7'); } else { c.step=4; calRender(); }
}
async function calRunTiming(){
  const c=cal; $('#calGo').hidden=true; $('#calSkip').hidden=true;
  const x=ac(), start=x.currentTime+0.8, beat=60/80, clicks=[], hits=[];
  for(let i=0;i<8;i++){ const t=start+i*beat; clicks.push(t); click(t,i%4===0); }
  const sub=(t)=>hits.push(t); onset.subs.add(sub);
  $('#calMsg').textContent='Listening…';
  await waitFrames((0.8+8*beat+0.6)*1000); onset.subs.delete(sub); if(c!==cal) return;
  const offs=clicks.map(ct=>{ let b=null; for(const h of hits){ const d=h-ct; if(Math.abs(d)<0.3&&(b==null||Math.abs(d)<Math.abs(b))) b=d; } return b; }).filter(v=>v!=null);
  if(offs.length<4){ $('#calMsg').className='note off'; $('#calMsg').textContent=`Koa only heard ${offs.length} of 8 strums. Try again, strumming a little louder.`; $('#calGo').hidden=false; $('#calGo').textContent='Try again'; $('#calSkip').hidden=false; return; }
  c.data.latency=clamp(median(offs),0,0.35); calFinish();
}
function calFinish(){
  const d=cal.data, sims=['C','G7'].map(n=>d[n]?d[n].s:0.8), peaks=['C','G7'].map(n=>d[n]?d[n].peak:0.05);
  const wrong=['C','G7'].filter(n=>{ const sh=shapeFor(n)||byN[n]; return d[n]&&d[n].top!==sh.n&&!addsOneNote(byN[d[n].top],sh); });
  S.cal={noise:d.noise, gate:clamp(d.noise*3,0.004,0.03), onset:clamp(Math.max(d.noise*6,Math.min(...peaks)*0.25),0.008,0.06),
    match:clamp(Math.min(...sims)-0.1,0.5,0.9), latency:d.latency, date:today(),
    warn:wrong.length?`Koa heard ${wrong.join(' and ')} as a different chord. If your ukulele is out of tune, tune up and calibrate again.`:''};
  save(); cal.step=5; calRender();
}

/* ---------- rhythm timing check ---------- */
let tchk=null;
function timingReset(){ tchk={slots:[],recs:[],lastDraw:0}; drawTiming(); }
function timingSlot(tick,time){ if(!tchk||!S.timing) return; const P=rPat(); if(tick<P.p.length) return; /* first bar is a count-in */ const i=tick%P.p.length, ghost=S.mode==='strum'&&P.p[i]==='.'; tchk.slots.push({t:time,i,ghost,hit:false}); }
onset.subs.add((t)=>{
  if(!tchk||!S.timing||clock.owner!=='rhythm') return;
  const t0=t-TH.latency(), w=15/clock.bpm; let best=null;
  for(const s of tchk.slots){ const d=t0-s.t; if(Math.abs(d)<=w && (!best||Math.abs(d)<Math.abs(t0-best.t))) best=s; }
  if(!best||best.hit) return; best.hit=true;
  if(best.ghost) tchk.recs.push({type:'ghost'}); else tchk.recs.push({type:'hit',off:(t0-best.t)*1000});
  const cell=$(`#rGrid .cell[data-i="${best.i}"]`)||$(`#rGrid .cnt[data-i="${best.i}"]`);
  if(cell){ const cls=best.ghost||Math.abs(t0-best.t)>0.045?'flash-off':'flash-good'; cell.classList.remove('flash-off','flash-good'); void cell.offsetWidth; cell.classList.add(cls); }
});
function timingSweep(){
  if(!tchk) return; const lim=ctx.currentTime-TH.latency()-15/clock.bpm-0.02;
  tchk.slots=tchk.slots.filter(s=>{ if(s.t<lim){ if(!s.hit&&!s.ghost) tchk.recs.push({type:'miss'}); return false; } return true; });
  if(tchk.recs.length>64) tchk.recs.splice(0,tchk.recs.length-64);
  if(performance.now()-tchk.lastDraw>250){ tchk.lastDraw=performance.now(); drawTiming(); }
}
function drawTiming(){
  const box=$('#rTimingPanel'); if(!box) return; box.hidden=!S.timing; if(!S.timing) return;
  const recs=tchk?tchk.recs.slice(-32):[], hits=recs.filter(r=>r.type==='hit'), miss=recs.filter(r=>r.type==='miss').length, ghost=recs.filter(r=>r.type==='ghost').length;
  const W=320,H=46,cx=W/2,R=110;
  const dots=hits.slice(-24).map((r,k,a)=>{ const x=cx+clamp(r.off,-R,R)/R*(W/2-10), good=Math.abs(r.off)<=45, op=(0.35+0.65*(k+1)/a.length).toFixed(2);
    return `<circle cx="${x.toFixed(1)}" cy="${H/2}" r="5" fill="${good?'var(--good)':'var(--off)'}" opacity="${op}"/>`; }).join('');
  $('#rTimingStrip').innerHTML=`<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Timing of your last ${hits.length} strums">
    <line x1="10" y1="${H/2}" x2="${W-10}" y2="${H/2}" stroke="var(--rule)" stroke-width="1.5"/><rect x="${cx-0.75}" y="6" width="1.5" height="${H-12}" fill="var(--soft)"/>
    <rect x="${cx-45/R*(W/2-10)}" y="${H/2-10}" width="${90/R*(W/2-10)}" height="20" rx="10" fill="var(--good)" opacity=".16"/>${dots}
    <text x="10" y="${H-2}" font-size="11" fill="var(--faint)" font-family="Instrument Sans,sans-serif">Early</text><text x="${W-10}" y="${H-2}" font-size="11" fill="var(--faint)" text-anchor="end" font-family="Instrument Sans,sans-serif">Late</text></svg>`;
  let msg;
  if(!clock.on||clock.owner!=='rhythm') msg=hits.length?$('#rTimingText').textContent:'Start the metronome and strum along. Each strum lands on this line.';
  else if(!recs.length) msg='First bar is a count-in. Then Koa listens to every strum.';
  else { const on=hits.filter(r=>Math.abs(r.off)<=45).length, total=hits.length+miss, mean=hits.length?hits.reduce((a,r)=>a+r.off,0)/hits.length:0;
    msg=`On the beat ${on} of ${total}.`; if(hits.length>=4){ if(mean<-15) msg+=` You\u2019re rushing by about ${Math.round(-mean)} ms.`; else if(mean>15) msg+=` You\u2019re dragging by about ${Math.round(mean)} ms.`; else msg+=' Your timing is centered.'; }
    if(ghost) msg+=` ${ghost} strum${ghost>1?'s':''} hit a ghost beat.`; if(miss>2) msg+=total&&miss/total>0.3?` Koa missed ${miss} strums. Move a little closer, or strum a bit firmer.`:` ${miss} beats were missed.`; }
  $('#rTimingText').textContent=msg; if(!S.cal&&S.timing&&!clock.on) $('#rTimingText').textContent+=' Calibrate in Settings for exact timing.';
}

/* ---------- daily practice plan ---------- */
const ACT={pair:{},song:{}};
const dayDiff=(a,b)=>Math.round((new Date(a+'T12:00')-new Date(b+'T12:00'))/864e5);
function reviewPair(exclude){
  const cands=new Set(Object.keys(S.bests).filter(k=>S.bests[k]>0));
  LESSONS.filter(l=>l.type==='pair'&&learned(l.a)&&learned(l.b)).forEach(l=>cands.add(pairKey(l.a,l.b)));
  if(exclude) cands.delete(exclude);
  let best=null,bs=-1;
  for(const k of cands){ const [a,b]=k.split('|'); if(!byN[a]||!byN[b]) continue; const v=S.bests[k]||0, h=S.hist[k], last=S.pairDay[k]||(h&&h.length?h[h.length-1].d:null);
    const interval=v<10?1:v<20?2:v<30?4:7, due=last?dayDiff(today(),last)/interval:5, score=due+(30-Math.min(30,v))/100;
    if(due>=1 && score>bs){ bs=score; best=[a,b]; } }
  return best;
}
function planSong(){
  let best=null,bs=-1;
  for(const s0 of allSongs()){ const s=getSong(s0.id); if(!playable(s)) continue; const tempo=s.tempo||90, b=S.songBest[s.id]||0;
    if(b>=tempo && S.songDay[s.id]) continue; const score=(b?1-b/tempo+0.2:0.5-songChords(s).length*0.05)+(S.goal&&(s.tags||[]).includes(S.goal)?0.3:0); if(score>bs){ bs=score; best={id:s.id,bpm:b?Math.min(180,b+5):Math.max(60,tempo-10)}; } }
  return best;
}
function planPattern(){ const i=[0,1,2,3].find(i=>(S.secs['strum:'+STRUMS[i].n]||0)<120); return i==null?2:i; }
function buildPlan(force){
  const d=today(); if(!force && S.plan && S.plan.date===d) return S.plan;
  const steps=[]; const ni=LESSONS.findIndex(l=>!lessonDone(l)), L=ni>=0?LESSONS[ni]:null;
  if(L&&L.type==='intro') steps.push({k:'lesson',id:L.id});
  if(S.tunedDay!==d) steps.push({k:'tune'});
  if(L&&L.type!=='tune'&&L.type!=='intro') steps.push({k:'lesson',id:L.id});
  if(L&&L.type==='tune'){ const L2=LESSONS[ni+1]; if(L2&&!lessonDone(L2)) steps.push({k:'lesson',id:L2.id}); }
  const rv=reviewPair(L&&L.type==='pair'?pairKey(L.a,L.b):null); if(rv) steps.push({k:'pair',a:rv[0],b:rv[1]});
  if(!(L&&L.type==='song')){ const sg=planSong(); if(sg) steps.push({k:'song',id:sg.id,bpm:sg.bpm}); }
  if(steps.length<4 && S.learned.length && !(L&&L.type==='time')) steps.push({k:'rhythm',pat:planPattern(),bpm:S.learned.length<3?60:Math.min(110,Math.max(60,(S.bpm||80)))});
  S.plan={date:d,steps:steps.slice(0,5),i:0,done:[],active:false}; save(); return S.plan;
}
function stepInfo(st){
  switch(st.k){
    case 'tune': return {t:'Tune up',g:'All four strings',go:()=>show('tune')};
    case 'lesson': { const L=LESSONS.find(l=>l.id===st.id); return {t:lessonText(L.t),g:'Lesson '+(LESSONS.indexOf(L)+1)+', '+goalText(L).replace(/, your best is \d+$/,'').replace(/, \d+% done$/,'').replace(/^./,c=>c.toLowerCase()),go:()=>goLesson(L)}; }
    case 'pair': return {t:`Review ${chordName(byN[st.a])} and ${chordName(byN[st.b])}`,g:'One minute of changes',go:()=>{ S.pairA=st.a; S.pairB=st.b; save(); show('practice','changes'); }};
    case 'song': { const s=getSong(st.id); return {t:s?s.title:'A song',g:`Play it through at ${st.bpm} bpm`,go:()=>{ setRun=null; openSong=st.id; S.songBpm[st.id]=st.bpm; save(); show('songs'); }}; }
    case 'rhythm': return {t:`${STRUMS[st.pat].n} strum`,g:`One minute at ${st.bpm} bpm`,go:()=>{ clock.stop(); S.mode='strum'; S.pattern=st.pat; S.bpm=st.bpm; save(); show('practice','rhythm'); }};
  } return {t:'',g:'',go:()=>{}};
}
let snap=null;
function takeSnap(){ snap={pair:{...ACT.pair},song:{...ACT.song},strum:S.secs.strum||0,pick:S.secs.pick||0,t:Date.now()}; }
function stepDone(st){
  if(!snap) takeSnap();
  switch(st.k){
    case 'tune': return S.tunedDay===today();
    case 'pair': { const k=pairKey(st.a,st.b); return (ACT.pair[k]||0)>(snap.pair[k]||0); }
    case 'song': return (ACT.song[st.id]||0)>(snap.song[st.id]||0);
    case 'rhythm': return (S.secs.strum||0)-snap.strum>=60;
    case 'lesson': { const L=LESSONS.find(l=>l.id===st.id); if(!L) return true; if(lessonDone(L)) return true;
      if(L.type==='pair'){ const k=pairKey(L.a,L.b); return (ACT.pair[k]||0)>(snap.pair[k]||0); }
      if(L.type==='song') return (ACT.song[L.song]||0)>(snap.song[L.song]||0);
      if(L.type==='time') return ((S.secs[L.key]||0)-(L.key==='pick'?snap.pick:0))>=(L.key==='pick'?60:0) || (S.secs.strum||0)-snap.strum>=60;
      return false; }
  } return false;
}
function startPlan(){ const p=buildPlan(); p.active=true; if(p.i>=p.steps.length){ p.i=0; p.done=[]; } save(); takeSnap(); stepInfo(p.steps[p.i]).go(); drawSession(); }
function nextStep(){ const p=S.plan; if(!p) return; if(!p.done.includes(p.i)) p.done.push(p.i); p.i++;
  if(p.i>=p.steps.length){ p.active=false; p.complete=true; save(); drawSession(); show('learn'); return; }
  save(); takeSnap(); stepInfo(p.steps[p.i]).go(); drawSession(); }
function endSession(){ if(S.plan){ S.plan.active=false; save(); } drawSession(); if(curTab==='learn') renderLearn(); }
function drawSession(){
  const bar=$('#session'), p=S.plan; if(!p||!p.active||p.date!==today()){ bar.hidden=true; return; }
  const st=p.steps[p.i]; if(!st){ bar.hidden=true; return; } const info=stepInfo(st), dn=stepDone(st);
  bar.hidden=false; bar.classList.toggle('done',dn);
  $('#sesStep').textContent=`Step ${p.i+1} of ${p.steps.length}`; $('#sesTitle').textContent=info.t;
  $('#sesNext').textContent=dn?(p.i+1<p.steps.length?'Next step':'Finish'):'Skip';
  $('#sesNext').className=dn?'btn primary':'btn quiet';
  $('#sesGo').hidden=dn;
}
$('#sesNext').onclick=nextStep; $('#sesEnd').onclick=endSession; $('#sesEnd').innerHTML=icon('close',18);
$('#sesGo').onclick=()=>{ const p=S.plan; if(p&&p.steps[p.i]) stepInfo(p.steps[p.i]).go(); };
setInterval(()=>{ if(S.plan&&S.plan.active) drawSession(); },800);
function planCard(){
  const p=buildPlan(), d=p.done, allDone=p.complete||p.steps.every((_,i)=>d.includes(i));
  const rows=p.steps.map((st,i)=>{ const info=stepInfo(st), ok=d.includes(i), cur=p.active&&i===p.i;
    return `<li class="pstep${ok?' done':''}${cur?' cur':''}"><span class="pn">${ok?icon('check',14,2.2):i+1}</span><span class="pt">${esc(info.t)}</span><span class="pg">${esc(info.g)}</span></li>`; }).join('');
  const mins=Math.max(3,p.steps.length+1);
  return `<article class="card plan"><div class="num">${allDone?'Done for today':`Today\u2019s practice, about ${mins} minutes`}</div>
    <h2 class="t-title">${allDone?'Well played':p.active?'Keep going':p.done.length?'Pick up where you left off':'Your plan for today'}</h2>
    <ol class="psteps">${rows}</ol>
    <div class="row">${allDone?'<button class="btn line" id="planAgain">Practice again</button>':`<button class="btn primary" id="planGo">${p.active||p.done.length?'Continue':'Start practice'}</button>`}</div></article>`;
}
function wirePlanCard(){
  const g=$('#planGo'); if(g) g.onclick=()=>{ const p=S.plan; if(p.active){ stepInfo(p.steps[p.i]).go(); } else { while(p.done.includes(p.i)&&p.i<p.steps.length) p.i++; if(p.i>=p.steps.length) p.i=0; startPlan(); } };
  const a=$('#planAgain'); if(a) a.onclick=()=>{ buildPlan(true); startPlan(); };
}

/* ---------- setlists ---------- */
let openSet=null, setRun=null, advanceT=null;
const setById=id=>S.setlists.find(x=>x.id===id);
function setlistNames(){ return S.setlists; }
function renderSetlists(){
  const sets=S.setlists;
  return `${sets.length?`<ul class="songs">${sets.map(x=>`<li><button class="song" data-set="${esc(x.id)}"><span><span class="s-t">${esc(x.name)}</span><span class="s-m"><span>${x.songs.length} ${x.songs.length===1?'song':'songs'}</span></span></span></button></li>`).join('')}</ul>`:'<p class="lede">Group songs for a rehearsal, a class, or a service, then play through them in order.</p>'}
    <div class="newset"><label class="sr" for="newSetName">New setlist name</label><input type="text" id="newSetName" placeholder="Name a new setlist" maxlength="60"><button class="btn line" id="newSetBtn">${icon('plus',18)}New setlist</button></div><p class="note off" id="newSetErr"></p>`;
}
function wireSetlists(){
  $$('#songs [data-set]').forEach(b=>b.onclick=()=>{ openSet=b.dataset.set; renderSongs(); window.scrollTo(0,0); });
  $('#newSetBtn').onclick=()=>{ const n=$('#newSetName').value.trim(); if(!n){ $('#newSetErr').textContent='Give the setlist a name first.'; return; }
    const id='s'+Date.now().toString(36); S.setlists.push({id,name:n,songs:[]}); save(); openSet=id; renderSongs(); };
  $('#newSetName').oninput=()=>{ $('#newSetErr').textContent=''; };
  $('#newSetName').onkeydown=e=>{ if(e.key==='Enter') $('#newSetBtn').click(); };
}
let addingSongs=false;
function renderSetDetail(){
  const x=setById(openSet); if(!x){ openSet=null; return renderSongs(); }
  const songs=x.songs.map(id=>getSong(id)).filter(Boolean);
  $('#songs').innerHTML=`<div class="ph" style="margin-bottom:4px"><button class="icon-btn" id="setBack" aria-label="All setlists" style="margin-left:-10px">${icon('back')}</button><button class="btn quiet" id="setDel">Delete setlist</button></div>
    <label class="sr" for="setName">Setlist name</label><input class="t-display titleinput" id="setName" value="${esc(x.name)}" maxlength="60">
    <p class="credit">${songs.length} ${songs.length===1?'song':'songs'}</p>
    ${songs.length?`<ol class="setsongs">${songs.map((s,i)=>`<li><span class="ix">${i+1}</span><span class="nm">${esc(s.title)}<span class="small soft"> in ${esc(s.key)}</span></span>
      <span class="ctl"><button class="icon-btn sm" data-up="${i}" aria-label="Move ${esc(s.title)} up" ${i===0?'disabled':''}>${icon('up',18)}</button><button class="icon-btn sm" data-down="${i}" aria-label="Move ${esc(s.title)} down" ${i===songs.length-1?'disabled':''}>${icon('down',18)}</button><button class="icon-btn sm" data-rm="${i}" aria-label="Remove ${esc(s.title)}">${icon('close',16)}</button></span></li>`).join('')}</ol>`:'<p class="lede">No songs yet. Add a few below.</p>'}
    <div class="row" style="margin:18px 0 6px"><button class="btn primary" id="setPlay" ${songs.length?'':'disabled'}>${icon('play',16)}Play the setlist</button><button class="btn line" id="setAdd" aria-expanded="${addingSongs}">${icon('plus',18)}Add songs</button></div>
    ${addingSongs?`<div class="addlist">${allSongs().map(s0=>{ const s=getSong(s0.id), on=x.songs.includes(s.id); return `<button class="switch" role="switch" aria-checked="${on}" data-add="${esc(s.id)}"><span class="sw" aria-hidden="true"></span>${esc(s.title)}</button>`; }).join('')}</div>`:''}`;
  $('#setBack').onclick=()=>{ openSet=null; addingSongs=false; renderSongs(); };
  $('#setName').onchange=e=>{ const v=e.target.value.trim(); if(v){ x.name=v; save(); } else e.target.value=x.name; };
  $('#setDel').onclick=()=>{ const b=$('#setDel'); if(!b.dataset.confirm){ b.dataset.confirm='1'; b.textContent='Tap again to delete'; return; } S.setlists=S.setlists.filter(y=>y.id!==x.id); if(setRun&&setRun.id===x.id) setRun=null; openSet=null; save(); renderSongs(); };
  $$('#songs [data-up]').forEach(b=>b.onclick=()=>{ const i=+b.dataset.up; [x.songs[i-1],x.songs[i]]=[x.songs[i],x.songs[i-1]]; save(); renderSetDetail(); });
  $$('#songs [data-down]').forEach(b=>b.onclick=()=>{ const i=+b.dataset.down; [x.songs[i+1],x.songs[i]]=[x.songs[i],x.songs[i+1]]; save(); renderSetDetail(); });
  $$('#songs [data-rm]').forEach(b=>b.onclick=()=>{ x.songs.splice(+b.dataset.rm,1); save(); renderSetDetail(); });
  $('#setAdd').onclick=()=>{ addingSongs=!addingSongs; renderSetDetail(); };
  $$('#songs [data-add]').forEach(b=>b.onclick=()=>{ const id=b.dataset.add, i=x.songs.indexOf(id); if(i>=0) x.songs.splice(i,1); else x.songs.push(id); save(); renderSetDetail(); });
  $('#setPlay').onclick=()=>{ if(!x.songs.length) return; setRun={id:x.id,i:0}; openSong=x.songs[0]; addingSongs=false; renderSongs(); window.scrollTo(0,0); };
}
function setBarHtml(s){
  if(!setRun) return ''; const x=setById(setRun.id); if(!x||x.songs[setRun.i]!==s.id){ setRun=null; return ''; }
  return `<div class="setbar"><span>${esc(x.name)}, song ${setRun.i+1} of ${x.songs.length}</span><span class="row" style="gap:2px"><button class="icon-btn sm" id="setPrev" aria-label="Previous song" ${setRun.i===0?'disabled':''}>${icon('back',18)}</button><button class="icon-btn sm" id="setNext" aria-label="Next song" ${setRun.i>=x.songs.length-1?'disabled':''}>${icon('fwd',18)}</button></span></div>`;
}
function gotoSetSong(i){ const x=setRun&&setById(setRun.id); if(!x||i<0||i>=x.songs.length) return; clearTimeout(advanceT); clock.stop(); setRun.i=i; openSong=x.songs[i]; renderPlayer(); if(document.body.classList.contains('stage')) enterStage(getSong(openSong)); else window.scrollTo(0,0); }
function wireSetBar(){ const p=$('#setPrev'), n=$('#setNext'); if(p) p.onclick=()=>gotoSetSong(setRun.i-1); if(n) n.onclick=()=>gotoSetSong(setRun.i+1); }
function setAdvanceAfterFinish(){
  const x=setRun&&setById(setRun.id); if(!x||setRun.i>=x.songs.length-1) return '';
  const next=getSong(x.songs[setRun.i+1]); let n=5;
  const tick=()=>{ const m=$('#sMsg'), stl=$('#stLyric'); const txt=`Next up, ${next.title}, in ${n}.`;
    if(m && !document.body.classList.contains('stage')) m.innerHTML=`${esc(m.dataset.base||'')} ${esc(txt)} <button class="btn quiet" id="stayHere" style="padding:4px 6px">Stay here</button>`;
    if(stl && document.body.classList.contains('stage')) stl.textContent=txt;
    const sb=$('#stayHere'); if(sb) sb.onclick=()=>{ clearTimeout(advanceT); m.textContent=m.dataset.base||''; };
    if(n--<=0){ gotoSetSong(setRun.i+1); return; } advanceT=setTimeout(tick,1000); };
  clearTimeout(advanceT); advanceT=setTimeout(tick,900); return '';
}
function addToSetPanel(s){
  return `<div class="addpanel" id="addPanel" hidden>${S.setlists.length?S.setlists.map(x=>`<button class="switch" role="switch" aria-checked="${x.songs.includes(s.id)}" data-tset="${esc(x.id)}"><span class="sw" aria-hidden="true"></span>${esc(x.name)}</button>`).join(''):'<p class="small soft">No setlists yet.</p>'}
    <div class="newset"><label class="sr" for="psetName">New setlist name</label><input type="text" id="psetName" placeholder="New setlist" maxlength="60"><button class="btn line" id="psetBtn">Create and add</button></div></div>`;
}
function wireAddPanel(s){
  const t=$('#sToSet'); if(!t) return; t.onclick=()=>{ const p=$('#addPanel'); p.hidden=!p.hidden; t.setAttribute('aria-expanded',String(!p.hidden)); };
  $$('#addPanel [data-tset]').forEach(b=>b.onclick=()=>{ const x=setById(b.dataset.tset), i=x.songs.indexOf(s.id); if(i>=0) x.songs.splice(i,1); else x.songs.push(s.id); save(); setSwitch(b,i<0); });
  $('#psetBtn').onclick=()=>{ const n=$('#psetName').value.trim(); if(!n) return $('#psetName').focus(); S.setlists.push({id:'s'+Date.now().toString(36),name:n,songs:[s.id]}); save(); const open=true; renderPlayer(); const p=$('#addPanel'); if(p&&open){ p.hidden=false; $('#sToSet').setAttribute('aria-expanded','true'); } };
}

/* ---------- backup and restore ---------- */
async function saveBackup(msgEl){
  const data=JSON.stringify({app:'koa',version:4,saved:new Date().toISOString(),state:S},null,1), name=`koa-backup-${today()}.json`;
  if(window.top===window){ const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([data],{type:'application/json'})); a.download=name; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },500); msgEl.className='note good'; msgEl.textContent='Backup saved to your downloads.'; return; }
  copyBackup(msgEl);
}
async function copyBackup(msgEl){
  const data=JSON.stringify({app:'koa',version:4,saved:new Date().toISOString(),state:S});
  try{ await navigator.clipboard.writeText(data); msgEl.className='note good'; msgEl.textContent='Backup copied. Paste it into a note or file to keep it safe.'; }
  catch(e){ msgEl.className='note'; msgEl.innerHTML='Copy this text and keep it somewhere safe:<textarea readonly style="min-height:90px;margin-top:8px" id="bkText"></textarea>'; $('#bkText').value=data; $('#bkText').select(); }
}
function parseBackup(text){
  let o; try{ o=JSON.parse(text); }catch(e){ return {err:'That isn\u2019t a Koa backup. Choose the .json file Koa saved.'}; }
  if(!o||o.app!=='koa'||!o.state||typeof o.state!=='object') return {err:'That file isn\u2019t a Koa backup.'};
  return {state:o.state,saved:o.saved};
}
function applyBackup(st){
  clock.stop(); for(const k in S) delete S[k]; Object.assign(S,JSON.parse(JSON.stringify(DEFAULTS)),st);
  ['learned','manual','userSongs','setlists'].forEach(k=>{ if(!Array.isArray(S[k])) S[k]=[]; });
  ['bests','hist','mins','songBest','songBpm','secs','songKey','pairDay','songDay'].forEach(k=>{ if(!S[k]||typeof S[k]!=='object'||Array.isArray(S[k])) S[k]={}; });
  if(!TUNINGS[S.tuning]) S.tuning='high'; tplCache={}; openSong=null; openSet=null; setRun=null; editing=null; openLesson=null;
  if(st.onboarded===undefined && hasProgress(st)){ S.onboarded=true; if(!S.manual.includes('intro')) S.manual.push('intro'); catchUpPath(); }
  introStep=null;
  save(); applyTheme();
}
