// ========================================================================
// GOOGLE APPS SCRIPT — Backend para Cotizador Henderseeds
// ========================================================================
// INSTRUCCIONES DE DEPLOY:
// 1. Ir a https://script.google.com → Nuevo proyecto
// 2. Pegar todo este código en Code.gs
// 3. Crear una Google Sheet con 2 hojas:
//    - Hoja "Catalogo" (precios)
//    - Hoja "Cotizaciones" (registro de cotizaciones)
// 4. Copiar el ID de la Sheet (de la URL)
// 5. Pegarlo en SPREADSHEET_ID abajo
// 6. Deploy → Nueva implementación → Aplicación web
//    - Ejecutar como: Yo
//    - Quién tiene acceso: Cualquier persona
// 7. Copiar la URL del deploy y pegarla en index.html (variable APPS_SCRIPT_URL)
// ========================================================================

const SPREADSHEET_ID = 'PEGAR_TU_SPREADSHEET_ID_AQUI';

// ── Manejo de CORS y requests ────────────────────────────────────────
function doGet(e) {
  const action = e.parameter.action;

  if (action === 'getCatalogo') {
    return jsonResponse(getCatalogo());
  }

  if (action === 'getNextNumber') {
    return jsonResponse({ numero: getNextQuoteNumber() });
  }

  return jsonResponse({ error: 'Acción no reconocida' });
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    if (data.action === 'registrar') {
      const numero = registrarCotizacion(data);
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

// ── Leer catálogo de la hoja "Catalogo" ──────────────────────────────
// Formato esperado de la hoja "Catalogo":
// | tipo    | id               | b1  | b2     | b3     |
// | maiz    | NS7765 Viptera3  | 250 | 240    | 230.4  |
// | girasol | NS1113CL         | 375 | 356.25 |        |
function getCatalogo() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Catalogo');
  const data = sheet.getDataRange().getValues();

  const catalogo = { maiz: [], girasol: [] };

  // Saltar encabezado (fila 0)
  for (let i = 1; i < data.length; i++) {
    const [tipo, id, b1, b2, b3] = data[i];
    if (!tipo || !id) continue;

    const item = {
      id: String(id).trim(),
      b1: Number(b1) || 0,
      b2: Number(b2) || null,
      b3: Number(b3) || null
    };

    const key = String(tipo).trim().toLowerCase();
    if (key === 'maiz' || key === 'maíz') {
      catalogo.maiz.push(item);
    } else if (key === 'girasol') {
      catalogo.girasol.push(item);
    }
  }

  return catalogo;
}

// ── Obtener próximo número de cotización ──────────────────────────────
function getNextQuoteNumber() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Cotizaciones');
  const lastRow = sheet.getLastRow();

  if (lastRow <= 1) return 1; // Solo encabezado

  const lastNumber = sheet.getRange(lastRow, 1).getValue();
  return (Number(lastNumber) || 0) + 1;
}

// ── Registrar cotización ─────────────────────────────────────────────
// Formato de la hoja "Cotizaciones":
// | N° | Fecha | Vendedor | Cliente | CUIT | Híbridos (JSON) | Neto USD | IVA USD | Total USD | Descuentos |
function registrarCotizacion(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Cotizaciones');

  const numero = getNextQuoteNumber();
  const fecha = new Date();
  const fechaStr = Utilities.formatDate(fecha, 'America/Argentina/Buenos_Aires', 'dd/MM/yyyy HH:mm');

  // Resumen de líneas
  const lineasResumen = (data.lineas || []).map(l =>
    `${l.hibrido} B${l.banda} x${l.cant} → $${l.unitNeto}`
  ).join(' | ');

  // Descuentos activos
  const descuentos = [];
  if (data.descuentos) {
    if (data.descuentos.preCampaña) descuentos.push('Pre-Campaña');
    if (data.descuentos.contado) descuentos.push('Contado 8%');
    if (data.descuentos.crecer) descuentos.push('Plan Crecer 2.5%');
    if (data.descuentos.cross) descuentos.push('Cross 5%');
    if (data.descuentos.zonalMaiz) descuentos.push(`Zonal Maíz ${data.descuentos.zonalMaiz}%`);
    if (data.descuentos.zonalGirasol) descuentos.push(`Zonal Girasol ${data.descuentos.zonalGirasol}%`);
    if (data.descuentos.hendMaiz) descuentos.push(`Hend. Maíz ${data.descuentos.hendMaiz}%`);
    if (data.descuentos.hendGirasol) descuentos.push(`Hend. Girasol ${data.descuentos.hendGirasol}%`);
  }

  sheet.appendRow([
    numero,
    fechaStr,
    data.vendedor || '—',
    data.cliente || '—',
    data.cuit || '—',
    lineasResumen,
    data.totalNeto || 0,
    data.totalIVA || 0,
    data.totalFinal || 0,
    descuentos.join(', ')
  ]);

  return numero;
}
