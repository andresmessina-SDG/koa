/* ---------- how to play a chord, in words ---------- */
const FINGER=['','index','middle','ring','pinky'];
const ORD=['open','1st','2nd','3rd','4th','5th'];
const strLabel=i=>`${STR_NUM[i]} string (${strNames()[i]})`;
const listJoin=a=>a.length<2?a.join(''):a.length===2?a.join(' and '):a.slice(0,-1).join(', ')+', and '+a[a.length-1];
function chordSteps(c){
  const steps=[], used=new Set();
  if(c.bar){ const a=Math.min(c.bar.a,c.bar.b), b=Math.max(c.bar.a,c.bar.b);
    for(let i=a;i<=b;i++) if(c.f[i]===c.bar.f) used.add(i);
    steps.push({o:1,strings:[...used],text:`Lay your index finger flat across the ${STR_NUM[a]} to ${STR_NUM[b]} strings at the ${ORD[c.bar.f]} fret.`}); }
  const placed=c.f.map((fr,i)=>({fr,i,g:c.g[i]})).filter(x=>x.fr>0&&!used.has(x.i)).sort((x,y)=>x.g-y.g||y.i-x.i);
  placed.forEach(x=>steps.push({o:x.g,strings:[x.i],text:`Put your ${FINGER[x.g]} finger on the ${strLabel(x.i)}, ${ORD[x.fr]} fret.`}));
  const open=c.f.map((fr,i)=>fr===0?i:-1).filter(i=>i>=0);
  if(open.length) steps.push({o:9,strings:open,open:true,text:open.length===4?'Every string rings open. No fingers needed.':`Let the ${listJoin(open.map(i=>STR_NUM[i]))} string${open.length>1?'s':''} ring open.`});
  return steps;
}
const TIPS={
  C:'Arch your ring finger so its pad doesn\u2019t touch the 2nd string.',
  Am:'Press with the tip of your middle finger so the 3rd string next to it still rings.',
  F:'Place both fingers at once, as one shape, rather than one after the other.',
  G:'Keep your thumb low behind the neck. It lets your fingers curve over the strings.',
  G7:'It\u2019s a small sideways triangle. Index and middle sit close together.',
  C7:'One finger: the index, at the 1st fret of the 1st string.',
  Em:'Three fingers in a diagonal staircase. Place the ring finger first.',
  Dm:'Like F with your ring finger added on the 3rd string.',
  D:'Three fingers squeeze side by side at the 2nd fret. Angle them slightly so they fit.',
  A:'Like Am with your index finger added on the 3rd string.',
  A7:'One finger: the index, at the 1st fret of the 3rd string.',
  E7:'Index on the 4th string, then middle and ring spread out to the right.',
  'B♭':'A small barre. Roll your index finger slightly onto its side so it presses evenly.',
  E:'A stretch. Put the pinky down first, then fit the others around it.',
  Bm:'A barre at the 2nd fret. Press close to the fret wire and keep your thumb behind the neck.'
};
const chordTip=c=>TIPS[c.n]||(c.bar?'Keep the barre finger straight and press close to the fret wire.':'Press just behind each fret wire, on your fingertips.');
/* what stays and what moves between two chords */
function fingerMap(c){ const m=[]; c.f.forEach((fr,i)=>{ if(fr>0) m.push({i,fr,g:c.g[i]}); }); return m; }
function pairTip(A,B){
  const a=fingerMap(A), b=fingerMap(B);
  const anchors=a.filter(x=>b.some(y=>y.i===x.i&&y.fr===x.fr&&y.g===x.g));
  const slides=a.filter(x=>!anchors.includes(x)&&b.some(y=>y.i===x.i&&y.g===x.g&&y.fr!==x.fr));
  const nA=chordName(A), nB=chordName(B);
  if(!a.length||!b.length){ const one=a.length?A:B, n=chordName(one); return `${chordName(a.length?B:A)} needs no fingers at all, so just lift off or set down the ${n} shape in one move.`; }
  if(anchors.length){ const x=anchors[0], rest=anchors.length>1?` Your ${FINGER[anchors[1].g]} finger stays too.`:'';
    return `Keep your ${FINGER[x.g]} finger down on the ${STR_NUM[x.i]} string. It stays in place for both ${nA} and ${nB}, so only the other fingers move.${rest}`; }
  if(slides.length){ const x=slides[0], y=b.find(y=>y.i===x.i&&y.g===x.g);
    return `Don\u2019t lift your ${FINGER[x.g]} finger. Slide it along the ${STR_NUM[x.i]} string from the ${ORD[x.fr]} to the ${ORD[y.fr]} fret, and use it to guide the change.`; }
  return `No finger stays in place between ${nA} and ${nB}. Lift them together, keep the shape in the air, and land the new chord all at once. Try the move silently a few times first.`;
}

/* ---------- show me: place each finger, one at a time ---------- */
let showT=[];
function showMe(c){
  showT.forEach(clearTimeout); showT=[];
  const steps=chordSteps(c), host=$('#cDia'); if(!host) return;
  host.innerHTML=diagram(c,180); host.classList.add('reveal');
  const items=$$('#cSteps li'); items.forEach(li=>li.classList.remove('now','did'));
  const open=TUNINGS[S.tuning].open, notes=notesOf(c);
  steps.forEach((st,k)=>{ showT.push(setTimeout(()=>{
    items.forEach((li,j)=>{ li.classList.toggle('now',j===k); li.classList.toggle('did',j<k); });
    st.strings.forEach(i=>{ const g=$(`#cDia .fd[data-s="${i}"]`); if(g) g.classList.add('in'); });
    st.strings.forEach((i,q)=>pluck(notes[i],q*0.06,0.45));
  },k*1100)); });
  showT.push(setTimeout(()=>{ items.forEach(li=>{ li.classList.remove('now'); li.classList.add('did'); }); strumChord(c); host.classList.remove('reveal'); $$('#cDia .fd').forEach(g=>g.classList.add('in')); },steps.length*1100+200));
}

/* ---------- change on the beat ---------- */
const PACE=[{every:4,bpm:60,t:'Every 4 beats at 60 bpm'},{every:2,bpm:60,t:'Every 2 beats at 60 bpm'},{every:1,bpm:60,t:'Every beat at 60 bpm'},{every:1,bpm:80,t:'Every beat at 80 bpm'},{every:1,bpm:100,t:'Every beat at 100 bpm'}];
let paceRun=null;
function paceLvl(){ return PACE[clamp(S.paceLevel||0,0,PACE.length-1)]; }
function startPace(){
  if(pA().n===pB().n){ $('#pCount').className='note center off'; $('#pCount').textContent='Pick two different chords first.'; return; }
  const L=paceLvl(), beats=Math.round(L.bpm), limit=beats*2; // one minute of eighth-note ticks
  paceRun={L,side:0,changes:0}; setSide(0); $('#pA').disabled=$('#pB').disabled=true;
  $('#pBtn').textContent='Stop'; $('#pCount').className='note center'; $('#pCount').textContent=`Change on beat one of each count. ${L.t}.`;
  clock.start('pace',L.bpm,limit,(tick,time)=>{
    if(tick>=limit||tick%2) return; const beat=tick/2, pos=beat%L.every, change=pos===0&&beat>0;
    click(time,pos===0); if(S.paceBacking && pos===0){ const side=Math.floor(beat/L.every)%2; strumAt(side?pB():pA(),time,false,0.18); }
  },tick=>{
    if(!paceRun) return; if(tick>=limit){ endPace(true); return; }
    if(tick%2) return; const beat=tick/2, pos=beat%L.every, left=L.every-pos;
    if(pos===0 && beat>0){ paceRun.changes++; setSide(Math.floor(beat/L.every)%2); }
    $('#pNum').textContent=L.every===1?(paceRun.side=Math.floor(beat/L.every)%2,'Now'):left===L.every?'Now':left;
    $('#pLbl').textContent=L.every===1?'every beat':left===L.every?`play ${chordName(Math.floor(beat/L.every)%2?pB():pA())}`:`beat${left>1?'s':''} to change`;
    const s=Math.ceil((limit-tick)/2/L.bpm*60); $('#pClock').textContent=`0:${String(s).padStart(2,'0')}`; $('#pRing').style.strokeDashoffset=String(RING*((limit-tick)/limit));
  },()=>{ if(paceRun) endPace(false); });
}
function endPace(done){
  const L=paceRun&&paceRun.L; paceRun=null; clock.stop(); $('#pA').disabled=$('#pB').disabled=false; $('#pBtn').textContent='Start the minute';
  if(done){ $('#pNum').textContent='✓'; $('#pLbl').textContent='minute done'; $('#pClock').textContent='';
    const nxt=PACE[S.paceLevel+1];
    $('#pCount').innerHTML=`Did you land every change on the beat? ${nxt?`<span class="row" style="justify-content:center;margin-top:10px"><button class="btn primary" id="paceUp" style="padding:9px 16px">Yes, level up</button><button class="btn line" id="paceStay" style="padding:9px 16px">Not yet</button></span>`:'<br>That\u2019s the top level. Try a song next.'}`;
    const u=$('#paceUp'); if(u) u.onclick=()=>{ S.paceLevel=Math.min(PACE.length-1,S.paceLevel+1); const k=pairKey(pA().n,pB().n); ACT.pair[k]=(ACT.pair[k]||0)+1; S.pairDay[k]=today(); save(); renderChanges(); $('#pCount').textContent=`Next: ${paceLvl().t}.`; };
    const st=$('#paceStay'); if(st) st.onclick=()=>{ $('#pCount').textContent='Stay at this level until it feels easy. Slow and clean beats fast and messy.'; };
  } else { renderPair(); $('#pCount').textContent='Stopped.'; }
}

/* ---------- the bouncing strum guide ---------- */
let handTick={i:0,t:0};
function handFrame(){
  const h=$('#rHand'); if(!h) return;
  if(clock.owner!=='rhythm'||S.mode!=='strum'||curTab!=='practice'||S.ptab!=='rhythm'){ h.classList.remove('on'); return; }
  const cells=$$('#rGrid .cell'); if(!cells.length) return; const n=cells.length, dur=30/clock.bpm;
  const f=clamp((ctx.currentTime-handTick.t)/dur,0,1), i=handTick.i%n, j=(i+1)%n;
  const box=$('#rGrid .grid8').getBoundingClientRect(), ci=cells[i].getBoundingClientRect(), cj=cells[j].getBoundingClientRect(), ar=cells[i].querySelector('.ar').getBoundingClientRect();
  const x0=ci.left+ci.width/2-box.left, x1=(j===0?ci.left+ci.width*1.5:cj.left+cj.width/2)-box.left;
  const top=ar.top-box.top+4, bot=ar.bottom-box.top-4, ease=(1-Math.cos(Math.PI*f))/2, down=i%2===0;
  const y=down?top+(bot-top)*ease:bot-(bot-top)*ease;
  h.style.transform=`translate(${(x0+(x1-x0)*f).toFixed(1)}px,${y.toFixed(1)}px)`; h.classList.add('on');
}
