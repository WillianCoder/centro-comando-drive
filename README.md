# Centro de Comando — versão para vender (Google Drive, sem IA)

Este repositório transforma o seu **Centro de Comando** em um produto que você vende.
Cada cliente usa a **conta Google dele**: os dados ficam no Drive dele, e **nada usa IA nem gasta tokens**.
Você controla tudo por uma planilha: quem comprou, quem instalou, quando usou, e pode **bloquear ou liberar** cada um.

## Como funciona (em 1 minuto)

```
VOCÊ (dono)                                    CLIENTE
┌──────────────────────────┐                   ┌───────────────────────────────┐
│ Planilha "Painel de      │   chave + link    │ Clica no link → "Fazer cópia" │
│ Licenças" (servidor)     │ ────────────────▶ │ Menu ⚙ → Ativar licença       │
│  • Clientes / chaves     │                   │ Menu ⚙ → Abrir painel         │
│  • Instalações           │ ◀──── confere ─── │                               │
│  • Bloquear / Liberar    │ ──── painel ────▶ │ Dados: na planilha + Drive    │
│ painel.html no seu Drive │                   │ dele (aba oculta "_banco")    │
└──────────────────────────┘                   └───────────────────────────────┘
```

- Toda vez que o cliente abre o painel, a planilha dele **confere a licença** no seu servidor.
- Bloqueou? Na próxima abertura o painel dele mostra "Licença bloqueada".
- Sem internet, o painel ainda abre por até **7 dias** (usa a última cópia salva).
- Você publica uma versão nova e **todos recebem sozinhos** na próxima abertura.
- Cada chave vale para **1 planilha** (você muda em "Máx. instalações").

> Observação: o controle é por **planilha/conta Google**, não por computador. O cliente pode abrir em qualquer computador ou celular, mas só na planilha que foi ativada.

---

## ⚠ Antes de vender: tire os seus dados do painel

O painel atual tem **dados da sua seção embutidos** (nomes do efetivo, demandas, COFIN, IDs das suas planilhas).
Quem comprar vai ver esses dados se você vender sem limpar.
Antes da primeira venda, peça ao Claude: *"limpe os dados embutidos do Centro de Comando para uma versão modelo"*, e gere o `painel.html` de novo.

---

## Instalação (só uma vez, ~15 minutos)

### Passo 1 — Planilha de licenças (o seu painel de controle)
1. Entre em **sheets.new** com a sua conta Google. Dê o nome **Painel de Licenças**.
2. Menu **Extensões → Apps Script**.
3. Apague o que estiver lá e cole todo o conteúdo de [`servidor/Licencas.gs`](servidor/Licencas.gs).
4. Clique em **+ (Adicionar arquivo) → HTML**, nome **PainelDono**, e cole [`servidor/PainelDono.html`](servidor/PainelDono.html).
5. Salve (ícone de disquete). Volte para a planilha e recarregue a página.
6. Menu **🔐 Licenças → 🛠 Configurar (primeira vez)**. O Google pede permissão: **Continuar → Avançado → Acessar (não seguro) → Permitir**. (É o seu próprio código, pode confiar.)

### Passo 2 — Suba o painel no seu Drive
1. Baixe o arquivo [`dist/painel.html`](dist/painel.html) (botão **Download raw file**).
2. Suba no seu Google Drive (pode ser numa pasta "Centro de Comando — sistema"). **Não compartilhe** esse arquivo com ninguém.
3. Abra o arquivo no Drive, copie o ID do endereço (o trecho entre `/d/` e `/view`).
4. Cole na aba **Config**, linha **ID do arquivo do painel**.

### Passo 3 — Ligue o servidor
1. No Apps Script do Painel de Licenças: **Implantar → Nova implantação**.
2. Engrenagem → **App da Web**.
   - Executar como: **Eu**
   - Quem pode acessar: **Qualquer pessoa**
3. **Implantar** e copie o **URL do app da Web** (termina em `/exec`).

### Passo 4 — Planilha-modelo (o que o cliente copia)
1. Crie outra planilha em **sheets.new**, nome **Centro de Comando**.
2. **Extensões → Apps Script**. Cole [`cliente/Codigo.gs`](cliente/Codigo.gs).
3. Na linha `var SERVIDOR_URL = '...'`, troque pelo URL do Passo 3 (mantenha as aspas).
4. **+ → HTML**, nome **Ponte**, cole [`cliente/Ponte.html`](cliente/Ponte.html).
5. Engrenagem **Configurações do projeto** → marque **Mostrar arquivo de manifesto "appsscript.json"**. Abra esse arquivo e cole [`cliente/appsscript.json`](cliente/appsscript.json).
6. Salve. Na planilha, clique em **Compartilhar → Qualquer pessoa com o link → Leitor**.
7. Copie o link da planilha e troque o final `/edit...` por **`/copy`**. Exemplo:
   `https://docs.google.com/spreadsheets/d/ABC123/copy`
8. Cole esse link na aba **Config** do Painel de Licenças, linha **Link de cópia do modelo**.

Pronto! Está tudo no ar.

---

## No dia a dia

| Quero… | Faço… |
|---|---|
| **Vender** | 🔐 Licenças → **📊 Painel de acompanhamento** → digite o nome → **➕ Nova licença**. Copie a mensagem pronta e mande no WhatsApp. |
| **Ver quem está usando** | 📊 Painel de acompanhamento (ou as abas *Clientes* e *Instalações*). |
| **Bloquear quem não pagou** | No painel, botão **⛔ Bloquear** (ou mude o Status para *Bloqueada* na aba Clientes). |
| **Liberar de novo** | Botão **✅ Liberar**. |
| **Cliente trocou de conta/planilha** | Aba *Instalações* → selecione a linha → 🔐 Licenças → **🧹 Remover instalação**. Ele ativa de novo. |
| **Permitir 2 planilhas para um cliente** | Aba *Clientes*, coluna **Máx. instalações** → 2. |
| **Licença com prazo** | Coluna **Validade** → coloque a data. Depois dela, trava sozinha. |
| **Atualizar o painel de todos** | Troque o conteúdo do `painel.html` no Drive (Gerenciar versões → Enviar nova versão) → 🔐 Licenças → **🚀 Publicar nova versão**. |

## O que o cliente recebe pronto (sem IA)

Todas as abas do painel continuam funcionando, salvando na planilha dele:
pendências, COFIN, escala, numerador, material, setores, reprografia (envio de arquivos vai para o Drive dele),
inventário e LCM (gera o Excel e salva no Drive), recibos, links, contatos, bloco de notas, checklist, backup.

As partes que liam **as suas planilhas** do Drive passam a ler as **planilhas dele**: na aba **Fontes** da planilha do cliente,
ele cola o ID das planilhas dele na coluna C. Veja [docs/GUIA-CLIENTE.md](docs/GUIA-CLIENTE.md).

## Para quem mexe no código

- `cliente/Ponte.html` — substitui `window.claude.use(...)` (banco, Drive, arquivos, downloads, usuário) por chamadas `google.script.run`.
- `cliente/Codigo.gs` — menu, licença, cópia do painel no Drive, banco na aba oculta `_banco` (JSON em pedaços de 45 mil caracteres), e as ferramentas do Drive.
- `servidor/Licencas.gs` — chaves, instalações, bloqueio, validade e entrega do painel só para licença ativa.
- `ferramentas/preparar-painel.mjs` — pega o HTML exportado do Claude e gera `dist/painel.html`.
  `node ferramentas/preparar-painel.mjs painel-original.html`
- Testes: `node testes/logica.cjs` (licenças e banco) e `node testes/navegador.cjs` (abre o painel com a ponte no Chromium).
