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
S.painelMudarStatus_(chave, 'Bloqueada');
r = S.atender_({ acao: 'checar', chave, planilhaId: 'P1' }); assert.equal(r.ok, false); assert.equal(r.status, 'Bloqueada');
S.painelMudarStatus_(chave, 'Ativa');
assert.ok(S.atender_({ acao: 'checar', chave, planilhaId: 'P1' }).ok);
assert.equal(S.atender_({ acao: 'checar', chave: 'CC-AAAA-BBBB-CCCC', planilhaId: 'P1' }).ok, false);
const dono = JSON.parse(S.dadosPainelDono_()); assert.equal(dono.clientes.length, 1); assert.equal(dono.instalacoes[0].aberturas, 3);
// planos, pagamentos e renovação
S.aba_('Planos', S.CAB_PLANOS); S.aba_('Pagamentos', S.CAB_PAG); S.aba_('Abas', S.CAB_ABAS);
S.painelSalvarPlanos_(JSON.stringify([{ nome: 'Mensal', valor: 30, inst: 1, dias: 30 }, { nome: 'Vitalício', valor: 200, inst: 2, dias: '' }]));
assert.equal(S.planos_().length, 2);
const m = JSON.parse(S.painelNovaLicenca_('Mensalista', '11988887777', JSON.stringify({ plano: 'Mensal', pago: true, forma: 'Pix' })));
let dd = JSON.parse(S.dadosPainelDono_()), cm = dd.clientes.find(c => c.chave === m.chave);
assert.equal(cm.valor, 30); assert.equal(cm.plano, 'Mensal'); assert.ok(cm.validade);
assert.equal(dd.pagamentos.length, 1); assert.equal(dd.pagamentos[0].valor, 30);
const val1 = new Date(cm.validade).getTime();
S.painelPagamento_(JSON.stringify({ chave: m.chave, forma: 'Pix' }));
dd = JSON.parse(S.dadosPainelDono_()); cm = dd.clientes.find(c => c.chave === m.chave);
assert.ok(new Date(cm.validade).getTime() - val1 > 29 * 864e5, 'pagamento renova 30 dias');
assert.equal(dd.pagamentos.length, 2);
// licença vencida trava e pagamento destrava
S.painelEditarCliente_(JSON.stringify({ chave: m.chave, validade: '2020-01-01' }));
assert.equal(S.atender_({ acao: 'checar', chave: m.chave, planilhaId: 'M1' }).status, 'Vencida');
S.painelPagamento_(JSON.stringify({ chave: m.chave }));
assert.ok(S.atender_({ acao: 'checar', chave: m.chave, planilhaId: 'M1' }).ok, 'pagamento reativa');
S.painelApagarPagamento_(2); assert.equal(JSON.parse(S.dadosPainelDono_()).pagamentos.length, 2);
// abas
S.painelSalvarAbas_('TODOS', JSON.stringify({ ocultas: ['cofin', 'belico'], abas: [{ nome: 'Viaturas', tipo: 'tabela', colunas: 'Placa, Modelo' }] }));
S.painelSalvarAbas_(m.chave, JSON.stringify({ ocultas: ['sei'], abas: [{ nome: 'Tarefas', tipo: 'checklist' }, { nome: '<b>x</b>', tipo: 'hack' }] }));
let ex = S.atender_({ acao: 'checar', chave: m.chave, planilhaId: 'M1' }).extras;
assert.deepEqual(ex.ocultas, ['sei']); assert.deepEqual(ex.abas.map(a => a.nome), ['Viaturas', 'Tarefas', '<b>x</b>']);
assert.equal(ex.abas[2].tipo, 'tabela', 'tipo inválido vira tabela');
assert.deepEqual(ex.abas[0].colunas, ['Placa', 'Modelo']);
ex = S.atender_({ acao: 'checar', chave, planilhaId: 'P1' }).extras;
assert.deepEqual(ex.ocultas, ['cofin', 'belico']);
S.painelSalvarAbas_('TODOS', JSON.stringify({ ocultas: [], abas: [] }));
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
const dv = JSON.parse(S.dadosPainelDono_()).avisos;
assert.ok(dv.length >= 4 && dv.every(a => !a.visto));
S.painelMarcarAvisos_(JSON.stringify(dv.map(a => a.linha)));
assert.ok(JSON.parse(S.dadosPainelDono_()).avisos.every(a => a.visto), 'marcar como visto');
// ---- gestores ----
S.aba_('Gestores', S.CAB_GEST); S.aba_('Atividade', S.CAB_ATIV);
const api = (t, f, ...a) => S.api(t, f, JSON.stringify(a));
const g = JSON.parse(api('', 'gestorCriar', 'Carlos', '11977776666', JSON.stringify(['ver', 'vender', 'bloquear'])));
const tok = ss.abas['Gestores']._d[1][5];
assert.ok(tok.length > 30, 'código do link longo');
let dg = JSON.parse(api(tok, 'dadosPainelDono'));
assert.equal(dg.eu.mestre, false); assert.equal(dg.clientes.length, 0, 'gestor sem "todos" não vê clientes dos outros');
assert.equal(dg.gestores.length, 0); assert.equal(dg.servidor, '', 'gestor não vê servidor');
const vg = JSON.parse(api(tok, 'painelNovaLicenca', 'Cliente do Carlos', '', JSON.stringify({})));
dg = JSON.parse(api(tok, 'dadosPainelDono'));
assert.equal(dg.clientes.length, 1); assert.equal(dg.clientes[0].vendedor, g.id, 'venda marcada com o gestor');
api(tok, 'painelMudarStatus', vg.chave, 'Bloqueada'); // pode bloquear o próprio cliente
assert.throws(() => api(tok, 'painelMudarStatus', chave, 'Bloqueada'), /não é seu/, 'não mexe no cliente do mestre');
assert.throws(() => api(tok, 'painelPagamento', JSON.stringify({ chave: vg.chave })), /permissão/, 'sem permissão de pagamento');
assert.throws(() => api(tok, 'gestorSalvar', g.id, 'Ativo', JSON.stringify(['todos'])), /permissão/, 'gestor não se dá permissão');
assert.throws(() => api(tok, 'painelSalvarConfig', '{}'), /permissão/, 'gestor não mexe nos ajustes');
assert.throws(() => api(tok, 'painelSalvarAbas', 'TODOS', '{}'), /permissão|mestre/, 'gestor não mexe em abas de todos');
assert.throws(() => api('codigo-falso', 'dadosPainelDono'), /Link inválido/);
S.__ativo = ''; assert.throws(() => api('', 'dadosPainelDono'), /negado/i, 'sem login de dono não é mestre'); S.__ativo = 'dono@gmail.com';
// mestre vê tudo e o que o gestor fez
const dm = JSON.parse(api('', 'dadosPainelDono'));
assert.ok(dm.eu.mestre && dm.gestores.length === 1 && dm.clientes.length > 1);
assert.ok(dm.atividade.some(a => a.quem.includes('Carlos') && a.detalhe.startsWith('Vendeu')), 'atividade do gestor');
assert.ok(dm.atividade.some(a => a.acao.startsWith('NEGADO')), 'tentativa negada registrada');
// mestre tira e dá permissão, bloqueia e troca o link
api('', 'gestorSalvar', g.id, '', JSON.stringify(['ver', 'todos', 'pagamentos']));
assert.ok(JSON.parse(api(tok, 'dadosPainelDono')).clientes.length > 1, 'com "todos" vê todos');
assert.throws(() => api(tok, 'painelNovaLicenca', 'x', '', '{}'), /permissão/, 'perdeu permissão de vender');
api('', 'gestorSalvar', g.id, 'Bloqueado', '');
assert.throws(() => api(tok, 'dadosPainelDono'), /bloqueado/, 'gestor bloqueado');
api('', 'gestorSalvar', g.id, 'Ativo', '');
api('', 'gestorNovoLink', g.id);
assert.throws(() => api(tok, 'dadosPainelDono'), /Link inválido/, 'link antigo para de funcionar');
console.log('gestores ok (permissões, só os próprios clientes, bloqueio, troca de link, atividade)');
// ---- unidade no cabeçalho ----
const cu = S.criarLicenca('Unidade X', '', { unidade: '5º BPM/M · Seção P4' });
S.painelEditarCliente_(JSON.stringify({ chave: cu.chave, unidade: '5º BPM/M · Seção P4' }));
const hu = S.marcarPainel_('<html><head></head><body><small>MINHA UNIDADE · MINHA SEÇÃO</small></body></html>', cu.chave, 'Unidade X', '5º BPM/M · Seção P4 <b>');
assert.ok(hu.includes('<small>5º BPM/M · SEÇÃO P4 B</small>'), 'unidade no cabeçalho, sem HTML');
// ---- rotina diária ----
S.__emails.length = 0; S.__cache = {};
const venc = S.criarLicenca('Vence Logo', '', {}), ja = S.criarLicenca('Já Venceu', '', {});
S.painelEditarCliente_(JSON.stringify({ chave: venc.chave, validade: new Date(Date.now() + 2 * 864e5).toISOString().slice(0, 10) }));
S.painelEditarCliente_(JSON.stringify({ chave: ja.chave, validade: '2021-01-01' }));
const rot = S.rotinaDiaria();
assert.ok(rot.vencidas.includes('Já Venceu') && rot.vencendo.some(x => x.startsWith('Vence Logo')), 'rotina acha vencidas e vencendo');
assert.equal(S.acharCliente_(ss.abas['Clientes'], ja.chave).valores[S.COL.status - 1], 'Vencida', 'rotina marca vencida');
assert.ok(S.__emails.some(e => e.assunto.includes('resumo do dia')), 'resumo por e-mail');
S.instalarRotina_(); S.instalarRotina_(); assert.equal(S.__gatilhos.filter(h => h === 'rotinaDiaria').length, 1, 'rotina instalada uma vez só');
// ---- verificar instalação ----
const itens = S.checarInstalacao_();
assert.ok(itens.length >= 8 && itens.every(i => typeof i.ok === 'boolean' && i.texto), 'verificação lista itens');
console.log('rotina, unidade e verificação ok');
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
// ---- backup e restauração do cliente ----
const arquivos = [];
const pastaB = { getId: () => 'PB', createFile: b => { const f = { getId: () => 'B' + arquivos.length, getName: () => 'b', getDateCreated: () => new Date(Date.now() + arquivos.length), setTrashed() { f.lixo = true; }, getBlob: () => b }; arquivos.push(f); return f; }, getFiles: () => { const l = arquivos.filter(f => !f.lixo); let i = 0; return { hasNext: () => i < l.length, next: () => l[i++] }; }, getFoldersByName: () => ({ hasNext: () => true, next: () => pastaB }) };
C.DriveApp = { getFolderById: () => pastaB, getFileById: id => arquivos.find(f => f.getId() === id) };
C.PropertiesService.getScriptProperties().setProperty('PASTA_ID', 'PB');
C.CacheService.getScriptCache().removeAll = () => {};
C.pDbSet('"notas/principal"', '{"texto":"versão boa"}', 'false');
C.fazerBackup_();
C.pDbSet('"notas/principal"', '{"texto":"apagado sem querer"}', 'false');
const backups = C.listarBackups_();
C.restaurarBackup_(backups[backups.length - 1].id);
assert.equal(JSON.parse(C.pDbGet('"notas/principal"')).texto, 'versão boa', 'restaurou o backup');
for (let i = 0; i < 20; i++) C.fazerBackup_();
assert.ok(arquivos.filter(f => !f.lixo).length <= 14, 'guarda só os 14 últimos');
C.ligarBackupDiario_(); C.ligarBackupDiario_(); assert.equal(C.__gatilhos.length, 1, 'backup diário ligado uma vez');
console.log('backup do cliente ok');
