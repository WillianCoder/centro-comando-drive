# Proteção contra cópia

Nenhum sistema que roda no navegador é 100% impossível de copiar. O objetivo aqui é:
**dificultar**, **descobrir quem copiou** e **avisar você na hora**.

| Proteção | Como funciona |
|---|---|
| Painel só com licença | O painel não vai na planilha-modelo. Ele só é entregue pelo seu servidor, para chave ativa. Quem copia o modelo sem chave não vê nada. |
| Cópia da planilha não leva a licença | Quando alguém faz "Fazer uma cópia" da planilha de um cliente, a chave não vai junto. Se tentar ativar com a mesma chave → **limite de instalações** + aviso 🚨. |
| Marca do cliente | Cada painel entregue leva o nome e a chave do cliente escondidos no código e um selo discreto "Licenciado para…". Se aparecer uma cópia por aí, você sabe de quem saiu. |
| Farol | Toda vez que o painel abre, ele avisa o servidor. Se abrir **fora do Google** (arquivo copiado, outro site), gera aviso 🚨 com a chave de origem. |
| Cópia local ilegível | A cópia guardada no Drive do cliente fica compactada (`sistema.dat`), não abre como página. |
| Chaves falsas | 3 chaves erradas em 1 hora na mesma planilha → aviso 🚨. |
| Muita gente na mesma licença | Mais contas Google que o limite (aba Config) → aviso ⚠. |
| E-mail | Avisos graves chegam no seu e-mail (aba Config → "Avisar por e-mail"). |
| Contrato | Arquivo `LICENSE` e termos na mensagem de venda (Lei 9.609/98). Para reforçar, dá para registrar o software no INPI. |

Os avisos ficam no painel de vendas, aba **🚨 Avisos**. Lá você pode bloquear o cliente na hora ou perguntar no WhatsApp.
