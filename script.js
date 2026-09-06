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
  document.querySelectorAll('.page.active .reveal:not(.in)').forEach(el=>revealObserver.observe(el));
}
observeReveals();

/* ============ COUNTDOWN ============ */
const WEDDING_DATE = new Date('2027-08-28T16:30:00');

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
    const sheetResult = await sendToSheet('rsvp', buildRsvpRows(record));
    document.getElementById('rsvpForm').reset();
    document.getElementById('extraGuests').innerHTML='';
    document.getElementById('childAgesField').style.display='none';
    openModal("Grazie", "Abbiamo ricevuto la tua conferma.");
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
