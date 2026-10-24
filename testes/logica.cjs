// Testa a lógica do servidor (licenças) e do banco do cliente com um Google "de mentira".
const fs = require('fs'), vm = require('vm'), assert = require('assert');
function planilhaFalsa() {
  const abas = {};
  function aba(nome) {
    const d = []; let fmt;
    const sh = {
      getName: () => nome, getLastRow: () => d.length,
      getRange(r, c, nr = 1, nc = 1) {
        if (typeof r === 'string') return { setNumberFormat() { return this; }, setValues(v) { if (/^A1:/.test(r)) d[0] = v[0].slice(); }, setValue() { return this; }, setFontSize() { return this; }, setFontWeight() { return this; } };
        return {
          getValues: () => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => ((d[r - 1 + i] || [])[c - 1 + j] ?? ''))),
          getValue() { return this.getValues()[0][0]; },
          setValues(v) { v.forEach((l, i) => { d[r - 1 + i] = d[r - 1 + i] || []; l.forEach((x, j) => d[r - 1 + i][c - 1 + j] = x); }); return this; },
          setValue(x) { return this.setValues([[x]]); },
          setNumberFormat() { return this; }, setFontWeight() { return this; }, setBackground() { return this; }, setFontColor() { return this; }, setDataValidation() { return this; }
        };
      },
      appendRow(l) { d.push(l.slice()); }, deleteRow(r) { d.splice(r - 1, 1); }, deleteRows(r, n) { d.splice(r - 1, n); },
      setFrozenRows() {}, hideSheet() {}, setColumnWidth() {}, setColumnWidths() {}, _d: d
    };
    return sh;
  }
  return { abas, getSheetByName: n => abas[n] || null, insertSheet: n => (abas[n] = aba(n)), getId: () => 'PLAN1', getName: () => 'Plan' };
}
function contexto(ss) {
  const props = {};
  const ctx = {
    SpreadsheetApp: { getActiveSpreadsheet: () => ss, openById: () => ss },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k] ?? null, setProperty: (k, v) => props[k] = v, deleteProperty: k => delete props[k] }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }), getDocumentLock: () => ({ waitLock() {}, releaseLock() {} }) },
    CacheService: { getScriptCache: () => ({ get: () => null, put() {}, remove() {} }) },
    DriveApp: { getFileById: () => ({ getBlob: () => ({ getDataAsString: () => "<html><head></head>const A='1abcdefghijklmnopqrstuvwxyz12'</html>" }) }) },
    Utilities: { getUuid: () => Math.random() + '', computeDigest: () => Array.from({ length: 32 }, () => Math.floor(Math.random() * 256) - 128), DigestAlgorithm: {} },
    ContentService: { createTextOutput: t => ({ setMimeType: () => t }), MimeType: {} },
    console
  };
  vm.createContext(ctx); return ctx;
}

// ---- Servidor ----
const ss = planilhaFalsa(), S = contexto(ss);
vm.runInContext(fs.readFileSync('servidor/Licencas.gs', 'utf8'), S);
S.aba_('Clientes', S.CAB_CLIENTES); S.aba_('Instalações', S.CAB_INST); S.aba_('Acessos', S.CAB_LOG);
const cfg = S.aba_('Config', ['Item', 'Valor', 'x']);
cfg.appendRow(['ID do arquivo do painel', 'ARQ', '']); cfg.appendRow(['Versão do painel', '3', '']); cfg.appendRow(['Máx. instalações padrão', '1', '']);
const { chave } = S.criarLicenca('Cliente Teste', '119');
assert.match(chave, /^CC-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
let r = S.atender_({ acao: 'ativar', chave, planilhaId: 'P1', email: 'a@x.com' });
assert.ok(r.ok, 'ativa'); assert.equal(r.versao, '3');
r = S.atender_({ acao: 'baixar', chave, planilhaId: 'P1' }); assert.ok(r.html.includes('<head>')); assert.equal(r.ids.length, 1);
r = S.atender_({ acao: 'checar', chave, planilhaId: 'P2' }); assert.equal(r.ok, false); assert.equal(r.status, 'Limite');
assert.equal(ss.abas['Instalações']._d.length, 2); // cabeçalho + 1
S.painelMudarStatus(chave, 'Bloqueada');
r = S.atender_({ acao: 'checar', chave, planilhaId: 'P1' }); assert.equal(r.ok, false); assert.equal(r.status, 'Bloqueada');
S.painelMudarStatus(chave, 'Ativa');
assert.ok(S.atender_({ acao: 'checar', chave, planilhaId: 'P1' }).ok);
assert.equal(S.atender_({ acao: 'checar', chave: 'CC-AAAA-BBBB-CCCC', planilhaId: 'P1' }).ok, false);
const dono = JSON.parse(S.dadosPainelDono()); assert.equal(dono.clientes.length, 1); assert.equal(dono.instalacoes[0].aberturas, 3);
console.log('servidor ok');

// ---- Banco do cliente ----
const ss2 = planilhaFalsa(), C = contexto(ss2);
vm.runInContext(fs.readFileSync('cliente/Codigo.gs', 'utf8'), C);
const grande = { b64: 'x'.repeat(120000) };
JSON.parse(C.pDbSet('"recibo/modelo-0"', JSON.stringify(grande), 'false'));
assert.equal(JSON.parse(C.pDbGet('"recibo/modelo-0"')).b64.length, 120000);
assert.equal(ss2.abas['_banco']._d.length, 1 + 3); // 3 pedaços
C.pDbSet('"setores_itens/a"', '{"t":"1"}', 'false'); C.pDbSet('"setores_itens/b"', '{"t":"2"}', 'false');
C.pDbSet('"setores_itens/a"', '{"s":"ok"}', 'true');
const lista = JSON.parse(C.pDbListar('"setores_itens"'));
assert.equal(lista.length, 2); assert.deepEqual(lista.find(x => x.caminho.endsWith('/a')).dados, { t: '1', s: 'ok' });
C.pDbApagar('"setores_itens/b"'); assert.equal(JSON.parse(C.pDbListar('"setores_itens"')).length, 1);
assert.equal(JSON.parse(C.pDbGet('"nada/aqui"')), null);
assert.equal(C.traduzirBusca_("parentId = 'X1' and title contains 'a'"), "('X1' in parents and title contains 'a') and trashed = false");
console.log('banco ok');
