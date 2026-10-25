/* =====================================================================
   CENTRO DE COMANDO — SERVIDOR DE LICENÇAS (só do dono)
   Fica na planilha "Painel de Licenças" do Willian.
   - Cada venda = uma linha na aba "Clientes" com uma chave.
   - Cada planilha/conta que usa a chave aparece na aba "Instalações".
   - Bloquear = mudar o Status para "Bloqueada". Na próxima abertura o painel do cliente trava.
   Nada aqui usa IA.
   ===================================================================== */

var ABA_CLIENTES = 'Clientes';
var ABA_INST = 'Instalações';
var ABA_LOG = 'Acessos';
var ABA_CFG = 'Config';
var ABA_PLANOS = 'Planos';
var ABA_PAG = 'Pagamentos';
var ABA_ABAS = 'Abas';
var ABA_AVISOS = 'Avisos';
var ABA_GEST = 'Gestores';
var CAB_GEST = ['ID', 'Nome', 'Contato', 'Status', 'Permissões', 'Código do link (não compartilhe)', 'Criado em', 'Último acesso'];
var ABA_ATIV = 'Atividade';
var CAB_ATIV = ['Quando', 'Quem', 'Ação', 'Detalhe'];
var CAB_AVISOS = ['Quando', 'Gravidade', 'Tipo', 'Chave', 'Cliente', 'Detalhe', 'Visto'];
var CAB_ABAS = ['Chave (ou TODOS)', 'Abas escondidas', 'Abas personalizadas (não editar à mão)'];

var COL = { // colunas da aba Clientes (1 = A)
  chave: 1, nome: 2, contato: 3, status: 4, maxInst: 5, validade: 6,
  criada: 7, ativada: 8, ultimo: 9, acessos: 10, obs: 11, plano: 12, valor: 13, vendedor: 14, unidade: 15
};
var CAB_CLIENTES = ['Chave', 'Nome do cliente', 'Contato (WhatsApp/e-mail)', 'Status', 'Máx. instalações',
  'Validade (vazio = sem fim)', 'Criada em', 'Ativada em', 'Último acesso', 'Nº de aberturas', 'Observações', 'Plano', 'Valor (R$)', 'Vendido por', 'Unidade (aparece no painel)'];
var CAB_PLANOS = ['Plano', 'Valor (R$)', 'Instalações', 'Dias de acesso (vazio = para sempre)', 'Descrição'];
var CAB_PAG = ['Data', 'Chave', 'Cliente', 'Valor (R$)', 'Forma', 'Referente a', 'Observação'];
var CAB_INST = ['Chave', 'Cliente', 'Conta Google', 'Planilha do cliente', 'ID da planilha', 'Primeiro acesso', 'Último acesso', 'Aberturas', 'Versão', 'Pessoas que usaram'];
var CAB_LOG = ['Quando', 'Chave', 'Conta Google', 'Ação', 'Resultado'];

/* ---------- Menu ---------- */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('🔐 Licenças')
    .addItem('📊 Abrir painel de vendas', 'abrirPainelDono')
    .addItem('➕ Nova licença (nova venda)', 'novaLicenca')
    .addSeparator()
    .addItem('⛔ Bloquear cliente da linha selecionada', 'bloquearSelecionada')
    .addItem('✅ Liberar cliente da linha selecionada', 'liberarSelecionada')
    .addItem('🧹 Remover instalação da linha selecionada', 'removerInstalacaoSelecionada')
    .addSeparator()
    .addItem('🚀 Publicar nova versão do painel', 'publicarVersao')
    .addItem('🩺 Verificar instalação', 'verificarInstalacao')
    .addItem('💾 Fazer backup agora', 'backupAgora')
    .addItem('🛠 Configurar (primeira vez)', 'configurar')
    .addToUi();
}

/* ---------- Primeira configuração ---------- */
function configurar() {
  var ss = ss_();
  aba_(ABA_CLIENTES, CAB_CLIENTES);
  aba_(ABA_INST, CAB_INST);
  aba_(ABA_LOG, CAB_LOG);
  aba_(ABA_PAG, CAB_PAG);
  aba_(ABA_ABAS, CAB_ABAS);
  aba_(ABA_AVISOS, CAB_AVISOS);
  aba_(ABA_GEST, CAB_GEST);
  aba_(ABA_ATIV, CAB_ATIV);
  var pl = aba_(ABA_PLANOS, CAB_PLANOS);
  if (pl.getLastRow() < 2) {
    pl.appendRow(['Vitalício', 197, 1, '', 'Paga uma vez e usa para sempre']);
    pl.appendRow(['Mensal', 29.9, 1, 30, 'Renova todo mês']);
    pl.appendRow(['Anual', 247, 2, 365, 'Um ano, até 2 planilhas']);
  }
  var cfg = aba_(ABA_CFG, ['Item', 'Valor', 'Explicação']);
  var padrao = [
    ['ID do arquivo do painel', '', 'ID do arquivo painel.html no seu Drive (passo 2 do guia).'],
    ['Versão do painel', '1', 'Aumenta sozinho quando você usa "Publicar nova versão".'],
    ['Link de cópia do modelo', '', 'Link do modelo terminando em /copy (passo 4 do guia).'],
    ['Nome do produto', 'Centro de Comando', 'Aparece na mensagem de venda.'],
    ['Máx. instalações padrão', '1', 'Quantas planilhas/contas cada chave pode usar.'],
    ['Chave Pix', '', 'Aparece na mensagem de venda e na cobrança.'],
    ['Seu WhatsApp', '', 'Só números, com DDD. Ex.: 11999998888'],
    ['Avisar por e-mail', 'Sim', 'Sim = manda e-mail para você nos avisos graves (cópia, uso fora do Google).'],
    ['Máx. pessoas por licença', '5', 'Mais contas Google que isso usando a mesma planilha gera um aviso.']
  ];
  var tem = cfg.getLastRow() > 1 ? cfg.getRange(2, 1, cfg.getLastRow() - 1, 1).getValues().map(function (l) { return l[0]; }) : [];
  padrao.forEach(function (l) { if (tem.indexOf(l[0]) < 0) cfg.appendRow(l); });
  cfg.setColumnWidth(1, 220); cfg.setColumnWidth(2, 420); cfg.setColumnWidth(3, 420);

  var cl = ss.getSheetByName(ABA_CLIENTES);
  var regra = SpreadsheetApp.newDataValidation().requireValueInList(['Ativa', 'Bloqueada', 'Vencida'], true).build();
  cl.getRange(2, COL.status, 1000, 1).setDataValidation(regra);
  cl.setColumnWidth(COL.chave, 170); cl.setColumnWidth(COL.nome, 220); cl.setColumnWidth(COL.contato, 200);
  var cond = cl.getConditionalFormatRules();
  var r = cl.getRange(2, 1, 1000, CAB_CLIENTES.length);
  cond.push(SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=$D2="Bloqueada"').setBackground('#f8d7d3').setRanges([r]).build());
  cond.push(SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=$D2="Ativa"').setBackground('#dff3e3').setRanges([r]).build());
  cl.setConditionalFormatRules(cond);

  var s = ss.getSheets();
  [ABA_CLIENTES, ABA_PAG, ABA_PLANOS, ABA_ABAS, ABA_AVISOS, ABA_GEST, ABA_ATIV, ABA_INST, ABA_LOG, ABA_CFG].forEach(function (n, i) { ss.setActiveSheet(ss.getSheetByName(n)); ss.moveActiveSheet(i + 1); });
  s.forEach(function (x) { if ([ABA_CLIENTES, ABA_PAG, ABA_PLANOS, ABA_ABAS, ABA_AVISOS, ABA_GEST, ABA_ATIV, ABA_INST, ABA_LOG, ABA_CFG].indexOf(x.getName()) < 0 && x.getLastRow() === 0) ss.deleteSheet(x); });
  instalarRotina_();
  ss.setActiveSheet(cfg);
  SpreadsheetApp.getUi().alert('Configurado ✅', 'Agora preencha na aba "Config" o ID do arquivo do painel e o link de cópia do modelo. Depois siga o guia.', SpreadsheetApp.getUi().ButtonSet.OK);
}

function aba_(nome, cab) {
  var ss = ss_();
  var sh = ss.getSheetByName(nome) || ss.insertSheet(nome);
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, cab.length).setValues([cab]).setFontWeight('bold').setBackground('#1f2a37').setFontColor('#ffffff');
    sh.setFrozenRows(1);
  }
  return sh;
}

function cfg_(item) {
  var sh = ss_().getSheetByName(ABA_CFG);
  if (!sh || sh.getLastRow() < 2) return '';
  var v = sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues();
  for (var i = 0; i < v.length; i++) if (v[i][0] === item) return String(v[i][1]).trim();
  return '';
}
function cfgSet_(item, valor) {
  var sh = ss_().getSheetByName(ABA_CFG);
  var v = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues();
  for (var i = 0; i < v.length; i++) if (v[i][0] === item) { sh.getRange(i + 2, 2).setValue(valor); return; }
  sh.appendRow([item, valor, '']);
}

/* ---------- Vendas ---------- */
function gerarChave_() {
  var letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', s = '';
  var b = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, Utilities.getUuid() + Date.now());
  for (var i = 0; i < 12; i++) s += letras.charAt((b[i] + 256) % letras.length);
  return 'CC-' + s.slice(0, 4) + '-' + s.slice(4, 8) + '-' + s.slice(8, 12);
}

function novaLicenca() {
  var ui = SpreadsheetApp.getUi();
  var r1 = ui.prompt('Nova venda', 'Nome do cliente:', ui.ButtonSet.OK_CANCEL);
  if (r1.getSelectedButton() !== ui.Button.OK || !r1.getResponseText().trim()) return;
  var r2 = ui.prompt('Nova venda', 'Contato (WhatsApp ou e-mail) — opcional:', ui.ButtonSet.OK_CANCEL);
  if (r2.getSelectedButton() !== ui.Button.OK) return;
  var res = criarLicenca(r1.getResponseText().trim(), r2.getResponseText().trim());
  var html = HtmlService.createHtmlOutput(
    '<div style="font:14px system-ui,sans-serif"><p><b>Licença criada ✅</b> Copie a mensagem e mande para o cliente:</p>' +
    '<textarea style="width:100%;height:230px;font:13px monospace" readonly onclick="this.select()">' + esc_(res.mensagem) + '</textarea></div>')
    .setWidth(520).setHeight(330);
  ui.showModalDialog(html, 'Mensagem para o cliente');
}

function planos_() {
  var sh = ss_().getSheetByName(ABA_PLANOS);
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, CAB_PLANOS.length).getValues().filter(function (l) { return l[0]; })
    .map(function (l) { return { nome: String(l[0]), valor: Number(l[1]) || 0, inst: Number(l[2]) || 1, dias: Number(l[3]) || 0, desc: String(l[4] || '') }; });
}
function acharPlano_(nome) { return planos_().filter(function (p) { return p.nome === nome; })[0] || null; }

function criarLicenca(nome, contato, opc) {
  opc = opc || {};
  var chave = gerarChave_();
  var plano = opc.plano ? acharPlano_(opc.plano) : null;
  var valor = opc.valor != null && opc.valor !== '' ? Number(opc.valor) : (plano ? plano.valor : '');
  comTrava_(function () {
    var sh = ss_().getSheetByName(ABA_CLIENTES);
    var l = new Array(CAB_CLIENTES.length).fill('');
    l[COL.chave - 1] = chave; l[COL.nome - 1] = nome; l[COL.contato - 1] = contato;
    l[COL.status - 1] = 'Ativa'; l[COL.maxInst - 1] = Number(cfg_('Máx. instalações padrão')) || 1;
    l[COL.criada - 1] = new Date(); l[COL.acessos - 1] = 0;
    if (plano) {
      l[COL.plano - 1] = plano.nome; l[COL.maxInst - 1] = plano.inst;
      if (plano.dias) l[COL.validade - 1] = new Date(Date.now() + plano.dias * 864e5);
    }
    l[COL.valor - 1] = valor;
    l[COL.vendedor - 1] = opc.vendedor || 'Mestre';
    l[COL.unidade - 1] = String(opc.unidade || '').slice(0, 60);
    sh.appendRow(l);
    if (opc.pago && valor) registrarPagamento_(chave, nome, valor, opc.forma || 'Pix', plano ? plano.nome : 'Compra');
  });
  return { chave: chave, mensagem: mensagemVenda_(nome, chave) };
}

function mensagemVenda_(nome, chave) {
  var prod = cfg_('Nome do produto') || 'Centro de Comando';
  var link = cfg_('Link de cópia do modelo') || '(configure o link na aba Config)';
  return 'Olá, ' + nome + '! Obrigado pela compra do ' + prod + '.\n\n' +
    '1) Abra este link com a sua conta Google e clique em "Fazer uma cópia":\n' + link + '\n\n' +
    '2) Na planilha copiada, clique no menu ⚙ ' + prod + ' → 🔑 Ativar licença.\n' +
    '   (Na primeira vez o Google pede permissão: clique em Continuar → Avançado → Acessar → Permitir.)\n\n' +
    '3) Digite sua chave: ' + chave + '\n\n' +
    '4) Pronto! Use ⚙ ' + prod + ' → ▶ Abrir painel.\n\nQualquer dúvida, é só me chamar.' +
    '\n\nObs.: a licença é pessoal e vale para ' + (function () { var c = acharCliente_(ss_().getSheetByName(ABA_CLIENTES), chave); return c ? (Number(c.valores[COL.maxInst - 1]) || 1) : 1; })() + ' planilha(s). Cópia ou revenda não são permitidas (Lei 9.609/98).' +
    (cfg_('Chave Pix') ? '\n\nPagamento via Pix: ' + cfg_('Chave Pix') : '');
}

function mudarStatusLinha_(status) {
  var sh = SpreadsheetApp.getActiveSheet();
  if (sh.getName() !== ABA_CLIENTES) { SpreadsheetApp.getUi().alert('Selecione uma linha na aba "Clientes".'); return; }
  var r = sh.getActiveRange().getRow();
  if (r < 2) return;
  sh.getRange(r, COL.status).setValue(status);
  SpreadsheetApp.getUi().alert(sh.getRange(r, COL.nome).getValue() + ': ' + status);
}
function bloquearSelecionada() { mudarStatusLinha_('Bloqueada'); }
function liberarSelecionada() { mudarStatusLinha_('Ativa'); }

function removerInstalacaoSelecionada() {
  var sh = SpreadsheetApp.getActiveSheet();
  if (sh.getName() !== ABA_INST) { SpreadsheetApp.getUi().alert('Selecione uma linha na aba "Instalações".'); return; }
  var r = sh.getActiveRange().getRow();
  if (r < 2) return;
  sh.deleteRow(r);
  SpreadsheetApp.getUi().alert('Instalação removida. O cliente pode ativar em outra planilha/conta.');
}

function publicarVersao() {
  var ui = SpreadsheetApp.getUi();
  if (!cfg_('ID do arquivo do painel')) { ui.alert('Preencha primeiro o "ID do arquivo do painel" na aba Config.'); return; }
  try { DriveApp.getFileById(cfg_('ID do arquivo do painel')).getName(); }
  catch (e) { ui.alert('Não encontrei o arquivo do painel com esse ID. Confira na aba Config.'); return; }
  var v = (Number(cfg_('Versão do painel')) || 0) + 1;
  cfgSet_('Versão do painel', String(v));
  CacheService.getScriptCache().remove('painelHtml');
  ui.alert('Versão ' + v + ' publicada ✅', 'Os clientes recebem a versão nova na próxima vez que abrirem o painel.', ui.ButtonSet.OK);
}

/* ---------- Painel do dono ---------- */
function abrirPainelDono() {
  var h = HtmlService.createHtmlOutputFromFile('PainelDono').setWidth(1200).setHeight(800);
  SpreadsheetApp.getUi().showModalDialog(h, 'Painel de vendas (mestre)');
}

function dadosPainelDono_(quem) {
  quem = quem || { mestre: true, id: 'Mestre', nome: 'Mestre', perms: PERMS.map(function (x) { return x[0]; }) };
  var ss = ss_();
  var cl = ss.getSheetByName(ABA_CLIENTES), ins = ss.getSheetByName(ABA_INST);
  var clientes = cl.getLastRow() > 1 ? cl.getRange(2, 1, cl.getLastRow() - 1, CAB_CLIENTES.length).getValues() : [];
  var insts = ins.getLastRow() > 1 ? ins.getRange(2, 1, ins.getLastRow() - 1, CAB_INST.length).getValues() : [];
  var data = function (d) { return d instanceof Date ? d.toISOString() : ''; };
  var D = {
    versao: cfg_('Versão do painel'),
    link: cfg_('Link de cópia do modelo'),
    produto: cfg_('Nome do produto') || 'Centro de Comando',
    pix: cfg_('Chave Pix'), whats: cfg_('Seu WhatsApp'),
    servidor: (function () { try { return ScriptApp.getService().getUrl() || ''; } catch (e) { return ''; } })(),
    planilha: ss_().getUrl(),
    planos: planos_(),
    avisos: (function () {
      var sh = ss_().getSheetByName(ABA_AVISOS);
      if (!sh || sh.getLastRow() < 2) return [];
      var ini = Math.max(2, sh.getLastRow() - 299);
      return sh.getRange(ini, 1, sh.getLastRow() - ini + 1, CAB_AVISOS.length).getValues().map(function (l, i) {
        return { linha: ini + i, quando: data(l[0]), grav: l[1], tipo: l[2], chave: l[3], cliente: l[4], detalhe: l[5], visto: l[6] === 'Sim' };
      }).filter(function (a) { return a.tipo; });
    })(),
    pagamentos: (function () {
      var sh = ss_().getSheetByName(ABA_PAG);
      if (!sh || sh.getLastRow() < 2) return [];
      return sh.getRange(2, 1, sh.getLastRow() - 1, CAB_PAG.length).getValues().map(function (l, i) {
        return { linha: i + 2, data: data(l[0]), chave: l[1], cliente: l[2], valor: Number(l[3]) || 0, forma: l[4], ref: l[5], obs: l[6] };
      }).filter(function (x) { return x.chave; });
    })(),
    clientes: clientes.filter(function (l) { return l[0]; }).map(function (l, i) {
      return {
        linha: i + 2, chave: l[COL.chave - 1], nome: l[COL.nome - 1], contato: l[COL.contato - 1], status: l[COL.status - 1],
        max: l[COL.maxInst - 1], validade: data(l[COL.validade - 1]), criada: data(l[COL.criada - 1]),
        ultimo: data(l[COL.ultimo - 1]), acessos: l[COL.acessos - 1],
        plano: l[COL.plano - 1] || '', valor: Number(l[COL.valor - 1]) || 0, obs: l[COL.obs - 1] || '', vendedor: l[COL.vendedor - 1] || 'Mestre', unidade: l[COL.unidade - 1] || ''
      };
    }),
    instalacoes: insts.filter(function (l) { return l[0]; }).map(function (l) {
      return { chave: l[0], cliente: l[1], email: l[2], planilha: l[3], id: l[4], primeiro: data(l[5]), ultimo: data(l[6]), aberturas: l[7], versao: l[8] };
    })
  };
  return JSON.stringify(filtrarDados_(D, quem));
}

function painelMudarStatus_(chave, status) {
  if (['Ativa', 'Bloqueada'].indexOf(status) < 0) throw new Error('Status inválido');
  var sh = ss_().getSheetByName(ABA_CLIENTES);
  var r = acharCliente_(sh, chave);
  if (!r) throw new Error('Chave não encontrada');
  sh.getRange(r.linha, COL.status).setValue(status);
  return true;
}

function painelNovaLicenca_(nome, contato, opcJson, vendedor) {
  var opc = opcJson ? JSON.parse(opcJson) : {};
  opc.vendedor = vendedor || 'Mestre';
  return JSON.stringify(criarLicenca(String(nome).trim(), String(contato || '').trim(), opc));
}

/* ---------- Pagamentos ---------- */
function registrarPagamento_(chave, nome, valor, forma, ref, obs) {
  aba_(ABA_PAG, CAB_PAG).appendRow([new Date(), chave, nome, Number(valor) || 0, forma || '', ref || '', obs || '']);
}
/* Registra um pagamento. Se o plano tem prazo, empurra a validade e reativa a licença. */
function painelPagamento_(json) {
  var o = JSON.parse(json);
  return comTrava_(function () {
    var sh = ss_().getSheetByName(ABA_CLIENTES), c = acharCliente_(sh, String(o.chave).toUpperCase());
    if (!c) throw new Error('Cliente não encontrado');
    var v = c.valores, plano = acharPlano_(String(v[COL.plano - 1] || ''));
    var valor = Number(o.valor) || Number(v[COL.valor - 1]) || 0;
    registrarPagamento_(v[COL.chave - 1], v[COL.nome - 1], valor, o.forma, o.ref || (plano ? plano.nome : ''), o.obs);
    if (plano && plano.dias) {
      var atual = v[COL.validade - 1] instanceof Date ? v[COL.validade - 1].getTime() : 0;
      var base = Math.max(atual, Date.now());
      sh.getRange(c.linha, COL.validade).setValue(new Date(base + plano.dias * 864e5));
    }
    if (String(v[COL.status - 1]) === 'Vencida') sh.getRange(c.linha, COL.status).setValue('Ativa');
    return true;
  });
}
function painelApagarPagamento_(linha) {
  var sh = ss_().getSheetByName(ABA_PAG);
  linha = Number(linha);
  if (linha >= 2 && linha <= sh.getLastRow()) sh.deleteRow(linha);
  return true;
}

/* ---------- Planos e preços ---------- */
function painelSalvarPlanos_(json) {
  var lista = JSON.parse(json).filter(function (p) { return p.nome && String(p.nome).trim(); });
  var sh = aba_(ABA_PLANOS, CAB_PLANOS);
  if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, CAB_PLANOS.length).clearContent();
  if (lista.length) sh.getRange(2, 1, lista.length, CAB_PLANOS.length).setValues(lista.map(function (p) {
    return [String(p.nome).trim(), Number(p.valor) || 0, Math.max(1, Number(p.inst) || 1), Number(p.dias) || '', String(p.desc || '')];
  }));
  return true;
}
function painelEditarCliente_(json) {
  var o = JSON.parse(json);
  var sh = ss_().getSheetByName(ABA_CLIENTES), c = acharCliente_(sh, String(o.chave).toUpperCase());
  if (!c) throw new Error('Cliente não encontrado');
  if (o.valor != null) sh.getRange(c.linha, COL.valor).setValue(Number(o.valor) || 0);
  if (o.max != null) sh.getRange(c.linha, COL.maxInst).setValue(Math.max(1, Number(o.max) || 1));
  if (o.plano != null) sh.getRange(c.linha, COL.plano).setValue(o.plano);
  if (o.validade !== undefined) sh.getRange(c.linha, COL.validade).setValue(o.validade ? new Date(o.validade + 'T23:59:00') : '');
  if (o.obs != null) sh.getRange(c.linha, COL.obs).setValue(o.obs);
  if (o.unidade != null) sh.getRange(c.linha, COL.unidade).setValue(String(o.unidade).slice(0, 60));
  return true;
}
function painelSalvarConfig_(json) {
  var o = JSON.parse(json);
  ['Link de cópia do modelo', 'Nome do produto', 'Chave Pix', 'Seu WhatsApp'].forEach(function (k) { if (o[k] != null) cfgSet_(k, String(o[k]).trim()); });
  return true;
}
function painelMensagem_(chave) {
  var sh = ss_().getSheetByName(ABA_CLIENTES);
  var r = acharCliente_(sh, chave);
  return r ? mensagemVenda_(r.valores[COL.nome - 1], chave) : '';
}

/* =====================================================================
   API — chamada pelas planilhas dos clientes (Implantar → App da Web).
   ===================================================================== */
function doPost(e) {
  var dados = {};
  try { dados = JSON.parse(e.postData.contents); } catch (x) { return json_({ ok: false, msg: 'Pedido inválido.' }); }
  try { return json_(atender_(dados)); }
  catch (x) { return json_({ ok: false, msg: 'Erro no servidor: ' + x.message }); }
}

function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.f) { try { farol_(p); } catch (x) {} return ContentService.createTextOutput('ok'); }
  if (p.g) return paginaGestor_(String(p.g));
  return ContentService.createTextOutput('Servidor de licenças no ar ✅');
}

function atender_(d) {
  var chave = String(d.chave || '').toUpperCase().trim();
  var email = String(d.email || '').slice(0, 120);
  var pid = String(d.planilhaId || '').slice(0, 80);
  if (!/^CC-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(chave)) return { ok: false, status: 'Inválida', msg: 'Chave inválida.' };
  if (!pid) return { ok: false, msg: 'Pedido sem planilha.' };

  return comTrava_(function () {
    var ss = ss_();
    var cl = ss.getSheetByName(ABA_CLIENTES);
    var c = acharCliente_(cl, chave);
    if (!c) {
      log_(chave, email, d.acao, 'chave não existe');
      var n = contar_('inv:' + pid, 3600);
      if (n >= 3) aviso_('Alta', 'Tentativas de chave falsa', chave, '', n + ' chaves erradas em 1 h na planilha "' + (d.planilhaNome || pid) + '" (' + (email || 'conta?') + ').');
      return { ok: false, status: 'Inválida', msg: 'Chave não encontrada.' };
    }
    var v = c.valores;
    var status = String(v[COL.status - 1] || 'Ativa');
    var validade = v[COL.validade - 1];
    if (status === 'Ativa' && validade instanceof Date && validade.getTime() < Date.now()) {
      status = 'Vencida'; cl.getRange(c.linha, COL.status).setValue(status);
    }
    if (status !== 'Ativa') {
      log_(chave, email, d.acao, status);
      if (status === 'Bloqueada') aviso_('Info', 'Cliente bloqueado tentou abrir', chave, v[COL.nome - 1], (email || 'conta?') + ' tentou abrir o painel.', pid);
      return { ok: false, status: status, msg: status === 'Vencida' ? 'Sua licença venceu. Fale com o vendedor para renovar.' : 'Sua licença está bloqueada. Fale com o vendedor.' };
    }

    // Controle de instalações (cada planilha copiada conta como uma)
    var ins = ss.getSheetByName(ABA_INST);
    var lista = ins.getLastRow() > 1 ? ins.getRange(2, 1, ins.getLastRow() - 1, CAB_INST.length).getValues() : [];
    var minha = -1, total = 0;
    lista.forEach(function (l, i) { if (l[0] === chave) { total++; if (l[4] === pid) minha = i; } });
    var max = Number(v[COL.maxInst - 1]) || 1;
    var agora = new Date();
    if (minha < 0) {
      if (total >= max) {
        log_(chave, email, d.acao, 'limite de instalações');
        aviso_('Alta', 'Possível cópia não autorizada', chave, v[COL.nome - 1],
          'A chave foi usada numa planilha nova: "' + String(d.planilhaNome || pid).slice(0, 80) + '" por ' + (email || 'conta desconhecida') + '. Já tinha ' + total + ' instalação(ões).', pid);
        return { ok: false, status: 'Limite', msg: 'Esta chave já está em uso em ' + total + ' planilha(s). Fale com o vendedor para liberar outra.' };
      }
      ins.appendRow([chave, v[COL.nome - 1], email, String(d.planilhaNome || '').slice(0, 120), pid, agora, agora, 1, d.versaoLocal || '', email]);
      aviso_('Info', 'Nova instalação', chave, v[COL.nome - 1], (email || 'conta?') + ' ativou em "' + String(d.planilhaNome || '').slice(0, 80) + '".');
      if (!v[COL.ativada - 1]) cl.getRange(c.linha, COL.ativada).setValue(agora);
    } else {
      var r = minha + 2;
      ins.getRange(r, 3).setValue(email || lista[minha][2]);
      ins.getRange(r, 7, 1, 3).setValues([[agora, (Number(lista[minha][7]) || 0) + 1, d.versaoLocal || '']]);
      var pessoas = String(lista[minha][9] || '').split(',').filter(Boolean);
      if (email && pessoas.indexOf(email) < 0) {
        pessoas.push(email);
        ins.getRange(r, 10).setValue(pessoas.join(','));
        var maxP = Number(cfg_('Máx. pessoas por licença')) || 5;
        if (pessoas.length > maxP) aviso_('Média', 'Muitas pessoas na mesma licença', chave, v[COL.nome - 1], pessoas.length + ' contas Google diferentes já usaram esta planilha. A última: ' + email + '.');
      }
    }
    cl.getRange(c.linha, COL.ultimo).setValue(agora);
    cl.getRange(c.linha, COL.acessos).setValue((Number(v[COL.acessos - 1]) || 0) + 1);
    if (d.acao !== 'checar') log_(chave, email, d.acao, 'ok');

    var resp = { ok: true, status: 'Ativa', cliente: v[COL.nome - 1], versao: cfg_('Versão do painel') || '1', extras: extrasDe_(chave) };
    if (d.acao === 'baixar') {
      var html = lerPainel_();
      if (!html) return { ok: false, msg: 'O painel ainda não foi publicado pelo vendedor.' };
      resp.ids = idsDoPainel_(html);
      resp.html = marcarPainel_(html, chave, v[COL.nome - 1], v[COL.unidade - 1]);
    }
    return resp;
  });
}

function lerPainel_() {
  var id = cfg_('ID do arquivo do painel');
  if (!id) return '';
  try { return DriveApp.getFileById(id).getBlob().getDataAsString('UTF-8'); } catch (e) { return ''; }
}

/* Lista de IDs do Google Drive que estão escritos dentro do painel (para a aba Fontes do cliente). */
function idsDoPainel_(html) {
  var m = html.match(/['"]1[A-Za-z0-9_-]{24,60}['"]/g) || [], vistos = {}, out = [];
  m.forEach(function (s) {
    var id = s.slice(1, -1);
    if (vistos[id]) return; vistos[id] = 1;
    var i = html.indexOf(s), ant = html.slice(Math.max(0, i - 40), i).replace(/[^A-Za-z_]+/g, ' ').trim().split(' ').pop();
    out.push({ id: id, nome: ant || 'arquivo' });
  });
  return out;
}

function acharCliente_(sh, chave) {
  var n = sh.getLastRow();
  if (n < 2) return null;
  var v = sh.getRange(2, 1, n - 1, CAB_CLIENTES.length).getValues();
  for (var i = 0; i < v.length; i++) if (String(v[i][0]).toUpperCase() === chave) return { linha: i + 2, valores: v[i] };
  return null;
}

function log_(chave, email, acao, res) {
  var sh = ss_().getSheetByName(ABA_LOG);
  if (!sh) return;
  sh.appendRow([new Date(), chave, email, String(acao || ''), res]);
  if (sh.getLastRow() > 5000) sh.deleteRows(2, 1000); // guarda só os mais recentes
}

function comTrava_(fn) {
  var t = LockService.getScriptLock();
  t.waitLock(30000);
  try { return fn(); } finally { t.releaseLock(); }
}
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function esc_(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

/* A planilha do dono (funciona tanto no menu quanto quando um cliente chama a API). */
function ss_() {
  var p = PropertiesService.getScriptProperties(), id = p.getProperty('PLANILHA_ID');
  if (id) { try { return SpreadsheetApp.openById(id); } catch (e) {} }
  var a = SpreadsheetApp.getActiveSpreadsheet();
  if (a) p.setProperty('PLANILHA_ID', a.getId());
  return a;
}

/* =====================================================================
   ABAS POR CLIENTE — esconder abas e criar abas personalizadas.
   Linha "TODOS" vale para todo mundo; a linha da chave completa/substitui.
   ===================================================================== */
var TIPOS_ABA = ['tabela', 'checklist', 'links', 'notas'];

function lerAbas_() {
  var sh = ss_().getSheetByName(ABA_ABAS), out = {};
  if (!sh || sh.getLastRow() < 2) return out;
  sh.getRange(2, 1, sh.getLastRow() - 1, 3).getValues().forEach(function (l) {
    var k = String(l[0]).trim().toUpperCase();
    if (!k) return;
    var abas = [];
    try { abas = JSON.parse(l[2] || '[]'); } catch (e) {}
    out[k] = { ocultas: String(l[1] || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean), abas: Array.isArray(abas) ? abas : [] };
  });
  return out;
}

function extrasDe_(chave) {
  var t = lerAbas_(), todos = t.TODOS || { ocultas: [], abas: [] }, meu = t[chave];
  var ocultas = meu ? meu.ocultas : todos.ocultas;
  var abas = todos.abas.concat(meu ? meu.abas : []);
  return { ocultas: ocultas, abas: abas.filter(function (a) { return a && a.id && a.nome && TIPOS_ABA.indexOf(a.tipo) >= 0; }) };
}

function limparAba_(a) {
  return {
    id: String(a.id || Utilities.getUuid().slice(0, 8)).replace(/[^a-z0-9]/gi, '').slice(0, 20),
    nome: String(a.nome || '').trim().slice(0, 40),
    tipo: TIPOS_ABA.indexOf(a.tipo) >= 0 ? a.tipo : 'tabela',
    colunas: (Array.isArray(a.colunas) ? a.colunas : String(a.colunas || '').split(','))
      .map(function (c) { return String(c).trim().slice(0, 40); }).filter(Boolean).slice(0, 12)
  };
}

function painelAbas_(chave) {
  var t = lerAbas_(), k = String(chave || 'TODOS').toUpperCase();
  return JSON.stringify(t[k] || { ocultas: [], abas: [], novo: true });
}

function painelSalvarAbas_(chave, json) {
  var k = String(chave || 'TODOS').toUpperCase(), o = JSON.parse(json);
  var ocultas = (o.ocultas || []).map(function (x) { return String(x).replace(/[^a-z0-9_-]/gi, ''); }).filter(Boolean);
  var abas = (o.abas || []).map(limparAba_).filter(function (a) { return a.nome; });
  return comTrava_(function () {
    var sh = aba_(ABA_ABAS, CAB_ABAS), n = sh.getLastRow(), linha = 0;
    if (n > 1) sh.getRange(2, 1, n - 1, 1).getValues().forEach(function (l, i) { if (String(l[0]).trim().toUpperCase() === k) linha = i + 2; });
    var valores = [[k, ocultas.join(','), JSON.stringify(abas)]];
    if (linha) sh.getRange(linha, 1, 1, 3).setValues(valores); else sh.appendRow(valores[0]);
    return true;
  });
}

/* =====================================================================
   PROTEÇÃO E AVISOS
   - Cada painel entregue leva a "marca" do cliente (nome + chave): se vazar, você sabe de quem veio.
   - O painel avisa o servidor quando abre. Se abrir fora do Google (arquivo copiado), gera aviso grave.
   - Avisos graves podem ir para o seu e-mail.
   ===================================================================== */
function contar_(k, seg) {
  var c = CacheService.getScriptCache(), n = Number(c.get(k) || 0) + 1;
  c.put(k, String(n), seg);
  return n;
}

function aviso_(grav, tipo, chave, cliente, detalhe, quem) {
  var c = CacheService.getScriptCache(), k = 'av:' + tipo + ':' + chave + ':' + (quem != null ? quem : String(detalhe).slice(0, 60));
  if (c.get(k)) return; // mesmo aviso só 1 vez a cada 12 h
  c.put(k, '1', 43200);
  var sh = aba_(ABA_AVISOS, CAB_AVISOS);
  sh.appendRow([new Date(), grav, tipo, chave || '', cliente || '', String(detalhe).slice(0, 500), '']);
  if (sh.getLastRow() > 3000) sh.deleteRows(2, 500);
  if (grav === 'Alta' && String(cfg_('Avisar por e-mail') || 'Sim').toLowerCase().indexOf('s') === 0) {
    try {
      var dono = Session.getEffectiveUser().getEmail();
      if (dono && MailApp.getRemainingDailyQuota() > 5) {
        MailApp.sendEmail(dono, '🚨 Centro de Comando: ' + tipo, tipo + '\n\nCliente: ' + (cliente || '—') + '\nChave: ' + (chave || '—') + '\n\n' + detalhe +
          '\n\nAbra o Painel de Licenças → 📊 Abrir painel de vendas → aba 🚨 Avisos.');
      }
    } catch (e) {}
  }
}

function urlServidor_() { try { return ScriptApp.getService().getUrl() || ''; } catch (e) { return ''; } }

/* Coloca a marca do cliente e o "farol" no painel entregue. */
function marcarPainel_(html, chave, nome, unidade) {
  if (unidade) html = html.split('MINHA UNIDADE · MINHA SEÇÃO').join(String(unidade).replace(/[<>&"]/g, '').toUpperCase());
  var js = function (x) { return JSON.stringify(String(x)).replace(/</g, '\\u003c'); };
  var bloco = '<!-- Licenciado para ' + String(nome).replace(/-->/g, '') + ' | ' + chave + ' | ' + new Date().toISOString() + ' -->' +
    '<script>(function(){var C=' + js(chave) + ',N=' + js(nome) + ',U=' + js(urlServidor_()) + ';' +
    'window.CC_LICENCA={chave:C,nome:N};' +
    'function farol(){try{var o=String(location.origin||location.protocol);var ok=/googleusercontent\\.com$|script\\.google\\.com$/.test(o)&&!!(window.google&&google.script);' +
    'if(U)(new Image()).src=U+"?f=1&c="+encodeURIComponent(C)+"&o="+encodeURIComponent(o)+"&g="+(ok?1:0)+"&t="+Date.now()}catch(e){}}' +
    'function selo(){var d=document.createElement("div");d.textContent="Licenciado para "+N+" · "+C.slice(0,7)+"••••";' +
    'd.style.cssText="position:fixed;right:8px;bottom:6px;font:11px system-ui,sans-serif;opacity:.45;pointer-events:none;z-index:5";document.body.appendChild(d)}' +
    'if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",function(){farol();selo()});else{farol();selo()}})();</' + 'script>';
  var f = html.lastIndexOf('</body>');
  return f >= 0 ? html.slice(0, f) + bloco + html.slice(f) : html + bloco;
}

function farol_(p) {
  var chave = String(p.c || '').toUpperCase().slice(0, 20), origem = String(p.o || '').slice(0, 120);
  if (String(p.g) === '1' && /googleusercontent\.com$|script\.google\.com$/.test(origem)) return; // aberto do jeito certo
  var c = acharCliente_(ss_().getSheetByName(ABA_CLIENTES), chave);
  aviso_('Alta', 'Painel aberto fora do Google', chave, c ? c.valores[COL.nome - 1] : '(chave desconhecida)',
    'Alguém abriu uma cópia do painel fora da planilha (endereço: ' + (origem || 'arquivo no computador') + '). A cópia saiu da licença deste cliente.');
}

function painelMarcarAvisos_(linhasJson) {
  var linhas = JSON.parse(linhasJson), sh = ss_().getSheetByName(ABA_AVISOS);
  if (!sh) return true;
  linhas.forEach(function (l) { l = Number(l); if (l >= 2 && l <= sh.getLastRow()) sh.getRange(l, 7).setValue('Sim'); });
  return true;
}

/* =====================================================================
   GESTORES — o "responsável" tem o painel dele (um link), com as permissões
   que o mestre liberar. O mestre vê tudo, bloqueia o gestor e tira permissões.
   O gestor nunca mexe em gestores, ajustes, servidor nem no mestre.
   ===================================================================== */
var PERMS = [
  ['ver', 'Ver clientes e resumo'], ['todos', 'Ver clientes de todos (não só os que ele vendeu)'],
  ['vender', 'Vender (criar licenças)'], ['pagamentos', 'Registrar pagamentos'], ['bloquear', 'Bloquear e liberar clientes'],
  ['editar', 'Editar cliente (valor, prazo, instalações)'], ['planos', 'Mudar planos e preços'],
  ['abas', 'Montar abas dos clientes'], ['avisos', 'Ver avisos de segurança']
];

/* Qual permissão cada ação exige. "mestre" = só você. */
var API = {
  dadosPainelDono: ['ver', function (q) { return dadosPainelDono_(q); }],
  checarInstalacao: ['mestre', function () { return JSON.stringify(checarInstalacao_()); }],
  backupAgora: ['mestre', function () { return backupAgora(true); }],
  painelNovaLicenca: ['vender', function (q, a) { return painelNovaLicenca_(a[0], a[1], a[2], q.mestre ? 'Mestre' : q.id); }],
  painelMensagem: ['vender', function (q, a) { dono_(q, a[0]); return painelMensagem_(a[0]); }],
  painelMudarStatus: ['bloquear', function (q, a) { dono_(q, a[0]); return painelMudarStatus_(a[0], a[1]); }],
  painelEditarCliente: ['editar', function (q, a) { dono_(q, JSON.parse(a[0]).chave); return painelEditarCliente_(a[0]); }],
  painelPagamento: ['pagamentos', function (q, a) { dono_(q, JSON.parse(a[0]).chave); return painelPagamento_(a[0]); }],
  painelApagarPagamento: ['mestre', function (q, a) { return painelApagarPagamento_(a[0]); }],
  painelSalvarPlanos: ['planos', function (q, a) { return painelSalvarPlanos_(a[0]); }],
  painelAbas: ['abas', function (q, a) { if (a[0] !== 'TODOS') dono_(q, a[0]); else if (!q.mestre) throw new Error('Só o mestre mexe nas abas de todos.'); return painelAbas_(a[0]); }],
  painelSalvarAbas: ['abas', function (q, a) { if (a[0] !== 'TODOS') dono_(q, a[0]); else if (!q.mestre) throw new Error('Só o mestre mexe nas abas de todos.'); return painelSalvarAbas_(a[0], a[1]); }],
  painelMarcarAvisos: ['avisos', function (q, a) { return painelMarcarAvisos_(a[0]); }],
  painelSalvarConfig: ['mestre', function (q, a) { return painelSalvarConfig_(a[0]); }],
  gestorCriar: ['mestre', function (q, a) { return gestorCriar_(a[0], a[1], a[2]); }],
  gestorSalvar: ['mestre', function (q, a) { return gestorSalvar_(a[0], a[1], a[2]); }],
  gestorNovoLink: ['mestre', function (q, a) { return gestorNovoLink_(a[0]); }]
};

/* Única porta de entrada da página. token vazio = mestre (só funciona para o dono da planilha). */
function api(token, nome, argsJson) {
  var quem = quem_(token);
  var regra = API[nome];
  if (!regra) throw new Error('Ação desconhecida.');
  if (regra[0] === 'mestre' ? !quem.mestre : (!quem.mestre && quem.perms.indexOf(regra[0]) < 0)) {
    atividade_(quem, 'NEGADO: ' + nome, '');
    throw new Error('Você não tem permissão para isso. Fale com o administrador.');
  }
  var args = argsJson ? JSON.parse(argsJson) : [];
  var r = regra[1](quem, args);
  if (nome !== 'dadosPainelDono' && nome !== 'painelAbas' && nome !== 'painelMensagem') atividade_(quem, nome, resumoArgs_(nome, args));
  return r;
}

function quem_(token) {
  token = String(token || '');
  if (!token) {
    var ativo = '', dono = '';
    try { ativo = Session.getActiveUser().getEmail(); dono = Session.getEffectiveUser().getEmail(); } catch (e) {}
    if (ativo && ativo === dono) return { mestre: true, id: 'Mestre', nome: 'Mestre', perms: PERMS.map(function (x) { return x[0]; }) };
    throw new Error('Acesso negado.');
  }
  var g = acharGestor_(token, 6);
  if (!g) throw new Error('Link inválido. Peça um novo ao administrador.');
  if (g.status !== 'Ativo') throw new Error('Seu acesso de gestor está bloqueado. Fale com o administrador.');
  var c = CacheService.getScriptCache(), k = 'gacc:' + g.id;
  if (!c.get(k)) { c.put(k, '1', 300); g.sh.getRange(g.linha, 8).setValue(new Date()); }
  return { mestre: false, id: g.id, nome: g.nome, perms: g.perms };
}

function acharGestor_(valor, col) {
  var sh = ss_().getSheetByName(ABA_GEST);
  if (!sh || sh.getLastRow() < 2 || !valor) return null;
  var v = sh.getRange(2, 1, sh.getLastRow() - 1, CAB_GEST.length).getValues();
  for (var i = 0; i < v.length; i++) if (String(v[i][col - 1]) === String(valor)) {
    return { sh: sh, linha: i + 2, id: String(v[i][0]), nome: String(v[i][1]), contato: String(v[i][2]), status: String(v[i][3]),
      perms: String(v[i][4] || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean), token: String(v[i][5]) };
  }
  return null;
}

/* Gestor só mexe nos clientes que ele vendeu, a não ser que tenha "todos". */
function dono_(q, chave) {
  if (q.mestre || q.perms.indexOf('todos') >= 0) return;
  var c = acharCliente_(ss_().getSheetByName(ABA_CLIENTES), String(chave || '').toUpperCase());
  if (!c || String(c.valores[COL.vendedor - 1]) !== q.id) throw new Error('Este cliente não é seu.');
}

function filtrarDados_(D, q) {
  D.eu = { mestre: !!q.mestre, nome: q.nome, id: q.id, perms: q.perms };
  D.permsLista = PERMS;
  if (q.mestre) {
    D.gestores = listarGestores_();
    D.atividade = listarAtividade_('');
    return D;
  }
  var ver = function (p) { return q.perms.indexOf(p) >= 0; };
  if (!ver('todos')) {
    D.clientes = D.clientes.filter(function (c) { return c.vendedor === q.id; });
    var minhas = {}; D.clientes.forEach(function (c) { minhas[c.chave] = 1; });
    D.instalacoes = D.instalacoes.filter(function (i) { return minhas[i.chave]; });
    D.pagamentos = D.pagamentos.filter(function (p) { return minhas[p.chave]; });
    D.avisos = D.avisos.filter(function (a) { return minhas[a.chave]; });
  }
  if (!ver('avisos')) D.avisos = [];
  if (!ver('pagamentos')) D.pagamentos = D.pagamentos.map(function (p) { return { linha: 0, data: p.data, chave: p.chave, cliente: p.cliente, valor: p.valor, forma: '', ref: '', obs: '' }; });
  D.servidor = ''; D.planilha = ''; D.gestores = [];
  D.atividade = listarAtividade_(q.id);
  return D;
}

function novoToken_() {
  return Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, Utilities.getUuid() + Utilities.getUuid() + Date.now())).replace(/=+$/, '');
}
function linkGestor_(token) { return urlServidor_() ? urlServidor_() + '?g=' + encodeURIComponent(token) : ''; }

function listarGestores_() {
  var sh = ss_().getSheetByName(ABA_GEST);
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, CAB_GEST.length).getValues().filter(function (l) { return l[0]; }).map(function (l) {
    return { id: String(l[0]), nome: l[1], contato: l[2], status: l[3], perms: String(l[4] || '').split(',').filter(Boolean),
      link: linkGestor_(l[5]), criado: l[6] instanceof Date ? l[6].toISOString() : '', ultimo: l[7] instanceof Date ? l[7].toISOString() : '' };
  });
}

function limparPerms_(lista) {
  var ok = PERMS.map(function (x) { return x[0]; });
  return (lista || []).filter(function (p) { return ok.indexOf(p) >= 0; });
}

function gestorCriar_(nome, contato, permsJson) {
  nome = String(nome || '').trim();
  if (!nome) throw new Error('Digite o nome do gestor.');
  var perms = limparPerms_(JSON.parse(permsJson || '["ver","vender","pagamentos"]'));
  var id = 'G' + Utilities.getUuid().replace(/-/g, '').slice(0, 6).toUpperCase(), token = novoToken_();
  comTrava_(function () { aba_(ABA_GEST, CAB_GEST).appendRow([id, nome, String(contato || ''), 'Ativo', perms.join(','), token, new Date(), '']); });
  return JSON.stringify({ id: id, link: linkGestor_(token) });
}

function gestorSalvar_(id, status, permsJson) {
  var g = acharGestor_(id, 1);
  if (!g) throw new Error('Gestor não encontrado.');
  if (status) {
    if (['Ativo', 'Bloqueado'].indexOf(status) < 0) throw new Error('Status inválido');
    g.sh.getRange(g.linha, 4).setValue(status);
  }
  if (permsJson) g.sh.getRange(g.linha, 5).setValue(limparPerms_(JSON.parse(permsJson)).join(','));
  return true;
}

/* Troca o link do gestor (o antigo para de funcionar na hora). */
function gestorNovoLink_(id) {
  var g = acharGestor_(id, 1);
  if (!g) throw new Error('Gestor não encontrado.');
  var t = novoToken_();
  g.sh.getRange(g.linha, 6).setValue(t);
  return JSON.stringify({ link: linkGestor_(t) });
}

function atividade_(q, acao, detalhe) {
  try {
    var sh = aba_(ABA_ATIV, CAB_ATIV);
    sh.appendRow([new Date(), q.mestre ? 'Mestre' : q.nome + ' (' + q.id + ')', acao, String(detalhe || '').slice(0, 300)]);
    if (sh.getLastRow() > 5000) sh.deleteRows(2, 1000);
  } catch (e) {}
}
function listarAtividade_(id) {
  var sh = ss_().getSheetByName(ABA_ATIV);
  if (!sh || sh.getLastRow() < 2) return [];
  var ini = Math.max(2, sh.getLastRow() - 399);
  return sh.getRange(ini, 1, sh.getLastRow() - ini + 1, 4).getValues().map(function (l) {
    return { quando: l[0] instanceof Date ? l[0].toISOString() : '', quem: String(l[1]), acao: String(l[2]), detalhe: String(l[3]) };
  }).filter(function (a) { return !id || a.quem.indexOf('(' + id + ')') >= 0; });
}
var NOMES_ACAO = { painelNovaLicenca: 'Vendeu', painelMudarStatus: 'Mudou status', painelEditarCliente: 'Editou cliente', painelPagamento: 'Registrou pagamento',
  painelApagarPagamento: 'Apagou pagamento', painelSalvarPlanos: 'Mudou planos/preços', painelSalvarAbas: 'Mudou abas', painelMarcarAvisos: 'Marcou avisos',
  painelSalvarConfig: 'Mudou ajustes', backupAgora: 'Fez backup', gestorCriar: 'Criou gestor', gestorSalvar: 'Mudou gestor', gestorNovoLink: 'Trocou link do gestor' };
function resumoArgs_(nome, a) {
  try {
    var o = /^\s*[{\[]/.test(String(a[0])) ? JSON.parse(a[0]) : null;
    var txt = (NOMES_ACAO[nome] || nome) + ': ';
    if (nome === 'painelNovaLicenca') return txt + a[0];
    if (nome === 'painelMudarStatus') return txt + a[0] + ' → ' + a[1];
    if (nome === 'gestorSalvar') return txt + a[0] + (a[1] ? ' → ' + a[1] : '') + (a[2] ? ' (permissões)' : '');
    if (o && o.chave) return txt + o.chave + (o.valor ? ' · R$ ' + o.valor : '');
    return txt + String(a[0] || '').slice(0, 60);
  } catch (e) { return nome; }
}

function paginaGestor_(token) {
  var g = acharGestor_(token, 6);
  if (!g || g.status !== 'Ativo') {
    return HtmlService.createHtmlOutput('<div style="font:16px system-ui;max-width:480px;margin:40px auto;padding:20px;border:2px solid #e0553f;border-radius:12px"><h2>Acesso indisponível</h2><p>' +
      (g ? 'Seu acesso de gestor está bloqueado.' : 'Este link não vale mais.') + ' Fale com o administrador.</p></div>').setTitle('Painel do gestor');
  }
  var html = HtmlService.createHtmlOutputFromFile('PainelDono').getContent()
    .replace('<head>', '<head><script>window.CC_TOKEN=' + JSON.stringify(token) + ';</' + 'script>');
  return HtmlService.createHtmlOutput(html).setTitle('Painel do gestor · ' + g.nome).addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/* =====================================================================
   ROTINA AUTOMÁTICA (todo dia de manhã, sozinha, sem IA)
   - marca licenças vencidas
   - avisa quem vence em até 3 dias (com lista para cobrar)
   - manda um resumo por e-mail se houver algo importante
   - backup semanal desta planilha no seu Drive (guarda os 8 últimos)
   ===================================================================== */
function instalarRotina_() {
  var tem = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'rotinaDiaria'; });
  if (!tem) ScriptApp.newTrigger('rotinaDiaria').timeBased().everyDays(1).atHour(7).create();
}

function rotinaDiaria() {
  var r = { vencidas: [], vencendo: [], parados: [] };
  var cl = ss_().getSheetByName(ABA_CLIENTES);
  if (!cl || cl.getLastRow() < 2) return r;
  var v = cl.getRange(2, 1, cl.getLastRow() - 1, CAB_CLIENTES.length).getValues(), agora = Date.now();
  v.forEach(function (l, i) {
    if (!l[0] || l[COL.status - 1] !== 'Ativa') return;
    var val = l[COL.validade - 1];
    if (val instanceof Date) {
      var dias = Math.ceil((val.getTime() - agora) / 864e5);
      if (dias < 0) { cl.getRange(i + 2, COL.status).setValue('Vencida'); r.vencidas.push(l[COL.nome - 1]); }
      else if (dias <= 3) r.vencendo.push(l[COL.nome - 1] + ' (' + dias + ' d)');
    }
    var ult = l[COL.ultimo - 1];
    if (ult instanceof Date && agora - ult.getTime() > 14 * 864e5) r.parados.push(l[COL.nome - 1]);
  });
  if (r.vencidas.length) aviso_('Média', 'Licenças venceram', '', '', r.vencidas.join(', ') + '. Registre o pagamento para reativar.', new Date().toDateString());
  if (r.vencendo.length) aviso_('Info', 'Vencem em até 3 dias', '', '', r.vencendo.join(', ') + '. Use "Cobrar no WhatsApp" no Resumo.', new Date().toDateString());
  if (r.vencidas.length || r.vencendo.length) {
    try {
      var dono = Session.getEffectiveUser().getEmail();
      if (dono && String(cfg_('Avisar por e-mail') || 'Sim').toLowerCase().indexOf('s') === 0 && MailApp.getRemainingDailyQuota() > 5) {
        MailApp.sendEmail(dono, '📋 Centro de Comando: resumo do dia',
          (r.vencidas.length ? 'Venceram hoje: ' + r.vencidas.join(', ') + '\n' : '') +
          (r.vencendo.length ? 'Vencem em até 3 dias: ' + r.vencendo.join(', ') + '\n' : '') +
          (r.parados.length ? 'Sem usar há 14+ dias: ' + r.parados.join(', ') + '\n' : '') +
          '\nAbra o Painel de Licenças → 📊 Abrir painel de vendas.');
      }
    } catch (e) {}
  }
  if (new Date().getDay() === 1) { try { backupAgora(true); } catch (e) {} } // toda segunda
  return r;
}

function backupAgora(silencioso) {
  var ss = ss_(), nome = 'Backup Painel de Licenças ' + Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'yyyy-MM-dd');
  var it = DriveApp.getFoldersByName('Centro de Comando — backups'), pasta = it.hasNext() ? it.next() : DriveApp.createFolder('Centro de Comando — backups');
  DriveApp.getFileById(ss.getId()).makeCopy(nome, pasta);
  var arqs = [], f = pasta.getFiles();
  while (f.hasNext()) arqs.push(f.next());
  arqs.sort(function (a, b) { return b.getDateCreated() - a.getDateCreated(); }).slice(8).forEach(function (x) { x.setTrashed(true); });
  if (silencioso !== true) SpreadsheetApp.getUi().alert('Backup feito ✅', 'Cópia salva na pasta "Centro de Comando — backups" do seu Drive.', SpreadsheetApp.getUi().ButtonSet.OK);
  return true;
}

/* Confere a instalação e diz, em português, o que falta. */
function checarInstalacao_() {
  var itens = [];
  var ok = function (cond, texto, como) { itens.push({ ok: !!cond, texto: texto, como: como || '' }); };
  var id = cfg_('ID do arquivo do painel'), arquivo = null;
  try { if (id) arquivo = DriveApp.getFileById(id); } catch (e) {}
  ok(id, 'ID do arquivo do painel preenchido', 'Aba Config → linha "ID do arquivo do painel" (passo 2).');
  ok(arquivo, 'Arquivo do painel encontrado no Drive', 'Confira se o ID está certo e se o arquivo não foi apagado.');
  if (arquivo) {
    var txt = arquivo.getBlob().getDataAsString('UTF-8');
    ok(/<head/i.test(txt), 'O arquivo é um painel válido', 'Suba de novo o arquivo painel-limpo.html.');
    ok(txt.indexOf('Sd Salles') < 0 && txt.indexOf('3bpmmp4') < 0, 'Painel sem os seus dados pessoais (versão limpa)', 'Suba o painel-limpo.html em vez do painel.html antes de vender.');
    var acesso = arquivo.getSharingAccess();
    ok(acesso === DriveApp.Access.PRIVATE, 'Arquivo do painel não está compartilhado', 'No Drive: botão direito → Compartilhar → Acesso geral: Restrito.');
  }
  ok(urlServidor_(), 'Servidor implantado (App da Web)', 'Apps Script → Implantar → Nova implantação → App da Web (passo 3).');
  var link = cfg_('Link de cópia do modelo');
  ok(/\/copy$/.test(link), 'Link de cópia do modelo preenchido', 'Painel de vendas → 🔗 Links e ajustes (passo 4).');
  ok(cfg_('Chave Pix'), 'Chave Pix preenchida', 'Painel de vendas → 🔗 Links e ajustes.');
  ok(planos_().length, 'Planos e preços cadastrados', 'Painel de vendas → 🏷 Planos e preços.');
  ok(ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'rotinaDiaria'; }), 'Rotina diária ligada', 'Menu 🔐 Licenças → 🛠 Configurar.');
  return itens;
}
function verificarInstalacao() {
  var itens = checarInstalacao_();
  var falta = itens.filter(function (i) { return !i.ok; });
  var txt = itens.map(function (i) { return (i.ok ? '✅ ' : '❌ ') + i.texto + (i.ok ? '' : '\n     → ' + i.como); }).join('\n');
  SpreadsheetApp.getUi().alert(falta.length ? 'Faltam ' + falta.length + ' item(ns)' : 'Tudo certo para vender ✅', txt, SpreadsheetApp.getUi().ButtonSet.OK);
}
