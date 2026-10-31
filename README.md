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

## Area riservata (dashboard)

Non è raggiungibile dal menu pubblico (di proposito): si apre dal link "Area riservata" in fondo al menu
oppure dall'indirizzo diretto `https://[tuo-dominio]/#area-riservata-mb`.

Codice di accesso: `sposi2027`

Dopo il codice gli sposi vedono la dashboard: conteggi (confermati, bambini, intolleranze, alloggi, canzoni),
le tabelle di RSVP / alloggio / canzoni, i pulsanti per aprire i fogli Google e scaricare i CSV.
I dati vengono letti dal Google Sheet tramite lo script in `apps-script/Code.gs` (vedi le istruzioni in cima al file:
incollare il codice, aggiungere la proprietà `ADMIN_PASSWORD` e fare "Nuova versione" della distribuzione).
Se lo script non è ancora aggiornato la dashboard mostra un avviso e restano disponibili i link ai fogli.

**Nota sulla sicurezza**: il controllo del codice nel sito è fatto in JavaScript; la lettura dei dati dal foglio
è invece protetta dalla password salvata nello script Google (ADMIN_PASSWORD), quindi senza quella password
i dati non vengono restituiti.

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
