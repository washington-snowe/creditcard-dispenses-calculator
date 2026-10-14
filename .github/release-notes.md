**Saldo 4.0 — rendas recorrentes, saldo entre meses, despesas e Ultra Dark.**

Baixe **Saldo-Windows-x64.zip**, extraia a pasta inteira e abra **saldo.exe**. Windows de 64 bits; não precisa instalar Node.js.

### Novidades

- **Rendas recorrentes:** cadastre recebimentos mensais, trimestrais ou anuais, com origem, valor, dia e período. Diferencie renda prevista de dinheiro recebido e confirme a data real do recebimento. Busca e filtros por origem e situação.
- **Saldo entre meses:** transporte sobras e déficits automaticamente depois de definir o mês e o saldo inicial. O histórico usa movimentos efetivos; meses futuros mostram a projeção. Edições e exclusões recalculam os valores.
- **Despesas fora do cartão:** registre Pix, boleto, dinheiro, débito e transferência com categoria, favorecido, vencimento e pagamento. Filtros e indicadores mostram pendências, atrasos e valores pagos.
- **Orçamento completo:** entradas recebidas e previstas, saldo transportado, faturas, assinaturas e despesas alimentam o cálculo de quanto sobrará. Confirmar um pagamento ou recebimento mantém a projeção coerente com o dinheiro real.
- **Ultra Dark:** nova aparência quase preta, fontes Manrope e DM Sans, opção Inter, cartões com mais profundidade, glow e animações suaves.
- **Personalização:** paletas prontas, seletor de cor personalizada e controles independentes de glow e movimento. Preferências persistentes e fontes incluídas para uso offline.
- Preserva cartões, compras, gráficos, filtros globais, antecipações, assinaturas, backups e o atualizador pelo GitHub.

### Como atualizar

Na versão 3.0.1, abra **Atualizações → Verificar atualizações → Baixar atualização → Reiniciar e atualizar**. O aplicativo verifica o ZIP e prepara a nova versão com backup dos dados. Mantenha a pasta do executável original, que continuará abrindo a versão atualizada.

Para atualizar manualmente, feche o aplicativo antigo, extraia esta pasta inteira e abra o novo **saldo.exe**. Os dados das versões anteriores são preservados na mesma pasta, sem recadastro.

Em **Entradas do mês → Saldo entre meses**, configure o ponto inicial para ativar o transporte automático; evite cadastrar o mesmo saldo também como entrada. Em **Aparência**, escolha seu tema e clique em **Aplicar aparência**.

O atualizador usa as releases publicadas neste repositório. Mudanças em `main` entram no aplicativo quando uma nova versão com ZIP e checksum é publicada.

### Validação

A publicação exige 42 testes de cálculos e validação, os fluxos do aplicativo Windows empacotado, persistência após reiniciar e compatibilidade com dados antigos. Também testa uma atualização real no Windows, preservando rendas, despesas e preferências: checksum, extração, versão interna, backup, redirecionamento do executável original, retorno automático em caso de falha e rejeição de caminhos inválidos no ZIP.

**SHA256SUMS.txt** contém o checksum do ZIP. Seus registros ficam localmente em `%APPDATA%/saldo-desktop/finances.json`. A distribuição é portátil. Marcar pagamentos apenas registra os valores; não movimenta dinheiro no banco.
