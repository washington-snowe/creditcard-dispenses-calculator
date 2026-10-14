# Saldo

Aplicativo desktop de finanças pessoais em **Node.js + Electron**, com interface React e TypeScript. Funciona offline após a instalação, sem conta ou servidor externo.

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
- Filtrar por cartão, pesquisar compras e separar compras quitadas e em andamento.
- Consultar o histórico de compras, saldo e parcelas mensais de cada cartão e o total de todos.
- Explorar gráficos de distribuição por cartão, previsão mensal e comparação de saldos.
- Abrir cada mês do planejamento para ver **todas as parcelas individuais** e os totais por cartão, até a quitação. Gráficos longos podem ser navegados em blocos de 12 meses.
- Exportar e restaurar backups JSON. A restauração substitui os dados atuais após confirmação; um arquivo inválido é rejeitado.

A primeira execução começa vazia. O botão **Experimentar exemplo** carrega dados fictícios somente após confirmação.

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
