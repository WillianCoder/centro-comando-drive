// Testa a lógica do servidor (licenças) e do banco do cliente com um Google "de mentira".
const fs = require('fs'), vm = require('vm'), assert = require('assert');
const { planilhaFalsa, contexto } = require('./google-falso.cjs');
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
// planos, pagamentos e renovação
S.aba_('Planos', S.CAB_PLANOS); S.aba_('Pagamentos', S.CAB_PAG); S.aba_('Abas', S.CAB_ABAS);
S.painelSalvarPlanos(JSON.stringify([{ nome: 'Mensal', valor: 30, inst: 1, dias: 30 }, { nome: 'Vitalício', valor: 200, inst: 2, dias: '' }]));
assert.equal(S.planos_().length, 2);
const m = JSON.parse(S.painelNovaLicenca('Mensalista', '11988887777', JSON.stringify({ plano: 'Mensal', pago: true, forma: 'Pix' })));
let dd = JSON.parse(S.dadosPainelDono()), cm = dd.clientes.find(c => c.chave === m.chave);
assert.equal(cm.valor, 30); assert.equal(cm.plano, 'Mensal'); assert.ok(cm.validade);
assert.equal(dd.pagamentos.length, 1); assert.equal(dd.pagamentos[0].valor, 30);
const val1 = new Date(cm.validade).getTime();
S.painelPagamento(JSON.stringify({ chave: m.chave, forma: 'Pix' }));
dd = JSON.parse(S.dadosPainelDono()); cm = dd.clientes.find(c => c.chave === m.chave);
assert.ok(new Date(cm.validade).getTime() - val1 > 29 * 864e5, 'pagamento renova 30 dias');
assert.equal(dd.pagamentos.length, 2);
// licença vencida trava e pagamento destrava
S.painelEditarCliente(JSON.stringify({ chave: m.chave, validade: '2020-01-01' }));
assert.equal(S.atender_({ acao: 'checar', chave: m.chave, planilhaId: 'M1' }).status, 'Vencida');
S.painelPagamento(JSON.stringify({ chave: m.chave }));
assert.ok(S.atender_({ acao: 'checar', chave: m.chave, planilhaId: 'M1' }).ok, 'pagamento reativa');
S.painelApagarPagamento(2); assert.equal(JSON.parse(S.dadosPainelDono()).pagamentos.length, 2);
// abas
S.painelSalvarAbas('TODOS', JSON.stringify({ ocultas: ['cofin', 'belico'], abas: [{ nome: 'Viaturas', tipo: 'tabela', colunas: 'Placa, Modelo' }] }));
S.painelSalvarAbas(m.chave, JSON.stringify({ ocultas: ['sei'], abas: [{ nome: 'Tarefas', tipo: 'checklist' }, { nome: '<b>x</b>', tipo: 'hack' }] }));
let ex = S.atender_({ acao: 'checar', chave: m.chave, planilhaId: 'M1' }).extras;
assert.deepEqual(ex.ocultas, ['sei']); assert.deepEqual(ex.abas.map(a => a.nome), ['Viaturas', 'Tarefas', '<b>x</b>']);
assert.equal(ex.abas[2].tipo, 'tabela', 'tipo inválido vira tabela');
assert.deepEqual(ex.abas[0].colunas, ['Placa', 'Modelo']);
ex = S.atender_({ acao: 'checar', chave, planilhaId: 'P1' }).extras;
assert.deepEqual(ex.ocultas, ['cofin', 'belico']);
S.painelSalvarAbas('TODOS', JSON.stringify({ ocultas: [], abas: [] }));
assert.equal(ss.abas['Abas']._d.length, 3, 'atualiza a linha, não duplica');
assert.ok(S.mensagemVenda_('Ana', 'CC-1').includes('CC-1'));
console.log('servidor ok (licenças, planos, pagamentos, abas)');

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
