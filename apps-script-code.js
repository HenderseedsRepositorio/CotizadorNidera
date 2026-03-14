const SPREADSHEET_ID = '1vFYnqndbN3ya3_aZMu4qozXMMlJtcqtrdtKLm-PK9Ew';

function doGet(e) {
  var action = e.parameter.action;
  if (action === 'getCatalogo') return jsonResponse(getCatalogo());
  if (action === 'getNextNumber') return jsonResponse({ numero: getNextQuoteNumber() });
  if (action === 'getCondiciones') return jsonResponse(getCondiciones());
  if (action === 'getHistorial') return jsonResponse(getHistorial());
  return jsonResponse({ error: 'Acción no reconocida' });
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    if (data.action === 'registrar') {
      var numero = registrarCotizacion(data);
      return jsonResponse({ ok: true, numero: numero });
    }
    return jsonResponse({ error: 'Acción no reconocida' });
  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getCatalogo() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName('Catalogo');
  var data = sheet.getDataRange().getValues();
  var catalogo = { maiz: [], girasol: [] };
  for (var i = 1; i < data.length; i++) {
    var tipo = data[i][0], id = data[i][1], b1 = data[i][2], b2 = data[i][3], b3 = data[i][4];
    if (!tipo || !id) continue;
    var item = { id: String(id).trim(), b1: Number(b1) || 0, b2: Number(b2) || null, b3: Number(b3) || null };
    var key = String(tipo).trim().toLowerCase();
    if (key === 'maiz' || key === 'maíz') catalogo.maiz.push(item);
    else if (key === 'girasol') catalogo.girasol.push(item);
  }
  return catalogo;
}

function getCondiciones() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName('Condiciones');
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  var result = [];
  for (var i = 1; i < data.length; i++) {
    var moneda = data[i][0], detalle = data[i][1], tna = data[i][2], tea = data[i][3], plazo = data[i][4];
    if (!moneda && !detalle) continue;
    result.push({
      moneda: String(moneda || '').trim(),
      detalle: String(detalle || '').trim(),
      tna: String(tna || '').trim(),
      tea: String(tea || '').trim(),
      plazo: String(plazo || '').trim()
    });
  }
  return result;
}

// Devuelve las últimas 100 filas de Cotizaciones (sin encabezado)
function getHistorial() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName('Cotizaciones');
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];
  
  // Traer últimas 100 filas como máximo
  var startRow = Math.max(2, lastRow - 99);
  var numRows = lastRow - startRow + 1;
  var numCols = 19; // N° hasta Total c/IVA
  
  var range = sheet.getRange(startRow, 1, numRows, numCols);
  var values = range.getValues();
  
  return values;
}

function getNextQuoteNumber() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName('Cotizaciones');
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return 1;
  var lastNumber = sheet.getRange(lastRow, 1).getValue();
  return (Number(lastNumber) || 0) + 1;
}

// UNA FILA POR ÍTEM
// N° | Fecha | Vendedor | Cliente | CUIT | Híbrido | Banda | Cant | Precio Neto | Band% | Pre-Camp% | Contado% | Crecer% | Cross% | Vol% | Zonal% | Hend% | Total s/IVA | Total c/IVA
function registrarCotizacion(data) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName('Cotizaciones');
  var numero = getNextQuoteNumber();
  var fecha = Utilities.formatDate(new Date(), 'America/Argentina/Buenos_Aires', 'dd/MM/yyyy HH:mm');

  var items = data.items || [];

  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    sheet.appendRow([
      numero,
      fecha,
      data.vendedor || '—',
      data.cliente || '—',
      data.cuit || '—',
      item.hibrido || '',
      'B' + (item.banda || 1),
      item.cant || 0,
      item.precioNeto || 0,
      item.bandPct || 0,
      item.pPre || 0,
      item.pCont || 0,
      item.pCre || 0,
      item.pCro || 0,
      item.pVol || 0,
      item.valZ || 0,
      item.valP || 0,
      item.totalSIVA || 0,
      item.totalCIVA || 0
    ]);
  }

  return numero;
}
