/**
 * BACKEND GOOGLE APPS SCRIPT PARA CONTROL DE USUARIOS, PORTALES, COBRANZAS Y SEGUIMIENTO DE REFERIDORES
 *
 * Hoja de cálculo asociada ("Control de usuario"):
 * https://docs.google.com/spreadsheets/d/1vaAwo19vbNoi-gBpIG8sNpBcsHSnXPlApenRh7iWOfI/edit
 */

var SPREADSHEET_ID = '1vaAwo19vbNoi-gBpIG8sNpBcsHSnXPlApenRh7iWOfI';
var SHEET_USUARIOS = 'Control de usuario';
var SHEET_USUARIOS_ALT = 'Usuarios';
var SHEET_PORTALES = 'Portales';

function getSpreadsheet() {
  try {
    var active = SpreadsheetApp.getActiveSpreadsheet();
    if (active) return active;
  } catch (e) {}
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

/**
 * Obtiene todas las hojas de usuarios válidas (tanto "Control de usuario", "Usuarios" o la primera hoja gid=0)
 * para garantizar que UltimoLogin y los cambios se reflejen siempre en la hoja visible.
 */
function getHojasUsuarios(ss) {
  var sheets = ss.getSheets();
  var matched = [];
  var namesToMatch = ['control de usuario', 'control de usuarios', 'usuarios', 'usuario', 'hoja 1', 'sheet1'];

  for (var i = 0; i < sheets.length; i++) {
    var s = sheets[i];
    var sName = String(s.getName() || '').trim().toLowerCase();
    if (sName === 'portales' || sName === 'seguimiento_referidores') continue;

    var firstCell = '';
    try {
      if (s.getLastRow() > 0) {
        firstCell = String(s.getRange(1, 1).getValue() || '').trim().toLowerCase();
      }
    } catch (e) {}

    if (namesToMatch.indexOf(sName) !== -1 || firstCell === 'usuario' || firstCell === 'user' || i === 0) {
      matched.push(s);
    }
  }

  if (matched.length === 0 && sheets.length > 0) {
    matched.push(sheets[0]);
  }
  return matched;
}

/**
 * Inicializa las hojas si están completamente vacías
 */
function inicializarBaseDeDatos() {
  var ss = getSpreadsheet();
  var userSheets = getHojasUsuarios(ss);
  var sheetUsers = userSheets[0];

  if (!sheetUsers) {
    sheetUsers = ss.insertSheet(SHEET_USUARIOS);
  }

  if (sheetUsers.getLastRow() === 0) {
    sheetUsers.appendRow(['Usuario', 'Password', 'Rol', 'Portales', 'Estado', 'UltimoLogin']);
    sheetUsers.getRange('A1:F1').setFontWeight('bold').setBackground('#0f172a').setFontColor('#ffffff');
    sheetUsers.appendRow(['admin', 'admin123', 'admin', '*', 'Activo', new Date().toLocaleString()]);
    sheetUsers.appendRow(['operador', '123456', 'operador', 'sigma,mundial,xtracash', 'Activo', new Date().toLocaleString()]);
    sheetUsers.appendRow(['agente01', 'xtracash2026', 'operador', 'xtracash,sigma,mundial', 'Activo', new Date().toLocaleString()]);
  }

  var sheetPortales = ss.getSheetByName(SHEET_PORTALES);
  if (!sheetPortales) {
    sheetPortales = ss.insertSheet(SHEET_PORTALES);
    sheetPortales.appendRow(['Id', 'Nombre', 'Descripcion', 'Icono', 'Color', 'Ruta', 'Estado', 'ColorSecundario', 'Logo']);
    sheetPortales.getRange('A1:I1').setFontWeight('bold').setBackground('#0f172a').setFontColor('#ffffff');
  }

  if (sheetPortales.getLastRow() <= 1) {
    sheetPortales.appendRow([
      'sigma',
      'Protocolos Sigma',
      'Operaciones, protocolos de atención de citas y procedimientos internos Sigma Solutions.',
      'fa-solid fa-notes-medical',
      '#11684E',
      'SIGMA/sigma.html',
      'Activo',
      '#00A973',
      'https://lh3.googleusercontent.com/d/1Vd75_BEtHC1Xgr7A_QeacthxMkpgGfe9'
    ]);
    sheetPortales.appendRow([
      'mundial',
      'La Mundial de Seguros',
      'Speechs de atención al cliente telefónica y presencial para médicos y asesores comerciales.',
      'fa-solid fa-shield-halved',
      '#0F204C',
      'LMDDS/mundial.html',
      'Activo',
      '#E35205',
      'https://lh3.googleusercontent.com/d/1gAr_ORg0efOPGCupgfM7sPPCr9_Cl_UO'
    ]);
    sheetPortales.appendRow([
      'xtracash',
      'XtraCash Cobranzas',
      'Gestión estratégica de cobranzas para los 150 mayores deudores. Guion paso a paso interactivo, matriz de objeciones y registro de compromisos.',
      'fa-solid fa-hand-holding-dollar',
      '#960018',
      'XTRACASH/xtracash.html',
      'Activo',
      '#C41E3A',
      ''
    ]);
  }

  // Asegurar que agente01 exista en usuarios aunque la hoja ya tuviera filas previas
  var uRows = sheetUsers.getDataRange().getValues();
  var hasAgente01 = false;
  for (var ui = 1; ui < uRows.length; ui++) {
    if (String(uRows[ui][0] || '').trim().toLowerCase() === 'agente01') {
      hasAgente01 = true;
      break;
    }
  }
  if (!hasAgente01) {
    sheetUsers.appendRow(['agente01', 'xtracash2026', 'operador', 'xtracash,sigma,mundial', 'Activo', 'Nunca']);
  }

  // Asegurar que xtracash exista en portales aunque la hoja ya tuviera filas previas
  var pRows = sheetPortales.getDataRange().getValues();
  var hasXtra = false;
  for (var pi = 1; pi < pRows.length; pi++) {
    if (String(pRows[pi][0] || '').trim().toLowerCase() === 'xtracash') {
      hasXtra = true;
      break;
    }
  }
  if (!hasXtra) {
    sheetPortales.appendRow([
      'xtracash',
      'XtraCash Cobranzas',
      'Gestión estratégica de cobranzas para los 150 mayores deudores. Guion paso a paso interactivo, matriz de objeciones y registro de compromisos.',
      'fa-solid fa-hand-holding-dollar',
      '#960018',
      'XTRACASH/xtracash.html',
      'Activo',
      '#C41E3A',
      ''
    ]);
  }

  // Inicializar automáticamente las hojas Clientes, Compromisos_Cobranza y Seguimiento_Referidores
  getHojaClientes(ss);
  getHojaCompromisos(ss);
  getHojaSeguimientoReferidores(ss);

  SpreadsheetApp.flush();
}

/**
 * Manejador GET (Soporta lecturas y también registro directo de UltimoLogin sin bloqueo CORS)
 */
function doGet(e) {
  try {
    var params = (e && e.parameter) ? e.parameter : {};
    var action = params.action || '';

    if (params.payload) {
      try {
        var parsed = JSON.parse(params.payload);
        return procesarAccion(parsed.action || action, parsed);
      } catch (err) {
        return responseJSON({ success: false, error: 'Payload inválido en GET: ' + err.toString() });
      }
    }

    if (action === 'recordLogin' && params.user) {
      return responseJSON(registrarUltimoLogin(params.user));
    }

    if (action === 'login' && params.user) {
      return responseJSON(verificarLogin(params.user, params.pass || ''));
    }

    if (action === 'ping') {
      return responseJSON({ success: true, message: 'API Control de Usuario activa', time: new Date().toLocaleString() });
    }

    if (action === 'getPortales') {
      return responseJSON(obtenerPortales());
    }

    if (action === 'getUsers') {
      return responseJSON(obtenerUsuarios());
    }

    if (action === 'getClientes' || action === 'getClientesLlamadas') {
      return responseJSON(obtenerClientesCobranza());
    }

    if (action === 'getCompromisos') {
      return responseJSON(obtenerCompromisosCobranza(params.gestor, params.cedula));
    }

    if (action === 'getSeguimientoReferidores') {
      return responseJSON(obtenerSeguimientoReferidores(params.referidor));
    }

    return responseJSON({ success: true, message: 'API Control de Usuario operativa.' });
  } catch (err) {
    return responseJSON({ success: false, error: err.toString() });
  }
}

/**
 * Manejador POST
 */
function doPost(e) {
  try {
    var data = {};
    if (e && e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    } else if (e && e.parameter) {
      data = e.parameter;
    }
    return procesarAccion(data.action, data);
  } catch (err) {
    return responseJSON({ success: false, error: err.toString() });
  }
}

function procesarAccion(action, data) {
  switch (action) {
    case 'ping':
      return responseJSON({ success: true, message: 'Conexión activa con Google Sheets', time: new Date().toLocaleString() });

    case 'login':
      return responseJSON(verificarLogin(data.user, data.pass));

    case 'recordLogin':
      return responseJSON(registrarUltimoLogin(data.user));

    case 'getUsers':
      return responseJSON(obtenerUsuarios());

    case 'createUser':
      return responseJSON(crearUsuario(data.user, data.pass, data.role, data.portales));

    case 'deleteUser':
      return responseJSON(eliminarUsuario(data.username || data.user));

    case 'updateUserStatus':
      return responseJSON(cambiarEstadoUsuario(data.user, data.status));

    case 'updateUserPass':
      return responseJSON(cambiarClaveUsuario(data.user, data.newPass));

    case 'updateUserPortales':
      return responseJSON(actualizarPortalesUsuario(data.user, data.portales));

    case 'getPortales':
      return responseJSON(obtenerPortales());

    case 'createPortal':
      return responseJSON(crearPortal(data.portal));

    case 'deletePortal':
      return responseJSON(eliminarPortal(data.portalId));

    case 'togglePortalStatus':
      return responseJSON(cambiarEstadoPortal(data.portalId, data.status));

    case 'updatePortal':
      return responseJSON(actualizarPortal(data.portal));

    case 'saveCompromiso':
      return responseJSON(guardarCompromisoCobranza(data));

    case 'getCompromisos':
      return responseJSON(obtenerCompromisosCobranza(data.gestor, data.cedula));

    case 'getClientes':
    case 'getClientesLlamadas':
      return responseJSON(obtenerClientesCobranza());

    case 'saveSeguimientoReferidor':
      return responseJSON(guardarSeguimientoReferidor(data));

    case 'getSeguimientoReferidores':
      return responseJSON(obtenerSeguimientoReferidores(data.referidor));

    default:
      return responseJSON({ success: false, error: 'Acción no reconocida: ' + action });
  }
}

// ==========================================
// MÉTODOS DE USUARIOS Y REGISTRO DE ÚLTIMO LOGIN
// ==========================================

function registrarUltimoLogin(user) {
  var ss = getSpreadsheet();
  var sheets = getHojasUsuarios(ss);
  var cleanUser = String(user || '').trim().toLowerCase();
  var nowStr = new Date().toLocaleString();
  var updated = false;

  for (var sIdx = 0; sIdx < sheets.length; sIdx++) {
    var sheet = sheets[sIdx];
    var rows = sheet.getDataRange().getValues();
    if (!rows || rows.length === 0) continue;

    var firstCell = String(rows[0][0] || '').trim().toLowerCase();
    var isHeader = (firstCell === 'usuario' || firstCell === 'user' || firstCell === 'username');
    var startIndex = isHeader ? 1 : 0;
    var cols = getUsuariosColumnIndices(isHeader ? rows[0] : null);

    for (var i = startIndex; i < rows.length; i++) {
      var rowUser = String(rows[i][cols.user] || '').trim().toLowerCase();
      if (rowUser === cleanUser) {
        sheet.getRange(i + 1, cols.ultimoLogin + 1).setValue(nowStr);
        updated = true;
      }
    }
  }

  if (updated) {
    SpreadsheetApp.flush();
  }
  return { success: updated, lastLogin: nowStr };
}

function verificarLogin(user, pass) {
  var ss = getSpreadsheet();
  var sheets = getHojasUsuarios(ss);
  var cleanUser = String(user || '').trim().toLowerCase();
  var cleanPass = String(pass || '').trim();
  var nowStr = new Date().toLocaleString();
  var matchedUserObj = null;

  for (var sIdx = 0; sIdx < sheets.length; sIdx++) {
    var sheet = sheets[sIdx];
    var rows = sheet.getDataRange().getValues();
    if (!rows || rows.length === 0) continue;

    var firstCell = String(rows[0][0] || '').trim().toLowerCase();
    var isHeader = (firstCell === 'usuario' || firstCell === 'user' || firstCell === 'username');
    var startIndex = isHeader ? 1 : 0;
    var cols = getUsuariosColumnIndices(isHeader ? rows[0] : null);

    for (var i = startIndex; i < rows.length; i++) {
      var rowUser = String(rows[i][cols.user] || '').trim().toLowerCase();
      var rowPass = String(rows[i][cols.pass] || '').trim();
      var role = rows[i][cols.role] || 'operador';
      var portales = String(rows[i][cols.portales] || '*');
      var estado = rows[i][cols.estado];

      if (rowUser === cleanUser && (rowPass === cleanPass || !cleanPass)) {
        var cleanEstado = String(estado || 'Activo').trim().toLowerCase();
        if (cleanEstado === 'inactivo' || cleanEstado === 'desactivado' || cleanEstado === 'false' || cleanEstado === '0') {
          return { success: false, error: 'Usuario inactivo. Contacte al administrador.' };
        }

        // Guardar inmediatamente el UltimoLogin en la hoja
        sheet.getRange(i + 1, cols.ultimoLogin + 1).setValue(nowStr);

        if (!matchedUserObj) {
          matchedUserObj = {
            username: rows[i][cols.user],
            role: role,
            portales: portales === '*' ? ['*'] : portales.split(',').map(function(s) { return s.trim(); }).filter(Boolean),
            status: 'Activo',
            lastLogin: nowStr
          };
        }
      }
    }
  }

  if (matchedUserObj) {
    SpreadsheetApp.flush();
    return { success: true, user: matchedUserObj };
  }

  return { success: false, error: 'Usuario o contraseña incorrectos.' };
}

function getUsuariosColumnIndices(headers) {
  var indices = { user: 0, pass: 1, role: 2, portales: 3, estado: 4, ultimoLogin: 5 };
  if (!headers || !headers.length) return indices;
  for (var c = 0; c < headers.length; c++) {
    var colName = String(headers[c] || '').trim().toLowerCase().replace(/\s+/g, '');
    if (colName === 'usuario' || colName === 'user' || colName === 'username') indices.user = c;
    else if (colName.indexOf('pass') !== -1 || colName.indexOf('clave') !== -1 || colName.indexOf('contras') !== -1) indices.pass = c;
    else if (colName.indexOf('rol') !== -1 || colName.indexOf('role') !== -1) indices.role = c;
    else if (colName.indexOf('portal') !== -1 || colName.indexOf('acceso') !== -1) indices.portales = c;
    else if (colName.indexOf('estado') !== -1 || colName.indexOf('status') !== -1) indices.estado = c;
    else if (colName.indexOf('login') !== -1 || colName.indexOf('ultimo') !== -1 || colName.indexOf('fecha') !== -1 || colName.indexOf('ingreso') !== -1) indices.ultimoLogin = c;
  }
  return indices;
}

function obtenerUsuarios() {
  var ss = getSpreadsheet();
  var sheets = getHojasUsuarios(ss);
  var sheet = sheets[0];
  if (!sheet) return { success: true, users: [] };
  var rows = sheet.getDataRange().getValues();
  if (!rows || rows.length === 0) return { success: true, users: [] };
  var users = [];

  var firstCell = String(rows[0][0] || '').trim().toLowerCase();
  var isHeader = (firstCell === 'usuario' || firstCell === 'user' || firstCell === 'username');
  var startIndex = isHeader ? 1 : 0;
  var cols = getUsuariosColumnIndices(isHeader ? rows[0] : null);

  for (var i = startIndex; i < rows.length; i++) {
    if (!rows[i][cols.user]) continue;
    users.push({
      user: rows[i][cols.user],
      role: rows[i][cols.role] || 'operador',
      portales: String(rows[i][cols.portales]) === '*' ? ['*'] : String(rows[i][cols.portales] || '').split(',').map(function(s) { return s.trim(); }).filter(Boolean),
      status: rows[i][cols.estado] || 'Activo',
      lastLogin: rows[i][cols.ultimoLogin] ? String(rows[i][cols.ultimoLogin]) : 'Nunca'
    });
  }

  return { success: true, users: users };
}

function crearUsuario(user, pass, role, portales) {
  var ss = getSpreadsheet();
  var sheets = getHojasUsuarios(ss);
  var cleanUser = String(user || '').trim();
  var portalesStr = Array.isArray(portales) ? portales.join(',') : (portales || '*');

  for (var sIdx = 0; sIdx < sheets.length; sIdx++) {
    var sheet = sheets[sIdx];
    var rows = sheet.getDataRange().getValues();
    var exists = false;
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][0]).trim().toLowerCase() === cleanUser.toLowerCase()) {
        exists = true;
        break;
      }
    }
    if (!exists) {
      sheet.appendRow([cleanUser, String(pass).trim(), role || 'operador', portalesStr, 'Activo', 'Nunca']);
    }
  }
  SpreadsheetApp.flush();
  return { success: true, message: 'Usuario creado exitosamente.' };
}

function cambiarEstadoUsuario(user, status) {
  var ss = getSpreadsheet();
  var sheets = getHojasUsuarios(ss);
  var cleanUser = String(user || '').trim().toLowerCase();
  var found = false;

  for (var sIdx = 0; sIdx < sheets.length; sIdx++) {
    var sheet = sheets[sIdx];
    var rows = sheet.getDataRange().getValues();
    if (!rows || !rows.length) continue;
    var cols = getUsuariosColumnIndices(rows[0]);
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][cols.user]).trim().toLowerCase() === cleanUser) {
        sheet.getRange(i + 1, cols.estado + 1).setValue(status);
        found = true;
      }
    }
  }
  SpreadsheetApp.flush();
  return found ? { success: true, message: 'Estado actualizado a ' + status } : { success: false, error: 'Usuario no encontrado.' };
}

function cambiarClaveUsuario(user, newPass) {
  var ss = getSpreadsheet();
  var sheets = getHojasUsuarios(ss);
  var cleanUser = String(user || '').trim().toLowerCase();
  var found = false;

  for (var sIdx = 0; sIdx < sheets.length; sIdx++) {
    var sheet = sheets[sIdx];
    var rows = sheet.getDataRange().getValues();
    if (!rows || !rows.length) continue;
    var cols = getUsuariosColumnIndices(rows[0]);
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][cols.user]).trim().toLowerCase() === cleanUser) {
        sheet.getRange(i + 1, cols.pass + 1).setValue(String(newPass).trim());
        found = true;
      }
    }
  }
  SpreadsheetApp.flush();
  return found ? { success: true, message: 'Contraseña actualizada.' } : { success: false, error: 'Usuario no encontrado.' };
}

function actualizarPortalesUsuario(user, portales) {
  var ss = getSpreadsheet();
  var sheets = getHojasUsuarios(ss);
  var cleanUser = String(user || '').trim().toLowerCase();
  var portalesStr = Array.isArray(portales) ? portales.join(',') : (portales || '*');
  var found = false;

  for (var sIdx = 0; sIdx < sheets.length; sIdx++) {
    var sheet = sheets[sIdx];
    var rows = sheet.getDataRange().getValues();
    if (!rows || !rows.length) continue;
    var cols = getUsuariosColumnIndices(rows[0]);
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][cols.user]).trim().toLowerCase() === cleanUser) {
        sheet.getRange(i + 1, cols.portales + 1).setValue(portalesStr);
        found = true;
      }
    }
  }
  SpreadsheetApp.flush();
  return found ? { success: true, message: 'Permisos actualizados.' } : { success: false, error: 'Usuario no encontrado.' };
}

function eliminarUsuario(username) {
  var ss = getSpreadsheet();
  var sheets = getHojasUsuarios(ss);
  var cleanUser = String(username || '').trim().toLowerCase();
  var found = false;

  for (var sIdx = 0; sIdx < sheets.length; sIdx++) {
    var sheet = sheets[sIdx];
    var rows = sheet.getDataRange().getValues();
    for (var i = rows.length - 1; i >= 1; i--) {
      if (String(rows[i][0]).trim().toLowerCase() === cleanUser) {
        sheet.deleteRow(i + 1);
        found = true;
      }
    }
  }
  SpreadsheetApp.flush();
  return found ? { success: true, message: 'Usuario eliminado.' } : { success: false, error: 'Usuario no encontrado.' };
}

// ==========================================
// MÉTODOS DE PORTALES
// ==========================================

function obtenerPortales() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_PORTALES);
  if (!sheet) return { success: true, portales: [] };
  var rows = sheet.getDataRange().getValues();
  var portales = [];

  var firstCell = String(rows[0][0] || '').trim().toLowerCase();
  var isHeader = (firstCell === 'id' || firstCell === 'portal' || firstCell === 'identificador');
  var startIndex = isHeader ? 1 : 0;

  for (var i = startIndex; i < rows.length; i++) {
    if (!rows[i][0]) continue;
    portales.push({
      id: rows[i][0],
      nombre: rows[i][1],
      descripcion: rows[i][2],
      icono: rows[i][3] || 'fa-solid fa-window-maximize',
      color: rows[i][4] || '#0F204C',
      ruta: rows[i][5],
      estado: rows[i][6] || 'Activo',
      colorSecundario: rows[i][7] || '',
      logo: rows[i][8] || ''
    });
  }

  return { success: true, portales: portales };
}

function crearPortal(portal) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_PORTALES);
  if (!sheet) {
    inicializarBaseDeDatos();
    sheet = ss.getSheetByName(SHEET_PORTALES);
  }
  var rows = sheet.getDataRange().getValues();

  var id = portal.id || ('portal_' + Date.now());
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).toLowerCase() === String(id).toLowerCase()) {
      return actualizarPortal(portal);
    }
  }

  sheet.appendRow([
    id,
    portal.nombre || 'Nuevo Portal',
    portal.descripcion || '',
    portal.icono || 'fa-solid fa-window-maximize',
    portal.color || '#0F204C',
    portal.ruta || (id.toUpperCase() + '/' + id + '.html'),
    portal.estado || 'Activo',
    portal.colorSecundario || '#E35205',
    (portal.logo && portal.logo.length < 45000) ? portal.logo : ''
  ]);
  SpreadsheetApp.flush();
  return { success: true, message: 'Portal registrado con éxito.', portalId: id };
}

function cambiarEstadoPortal(portalId, status) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_PORTALES);
  if (!sheet) return { success: false, error: 'Hoja no encontrada.' };
  var rows = sheet.getDataRange().getValues();
  var cleanId = String(portalId).trim().toLowerCase();

  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).trim().toLowerCase() === cleanId) {
      sheet.getRange(i + 1, 7).setValue(status);
      SpreadsheetApp.flush();
      return { success: true, message: 'Estado del portal actualizado a ' + status };
    }
  }
  return { success: false, error: 'Portal no encontrado.' };
}

function eliminarPortal(portalId) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_PORTALES);
  if (!sheet) return { success: false, error: 'Hoja no encontrada.' };
  var rows = sheet.getDataRange().getValues();
  var cleanId = String(portalId).trim().toLowerCase();

  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).trim().toLowerCase() === cleanId) {
      sheet.deleteRow(i + 1);
      SpreadsheetApp.flush();
      return { success: true, message: 'Portal eliminado.' };
    }
  }
  return { success: false, error: 'Portal no encontrado.' };
}

function actualizarPortal(portal) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_PORTALES);
  if (!sheet) return { success: false, error: 'Hoja no encontrada.' };
  var rows = sheet.getDataRange().getValues();
  var cleanId = String(portal.id).trim().toLowerCase();

  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).trim().toLowerCase() === cleanId) {
      if (portal.nombre) sheet.getRange(i + 1, 2).setValue(portal.nombre);
      if (portal.descripcion) sheet.getRange(i + 1, 3).setValue(portal.descripcion);
      if (portal.icono) sheet.getRange(i + 1, 4).setValue(portal.icono);
      if (portal.color) sheet.getRange(i + 1, 5).setValue(portal.color);
      if (portal.ruta) sheet.getRange(i + 1, 6).setValue(portal.ruta);
      if (portal.estado) sheet.getRange(i + 1, 7).setValue(portal.estado);
      if (portal.colorSecundario) sheet.getRange(i + 1, 8).setValue(portal.colorSecundario);
      if (portal.logo !== undefined && portal.logo.length < 45000) sheet.getRange(i + 1, 9).setValue(portal.logo);
      SpreadsheetApp.flush();
      return { success: true, message: 'Portal actualizado con éxito.' };
    }
  }
  return { success: false, error: 'Portal no encontrado.' };
}

// ==========================================
// MÓDULO COBRANZAS XTRACASH: COMPROMISOS Y CLIENTES
// ==========================================

var SHEET_COMPROMISOS = 'Compromisos_Cobranza';

function getHojaCompromisos(ss) {
  var sheet = ss.getSheetByName(SHEET_COMPROMISOS);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_COMPROMISOS);
    var headers = [
      'ID_Registro',
      'Fecha_Gestion',
      'Hora',
      'Gestor',
      'Cliente',
      'Cedula',
      'Telefono',
      'Producto',
      'Deuda_Total',
      'Resultado',
      'Compromiso',
      'Monto_Compromiso',
      'Fecha_Compromiso',
      'Motivo_Atraso',
      'Observaciones',
      'Estado',
      'Referidor'
    ];
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#960018')
      .setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  } else {
    // Asegurar que la columna Referidor (Col 17 / Q) exista si la hoja fue creada previamente
    var lastCol = sheet.getLastColumn();
    if (lastCol === 16) {
      var h17 = String(sheet.getRange(1, 17).getValue() || '').trim();
      if (!h17) {
        sheet.getRange(1, 17).setValue('Referidor').setFontWeight('bold').setBackground('#960018').setFontColor('#ffffff');
      }
    }
  }
  return sheet;
}

function guardarCompromisoCobranza(data) {
  try {
    var ss = getSpreadsheet();
    var sheet = getHojaCompromisos(ss);
    var now = new Date();
    var idReg = 'XC-' + Utilities.formatDate(now, 'GMT-4', 'yyyyMMdd-HHmmss');
    var fechaStr = data.fecha || Utilities.formatDate(now, 'GMT-4', 'yyyy-MM-dd');
    var horaStr = Utilities.formatDate(now, 'GMT-4', 'HH:mm:ss');

    var row = [
      idReg,
      fechaStr,
      horaStr,
      data.gestor || 'agente01',
      data.cliente || '',
      data.cedula || '',
      data.telefono || '',
      data.producto || 'Xtracash Arys',
      data.deudaTotal || data.morosidad || '',
      data.resultado || 'Contactado',
      data.compromiso || 'No',
      data.montoCompromiso || '',
      data.fechaCompromiso || '',
      data.motivoAtraso || '',
      data.observaciones || '',
      'Registrado',
      data.referidor || ''
    ];

    sheet.appendRow(row);

    // Si existe la hoja "Llamadas", buscar por Cédula para anotar el resultado
    try {
      var sheetLlamadas = ss.getSheetByName('Llamadas');
      if (sheetLlamadas && data.cedula) {
        var cleanCed = String(data.cedula).toUpperCase().replace(/[^A-Z0-9]/g, '');
        var lRows = sheetLlamadas.getDataRange().getValues();
        for (var i = 1; i < lRows.length; i++) {
          var rowCed = String(lRows[i][3] || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); // Col D
          if (rowCed && rowCed === cleanCed) {
            var lastCol = sheetLlamadas.getLastColumn();
            if (lastCol >= 8) {
              sheetLlamadas.getRange(i + 1, 8).setValue(fechaStr);
              sheetLlamadas.getRange(i + 1, 9).setValue(data.resultado);
              sheetLlamadas.getRange(i + 1, 10).setValue(data.compromiso === 'SI' ? ('SI: $' + data.montoCompromiso + ' el ' + data.fechaCompromiso) : 'NO');
              sheetLlamadas.getRange(i + 1, 11).setValue(data.observaciones);
            }
            break;
          }
        }
      }
    } catch (eLlamadas) {}

    SpreadsheetApp.flush();
    return {
      success: true,
      message: 'Compromiso guardado exitosamente en Google Sheets.',
      idRegistro: idReg,
      registro: {
        id: idReg,
        fecha: fechaStr,
        hora: horaStr,
        gestor: data.gestor || 'agente01',
        cliente: data.cliente || '',
        cedula: data.cedula || '',
        telefono: data.telefono || '',
        resultado: data.resultado,
        compromiso: data.compromiso,
        montoCompromiso: data.montoCompromiso,
        fechaCompromiso: data.fechaCompromiso,
        motivoAtraso: data.motivoAtraso,
        observaciones: data.observaciones
      }
    };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

function obtenerCompromisosCobranza(gestorFiltro, cedulaFiltro) {
  try {
    var ss = getSpreadsheet();
    var sheet = getHojaCompromisos(ss);
    var rows = sheet.getDataRange().getValues();
    if (!rows || rows.length <= 1) {
      return { success: true, compromisos: [] };
    }

    var cleanCedFilter = cedulaFiltro ? String(cedulaFiltro).toUpperCase().replace(/[^A-Z0-9]/g, '') : '';
    var list = [];
    var startIndex = rows.length - 1;
    for (var i = startIndex; i >= 1; i--) {
      var r = rows[i];
      var g = String(r[3] || '');
      if (gestorFiltro && gestorFiltro !== '*' && g.toLowerCase() !== gestorFiltro.toLowerCase()) {
        continue;
      }
      if (cleanCedFilter) {
        var rCed = String(r[5] || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (rCed !== cleanCedFilter) continue;
      }
      list.push({
        id: r[0],
        fecha: r[1],
        hora: r[2],
        gestor: r[3],
        cliente: r[4],
        cedula: r[5],
        telefono: r[6],
        producto: r[7],
        deudaTotal: r[8],
        morosidad: r[8],
        resultado: r[9],
        compromiso: r[10],
        montoCompromiso: r[11],
        fechaCompromiso: r[12],
        motivoAtraso: r[13],
        observaciones: r[14],
        estado: r[15],
        referidor: r[16] || ''
      });
      if (list.length >= 300) break;
    }
    return { success: true, compromisos: list };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

var SHEET_CLIENTES = 'Clientes';

function getHojaClientes(ss) {
  var sheet = ss.getSheetByName(SHEET_CLIENTES);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_CLIENTES);
    var headers = ['Nombre', 'Cedula', 'Telefono', 'Producto', 'Deuda_Total', 'Pago_Minimo', 'Referidor'];
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#960018')
      .setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function obtenerClientesCobranza() {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_CLIENTES);
    if (!sheet || sheet.getLastRow() <= 1) {
      var sheetLlamadas = ss.getSheetByName('Llamadas');
      if (sheetLlamadas && sheetLlamadas.getLastRow() > 1) {
        sheet = sheetLlamadas;
      } else {
        sheet = getHojaClientes(ss);
      }
    }

    var rows = sheet.getDataRange().getValues();
    if (!rows || rows.length <= 1) {
      return { success: true, clientes: [], source: sheet.getName() };
    }

    // Detectar columnas inteligentemente por nombre de encabezado
    var headers = rows[0];
    var idx = { nombre: 0, cedula: 1, telefono: 2, producto: 3, morosidad: 4, pagoMinimo: 5, referidor: 6, pagoMinimoBs: -1 };
    for (var c = 0; c < headers.length; c++) {
      var h = String(headers[c] || '').toLowerCase().trim();
      if (h.includes('nombre') || h.includes('cliente')) idx.nombre = c;
      else if (h.includes('cedula') || h.includes('cédula') || h === 'ci') idx.cedula = c;
      else if (h.includes('tel') || h.includes('cel') || h.includes('movil')) idx.telefono = c;
      else if (h.includes('prod')) idx.producto = c;
      else if (h.includes('bs') || h.includes('bolivar') || h.includes('ves')) idx.pagoMinimoBs = c;
      else if (h.includes('min') || h.includes('cuota')) idx.pagoMinimo = c;
      else if (h.includes('moros') || h.includes('deuda') || h.includes('saldo')) idx.morosidad = c;
      else if (h.includes('referid') || h.includes('aliado') || h.includes('canal') || h.includes('ola')) idx.referidor = c;
    }

    function limpiarMonto(val) {
      if (val === undefined || val === null || val === '') return '0';
      if (typeof val === 'number') return String(val);
      var s = String(val).replace(/[^0-9.,-]/g, '').trim();
      if (!s) return '0';
      if (s.indexOf('.') !== -1 && s.indexOf(',') !== -1) {
        if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
          s = s.replace(/\./g, '').replace(',', '.');
        } else {
          s = s.replace(/,/g, '');
        }
      } else if (s.indexOf(',') !== -1) {
        s = s.replace(',', '.');
      }
      return s;
    }

    var clientes = [];
    for (var i = 1; i < rows.length; i++) {
      var r = rows[i];
      var nombre = String(r[idx.nombre] || '').trim();
      var cedula = String(r[idx.cedula] || '').trim();
      var telefono = String(r[idx.telefono] || '').trim();
      var producto = String(r[idx.producto] || 'Xtracash Arys').trim();
      var morosidad = limpiarMonto(r[idx.morosidad]);
      var pagoMinimo = limpiarMonto(r[idx.pagoMinimo]);
      var pagoMinimoBs = idx.pagoMinimoBs >= 0 ? limpiarMonto(r[idx.pagoMinimoBs]) : '0';
      var referidor = (r[idx.referidor] !== undefined && r[idx.referidor] !== null) ? String(r[idx.referidor]).trim() : '';

      if (nombre || cedula || telefono) {
        clientes.push({
          nombre: nombre,
          cedula: cedula,
          telefono: telefono,
          producto: producto || 'Xtracash Arys',
          deudaTotal: morosidad,
          morosidad: morosidad,
          pagoMinimo: pagoMinimo,
          pagoMinimoBs: pagoMinimoBs,
          referidor: referidor,
          ola: referidor
        });
      }
    }
    return { success: true, clientes: clientes, source: sheet.getName() };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

// ==========================================
// MÓDULO SEGUIMIENTO DE REFERIDORES (SEGMENTADOR)
// ==========================================

var SHEET_SEGUIMIENTO_REF = 'Seguimiento_Referidores';

function getHojaSeguimientoReferidores(ss) {
  var sheet = ss.getSheetByName(SHEET_SEGUIMIENTO_REF);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_SEGUIMIENTO_REF);
    var headers = [
      'ID_Registro',
      'Fecha_Creacion',
      'Referidor',
      'Responsable',
      'Estado',
      'Fecha_Hora_Respuesta',
      'Cantidad_Clientes',
      'Pago_Minimo_Total_USD',
      'Observaciones'
    ];
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#2B4C7E')
      .setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function guardarSeguimientoReferidor(data) {
  try {
    var referidor = String(data.referidor || '').trim();
    if (!referidor) {
      return { success: false, error: 'El campo Referidor es obligatorio.' };
    }

    var ss = getSpreadsheet();
    var sheet = getHojaSeguimientoReferidores(ss);
    var now = new Date();
    var idReg = 'REF-' + Utilities.formatDate(now, 'GMT-4', 'yyyyMMdd-HHmmss');
    var fechaCreacion = data.fechaCreacion || Utilities.formatDate(now, 'GMT-4', 'yyyy-MM-dd HH:mm:ss');

    var cantidadClientes = (data.cantidadClientes !== undefined && data.cantidadClientes !== null && data.cantidadClientes !== '')
      ? Number(data.cantidadClientes)
      : '';
    var pagoMinimoUsd = (data.pagoMinimoUsd !== undefined && data.pagoMinimoUsd !== null && data.pagoMinimoUsd !== '')
      ? Number(data.pagoMinimoUsd)
      : '';

    var row = [
      idReg,
      fechaCreacion,
      referidor,
      String(data.responsable || '').trim(),
      String(data.estado || 'Contactado').trim(),
      String(data.fechaRespuesta || '').trim(),
      cantidadClientes,
      pagoMinimoUsd,
      String(data.observaciones || '').trim()
    ];

    sheet.appendRow(row);
    SpreadsheetApp.flush();

    return {
      success: true,
      message: 'Seguimiento de referidor guardado en Google Sheets.',
      idRegistro: idReg,
      registro: {
        id: idReg,
        fechaCreacion: fechaCreacion,
        referidor: referidor,
        responsable: row[3],
        estado: row[4],
        fechaRespuesta: row[5],
        cantidadClientes: cantidadClientes,
        pagoMinimoUsd: pagoMinimoUsd,
        observaciones: row[8]
      }
    };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

function obtenerSeguimientoReferidores(referidorFiltro) {
  try {
    var ss = getSpreadsheet();
    var sheet = getHojaSeguimientoReferidores(ss);
    var rows = sheet.getDataRange().getValues();
    if (!rows || rows.length <= 1) {
      return { success: true, registros: [] };
    }

    var cleanFilter = referidorFiltro ? String(referidorFiltro).trim().toLowerCase() : '';
    var list = [];

    for (var i = rows.length - 1; i >= 1; i--) {
      var r = rows[i];
      var refName = String(r[2] || '').trim();
      if (!refName && !r[0]) continue;
      if (cleanFilter && refName.toLowerCase().indexOf(cleanFilter) === -1) {
        continue;
      }

      var fechaCreacionVal = r[1] instanceof Date
        ? Utilities.formatDate(r[1], 'GMT-4', 'yyyy-MM-dd HH:mm:ss')
        : String(r[1] || '');
      var fechaRespVal = r[5] instanceof Date
        ? Utilities.formatDate(r[5], 'GMT-4', 'yyyy-MM-dd HH:mm')
        : String(r[5] || '');

      list.push({
        id: String(r[0] || ''),
        fechaCreacion: fechaCreacionVal,
        referidor: refName,
        responsable: String(r[3] || ''),
        estado: String(r[4] || ''),
        fechaRespuesta: fechaRespVal,
        cantidadClientes: r[6] === '' ? null : r[6],
        pagoMinimoUsd: r[7] === '' ? null : r[7],
        observaciones: String(r[8] || '')
      });

      if (list.length >= 500) break;
    }

    return { success: true, registros: list };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

function responseJSON(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
