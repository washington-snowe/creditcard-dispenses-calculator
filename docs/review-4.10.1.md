# Revisão de defeitos — 4.10.1

## Problemas corrigidos

- **Menu das dívidas comprimido:** `.row-actions .icon-button` também atingia os botões dentro do popover. Na reprodução, cada opção tinha 27 px de largura, embora o texto precisasse de até 101 px. A regra passou a atingir apenas os controles diretos da linha; itens do menu têm estilo próprio, ícones de tamanho estável, rótulos que podem quebrar linha e altura mínima de 44 px.
- **Menus de uma única opção:** o componente compartilhado mostra a ação diretamente quando há uma opção e não renderiza um menu vazio. Compras quitadas mostram Excluir compra; a lista compacta de compras em andamento mostra Antecipar parcelas. Confirmações e permissões de edição são mantidas.
- **Recebimentos ausentes no calendário:** uma renda recorrente recebida em outro mês era associada somente à competência original, ficando fora do calendário da data real. Recebimentos agora usam a data e os dados históricos registrados. Vários períodos recebidos no mesmo mês têm chaves distintas; a previsão continua na competência correspondente e não duplica o recebimento.
- **Entradas inválidas na pasta de backups:** pastas e links com nomes de backup podiam ser listados como cópias, impedir uma cópia diária ou provocar falha ao aplicar retenção. A listagem aceita apenas arquivos regulares e ignora entradas removidas durante a leitura. Pastas, links e arquivos não reconhecidos permanecem intactos.
- **Frases extensas e pouco inspiradoras:** as 200 mensagens foram reescritas, com 32 a 88 caracteres. O bloco usa quebra equilibrada, mantém o tamanho legível e cresce quando necessário, sem reticências nem corte do texto.

## Cobertura das verificações

Os testes de regressão verificam menus em sete contextos, ações únicas diretas, execução de ações, teclado, foco após fechar caixas, três temas, limites da janela e texto ampliado. As 200 frases são medidas no layout, incluindo telas estreitas e aumento de texto.

A suíte existente cobre cálculos em centavos, parcelas, antecipações, faturas, rendas, despesas, assinaturas, metas, filtros, pesquisa, importação, duplicatas, privacidade, desfazer, backups, restauração e persistência. A distribuição para Windows também verifica atualização, retorno após falha, integridade dos arquivos e preservação dos dados.

Esta revisão registra os problemas reproduzidos e a cobertura exercitada; novas combinações de dados e ambientes podem revelar outros defeitos.
