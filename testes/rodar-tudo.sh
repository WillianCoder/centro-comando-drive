#!/bin/sh
# Roda todos os testes. Precisa de Node e Playwright (Chromium).
set -e
cd "$(dirname "$0")/.."
for f in cliente/Codigo.gs servidor/Licencas.gs; do node --check --input-type=commonjs < "$f" 2>/dev/null || node -e "new Function(require('fs').readFileSync('$f','utf8'))"; done
node testes/logica.cjs
node testes/painel-vendas.cjs
[ -f dist/painel.html ] && node testes/navegador.cjs > testes/saida/navegador.log && head -2 testes/saida/navegador.log
if [ -f dist/painel-limpo.html ]; then
  PAINEL=dist/painel-limpo.html node testes/navegador.cjs > testes/saida/navegador-limpo.log && echo "painel limpo abre ok"
  ! grep -q "Sd Salles\|3bpmmp4\|Esaú" dist/painel-limpo.html && echo "painel limpo sem dados pessoais ok"
fi
echo "TUDO OK ✅"
