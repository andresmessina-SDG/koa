const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const store={get(k,d){try{const v=localStorage.getItem('koa:'+k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem('koa:'+k,JSON.stringify(v))}catch(e){}}};
function today(d=new Date()){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}

const DEFAULTS={tuning:'high',lefty:false,theme:null,learned:[],bests:{},hist:{},mins:{},songBest:{},songBpm:{},manual:[],secs:{},tunedOnce:false,
  userSongs:[],tab:'learn',bpm:80,pattern:2,pick:0,mode:'strum',sel:0,speedUp:false,target:120,hearPat:false,patChord:'C',
  pairA:'C',pairB:'G7',autoCount:false,ptab:'chords',tunedDay:'',onboarded:false,goal:'',uke:'',songWait:true,pmode:'count',paceLevel:0,paceBacking:true,cal:null,sens:0,songKey:{},setlists:[],pairDay:{},songDay:{},timing:false,plan:null,songListen:false,songBacking:true,songSpeed:false,keepNote:'',backupDay:''};
const S=Object.assign(JSON.parse(JSON.stringify(DEFAULTS)),store.get('state',{}));
let saveT=null; function save(){clearTimeout(saveT);saveT=setTimeout(()=>store.set('state',S),200)}
// carry over v0.1 data once
(function migrate(){ if(store.get('migrated',false)) return; const l=store.get('learned',null); if(Array.isArray(l)) S.learned=[...new Set([...S.learned,...l])];
  const b=store.get('bests',null); if(b&&typeof b==='object') for(const k in b){ const nk=k.split('|').sort().join('|'); S.bests[nk]=Math.max(S.bests[nk]||0,b[k]); }
  store.set('migrated',true); save(); })();
/* Wait for me starts on for beginners and off for players who already know a handful of chords */
if(store.get('state',{}).songWait===undefined){ S.songWait=S.learned.length<6; }
/* lessons added in v0.5 count as passed for anyone already past them */
function catchUpPath(){ const NEW=['rowc','am','cam','jesusloves']; let last=-1;
  LESSONS.forEach((l,i)=>{ if(!NEW.includes(l.id) && l.id!=='intro' && lessonDone(l)) last=i; });
  LESSONS.forEach((l,i)=>{ if(NEW.includes(l.id) && i<last && !lessonDone(l)) S.manual.push(l.id); }); }
function hasProgress(st){ return !!((st.learned&&st.learned.length)||(st.manual&&st.manual.length)||(st.mins&&Object.keys(st.mins).length)||(st.bests&&Object.keys(st.bests).length)); }
/* people who already have progress skip the welcome and Lesson zero */
if(!S.onboarded && (S.learned.length||S.manual.length||Object.keys(S.mins).length||Object.keys(S.bests).length)){ S.onboarded=true; if(!S.manual.includes('intro')) S.manual.push('intro'); save(); }

const NOTES=['C','C♯','D','E♭','E','F','F♯','G','A♭','A','B♭','B'];
const ROOTS={'C':0,'C♯':1,'D♭':1,'D':2,'D♯':3,'E♭':3,'E':4,'F':5,'F♯':6,'G♭':6,'G':7,'G♯':8,'A♭':8,'A':9,'A♯':10,'B♭':10,'B':11};
const TUNINGS={
  high:{label:'Standard, high G',short:'GCEA',open:[67,60,64,69],shift:0},
  low:{label:'Standard, low G',short:'Low G',open:[55,60,64,69],shift:0},
  bari:{label:'Baritone',short:'DGBE',open:[50,55,59,64],shift:-5}
};
if(!TUNINGS[S.tuning]) S.tuning='high';
const CHORDS=[
  {n:'C',f:[0,0,0,3],g:[0,0,0,3]},
  {n:'Am',f:[2,0,0,0],g:[2,0,0,0]},
  {n:'F',f:[2,0,1,0],g:[2,0,1,0]},
  {n:'G',f:[0,2,3,2],g:[0,1,3,2]},
  {n:'G7',f:[0,2,1,2],g:[0,2,1,3]},
  {n:'C7',f:[0,0,0,1],g:[0,0,0,1]},
  {n:'Em',f:[0,4,3,2],g:[0,3,2,1]},
  {n:'Dm',f:[2,2,1,0],g:[2,3,1,0]},
  {n:'D',f:[2,2,2,0],g:[1,2,3,0]},
  {n:'A',f:[2,1,0,0],g:[2,1,0,0]},
  {n:'A7',f:[0,1,0,0],g:[0,1,0,0]},
  {n:'E7',f:[1,2,0,2],g:[1,2,0,3]},
  {n:'D7',f:[2,2,2,3],g:[1,1,1,2],bar:{f:2,a:0,b:2}},
  {n:'F7',f:[2,3,1,3],g:[2,3,1,4]},
  {n:'Am7',f:[0,0,0,0],g:[0,0,0,0]},
  {n:'Cmaj7',f:[0,0,0,2],g:[0,0,0,2]},
  {n:'B♭',f:[3,2,1,1],g:[3,2,1,1],bar:{f:1,a:2,b:3}},
  {n:'Bm',f:[4,2,2,2],g:[3,1,1,1],bar:{f:2,a:1,b:3}},
  {n:'E',f:[1,4,0,2],g:[1,4,0,2]},
  {n:'Gm',f:[0,2,3,1],g:[0,2,3,1]},
  {n:'Cm',f:[0,3,3,3],g:[0,1,1,1],bar:{f:3,a:1,b:3}},
  {n:'F♯m',f:[2,1,2,0],g:[2,1,3,0]},
  {n:'C♯m',f:[1,1,0,4],g:[1,2,0,4]},
  {n:'B7',f:[2,3,2,2],g:[1,2,1,1],bar:{f:2,a:0,b:3}},
  {n:'B♭7',f:[1,2,1,1],g:[1,2,1,1],bar:{f:1,a:0,b:3}},
  {n:'Fm',f:[1,0,1,3],g:[1,0,2,4]},
  {n:'E♭',f:[0,3,3,1],g:[0,2,3,1]},
  {n:'Em7',f:[0,2,0,2],g:[0,1,0,2]},
  {n:'Dm7',f:[2,2,1,3],g:[2,3,1,4]},
  {n:'Gm7',f:[0,2,1,1],g:[0,2,1,1],bar:{f:1,a:2,b:3}},
  {n:'C♯',f:[1,1,1,4],g:[1,1,1,4],bar:{f:1,a:0,b:2}},
  {n:'F♯',f:[3,1,2,1],g:[3,1,2,1],bar:{f:1,a:1,b:3}},
  {n:'Bm7',f:[2,2,2,2],g:[1,1,1,1],bar:{f:2,a:0,b:3}},
  {n:'A♭',f:[1,3,4,3],g:[1,2,4,3]},
  {n:'B',f:[4,3,2,2],g:[3,2,1,1],bar:{f:2,a:2,b:3}},
  {n:'A♭7',f:[1,3,2,3],g:[1,3,2,4]},
  {n:'C♯7',f:[1,1,1,2],g:[1,1,1,2],bar:{f:1,a:0,b:2}},
  {n:'E♭7',f:[3,3,3,4],g:[1,1,1,2],bar:{f:3,a:0,b:2}},
  {n:'F♯7',f:[3,4,2,4],g:[2,3,1,4]},
  {n:'B♭m',f:[3,1,1,1],g:[3,1,1,1],bar:{f:1,a:1,b:3}},
  {n:'E♭m',f:[3,3,2,1],g:[3,4,2,1]},
  {n:'A♭m',f:[1,3,4,2],g:[1,3,4,2]}
];
const byN=Object.fromEntries(CHORDS.map(c=>[c.n,c]));
const learned=n=>S.learned.includes(n);
function splitName(n){const m=String(n).match(/^([A-G][♭♯]?)(.*)$/);return m?[m[1],m[2]]:null}
function normName(raw){ if(!raw) return ''; let t=raw.trim().replace(/^([A-G])b/,'$1♭').replace(/^([A-G])#/,'$1♯').replace(/maj7$/i,'maj7').replace(/^([A-G][♭♯]?)M7$/,'$1maj7').replace(/^([A-G][♭♯]?)min$/,'$1m');
  const p=splitName(t); if(!p) return t; const enh={'A♯':'B♭','D♭':'C♯','G♭':'F♯','D♯':'E♭','G♯':'A♭'}; return (enh[p[0]]||p[0])+p[1]; }
function shiftName(n,sh){ if(!sh) return n; const p=splitName(n); if(!p||ROOTS[p[0]]==null) return n; return NOTES[(ROOTS[p[0]]+sh+120)%12]+p[1]; }
const chordName=c=>shiftName(c.n,TUNINGS[S.tuning].shift);
function shapeFor(soundName){ const n=normName(soundName); return CHORDS.find(c=>chordName(c)===n)||null; }
const notesOf=c=>TUNINGS[S.tuning].open.map((o,i)=>o+c.f[i]);
const pairKey=(a,b)=>[a,b].sort().join('|');

/* audio */
let ctx=null; const bufCache={};
/* Safari mutes web audio with the ring/silent switch unless the page asks to play like a music app */
function audioMode(t){ try{ if(navigator.audioSession) navigator.audioSession.type=t; }catch(e){} }
function ac(){ if(!ctx){ audioMode(mic.stream?'play-and-record':'playback'); ctx=new (window.AudioContext||window.webkitAudioContext)(); } if(ctx.state==='suspended') ctx.resume(); return ctx; }
function pluckBuf(midi){
  const c=ac(), key=midi+':'+c.sampleRate; if(bufCache[key]) return bufCache[key];
  const sr=c.sampleRate, f=440*Math.pow(2,(midi-69)/12), len=Math.floor(sr*2.2);
  const b=c.createBuffer(1,len,sr), d=b.getChannelData(0), N=Math.max(2,Math.round(sr/f));
  for(let i=0;i<N;i++) d[i]=(Math.random()*2-1)*0.5;
  d[N]=0.997*d[0];
  for(let i=N+1;i<len;i++) d[i]=0.4985*(d[i-N]+d[i-N-1]);
  for(let i=0;i<120;i++) d[i]*=i/120;
  return bufCache[key]=b;
}
function pluckAt(midi,time,gain=0.5){
  const c=ac(), s=c.createBufferSource(); s.buffer=pluckBuf(midi);
  const g=c.createGain(); g.gain.value=gain; const lp=c.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=3200;
  s.connect(lp).connect(g).connect(c.destination); s.start(Math.max(time,c.currentTime));
}
function pluck(midi,delay=0,gain=0.5){ const c=ac(); pluckAt(midi,c.currentTime+delay+(c.state==='running'?0.01:0.06),gain); }
function strumAt(c,time,up=false,gain=0.3){ const n=notesOf(c); const order=up?[3,2,1,0]:[0,1,2,3]; order.forEach((s,k)=>pluckAt(n[s],time+k*(up?0.018:0.026),up?gain*0.75:gain)); }
function strumChord(c){ const x=ac(); strumAt(c,x.currentTime+(x.state==='running'?0.01:0.06)); }
function click(time,accent){
  const c=ac(), o=c.createOscillator(), g=c.createGain(), bp=c.createBiquadFilter();
  o.type='triangle'; o.frequency.value=accent?1500:1050; bp.type='bandpass'; bp.frequency.value=accent?1600:1100; bp.Q.value=4;
  g.gain.setValueAtTime(0.0001,time); g.gain.exponentialRampToValueAtTime(accent?0.55:0.3,time+0.002); g.gain.exponentialRampToValueAtTime(0.0001,time+0.05);
  o.connect(bp).connect(g).connect(c.destination); o.start(time); o.stop(time+0.06);
}

/* chord diagram */
function diagram(c,w=120,label){
  if(!c) return `<div class="nodia" style="width:${w}px">No diagram yet</div>`;
  const left=w*0.15, right=w*0.85, top=w*0.22, h=w*1.15, bottom=h-w*0.17;
  const X=i=>{const k=S.lefty?3-i:i; return left+(right-left)*k/3}, Y=k=>top+(bottom-top)*k/4, r=Math.max(5.5,w/15);
  let s=`<svg viewBox="0 0 ${w} ${h}" width="100%" style="max-width:${w}px;display:block;margin:0 auto" role="img" aria-label="${esc(label||chordName(c))} chord diagram">`;
  s+=`<rect x="${left-1}" y="${top-4}" width="${right-left+2}" height="4" rx="1.5" fill="var(--ink)"/>`;
  const big=w>=140, tiny=w<80;
  for(let k=1;k<=4;k++) s+=`<line x1="${left}" y1="${Y(k)}" x2="${right}" y2="${Y(k)}" stroke="var(--dfret)" stroke-width="${tiny?1:1.3}"/>`;
  for(let i=0;i<4;i++) s+=`<line x1="${X(i)}" y1="${top}" x2="${X(i)}" y2="${bottom}" stroke="var(--dstr)" stroke-width="${tiny?1.2:1.5}"/>`;
  if(big) for(let k=1;k<=4;k++) s+=`<text x="${left-w*0.07}" y="${Y(k-0.5)+w*0.025}" text-anchor="end" font-family="Instrument Sans,system-ui,sans-serif" font-size="${w*0.06}" fill="var(--faint)">${k}</text>`;
  if(c.bar){ const x1=Math.min(X(c.bar.a),X(c.bar.b)), x2=Math.max(X(c.bar.a),X(c.bar.b)), y=Y(c.bar.f-0.5); s+=`<g class="fd" data-s="${Math.min(c.bar.a,c.bar.b)}"><rect x="${x1-r}" y="${y-r*0.8}" width="${x2-x1+2*r}" height="${r*1.6}" rx="${r*0.8}" fill="var(--koa)"/></g>`; }
  c.f.forEach((fr,i)=>{
    if(fr===0){ s+=`<g class="fd" data-s="${i}"><circle cx="${X(i)}" cy="${top-w*0.1}" r="${r*0.45}" fill="none" stroke="var(--soft)" stroke-width="1.2"/></g>`; return; }
    const y=Y(fr-0.5);
    s+=`<g class="fd" data-s="${i}"><circle cx="${X(i)}" cy="${y}" r="${r}" fill="var(--koa)"/>`+(tiny?'':`<text x="${X(i)}" y="${y+r*0.38}" text-anchor="middle" font-family="Instrument Sans,system-ui,sans-serif" font-size="${r*1.05}" font-weight="600" fill="var(--on-koa)">${c.g[i]}</text>`)+'</g>';
  });
  TUNINGS[S.tuning].open.forEach((m,i)=>{ s+=`<text x="${X(i)}" y="${h-w*0.03}" text-anchor="middle" font-family="Instrument Sans,system-ui,sans-serif" font-size="${Math.max(10,w/12)}" fill="var(--faint)">${NOTES[m%12]}</text>`; });
  return s+'</svg>';
}

/* microphone and listening */
const mic={stream:null,an:null,td:null,fd:null,rms:0,
  pending:null,
  async on(){
    if(this.stream) return true;
    if(this.pending) return this.pending;
    this.pending=this._open().finally(()=>{ this.pending=null; }); return this.pending;
  },
  async _open(){
    if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia) throw new Error('nomic');
    audioMode('play-and-record'); const c=ac();
    this.stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}});
    const src=c.createMediaStreamSource(this.stream); this.an=c.createAnalyser(); this.an.fftSize=8192; this.an.smoothingTimeConstant=0.3; src.connect(this.an);
    this.td=new Float32Array(this.an.fftSize); this.fd=new Float32Array(this.an.frequencyBinCount);
    this.an2=c.createAnalyser(); this.an2.fftSize=2048; src.connect(this.an2); this.td2=new Float32Array(2048);
    $('#micPill').classList.add('on'); onMicChange(); return true;
  },
  off(){ if(this.stream){ this.stream.getTracks().forEach(t=>t.stop()); audioMode('playback'); } this.stream=null; this.an=null; this.an2=null; $('#micPill').classList.remove('on'); onMicChange(); }
};
function micError(e){ if(e&&e.message==='nomic') return 'This browser can\u2019t use the microphone here.';
  if(window.top!==window && e && (e.name==='NotAllowedError'||e.name==='SecurityError')) return 'Koa can\u2019t use the microphone inside another page. Open Koa in its own tab.';
  return 'Koa couldn\u2019t reach the microphone. Check that your browser allows it.'; }
function readTime(){ mic.an.getFloatTimeDomainData(mic.td); let s=0; for(let i=0;i<mic.td.length;i++) s+=mic.td[i]*mic.td[i]; mic.rms=Math.sqrt(s/mic.td.length); return mic.rms; }
function readChroma(){
  mic.an.getFloatFrequencyData(mic.fd); const sr=ctx.sampleRate, n=mic.an.fftSize, pc=new Float32Array(12);
  const k0=Math.floor(120*n/sr), k1=Math.min(mic.fd.length-1,Math.ceil(1350*n/sr));
  for(let k=k0;k<=k1;k++){ const db=mic.fd[k]; if(db<-85) continue; const m=Math.pow(10,db/20), e=m*m; const p=((Math.round(12*Math.log2(k*sr/n/440))+69)%12+12)%12; pc[p]+=e; }
  let mx=0; for(const v of pc) mx=Math.max(mx,v); if(mx>0) for(let i=0;i<12;i++) pc[i]=Math.sqrt(pc[i]/mx);
  return pc;
}
function bandEnergy(m){ const sr=ctx.sampleRate, n=mic.an.fftSize, f=440*Math.pow(2,(m-69)/12), k=Math.round(f*n/sr); let e=0; for(let j=k-2;j<=k+2;j++){ const db=mic.fd[j]; if(db>-100) e+=Math.pow(10,db/10); } return e; }
function stringEnergy(c){ return notesOf(c).map(bandEnergy); }
/* For each fretted string: energy where the note should be, and where the open string would ring if it isn't pressed. */
/* For each fretted string: energy at the wanted note and at the frets around it (0 to 4),
   skipping notes another string in the chord also plays, so a correct chord can't look wrong. */
function fretEnergy(c){ const open=TUNINGS[S.tuning].open, notes=notesOf(c);
  return c.f.map((fr,i)=>{ if(fr===0) return null; const alts={};
    for(let a=0;a<=4;a++){ if(a===fr) continue; const m=open[i]+a; if(notes.some((n,j)=>j!==i&&(n===m||Math.abs(n-m)===12))) continue; alts[a]=bandEnergy(m); }
    return {want:bandEnergy(notes[i]),alts}; }); }
let tplCache={};
function template(c){ const key=S.tuning+':'+c.n; if(tplCache[key]) return tplCache[key]; const t=new Float32Array(12);
  for(const m of notesOf(c)){ t[m%12]+=1; t[(m+7)%12]+=0.22; t[(m+4)%12]+=0.06; } return tplCache[key]=t; }
function sim(a,b){ let d=0,na=0,nb=0; for(let i=0;i<12;i++){d+=a[i]*b[i];na+=a[i]*a[i];nb+=b[i]*b[i]} return na&&nb?d/Math.sqrt(na*nb):0; }
function rankChords(pc){ return CHORDS.map(c=>({c,s:sim(pc,template(c))})).sort((x,y)=>y.s-x.s); }
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const TH={ match:()=>clamp((S.cal?S.cal.match:0.72)-(S.sens||0)*0.05,0.45,0.95), gate:()=>S.cal?S.cal.gate:0.008, onset:()=>S.cal?S.cal.onset:0.02, latency:()=>S.cal&&S.cal.latency!=null?S.cal.latency:0.06 };
const pcsOf=c=>new Set(notesOf(c).map(m=>m%12));
function addsOneNote(big,small){ const B=pcsOf(big), A=pcsOf(small); if(B.size!==A.size+1) return false; for(const p of A) if(!B.has(p)) return false; return true; }
/* A clean chord can top-rank as its seventh or major-seventh cousin, because overtones supply the extra note.
   Accept that, but never a chord that is missing a note or swaps one, like Am for C. */
function matches(pc,c){ const r=rankChords(pc), s=sim(pc,template(c)), m=TH.match(), top=r[0].c;
  const near=top===c || (addsOneNote(top,c) && s>=r[0].s-0.15);
  return {ok:(near && s>m) || s>Math.min(0.97,m+0.18), s, top:near?{c,s}:r[0]}; }

function autoCorrelate(buf,sr){
  let rms=0; for(let i=0;i<buf.length;i++) rms+=buf[i]*buf[i]; rms=Math.sqrt(rms/buf.length); if(rms<0.01) return -1;
  let a=0,b=buf.length-1; const th=0.2;
  for(let i=0;i<buf.length/2;i++) if(Math.abs(buf[i])<th){a=i;break}
  for(let i=1;i<buf.length/2;i++) if(Math.abs(buf[buf.length-i])<th){b=buf.length-i;break}
  const x=buf.subarray(a,b), n=x.length, cc=new Float32Array(n);
  const minLag=Math.floor(sr/1100), maxLag=Math.min(n-1,Math.floor(sr/110));
  for(let lag=0;lag<=maxLag;lag++){ let s=0; for(let j=0;j<n-lag;j++) s+=x[j]*x[j+lag]; cc[lag]=s; }
  let d=minLag; while(d<maxLag && cc[d]>cc[d+1]) d++;
  let best=-1,bv=-Infinity; for(let i=d;i<=maxLag;i++) if(cc[i]>bv){bv=cc[i];best=i}
  if(best<=0 || bv<cc[0]*0.3) return -1;
  const y1=cc[best-1]||0,y2=cc[best],y3=cc[best+1]||0, aa=(y1+y3-2*y2)/2, bb=(y3-y1)/2;
  return sr/(aa?best-bb/(2*aa):best);
}
/* songs */
const BUILTIN=[
{id:'rowc',strum:'Down',credit:'Traditional round, one-chord version',tags:['kids','folk'],src:`{title: Row, Row, Row Your Boat (C only)}
{time: 4/4}
{tempo: 70}
[C:8]Row, row, row your boat, gently down the stream,
[C:8]merrily, merrily, merrily, merrily,
[C:8]life is but a dream.`},
{id:'valley',strum:'Waltz',credit:'Traditional American folk song',tags:['folk'],src:`{title: Down in the Valley}
{time: 3/4}
{tempo: 70}
Down in the [C]valley, the [C]valley so [G7]low,
[G7]hang your head [G7]over, hear the [G7]wind [C]blow.[C]
Hear the wind [C]blow, dear, [C]hear the wind [G7]blow,
[G7]hang your head [G7]over, hear the [G7]wind [C]blow.[C]`},
{id:'clementine',strum:'Waltz',credit:'Traditional American folk song, 1880s',tags:['folk'],src:`{title: Clementine}
{time: 3/4}
{tempo: 90}
In a [C]cavern, in a [C]canyon, exca[C]vating for a [G7]mine,
dwelt a [G7]miner, forty-[C]niner, and his [G7]daughter Clemen[C]tine.

Oh my [C]darling, oh my [C]darling, oh my [C]darling Clemen[G7]tine,
you are [G7]lost and gone for[C]ever, dreadful [G7]sorry, Clemen[C]tine.`},
{id:'twinkle',strum:'Down',credit:'Words by Jane Taylor, 1806',tags:['kids'],src:`{title: Twinkle, Twinkle, Little Star}
{time: 4/4}
{tempo: 80}
[C:4]Twinkle, twinkle, [F:2]little [C:2]star,
[F:2]how I [C:2]wonder [G:2]what you [C:2]are.
[C:2]Up a[F:2]bove the [C:2]world so [G:2]high,
[C:2]like a [F:2]diamond [C:2]in the [G:2]sky.
[C:4]Twinkle, twinkle, [F:2]little [C:2]star,
[F:2]how I [C:2]wonder [G:2]what you [C:2]are.`},
{id:'grace',strum:'Waltz',credit:'Words by John Newton, 1779',tags:['hymns'],src:`{title: Amazing Grace}
{time: 3/4}
{tempo: 80}
A[C]mazing [C]grace, how [C7]sweet the [F]sound
that [C]saved a [C]wretch like [G]me.[G]
I [C]once was [C]lost, but [C7]now am [F]found,
was [C]blind, but [G]now I [C]see.[C]

'Twas [C]grace that [C]taught my [C7]heart to [F]fear,
and [C]grace my [C]fears re[G]lieved;[G]
how [C]precious [C]did that [C7]grace ap[F]pear
the [C]hour I [G]first be[C]lieved.[C]`},
{id:'saints',strum:'Down up',credit:'Traditional spiritual',tags:['folk','hymns'],src:`{title: When the Saints Go Marching In}
{time: 4/4}
{tempo: 100}
Oh when the [C]saints [C]go marching [C]in,
[C]oh when the [C]saints go [C]marching [G]in,[G]
oh [C]Lord, I [C7]want to [F]be in that [F]number,
when the [C]saints go [G]marching [C]in.[C]`},
{id:'susanna',strum:'Folk',credit:'Stephen Foster, 1848',tags:['folk'],src:`{title: Oh! Susanna}
{time: 4/4}
{tempo: 100}
I [C]come from Ala[C]bama with a [G]banjo on my [G]knee,
I'm [C]going to Louisi[C]ana, my [G:2]true love [C:2]for to [C]see.
It [C]rained all night the [C]day I left, the [G]weather it was [G]dry,
the [C]sun so hot I [C]froze to death, Su[G:2]sanna, [C:2]don't you [C]cry.

Oh, Su[F]sanna, [F]oh don't you [C]cry for [G]me,
for I [C]come from Ala[C]bama with a [G:2]banjo [C:2]on my [C]knee.`},
{id:'row',strum:'Down',credit:'Traditional round, 1850s',tags:['kids','folk'],src:`{title: Row, Row, Row Your Boat}
{time: 4/4}
{tempo: 90}
[C:8]Row, row, row your boat, gently down the stream,
[C:8]merrily, merrily, merrily, merrily,
[G7:4]life is but a [C:4]dream.`},
{id:'jesusloves',strum:'Down',credit:'Words by Anna Bartlett Warner, 1860',tags:['hymns','kids'],src:`{title: Jesus Loves Me}
{time: 4/4}
{tempo: 90}
[C]Jesus loves me, [C]this I know,
for the [F]Bible tells me [C]so.
[C]Little ones to [C]Him belong,
they are [F]weak, but He is [C:2]strong. [G7:2]

[C]Yes, Jesus [C]loves me,
[F]yes, Jesus [C]loves me,
[C]yes, Jesus [C]loves me,
the [G7]Bible tells me [C]so.`},
{id:'silent',strum:'Waltz',credit:'Franz Gruber, 1818, English words by John F. Young, 1859',tags:['hymns','holiday'],src:`{title: Silent Night}
{time: 3/4}
{tempo: 72}
[C]Silent [C]night, [C]holy [C]night,
[G7]all is [G7]calm, [C]all is [C]bright.
[F]Round yon [F]virgin [C]mother and [C]child,
[F]holy in[F]fant so [C]tender and [C]mild,
[G7]sleep in [G7]heavenly [C]peace,[C]
[C]sleep in [G7]heavenly [C]peace.[C]`},
{id:'jingle',strum:'Down up',credit:'James Lord Pierpont, 1857',tags:['holiday','kids'],src:`{title: Jingle Bells}
{time: 4/4}
{tempo: 110}
[C]Jingle bells, [C]jingle bells, [C]jingle all the [C]way.
Oh, what [F]fun it is to [C]ride in a [D7]one-horse open [G7]sleigh, hey!
[C]Jingle bells, [C]jingle bells, [C]jingle all the [C]way.
Oh, what [F]fun it is to [C]ride in a [G7]one-horse open [C]sleigh.`},
{id:'wewish',strum:'Waltz',credit:'Traditional English carol',tags:['holiday','kids'],src:`{title: We Wish You a Merry Christmas}
{time: 3/4}
{tempo: 100}
We [C]wish you a merry [F]Christmas, we [D7]wish you a merry [G7]Christmas, we
[E7]wish you a merry [Am]Christmas and a [F:2]happy [G7:1]New [C]Year.

Oh, [C]bring us some figgy [F]pudding, oh, [D7]bring us some figgy [G7]pudding, oh,
[E7]bring us some figgy [Am]pudding and a [F:2]cup of [G7:1]good [C]cheer.`},
{id:'deck',strum:'Down up',credit:'Welsh carol, English words 19th century',tags:['holiday','kids'],src:`{title: Deck the Halls}
{time: 4/4}
{tempo: 100}
[C]Deck the halls with [C]boughs of holly, [G7]fa la la la la, la [C]la la la.
[C]'Tis the season [C]to be jolly, [G7]fa la la la la, la [C]la la la.
[G7]Don we now our [C]gay apparel, [D7]fa la la, la la la, [G]la la la.
[C]Troll the ancient [C]Yuletide carol, [G7]fa la la la la, la [C]la la la.`},
{id:'gotell',strum:'Down',credit:'African American spiritual, refrain',tags:['hymns','holiday'],src:`{title: Go, Tell It on the Mountain}
{time: 4/4}
{tempo: 90}
[C]Go, tell it on the [C]mountain, [F]over the hills and [C]everywhere;
[C]go, tell it on the [C]mountain that [G7]Jesus Christ is [C]born.`}
];
function parseSong(text){
  let title='', beats=4, tempo=null, timeSig='', strum=''; const lines=[]; let bars=0;
  for(const raw of String(text).split(/\r?\n/)){
    const line=raw.replace(/\s+$/,'');
    const dir=line.trim().match(/^\{\s*([a-z_]+)\s*:?\s*(.*?)\s*\}$/i);
    if(dir){ const k=dir[1].toLowerCase(), v=dir[2];
      if(k==='strum') strum=v; else if(k==='title'||k==='t') title=v; else if(k==='time'){ const m=v.match(/^(\d+)\s*\/\s*(\d+)/)||v.match(/^(\d+)/); if(m){ beats=Math.max(1,Math.min(12,+m[1])); timeSig=m[2]?m[1]+'/'+m[2]:''; } } else if(k==='tempo'){ const t=parseInt(v,10); if(t>=30&&t<=240) tempo=t; }
      continue; }
    if(line.trim().startsWith('#')) continue;
    if(!line.trim()){ if(lines.length && !lines[lines.length-1].gap) lines.push({gap:true}); continue; }
    const out=[]; let pre='', cur=null, last=0, m; const re=/\[([^\]]*)\]/g;
    while((m=re.exec(line))){ const txt=line.slice(last,m.index); if(cur) cur.lyric+=txt; else pre+=txt;
      const [nm,bt]=m[1].split(':'); const name=normName(nm);
      cur={name, beats:bt&&+bt>0?Math.min(12,+bt):null, lyric:''}; if(name) out.push(cur); else cur=null; last=re.lastIndex; }
    const tail=line.slice(last); if(cur) cur.lyric+=tail; else pre+=tail;
    lines.push({pre:out.length?pre:'', plain:out.length?'':pre, bars:out}); bars+=out.length;
  }
  for(const l of lines) if(l.bars) for(const b of l.bars) if(!b.beats) b.beats=beats;
  while(lines.length && lines[lines.length-1].gap) lines.pop();
  return {title:title||'Untitled song', beats, time:timeSig||beats+'/4', tempo, strum, lines, nbars:bars};
}
const songCache={};
function allSongs(){ return [...BUILTIN.map(s=>({...s,user:false})), ...S.userSongs.map(s=>({...s,user:true}))]; }
function songKeyOf(p){ const last=[...p.lines].reverse().find(l=>l.bars&&l.bars.length); const n=last?last.bars[last.bars.length-1].name:'C'; const sp=splitName(n); if(!sp) return 'C'; return sp[0]+(/^m(?!aj)/.test(sp[1])?'m':''); }
function transposeLines(lines,semis){ if(!semis) return lines; return lines.map(l=>l.bars?{...l,bars:l.bars.map(b=>({...b,name:shiftName(b.name,semis)}))}:l); }
function getSong(id,semis){ const s=allSongs().find(x=>x.id===id); if(!s) return null; if(!songCache[id]||songCache[id].src!==s.src) songCache[id]={src:s.src,p:parseSong(s.src)};
  const p=songCache[id].p, k=semis!=null?semis:(id in S.songKey?S.songKey[id]:TUNINGS[S.tuning].shift), key0=songKeyOf(p);
  return {...s,...p,strum:p.strum||s.strum||'',lines:transposeLines(p.lines,k),semis:k,origKey:key0,key:shiftName(key0,k)}; }
const LEVEL=n=>['C','Am','F','G'].includes(n)?1:['G7','C7','Em','Dm','D','A','A7','E7'].includes(n)?2:3;
function keyCost(id,semis){ const s=getSong(id,semis); return songChords(s).reduce((t,n)=>{ const sh=shapeFor(n); return t+(!sh?12:learned(sh.n)?0:LEVEL(sh.n)*2+1); },0); }
function easiestKey(id){ let best=0,bc=Infinity; for(const k of [0,-1,1,-2,2,-3,3,-4,4,-5,5,6]){ const c=keyCost(id,k); if(c<bc){ bc=c; best=k; } } return best; }
function songChords(song){ const set=[]; for(const l of song.lines) if(l.bars) for(const b of l.bars) if(!set.includes(b.name)) set.push(b.name); return set; }
function playable(song){ return songChords(song).every(n=>{ const sh=shapeFor(n); return sh && learned(sh.n); }); }

/* lessons */
const LESSONS=[
 {id:'intro',t:'Meet your ukulele',d:'Five short screens: how to hold it, which string is which, how to read a chord diagram, and what the finger numbers mean. No playing skills needed.',type:'intro',cta:'Start'},
 {id:'tune',t:'Tune your ukulele',d:'Every string needs to match its note before chords sound right. Use the tuner, or tune by ear against Koa\u2019s reference notes.',type:'tune',cta:'Open the tuner'},
 {id:'c',t:'Your first chord: {C}',d:'Put your ring finger on the third fret of the 1st string, the one nearest the floor. Press just behind the fret wire, strum all four strings, and let them ring.',type:'learn',c:'C',cta:'Go to {C}'},
 {id:'down',t:'A steady strum',d:'Hold your {C} chord and strum down once on every click, using the nail side of your index finger. Strum over the spot where the neck meets the body.',type:'time',key:'strum:Down',s:60,pat:0,bpm:60,cta:'Start strumming'},
 {id:'rowc',t:'Your first song',d:'Row, Row, Row Your Boat, using only {C}. Strum down on every beat and sing or hum along. You\u2019re playing a real song.',type:'song',song:'rowc',bpm:70,cta:'Play the song'},
 {id:'am',t:'The easiest chord: {Am}',d:'One finger: your middle finger on the second fret of the 4th string, the one nearest your face. Every other string rings open.',type:'learn',c:'Am',cta:'Go to {Am}'},
 {id:'cam',t:'Your first chord change',d:'Switch between {C} and {Am}. Lift one finger and place the other; there\u2019s no need to rush. Practice the move silently first, then strum.',type:'pair',a:'C',b:'Am',n:10,cta:'Practice {C} and {Am}'},
 {id:'cg7',t:'Add {G7}',d:'{G7} uses three fingers in a small triangle. Practice moving between it and {C} without strumming at first, then count clean changes.',type:'pair',a:'C',b:'G7',n:10,cta:'Practice {C} and {G7}'},
 {id:'valley',t:'A two-chord song',d:'Down in the Valley is a slow waltz with only {C} and {G7}. Count three beats in each bar and change right on beat one.',type:'song',song:'valley',bpm:70,cta:'Play the song'},
 {id:'cf',t:'Add {F}',d:'{F} uses two fingers. Lay them down together as one shape rather than one at a time.',type:'pair',a:'C',b:'F',n:12,cta:'Practice {C} and {F}'},
 {id:'jesusloves',t:'Three chords together',d:'Jesus Loves Me uses {C}, {F}, and {G7}, the three chords behind hundreds of songs. Take it slowly.',type:'song',song:'jesusloves',bpm:75,cta:'Play the song'},
 {id:'island',t:'The island strum',d:'Down, down-up, up-down-up. The missed strums are ghost strums: keep your hand moving and just miss the strings.',type:'time',key:'strum:Island',s:90,pat:2,bpm:70,cta:'Practice the island strum'},
 {id:'cg',t:'The {G} chord',d:'{G} is the hardest of the first chords. Keep your thumb behind the neck and your fingers curved so the open string still rings.',type:'pair',a:'C',b:'G',n:12,cta:'Practice {C} and {G}'},
 {id:'twinkle',t:'Twinkle, Twinkle, Little Star',d:'{C}, {F}, and {G}, with chords changing every two beats. Start slow and let the tempo come.',type:'song',song:'twinkle',bpm:80,cta:'Play the song'},
 {id:'pick',t:'Your first fingerpicking',d:'Thumb plays the 4th string, then index, middle, and ring fingers play the next three. Hold a {C} chord and let each note ring.',type:'time',key:'pick',s:90,pick:0,bpm:60,cta:'Start fingerpicking'},
 {id:'grace',t:'Amazing Grace',d:'A hymn in three, adding {C7}. Watch for the change to {F} on the word \u201csweet.\u201d',type:'song',song:'grace',bpm:80,cta:'Play the song'},
 {id:'fast',t:'Faster changes',d:'Aim for one clean change every two seconds or faster. Lift your fingers only as far as you need to.',type:'pair',a:'C',b:'G',n:25,cta:'Practice {C} and {G}'},
 {id:'saints',t:'When the Saints Go Marching In',d:'A lively song at a brisker tempo. Try the island strum once the chords feel easy.',type:'song',song:'saints',bpm:100,cta:'Play the song'}
];
function lessonDone(l){
  if(S.manual.includes(l.id)) return true;
  switch(l.type){
    case 'intro': return false;
    case 'tune': return S.tunedOnce;
    case 'learn': return learned(l.c);
    case 'pair': return (S.bests[pairKey(l.a,l.b)]||0)>=l.n;
    case 'song': return (S.songBest[l.song]||0)>=l.bpm;
    case 'time': return (S.secs[l.key]||0)>=l.s;
  } return false;
}
if(!store.get('path5',false)){ if(S.onboarded) catchUpPath(); store.set('path5',true); save(); }
const lessonText=t=>t.replace(/\{([^}]+)\}/g,(m,n)=>byN[n]?chordName(byN[n]):n);
function goalText(l){
  switch(l.type){
    case 'intro': return 'About five minutes, nothing to play yet';
    case 'tune': return 'Tune all four strings';
    case 'learn': return `Learn the ${lessonText('{'+l.c+'}')} chord`;
    case 'pair': { const b=S.bests[pairKey(l.a,l.b)]||0; return `${l.n} changes a minute${b&&b<l.n?`, your best is ${b}`:''}`; }
    case 'song': return `Play it through at ${l.bpm} bpm`;
    case 'time': { const done=Math.floor((S.secs[l.key]||0)), len=l.s===60?'One minute':l.s===90?'A minute and a half':`${Math.round(l.s/60)} minutes`; return `${len} of practice${done&&done<l.s?`, ${Math.round(done/l.s*100)}% done`:''}`; }
  } return '';
}

/* shared clock: ticks are eighth notes */
const clock={on:false,owner:null,bpm:80,next:0,tick:0,limit:Infinity,iv:null,q:[],raf:null,sched:null,vis:null,onStop:null,
  start(owner,bpm,limit,sched,vis,onStop){
    this.stop(); const c=ac(); Object.assign(this,{on:true,owner,bpm,limit,sched,vis,onStop,tick:0,q:[],next:c.currentTime+0.12,hold:null,gate:null});
    this.iv=setInterval(()=>this.run(),25); this.run();
    const loop=()=>{ if(!this.on) return; let cur=null; while(this.q.length&&this.q[0].t<=ctx.currentTime) cur=this.q.shift(); if(cur) this.vis(cur.i); if(this.on) this.raf=requestAnimationFrame(loop); };
    loop();
  },
  run(){ const c=ctx; if(!this.on) return;
    if(this.next<c.currentTime-0.05){ this.next=c.currentTime+0.05; this.q=[]; }
    while(this.on && this.tick<=this.limit && this.next<c.currentTime+0.12){
      if(this.hold!=null) break;
      if(this.gate && this.gate(this.tick,this.next)){ this.hold=this.tick; break; }
      const r=this.sched(this.tick,this.next); this.q.push({t:this.next,i:this.tick}); this.next+=30/this.bpm; this.tick=(typeof r==='number')?r:this.tick+1; } },
  resume(){ if(!this.on) return; this.hold=null; this.next=ctx.currentTime+0.06; this.run(); },
  stop(){ if(!this.on) return; this.on=false; clearInterval(this.iv); cancelAnimationFrame(this.raf); this.q=[]; const f=this.onStop; this.onStop=null; this.owner=null; if(f) f(); }
};

