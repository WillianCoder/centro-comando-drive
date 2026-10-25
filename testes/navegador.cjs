// Abre o painel com a Ponte e um "Google falso" (banco em memória) e confere se carrega sem erros.
const { chromium } = require('playwright');
const fs = require('fs');
const ponte = fs.readFileSync('cliente/Ponte.html', 'utf8');
let html = fs.readFileSync(process.env.PAINEL || 'dist/painel.html', 'utf8');
// marca do cliente + farol, igual o servidor entrega
const { planilhaFalsa, carregar } = require('./google-falso.cjs');
html = carregar('servidor/Licencas.gs', planilhaFalsa()).marcarPainel_(html, 'CC-TEST-AAAA-BBBB', 'Cliente Teste');
const fake = `<script>
window.__chamadas=[];var BANCO={},MARCA=1;
function fn(nome,args){window.__chamadas.push(nome);var a=args.map(function(x){return JSON.parse(x)});
 switch(nome){case 'pDbMarca':return String(MARCA);
 case 'pDbGet':return BANCO[a[0]]===undefined?null:BANCO[a[0]];
 case 'pDbSet':BANCO[a[0]]=a[2]?Object.assign({},BANCO[a[0]]||{},a[1]):a[1];MARCA++;return true;
 case 'pDbApagar':delete BANCO[a[0]];MARCA++;return true;
 case 'pDbListar':return Object.keys(BANCO).filter(function(k){return k.indexOf(a[0]+'/')===0}).map(function(k){return{caminho:k,dados:BANCO[k]}});
 case 'pDrive':if(a[0]==='get_file_metadata')return{payload:{id:a[1].fileId,title:'x',modifiedTime:new Date().toISOString(),contentSnippet:'# CONTROLE\\n\\n\`\`\`csv\\nCIA,1,2,3,4,5,6,7,8\\n\`\`\`'}};return{payload:{files:[]}};
 case 'pUsuario':return{email:'teste@gmail.com'};default:return true}}
window.google={script:{get run(){var ok,fail,px,o={withSuccessHandler:function(f){ok=f;return px},withFailureHandler:function(f){fail=f;return px}};
 px=new Proxy(o,{get:function(t,k){if(k in t)return t[k];return function(){var args=[].slice.call(arguments);setTimeout(function(){try{ok&&ok(JSON.stringify(fn(k,args)))}catch(e){fail&&fail(e)}},5)}}});return px}}};
window.__BANCO=BANCO;
</script>`;
const i = html.indexOf('>', html.search(/<head[^>]*>/i)) + 1;
html = html.slice(0, i) + fake + ponte + html.slice(i);
// abas configuradas pelo vendedor (mesmo jeito que cliente/Codigo.gs injeta)
const extras = { ocultas: ['cofin', 'belico'], abas: [{ id: 'a1', nome: 'Viaturas', tipo: 'tabela', colunas: ['Placa', 'Modelo'] }, { id: 'a2', nome: 'Tarefas', tipo: 'checklist' }, { id: 'a3', nome: 'Atalhos', tipo: 'links' }, { id: 'a4', nome: 'Recados', tipo: 'notas' }] };
const bloco = '<script>window.CC_EXTRAS=' + JSON.stringify(extras).replace(/</g, '\\u003c') + ';</' + 'script>' + fs.readFileSync('cliente/Extras.html', 'utf8');
const fimBody = html.lastIndexOf('</body>');
html = fimBody >= 0 ? html.slice(0, fimBody) + bloco + html.slice(fimBody) : html + bloco;
fs.mkdirSync('testes/saida', { recursive: true });
fs.writeFileSync('testes/saida/teste.html', html);
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
  const erros = [];
  p.on('pageerror', e => erros.push(e.message));
  p.on('console', m => { if (m.type() === 'error') erros.push('console: ' + m.text()); });
  const farois = [];
  await p.route('**/*', r => { const u = r.request().url(); if (u.includes('?f=1')) farois.push(u); return u.startsWith('file:') ? r.continue() : r.abort(); });
  await p.goto('file://' + process.cwd() + '/testes/saida/teste.html');
  await p.waitForTimeout(4000);
  // grava uma nota pelo painel e confere se chegou no "banco"
  const nota = await p.$('#nota');
  if (nota) { await p.evaluate(() => { const n = document.querySelector('#nota'); n.value = 'teste ponte'; n.dispatchEvent(new Event('input', { bubbles: true })); n.dispatchEvent(new Event('change', { bubbles: true })); }); await p.waitForTimeout(2500); }
  // fecha o tutorial e a pergunta do dia, como o usuário faria
  for (let k = 0; k < 3; k++) await p.evaluate(() => document.querySelectorAll('button').forEach(x => { if (/^(Fechar|Pular hoje)$/.test(x.textContent.trim()) && x.offsetParent) x.click(); }));
  await p.waitForTimeout(300);
  // abas personalizadas
  const assert = require('assert');
  assert.equal(await p.isVisible('#tabs button[data-v="cofin"]'), false, 'COFIN escondida');
  assert.equal(await p.isVisible('#tabs button[data-v="pend"]'), true, 'Pendências continua');
  await p.click('#tabs button[data-v="cxa1"]'); await p.waitForTimeout(200);
  assert.equal(await p.isVisible('#v-cxa1'), true, 'aba Viaturas abre');
  assert.equal(await p.isVisible('#v-qg'), false, 'QG some ao trocar');
  await p.click('#v-cxa1 button:has-text("Nova linha")'); await p.fill('#v-cxa1 tbody tr:first-child td:first-child input', 'ABC1D23');
  await p.waitForTimeout(1200);
  await p.click('#tabs button[data-v="cxa2"]'); await p.fill('#v-cxa2 input[aria-label="Nova tarefa"]', 'Revisar pneus'); await p.keyboard.press('Enter');
  await p.click('#v-cxa2 .cx-item input[type=checkbox]');
  await p.click('#tabs button[data-v="cxa3"]'); await p.fill('#v-cxa3 input[aria-label="Endereço"]', 'javascript:alert(1)'); await p.click('#v-cxa3 button:has-text("Adicionar")');
  await p.fill('#v-cxa3 input[aria-label="Nome do link"]', 'Google'); await p.fill('#v-cxa3 input[aria-label="Endereço"]', 'google.com'); await p.click('#v-cxa3 button:has-text("Adicionar")');
  await p.click('#tabs button[data-v="cxa4"]'); await p.fill('#v-cxa4 textarea', 'Reunião sexta'); await p.waitForTimeout(1200);
  await p.screenshot({ path: 'testes/saida/cliente-aba-personalizada.png' });
  const B = await p.evaluate(() => window.__BANCO);
  const j = k => JSON.parse(B['extras/' + k].json);
  assert.equal(j('cxa1').linhas[0][0], 'ABC1D23', 'tabela salva');
  assert.deepEqual(j('cxa2').itens.map(x => [x.t, x.ok]), [['Revisar pneus', true]], 'checklist salvo');
  assert.equal(j('cxa3').links.length, 1, 'link perigoso recusado'); assert.equal(j('cxa3').links[0].u, 'https://google.com/');
  assert.equal(j('cxa4').texto, 'Reunião sexta', 'anotação salva');
  await p.click('#tabs button[data-v="pend"]'); await p.waitForTimeout(200);
  assert.equal(await p.isVisible('#v-cxa4'), false, 'aba personalizada some ao voltar para uma normal');
  console.log('abas personalizadas ok (esconder, tabela, checklist, links, anotações)');
  assert.ok((await p.textContent('body')).includes('Licenciado para Cliente Teste'), 'selo da licença aparece');
  assert.ok(farois.some(u => u.includes('f=1') && u.includes('g=0')), 'farol avisa uso fora do Google');
  console.log('marca e farol ok');
  const r = await p.evaluate(() => ({ chamadas: [...new Set(window.__chamadas)], banco: Object.keys(window.__BANCO), falha: !!document.getElementById('ccFalha'), titulo: document.title }));
  await p.screenshot({ path: 'testes/saida/' + (process.env.PAINEL ? 'painel-limpo' : 'painel') + '.png' });
  console.log(JSON.stringify(r, null, 1));
  console.log('ERROS:', erros.length ? erros.slice(0, 15).join('\n') : 'nenhum');
  await b.close();
  process.exit(erros.filter(e => !/ERR_FAILED|net::/.test(e)).length || r.falha ? 1 : 0);
})();
