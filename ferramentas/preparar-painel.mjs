// Prepara o painel (HTML exportado do Claude) para rodar no Google, sem IA.
// Uso: node ferramentas/preparar-painel.mjs caminho/do/painel-original.html
// Gera: dist/painel.html (subir no Drive) e dist/ids-do-painel.csv (lista de planilhas usadas).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const args = process.argv.slice(2);
const LIMPO = args.includes('--limpo');
const origem = args.find(a => !a.startsWith('--'));
if (!origem) { console.error('Informe o arquivo do painel. Ex.: node ferramentas/preparar-painel.mjs painel.html'); process.exit(1); }

let html = readFileSync(origem, 'utf8');
const antes = html.length;

const trocas = [
  // arquivos enviados passam a ficar no Google Drive
  [/href="\/_blob\/\$\{/g, 'href="https://drive.google.com/file/d/${'],
  // mensagens que falavam do claude.ai
  [/claude\.ai › Configurações › Conectores/g, 'o menu ⚙ Centro de Comando da planilha'],
  [/painel aberto no claude\.ai/g, 'painel aberto pela planilha'],
  [/o claude\.ai bloqueia outros sites/g, 'o Google bloqueia outros sites'],
  [/O claude\.ai não deixou abrir direto/g, 'O navegador não deixou abrir direto'],
  [/No navegador, pelo claude\.ai, vai até 16 MB\./g, 'Use arquivos de até 16 MB.'],
];
const relatorio = [];
for (const [re, novo] of trocas) {
  const n = (html.match(re) || []).length;
  html = html.replace(re, novo);
  relatorio.push(`${n}× ${re.source.slice(0, 50)}`);
}

// ===== Versão limpa (para vender): tira os dados da seção do Willian =====
const avisosLimpeza = [];
if (LIMPO) {
  const limpar = [
    ['demandas', /const RAW=`[\s\S]*?`/, 'const RAW=`P|Geral|Exemplo: cadastre suas demandas (veja a aba Fontes da planilha)|01/01`'],
    ['material', /const MAT=`[\s\S]*?`(?=\.split)/, 'const MAT=`01/01/2026|Exemplo de material|000000|Origem → Destino|Ação pendente|P`'],
    ['links', /const LINKS=\[[\s\S]*?\n\];/, "const LINKS=[['Meus links',[['Google Drive','https://drive.google.com/','pasta'],['Google Planilhas','https://docs.google.com/spreadsheets/','planilha']]]];"],
    ['efetivo', /let PESS=\[[^\]]*\];/, "let PESS=['Eu'];"],
    ['contato da unidade', /,\['3º BPM\/M','[^']*'\]/, ''],
    ['cabeçalho', /3º BPM\/M · SEÇÃO P4 · TELEMÁTICA/, 'MINHA UNIDADE · MINHA SEÇÃO'],
    ['nome no cabeçalho', /Sd PM Salles · /, ''],
    ['exemplo de nome', /ex\.: Sd PM Salles/g, 'ex.: Sd PM Fulano'],
    ['assinatura de mensagem', /Aqui é o Sd Salles, da Telemática P4/g, 'Aqui é da Seção P4'],
    ['nomes em filtros', /\|(sampaio|daniel|wickler)(?=[\/|])/gi, ''],
    ['nomes na lista de pessoas', /const QUEM=\[[^\]]*\];/, "const QUEM=['DTIC','CPA','COFIN','SEI','Maj','Cap','Ten','Sgt','Cb','Sd','Vivo','Claro','LC Print','DCI','LCM','1ª Cia','2ª Cia','3ª Cia','FT','EM'];"],
    ['nomes no detector de destino', /,\[\/(galdino|diego|luciano|sgt marcos)\/,'[^']*'\]/g, ''],
    ['e-mail da seção', /3bpmmp4@policiamilitar\.sp\.gov\.br/g, 'sua.secao@policiamilitar.sp.gov.br'],
  ];
  for (const [nome, re, novo] of limpar) {
    const n = (html.match(re) || []).length;
    if (!n) avisosLimpeza.push('NÃO ACHEI: ' + nome);
    html = html.replace(re, novo);
    relatorio.push(`${n}× limpeza: ${nome}`);
  }
  // Confere se sobrou algum nome conhecido
  const sensiveis = ['Galdino', 'Kamikoga', 'Salles', 'Esaú', 'Vendramelli', 'Pissoloto', 'Vilas Boas', 'Artilha', 'Sampaio', 'Wickler', 'Silas', 'Sgt Marcos', '3bpmmp4'];
  for (const w of sensiveis) {
    const n = html.split(w).length - 1;
    if (n) avisosLimpeza.push(`sobrou "${w}" ${n}×`);
  }
}

if (!/<head[^>]*>/i.test(html)) { console.error('O arquivo não parece um painel HTML completo (sem <head>).'); process.exit(1); }

// IDs do Drive escritos no painel (o cliente troca pelos dele na aba "Fontes")
const ids = new Map();
for (const m of html.matchAll(/['"](1[A-Za-z0-9_-]{24,60})['"]/g)) {
  if (ids.has(m[1])) continue;
  const ant = html.slice(Math.max(0, m.index - 40), m.index).replace(/[^A-Za-z_]+/g, ' ').trim().split(' ').pop();
  ids.set(m[1], ant || 'arquivo');
}

mkdirSync('dist', { recursive: true });
const saida = LIMPO ? 'dist/painel-limpo.html' : 'dist/painel.html';
writeFileSync(saida, html);
if (!LIMPO) writeFileSync('dist/ids-do-painel.csv', 'O que é,ID original,ID da SUA planilha/pasta\n' +
  [...ids].map(([id, nome]) => `${nome},${id},`).join('\n') + '\n');

console.log('Trocas feitas:\n  ' + relatorio.join('\n  '));
console.log(`IDs do Drive encontrados: ${ids.size} (veja dist/ids-do-painel.csv)`);
console.log(`Tamanho: ${(antes / 1e6).toFixed(2)} MB → ${(html.length / 1e6).toFixed(2)} MB`);
if (avisosLimpeza.length) console.log('ATENÇÃO na limpeza:\n  ' + avisosLimpeza.join('\n  '));
console.log('Pronto: suba ' + saida + ' no seu Google Drive (passo 2 do guia).');
