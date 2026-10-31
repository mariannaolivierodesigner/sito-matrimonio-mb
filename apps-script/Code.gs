/**
 * Script Google per il sito di Marco & Benedetta.
 * Fa due cose:
 *  - doPost: salva nel foglio le risposte dei moduli (RSVP, Alloggio, Canzoni), come già fa ora
 *  - doGet:  restituisce i dati alla dashboard dell'area riservata (solo con la password giusta)
 *
 * Come aggiornarlo (una volta sola):
 * 1. Apri il foglio Google > Estensioni > Apps Script, sostituisci tutto il codice con questo.
 * 2. Impostazioni progetto (icona ingranaggio) > Proprietà dello script > Aggiungi proprietà:
 *      nome: ADMIN_PASSWORD     valore: sposi2027   (la stessa password dell'area riservata)
 * 3. Distribuisci > Gestisci distribuzioni > matita (modifica) > Versione: "Nuova versione" > Distribuisci.
 *    (L'indirizzo resta lo stesso, quindi nel sito non si cambia nulla.)
 */
function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(data.sheet);
  if (!sheet) {
    return json_({status: 'error', message: 'Scheda non trovata: ' + data.sheet});
  }
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  data.rows.forEach(function (rowObj) {
    var row = headers.map(function (h) { return rowObj[h] !== undefined ? rowObj[h] : ''; });
    sheet.appendRow(row);
  });
  return json_({status: 'ok'});
}

function doGet(e) {
  var pw = PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD');
  if (!e.parameter || e.parameter.action !== 'read' || !pw || e.parameter.pw !== pw) {
    return json_({error: 'auth'});
  }
  return json_({
    rsvp: read_('RSVP'),
    stay: read_('Alloggio'),
    songs: read_('Canzoni')
  });
}

// Legge una scheda e restituisce una lista di oggetti {intestazione: valore}
function read_(name) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sh || sh.getLastRow() < 2) return [];
  var values = sh.getDataRange().getDisplayValues();
  var head = values[0];
  return values.slice(1)
    .filter(function (r) { return r.join('') !== ''; })
    .map(function (r) {
      var o = {};
      head.forEach(function (h, i) { if (h) o[h] = r[i]; });
      return o;
    });
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
