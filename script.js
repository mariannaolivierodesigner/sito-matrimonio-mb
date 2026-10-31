/* ============ NAV / ROUTING ============ */
let currentPage = 'home';
function go(id, skipHistory){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-'+id).classList.add('active');
  document.querySelectorAll('nav.links a, .mobile-menu a').forEach(a=>a.classList.toggle('active', a.dataset.p===id));
  closeMobileMenu();
  window.scrollTo({top:0, behavior:'instant' in window ? 'instant' : 'auto'});
  requestAnimationFrame(observeReveals);
  currentPage = id;
  updateNavAppearance();
  if(!skipHistory){
    history.pushState({page:id}, '', '#'+id);
  }
}
window.addEventListener('popstate', (e)=>{
  const id = (e.state && e.state.page) || 'home';
  go(id, true);
});
if(location.hash === '#area-riservata-mb'){
  go('admin', true);
}
function openMobileMenu(){
  document.getElementById('mobileMenu').classList.add('open');
  document.getElementById('menuBackdrop').classList.add('open');
}
function closeMobileMenu(){
  document.getElementById('mobileMenu').classList.remove('open');
  document.getElementById('menuBackdrop').classList.remove('open');
}
document.getElementById('burgerBtn').addEventListener('click', openMobileMenu);
document.getElementById('menuCloseBtn').addEventListener('click', closeMobileMenu);
document.getElementById('menuBackdrop').addEventListener('click', closeMobileMenu);

function updateNavAppearance(){
  const nav = document.getElementById('siteNav');
  const heroEl = document.querySelector('#page-home .hero');
  const heroH = heroEl ? heroEl.offsetHeight : 0;
  const onHero = (currentPage === 'home') && (window.scrollY < heroH - 70);
  nav.classList.toggle('on-hero', onHero);
  nav.classList.toggle('solid', !onHero && window.scrollY > 40);
}
window.addEventListener('scroll', updateNavAppearance);
updateNavAppearance();

/* ============ REVEAL ON SCROLL ============ */
let revealObserver = new IntersectionObserver((entries)=>{
  entries.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('in'); revealObserver.unobserve(e.target); } });
},{threshold:.15});
function observeReveals(){
  document.querySelectorAll('.page.active .reveal:not(.in), .page.active .reveal-img:not(.in)').forEach(el=>{
    revealObserver.observe(el);
    setTimeout(()=>{ el.classList.add('in'); }, 2500);
  });
}
observeReveals();

/* ============ PROGRAMMA: ogni tappa compare mentre si scorre ============ */
(function(){
  const items=[...document.querySelectorAll('#program .day-item')];
  if(!items.length) return;
  if(!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion:reduce)').matches){
    items.forEach(i=>i.classList.add('in')); return;
  }
  const io=new IntersectionObserver((entries)=>{
    entries.filter(e=>e.isIntersecting)
      .sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top)
      .forEach((e,k)=>{ e.target.style.setProperty('--d',(k*0.5)+'s'); e.target.classList.add('in'); io.unobserve(e.target); });
  },{threshold:.35, rootMargin:'0px 0px -6% 0px'});
  items.forEach(i=>io.observe(i));
})();

/* ============ COUNTDOWN ============ */
const WEDDING_DATE = new Date('2027-08-28T16:30:00+02:00');
(function(){
  const ids=['cd-d','cd-h','cd-m','cd-s'],els=ids.map(i=>document.getElementById(i));
  if(!els[0])return;
  let last=[];
  function tick(){
    let ms=WEDDING_DATE-new Date();if(ms<0)ms=0;
    const s=Math.floor(ms/1000),v=[Math.floor(s/86400),Math.floor(s%86400/3600),Math.floor(s%3600/60),s%60];
    v.forEach((n,i)=>{const t=i===0?String(n):String(n).padStart(2,'0');if(last[i]!==t){els[i].textContent=t;if(last[i]!==undefined){els[i].classList.remove('tick');void els[i].offsetWidth;els[i].classList.add('tick')}last[i]=t}});
  }
  tick();setInterval(tick,1000);
})();

/* ============ COLLEGAMENTO A GOOGLE SHEETS ============
   Un solo foglio Google, con 3 schede (RSVP / Alloggio / Canzoni) e un solo
   Web App di Google Apps Script che smista i dati nella scheda giusta.
   Quando avremo l'URL del Web App, va incollato qui tra le virgolette.
   Finché è vuoto, il sito continua a funzionare normalmente (salva solo
   nel database di Claude / locale). */
const SHEET_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbwbMAEbk4TWpf-aImZXrLmRrEXTXZCRNAiMrAt7f_SH1fLh90Nre4I4XYQknQjcVkGJ/exec';
const SHEET_TAB_NAMES = { rsvp: 'RSVP', stay: 'Alloggio', song: 'Canzoni' };
async function sendToSheet(type, rows){
  if(!SHEET_WEBHOOK_URL) return {ok:false, reason:'Nessun link Google Sheet configurato.'};
  try{
    const res = await fetch(SHEET_WEBHOOK_URL, {
      method: 'POST',
      headers: {'Content-Type': 'text/plain;charset=utf-8'},
      body: JSON.stringify({ sheet: SHEET_TAB_NAMES[type], rows: rows })
    });
    let data = null;
    try{ data = await res.json(); }catch(e){}
    if(res.ok && data && data.status === 'ok'){
      return {ok:true};
    }
    return {ok:false, reason:'Risposta inattesa da Google (status '+res.status+').', data};
  }catch(e){
    return {ok:false, reason:'Richiesta non riuscita: '+e.message};
  }
}
function buildRsvpRows(record){
  const rows = [];
  (record.ospiti||[]).forEach((g,i)=>{
    rows.push({
      'Inviato il': record.inviati_il,
      'Nome': g.nome, 'Cognome': g.cognome, 'Partecipa': g.partecipa,
      'Intolleranze': g.intolleranze,
      'Tipo': i===0 ? 'Ospite principale' : 'Partecipante aggiuntivo',
      'Numero bambini (nucleo)': i===0 ? record.numero_bambini : '',
      'Età bambini (nucleo)': i===0 ? (record.eta_bambini||[]).join(', ') : '',
      'Numero bambini': i===0 ? record.numero_bambini : '',
      'Età bambini': i===0 ? (record.eta_bambini||[]).join(', ') : ''
    });
  });
  return rows;
}
function buildStayRows(r){
  return [{
    'Inviato il': r.inviato_il, 'Nome e cognome': r.nome_cognome, 'Email': r.email, 'Città di provenienza': r.citta,
    'Sistemazione organizzata': r.sistemazione_organizzata, 'Numero persone': r.numero_persone,
    'Notti': r.notti, 'Arrivo': r.arrivo, 'Partenza': r.partenza, 'Spostamenti': r.spostamenti, 'Note': r.note
  }];
}
function buildSongRows(r){
  return [{
    'Inviato il': r.inviato_il, 'Nome': r.nome, 'Titolo': r.titolo, 'Artista': r.artista, 'Messaggio': r.messaggio
  }];
}


/* ============ STORAGE HELPERS ============
   Se il sito gira dentro Claude (claude.ai) usa il database persistente
   window.storage. Se invece il file viene aperto da solo (in locale o su
   un hosting esterno) e window.storage non esiste, passa in automatico
   al localStorage del browser, così il sito funziona comunque per i test. */
const hasClaudeStorage = (typeof window.storage !== 'undefined' && window.storage !== null);
const localDB = {
  set(key, value){ localStorage.setItem('wedding_'+key, value); return Promise.resolve({key, value}); },
  get(key){
    const v = localStorage.getItem('wedding_'+key);
    if(v===null) return Promise.reject(new Error('not found'));
    return Promise.resolve({key, value:v});
  },
  list(prefix){
    const keys = Object.keys(localStorage).filter(k=>k.startsWith('wedding_'+prefix)).map(k=>k.replace('wedding_',''));
    return Promise.resolve({keys});
  }
};
const db = hasClaudeStorage ? window.storage : localDB;
console.log(hasClaudeStorage ? 'Database: Claude (condiviso tra tutti gli invitati)' : 'Database: salvataggio locale in questo browser (modalità test)');

async function saveRecord(prefix, data){
  const key = prefix+':'+Date.now()+'-'+Math.random().toString(36).slice(2,8);
  await db.set(key, JSON.stringify(data), true);
  return key;
}
async function listRecords(prefix){
  try{
    const res = await db.list(prefix+':', true);
    if(!res || !res.keys) return [];
    const out=[];
    for(const k of res.keys){
      try{
        const r = await db.get(k, true);
        if(r && r.value) out.push(JSON.parse(r.value));
      }catch(e){}
    }
    return out;
  }catch(e){ return []; }
}

/* ============ MODAL ============ */
function openModal(title, text){
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalText').textContent = text;
  document.getElementById('modalOverlay').classList.add('open');
}
function closeModal(){ document.getElementById('modalOverlay').classList.remove('open'); }

/* ============ RSVP FORM ============ */
let guestIdx = 1;
document.getElementById('addGuestBtn').addEventListener('click', ()=>{
  const wrap = document.getElementById('extraGuests');
  const block = document.createElement('div');
  block.className='guest-block';
  block.dataset.idx = guestIdx;
  block.innerHTML = `
    <button type="button" class="remove-guest" onclick="this.parentElement.remove()">Rimuovi</button>
    <div class="subhead-row"><h4>Partecipante aggiuntivo</h4></div>
    <div class="field"><label>Nome</label><input type="text" class="g-nome" required></div>
    <div class="field"><label>Cognome</label><input type="text" class="g-cognome" required></div>
    <div class="field">
      <label>Confermi la partecipazione?</label>
      <div class="radio-row">
        <label class="pill-choice"><input type="radio" name="g-conf-${guestIdx}" value="Sì" required> Sì, ci sarà</label>
        <label class="pill-choice"><input type="radio" name="g-conf-${guestIdx}" value="No"> Non potrà esserci</label>
      </div>
    </div>
    <div class="field"><label>Intolleranze o allergie alimentari</label><input type="text" class="g-intoll" placeholder="Es. nessuna, glutine, lattosio…"></div>
  `;
  wrap.appendChild(block);
  guestIdx++;
});

document.getElementById('childCount').addEventListener('input', (e)=>{
  const n = Math.max(0, Math.min(12, parseInt(e.target.value)||0));
  const field = document.getElementById('childAgesField');
  const wrap = document.getElementById('childAges');
  wrap.innerHTML='';
  if(n>0){
    field.style.display='block';
    for(let i=1;i<=n;i++){
      const inp = document.createElement('input');
      inp.type='number'; inp.min='0'; inp.max='17'; inp.placeholder='Età '+i; inp.className='child-age';
      wrap.appendChild(inp);
    }
  } else { field.style.display='none'; }
});

document.getElementById('rsvpForm').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true;
  const statusEl = document.getElementById('rsvpStatus');
  try{
    const blocks = [document.querySelector('#rsvpForm')].concat([...document.querySelectorAll('#extraGuests .guest-block')]);
    const guests = [];
    document.querySelectorAll('.g-nome').forEach((el,i)=>{
      const scope = el.closest('#extraGuests .guest-block') || el.closest('form');
      const nome = el.value;
      const cognome = scope.querySelector('.g-cognome').value;
      const confInput = scope.querySelector('input[type=radio]:checked');
      const conf = confInput ? confInput.value : '';
      const intoll = scope.querySelector('.g-intoll').value || 'Nessuna';
      guests.push({nome, cognome, partecipa:conf, intolleranze:intoll});
    });
    const childCount = parseInt(document.getElementById('childCount').value)||0;
    const ages = [...document.querySelectorAll('.child-age')].map(i=>i.value||'n.d.');
    const record = {inviati_il: new Date().toLocaleString('it-IT'), ospiti:guests, numero_bambini:childCount, eta_bambini:ages};
    await saveRecord('rsvp', record);
    const sheetResult = await sendToSheet('rsvp', buildRsvpRows(record));
    document.getElementById('rsvpForm').reset();
    document.getElementById('extraGuests').innerHTML='';
    document.getElementById('childAgesField').style.display='none';
    const anySi=guests.some(g=>g.partecipa==='Sì');
    openModal("Grazie", anySi ? "Siamo felicissimi di sapere che ci sarete." : "Abbiamo ricevuto la tua risposta. Grazie per avercelo fatto sapere.");
    statusEl.textContent = sheetResult.ok ? '' : ('Salvato, ma non inviato al Google Sheet: '+sheetResult.reason);
  }catch(err){
    statusEl.textContent = 'Non è stato possibile salvare la risposta. Riprova tra poco.';
  }
  btn.disabled=false;
});

/* ============ ACCOMMODATION FORM ============ */
document.getElementById('stayForm').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true;
  const statusEl = document.getElementById('stayStatus');
  try{
    const org = document.querySelector('input[name=st-org]:checked');
    const people = document.querySelector('input[name=st-people]:checked');
    const nights = document.querySelector('input[name=st-nights]:checked');
    const transport = document.querySelector('input[name=st-transport]:checked');
    const record = {
      inviato_il: new Date().toLocaleString('it-IT'),
      nome_cognome: document.getElementById('st-name').value,
      email: document.getElementById('st-email').value,
      citta: document.getElementById('st-city').value,
      sistemazione_organizzata: org ? org.value : '',
      numero_persone: people ? people.value : '',
      notti: nights ? nights.value : '',
      arrivo: document.getElementById('st-arrival').value,
      partenza: document.getElementById('st-departure').value,
      spostamenti: transport ? transport.value : '',
      note: document.getElementById('st-notes').value
    };
    await saveRecord('stay', record);
    const sheetResult = await sendToSheet('stay', buildStayRows(record));
    document.getElementById('stayForm').reset();
    openModal('Richiesta ricevuta!', 'Grazie per averci comunicato le tue esigenze: ti aggiorneremo appena avremo le soluzioni migliori per il tuo soggiorno.');
    statusEl.textContent = sheetResult.ok ? '' : ('Salvato, ma non inviato al Google Sheet: '+sheetResult.reason);
  }catch(err){
    statusEl.textContent = 'Non è stato possibile inviare la richiesta. Riprova tra poco.';
  }
  btn.disabled=false;
});

/* ============ SONG FORM ============ */
async function updateSongCounter(){
  const el = document.getElementById('songCounterNote');
  if(!el) return;
  const songs = await listRecords('song');
  el.textContent = songs.length>0 ? songs.length+' canzoni scelte finora dagli invitati' : '';
}

document.getElementById('songForm').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true;
  const statusEl = document.getElementById('songStatus');
  try{
    const record = {
      inviato_il: new Date().toLocaleString('it-IT'),
      _t: Date.now(),
      nome: document.getElementById('s-name').value,
      titolo: document.getElementById('s-title').value,
      artista: document.getElementById('s-artist').value,
      messaggio: document.getElementById('s-message').value
    };
    await saveRecord('song', record);
    const sheetResult = await sendToSheet('song', buildSongRows(record));
    document.getElementById('songForm').reset();
    openModal('Grazie', 'La tua canzone è arrivata: la terremo in considerazione per la festa.');
    statusEl.textContent = sheetResult.ok ? '' : ('Salvato, ma non inviato al Google Sheet: '+sheetResult.reason);
    updateSongCounter();
  }catch(err){
    statusEl.textContent = 'Non è stato possibile salvare la canzone. Riprova tra poco.';
  }
  btn.disabled=false;
});
updateSongCounter();

/* ============ ADMIN ============ */
const ADMIN_CODE_HASH = '2b45742045267f2b33a36cda1052dc01cad50fa1f9f1d5a4bde63487adf38058';
async function sha256Hex(text){
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
}
async function checkAdmin(){
  const code = document.getElementById('adminCode').value;
  const hash = await sha256Hex(code);
  if(hash === ADMIN_CODE_HASH){
    document.getElementById('adminGate').style.display='none';
    document.getElementById('adminPanel').style.display='block';
    refreshCounts();
  } else {
    document.getElementById('adminCode').style.borderColor = '#c0605a';
  }
}
async function refreshCounts(){
  /* i contatori locali non sono più mostrati: i dati veri sono nel Google Sheet */
}
async function exportData(type){
  const statusEl = document.getElementById('adminStatus');
  statusEl.textContent = 'Preparazione del file in corso…';
  try{
    const records = await listRecords(type);
    if(records.length===0){ statusEl.textContent='Nessun dato ancora disponibile per questa esportazione.'; return; }
    let rows = [];
    if(type==='rsvp'){
      records.forEach(r=>{ rows.push(...buildRsvpRows(r)); });
    } else if(type==='stay'){
      records.forEach(r=>{ rows.push(...buildStayRows(r)); });
    } else if(type==='song'){
      records.forEach(r=>{ rows.push(...buildSongRows(r)); });
    }
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, type);
    XLSX.writeFile(wb, 'matrimonio_'+type+'_'+Date.now()+'.xlsx');
    statusEl.textContent = 'File scaricato correttamente.';
  }catch(err){
    statusEl.textContent = "Errore durante l'esportazione. Riprova.";
  }
}

/* ============ MUSICA ============ */
const audio=new Audio();audio.loop=true;audio.volume=.55;audio.preload="none";
let fadeT=null;
function fadeMusic(){
  clearInterval(fadeT);
  fadeT=setInterval(()=>{if(audio.volume>.03){audio.volume=Math.max(0,audio.volume-.03)}else{clearInterval(fadeT);audio.pause()}},220);
}
async function playMusic(){
  clearInterval(fadeT);
  if(!audio.src||audio.src===location.href){audio.src="assets/colonna-sonora.mp3"}
  audio.currentTime=0;audio.volume=.55;
  try{await audio.play()}catch(e){return}
}

/* ============ BUSTA ============ */
(function(){
const $=s=>document.querySelector(s);
const reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
const intro=$("#intro"),seal=$("#seal"),evVid=$("#evVid"),evCv=$("#evCv"),evCard2=$("#evCard2"),evStage=$("#evStage"),evIdle=$("#evIdle");
const IW=1422,IH=1055,SEALP={x:716,y:620,r:130};
const VW=1366,VH=768,VB={x:184,w:1000,cy:385.5},VC={x:234,y:59,w:898,h:661},VS={x:679.5,y:440.5,r:76};
let opened=false,gl=null,gtex=null,cardUp=false,envOff=false,vLoop=0;
function layoutEnv(){
  const W=innerWidth,H=innerHeight,ratio=IW/IH,FLAP=.74;
  const Hs=Math.min(H,(screen.availHeight||screen.height||H)),tall=H>Hs+80;
  const R0=tall?H-Hs-40:0,RH=tall?Hs:H,ar=W/RH;
  const ew=Math.min(W*(ar<=1?.88:ar<=1.5?.8:.62),(RH-40)/(1+FLAP)*ratio);
  const eh=ew/ratio,left=(W-ew)/2,top=R0+(RH-eh)/2+(ar>1?0:RH*.01);
  evIdle.style.cssText=`left:${left}px;top:${top}px;width:${ew}px;height:${eh}px`;
  const kv=ew/VB.w,cl=left-VB.x*kv,ct=top+eh/2-VB.cy*kv;
  evCv.style.cssText=`left:${cl}px;top:${ct}px;width:${VW*kv}px;height:${VH*kv}px`;
  const dpr=Math.min(devicePixelRatio||1,2),cw=Math.min(VW,Math.round(VW*kv*dpr)),ch=Math.round(cw*VH/VW);
  if(evCv.width!==cw){evCv.width=cw;evCv.height=ch;drawV()}
  const zmin=Math.max(1,W*1.1/(VW*kv),H*1.06/(VH*kv)),zmax=Math.min(.86*H/(VC.h*kv),.98*W/(VC.w*kv)),zz=Math.max(1,Math.min(zmin,zmax));
  evStage.style.setProperty("--evz",zz);evStage.style.transformOrigin=(cl+683*kv)+"px "+(ct+385*kv)+"px";
  evCard2.style.left=(cl+VC.x*kv)+"px";evCard2.style.top=(ct+VC.y*kv)+"px";evCard2.style.width=(VC.w*kv)+"px";evCard2.style.height=(VC.h*kv)+"px";
  seal.style.left=(cl+VS.x*kv)+"px";seal.style.top=(ct+VS.y*kv)+"px";seal.style.width=seal.style.height=(VS.r*2*kv)+"px";
  const et=$("#envText");
  if(et){
    const cx=W/2,Y=f=>top+f*eh,t=et.children;
    t[0].style.cssText=`left:${cx}px;top:${Y(.105)}px;font-size:${Math.max(12,24*ew/986)}px`;
    t[2].style.cssText=`left:${cx}px;top:${Y(.915)}px;font-size:${Math.max(12,22*ew/986)}px`;
    t[1].style.fontSize="100px";t[1].style.left=cx+"px";t[1].style.top=Y(.2)+"px";
    const w=t[1].scrollWidth||1;t[1].style.fontSize=(100*ew*.44/w)+"px";
  }
}
function glInit(){
  try{gl=evCv.getContext("webgl",{premultipliedAlpha:true,alpha:true,antialias:false});}catch(e){gl=null}
  if(!gl)return false;
  const sh=(t,c)=>{const x=gl.createShader(t);gl.shaderSource(x,c);gl.compileShader(x);return x};
  const pr=gl.createProgram();
  gl.attachShader(pr,sh(gl.VERTEX_SHADER,"attribute vec2 p;varying vec2 u;void main(){u=vec2(p.x*.5+.5,.5-p.y*.5);gl_Position=vec4(p,0.,1.);}"));
  gl.attachShader(pr,sh(gl.FRAGMENT_SHADER,"precision mediump float;varying vec2 u;uniform sampler2D t;void main(){vec3 c=texture2D(t,vec2(u.x,u.y*.5)).rgb;float a=texture2D(t,vec2(u.x,.5+u.y*.5)).r;gl_FragColor=vec4(c*a,a);}"));
  gl.linkProgram(pr);gl.useProgram(pr);
  const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
  const l=gl.getAttribLocation(pr,"p");gl.enableVertexAttribArray(l);gl.vertexAttribPointer(l,2,gl.FLOAT,false,0,0);
  gtex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,gtex);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  return true;
}
function drawV(){
  if(!gl||evVid.readyState<2)return false;
  try{gl.viewport(0,0,evCv.width,evCv.height);gl.bindTexture(gl.TEXTURE_2D,gtex);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,evVid);
    gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);return true}catch(e){return false}
}
try{fetch("env_open.mp4").then(r=>{if(!r.ok)throw 0;return r.blob()}).then(b=>{evVid.src=URL.createObjectURL(b);try{evVid.load()}catch(e){}}).catch(()=>{evVid.src="env_open.mp4"})}catch(e){evVid.src="env_open.mp4"}
function riseCard(){if(cardUp)return;cardUp=true;try{evCard2.style.transition="none";evCard2.style.opacity=0;evCard2.style.transform="none";void evCard2.offsetWidth;evCard2.style.transition="opacity .2s linear";evCard2.style.opacity=1}catch(e){}}
function vTick(){drawV();if(evVid.currentTime>=1.5)riseCard();if(evVid.currentTime>=2.1&&!envOff){envOff=true;evCv.style.transition="opacity .3s ease";evCv.style.opacity=0}if(evVid.currentTime>=2.7&&window.__go2early)window.__go2early();if(!evVid.ended&&!evVid.paused){vLoop=requestAnimationFrame(vTick)}}
layoutEnv();intro.classList.add("laid");setTimeout(()=>intro.classList.add("laid"),900);addEventListener("resize",layoutEnv);
try{document.fonts.load("100px 'Pinyon Script'").then(layoutEnv);document.fonts.ready.then(layoutEnv)}catch(e){}
function finishIntro(){
  try{const hv=document.querySelector(".hero-video");hv.currentTime=0;hv.play()}catch(e){}
  intro.hidden=true;document.body.classList.remove("lock");document.body.classList.add("opened");window.scrollTo(0,0);$("#replay").hidden=false;
}
function replayIntro(){
  try{go("home")}catch(e){}
  $("#replay").hidden=true;opened=false;
  intro.classList.remove("opening","leaving","vready","vfall");seal.classList.remove("pressed");
  cardUp=false;envOff=false;
  try{evCv.style.transition="";evCv.style.opacity="";evStage.classList.remove("zoom");evCard2.style.transition="";evCard2.style.transform="";evCard2.style.opacity=0;evVid.pause();evVid.currentTime=0;setTimeout(drawV,60)}catch(e){}
  intro.hidden=false;document.body.classList.add("lock");document.body.classList.remove("opened");
  window.scrollTo(0,0);
}
$("#replay").addEventListener("click",replayIntro);
function openEnvelope(){
  if(opened)return;opened=true;
  intro.classList.add("opening");seal.classList.add("pressed");
  playMusic();
  if(reduce){finishIntro();return}
  const hc=document.querySelector(".hero-inv");let finished=false,started=false;window.__go2early=()=>go2();
  const go2=()=>{
    if(finished)return;finished=true;
    try{evCard2.style.transition="opacity .45s ease";evCard2.style.opacity=1}catch(e){}
    setTimeout(()=>{
      try{const cr=evCard2.getBoundingClientRect(),hr=hc.getBoundingClientRect(),z=evStage.classList.contains("zoom")?(parseFloat(evStage.style.getPropertyValue("--evz"))||1):1;
        if(hr.width>0&&cr.width>0){evCard2.style.transition="transform 1.25s cubic-bezier(.45,0,.2,1)";
          evCard2.style.transform="translate("+(((hr.left+hr.width/2)-(cr.left+cr.width/2))/z)+"px,"+((hr.bottom-cr.bottom)/z)+"px) scale("+(hr.width/cr.width)+")"}}catch(e){}
      intro.classList.add("leaving");setTimeout(finishIntro,1400)},420);
  };
  const fallbackV=()=>{if(started)return;started=true;try{evVid.pause()}catch(e){};intro.classList.add("vfall");setTimeout(go2,700)};
  const start=()=>{
    if(started)return;started=true;
    if(!gl&&!glInit()){started=false;fallbackV();return}
    if(!drawV()){started=false;fallbackV();return}
    intro.classList.add("vready");
    setTimeout(()=>evStage.classList.add("zoom"),900);
    vTick();
  };
  evVid.addEventListener("ended",go2,{once:true});
  let pr;try{pr=evVid.play()}catch(e){pr=null}
  if(pr&&pr.then)pr.then(()=>{const t0=performance.now();(function w(){if(started)return;if(evVid.readyState>=2)start();else if(performance.now()-t0>2500)fallbackV();else requestAnimationFrame(w)})()}).catch(fallbackV);
  else fallbackV();
}
seal.addEventListener("click",openEnvelope);intro.addEventListener("click",openEnvelope);
})();

/* ===== Fiori che si disegnano scorrendo ===== */
(function(){
  var D=[].slice.call(document.querySelectorAll(".mag.dr"));
  if(!D.length)return;
  var red=window.matchMedia&&matchMedia("(prefers-reduced-motion:reduce)").matches;
  D.forEach(function(sv){[].forEach.call(sv.querySelectorAll("path"),function(p){if(!p.closest(".mf"))p.setAttribute("pathLength","1")})});
  function setP(sv,p){
    var k=sv._k||(sv._k=[].slice.call(sv.querySelectorAll("path")).filter(function(e){return !e.closest(".mf")})),n=k.length;
    for(var i=0;i<n;i++){var a=i/n*.7,v=Math.max(0,Math.min(1,(p-a)/.3));k[i].style.strokeDashoffset=(1-v).toFixed(3)}
    var f=sv.querySelector(".mf");if(f)f.style.opacity=Math.max(0,Math.min(1,(p-.8)/.2))
  }
  var tk=0;
  function upd(){
    tk=0;var more=0,vh=innerHeight,now=performance.now();
    D.forEach(function(sv){
      var r=sv.getBoundingClientRect();
      if(!r.height){sv._t0=0;sv._max=0;return}
      if(red){setP(sv,1);return}
      var vis=r.top<vh*.95&&r.bottom>0;
      var ps=Math.max(0,Math.min(1,(vh*.98-r.top)/(vh*.5)));
      if(vis&&!sv._t0)sv._t0=now;
      var pt=sv._t0?(now-sv._t0-250)/2600:0;
      var p=Math.max(0,Math.min(ps,pt));
      if(sv._max===undefined)sv._max=0;
      p=Math.max(p,Math.min(sv._max,1));sv._max=p;
      if(p<1&&sv._t0)more=1;
      setP(sv,p)
    });
    if(more)requestAnimationFrame(upd)
  }
  function q(){if(!tk){tk=1;requestAnimationFrame(upd)}}
  addEventListener("scroll",q,true);addEventListener("resize",q);setInterval(q,350);upd();
})();
