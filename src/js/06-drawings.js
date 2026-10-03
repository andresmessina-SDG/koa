/* ---------- instrument drawings, built from real geometry ---------- */
/* ---------- ukuleles drawn to real measurements ----------
   All lengths in millimetres, converted from published manufacturer and luthier specifications:
   soprano  Cordoba 15SM: body, bouts, nut, nut string spacing, sound hole; Millar soprano: saddle spacing, 12 frets to body
   concert  Kala KA-C: scale, overall, body, bouts, nut and joint widths; Honua concert: saddle spacing; Cordoba concert body: sound hole
   tenor    Kala KA-T: scale, overall, body, bouts, nut and joint widths; Honua tenor: saddle spacing
   baritone GenOne Baritone 14 plans: scale, overall, body, bouts, nut and joint widths; KLOS baritone: saddle spacing
   Estimated: tenor and baritone sound holes (between published sizes), soprano neck width at the joint,
   and where along the body each bout is widest (standard guitar-family proportions). */
const UKE={
  soprano: {name:'soprano', scale:330,   overall:533.4, body:241,   upper:133,   waist:117,   lower:181,   nut:35,   wJ:42,   nutSpan:28,   sadSpan:38, hole:52, joint:12, frets:15, head:52},
  concert: {name:'concert', scale:376.2, overall:608.0, body:281.0, upper:152.4, waist:125.4, lower:209.6, nut:36.5, wJ:44.5, nutSpan:28.5, sadSpan:42, hole:55, joint:14, frets:18, head:54},
  tenor:   {name:'tenor',   scale:428.6, overall:654.1, body:298.5, upper:177.8, waist:142.9, lower:236.5, nut:36.5, wJ:46.0, nutSpan:28.5, sadSpan:42, hole:62, joint:14, frets:18, head:56},
  baritone:{name:'baritone',scale:511.2, overall:775.6, body:354.8, upper:193.2, waist:168.6, lower:258.6, nut:36,   wJ:44.5, nutSpan:29,   sadSpan:39, hole:75, joint:14, frets:18, head:60}
};
const STR_NUM=['4th','3rd','2nd','1st'];
const strNames=()=>TUNINGS[S.tuning].open.map(m=>NOTES[m%12]);
const BOUT={u:0.23,w:0.45,l:0.72};             // where the upper bout, waist, and lower bout are widest, as a share of body length
const fretPos=(L,n)=>L*(1-Math.pow(2,-n/12)); // equal temperament: the 12th fret is exactly half the scale
function ukeSize(){ const k=S.uke==='concert'||S.uke==='tenor'||S.uke==='baritone'?S.uke:(S.tuning==='bari'?'baritone':'soprano'); return UKE[k]; }
/* half-width of the body at t (0 = neck end, 1 = tail): elliptical ends, cosine blends between the bouts, so it is smooth everywhere */
function bodyHalf(u,t){ const U=u.upper/2, W=u.waist/2, L=u.lower/2, a=BOUT.u, b=BOUT.w, c=BOUT.l;
  if(t<=a) return U*Math.sqrt(Math.max(0,1-((a-t)/a)**2));
  if(t>=c) return L*Math.sqrt(Math.max(0,1-((t-c)/(1-c))**2));
  if(t<=b) return W+(U-W)*(1+Math.cos(Math.PI*(t-a)/(b-a)))/2;
  return W+(L-W)*(1-Math.cos(Math.PI*(t-b)/(c-b)))/2; }
function ukeModel(u){
  const H=u.overall-fretPos(u.scale,u.joint)-u.body;   // headstock length is what remains of the published overall length
  const nutX=H, joint=nutX+fretPos(u.scale,u.joint), saddle=nutX+u.scale+1.5;
  const fbEnd=nutX+fretPos(u.scale,u.frets)+3;
  const neckW=x=>u.nut+(u.wJ-u.nut)*(x-nutX)/fretPos(u.scale,u.joint);
  const strY=(i,x)=>{ const f=clamp((x-nutX)/(saddle-nutX),0,1), span=u.nutSpan+(u.sadSpan-u.nutSpan)*f; return -span/2+span*i/3; };
  const hole={x:fbEnd+5+u.hole/2, r:u.hole/2};
  const N=120, top=[], bot=[]; for(let k=0;k<=N;k++){ const t=k/N, x=joint+t*u.body, h=bodyHalf(u,t); top.push([x,-h]); bot.push([x,h]); }
  const outline='M'+top.map(p=>p.map(v=>v.toFixed(2)).join(' ')).join(' L')+' L'+bot.reverse().map(p=>p.map(v=>v.toFixed(2)).join(' ')).join(' L')+'Z';
  const posts=[0.33,0.66].map(f=>H*f);
  return {u,H,nutX,joint,saddle,fbEnd,neckW,strY,hole,outline,posts,len:joint+u.body,maxW:Math.max(u.lower,u.upper)};
}
/* the instrument itself, in millimetres, headstock to the left, G string on top */
function ukeBody(m,{strum=false,tap=false,box=false}={}){
  const u=m.u, nw0=m.neckW(m.nutX), nw1=m.neckW(m.fbEnd), hw=u.head, NS='vector-effect="non-scaling-stroke"';
  const frets=[]; for(let n=1;n<=u.frets;n++){ const x=m.nutX+fretPos(u.scale,n); frets.push(`<line x1="${x.toFixed(2)}" y1="${(-m.neckW(x)/2).toFixed(2)}" x2="${x.toFixed(2)}" y2="${(m.neckW(x)/2).toFixed(2)}" stroke="var(--dfret)" stroke-width="1.4" ${NS}/>`); }
  const dot=n=>m.nutX+(fretPos(u.scale,n-1)+fretPos(u.scale,n))/2;
  const dots=[5,7,10,12,15].filter(n=>n<=u.frets).map(n=>`<circle cx="${dot(n).toFixed(2)}" cy="0" r="${(u.nut*0.075).toFixed(2)}" fill="var(--dstr)"/>`).join('');
  const strings=[0,1,2,3].map(i=>{ const px=i===0||i===3?m.posts[0]:m.posts[1], py=m.strY(i,m.nutX)*1.55, ny=m.strY(i,m.nutX), sy=m.strY(i,m.saddle);
    return `<circle cx="${px.toFixed(2)}" cy="${py.toFixed(2)}" r="${(u.nut*0.07).toFixed(2)}" fill="var(--ink)"/><path class="str" data-s="${i}" d="M${px.toFixed(2)} ${py.toFixed(2)} L${m.nutX.toFixed(2)} ${ny.toFixed(2)} L${m.saddle.toFixed(2)} ${sy.toFixed(2)}" fill="none" stroke="var(--ink)" stroke-width="${1.05+i*0.1}" opacity=".85" ${NS}/>`; }).join('');
  const pegs=m.posts.map(x=>`<rect x="${(x-hw*0.11).toFixed(2)}" y="${(-hw/2-hw*0.2).toFixed(2)}" width="${(hw*0.22).toFixed(2)}" height="${(hw*0.2).toFixed(2)}" rx="${hw*0.05}" fill="var(--koa)"/><rect x="${(x-hw*0.11).toFixed(2)}" y="${(hw/2).toFixed(2)}" width="${(hw*0.22).toFixed(2)}" height="${(hw*0.2).toFixed(2)}" rx="${hw*0.05}" fill="var(--koa)"/>`).join('');
  const f4=m.nutX+fretPos(u.scale,4);
  return `<path d="${m.outline}" fill="var(--koa-soft)" stroke="var(--koa)" stroke-width="1.6" stroke-linejoin="round" ${NS}/>
    <circle cx="${m.hole.x.toFixed(2)}" cy="0" r="${m.hole.r}" fill="var(--paper)" stroke="var(--koa)" stroke-width="1.3" ${NS}/>
    <rect x="${(m.saddle-6).toFixed(2)}" y="${(-u.sadSpan/2-11).toFixed(2)}" width="14" height="${(u.sadSpan+22).toFixed(2)}" rx="3" fill="var(--koa)"/>
    <path d="M${m.nutX} ${(-nw0/2).toFixed(2)} L${m.fbEnd.toFixed(2)} ${(-nw1/2).toFixed(2)} L${m.fbEnd.toFixed(2)} ${(nw1/2).toFixed(2)} L${m.nutX} ${(nw0/2).toFixed(2)}Z" fill="var(--neck)" stroke="var(--dstr)" stroke-width="1" ${NS}/>
    ${frets.join('')}${dots}
    <path d="M${(m.nutX).toFixed(2)} ${(-nw0/2).toFixed(2)} L${(m.nutX*0.2).toFixed(2)} ${(-hw/2).toFixed(2)} Q0 ${(-hw/2).toFixed(2)} 0 ${(-hw*0.3).toFixed(2)} L0 ${(hw*0.3).toFixed(2)} Q0 ${(hw/2).toFixed(2)} ${(m.nutX*0.2).toFixed(2)} ${(hw/2).toFixed(2)} L${m.nutX} ${(nw0/2).toFixed(2)}Z" fill="var(--koa-soft)" stroke="var(--koa)" stroke-width="1.3" ${NS}/>
    ${pegs}<rect x="${(m.nutX-2.5).toFixed(2)}" y="${(-nw0/2).toFixed(2)}" width="5" height="${nw0.toFixed(2)}" fill="var(--ink)"/>
    ${strum?`<ellipse cx="${(m.fbEnd-8).toFixed(2)}" cy="0" rx="${(u.nut*0.75).toFixed(2)}" ry="${(u.upper*0.42).toFixed(2)}" fill="var(--koa)" opacity=".2"/>`:''}
    ${strings}
    ${box?`<rect x="${(m.nutX-4).toFixed(2)}" y="${(-m.neckW(f4)/2-5).toFixed(2)}" width="${(f4-m.nutX+8).toFixed(2)}" height="${(m.neckW(f4)+10).toFixed(2)}" rx="4" fill="none" stroke="var(--koa)" stroke-width="1.7" stroke-dasharray="4 3" ${NS}/>`:''}`;
}
function strList(){ return strNames().map((n,i)=>({n,num:STR_NUM[i]})); }
/* looking down at the ukulele while you play: the whole instrument to scale, plus a magnified view of the neck for the strings */
function ukeFlat({strum=false,tap=false}={}){
  const m=ukeModel(ukeSize()), u=m.u, flip=lefty(), pad=18, W=m.len+pad*2, Hh=m.maxW+pad*2+34;
  const inst=`<g transform="translate(${flip?W-pad:pad} ${Hh/2}) scale(${flip?-1:1} 1)">${ukeBody(m,{strum})}</g>`;
  const fs=W*0.028, lx=flip?W-pad:pad, an=flip?'end':'start';
  const side=`<text x="${lx}" y="${fs*1.1}" font-size="${fs}" fill="var(--soft)" text-anchor="${an}" font-family="Instrument Sans,sans-serif">Nearest your face</text><text x="${lx}" y="${Hh-fs*0.3}" font-size="${fs}" fill="var(--soft)" text-anchor="${an}" font-family="Instrument Sans,sans-serif">Nearest the floor</text>`;
  const sx=flip?W-pad-(m.fbEnd-8):pad+m.fbEnd-8;
  const st=strum?`<text x="${sx.toFixed(1)}" y="${Hh-fs*0.3}" font-size="${fs}" font-weight="600" fill="var(--koa)" text-anchor="middle" font-family="Instrument Sans,sans-serif">Strum here</text>`:'';
  const full=`<svg class="ukeart" viewBox="0 0 ${W.toFixed(1)} ${Hh.toFixed(1)}" width="100%" role="img" aria-label="A ${u.name} ukulele drawn to scale, seen from above while you play it">${inst}${side}${st}</svg>`;
  if(!tap) return full+`<p class="scalenote">Drawn to the measurements of a real ${u.name} ukulele.</p>`;
  /* close-up: from just before the nut to past the 4th fret, same model, magnified; labels sit exactly on each string at the nut */
  const STR=strList(), f4=m.nutX+fretPos(u.scale,4)+8, lw=u.nut*0.75, x0=m.nutX-lw, cw=f4-x0, ch=u.nut*1.5;
  const tf=flip?`translate(${cw} 0) scale(-1 1) translate(${-x0} 0)`:`translate(${-x0} 0)`;
  const lab=STR.map((s,i)=>{ const y=m.strY(i,m.nutX), x=flip?cw-lw*0.42:lw*0.42; return `<text x="${x.toFixed(2)}" y="${(y+u.nut*0.06).toFixed(2)}" font-size="${(u.nut*0.17).toFixed(2)}" font-weight="600" text-anchor="middle" fill="var(--ink)" font-family="Instrument Sans,sans-serif">${s.n}</text>`; }).join('');
  const fr=[1,2,3,4].map(n=>{ const x=m.nutX+(fretPos(u.scale,n-1)+fretPos(u.scale,n))/2-x0; return `<text x="${(flip?cw-x:x).toFixed(2)}" y="${(ch/2-u.nut*0.06).toFixed(2)}" font-size="${(u.nut*0.11).toFixed(2)}" text-anchor="middle" fill="var(--faint)" font-family="Instrument Sans,sans-serif">${n}</text>`; }).join('');
  const zoom=`<svg class="ukeart zoomart" viewBox="0 ${(-ch/2).toFixed(2)} ${cw.toFixed(2)} ${ch.toFixed(2)}" width="100%" role="img" aria-label="Close-up of the neck: strings ${STR.map(s=>s.n).join(', ')} from top to bottom">
    <defs><clipPath id="zc"><rect x="${flip?0:lw*0.84}" y="${-ch/2}" width="${cw-lw*0.84}" height="${ch}"/></clipPath></defs>
    <g clip-path="url(#zc)"><g transform="${tf}">${ukeBody(m)}</g></g>${lab}${fr}</svg>`;
  return full+`<p class="scalenote">A real ${u.name} ukulele to scale. Below, the neck up close.</p>`+zoom+
    `<div class="strtap" role="group" aria-label="Hear each string">${STR.map((s,i)=>`<button data-s="${i}"><b>${s.n}</b><span>${s.num} string</span></button>`).join('')}</div>`;
}
/* the ukulele stood upright and facing you, to scale: axes swapped so the headstock is up and G is on the left */
function ukeUpright(){
  const m=ukeModel(ukeSize()), u=m.u, flip=lefty(), pad=14, W=m.maxW+pad*2, H=m.len+pad*2+30;
  const nm=strNames(), names=flip?[...nm].reverse():nm, sx=i=>W/2+(flip?-1:1)*m.strY(i,m.saddle);
  return `<svg class="ukeart" viewBox="0 0 ${W.toFixed(1)} ${H.toFixed(1)}" width="100%" style="max-width:190px" role="img" aria-label="A ${u.name} ukulele standing upright and facing you, strings ${names.join(', ')} from left to right">
    <g transform="matrix(0 1 ${flip?-1:1} 0 ${W/2} ${pad})">${ukeBody(m,{box:true})}</g>
    ${[0,1,2,3].map(i=>`<text x="${sx(i).toFixed(1)}" y="${H-8}" font-size="${(W*0.055).toFixed(1)}" font-weight="600" text-anchor="middle" fill="var(--ink)" font-family="Instrument Sans,sans-serif">${nm[i]}</text>`).join('')}
  </svg><p class="scalenote">To scale. The dashed box is the part a chord diagram shows.</p>`;
}
/* the fretting hand from the back, drawn as one silhouette: outlines first, fills on top, so inner overlaps vanish */
function handSvg(){
  const flip=lefty();
  const fingers=[{x:46,top:62,n:4},{x:74,top:36,n:3},{x:102,top:26,n:2},{x:130,top:40,n:1}];
  const shapes=[...fingers.map(f=>`<rect x="${f.x}" y="${f.top}" width="24" height="${150-f.top}" rx="12"/>`),
    `<rect x="42" y="108" width="114" height="92" rx="34"/>`,
    `<rect x="136" y="118" width="26" height="78" rx="13" transform="rotate(40 149 190)"/>`].join('');
  const art=`<g fill="var(--koa)" stroke="var(--koa)" stroke-width="3.2" stroke-linejoin="round">${shapes}</g><g fill="var(--hand)">${shapes}</g>
    <path d="M58 150c10 8 70 10 90-2" fill="none" stroke="var(--koa)" stroke-width="1" opacity=".35"/>`;
  const g=flip?`<g transform="translate(236 0) scale(-1 1)"><g transform="translate(20 0)">${art}</g></g>`:art;
  const nums=fingers.map(f=>{ const cx=flip?236-20-(f.x+12):f.x+12; return `<circle cx="${cx}" cy="${f.top+15}" r="10.5" fill="var(--koa)"/><text x="${cx}" y="${f.top+19.5}" font-size="12.5" font-weight="600" text-anchor="middle" fill="var(--on-koa)" font-family="Instrument Sans,sans-serif">${f.n}</text>`; }).join('');
  const tx=flip?236-20-204:204;
  return `<svg viewBox="0 0 236 212" width="100%" style="max-width:240px" role="img" aria-label="Your fretting hand: index finger is 1, middle is 2, ring is 3, pinky is 4">${g}${nums}<text x="${tx}" y="112" font-size="11.5" text-anchor="middle" fill="var(--soft)" font-family="Instrument Sans,sans-serif">thumb</text></svg>`;
}

/* A plucked string: the stretch between nut and saddle bows out and back, fading like a real string,
   while both ends stay fixed. It changes the path's shape only, never a transform, then restores it exactly. */
const pluckAnim=new WeakMap();
function pluckString(el){
  const prev=pluckAnim.get(el); if(prev){ cancelAnimationFrame(prev.raf); el.setAttribute('d',prev.d0); }
  const d0=el.getAttribute('d'), n=d0.match(/-?\d+(?:\.\d+)?/g).map(Number);
  if(n.length<6 || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const [px,py,nx,ny,sx,sy]=n, len=Math.hypot(sx-nx,sy-ny), ux=-(sy-ny)/len, uy=(sx-nx)/len, mx=(nx+sx)/2, my=(ny+sy)/2;
  const amp=Math.min(3.2,len*0.012), t0=performance.now(), st={d0,raf:0};
  const step=now=>{ const t=(now-t0)/1000; if(t>=1.1){ el.setAttribute('d',d0); pluckAnim.delete(el); return; }
    const a=amp*Math.exp(-t*3.6)*Math.sin(2*Math.PI*9*t), cx=mx+ux*a*2, cy=my+uy*a*2;
    el.setAttribute('d',`M${px} ${py} L${nx} ${ny} Q${cx.toFixed(2)} ${cy.toFixed(2)} ${sx} ${sy}`); st.raf=requestAnimationFrame(step); };
  pluckAnim.set(el,st); st.raf=requestAnimationFrame(step);
}
