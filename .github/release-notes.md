**Saldo 3.0 — entradas, assinaturas e atualização pelo GitHub.**

Baixe **Saldo-Windows-x64.zip**, extraia a pasta inteira e abra **saldo.exe**. Windows de 64 bits; não precisa instalar Node.js.

### Novidades

- **Entradas do mês:** adicionar, reduzir, editar e excluir valores, com descrição, data e origem; busca e filtros por origem e tipo.
- **Quanto sobrará:** orçamento mensal com entradas líquidas, faturas e assinaturas pagas ou pendentes. Pagar a fatura não aumenta artificialmente a sobra; antecipações entram no mês do desembolso.
- **Assinaturas:** recorrências mensais, trimestrais ou anuais, no cartão ou fora dele, com início, fim opcional, fornecedor, categoria, filtros e marcação de pagamento.
- Assinaturas no cartão entram na fatura e no pagamento do mês inteiro. Valores e cartões já registrados no histórico são preservados ao editar a recorrência.
- Gráficos mensais e planejamento incluem assinaturas, com navegação entre meses.
- **Atualizações:** consulta novas versões publicadas no GitHub, baixa e verifica o ZIP, cria backup dos dados e reinicia o aplicativo. Se a nova versão não carregar os dados, volta à anterior.
- Mantém tema claro/escuro, cartões estilizados, filtros globais, simulação de quitações, antecipações e backups das versões anteriores.

### Como atualizar

Feche a versão antiga, extraia esta pasta inteira e abra o novo **saldo.exe**. Os dados das versões 1 e 2 são preservados na mesma pasta, sem recadastro. A versão 3 inclui o atualizador para as próximas versões: **Atualizações → Verificar atualizações**. Mantenha a pasta do executável original, que continuará abrindo a versão atualizada.

O atualizador usa as releases publicadas neste repositório; alterações em `main` chegam ao aplicativo quando uma nova versão com ZIP e checksum é publicada. Não instala Git nem compila o código no computador do usuário.

Entradas não são transferidas automaticamente de um mês para outro. Assinaturas anuais e trimestrais entram somente nos meses de renovação. Meses antigos de assinaturas não são acumulados automaticamente; selecione o mês para registrar um pagamento atrasado.

### Validação

A publicação exige os testes de cálculos e do atualizador, os fluxos do aplicativo Windows empacotado, a persistência após reiniciar e a leitura de dados antigos. Também testa a atualização real no Windows com pacotes locais de teste: checksum, extração, versão interna, abertura com dados, backup, redirecionamento do executável original, retorno automático em caso de falha e rejeição de caminhos inválidos no ZIP.

**SHA256SUMS.txt** contém o checksum do ZIP. Seus registros ficam localmente em `%APPDATA%/saldo-desktop/finances.json`. A distribuição é portátil, sem instalador assinado. Marcar pagamentos apenas registra os valores; não movimenta dinheiro no banco.
