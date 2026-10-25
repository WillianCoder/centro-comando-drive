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

## Qual painel subir

- **`dist/painel-limpo.html` → para VENDER.** Sem os dados da sua seção (demandas, material, links, efetivo, nomes, e-mail). O cabeçalho mostra a unidade de cada cliente.
- `dist/painel.html` → o seu, com os seus dados. **Não use para vender.**

O botão **🩺 Verificar instalação** avisa se você subiu o painel errado.

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
1. Baixe o arquivo [`dist/painel-limpo.html`](dist/painel-limpo.html) (botão **Download raw file**).
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
   Faça de novo: **+ → HTML**, nome **Extras**, cole [`cliente/Extras.html`](cliente/Extras.html).
5. Engrenagem **Configurações do projeto** → marque **Mostrar arquivo de manifesto "appsscript.json"**. Abra esse arquivo e cole [`cliente/appsscript.json`](cliente/appsscript.json).
6. Salve. Na planilha, clique em **Compartilhar → Qualquer pessoa com o link → Leitor**.
7. Copie o link da planilha e troque o final `/edit...` por **`/copy`**. Exemplo:
   `https://docs.google.com/spreadsheets/d/ABC123/copy`
8. Cole esse link na aba **Config** do Painel de Licenças, linha **Link de cópia do modelo**.

Pronto! Está tudo no ar.

---

## No dia a dia — 🔐 Licenças → 📊 Abrir painel de vendas

| Aba | Para quê |
|---|---|
| 🚨 **Avisos** | Cópia da chave em outra planilha, painel aberto fora do Google, chaves falsas, muita gente na mesma licença. Botões para bloquear ou perguntar no WhatsApp. |
| 📊 **Resumo** | Quanto entrou no mês e no total, gráfico dos últimos 6 meses, quem está atrasado (com botão **Cobrar no WhatsApp**), quem parou de usar. |
| ➕ **Vender** | Nome + WhatsApp + plano → **Criar licença**. Sai a mensagem pronta e o botão **WhatsApp ➜ enviar**. |
| 👥 **Clientes** | Buscar, filtrar atrasados, **⛔ Bloquear / ✅ Liberar**, **✏ Editar** (plano, valor, prazo, nº de instalações). |
| 💰 **Pagamentos** | Registrar pagamento (renova o prazo e reativa sozinho), histórico, total a receber. |
| 🏷 **Planos e preços** | Criar planos (Mensal, Anual, Vitalício…) e mudar valores. |
| 🧩 **Abas do cliente** | Esconder abas que o cliente não comprou e **criar abas novas**: Tabela (com as colunas que quiser), Checklist, Links ou Anotações. Vale para um cliente ou para todos. |
| 🧑‍💼 **Gestores** (só mestre) | Criar um gestor/responsável com as permissões que você marcar. Ele ganha um link próprio. Bloquear, liberar, trocar o link. |
| 📜 **Atividade** | Tudo o que foi feito, por quem e quando (você e cada gestor). Tentativas sem permissão aparecem em vermelho. |
| 🔗 **Links e ajustes** | Link para mandar ao cliente, endereço do servidor, Pix, WhatsApp e nome do produto. |

| Quero… | Faço… |
|---|---|
| **Bloquear quem não pagou** | Aba Clientes, botão **⛔ Bloquear** (ou mude o Status para *Bloqueada* na aba Clientes da planilha). |
| **Liberar de novo** | Botão **✅ Liberar**. |
| **Cliente trocou de conta/planilha** | Aba *Instalações* → selecione a linha → 🔐 Licenças → **🧹 Remover instalação**. Ele ativa de novo. |
| **Permitir 2 planilhas para um cliente** | Aba *Clientes*, coluna **Máx. instalações** → 2. |
| **Licença com prazo** | Coluna **Validade** → coloque a data. Depois dela, trava sozinha. |
| **Atualizar o painel de todos** | Troque o conteúdo do `painel.html` no Drive (Gerenciar versões → Enviar nova versão) → 🔐 Licenças → **🚀 Publicar nova versão**. |

## Automático (sem IA, sem você fazer nada)

- **Todo dia às 7h:** marca licenças vencidas, avisa quem vence em até 3 dias e manda um resumo para o seu e-mail.
- **Toda segunda:** backup da sua planilha de licenças (pasta *Centro de Comando — backups*, guarda 8).
- **No cliente, todo dia às 3h:** backup dos dados do painel dele (guarda 14). Ele restaura pelo menu ⚙ → ♻ Restaurar um backup.
- **🩺 Verificar instalação** (menu 🔐 Licenças ou aba 🔗 Links): confere tudo e diz o que falta.

## Gestores (painel do responsável)

Você é o **mestre**. No painel de vendas, aba **🧑‍💼 Gestores**, crie um gestor e marque o que ele pode fazer:
ver clientes, vender, registrar pagamentos, bloquear/liberar, editar, mudar preços, montar abas, ver avisos.
Ele recebe um **link próprio** (botão "Mandar link no WhatsApp") e abre no celular ou computador, sem precisar da sua planilha.

- Ele só vê os clientes que **ele** vendeu (a não ser que você marque "Ver clientes de todos").
- Ele **nunca** vê os gestores, os ajustes, o endereço do servidor, nem consegue bloquear você.
- Tudo o que ele faz aparece na aba **📜 Atividade**.
- **⛔ Bloquear gestor** corta o acesso na hora. **🔄 Trocar link** invalida o link antigo.
- Para o link funcionar, o servidor precisa estar implantado (Passo 3). Se você mudar o código, faça **Implantar → Gerenciar implantações → Editar → Nova versão**.

## Proteção contra cópia

Painel só é entregue para chave ativa, cópia da planilha não leva a licença, cada painel leva a marca do cliente,
o painel avisa se for aberto fora do Google, e os avisos graves chegam no seu e-mail e na aba **🚨 Avisos**.
Detalhes em [docs/PROTECAO.md](docs/PROTECAO.md).

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
  `node ferramentas/preparar-painel.mjs painel-original.html` (o seu) e `node ferramentas/preparar-painel.mjs --limpo painel-original.html` (para vender)
- `cliente/Extras.html` — abas escondidas e abas personalizadas (tabela, checklist, links, anotações), salvas no banco da planilha.
- Testes: `./testes/rodar-tudo.sh`
  - `testes/logica.cjs` — licenças, limite de instalações, bloqueio, validade, planos, pagamentos/renovação, abas, banco em pedaços.
  - `testes/painel-vendas.cjs` — abre o painel de vendas no Chromium e clica em tudo (vender, WhatsApp, pagamento, preço, abas, bloquear, celular) com o código real do servidor.
  - `testes/navegador.cjs` — abre o Centro de Comando com a ponte e testa as abas personalizadas.
