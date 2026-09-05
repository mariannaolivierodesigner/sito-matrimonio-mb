/* ============ NAV / ROUTING ============ */
function go(id){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-'+id).classList.add('active');
  document.querySelectorAll('nav.links a, .mobile-menu a').forEach(a=>a.classList.toggle('active', a.dataset.p===id));
  closeMobileMenu();
  window.scrollTo({top:0, behavior:'instant' in window ? 'instant' : 'auto'});
  requestAnimationFrame(observeReveals);
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
window.addEventListener('scroll', ()=>{
  document.getElementById('siteNav').classList.toggle('solid', window.scrollY>40);
  const y = window.scrollY;
  if(y < window.innerHeight){
    const activeSlide = document.querySelector('.slide.active');
    if(activeSlide) activeSlide.style.transform = 'translateY('+(y*0.35)+'px)';
    const mono = document.querySelector('.slide.active .logo-mono');
    if(mono) mono.style.transform = 'translateY('+(y*0.15)+'px)';
    const hc = document.querySelector('.hero-content');
    if(hc){ hc.style.transform = 'translateY('+(y*0.15)+'px)'; hc.style.opacity = Math.max(0, 1-(y/500)); }
  }
});

/* ============ REVEAL ON SCROLL ============ */
let revealObserver = new IntersectionObserver((entries)=>{
  entries.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('in'); revealObserver.unobserve(e.target); } });
},{threshold:.15});
function observeReveals(){
  document.querySelectorAll('.page.active .reveal:not(.in)').forEach(el=>revealObserver.observe(el));
}
observeReveals();

/* ============ HERO SLIDER ============ */
const slides = document.querySelectorAll('.slide');
const dotsWrap = document.getElementById('slideDots');
slides.forEach((s,i)=>{
  const d = document.createElement('button');
  if(i===0) d.classList.add('active');
  d.addEventListener('click', ()=>setSlide(i));
  dotsWrap.appendChild(d);
});
let curSlide=0;
function setSlide(i){
  slides[curSlide].classList.remove('active');
  dotsWrap.children[curSlide].classList.remove('active');
  curSlide=i;
  slides[curSlide].classList.add('active');
  dotsWrap.children[curSlide].classList.add('active');
}
setInterval(()=>setSlide((curSlide+1)%slides.length), 5000);

/* ============ COUNTDOWN ============ */
const WEDDING_DATE = new Date('2027-08-28T16:30:00');

/* ============ COLLEGAMENTO A GOOGLE SHEETS ============
   Un solo foglio Google, con 3 schede (RSVP / Alloggio / Canzoni) e un solo
   Web App di Google Apps Script che smista i dati nella scheda giusta.
   Quando avremo l'URL del Web App, va incollato qui tra le virgolette.
   Finché è vuoto, il sito continua a funzionare normalmente (salva solo
   nel database di Claude / locale). */
const SHEET_WEBHOOK_URL = '';
const SHEET_TAB_NAMES = { rsvp: 'RSVP', stay: 'Alloggio', song: 'Canzoni' };
function sendToSheet(type, rows){
  if(!SHEET_WEBHOOK_URL) return; // non ancora collegato: nessuna azione
  try{
    fetch(SHEET_WEBHOOK_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: {'Content-Type': 'text/plain'},
      body: JSON.stringify({ sheet: SHEET_TAB_NAMES[type], rows: rows })
    });
  }catch(e){
    console.log('Invio al Google Sheet non riuscito (il sito continua a funzionare normalmente):', e);
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
      'Età bambini (nucleo)': i===0 ? (record.eta_bambini||[]).join(', ') : ''
    });
  });
  return rows;
}
function buildStayRows(r){
  return [{
    'Inviato il': r.inviato_il, 'Nome e cognome': r.nome_cognome, 'Città di provenienza': r.citta,
    'Sistemazione organizzata': r.sistemazione_organizzata, 'Numero persone': r.numero_persone,
    'Notti': r.notti, 'Arrivo': r.arrivo, 'Partenza': r.partenza, 'Spostamenti': r.spostamenti, 'Note': r.note
  }];
}
function buildSongRows(r){
  return [{
    'Inviato il': r.inviato_il, 'Nome': r.nome, 'Titolo': r.titolo, 'Artista': r.artista, 'Messaggio': r.messaggio
  }];
}
function updateCountdown(){
  const now = new Date();
  let diff = WEDDING_DATE - now;
  if(diff<0) diff=0;
  const d = Math.floor(diff/86400000);
  const h = Math.floor(diff%86400000/3600000);
  const m = Math.floor(diff%3600000/60000);
  const s = Math.floor(diff%60000/1000);
  setDigit('cd-d', d);
  setDigit('cd-h', String(h).padStart(2,'0'));
  setDigit('cd-m', String(m).padStart(2,'0'));
  setDigit('cd-s', String(s).padStart(2,'0'));
}
function setDigit(id, val){
  const el = document.getElementById(id);
  if(el.textContent !== String(val)){
    el.textContent = val;
    el.classList.remove('tick'); void el.offsetWidth; el.classList.add('tick');
  }
}
updateCountdown();
setInterval(updateCountdown,1000);

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

/* ============ VISUAL EDITOR ============ */
const FONT_PAIRS = [
  {heading:'Fraunces', body:'Work Sans', label:'Fraunces & Work Sans', sub:'Elegante — il font attuale'},
  {heading:'Cormorant Garamond', body:'Jost', label:'Cormorant Garamond & Jost', sub:'Classico e sottile'},
  {heading:'Playfair Display', body:'Karla', label:'Playfair Display & Karla', sub:'Editoriale, alto contrasto'},
  {heading:'EB Garamond', body:'Montserrat', label:'EB Garamond & Montserrat', sub:'Raffinato e tradizionale'},
  {heading:'Libre Caslon Display', body:'Inter', label:'Libre Caslon Display & Inter', sub:'Moderno e deciso'},
  {heading:'Bodoni Moda', body:'Manrope', label:'Bodoni Moda & Manrope', sub:'Luxury, alta moda'},
];
let siteConfig = {colors:{}, fonts:{}, texts:{}, images:{}};
let editModeOn = false;
const loadedFontFamilies = new Set(['Fraunces','Work Sans']);

async function getSiteConfig(){
  try{
    const r = await db.get('siteconfig', true);
    if(r && r.value) return JSON.parse(r.value);
  }catch(e){}
  return {colors:{}, fonts:{}, texts:{}, images:{}};
}
async function saveSiteConfig(){
  try{
    await db.set('siteconfig', JSON.stringify(siteConfig), true);
    flashSaveStatus('Salvato ✓');
  }catch(e){
    flashSaveStatus('Errore nel salvataggio');
  }
}
function flashSaveStatus(msg){
  const el = document.getElementById('editSaveStatus');
  if(!el) return;
  el.textContent = msg;
  setTimeout(()=>{ el.textContent = 'Modifiche salvate automaticamente'; }, 1800);
}
function loadGoogleFont(family){
  if(loadedFontFamilies.has(family)) return;
  loadedFontFamilies.add(family);
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family='+family.replace(/ /g,'+')+':ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap';
  document.head.appendChild(link);
}
function applySiteConfig(cfg){
  siteConfig = cfg;
  Object.entries(cfg.colors||{}).forEach(([k,v])=>{ document.documentElement.style.setProperty(k, v); });
  if(cfg.fonts && cfg.fonts.heading){
    loadGoogleFont(cfg.fonts.heading);
    loadGoogleFont(cfg.fonts.body);
    document.documentElement.style.setProperty('--font-heading', "'"+cfg.fonts.heading+"'");
    document.documentElement.style.setProperty('--font-body', "'"+cfg.fonts.body+"'");
  }
  Object.entries(cfg.texts||{}).forEach(([key,html])=>{
    const el = document.querySelector('[data-edit="'+key+'"]');
    if(el) el.innerHTML = html;
  });
  Object.entries(cfg.images||{}).forEach(([key,dataUrl])=>{ applyImageToTarget(key, dataUrl); });
}
function getImgTarget(container){
  const art = container.querySelector('.art');
  if(art) return art;
  const ph = container.querySelector('.art-ph');
  if(ph) return ph;
  return container;
}
function applyImageToTarget(key, dataUrl){
  const container = document.querySelector('[data-edit-img="'+key+'"]');
  if(!container) return;
  const target = getImgTarget(container);
  target.style.backgroundImage = "url('"+dataUrl+"')";
  target.style.backgroundSize = 'cover';
  target.style.backgroundPosition = 'center';
  container.classList.add('has-custom-img');
}
function removeImageFromTarget(key){
  const container = document.querySelector('[data-edit-img="'+key+'"]');
  if(container){
    const target = getImgTarget(container);
    target.style.backgroundImage = '';
    container.classList.remove('has-custom-img');
  }
  if(siteConfig.images) delete siteConfig.images[key];
  saveSiteConfig();
}
function initEditableImages(){
  document.querySelectorAll('[data-edit-img]').forEach(container=>{
    if(container.querySelector('.img-edit-btn')) return;
    const key = container.getAttribute('data-edit-img');
    const btn = document.createElement('button');
    btn.type='button'; btn.className='img-edit-btn'; btn.textContent='Cambia immagine';
    const removeBtn = document.createElement('button');
    removeBtn.type='button'; removeBtn.className='img-edit-remove'; removeBtn.textContent='×';
    const input = document.createElement('input');
    input.type='file'; input.accept='image/*'; input.style.display='none';
    btn.addEventListener('click', (e)=>{ e.stopPropagation(); e.preventDefault(); input.click(); });
    removeBtn.addEventListener('click', (e)=>{ e.stopPropagation(); e.preventDefault(); removeImageFromTarget(key); });
    input.addEventListener('change', ()=>{
      const file = input.files[0];
      if(!file) return;
      const reader = new FileReader();
      reader.onload = ()=>{
        siteConfig.images = siteConfig.images || {};
        siteConfig.images[key] = reader.result;
        applyImageToTarget(key, reader.result);
        saveSiteConfig();
      };
      reader.readAsDataURL(file);
    });
    container.appendChild(btn);
    container.appendChild(removeBtn);
    container.appendChild(input);
  });
}
function initEditableTexts(){
  document.querySelectorAll('[data-edit]').forEach(el=>{
    if(el.dataset.editBound) return;
    el.dataset.editBound = '1';
    el.addEventListener('blur', ()=>{
      if(!editModeOn) return;
      const key = el.getAttribute('data-edit');
      siteConfig.texts = siteConfig.texts || {};
      siteConfig.texts[key] = el.innerHTML;
      saveSiteConfig();
    });
  });
}
function toggleEditMode(){
  editModeOn = !editModeOn;
  document.body.classList.toggle('site-edit-mode', editModeOn);
  document.getElementById('editDock').classList.toggle('open', editModeOn);
  const statusEl = document.getElementById('editModeStatus');
  const btnEl = document.getElementById('toggleEditBtn');
  if(statusEl) statusEl.textContent = editModeOn ? 'Attiva' : 'Disattiva';
  if(btnEl) btnEl.textContent = editModeOn ? 'Disattiva' : 'Attiva';
  document.querySelectorAll('[data-edit]').forEach(el=>{
    el.setAttribute('contenteditable', editModeOn ? 'true' : 'false');
  });
}
function openColorPanel(){
  const getV = (v)=>{ const c = getComputedStyle(document.documentElement).getPropertyValue(v).trim(); return c.startsWith('#') ? c : '#ffffff'; };
  document.getElementById('pickBg').value = getV('--bg');
  document.getElementById('pickInk').value = getV('--ink');
  document.getElementById('pickBlue').value = getV('--accent');
  document.getElementById('pickBlueDeep').value = getV('--accent-deep');
  document.getElementById('pickSage').value = getV('--sage');
  document.getElementById('pickGold').value = getV('--gold');
  document.getElementById('colorPanelOverlay').classList.add('open');
}
function closePanels(){
  document.getElementById('colorPanelOverlay').classList.remove('open');
  document.getElementById('fontPanelOverlay').classList.remove('open');
}
['pickBg','pickInk','pickBlue','pickBlueDeep','pickSage','pickGold'].forEach(id=>{
  const el = document.getElementById(id);
  if(!el) return;
  el.addEventListener('input', ()=>{
    const varName = el.getAttribute('data-var');
    document.documentElement.style.setProperty(varName, el.value);
    siteConfig.colors = siteConfig.colors || {};
    siteConfig.colors[varName] = el.value;
    saveSiteConfig();
  });
});
function openFontPanel(){
  const wrap = document.getElementById('fontOptions');
  wrap.innerHTML = '';
  FONT_PAIRS.forEach(fp=>{
    const div = document.createElement('div');
    div.className = 'font-option' + (siteConfig.fonts && siteConfig.fonts.heading===fp.heading ? ' selected' : '');
    div.innerHTML = '<div class="fo-title" style="font-family:\''+fp.heading+'\',serif;">'+fp.label+'</div><div class="fo-sub">'+fp.sub+'</div>';
    div.addEventListener('click', ()=>{
      siteConfig.fonts = {heading:fp.heading, body:fp.body};
      applySiteConfig(siteConfig);
      saveSiteConfig();
      openFontPanel();
    });
    wrap.appendChild(div);
  });
  document.getElementById('fontPanelOverlay').classList.add('open');
}
async function resetSiteConfig(){
  if(!confirm('Vuoi davvero ripristinare il design originale? Tutte le personalizzazioni salvate andranno perse.')) return;
  siteConfig = {colors:{}, fonts:{}, texts:{}, images:{}};
  await saveSiteConfig();
  location.reload();
}
(async function initEditor(){
  const cfg = await getSiteConfig();
  applySiteConfig(cfg);
  initEditableImages();
  initEditableTexts();
})();

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
      const scope = el.closest('form') || el.closest('.guest-block');
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
    sendToSheet('rsvp', buildRsvpRows(record));
    document.getElementById('rsvpForm').reset();
    document.getElementById('extraGuests').innerHTML='';
    document.getElementById('childAgesField').style.display='none';
    openModal("Grazie", "Abbiamo ricevuto la tua conferma.");
    statusEl.textContent='';
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
    sendToSheet('stay', buildStayRows(record));
    document.getElementById('stayForm').reset();
    openModal('Richiesta ricevuta!', 'Grazie per averci comunicato le tue esigenze: ti aggiorneremo appena avremo le soluzioni migliori per il tuo soggiorno.');
    statusEl.textContent='';
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
    sendToSheet('song', buildSongRows(record));
    document.getElementById('songForm').reset();
    openModal('Grazie', 'La tua canzone è arrivata: la terremo in considerazione per la festa.');
    statusEl.textContent='';
    updateSongCounter();
  }catch(err){
    statusEl.textContent = 'Non è stato possibile salvare la canzone. Riprova tra poco.';
  }
  btn.disabled=false;
});
updateSongCounter();

/* ============ ADMIN ============ */
function checkAdmin(){
  const code = document.getElementById('adminCode').value;
  if(code === 'sposi2027'){
    document.getElementById('adminGate').style.display='none';
    document.getElementById('adminPanel').style.display='block';
    refreshCounts();
  } else {
    document.getElementById('adminCode').style.borderColor = '#c0605a';
  }
}
async function refreshCounts(){
  document.getElementById('rsvpCount').textContent = (await listRecords('rsvp')).length + ' risposte';
  document.getElementById('stayCount').textContent = (await listRecords('stay')).length + ' richieste';
  document.getElementById('songCount').textContent = (await listRecords('song')).length + ' canzoni';
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
