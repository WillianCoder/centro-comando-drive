// Google de mentira para testar o código do Apps Script no Node.
const vm = require('vm');
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
          setNumberFormat() { return this; }, clearContent() { for (let i = 0; i < nr; i++) d[r - 1 + i] = []; return this; }, setFontWeight() { return this; }, setBackground() { return this; }, setFontColor() { return this; }, setDataValidation() { return this; }
        };
      },
      appendRow(l) { d.push(l.slice()); }, deleteRow(r) { d.splice(r - 1, 1); }, deleteRows(r, n) { d.splice(r - 1, n); },
      setFrozenRows() {}, hideSheet() {}, setColumnWidth() {}, setColumnWidths() {}, _d: d
    };
    return sh;
  }
  return { abas, getSheetByName: n => abas[n] || null, insertSheet: n => (abas[n] = aba(n)), getId: () => 'PLAN1', getName: () => 'Plan', getUrl: () => 'https://docs.google.com/spreadsheets/d/PLAN1/edit' };
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
    ScriptApp: { getService: () => ({ getUrl: () => 'https://script.google.com/macros/s/TESTE/exec' }) },
    console
  };
  vm.createContext(ctx); return ctx;
}


function carregar(arq, ss) { const fs = require('fs'), vm = require('vm'); const c = contexto(ss); vm.runInContext(fs.readFileSync(arq, 'utf8'), c); return c; }
module.exports = { planilhaFalsa, contexto, carregar };
