# Saldo

Aplicativo desktop de finanças pessoais em **Node.js + Electron**, com interface React e TypeScript. Funciona offline após a instalação, sem conta ou servidor externo.

## Baixar para Windows

[**Baixar Saldo 3.0.0 para Windows de 64 bits (ZIP)**](https://github.com/washington-snowe/creditcard-dispenses-calculator/releases/download/v3.0.0/Saldo-Windows-x64.zip)

Extraia a pasta inteira e abra **saldo.exe**. Não é necessário instalar Node.js. A versão foi compilada e testada no Windows, incluindo os cálculos financeiros e a persistência dos dados após reiniciar o aplicativo.

A [página da versão](https://github.com/washington-snowe/creditcard-dispenses-calculator/releases/tag/v3.0.0) também contém o checksum do ZIP.

## Executar no computador

Instale **Node.js 22.12 ou superior** (recomendado: Node.js 24 LTS), abra um terminal nesta pasta e execute:

```sh
npm ci
npm start
```

`npm start` compila a interface e abre a janela do Electron. No Linux, é necessário um ambiente gráfico e as bibliotecas do Chromium. Se o sistema exigir o sandbox SUID do Electron, siga a configuração oficial de permissões para `node_modules/electron/dist/chrome-sandbox`; não desative o sandbox para uso normal.

Para desenvolver somente a interface com atualização automática:

```sh
npm run dev
```

A interface no navegador usa um armazenamento local separado do aplicativo desktop. Exporte e importe o backup para transferir seus dados entre eles. O Electron usa a interface compilada; execute `npm start` novamente após alterações.

## O que você pode fazer

- Cadastrar vários cartões de qualquer banco, com apelido, últimos quatro dígitos, cor, vencimento e limite opcional.
- Cadastrar compras escolhendo banco e cartão; informar **valor total ou valor de cada parcela**, número de parcelas, parcelas já pagas, categoria e mês da próxima parcela.
- Consultar saldo devedor, pagamentos do mês, total já pago e última parcela prevista.
- Editar ou excluir compras, registrar um pagamento e corrigir pagamentos pelo formulário de edição.
- Filtrar globalmente por descrição, banco, cartão, categoria e status; totais, gráficos e planejamento seguem os mesmos filtros.
- Consultar o histórico de compras, saldo e parcelas mensais de cada cartão e o total de todos.
- Explorar gráficos de distribuição por cartão, previsão mensal e comparação de saldos.
- Abrir cada mês do planejamento para ver **todas as parcelas individuais** e os totais por cartão, até a quitação. Use as setas, o seletor de mês ou as barras dos gráficos para navegar por meses passados e futuros.
- Exportar e restaurar backups JSON. A restauração substitui os dados atuais após confirmação; um arquivo inválido é rejeitado.

- Alternar entre tema claro e escuro, com preferência salva no desktop e no backup.
- Marcar todas as parcelas pendentes de um cartão no mês atual como pagas, com confirmação e opção de desfazer.
- Comparar parcelas no gerenciador de antecipações por valor mensal, custo para quitar e alívio por real; sugerir uma seleção dentro do orçamento e simular o antes/depois.
- Registrar a antecipação de uma ou mais parcelas, ou a quitação de compras inteiras.
- Registrar entradas e reduções de dinheiro por data, descrição e origem; editar, excluir e filtrar por origem, tipo ou busca.
- Ver quanto sobrará no mês depois das faturas e assinaturas, incluindo pagamentos já registrados e os ainda pendentes.
- Cadastrar assinaturas mensais, trimestrais ou anuais, no cartão ou fora dele; definir início/fim e marcar cobranças como pagas.
- Verificar, baixar e aplicar novas versões publicadas no GitHub pela aba **Atualizações** no Windows x64.

A primeira execução começa vazia. O botão **Experimentar exemplo** carrega dados fictícios somente após confirmação.

## Atualizar das versões anteriores

Feche o aplicativo antigo, extraia a pasta da versão 3 inteira e execute o novo `saldo.exe`. A pasta de dados permanece a mesma; cartões e compras das versões 1 e 2 são aceitos sem recadastro. Backups antigos também continuam válidos.

A partir da versão 3, abra **Atualizações → Verificar atualizações → Baixar atualização → Reiniciar e atualizar**. O aplicativo consulta as releases estáveis de `washington-snowe/creditcard-dispenses-calculator`, baixa o ZIP por HTTPS e confere SHA-256, caminhos do arquivo e a versão interna do pacote. Não é necessário instalar Node.js ou Git. Alterações no código entram no aplicativo quando uma nova versão é publicada, com seu ZIP e checksum; um commit na branch principal sozinho não gera atualização.

A nova versão é preparada em `%APPDATA%/saldo-desktop/updates/versions/`, preservando a pasta anterior. Antes da troca, o aplicativo espera as gravações terminarem e cria uma cópia de `finances.json` em `updates/finances-before-...json`. A troca é confirmada após a nova versão abrir e validar os dados. Se isso falhar, o processo retorna à versão anterior. O executável original da versão 3 continua funcionando como entrada para a versão atualizada; mantenha sua pasta e os demais arquivos. No navegador e em outros sistemas, a aba permite abrir a página de versões para download manual.

## Entradas e assinaturas

Em **Entradas do mês**, registre dinheiro recebido, com descrição, origem e data. **Registrar redução** adiciona outros gastos ou ajustes que diminuem a disponibilidade. Você também pode corrigir valores pelo botão de edição ou remover um movimento. Os filtros alteram a listagem; os totais e a comparação por origem continuam mostrando o mês inteiro.

O cálculo de **Quanto sobrará no mês** é: **entradas − reduções − pagamentos registrados no mês − valores ainda pendentes**. Assim, pagar uma fatura apenas transfere seu valor de pendente para pago, sem aumentar artificialmente a sobra. Antecipações são descontadas no mês real do pagamento, sem repetir o desconto no futuro. O saldo previsto considera somente os registros cadastrados e pode ficar negativo. Não há transferência automática do saldo de um mês para outro; registre o saldo inicial como uma entrada se quiser incluí-lo.

Em **Assinaturas**, defina fornecedor, valor, categoria, frequência, dia de cobrança, mês inicial e último mês opcional. Uma assinatura no cartão integra sua fatura cadastrada e é marcada como paga junto dela; uma assinatura fora dos cartões também é descontada no orçamento. Não cadastre o mesmo serviço como compra e assinatura, nem repita a fatura como uma redução. Renovações anuais e trimestrais aparecem apenas nos meses de cobrança. Datas como dia 31 são ajustadas ao último dia de meses menores.

Meses antigos de assinaturas não são acumulados automaticamente como atrasos no mês atual. Para registrar um pagamento atrasado, selecione o mês da cobrança e marque a assinatura como paga; o desembolso entra no mês atual. Editar valor ou cartão preserva os pagamentos já registrados. Para interromper uma recorrência e manter seu histórico, preencha o último mês; excluir a assinatura remove também seus pagamentos, após confirmação.

## Pagamentos, meses e antecipações

O seletor de mês altera as parcelas do período, o calendário, a situação da fatura cadastrada e os gráficos. O saldo devedor total continua sendo o saldo atualmente pendente. Os meses antigos usam as parcelas já pagas e o mês informado para estimar o histórico; os novos pagamentos registram o mês real em que foram anotados.

**Marcar mês como pago** registra todas as parcelas vencidas e do mês atual daquele cartão e as assinaturas cobradas nele no período, inclusive registros ocultos por filtros. A confirmação lista os itens e o valor integral. O botão fica desabilitado fora do mês atual. Pagamentos não são enviados ao banco.

Em **Antecipações**, a classificação por maior parcela mostra o maior valor mensal; a classificação por alívio por real compara a parcela com o custo total para quitar a compra. A sugestão de orçamento seleciona compras por essa eficiência sem exceder o valor informado; ela pode ser ajustada e não promete uma combinação matematicamente ótima. A simulação mostra as parcelas futuras antes/depois; o custo integral à vista aparece separadamente. Não há estimativa de desconto ou juros do banco.

Você também pode antecipar as próximas N parcelas em Minhas compras. A próxima cobrança avança N meses; quitar a compra elimina todos os compromissos futuros dela. O botão Desfazer reverte a última alteração de dados na sessão. Alterar o valor ou o total de parcelas no formulário de edição recalcula o histórico da compra.

## Como os cálculos funcionam

Todos os valores são armazenados em centavos inteiros. O valor informado deve incluir eventuais juros: o aplicativo não calcula taxas bancárias. Para compras com valor total, os centavos restantes da divisão são distribuídos nas primeiras parcelas. Por exemplo, R$ 100,00 em 3 parcelas fica em R$ 33,34 + R$ 33,33 + R$ 33,33; com a primeira paga, restam R$ 66,66.

O mês informado é o da **próxima parcela não paga**. Registrar um pagamento aumenta o número de parcelas pagas e avança esse mês em um. Ao corrigir o número de parcelas pagas manualmente, informe também o mês correto da próxima parcela.

O calendário agrupa parcelas vencidas e não pagas no mês atual e mantém as demais no mês previsto. Um mês sem parcelas tem total zero. Compras quitadas permanecem no histórico e saem da previsão. O vencimento do cartão é informativo; o planejamento é mensal.

O saldo por cartão considera somente as compras cadastradas, não a fatura real do banco. Não há integração bancária nem marcação automática de pagamentos. O limite cadastrado serve para comparar o saldo pendente com o limite informado.

## Dados e privacidade

No desktop, os dados ficam em `finances.json` na pasta `userData` do Electron:

- Windows: `%APPDATA%/saldo-desktop/`
- macOS: `~/Library/Application Support/saldo-desktop/`
- Linux: `~/.config/saldo-desktop/`

A escrita usa arquivo temporário e renomeação, com gravação sincronizada antes de substituir o arquivo. Uma falha de leitura bloqueia a edição para preservar o arquivo existente. Não armazene número completo do cartão, CVV ou senhas. Dados e backups são arquivos locais, sem criptografia; mantenha uma cópia segura pelo botão de exportação.

## Validação

```sh
npm test          # cálculos, previsão, centavos, pagamentos e validação de backups
npm run build    # checagem TypeScript e build de produção
npm run test:ui  # fluxos completos no Chromium, backups e layout responsivo
npm run test:desktop # fluxos no Electron e persistência após reiniciar
npm run test:updater # somente Windows: extração, troca real, retorno e dados
```

Execute o build antes dos testes de interface. `test:ui` usa `/usr/bin/chromium`; configure `CHROMIUM_PATH` para outro caminho. `test:desktop` precisa de um display gráfico. No ambiente de nuvem atual, `SALDO_HEADLESS=1 npm run test:desktop` usa a plataforma headless do Electron. O Playwright desativa o sandbox do Chromium em seus testes; o aplicativo normal mantém `contextIsolation`, `sandbox` e bloqueio de acesso Node.js no renderer. Isso não valida o sandbox do sistema operacional em produção.

## Gerar o aplicativo desktop

```sh
npm run package
```

Gera o aplicativo portátil para o sistema e arquitetura atuais em `release/`. Ele já inclui o runtime do Electron, e o usuário final não precisa instalar Node.js. Execute `saldo.exe` no Windows, `Saldo.app` no macOS ou `saldo` no Linux dentro da pasta gerada; distribua a pasta inteira.

Prefira gerar e testar o pacote no sistema de destino. Para selecionar explicitamente outra plataforma, use `SALDO_PLATFORM` (`win32`, `darwin` ou `linux`) e `SALDO_ARCH` (`x64` ou `arm64`); pacotes de outra plataforma precisam ser validados nela. A configuração atual produz uma pasta portátil, não um instalador assinado. Assinatura e instaladores podem ser adicionados antes de distribuir publicamente.

## Ambiente na nuvem

Use o checkout existente em `/workspace/creditcard-dispenses-calculator`; cada tarefa já é isolada e não precisa de worktree. Os scripts reutilizáveis são `scripts/cloud-install.sh` e `scripts/cloud-start.sh`. Caches e arquivos temporários ficam em caminhos graváveis sob `/workspace`.

O script de instalação mantém verificação TLS e checksum dos artefatos do Electron. `NODE_USE_ENV_PROXY=1` permite que Node.js 24 use o proxy fornecido pela plataforma. Não é necessário cadastrar credenciais ou integrar um banco para desenvolver o aplicativo.
