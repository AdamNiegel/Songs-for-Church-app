// ---- music theory helpers (shared by app + tests) ----
const N_SHARP=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const N_FLAT=['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
const FLAT_KEYS=new Set(['F','Bb','Eb','Ab','Db','Gb','Dm','Gm','Cm','Fm','Bbm','Ebm']);
const idx=n=>{const i=N_SHARP.indexOf(n);return i>=0?i:N_FLAT.indexOf(n)};
function parseChord(c){const m=(c||'').match(/^([A-G][#b]?)([^\/]*)(?:\/([A-G][#b]?))?$/);return m?{r:m[1],q:m[2],b:m[3]||null}:null}
function isFlatKey(key,t){const p=parseChord(key);if(!p)return false;const minor=/^m(?!aj)/.test(p.q);return FLAT_KEYS.has(N_FLAT[(idx(p.r)+t+120)%12]+(minor?'m':''))}
function tr(c,t,flat){const p=parseChord(c);if(!p||!t)return c;const nm=flat?N_FLAT:N_SHARP;const f=n=>nm[(idx(n)+t+120)%12];return f(p.r)+p.q+(p.b?'/'+f(p.b):'')}
function intervals(q){
  q=(q||'').replace('min','m').replace('M7','maj7').replace('Δ','maj7');let s=q;
  const minor=/^m(?!aj)/.test(s);if(minor)s=s.slice(1);
  let iv=minor?[0,3,7]:[0,4,7];const dim=/^dim/.test(s);
  if(dim){iv=[0,3,6];s=s.slice(3)}else if(/^(aug|\+)/.test(s)){iv=[0,4,8];s=s.replace(/^(aug|\+)/,'')}
  if(/^5/.test(s))return[0,7];
  if(/sus2/.test(s))iv=[0,2,7];else if(/sus/.test(s))iv=[0,5,7];
  if(/maj/.test(s)){iv.push(11);if(/9/.test(s))iv.push(14)}
  else if(dim&&/7/.test(s))iv.push(9);
  else if(/9/.test(s)&&!/add9/.test(s))iv.push(10,14);
  else if(/7/.test(s))iv.push(10);
  if(/6/.test(s))iv.push(9);
  if(/add9|^2$/.test(s))iv.push(14);
  return iv;
}
function tmplKey(q){
  q=(q||'').replace('min','m').replace('M7','maj7');
  if(/^dim/.test(q))return'dim';
  if(/^m(?!aj)/.test(q))return /7|9/.test(q)?'m7':'m';
  if(/sus2/.test(q))return'sus2';if(/sus/.test(q))return'sus4';
  if(/maj/.test(q))return'maj7';if(/7|9|13/.test(q))return'7';return'maj';
}
// ---- guitar ----
const OPEN={'C':'x32010','D':'xx0232','G':'320003','C7':'x32310','D7':'xx0212','G7':'320001','B7':'x21202','Cmaj7':'x32000','Dmaj7':'xx0222','Gmaj7':'320002','Fmaj7':'xx3210','Dm':'xx0231','Dm7':'xx0211','Em7':'020000','Dsus4':'xx0233','Dsus2':'xx0230','Cadd9':'x32030','Gsus4':'330013'};
const ESH={maj:[0,2,2,1,0,0],m:[0,2,2,0,0,0],'7':[0,2,0,1,0,0],m7:[0,2,0,0,0,0],maj7:[0,2,1,1,0,0],sus4:[0,2,2,2,0,0]};
const ASH={maj:[null,0,2,2,2,0],m:[null,0,2,2,1,0],'7':[null,0,2,0,2,0],m7:[null,0,2,0,1,0],maj7:[null,0,2,1,2,0],sus4:[null,0,2,2,3,0],sus2:[null,0,2,2,0,0],dim:[null,0,1,2,1,null]};
function guitarVoicing(c){
  const p=parseChord(c);if(!p)return null;const r=idx(p.r),k=tmplKey(p.q);
  const name=N_SHARP[r]+({maj:'',m:'m','7':'7',m7:'m7',maj7:'maj7',sus4:'sus4',sus2:'sus2',dim:'dim'}[k]);
  const o=OPEN[p.r+p.q]||OPEN[name];if(o)return o.split('').map(x=>x==='x'?null:+x);
  const r6=(r-4+12)%12,r5=(r-9+12)%12,cands=[];
  if(ESH[k])cands.push({f:r6,s:ESH[k]});if(ASH[k])cands.push({f:r5,s:ASH[k]});
  if(!cands.length){const kk=/^m/.test(k)?'m':'maj';cands.push({f:r6,s:ESH[kk]},{f:r5,s:ASH[kk]})}
  cands.sort((a,b)=>a.f-b.f);const b=cands[0];
  return b.s.map(o=>o===null?null:o+b.f);
}
function guitarSVG(c){
  const v=guitarVoicing(c);if(!v)return'';const fr=v.filter(x=>x>0);
  const mx=Math.max(0,...fr),mn=fr.length?Math.min(...fr):1;const st=mx<=5?1:mn;
  let s=`<svg width="96" height="118" viewBox="0 0 96 118">`;
  for(let i=0;i<6;i++)s+=`<line x1="${18+i*14}" y1="22" x2="${18+i*14}" y2="112" stroke="currentColor" stroke-width="1"/>`;
  for(let j=0;j<=5;j++)s+=`<line x1="18" y1="${22+j*18}" x2="88" y2="${22+j*18}" stroke="currentColor" stroke-width="${j===0&&st===1?4:1}"/>`;
  if(st>1)s+=`<text x="2" y="38" font-size="10" fill="currentColor">${st}fr</text>`;
  v.forEach((f,i)=>{const x=18+i*14;
    if(f===null)s+=`<text x="${x-4}" y="14" font-size="11" fill="currentColor">x</text>`;
    else if(f===0)s+=`<circle cx="${x}" cy="10" r="4" fill="none" stroke="currentColor"/>`;
    else s+=`<circle cx="${x}" cy="${22+(f-st)*18+9}" r="6" fill="#c2410c"/>`});
  return s+'</svg>';
}
// ---- piano ----
function pianoNotes(c){const p=parseChord(c);const r=idx(p.r);const iv=intervals(p.q);const set=new Map();
  iv.forEach((i,n)=>{let a=r+i;if(a>23)a-=12;set.set(a,n===0?'R':'N')});
  if(p.b){let a=idx(p.b);set.set(a,'B')}return set}
function pianoSVG(c){
  const set=pianoNotes(c),W=[0,2,4,5,7,9,11],w=13,h=62;let s=`<svg width="${14*w+2}" height="${h+4}" viewBox="0 0 ${14*w+2} ${h+4}">`;
  const col=t=>t==='R'?'#c2410c':t==='B'?'#2563eb':'#f59e0b';
  for(let o=0;o<2;o++)W.forEach((pc,i)=>{const a=o*12+pc,x=1+(o*7+i)*w,t=set.get(a);
    s+=`<rect x="${x}" y="1" width="${w}" height="${h}" fill="${t?col(t):'#fff'}" stroke="#444"/>`});
  for(let o=0;o<2;o++)[[1,0],[3,1],[6,3],[8,4],[10,5]].forEach(([pc,wi])=>{const a=o*12+pc,x=1+(o*7+wi+1)*w-4.5,t=set.get(a);
    s+=`<rect x="${x}" y="1" width="9" height="${h*.62}" fill="${t?col(t):'#222'}" stroke="#000"/>`});
  return s+'</svg>';
}
function noteNames(c){const p=parseChord(c);if(!p)return'';const r=idx(p.r),nm=/b/.test(p.r)?N_FLAT:N_SHARP;
  return intervals(p.q).map(i=>nm[(r+i)%12]).filter((x,i,a)=>a.indexOf(x)===i).join(' ')+(p.b?'  /'+p.b:'')}
// ---- bass ----
function bassSVG(c){
  const p=parseChord(c);if(!p)return'';const r=idx(p.b||p.r);let rootE=(r-4+12)%12,lo=0;if(rootE>7){rootE=(r-9+12)%12;lo=1}
  // strings E A D G -> index 0..3; root on string lo, 5th one string up (+2), octave two up (+2)
  const pts=[[lo,rootE,'R'],[lo+1,rootE+2,'5'],[lo+2,rootE+2,'8']];
  const mx=Math.max(...pts.map(x=>x[1])),st=mx<=5?1:Math.min(...pts.map(x=>x[1]).filter(x=>x>0))||1;
  let s=`<svg width="80" height="112" viewBox="0 0 80 112">`;
  for(let i=0;i<4;i++)s+=`<line x1="${14+i*17}" y1="20" x2="${14+i*17}" y2="106" stroke="currentColor"/>`;
  for(let j=0;j<=5;j++)s+=`<line x1="14" y1="${20+j*17}" x2="65" y2="${20+j*17}" stroke="currentColor" stroke-width="${j===0&&st===1?4:1}"/>`;
  if(st>1)s+=`<text x="0" y="36" font-size="10" fill="currentColor">${st}fr</text>`;
  pts.forEach(([si,f,l])=>{if(f-st<0||f-st>4+(f===0?1:0)&&f!==0)return;const x=14+si*17;
    if(f===0)s+=`<circle cx="${x}" cy="10" r="5" fill="none" stroke="#c2410c"/><text x="${x-3}" y="14" font-size="9" fill="currentColor">${l}</text>`;
    else s+=`<circle cx="${x}" cy="${20+(f-st)*17+8}" r="7" fill="${l==='R'?'#c2410c':'#f59e0b'}"/><text x="${x-3}" y="${20+(f-st)*17+12}" font-size="10" fill="#000">${l}</text>`});
  return s+'</svg>';
}
function diagram(inst,c){return inst==='piano'?pianoSVG(c):inst==='bass'?bassSVG(c):guitarSVG(c)}
// ---- chordpro ----
function parseLine(l){
  if(/^\{c:/i.test(l))return{cm:l.replace(/^\{c:\s*/i,'').replace(/\}\s*$/,'')};
  let text='',chords=[],re=/\[([^\]]+)\]/g,last=0,m;
  while((m=re.exec(l))){text+=l.slice(last,m.index);chords.push({p:text.length,n:m[1]});last=re.lastIndex}
  text+=l.slice(last);return{text,chords};
}
function ser(o){if(o.cm!==undefined)return'{c: '+o.cm+'}';let s='',last=0;
  [...o.chords].sort((a,b)=>a.p-b.p).forEach(c=>{s+=o.text.slice(last,c.p)+'['+c.n+']';last=c.p});return s+o.text.slice(last)}
if(typeof module!=='undefined')module.exports={tr,isFlatKey,guitarVoicing,intervals,parseLine,ser,pianoNotes,tmplKey,idx,N_SHARP,N_FLAT,parseChord,noteNames};
