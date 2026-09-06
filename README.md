# Sito matrimonio — Marco & Benedetta

Sito statico (HTML + CSS + JS puro, nessun framework). File del progetto:

- `index.html` — struttura di tutte le pagine
- `styles.css` — tutti gli stili
- `script.js` — tutta la logica (navigazione, form, editor visivo, export Excel)

## Anteprima in locale

Basta aprire `index.html` con doppio click, oppure per un test più affidabile
(consigliato, alcune funzioni del browser si comportano meglio così):

```
npx serve .
```

e aprire l'indirizzo che compare nel terminale.

## Area riservata (export dati)

Non è più raggiungibile dal menu (rimosso di proposito, per non renderla visibile agli invitati).
Si apre solo con l'indirizzo diretto:

`https://[tuo-dominio]/#area-riservata-mb`

Codice di accesso: `sposi2027`

Da lì si possono esportare in Excel le risposte raccolte (RSVP, alloggio, canzoni).

**Nota sulla sicurezza**: questo è un sito statico, senza un vero server — qualsiasi controllo fatto
in JavaScript (compreso questo codice) può in teoria essere aggirato da qualcuno che sa dove guardare
nel codice sorgente. Il codice è "nascosto" tramite hash (non compare in chiaro), e l'indirizzo non è
linkato da nessuna parte del sito, il che rende la pagina praticamente introvabile per un invitato
normale — ma non è una protezione di livello bancario. Per dati davvero sensibili in futuro servirebbe
un vero backend con autenticazione.

## Collegare Google Sheets (raccolta dati condivisa)

Finché non si completa questo passaggio, i form salvano solo nel database
locale di ogni browser (utile per i test, non per raccogliere le risposte
vere degli invitati).

1. Crea **un unico** Google Sheet, con **3 schede** (tab in basso), rinominate
   esattamente così: `RSVP`, `Alloggio`, `Canzoni`.

2. Nella prima riga di ciascuna scheda, scrivi queste intestazioni (una per colonna):

   **RSVP**: `Inviato il` | `Nome` | `Cognome` | `Partecipa` | `Intolleranze` | `Tipo` | `Numero bambini (nucleo)` | `Età bambini (nucleo)`

   **Alloggio**: `Inviato il` | `Nome e cognome` | `Città di provenienza` | `Sistemazione organizzata` | `Numero persone` | `Notti` | `Arrivo` | `Partenza` | `Spostamenti` | `Note`

   **Canzoni**: `Inviato il` | `Nome` | `Titolo` | `Artista` | `Messaggio`

3. Nel foglio: **Estensioni → Apps Script**. Cancella il codice di esempio e incolla:

   ```javascript
   function doPost(e) {
     var data = JSON.parse(e.postData.contents);
     var ss = SpreadsheetApp.getActiveSpreadsheet();
     var sheet = ss.getSheetByName(data.sheet);
     if (!sheet) {
       return ContentService.createTextOutput(JSON.stringify({status: 'error', message: 'Scheda non trovata: ' + data.sheet}))
         .setMimeType(ContentService.MimeType.JSON);
     }
     var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
     data.rows.forEach(function(rowObj) {
       var row = headers.map(function(h) { return rowObj[h] !== undefined ? rowObj[h] : ''; });
       sheet.appendRow(row);
     });
     return ContentService.createTextOutput(JSON.stringify({status: 'ok'}))
       .setMimeType(ContentService.MimeType.JSON);
   }
   ```

4. **Esegui il deployment → Nuovo deployment → tipo: App web.**
   "Chi ha accesso": **Chiunque**. Distribuisci e autorizza l'accesso
   (comparirà un avviso "app non verificata": Avanzate → Vai al progetto,
   è normale, è il tuo stesso foglio).

5. Copia l'URL che Google ti dà (inizia con `https://script.google.com/macros/...`)
   e incollalo in `script.js`, nella costante `SHEET_WEBHOOK_URL` in cima al file:

   ```javascript
   const SHEET_WEBHOOK_URL = 'https://script.google.com/macros/.../exec';
   ```

6. Ricarica il sito e compila un form di prova: la riga deve comparire nel
   foglio Google in pochi secondi.

> Nota: se in futuro modifichi il codice dello script, serve un **nuovo
> deployment** (non basta salvare) perché l'URL si aggiorni.

## Pubblicare online (GitHub + Vercel)

1. Crea un repository su GitHub (anche privato) e carica questi 3 file
   (`index.html`, `styles.css`, `script.js`) — via web (drag & drop dei file
   nella pagina del repo) o via git da terminale.

2. Su [vercel.com](https://vercel.com), **Add New → Project → Import** il
   repository appena creato. Vercel riconosce che è un sito statico e non
   chiede configurazioni aggiuntive: basta confermare il deploy.

3. Da questo momento, ogni volta che aggiorni i file su GitHub (anche solo
   modificando `SHEET_WEBHOOK_URL` una volta collegato Google Sheets),
   Vercel ripubblica il sito automaticamente in pochi secondi.

4. Per il dominio personalizzato: Vercel → progetto → Settings → Domains →
   aggiungi il dominio acquistato e segui le indicazioni per i record DNS.
