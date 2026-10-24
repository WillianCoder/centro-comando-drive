// Abre o painel com a Ponte e um "Google falso" (banco em memória) e confere se carrega sem erros.
const { chromium } = require('playwright');
const fs = require('fs');
const ponte = fs.readFileSync('cliente/Ponte.html', 'utf8');
let html = fs.readFileSync('dist/painel.html', 'utf8');
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
fs.mkdirSync('testes/saida', { recursive: true });
fs.writeFileSync('testes/saida/teste.html', html);
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
  const erros = [];
  p.on('pageerror', e => erros.push(e.message));
  p.on('console', m => { if (m.type() === 'error') erros.push('console: ' + m.text()); });
  await p.route('**/*', r => r.request().url().startsWith('file:') ? r.continue() : r.abort());
  await p.goto('file://' + process.cwd() + '/testes/saida/teste.html');
  await p.waitForTimeout(4000);
  // grava uma nota pelo painel e confere se chegou no "banco"
  const nota = await p.$('#nota');
  if (nota) { await p.evaluate(() => { const n = document.querySelector('#nota'); n.value = 'teste ponte'; n.dispatchEvent(new Event('input', { bubbles: true })); n.dispatchEvent(new Event('change', { bubbles: true })); }); await p.waitForTimeout(2500); }
  const r = await p.evaluate(() => ({ chamadas: [...new Set(window.__chamadas)], banco: Object.keys(window.__BANCO), falha: !!document.getElementById('ccFalha'), titulo: document.title }));
  await p.screenshot({ path: 'testes/saida/painel.png' });
  console.log(JSON.stringify(r, null, 1));
  console.log('ERROS:', erros.length ? erros.slice(0, 15).join('\n') : 'nenhum');
  await b.close();
  process.exit(erros.filter(e => !/ERR_FAILED|net::/.test(e)).length || r.falha ? 1 : 0);
})();
