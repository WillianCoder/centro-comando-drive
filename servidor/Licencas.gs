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
var CAB_ABAS = ['Chave (ou TODOS)', 'Abas escondidas', 'Abas personalizadas (não editar à mão)'];

var COL = { // colunas da aba Clientes (1 = A)
  chave: 1, nome: 2, contato: 3, status: 4, maxInst: 5, validade: 6,
  criada: 7, ativada: 8, ultimo: 9, acessos: 10, obs: 11, plano: 12, valor: 13
};
var CAB_CLIENTES = ['Chave', 'Nome do cliente', 'Contato (WhatsApp/e-mail)', 'Status', 'Máx. instalações',
  'Validade (vazio = sem fim)', 'Criada em', 'Ativada em', 'Último acesso', 'Nº de aberturas', 'Observações', 'Plano', 'Valor (R$)'];
var CAB_PLANOS = ['Plano', 'Valor (R$)', 'Instalações', 'Dias de acesso (vazio = para sempre)', 'Descrição'];
var CAB_PAG = ['Data', 'Chave', 'Cliente', 'Valor (R$)', 'Forma', 'Referente a', 'Observação'];
var CAB_INST = ['Chave', 'Cliente', 'Conta Google', 'Planilha do cliente', 'ID da planilha', 'Primeiro acesso', 'Último acesso', 'Aberturas', 'Versão'];
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
    ['Seu WhatsApp', '', 'Só números, com DDD. Ex.: 11999998888']
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
  [ABA_CLIENTES, ABA_PAG, ABA_PLANOS, ABA_ABAS, ABA_INST, ABA_LOG, ABA_CFG].forEach(function (n, i) { ss.setActiveSheet(ss.getSheetByName(n)); ss.moveActiveSheet(i + 1); });
  s.forEach(function (x) { if ([ABA_CLIENTES, ABA_PAG, ABA_PLANOS, ABA_ABAS, ABA_INST, ABA_LOG, ABA_CFG].indexOf(x.getName()) < 0 && x.getLastRow() === 0) ss.deleteSheet(x); });
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
  var t = HtmlService.createTemplateFromFile('PainelDono');
  SpreadsheetApp.getUi().showModalDialog(t.evaluate().setWidth(1200).setHeight(800), 'Painel de vendas');
}

function dadosPainelDono() {
  var ss = ss_();
  var cl = ss.getSheetByName(ABA_CLIENTES), ins = ss.getSheetByName(ABA_INST);
  var clientes = cl.getLastRow() > 1 ? cl.getRange(2, 1, cl.getLastRow() - 1, CAB_CLIENTES.length).getValues() : [];
  var insts = ins.getLastRow() > 1 ? ins.getRange(2, 1, ins.getLastRow() - 1, CAB_INST.length).getValues() : [];
  var data = function (d) { return d instanceof Date ? d.toISOString() : ''; };
  return JSON.stringify({
    versao: cfg_('Versão do painel'),
    link: cfg_('Link de cópia do modelo'),
    produto: cfg_('Nome do produto') || 'Centro de Comando',
    pix: cfg_('Chave Pix'), whats: cfg_('Seu WhatsApp'),
    servidor: (function () { try { return ScriptApp.getService().getUrl() || ''; } catch (e) { return ''; } })(),
    planilha: ss_().getUrl(),
    planos: planos_(),
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
        plano: l[COL.plano - 1] || '', valor: Number(l[COL.valor - 1]) || 0, obs: l[COL.obs - 1] || ''
      };
    }),
    instalacoes: insts.filter(function (l) { return l[0]; }).map(function (l) {
      return { chave: l[0], cliente: l[1], email: l[2], planilha: l[3], id: l[4], primeiro: data(l[5]), ultimo: data(l[6]), aberturas: l[7], versao: l[8] };
    })
  });
}

function painelMudarStatus(chave, status) {
  if (['Ativa', 'Bloqueada'].indexOf(status) < 0) throw new Error('Status inválido');
  var sh = ss_().getSheetByName(ABA_CLIENTES);
  var r = acharCliente_(sh, chave);
  if (!r) throw new Error('Chave não encontrada');
  sh.getRange(r.linha, COL.status).setValue(status);
  return true;
}

function painelNovaLicenca(nome, contato, opcJson) {
  var opc = opcJson ? JSON.parse(opcJson) : {};
  return JSON.stringify(criarLicenca(String(nome).trim(), String(contato || '').trim(), opc));
}

/* ---------- Pagamentos ---------- */
function registrarPagamento_(chave, nome, valor, forma, ref, obs) {
  aba_(ABA_PAG, CAB_PAG).appendRow([new Date(), chave, nome, Number(valor) || 0, forma || '', ref || '', obs || '']);
}
/* Registra um pagamento. Se o plano tem prazo, empurra a validade e reativa a licença. */
function painelPagamento(json) {
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
function painelApagarPagamento(linha) {
  var sh = ss_().getSheetByName(ABA_PAG);
  linha = Number(linha);
  if (linha >= 2 && linha <= sh.getLastRow()) sh.deleteRow(linha);
  return true;
}

/* ---------- Planos e preços ---------- */
function painelSalvarPlanos(json) {
  var lista = JSON.parse(json).filter(function (p) { return p.nome && String(p.nome).trim(); });
  var sh = aba_(ABA_PLANOS, CAB_PLANOS);
  if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, CAB_PLANOS.length).clearContent();
  if (lista.length) sh.getRange(2, 1, lista.length, CAB_PLANOS.length).setValues(lista.map(function (p) {
    return [String(p.nome).trim(), Number(p.valor) || 0, Math.max(1, Number(p.inst) || 1), Number(p.dias) || '', String(p.desc || '')];
  }));
  return true;
}
function painelEditarCliente(json) {
  var o = JSON.parse(json);
  var sh = ss_().getSheetByName(ABA_CLIENTES), c = acharCliente_(sh, String(o.chave).toUpperCase());
  if (!c) throw new Error('Cliente não encontrado');
  if (o.valor != null) sh.getRange(c.linha, COL.valor).setValue(Number(o.valor) || 0);
  if (o.max != null) sh.getRange(c.linha, COL.maxInst).setValue(Math.max(1, Number(o.max) || 1));
  if (o.plano != null) sh.getRange(c.linha, COL.plano).setValue(o.plano);
  if (o.validade !== undefined) sh.getRange(c.linha, COL.validade).setValue(o.validade ? new Date(o.validade + 'T23:59:00') : '');
  if (o.obs != null) sh.getRange(c.linha, COL.obs).setValue(o.obs);
  return true;
}
function painelSalvarConfig(json) {
  var o = JSON.parse(json);
  ['Link de cópia do modelo', 'Nome do produto', 'Chave Pix', 'Seu WhatsApp'].forEach(function (k) { if (o[k] != null) cfgSet_(k, String(o[k]).trim()); });
  return true;
}
function painelMensagem(chave) {
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

function doGet() {
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
    if (!c) { log_(chave, email, d.acao, 'chave não existe'); return { ok: false, status: 'Inválida', msg: 'Chave não encontrada.' }; }
    var v = c.valores;
    var status = String(v[COL.status - 1] || 'Ativa');
    var validade = v[COL.validade - 1];
    if (status === 'Ativa' && validade instanceof Date && validade.getTime() < Date.now()) {
      status = 'Vencida'; cl.getRange(c.linha, COL.status).setValue(status);
    }
    if (status !== 'Ativa') {
      log_(chave, email, d.acao, status);
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
        return { ok: false, status: 'Limite', msg: 'Esta chave já está em uso em ' + total + ' planilha(s). Fale com o vendedor para liberar outra.' };
      }
      ins.appendRow([chave, v[COL.nome - 1], email, String(d.planilhaNome || '').slice(0, 120), pid, agora, agora, 1, d.versaoLocal || '']);
      if (!v[COL.ativada - 1]) cl.getRange(c.linha, COL.ativada).setValue(agora);
    } else {
      var r = minha + 2;
      ins.getRange(r, 3).setValue(email || lista[minha][2]);
      ins.getRange(r, 7, 1, 3).setValues([[agora, (Number(lista[minha][7]) || 0) + 1, d.versaoLocal || '']]);
    }
    cl.getRange(c.linha, COL.ultimo).setValue(agora);
    cl.getRange(c.linha, COL.acessos).setValue((Number(v[COL.acessos - 1]) || 0) + 1);
    if (d.acao !== 'checar') log_(chave, email, d.acao, 'ok');

    var resp = { ok: true, status: 'Ativa', cliente: v[COL.nome - 1], versao: cfg_('Versão do painel') || '1', extras: extrasDe_(chave) };
    if (d.acao === 'baixar') {
      var html = lerPainel_();
      if (!html) return { ok: false, msg: 'O painel ainda não foi publicado pelo vendedor.' };
      resp.html = html;
      resp.ids = idsDoPainel_(html);
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

function painelAbas(chave) {
  var t = lerAbas_(), k = String(chave || 'TODOS').toUpperCase();
  return JSON.stringify(t[k] || { ocultas: [], abas: [], novo: true });
}

function painelSalvarAbas(chave, json) {
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
