// Abre o Painel de Vendas no Chromium e clica nos botões como o Willian faria.
// Por trás roda o código REAL do servidor (servidor/Licencas.gs) com um Google de mentira.
const { chromium } = require('playwright');
const fs = require('fs'), assert = require('assert');
const { planilhaFalsa, carregar } = require('./google-falso.cjs');
const ss = planilhaFalsa(), S = carregar('servidor/Licencas.gs', ss);
['Clientes', 'Instalações', 'Acessos', 'Pagamentos', 'Planos', 'Abas'].forEach(n => S.aba_(n, S['CAB_' + { Clientes: 'CLIENTES', 'Instalações': 'INST', Acessos: 'LOG', Pagamentos: 'PAG', Planos: 'PLANOS', Abas: 'ABAS' }[n]]));
const cfg = S.aba_('Config', ['Item', 'Valor', 'x']);
[['Versão do painel', '1'], ['Link de cópia do modelo', 'https://docs.google.com/spreadsheets/d/MOD/copy'], ['Nome do produto', 'Centro de Comando'], ['Chave Pix', 'pix@teste.com'], ['Máx. instalações padrão', '1']].forEach(l => cfg.appendRow(l));
S.painelSalvarPlanos(JSON.stringify([{ nome: 'Mensal', valor: 29.9, inst: 1, dias: 30 }, { nome: 'Vitalício', valor: 197, inst: 1, dias: '' }]));

const ponte = `<script>window.google={script:{get run(){var ok,fail,px;var o={withSuccessHandler:function(f){ok=f;return px},withFailureHandler:function(f){fail=f;return px}};
px=new Proxy(o,{get:function(t,k){if(k in t)return t[k];return function(){window.__gas(k,[].slice.call(arguments)).then(function(r){if(r.erro)fail&&fail({message:r.erro});else ok&&ok(r.v)})}}});return px}}};</script>`;
let html = fs.readFileSync('servidor/PainelDono.html', 'utf8').replace('<head>', '<head>' + ponte);
fs.mkdirSync('testes/saida', { recursive: true }); fs.writeFileSync('testes/saida/vendas.html', html);

(async () => {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1200, height: 800 } });
  const erros = []; p.on('pageerror', e => erros.push(e.message));
  await p.exposeFunction('__gas', (fn, args) => { try { return { v: S[fn].apply(null, args) }; } catch (e) { return { erro: e.message }; } });
  await p.goto('file://' + process.cwd() + '/testes/saida/vendas.html');
  await p.waitForTimeout(500);
  const aba = t => p.click(`#abas button[data-t="${t}"]`);

  // Vender
  await aba('vender');
  await p.fill('#vNome', 'João Pereira'); await p.fill('#vCont', '11988887777');
  await p.selectOption('#vPlano', 'Mensal');
  assert.equal(await p.inputValue('#vValor'), '29.9', 'preço do plano preenche sozinho');
  await p.click('#bVender'); await p.waitForTimeout(400);
  const msg = await p.inputValue('#vMsg');
  assert.ok(/CC-[A-Z0-9]{4}-/.test(msg) && msg.includes('/copy') && msg.includes('pix@teste.com'), 'mensagem com chave, link e pix');
  const zap = await p.getAttribute('#vZap', 'href');
  assert.ok(zap.startsWith('https://wa.me/5511988887777?text='), 'link do WhatsApp');
  await p.screenshot({ path: 'testes/saida/vendas-vender.png' });
  const chave = msg.match(/CC-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}/)[0];

  // Pagamentos
  await aba('pagamentos'); await p.waitForTimeout(200);
  await p.selectOption('#pCli', chave); await p.click('#bPagar'); await p.waitForTimeout(400);
  assert.equal(JSON.parse(S.dadosPainelDono()).pagamentos.length, 2, 'venda paga + pagamento registrado');
  assert.ok((await p.textContent('#tbP')).includes('João Pereira'));
  await p.screenshot({ path: 'testes/saida/vendas-pagamentos.png' });

  // Planos: muda o preço
  await aba('planos');
  await p.fill('#tbPl tr:nth-child(1) td:nth-child(2) input', '39.9'); await p.click('#bSalvarPl'); await p.waitForTimeout(300);
  assert.equal(S.planos_()[0].valor, 39.9, 'preço alterado');

  // Abas personalizadas para o cliente
  await aba('abas'); await p.waitForTimeout(300);
  await p.selectOption('#aCli', chave); await p.waitForTimeout(300);
  await p.uncheck('#aPad label:has-text("COFIN") input');
  await p.fill('#aNome', 'Viaturas'); await p.fill('#aCols', 'Placa, Modelo, Situação'); await p.click('#bAddAba');
  await p.fill('#aNome', 'Tarefas'); await p.selectOption('#aTipo', 'checklist'); await p.click('#bAddAba');
  await p.click('#bSalvarAbas'); await p.waitForTimeout(300);
  const ex = S.extrasDe_(chave);
  assert.deepEqual(ex.ocultas, ['cofin']); assert.deepEqual(ex.abas.map(a => a.tipo), ['tabela', 'checklist']);
  await p.screenshot({ path: 'testes/saida/vendas-abas.png' });

  // Clientes: bloquear e liberar
  await aba('clientes'); await p.waitForTimeout(200);
  await p.click('#tbC button:has-text("Bloquear")'); await p.waitForTimeout(400);
  assert.equal(S.atender_({ acao: 'checar', chave, planilhaId: 'X' }).status, 'Bloqueada');
  await p.click('#tbC button:has-text("Liberar")'); await p.waitForTimeout(400);
  assert.ok(S.atender_({ acao: 'checar', chave, planilhaId: 'X' }).ok);
  await p.screenshot({ path: 'testes/saida/vendas-clientes.png' });

  // Ajustes e links
  await aba('links'); await p.fill('#cLink', 'https://docs.google.com/spreadsheets/d/NOVO/edit#gid=0'); await p.click('#bSalvarCfg'); await p.waitForTimeout(300);
  assert.equal(S.cfg_('Link de cópia do modelo'), 'https://docs.google.com/spreadsheets/d/NOVO/copy', 'link convertido para /copy');

  await aba('resumo'); await p.waitForTimeout(300);
  await p.screenshot({ path: 'testes/saida/vendas-resumo.png' });
  // celular
  await p.setViewportSize({ width: 380, height: 800 });
  const larg = await p.evaluate(() => document.documentElement.scrollWidth);
  assert.ok(larg <= 380, 'sem rolagem lateral no celular (' + larg + ')');
  assert.equal(erros.length, 0, erros.join('\n'));
  console.log('painel de vendas ok (vender, WhatsApp, pagamento, preço, abas, bloquear, links, celular)');
  await b.close();
})().catch(e => { console.error(e.message); process.exit(1); });
