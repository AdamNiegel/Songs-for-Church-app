const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const LS=(k,v)=>{try{if(v===undefined)return JSON.parse(localStorage.getItem(k));localStorage.setItem(k,JSON.stringify(v))}catch(e){return null}};
const S={songs:[],id:null,t:0,inst:'guitar',tab:'chart',edit:false,raw:false,size:18,q:'',sel:null,page:'list',bpm:90,beats:4,popup:null};
Object.assign(S,LS('cc_set')||{});S.edit=false;S.sel=null;S.popup=null;
const save=()=>{LS('cc_songs',S.songs);LS('cc_set',{inst:S.inst,size:S.size})};
const cur=()=>S.songs.find(s=>s.id===S.id);
async function load(){
  S.songs=LS('cc_songs')||[];
  if(!S.songs.length){try{S.songs=await (await fetch('songs.json')).json();save()}catch(e){S.songs=[]}}
  route();
}
function route(){const h=location.hash;
  if(h.startsWith('#/song/')){S.id=decodeURIComponent(h.slice(7));S.page='song';const s=cur();if(s){S.t=0;S.bpm=s.bpm||90;Met.bpm=S.bpm}}
  else if(h==='#/backup')S.page='backup';else{S.page='list';Met.stop()}
  S.edit=false;S.sel=null;render()}
window.addEventListener('hashchange',route);
// ---------- metronome ----------
const Met={ctx:null,on:false,bpm:90,beat:0,next:0,timer:null,taps:[],
 start(){this.ctx=this.ctx||new (window.AudioContext||window.webkitAudioContext)();this.ctx.resume();this.on=true;this.beat=0;this.next=this.ctx.currentTime+.05;this.sched()},
 sched(){if(!this.on)return;const c=this.ctx;
  while(this.next<c.currentTime+.15){this.click(this.next,this.beat===0);const b=this.beat;setTimeout(()=>this.flash(b),Math.max(0,(this.next-c.currentTime)*1000));this.next+=60/this.bpm;this.beat=(this.beat+1)%S.beats}
  this.timer=setTimeout(()=>this.sched(),25)},
 click(t,acc){const c=this.ctx,o=c.createOscillator(),g=c.createGain();o.frequency.value=acc?1600:1000;g.gain.setValueAtTime(.7,t);g.gain.exponentialRampToValueAtTime(.001,t+.06);o.connect(g);g.connect(c.destination);o.start(t);o.stop(t+.07)},
 flash(b){document.querySelectorAll('.dots span').forEach((d,i)=>d.classList.toggle('hit',i===b))},
 stop(){this.on=false;clearTimeout(this.timer);this.flash(-1)},
 tap(){const n=Date.now();this.taps=this.taps.filter(t=>n-t<2500);this.taps.push(n);if(this.taps.length>1){const a=this.taps,avg=(a[a.length-1]-a[0])/(a.length-1);setBpm(Math.round(60000/avg))}}};
function setBpm(v){v=Math.max(30,Math.min(240,+v||90));S.bpm=Met.bpm=v;const s=cur();if(s){s.bpm=v;save()}$('#bpmv')&&($('#bpmv').textContent=v);$('#bpmr')&&($('#bpmr').value=v)}
// ---------- helpers ----------
const keyFlat=()=>{const s=cur();return S.t?isFlatKey(s.key||'C',S.t):/b/.test(s.key||'')};
const disp=c=>{const s=cur();let x=S.t?tr(c,S.t,keyFlat()):c;if(S.inst==='bass'&&!S.edit){const p=parseChord(x);if(p)x=p.b||p.r}return x};
const lines=s=>s.body.split('\n').map(parseLine);
const uniq=s=>{const a=[];lines(s).forEach(l=>(l.chords||[]).forEach(c=>{const d=tr(c.n,S.t,keyFlat());if(!a.includes(d))a.push(d)}));return a};
function segs(l){const cs=[...l.chords].sort((a,b)=>a.p-b.p),out=[];
  if(!cs.length||cs[0].p>0)out.push({c:null,t:l.text.slice(0,cs.length?cs[0].p:undefined)});
  cs.forEach((c,i)=>out.push({c,t:l.text.slice(c.p,i+1<cs.length?cs[i+1].p:undefined)}));return out}
const SECRE=/^(\(?repeat|chorus|verse|bridge|intro|refrain|pre-?chorus|tag|outro|ending|interlude|coda|instrumental|verse \d)\b|^(I{1,3}|IV|V|\d)\.?:?$/i;
// ---------- views ----------
function render(){const a=$('#app');
  if(S.page==='list')a.innerHTML=listView();else if(S.page==='backup')a.innerHTML=backupView();else a.innerHTML=songView();
  if(S.page==='song'){bindSong()}
}
function listView(){return`<header><h1>🎵 Church Chords</h1><button data-a="new" class="p">+ New</button><button data-a="backup">Backup</button></header>
<div class="wrap"><input id="q" placeholder="Search ${S.songs.length} songs..." value="${esc(S.q)}" oninput="S.q=this.value;$('#list').innerHTML=listItems()"><div id="list">${listItems()}</div></div>`}
function listItems(){const q=S.q.toLowerCase();return[...S.songs].sort((a,b)=>a.title.localeCompare(b.title)).filter(s=>s.title.toLowerCase().includes(q))
 .map(s=>`<div class="item" data-a="open" data-id="${s.id}"><span>${esc(s.title)}</span><small>${esc(s.key||'')}</small></div>`).join('')||'<p>No songs</p>'}
function songView(){const s=cur();if(!s)return'<p>Not found</p>';
  const kt=s.key?tr(s.key,S.t,keyFlat()):'';
  const head=`<header><button data-a="back">‹</button><h1>${esc(s.title)}</h1>
   <button data-a="edit" class="${S.edit?'on':''}">${S.edit?'Done':'Edit'}</button></header>`;
  const ctl=`<div class="row"><button data-a="tr" data-d="-1">♭ −</button><b>Key ${esc(kt)}${S.t?` (${S.t>0?'+':''}${S.t})`:''}</b><button data-a="tr" data-d="1">♯ +</button>
   ${S.t?'<button data-a="trreset">Reset</button><button data-a="trperm">Save key</button>':''}</div>
   <div class="row tabs"><button data-a="inst" data-v="guitar" class="${S.inst==='guitar'?'on':''}">🎸 Guitar</button><button data-a="inst" data-v="piano" class="${S.inst==='piano'?'on':''}">🎹 Piano</button><button data-a="inst" data-v="bass" class="${S.inst==='bass'?'on':''}">Bass</button></div>
   <div class="row tabs"><button data-a="tab" data-v="chart" class="${S.tab==='chart'?'on':''}">Chart</button><button data-a="tab" data-v="chords" class="${S.tab==='chords'?'on':''}">Chord shapes</button>
   <button data-a="fs" data-d="-1">A−</button><button data-a="fs" data-d="1">A+</button></div>`;
  let body;
  if(S.edit)body=editBody(s);
  else if(S.tab==='chords')body=`<div class="dg grid">${uniq(s).map(c=>card(c)).join('')}</div>`;
  else body=`<div class="dg">${uniq(s).map(c=>card(c,1)).join('')}</div><div style="font-size:${S.size}px">${chart(s)}</div>`;
  return head+`<div class="wrap">${S.edit?'':ctl}${body}</div>`+(S.edit?sheet():metBar())}
function card(c,small){const d=S.inst==='bass'?c:c;return`<div class="dc" data-a="pop" data-c="${esc(c)}"><b>${esc(c)}</b>${diagram(S.inst,c)}${small?'':`<small>${esc(noteNames(c))}</small>`}</div>`}
function chart(s){return lines(s).map(l=>{
  if(l.cm!==undefined)return`<div class="cm">${esc(l.cm)}</div>`;
  if(!l.text.trim()&&!l.chords.length)return'<div class="gap"></div>';
  if(!l.chords.length)return`<div class="${SECRE.test(l.text.trim())&&l.text.length<40?'sec':'ly'} ln"><span class="ly">${esc(l.text)}</span></div>`;
  return`<div class="ln">${segs(l).map(x=>`<span class="seg"><span class="ch" data-a="pop" data-c="${x.c?esc(tr(x.c.n,S.t,keyFlat())):''}">${x.c?esc(disp(x.c.n)):' '}</span><span class="ly">${esc(x.t)||' '}</span></span>`).join('')}</div>`}).join('')}
function metBar(){return`<div class="bar"><div class="row" style="margin:0"><button class="${Met.on?'p':''}" data-a="met" style="min-width:56px">${Met.on?'⏸':'▶'}</button>
 <button data-a="bpm" data-d="-1">−</button><b id="bpmv" style="min-width:34px;text-align:center">${S.bpm}</b><button data-a="bpm" data-d="1">+</button>
 <input id="bpmr" type="range" min="30" max="240" value="${S.bpm}" style="flex:1;min-width:80px;padding:0" oninput="setBpm(this.value)">
 <button data-a="tap">Tap</button><select id="beats" style="width:62px" onchange="S.beats=+this.value;render()">${[2,3,4,6].map(n=>`<option ${n===S.beats?'selected':''}>${n}</option>`).join('')}</select></div>
 <div class="dots">${Array.from({length:S.beats},()=>'<span></span>').join('')}</div></div>${S.popup?`<div class="modal" data-a="closepop"><div><div class="big">${esc(S.popup)}</div>${diagram(S.inst,S.popup).replace(/width="\d+" height="\d+"/,m=>m.replace(/\d+/g,n=>n*2))}<p>${esc(noteNames(S.popup))}</p><button>Close</button></div></div>`:''}`}
// ---------- edit ----------
function editBody(s){
  if(S.raw)return`<div class="row"><button data-a="raw" class="on">Back to tap editor</button></div><textarea id="rawt" style="height:60vh;font-family:monospace" oninput="cur().body=this.value;save()">${esc(s.body)}</textarea>`+meta(s);
  const L=lines(s);
  return meta(s)+`<div class="row"><button data-a="raw">Raw text mode</button><button data-a="addl" data-i="-1">+ Line at top</button></div>
  <p style="color:var(--mut);font-size:13px">Tap a letter to place a chord before it. Tap a chord to change/remove it.</p>
  <div class="edit" style="font-size:${S.size}px">`+L.map((l,i)=>{
   const tools=`<span class="tools"><button data-a="editl" data-i="${i}">✎</button><button data-a="addl" data-i="${i}">＋</button><button class="d" data-a="dell" data-i="${i}">🗑</button></span>`;
   if(l.cm!==undefined)return`<div class="ln">${tools}<span class="cm">${esc(l.cm)}</span></div>`;
   const cs=[...l.chords].sort((a,b)=>a.p-b.p);let html='',last=0;
   const chars=(a,b)=>{let h='';for(let p=a;p<b;p++){const on=S.sel&&S.sel.l===i&&S.sel.p===p;h+=`<i class="${on?'sel':''}" data-a="cell" data-l="${i}" data-p="${p}">${l.text[p]===' '?'&nbsp;':esc(l.text[p])}</i>`}return h};
   const pos=[...new Set([0,...cs.map(c=>c.p)])];
   pos.forEach((p,k)=>{const nx=pos[k+1]??l.text.length;const cc=cs.filter(c=>c.p===p);
     html+=`<span class="seg"><span class="ch">${cc.map(c=>`<b data-a="chip" data-l="${i}" data-p="${p}" data-n="${esc(c.n)}">${esc(c.n)}</b>`).join(' ')||' '}</span><span class="ly">${chars(p,nx)||''}</span></span>`});
   html+=`<span class="seg"><span class="ch"> </span><span class="ly"><i data-a="cell" data-l="${i}" data-p="${l.text.length}" class="${S.sel&&S.sel.l===i&&S.sel.p===l.text.length?'sel':''}">＋</i></span></span>`;
   return`<div class="ln">${tools}${html}</div>`}).join('')+`</div>`}
function meta(s){return`<div class="row"><input placeholder="Title" value="${esc(s.title)}" oninput="cur().title=this.value;save()"></div>
 <div class="row"><input placeholder="Original key (e.g. G or Em)" value="${esc(s.key||'')}" oninput="cur().key=this.value;save()" style="flex:1"><input type="number" placeholder="BPM" value="${s.bpm||90}" oninput="setBpm(this.value)" style="width:90px"><button class="d" data-a="delsong">Delete song</button></div>`}
const ROOTS=['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'],QUALS=[['','maj'],['m','m'],['7','7'],['m7','m7'],['maj7','maj7'],['sus4','sus4'],['sus2','sus2'],['add9','add9'],['dim','dim'],['6','6'],['9','9'],['5','5']];
function quick(s){const k=parseChord(s.key||'C')||{r:'C',q:''},r=idx(k.r),minor=/^m(?!aj)/.test(k.q),nm=isFlatKey(s.key||'C',0)?N_FLAT:N_SHARP;
  const d=minor?[[0,'m'],[3,''],[5,'m'],[7,'m'],[8,''],[10,''],[7,'7']]:[[0,''],[2,'m'],[4,'m'],[5,''],[7,''],[9,'m'],[7,'7']];
  return d.map(([i,q])=>nm[(r+i)%12]+q)}
function sheet(){if(!S.sel)return'';const s=cur(),v=S.sel.n||'';const p=parseChord(v)||{r:'',q:'',b:null};
  return`<div class="sheet"><div class="row"><input id="cin" value="${esc(v)}" placeholder="Chord e.g. G/B" style="flex:1;font-size:20px" oninput="S.sel.n=this.value"><button class="p" data-a="place">${S.sel.has?'Update':'Place'}</button>${S.sel.has?'<button class="d" data-a="remchord">Remove</button>':''}<button data-a="closesel">✕</button></div>
  <div class="row">${quick(s).map(c=>`<button data-a="setc" data-n="${c}">${c}</button>`).join('')}</div>
  <div class="g">${ROOTS.map(r=>`<button data-a="root" data-r="${r}" class="${p.r===r?'on':''}">${r}</button>`).join('')}</div>
  <div class="g">${QUALS.map(([q,l])=>`<button data-a="qual" data-q="${q}" class="${p.q===q?'on':''}">${l}</button>`).join('')}</div>
  <div class="row">Bass: <select id="bsel" onchange="setBass(this.value)"><option value="">none</option>${ROOTS.map(r=>`<option ${p.b===r?'selected':''}>${r}</option>`).join('')}</select></div></div>`}
function setSelChord(r,q,b){const p=parseChord(S.sel.n||'')||{r:'C',q:'',b:null};const n=(r??p.r)+(q??p.q)+((b===undefined?p.b:b)?'/'+(b===undefined?p.b:b):'');S.sel.n=n;render()}
window.setBass=v=>setSelChord(null,null,v||null);
function mut(f){const s=cur();const L=lines(s);f(L);s.body=L.map(ser).join('\n');save();render()}
// ---------- backup ----------
function backupView(){return`<header><button data-a="back">‹</button><h1>Backup / Restore</h1></header><div class="wrap">
 <p>Copy this text to save all songs (send it to yourself). Paste into the box and tap Import to restore.</p>
 <textarea id="bk" style="height:45vh;font-family:monospace;font-size:11px">${esc(JSON.stringify(S.songs))}</textarea>
 <div class="row"><button class="p" data-a="bkcopy">Copy</button><button data-a="bkimport">Import (replace all)</button><input type="file" id="bkf" accept=".json,.txt" style="flex:1"></div>
 <div class="row"><button class="d" data-a="reset">Reset to original songs</button></div></div>`}
// ---------- events ----------
document.addEventListener('click',async e=>{const t=e.target.closest('[data-a]');if(!t)return;const a=t.dataset.a,d=t.dataset,s=cur();
 if(a==='open')location.hash='#/song/'+encodeURIComponent(d.id);
 else if(a==='back'){if(S.edit){S.edit=false;render()}else location.hash='#/'}
 else if(a==='new'){const id='u'+Date.now();S.songs.push({id,title:'New song',key:'G',bpm:90,body:'[G]Type lyrics here'});save();location.hash='#/song/'+id;setTimeout(()=>{S.edit=true;render()},50)}
 else if(a==='backup')location.hash='#/backup';
 else if(a==='edit'){S.edit=!S.edit;S.sel=null;S.raw=false;Met.stop();render()}
 else if(a==='tr'){S.t=(S.t+ +d.d+12)%12;if(S.t>6)S.t-=12;render()}
 else if(a==='trreset'){S.t=0;render()}
 else if(a==='trperm'){if(confirm('Save this key as the song\'s new original key?')){const f=keyFlat();s.body=lines(s).map(l=>{if(l.chords)l.chords.forEach(c=>c.n=tr(c.n,S.t,f));return ser(l)}).join('\n');s.key=tr(s.key||'C',S.t,f);S.t=0;save();render()}}
 else if(a==='inst'){S.inst=d.v;save();render()}
 else if(a==='tab'){S.tab=d.v;render()}
 else if(a==='fs'){S.size=Math.max(12,Math.min(32,S.size+ +d.d*2));save();render()}
 else if(a==='pop'){if(d.c){S.popup=d.c;render()}}
 else if(a==='closepop'){S.popup=null;render()}
 else if(a==='met'){Met.on?Met.stop():Met.start();render()}
 else if(a==='bpm')setBpm(S.bpm+ +d.d);
 else if(a==='tap')Met.tap();
 else if(a==='raw'){S.raw=!S.raw;render()}
 else if(a==='cell'){const l=+d.l,p=+d.p;S.sel={l,p,n:'',has:false};render();}
 else if(a==='chip'){e.stopPropagation();S.sel={l:+d.l,p:+d.p,n:d.n,has:true,old:d.n};render()}
 else if(a==='setc'){S.sel.n=d.n;render()}
 else if(a==='root')setSelChord(d.r,null);
 else if(a==='qual')setSelChord(null,d.q);
 else if(a==='place'){const n=($('#cin').value||'').trim();if(!n)return;const {l,p,old}=S.sel;S.sel=null;mut(L=>{const ln=L[l];ln.chords=ln.chords.filter(c=>!(c.p===p&&(old?c.n===old:false)));ln.chords.push({p,n})})}
 else if(a==='remchord'){const {l,p,old}=S.sel;S.sel=null;mut(L=>{L[l].chords=L[l].chords.filter(c=>!(c.p===p&&c.n===old))})}
 else if(a==='closesel'){S.sel=null;render()}
 else if(a==='editl'){const i=+d.i;mut(L=>{const ln=L[i];const v=prompt('Edit line text (chords stay at their positions)',ln.cm!==undefined?ln.cm:ln.text);if(v===null)return;if(ln.cm!==undefined)ln.cm=v;else{ln.text=v;ln.chords.forEach(c=>c.p=Math.min(c.p,v.length))}})}
 else if(a==='addl'){const i=+d.i;mut(L=>L.splice(i+1,0,{text:'',chords:[]}));}
 else if(a==='dell'){if(confirm('Delete this line?'))mut(L=>L.splice(+d.i,1))}
 else if(a==='delsong'){if(confirm('Delete this whole song?')){S.songs=S.songs.filter(x=>x.id!==S.id);save();location.hash='#/'}}
 else if(a==='bkcopy'){const b=$('#bk');b.select();try{await navigator.clipboard.writeText(b.value)}catch(e){document.execCommand('copy')}alert('Copied')}
 else if(a==='bkimport'){try{const j=JSON.parse($('#bk').value);if(!Array.isArray(j))throw 0;if(confirm('Replace all songs with this backup?')){S.songs=j;save();location.hash='#/'}}catch(e){alert('Not a valid backup')}}
 else if(a==='reset'){if(confirm('Delete ALL your edits and restore the original list?')){localStorage.removeItem('cc_songs');S.songs=[];await load();location.hash='#/'}}
});
document.addEventListener('change',e=>{if(e.target.id==='bkf'){const r=new FileReader();r.onload=()=>{$('#bk').value=r.result};r.readAsText(e.target.files[0])}});
function bindSong(){if(S.edit&&S.sel){const i=$('#cin');}}
load();
