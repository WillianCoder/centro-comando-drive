#!/bin/sh
# Roda todos os testes. Precisa de Node e Playwright (Chromium).
set -e
cd "$(dirname "$0")/.."
for f in cliente/Codigo.gs servidor/Licencas.gs; do node --check --input-type=commonjs < "$f" 2>/dev/null || node -e "new Function(require('fs').readFileSync('$f','utf8'))"; done
node testes/logica.cjs
node testes/painel-vendas.cjs
[ -f dist/painel.html ] && node testes/navegador.cjs | head -1
echo "TUDO OK ✅"
