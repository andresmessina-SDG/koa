/* ---------- welcome and Lesson zero ---------- */
let wStep=0, introStep=null, introOk=false, zoomed=false;
const lefty=()=>!!S.lefty;

function dotsHtml(n,i){ return `<div class="wdots" aria-hidden="true">${Array.from({length:n},(_,k)=>`<i class="${k<i?'on':k===i?'now':''}"></i>`).join('')}</div>`; }

/* welcome */
const WSTEPS=[
  {k:'hello'},
  {k:'uke',q:'What kind of ukulele do you have?',opts:[['soprano','Soprano','The smallest and most common'],['concert','Concert','A little bigger'],['tenor','Tenor','Bigger again'],['baritone','Baritone','The largest, tuned like a guitar\u2019s top strings'],['unsure','Not sure','Koa will pick the usual tuning']]},
  {k:'hand',q:'Which hand do you strum with?',opts:[['r','My right hand','Most people'],['l','My left hand','Koa flips every diagram for you']]},
  {k:'goal',q:'What would you like to play?',opts:[['folk','Folk and campfire songs',''],['hymns','Hymns and worship songs',''],['holiday','Holiday songs',''],['all','A bit of everything','']]},
  {k:'ready'}
];
function renderWelcome(){
  document.body.classList.add('onboard');
  const st=WSTEPS[wStep], sel=st.k==='uke'?S.uke:st.k==='hand'?(S.lefty?'l':S.uke?'r':''):st.k==='goal'?S.goal:'';
  let h=`<div class="welcome">${dotsHtml(WSTEPS.length,wStep)}`;
  if(st.k==='hello') h+=`<div class="wmark"><svg width="64" height="64" viewBox="0 0 26 26" aria-hidden="true"><circle cx="13" cy="13" r="12" fill="var(--koa)"/><circle cx="13" cy="13" r="4.6" fill="var(--paper)"/></svg></div>
      <h1 class="t-display">Welcome to Koa</h1><p class="lede" style="margin-top:12px">Koa teaches ukulele from your first note. In about ten minutes you\u2019ll play your first song.</p>
      <div class="wact"><button class="btn primary wide" id="wNext">Let\u2019s begin</button><button class="btn quiet" id="wSkip">I already play a little</button></div>`;
  else if(st.k==='ready') h+=`<h1 class="t-display">You\u2019re all set</h1><p class="lede" style="margin-top:12px">First, a five-minute look at your ukulele: how to hold it, which string is which, and how to read a chord diagram. Then your first chord.</p>
      <div class="wact"><button class="btn primary wide" id="wNext">Meet your ukulele</button><button class="btn quiet" id="wBack">Back</button></div>`;
  else h+=`<h1 class="t-title" style="margin-bottom:20px">${st.q}</h1><div class="wopts" role="radiogroup" aria-label="${esc(st.q)}">${st.opts.map(([v,t,sub])=>`<button role="radio" aria-checked="${sel===v}" data-v="${v}"><span class="wt">${t}</span>${sub?`<span class="ws">${sub}</span>`:''}</button>`).join('')}</div>
      <div class="wact"><button class="btn quiet" id="wBack">Back</button></div>`;
  $('#learn').innerHTML=h+'</div>';
  const n=$('#wNext'); if(n) n.onclick=()=>{ if(st.k==='ready'){ finishWelcome(true); } else { wStep++; renderWelcome(); } };
  const b=$('#wBack'); if(b) b.onclick=()=>{ wStep=Math.max(0,wStep-1); renderWelcome(); };
  const sk=$('#wSkip'); if(sk) sk.onclick=()=>{ if(!S.manual.includes('intro')) S.manual.push('intro'); finishWelcome(false); };
  $$('#learn .wopts button').forEach(o=>o.onclick=()=>{ const v=o.dataset.v;
    if(st.k==='uke'){ S.uke=v; S.tuning=v==='baritone'?'bari':'high'; tplCache={}; }
    if(st.k==='hand'){ S.lefty=v==='l'; }
    if(st.k==='goal'){ S.goal=v; }
    save(); $$('#learn .wopts button').forEach(x=>x.setAttribute('aria-checked',String(x===o))); setTimeout(()=>{ wStep++; renderWelcome(); },180); });
  window.scrollTo(0,0);
}
function finishWelcome(toIntro){ S.onboarded=true; S.plan=null; save(); document.body.classList.remove('onboard'); if(toIntro){ introStep=0; introOk=false; zoomed=false; } renderLearn(); }

/* Lesson zero */
const ISTEPS=[
  {t:'How to hold it',d:()=>`Rest the body against your chest, with the neck pointing to your ${lefty()?'right':'left'} and tilted up a little. Your ${lefty()?'right':'left'} thumb rests behind the neck. Strum with the nail side of your index finger, over the spot where the neck meets the body.`,art:()=>ukeFlat({strum:true})},
  {t:'The four strings',d:()=>{ const n=strNames(); return `Look down at your ukulele as you hold it. The string nearest your face is ${n[0]}. Then ${n[1]}, ${n[2]}, and finally ${n[3]}, nearest the floor. Strings are numbered from the floor up, so ${n[3]} is the 1st string and ${n[0]} is the 4th. Tap each one to hear it.`; },art:()=>ukeFlat({tap:true}),
   q:'Which string is nearest the floor?',opts:()=>strNames(),ans:3,hint:'Nearest the floor is the last one in the list, the 1st string.'},
  {t:'Reading a chord diagram',d:()=>zoomed?`This is the top of the neck, zoomed in. The thick bar is the nut, the lines across are frets, and a dot shows where a fingertip goes. This is ${chordName(byN.C)}: one dot, on the 1st string, 3rd fret.`:`A chord diagram shows your ukulele stood upright and facing you, so each string becomes one vertical line: ${lefty()?`${[...strNames()].reverse().join(', ')} from left to right, because Koa flips diagrams for left-handed players`:`${strNames()[0]} on the left through ${strNames()[3]} on the right`}. The dashed box near the top is the part a diagram shows.`,
   art:()=>zoomed?`<div class="zoomin">${diagram(byN.C,170)}</div>`:ukeUpright(),zoom:true,
   q:'In this diagram, which string has the dot?',opts:()=>strNames().map((n,i)=>`${n}, the ${STR_NUM[i]}`),ans:3,hint:'Find the dot, then follow its line to the string name underneath.',needZoom:true},
  {t:'Finger numbers',d:()=>`The number inside a dot tells you which finger to use. 1 is your index finger, 2 is middle, 3 is ring, and 4 is your pinky. Your thumb stays behind the neck.`,art:()=>handSvg(),
   q:`The ${chordName(byN.C)} diagram shows a 3. Which finger is that?`,opts:['Index','Middle','Ring','Pinky'],ans:2,hint:'Count from your index finger: 1, 2, 3.'},
  {t:'You can read any chord now',d:()=>'That\u2019s everything you need to start. Next, tune your strings so they match, then play your first chord. A little every day works better than a lot once in a while.',art:()=>`<div class="zoomin">${diagram(byN.C,150)}</div>`}
];
function renderIntro(){
  const st=ISTEPS[introStep], last=introStep===ISTEPS.length-1;
  const showQ=st.q && (!st.needZoom||zoomed);
  $('#learn').innerHTML=`<div class="intro">
    <div class="ph" style="margin-bottom:6px"><button class="icon-btn" id="iClose" aria-label="Leave Lesson zero" style="margin-left:-10px">${icon('close',20)}</button>${dotsHtml(ISTEPS.length,introStep)}</div>
    <p class="small" style="color:var(--koa);font-weight:500;margin-bottom:6px">Meet your ukulele</p>
    <h1 class="t-title" style="margin-bottom:12px">${st.t}</h1>
    <div class="iart">${st.art()}</div>
    <p class="lede" style="margin:14px 0 18px">${esc(st.d())}</p>
    ${st.zoom?`<button class="btn line" id="iZoom" style="margin-bottom:18px">${zoomed?'Show the whole ukulele':'Zoom in to the diagram'}</button>`:''}
    ${showQ?`<div class="quiz"><p class="qq">${esc(st.q)}</p><div class="qopts">${(typeof st.opts==='function'?st.opts():st.opts).map((o,k)=>`<button data-k="${k}">${esc(o)}</button>`).join('')}</div><p class="note" id="qMsg" aria-live="polite"></p></div>`:''}
    <div class="row" style="margin-top:20px">${introStep>0?'<button class="btn quiet" id="iBack">Back</button>':''}<button class="btn primary" id="iNext" ${st.q&&!introOk?'disabled':''}>${last?'Finish':'Next'}</button>${st.q&&!introOk?'<button class="btn quiet" id="iSkip">Skip the question</button>':''}</div>
  </div>`;
  $$('#learn .strtap button').forEach(b=>b.onclick=()=>{ const i=+b.dataset.s; pluck(TUNINGS[S.tuning].open[i],0,0.6);
    $$('#learn .str').forEach(l=>l.classList.remove('str-lit')); $$(`#learn .str[data-s="${i}"]`).forEach(l=>{ l.classList.add('str-lit'); pluckString(l); });
    $$('#learn .strtap button').forEach(x=>x.classList.toggle('on',x===b)); });
  const z=$('#iZoom'); if(z) z.onclick=()=>{ zoomed=!zoomed; renderIntro(); };
  $$('#learn .qopts button').forEach(b=>b.onclick=()=>{ const k=+b.dataset.k, m=$('#qMsg');
    if(k===st.ans){ introOk=true; b.classList.add('right'); m.className='note good'; m.textContent='That\u2019s right.'; $('#iNext').disabled=false; const sk=$('#iSkip'); if(sk) sk.remove(); }
    else { b.classList.add('wrong'); m.className='note'; m.textContent=`Not quite. ${st.hint}`; } });
  const advance=()=>{ if(last){ if(!S.manual.includes('intro')) S.manual.push('intro'); save(); introStep=null; renderLearn(); window.scrollTo(0,0); return; } introStep++; introOk=false; renderIntro(); window.scrollTo(0,0); };
  $('#iNext').onclick=advance;
  const sk=$('#iSkip'); if(sk) sk.onclick=advance;
  const bk=$('#iBack'); if(bk) bk.onclick=()=>{ introStep--; introOk=true; renderIntro(); };
  $('#iClose').onclick=()=>{ introStep=null; renderLearn(); };
}
