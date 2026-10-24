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
// ---- proteção e avisos ----
S.aba_('Avisos', S.CAB_AVISOS); ss.abas['Avisos']._d.splice(1); S.__cache = {}; S.__emails.length = 0;
const avisos = () => ss.abas['Avisos']._d.slice(1).map(l => ({ grav: l[1], tipo: l[2], chave: l[3] }));
// a chave do primeiro cliente (limite 1) usada numa planilha copiada
let rr = S.atender_({ acao: 'ativar', chave, planilhaId: 'COPIA-PIRATA', planilhaNome: 'Cópia de Centro de Comando', email: 'pirata@gmail.com' });
assert.equal(rr.status, 'Limite');
assert.ok(avisos().some(a => a.tipo === 'Possível cópia não autorizada' && a.grav === 'Alta' && a.chave === chave), 'aviso de cópia');
assert.equal(S.__emails.length, 1, 'e-mail para o dono'); assert.equal(S.__emails[0].para, 'dono@gmail.com');
S.atender_({ acao: 'ativar', chave, planilhaId: 'COPIA-PIRATA', email: 'pirata@gmail.com' });
assert.equal(avisos().filter(a => a.tipo === 'Possível cópia não autorizada').length, 1, 'não repete o mesmo aviso');
// chaves falsas
for (let i = 0; i < 3; i++) S.atender_({ acao: 'ativar', chave: 'CC-ZZZZ-ZZZZ-ZZZ' + i, planilhaId: 'BRUTA' });
assert.ok(avisos().some(a => a.tipo === 'Tentativas de chave falsa'), 'aviso de chave falsa');
// marca do cliente no painel + farol
const ht = S.atender_({ acao: 'baixar', chave, planilhaId: 'P1' }).html;
assert.ok(ht.includes('Licenciado para Cliente Teste | ' + chave), 'marca no painel');
assert.ok(ht.includes('?f=1&c='), 'farol no painel');
const n0 = avisos().length;
S.doGet({ parameter: { f: '1', c: chave, o: 'https://n-abc-0lu-script.googleusercontent.com', g: '1' } });
assert.equal(avisos().length, n0, 'abrir pelo Google não gera aviso');
S.doGet({ parameter: { f: '1', c: chave, o: 'file://', g: '0' } });
assert.ok(avisos().some(a => a.tipo === 'Painel aberto fora do Google' && a.chave === chave), 'aviso de uso fora do Google');
// muitas pessoas
cfg.appendRow(['Máx. pessoas por licença', '2', '']);
['b@x.com', 'c@x.com', 'd@x.com'].forEach(e => S.atender_({ acao: 'checar', chave, planilhaId: 'P1', email: e }));
assert.ok(avisos().some(a => a.tipo === 'Muitas pessoas na mesma licença'), 'aviso de muitas pessoas');
const dv = JSON.parse(S.dadosPainelDono()).avisos;
assert.ok(dv.length >= 4 && dv.every(a => !a.visto));
S.painelMarcarAvisos(JSON.stringify(dv.map(a => a.linha)));
assert.ok(JSON.parse(S.dadosPainelDono()).avisos.every(a => a.visto), 'marcar como visto');
console.log('servidor ok (licenças, planos, pagamentos, abas, proteção e avisos)');

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
// cache do painel compactado
const zlib = require('zlib');
C.Utilities.newBlob = (d, t, n) => { let b = { bytes: Buffer.from(d), getDataAsString: () => b.bytes.toString('utf8'), setName() { return b; }, setContentType() { return b; } }; return b; };
C.Utilities.gzip = (b) => { const z = { bytes: zlib.gzipSync(b.bytes), setName() { return z; }, setContentType() { return z; } }; return z; };
C.Utilities.ungzip = (z) => ({ getDataAsString: () => zlib.gunzipSync(z.bytes).toString('utf8') });
let guardado = null;
const arquivo = { getId: () => 'CACHE1', setDescription() {}, setTrashed() {}, getBlob: () => guardado };
C.DriveApp = { getFileById: () => arquivo, getFolderById: () => ({ createFile: b => { guardado = b; return arquivo; } }), createFolder: () => ({ getId: () => 'PASTA', createFile: b => { guardado = b; return arquivo; } }) };
C.gravarCache_('<html><head></head><body>PAINEL SECRETO</body></html>');
assert.ok(!guardado.bytes.toString('latin1').includes('PAINEL SECRETO'), 'cache não fica legível');
assert.equal(C.lerCache_(), '<html><head></head><body>PAINEL SECRETO</body></html>');
console.log('cache protegido ok');
