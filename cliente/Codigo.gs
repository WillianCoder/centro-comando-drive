/* =====================================================================
   CENTRO DE COMANDO — lado do CLIENTE
   Fica dentro da planilha-modelo. Quando o cliente faz "Fazer uma cópia",
   este código vai junto. Nada aqui usa IA: tudo roda no Google dele.
   ===================================================================== */

// >>> Cole aqui o endereço do seu Servidor de Licenças (passo 3 do guia) <<<
var SERVIDOR_URL = 'COLE_AQUI_O_LINK_DO_SERVIDOR';

var NOME_PRODUTO = 'Centro de Comando';
var DIAS_SEM_INTERNET = 7;      // quantos dias o painel abre sem falar com o servidor
var PEDACO = 45000;             // tamanho máximo de texto por célula do banco
var ABA_BANCO = '_banco';
var ABA_FONTES = 'Fontes';
var ABA_INICIO = 'Início';

/* ---------- Menu ---------- */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('⚙ ' + NOME_PRODUTO)
    .addItem('▶ Abrir painel', 'ccAbrir')
    .addItem('🔑 Ativar licença', 'ccAtivar')
    .addSeparator()
    .addItem('🔄 Baixar versão nova do painel', 'ccAtualizar')
    .addItem('ℹ Situação da licença', 'ccSituacao')
    .addToUi();
}

function onInstall() { onOpen(); }

/* ---------- Ações do menu ---------- */
function ccAtivar() {
  var ui = SpreadsheetApp.getUi();
  var r = ui.prompt('Ativar ' + NOME_PRODUTO, 'Digite a chave de licença que você recebeu (ex.: CC-ABCD-EFGH-JKLM):', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  var chave = normalizarChave_(r.getResponseText());
  if (!chave) { ui.alert('Chave vazia.'); return; }
  var resp = falarServidor_({ acao: 'ativar', chave: chave });
  if (!resp.ok) { ui.alert('Não foi possível ativar', resp.msg || 'Confira a chave e tente de novo.', ui.ButtonSet.OK); return; }
  var p = props_();
  p.setProperty('LIC_CHAVE', chave);
  marcarOk_(resp);
  prepararPlanilha_();
  ui.alert('Licença ativada ✅', 'Pronto! Agora use o menu "' + NOME_PRODUTO + ' → Abrir painel".', ui.ButtonSet.OK);
}

function ccAbrir() {
  var saida = montarSaida_();
  SpreadsheetApp.getUi().showModalDialog(saida.setWidth(1500).setHeight(880), NOME_PRODUTO);
}

function ccAtualizar() {
  props_().deleteProperty('VERSAO_LOCAL');
  var r = obterPainel_();
  SpreadsheetApp.getUi().alert(r.html ? 'Painel atualizado para a versão ' + (props_().getProperty('VERSAO_LOCAL') || '?') + '.' : (r.msg || 'Não foi possível atualizar agora.'));
}

function ccSituacao() {
  var p = props_();
  var chave = p.getProperty('LIC_CHAVE');
  var ok = Number(p.getProperty('LIC_OK_EM') || 0);
  SpreadsheetApp.getUi().alert('Situação da licença',
    'Chave: ' + (chave ? chave.slice(0, 7) + '••••' : 'não ativada') +
    '\nSituação: ' + (p.getProperty('LIC_STATUS') || '—') +
    '\nÚltima confirmação: ' + (ok ? new Date(ok).toLocaleString('pt-BR') : 'nunca') +
    '\nVersão do painel: ' + (p.getProperty('VERSAO_LOCAL') || '—'),
    SpreadsheetApp.getUi().ButtonSet.OK);
}

/* Também funciona como "app da Web" (Implantar → App da Web), para abrir em tela cheia. */
function doGet() {
  return montarSaida_().setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/* ---------- Montagem da página ---------- */
function montarSaida_() {
  var r = obterPainel_();
  if (!r.html) return HtmlService.createHtmlOutput(paginaAviso_(r.titulo || 'Painel indisponível', r.msg || '')).setTitle(NOME_PRODUTO);
  var ponte = HtmlService.createHtmlOutputFromFile('Ponte').getContent();
  var html = aplicarFontes_(r.html);
  var i = html.search(/<head[^>]*>/i);
  if (i >= 0) {
    var fim = html.indexOf('>', i) + 1;
    html = html.slice(0, fim) + ponte + html.slice(fim);
  } else {
    html = ponte + html;
  }
  // Abas escondidas / personalizadas definidas pelo vendedor
  var extras = props_().getProperty('EXTRAS') || '{}';
  var bloco = '<script>window.CC_EXTRAS=' + extras.replace(/</g, '\\u003c') + ';</' + 'script>' +
    HtmlService.createHtmlOutputFromFile('Extras').getContent();
  var f = html.lastIndexOf('</body>');
  html = f >= 0 ? html.slice(0, f) + bloco + html.slice(f) : html + bloco;
  return HtmlService.createHtmlOutput(html)
    .setTitle(NOME_PRODUTO)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function paginaAviso_(titulo, msg) {
  var e = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  return '<div style="font:16px system-ui,sans-serif;max-width:520px;margin:40px auto;padding:24px;border:2px solid #e0553f;border-radius:12px">' +
    '<h2 style="margin-top:0">' + e(titulo) + '</h2><p>' + e(msg) + '</p>' +
    '<p style="color:#666">Use o menu <b>⚙ ' + e(NOME_PRODUTO) + '</b> na planilha. Se precisar, fale com quem te vendeu o painel.</p></div>';
}

/* ---------- Licença ---------- */
function obterPainel_() {
  var p = props_();
  var chave = p.getProperty('LIC_CHAVE');
  if (!chave) return { titulo: 'Licença não ativada', msg: 'Vá no menu ⚙ ' + NOME_PRODUTO + ' → Ativar licença e digite a sua chave.' };

  var resp = falarServidor_({ acao: 'checar', chave: chave });
  if (resp.semConexao) {
    var ok = Number(p.getProperty('LIC_OK_EM') || 0);
    var cache = lerCache_();
    if (ok && Date.now() - ok < DIAS_SEM_INTERNET * 864e5 && cache) return { html: cache };
    return { titulo: 'Sem conexão com o servidor', msg: 'Não foi possível confirmar a licença. Tente de novo em alguns minutos.' };
  }
  if (resp.ok) p.setProperty('EXTRAS', JSON.stringify(resp.extras || {}));
  if (!resp.ok) {
    p.setProperty('LIC_STATUS', resp.status || 'Bloqueada');
    return { titulo: 'Licença ' + String(resp.status || 'inválida').toLowerCase(), msg: resp.msg || 'Esta licença não está ativa.' };
  }
  marcarOk_(resp);

  var local = p.getProperty('VERSAO_LOCAL');
  var cache2 = lerCache_();
  if (cache2 && local && String(local) === String(resp.versao)) return { html: cache2 };

  var b = falarServidor_({ acao: 'baixar', chave: chave });
  if (!b.ok || !b.html) {
    if (cache2) return { html: cache2 };
    return { titulo: 'Não foi possível baixar o painel', msg: b.msg || 'Tente de novo em alguns minutos.' };
  }
  gravarCache_(b.html);
  p.setProperty('VERSAO_LOCAL', String(b.versao));
  if (b.ids) completarFontes_(b.ids);
  return { html: b.html };
}

function marcarOk_(resp) {
  var p = props_();
  p.setProperty('LIC_OK_EM', String(Date.now()));
  p.setProperty('LIC_STATUS', resp.status || 'Ativa');
}

function falarServidor_(dados) {
  if (!SERVIDOR_URL || SERVIDOR_URL.indexOf('http') !== 0) return { ok: false, msg: 'O endereço do servidor ainda não foi configurado nesta planilha.' };
  dados.planilhaId = SpreadsheetApp.getActiveSpreadsheet().getId();
  dados.planilhaNome = SpreadsheetApp.getActiveSpreadsheet().getName();
  dados.email = emailAtual_();
  dados.versaoLocal = props_().getProperty('VERSAO_LOCAL') || '';
  try {
    var r = UrlFetchApp.fetch(SERVIDOR_URL, {
      method: 'post', contentType: 'application/json', payload: JSON.stringify(dados),
      muteHttpExceptions: true, followRedirects: true
    });
    if (r.getResponseCode() >= 400) return { semConexao: true };
    return JSON.parse(r.getContentText());
  } catch (e) {
    return { semConexao: true };
  }
}

function normalizarChave_(s) { return String(s || '').toUpperCase().replace(/[^A-Z0-9-]/g, '').trim(); }
function emailAtual_() { try { return Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail() || ''; } catch (e) { return ''; } }
function props_() { return PropertiesService.getScriptProperties(); }

/* Cópia do painel guardada no Drive (para abrir mais rápido e sem internet). */
function lerCache_() {
  var id = props_().getProperty('PAINEL_CACHE_ID');
  if (!id) return '';
  try { return DriveApp.getFileById(id).getBlob().getDataAsString('UTF-8'); } catch (e) { return ''; }
}
function gravarCache_(html) {
  var p = props_(), id = p.getProperty('PAINEL_CACHE_ID');
  try { if (id) { DriveApp.getFileById(id).setContent(html); return; } } catch (e) {}
  var f = pastaSistema_().createFile('painel-cache.html', html, MimeType.PLAIN_TEXT);
  p.setProperty('PAINEL_CACHE_ID', f.getId());
}
function pastaSistema_() {
  var p = props_(), id = p.getProperty('PASTA_ID');
  try { if (id) return DriveApp.getFolderById(id); } catch (e) {}
  var f = DriveApp.createFolder(NOME_PRODUTO + ' — arquivos do painel');
  p.setProperty('PASTA_ID', f.getId());
  return f;
}
function subpasta_(nome) {
  var mae = pastaSistema_(), it = mae.getFoldersByName(nome);
  return it.hasNext() ? it.next() : mae.createFolder(nome);
}

/* ---------- Abas da planilha ---------- */
function prepararPlanilha_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ini = ss.getSheetByName(ABA_INICIO) || ss.insertSheet(ABA_INICIO, 0);
  ini.getRange('A1').setValue(NOME_PRODUTO).setFontSize(20).setFontWeight('bold');
  ini.getRange('A3:A7').setValues([
    ['Como usar: menu ⚙ ' + NOME_PRODUTO + ' → ▶ Abrir painel.'],
    ['Seus dados ficam nesta planilha (aba oculta "_banco") e no seu Google Drive.'],
    ['Na aba "Fontes", coloque o ID das SUAS planilhas no lugar das originais (coluna C).'],
    ['Não apague as abas "_banco" e "Fontes".'],
    ['Licença ativada em: ' + new Date().toLocaleString('pt-BR')]
  ]);
  ini.setColumnWidth(1, 720);
  folhaFontes_();
  folhaBanco_();
}

function folhaFontes_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(ABA_FONTES);
  if (!sh) {
    sh = ss.insertSheet(ABA_FONTES);
    sh.getRange('A1:C1').setValues([['O que é', 'ID original (não mexa)', 'ID da SUA planilha/pasta (cole aqui)']]).setFontWeight('bold');
    sh.setFrozenRows(1); sh.setColumnWidths(1, 3, 320);
    sh.getRange('B:C').setNumberFormat('@');
  }
  return sh;
}

function completarFontes_(ids) {
  var sh = folhaFontes_();
  var tem = {};
  var n = sh.getLastRow();
  if (n > 1) sh.getRange(2, 2, n - 1, 1).getValues().forEach(function (l) { tem[String(l[0])] = 1; });
  var novos = ids.filter(function (x) { return x && x.id && !tem[x.id]; }).map(function (x) { return [x.nome || '', x.id, '']; });
  if (novos.length) sh.getRange(sh.getLastRow() + 1, 1, novos.length, 3).setValues(novos);
}

function aplicarFontes_(html) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ABA_FONTES);
  if (!sh || sh.getLastRow() < 2) return html;
  sh.getRange(2, 2, sh.getLastRow() - 1, 2).getValues().forEach(function (l) {
    var de = String(l[0]).trim(), para = String(l[1]).trim();
    if (de && para && /^[A-Za-z0-9_-]{10,}$/.test(para)) html = html.split(de).join(para);
  });
  return html;
}

/* =====================================================================
   BANCO DO PAINEL — guardado na aba oculta "_banco" desta planilha.
   Assim, quem tem acesso à planilha vê os mesmos dados.
   Colunas: A = caminho, B = parte, C = texto (JSON em pedaços).
   ===================================================================== */
function folhaBanco_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(ABA_BANCO);
  if (!sh) {
    sh = ss.insertSheet(ABA_BANCO);
    sh.getRange('A1:C1').setValues([['caminho', 'parte', 'texto']]);
    sh.getRange('A:C').setNumberFormat('@');
    sh.hideSheet();
  }
  return sh;
}

function linhasDe_(sh, caminho, prefixo) {
  var n = sh.getLastRow();
  if (n < 2) return [];
  var a = sh.getRange(2, 1, n - 1, 1).getValues(), out = [];
  for (var i = 0; i < a.length; i++) {
    var c = String(a[i][0]);
    if (prefixo ? c.indexOf(caminho) === 0 : c === caminho) out.push(i + 2);
  }
  return out;
}

function lerDoc_(sh, caminho) {
  var cache = CacheService.getScriptCache(), k = 'db:' + caminho;
  var c = null;
  try { c = cache.get(k); } catch (e) {}
  if (c !== null) return c === '~' ? null : JSON.parse(c);
  var linhas = linhasDe_(sh, caminho, false);
  if (!linhas.length) { try { cache.put(k, '~', 600); } catch (e) {} return null; }
  var partes = linhas.map(function (r) { return sh.getRange(r, 2, 1, 2).getValues()[0]; })
    .sort(function (x, y) { return Number(x[0]) - Number(y[0]); });
  var txt = partes.map(function (p) { return String(p[1]); }).join('');
  if (txt.length < 90000) { try { cache.put(k, txt, 600); } catch (e) {} }
  try { return JSON.parse(txt); } catch (e) { return null; }
}

function gravarDoc_(sh, caminho, dados) {
  var linhas = linhasDe_(sh, caminho, false);
  for (var i = linhas.length - 1; i >= 0; i--) sh.deleteRow(linhas[i]);
  if (dados != null) {
    var txt = JSON.stringify(dados), rows = [];
    for (var j = 0, p = 0; j < txt.length || p === 0; j += PEDACO, p++) rows.push([caminho, String(p), txt.slice(j, j + PEDACO)]);
    var ini = sh.getLastRow() + 1;
    sh.getRange(ini, 1, rows.length, 3).setNumberFormat('@').setValues(rows);
  }
  try { CacheService.getScriptCache().remove('db:' + caminho); } catch (e) {}
  props_().setProperty('DB_MARCA', String(Date.now()));
}

function comTrava_(fn) {
  var t = LockService.getDocumentLock();
  t.waitLock(30000);
  try { return fn(); } finally { t.releaseLock(); }
}

/* Cada função "p..." é chamada pela Ponte. Recebe e devolve texto JSON. */
function resp_(fn) {
  try { return JSON.stringify(fn()); }
  catch (e) { return JSON.stringify({ __erro: String(e && e.message || e), code: 'erro' }); }
}
function arg_(s) { try { return JSON.parse(s); } catch (e) { return s; } }

function pDbMarca() { return resp_(function () { return props_().getProperty('DB_MARCA') || '1'; }); }
function pDbGet(c) { return resp_(function () { return lerDoc_(folhaBanco_(), arg_(c)); }); }
function pDbSet(c, d, merge) {
  return resp_(function () {
    var caminho = arg_(c), dados = arg_(d);
    return comTrava_(function () {
      var sh = folhaBanco_();
      if (arg_(merge)) {
        var ant = lerDoc_(sh, caminho) || {};
        Object.keys(dados || {}).forEach(function (k) { ant[k] = dados[k]; });
        dados = ant;
      }
      gravarDoc_(sh, caminho, dados);
      return true;
    });
  });
}
function pDbApagar(c) { return resp_(function () { return comTrava_(function () { gravarDoc_(folhaBanco_(), arg_(c), null); return true; }); }); }
function pDbListar(col) {
  return resp_(function () {
    var sh = folhaBanco_(), pre = arg_(col) + '/', n = sh.getLastRow();
    if (n < 2) return [];
    var v = sh.getRange(2, 1, n - 1, 3).getValues(), grupos = {};
    v.forEach(function (l) {
      var c = String(l[0]);
      if (c.indexOf(pre) !== 0 || c.slice(pre.length).indexOf('/') >= 0) return;
      (grupos[c] = grupos[c] || []).push([Number(l[1]), String(l[2])]);
    });
    return Object.keys(grupos).map(function (c) {
      var txt = grupos[c].sort(function (a, b) { return a[0] - b[0]; }).map(function (p) { return p[1]; }).join('');
      var d = null; try { d = JSON.parse(txt); } catch (e) {}
      return { caminho: c, dados: d };
    }).filter(function (x) { return x.dados != null; });
  });
}

/* =====================================================================
   GOOGLE DRIVE — imita as ferramentas do conector que o painel usava.
   ===================================================================== */
function infoArquivo_(f) {
  var pais = f.getParents();
  return {
    id: f.getId(), title: f.getName(), mimeType: f.getMimeType(),
    modifiedTime: f.getLastUpdated().toISOString(),
    viewUrl: f.getUrl(), webViewLink: f.getUrl(),
    parentId: pais.hasNext() ? pais.next().getId() : null
  };
}

function textoDoArquivo_(f) {
  var tipo = f.getMimeType();
  if (tipo === MimeType.GOOGLE_SHEETS) {
    return SpreadsheetApp.openById(f.getId()).getSheets().map(function (aba) {
      var v = aba.getDataRange().getDisplayValues();
      var csv = v.map(function (l) {
        return l.map(function (c) { c = String(c); return /[",\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; }).join(',');
      }).join('\n');
      return '# ' + aba.getName() + '\n\n```csv\n' + csv + '\n```';
    }).join('\n\n');
  }
  if (tipo === MimeType.GOOGLE_DOCS) return DocumentApp.openById(f.getId()).getBody().getText();
  if (/^text\/|json|csv|xml/.test(tipo)) return f.getBlob().getDataAsString('UTF-8');
  return '';
}

function traduzirBusca_(q) {
  q = String(q || '').replace(/parentId\s*=\s*'([^']+)'/g, "'$1' in parents");
  return (q ? '(' + q + ') and ' : '') + 'trashed = false';
}

function pDrive(nome, a) {
  return resp_(function () {
    nome = arg_(nome); a = arg_(a) || {};
    var lim = Math.min(Number(a.pageSize) || 50, 200);
    if (nome === 'search_files') {
      var it = DriveApp.searchFiles(traduzirBusca_(a.query)), files = [];
      while (it.hasNext() && files.length < lim) files.push(infoArquivo_(it.next()));
      return { payload: { files: files } };
    }
    if (nome === 'list_recent_files') {
      var lista = [];
      try {
        var r = Drive.Files.list({ pageSize: lim, orderBy: 'modifiedByMeTime desc', q: 'trashed = false', fields: 'files(id)' });
        (r.files || []).forEach(function (x) { try { lista.push(infoArquivo_(DriveApp.getFileById(x.id))); } catch (e) {} });
      } catch (e) {
        var it2 = DriveApp.searchFiles('trashed = false');
        while (it2.hasNext() && lista.length < lim) lista.push(infoArquivo_(it2.next()));
        lista.sort(function (x, y) { return y.modifiedTime.localeCompare(x.modifiedTime); });
      }
      return { payload: { files: lista } };
    }
    if (nome === 'get_file_metadata' || nome === 'read_file_content') {
      var f;
      try { f = DriveApp.getFileById(a.fileId); }
      catch (e) { var pasta = DriveApp.getFolderById(a.fileId); return { payload: { id: pasta.getId(), title: pasta.getName(), mimeType: MimeType.FOLDER, viewUrl: pasta.getUrl(), modifiedTime: pasta.getLastUpdated().toISOString() } }; }
      var info = infoArquivo_(f);
      if (!a.excludeContentSnippets) info.contentSnippet = textoDoArquivo_(f);
      if (nome === 'read_file_content') info.content = info.contentSnippet || textoDoArquivo_(f);
      return { payload: info };
    }
    if (nome === 'download_file_content') {
      var g = DriveApp.getFileById(a.fileId), blob;
      if (g.getMimeType() === MimeType.GOOGLE_SHEETS) {
        blob = UrlFetchApp.fetch('https://docs.google.com/spreadsheets/d/' + g.getId() + '/export?format=xlsx',
          { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() } }).getBlob();
      } else if (g.getMimeType() === MimeType.GOOGLE_DOCS) {
        blob = UrlFetchApp.fetch('https://docs.google.com/document/d/' + g.getId() + '/export?format=docx',
          { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() } }).getBlob();
      } else blob = g.getBlob();
      return { payload: { id: g.getId(), title: g.getName(), content: Utilities.base64Encode(blob.getBytes()) } };
    }
    if (nome === 'create_file') {
      var tipo = a.contentMimeType || a.mimeType || 'application/octet-stream';
      var b = Utilities.newBlob(Utilities.base64Decode(String(a.base64Content || '')), tipo, a.title || 'arquivo');
      var destino = a.parentId ? DriveApp.getFolderById(a.parentId) : DriveApp.getRootFolder();
      var novo = destino.createFile(b);
      return { payload: { file: infoArquivo_(novo) } };
    }
    throw new Error('Função do Drive não disponível: ' + nome);
  });
}

/* ---------- Envio de arquivos e downloads ---------- */
function salvarArquivo_(pasta, o) {
  var b = Utilities.newBlob(Utilities.base64Decode(o.base64), o.tipo, o.nome);
  return pasta.createFile(b);
}
function pArquivoEnviar(o) {
  return resp_(function () {
    o = arg_(o);
    var f = salvarArquivo_(subpasta_('Arquivos enviados'), o);
    return { id: f.getId(), url: f.getUrl(), name: f.getName(), sizeBytes: f.getSize() };
  });
}
function pArquivoApagar(id) { return resp_(function () { DriveApp.getFileById(arg_(id)).setTrashed(true); return true; }); }
function pDownloadSalvar(o) {
  return resp_(function () { var f = salvarArquivo_(subpasta_('Downloads'), arg_(o)); return { url: f.getUrl() }; });
}
function pUsuario() {
  return resp_(function () { var e = emailAtual_(); return { email: e, name: e.split('@')[0], id: e }; });
}
