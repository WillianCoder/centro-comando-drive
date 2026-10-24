// Prepara o painel (HTML exportado do Claude) para rodar no Google, sem IA.
// Uso: node ferramentas/preparar-painel.mjs caminho/do/painel-original.html
// Gera: dist/painel.html (subir no Drive) e dist/ids-do-painel.csv (lista de planilhas usadas).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const origem = process.argv[2];
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

if (!/<head[^>]*>/i.test(html)) { console.error('O arquivo não parece um painel HTML completo (sem <head>).'); process.exit(1); }

// IDs do Drive escritos no painel (o cliente troca pelos dele na aba "Fontes")
const ids = new Map();
for (const m of html.matchAll(/['"](1[A-Za-z0-9_-]{24,60})['"]/g)) {
  if (ids.has(m[1])) continue;
  const ant = html.slice(Math.max(0, m.index - 40), m.index).replace(/[^A-Za-z_]+/g, ' ').trim().split(' ').pop();
  ids.set(m[1], ant || 'arquivo');
}

mkdirSync('dist', { recursive: true });
writeFileSync('dist/painel.html', html);
writeFileSync('dist/ids-do-painel.csv', 'O que é,ID original,ID da SUA planilha/pasta\n' +
  [...ids].map(([id, nome]) => `${nome},${id},`).join('\n') + '\n');

console.log('Trocas feitas:\n  ' + relatorio.join('\n  '));
console.log(`IDs do Drive encontrados: ${ids.size} (veja dist/ids-do-painel.csv)`);
console.log(`Tamanho: ${(antes / 1e6).toFixed(2)} MB → ${(html.length / 1e6).toFixed(2)} MB`);
console.log('Pronto: suba dist/painel.html no seu Google Drive (passo 2 do guia).');
