# ContaClara

Aplicativo desktop de finanças pessoais em **Node.js + Electron**, com interface React e TypeScript. Funciona offline após a instalação, sem conta ou servidor externo.

## Baixar para Windows

[**Baixar ContaClara 4.8.0 para Windows de 64 bits (ZIP)**](https://github.com/washington-snowe/creditcard-dispenses-calculator/releases/download/v4.8.0/ContaClara-Windows-x64.zip)

Extraia a pasta inteira e abra **saldo.exe**. Não é necessário instalar Node.js. A versão foi compilada e testada no Windows, incluindo os cálculos financeiros e a persistência dos dados após reiniciar o aplicativo.

A [página da versão](https://github.com/washington-snowe/creditcard-dispenses-calculator/releases/tag/v4.8.0) também contém o checksum do ZIP.

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

- Abrir **Início** para ver quanto falta pagar no mês e, quando houver pagamentos, o total já pago e o progresso. O resumo inclui parcelas de cartões, assinaturas e despesas, independentemente dos filtros das compras. Pagamentos seguem a data real do desembolso, incluindo antecipações.
- Conhecer cada função em cards interativos na tela de boas-vindas, com atalhos acessíveis pelo teclado.
- Usar **Buscar funções** no menu para encontrar telas pelo nome ou por termos como **pagar fatura**, **salário**, **parcelas caras**, **backup** e **tema escuro**. As sugestões abrem diretamente a função; use ↑/↓ e Enter. Com o menu recolhido, clique na lupa. **Ctrl+K** pesquisa funções e registros.
- Navegar com transições suaves, entrada gradual dos cards e efeitos nas ações. As preferências de animação, glow e redução de movimento do dispositivo continuam sendo respeitadas.
- Recolher ou expandir o menu lateral. A escolha fica salva em janelas maiores; em janelas pequenas, o menu pode ser aberto sobre o conteúdo e fechado com Esc. As funções estão agrupadas em Resumo, Movimentações, Planejamento e Configurações.

- Cadastrar vários cartões de qualquer banco, com apelido, últimos quatro dígitos, cor, vencimento e limite opcional. A lista mostra fatura, limite estimado disponível e situação. Abra **Ver detalhes** para ver compras, assinaturas, pagamentos e registrar a fatura paga. Edição e exclusão ficam em **Mais opções**; a comparação entre cartões é expansível.
- Cadastrar compras escolhendo banco e cartão; informar **valor total ou valor de cada parcela**, número de parcelas, parcelas já pagas, categoria e mês da próxima parcela.
- Consultar saldo devedor, pagamentos do mês, total já pago e última parcela prevista.
- Editar ou excluir compras, registrar um pagamento e corrigir pagamentos pelo formulário de edição.
- Filtrar globalmente por descrição, banco, cartão, categoria e status; totais, gráficos e planejamento seguem os mesmos filtros. Etiquetas permitem remover cada seleção separadamente, incluindo voltar ao mês atual. Faturas e limite estimado dos cartões consideram todos os seus registros, mesmo com filtros de compras ativos.
- Consultar o histórico de compras, saldo e parcelas mensais de cada cartão e o total de todos.
- Explorar gráficos de distribuição por cartão, previsão mensal e comparação de saldos. As caixas de valores aparecem acima dos gráficos, fora do recorte dos painéis, e se ajustam às bordas da janela.
- Abrir cada mês do planejamento para ver **todas as parcelas individuais** e os totais por cartão, até a quitação. Use as setas, o seletor de mês ou as barras dos gráficos para navegar por meses passados e futuros.
- Exportar e restaurar backups JSON em **Configurações → Dados e segurança**. A restauração substitui os dados atuais após confirmação; um arquivo inválido é rejeitado.

- Escolher tema claro, escuro ou **Ultra Dark**, paletas prontas ou uma cor personalizada; usar a tipografia oficial e ativar/desativar glow e animações suaves. As fontes vêm no aplicativo e as preferências são salvas no desktop e no backup.
- Marcar todas as parcelas pendentes de um cartão no mês atual como pagas, com confirmação e opção de desfazer.
- Comparar parcelas no gerenciador de antecipações por valor mensal, custo para quitar e alívio por real; sugerir uma seleção dentro do orçamento e simular o antes/depois.
- Registrar a antecipação de uma ou mais parcelas, ou a quitação de compras inteiras.
- Registrar entradas e reduções de dinheiro por data, descrição e origem; editar, excluir e filtrar por origem, tipo ou busca.
- Cadastrar **rendas recorrentes** mensais, trimestrais ou anuais; distinguir valores previstos dos recebidos e confirmar cada recebimento com sua data real.
- Transportar automaticamente sobras e déficits entre meses após configurar o saldo inicial.
- Cadastrar **despesas fora do cartão** por Pix, boleto, dinheiro, débito ou transferência, com categoria, favorecido, vencimento, filtros e registro de pagamento.
- Ver quanto sobrará no mês depois das faturas, assinaturas e despesas, incluindo pagamentos já registrados e os ainda pendentes.
- Cadastrar assinaturas mensais, trimestrais ou anuais, no cartão ou fora dele; definir início/fim e marcar cobranças como pagas.
- Verificar, baixar e aplicar novas versões publicadas no GitHub pela aba **Atualizações** no Windows x64.

A primeira execução começa vazia. O botão **Experimentar exemplo** carrega dados fictícios somente após confirmação.

## Atualizar das versões anteriores

Feche o aplicativo antigo, extraia a pasta da versão 4.4 inteira e execute o novo `saldo.exe`. A pasta de dados permanece a mesma; os registros das versões 1, 2 e 3 são aceitos sem recadastro. Backups antigos também continuam válidos.

A partir da versão 3, abra **Atualizações → Verificar atualizações → Baixar atualização → Reiniciar e atualizar**. O aplicativo consulta as releases estáveis de `washington-snowe/creditcard-dispenses-calculator`, baixa o ZIP por HTTPS e confere SHA-256, caminhos do arquivo e a versão interna do pacote. Não é necessário instalar Node.js ou Git. Alterações no código entram no aplicativo quando uma nova versão é publicada, com seu ZIP e checksum; um commit na branch principal sozinho não gera atualização.

A nova versão é preparada em `%APPDATA%/saldo-desktop/updates/versions/`, preservando a versão em uso até a confirmação. Antes da troca, o aplicativo espera as gravações terminarem e cria uma cópia de `finances.json` em `updates/finances-before-...json`. A troca é confirmada após a nova versão abrir e validar os dados. Se isso falhar, o processo retorna à versão anterior.

A partir da versão 4.7.4, a limpeza automática remove os ZIPs, downloads parciais e pastas temporárias após cada tentativa. Depois de confirmar a atualização, remove também as versões antigas em `updates/versions/`, mantendo somente a atual. O mesmo processo elimina os arquivos acumulados pelas versões anteriores. Uma versão já baixada e pronta para instalar permanece disponível até a troca ou até fechar o aplicativo. Arquivos bloqueados pelo Windows são tratados novamente na próxima abertura ou atualização. Os registros financeiros, backups automáticos, cópias `finances-before-...json` e arquivos não reconhecidos como pertencentes ao atualizador são preservados. Diretórios com links ou arquivos de dados/backups também são preservados por segurança.

A pasta portátil originalmente extraída pelo usuário não é apagada: seu executável continua funcionando como entrada para a versão atualizada; mantenha sua pasta e os demais arquivos. A limpeza automática fica restrita à pasta gerenciada pelo atualizador, sem remover outras pastas de instalação ou downloads manuais. No navegador e em outros sistemas, a aba permite abrir a página de versões para download manual.

## Entradas, saldo entre meses e despesas

Em **Entradas do mês**, registre dinheiro recebido ou previsto, com descrição, origem e data. Uma entrada prevista participa da projeção, mas só entra no saldo real ao confirmar o recebimento. Em **Rendas recorrentes**, configure descrição, origem, valor, frequência, dia, início e fim opcional. Confirme cada recebimento separadamente; a data real define o mês em que o dinheiro entrou. Editar uma recorrência preserva os valores e origens já recebidos. Para interrompê-la mantendo o histórico, informe o último mês. **Registrar redução** adiciona outros gastos ou ajustes que diminuem a disponibilidade. Você também pode corrigir valores ou remover um movimento em **Mais opções**. Os filtros alteram a listagem; os totais e a comparação por origem continuam mostrando o mês inteiro.

O cálculo de **Quanto sobrará no mês** é: **saldo inicial do mês + entradas recebidas + entradas previstas − reduções − pagamentos registrados no mês − valores ainda pendentes**. Assim, pagar uma fatura apenas transfere seu valor de pendente para pago, sem aumentar artificialmente a sobra. Antecipações são descontadas no mês real do pagamento, sem repetir o desconto no futuro. O saldo previsto considera somente os registros cadastrados e pode ficar negativo. Em **Saldo entre meses**, ative **Transportar saldo automaticamente**, escolha o mês inicial e informe seu saldo disponível, positivo ou negativo. O transporte começa nesse ponto: usa os movimentos reais dos meses anteriores e as projeções dos meses futuros. O valor projetado é identificado separadamente do saldo com pagamentos e recebimentos efetivos. Alterações e exclusões recalculam o transporte automaticamente. Não registre esse mesmo saldo inicial também como entrada. Sem ativar essa configuração, cada mês continua independente.

Em **Despesas**, registre gastos fora do cartão com descrição, favorecido, categoria, forma de pagamento e vencimento. Filtre por busca, categoria, método e situação. Marque o pagamento com a data real: uma despesa paga sai dos pendentes e entra no desembolso desse mês. Despesas vencidas ainda abertas aparecem no mês atual. Não duplique a mesma despesa como redução, assinatura ou compra no cartão.

## Assinaturas

Em **Assinaturas**, defina fornecedor, valor, categoria, frequência, dia de cobrança, mês inicial e último mês opcional. Uma assinatura no cartão integra sua fatura cadastrada e é marcada como paga junto dela; uma assinatura fora dos cartões também é descontada no orçamento. Não cadastre o mesmo serviço como compra e assinatura, nem repita a fatura como uma redução. Renovações anuais e trimestrais aparecem apenas nos meses de cobrança. Datas como dia 31 são ajustadas ao último dia de meses menores.

Meses antigos de assinaturas não são acumulados automaticamente como atrasos no mês atual. Para registrar um pagamento atrasado, selecione o mês da cobrança e marque a assinatura como paga; o desembolso entra no mês atual. Editar valor ou cartão preserva os pagamentos já registrados. Para interromper uma recorrência e manter seu histórico, preencha o último mês; excluir a assinatura remove também seus pagamentos, após confirmação.

## Pagamentos, meses e antecipações

O seletor de mês altera as parcelas do período, o calendário, a situação da fatura cadastrada e os gráficos. O saldo devedor total continua sendo o saldo atualmente pendente. Os meses antigos usam as parcelas já pagas e o mês informado para estimar o histórico; os novos pagamentos registram o mês real em que foram anotados.

Nos detalhes de cada cartão, **Marcar mês como pago** registra todas as parcelas vencidas e do mês atual daquele cartão e as assinaturas cobradas nele no período, inclusive registros ocultos por filtros. A confirmação lista os itens e o valor integral. O botão fica desabilitado fora do mês atual. Pagamentos não são enviados ao banco.

Em **Antecipações**, a classificação por maior parcela mostra o maior valor mensal; a classificação por alívio por real compara a parcela com o custo total para quitar a compra. A sugestão de orçamento seleciona compras por essa eficiência sem exceder o valor informado; ela pode ser ajustada e não promete uma combinação matematicamente ótima. A simulação mostra as parcelas futuras antes/depois; o custo integral à vista aparece separadamente. Não há estimativa de desconto ou juros do banco.

Você também pode antecipar as próximas N parcelas em Minhas compras. A próxima cobrança avança N meses; quitar a compra elimina todos os compromissos futuros dela. O botão Desfazer permite reverter até 20 alterações de dados na sessão. Alterar o valor ou o total de parcelas no formulário de edição recalcula o histórico da compra.

## Navegação e interface

O menu lateral tem quatro áreas: **Resumo**, **Movimentações**, **Planejamento** e **Configurações**. As telas de cada área aparecem na faixa superior. Ao voltar a uma área, a última tela visitada é lembrada durante a sessão. A busca geral com Ctrl + K também abre registros de qualquer área.

Com dados cadastrados, o início mostra por padrão **disponível para gastar, pagamentos do mês e próximos compromissos**. Comparações e atalhos explicativos podem ser ativados e ordenados em Personalizar início; escolhas anteriores são preservadas. As sugestões de funções aparecem inicialmente quando ainda não há dados. O tema mantém Manrope e Inter, com superfícies neutras, espaçamentos consistentes e cores de situação concentradas nos indicadores. Glow permanece opcional, com efeitos discretos.

Filtros de entradas, rendas, despesas e assinaturas são mantidos ao navegar durante a sessão e reiniciados ao recarregar a janela ou restaurar um backup. Filtros avançados de compras abrem pelo botão **Filtros**. Em compras, pagamento e edição ficam visíveis; antecipação e exclusão ficam em **Mais opções**, que funciona também pelo teclado. Ações destrutivas continuam exigindo confirmação.

Exportação e importação de backups JSON ficam em Configurações → Dados e segurança. Alterações de tema, privacidade e menu usam o indicador de salvamento sem avisos repetidos. Janelas só fecham pelo fundo quando o clique começa e termina fora dos limites; clicar no espaçamento interno ou arrastar do formulário para fora não descarta o preenchimento. O foco retorna ao controle anterior ao fechar.

## Planejamento e ferramentas

- **Quanto posso gastar?** separa o saldo com renda recebida da projeção com renda prevista e desconta compromissos pendentes e a reserva mensal configurável. O saldo entre meses segue a configuração de Entradas do mês; sem ela, o cálculo considera o próprio mês. A reserva é um valor reservado no planejamento, não uma movimentação bancária.
- **Calendário** mostra entradas, despesas, assinaturas fora do cartão, faturas e fechamentos. As faturas agrupam compras e assinaturas do cartão sem duplicar valores. Clique em um dia e em um lançamento para abrir os detalhes.
- **Simular compra** compara prazos conforme o dia de fechamento e de vencimento e permite conferir o impacto de todas as parcelas nas faturas e no saldo projetado após a reserva. A primeira fatura deve ser neste mês ou depois. A simulação não grava uma compra; o botão de continuar preenche um formulário para revisão. Configure o fechamento no cartão. Compras no fechamento são consideradas na fatura desse dia; confirme datas e limites no banco.
- **Pendências** reúne vencidas, próximos sete dias, renovações e categorias “Outros” para revisar. Os avisos seguem os dados cadastrados e o mês selecionado.
- **Busca geral** abre pela lupa ou por **Ctrl + K**, incluindo compras, cartões, assinaturas, despesas, entradas e rendas recorrentes. Use setas e Enter para abrir um resultado.
- Clique nas barras mensais, nos setores e legendas por cartão e nas categorias da comparação para ver os lançamentos e valores correspondentes. Os detalhes mensais também têm botões acessíveis pelo teclado. A comparação considera despesas pelo mês de cobrança, separadamente do fluxo de caixa por data de pagamento.
- **Personalizar início** permite ocultar, mostrar e reordenar os cards usando as setas. O botão do olho oculta valores também em gráficos e dicas; isso é uma proteção visual, sem criptografar os arquivos. Em Aparência, escolha listas compactas ou confortáveis. Formulários revelam opções adicionais conforme necessário e abrem detalhes existentes ao editar.

## Importar faturas e proteger os dados

Em **Dados e segurança**, importe arquivos **CSV** com cabeçalho ou **OFX** (até 5 MB e 1.000 lançamentos). A prévia mostra datas, valores, categorias, erros e possíveis duplicatas. CSV aceita separador por vírgula, ponto e vírgula ou tabulação, datas brasileiras/ISO e valores brasileiros ou decimais com ponto. Se necessário, escolha as colunas manualmente.

Para faturas, selecione o cartão, o mês da fatura e o sinal usado nas compras. Cada linha selecionada vira uma compra de uma parcela. Quando o arquivo trouxer uma parcela individual, importe apenas a fatura desejada e ajuste o parcelamento manualmente se quiser projetar as demais; não importe novamente compras já cadastradas. Créditos/estornos e possíveis duplicatas são bloqueados na prévia. Para extratos, os valores positivos viram entradas recebidas e os negativos, ajustes de saída. Exclua da seleção os pagamentos de fatura e outras saídas já cadastradas para evitar dupla contagem. Confirme somente os registros desejados. A importação pode ser desfeita em uma única ação.

Backups automáticos ficam na subpasta **backups** dos dados do aplicativo. Uma cópia é criada ao usar/salvar o aplicativo quando passaram 24 horas desde a última; são mantidas até **30 versões**. Também é possível criar uma cópia imediatamente e restaurar uma versão pela lista. A restauração exige confirmação e cria uma cópia do estado atual antes da troca. Erros ao preservar essa cópia impedem a restauração. O histórico para desfazer mantém até 20 alterações durante a sessão e preserva as preferências atuais. No navegador, há até cinco cópias sujeitas à quota do armazenamento local. Para proteção contra perda do dispositivo, exporte cópias para outro local.

## Como os cálculos funcionam

Todos os valores são armazenados em centavos inteiros. O valor informado deve incluir eventuais juros: o aplicativo não calcula taxas bancárias. Para compras com valor total, os centavos restantes da divisão são distribuídos nas primeiras parcelas. Por exemplo, R$ 100,00 em 3 parcelas fica em R$ 33,34 + R$ 33,33 + R$ 33,33; com a primeira paga, restam R$ 66,66.

O mês informado é o da **próxima parcela não paga**. Registrar um pagamento aumenta o número de parcelas pagas e avança esse mês em um. Ao corrigir o número de parcelas pagas manualmente, informe também o mês correto da próxima parcela.

O calendário agrupa parcelas vencidas e não pagas no mês atual e mantém as demais no mês previsto. Um mês sem parcelas tem total zero. Compras quitadas permanecem no histórico e saem da previsão. O planejamento das parcelas é mensal; o calendário distribui as faturas pelo vencimento cadastrado e mostra fechamentos quando informados.

O saldo por cartão considera somente as compras cadastradas, não a fatura real do banco. Não há integração bancária nem marcação automática de pagamentos. O limite cadastrado serve para comparar o saldo pendente com o limite informado.

## Identidade visual e aparência

Os arquivos oficiais ficam em `public/brand/logo.png` e `public/brand/icon.png`, preservados no repositório. Dentro da interface, uma máscara de luminância usa o desenho original e remove visualmente o fundo preto, sem redesenhar a marca. A logo acompanha a cor de texto de cada tema para manter contraste; a versão completa aparece na barra lateral expandida e na abertura, e o símbolo aparece na navegação compacta. `icon.ico` inclui os tamanhos de 16 a 256 px para Windows.

Em **Aparência**, escolha Claro, Escuro ou Ultra Dark, selecione uma paleta ou use o seletor de cor personalizada. O texto ajusta o contraste à cor escolhida. A tipografia é fixa: Manrope Bold (700) no nome ContaClara, Manrope SemiBold (600) nos títulos e Inter nos menus, formulários, tabelas e valores. Os valores usam números tabulares para manter o alinhamento. As fontes estão incluídas para uso offline; preferências antigas de fonte são ignoradas sem alterar os registros financeiros. Controle glow e movimento separadamente e clique em **Aplicar aparência** para salvar. O aplicativo também respeita a preferência do sistema por movimento reduzido.

As definições de tipografia ficam centralizadas em `src/typography.css`. Os tamanhos relativos acompanham as preferências de texto do navegador e a escala do dispositivo. No desktop, use **Visualizar → Aumentar zoom / Diminuir zoom / Restaurar zoom**, acessível também pelo menu com a tecla Alt no Windows e pelos atalhos padrão. O conteúdo se reorganiza em janelas menores e com texto ampliado. Os nomes técnicos `saldo-desktop`, `saldo.exe` e a pasta de dados são mantidos para preservar a compatibilidade dos registros e do atualizador.

## Organização e leitura

O início destaca o valor que falta pagar; o valor pago e o disponível ficam em segundo plano. As personalizações anteriores de ordem e visibilidade são preservadas. **Personalizar início → Restaurar organização padrão** coloca o resumo em primeiro lugar.

As telas usam uma ação principal, divisórias discretas e menus de ações nos registros. Roxo identifica ações; verde indica pagamento concluído, amarelo pendência e vermelho atraso ou saldo negativo, sempre com texto ou ícone. A previsão mensal usa verde para pago e amarelo para a pagar, independentemente da cor de destaque escolhida.

Os formulários mantêm campos opcionais em seções expansíveis e mostram erros junto aos campos, associados para leitores de tela. O primeiro campo inválido recebe foco; se estiver em uma seção recolhida, ela é aberta. Sugestões com Tab, categorias automáticas, zoom, privacidade e redução de movimento continuam disponíveis.

O limite disponível de cada cartão é uma **estimativa**, calculada com o limite informado menos o saldo total das compras cadastradas, sem filtros. Valores não cadastrados e regras do banco podem alterar o limite real. Assinaturas do mês aparecem separadamente na composição da fatura.

## Sugestões de preenchimento e categorias

Os nomes de compras, assinaturas, despesas, entradas, rendas e cartões oferecem uma continuação discreta após duas letras, com preferência por nomes já cadastrados. Fornecedores, origens e favorecidos também aproveitam os registros locais. Pressione **Tab** para aceitar a parte opaca; o foco permanece no campo e o próximo Tab avança normalmente. **Shift+Tab** volta ao campo anterior. **Esc** dispensa a sugestão sem fechar o formulário. Sem sugestão, ou com o cursor no meio do texto, Tab mantém a navegação normal. A continuação nunca é gravada sem ser aceita. O preenchimento funciona offline e não envia os lançamentos a serviços externos.

Ao criar uma compra, assinatura ou despesa, o nome pode selecionar uma categoria provável: por exemplo, Notebook → Tecnologia, Netflix → Lazer, Conta de luz → Casa e Uber → Transporte. Correspondências com registros existentes usam a categoria mais frequente do mesmo nome; em empate, prevalece o cadastro mais recente. **A seleção é uma sugestão e pode precisar de correção.** Ao escolher uma categoria manualmente, a detecção para naquele formulário. Use **Detectar pelo nome** para retomá-la. Ao editar um registro, a categoria existente é preservada até você escolher alterá-la ou pedir a detecção.

A primeira abertura de uma instalação nova usa **Ultra Dark**, inclusive no fundo inicial da janela. Escolhas de tema já salvas são preservadas, assim como o comportamento de arquivos antigos sem configuração de tema.

Os cartões, incluindo suas prévias, mostram os símbolos reais dos 11 bancos da lista. As imagens são incluídas no aplicativo, com cores e proporções originais, sem moldura, borda ou fundo adicional, tanto nos cartões quanto nas prévias de cadastro. Bancos personalizados sem imagem correspondente usam um ícone neutro e o nome informado. As fontes e checksums das imagens ficam em `public/banks/sources.json`; parte dos favicons foi obtida do cache público dos sites oficiais. C6 e BTG usam versões vetoriais brancas com fundo transparente, obtidas da coleção Bancos-em-SVG e com a revisão de origem registrada. O aplicativo não consulta esses serviços durante o uso. As marcas pertencem às respectivas instituições.

## Desempenho e avisos

Em **Aparência → Desempenho**, ative ou desative **Usar aceleração de hardware**. A preferência é salva imediatamente, acompanha os backups e é aplicada antes da criação da janela na próxima inicialização. Quando mudar a configuração em uso, a tela mostra **Reinício necessário** e o botão **Reiniciar para aplicar**. Também é possível fechar e abrir o programa manualmente. O reinício espera as gravações pendentes; os dados financeiros são preservados. A aceleração fica permitida por padrão. O uso efetivo da GPU depende do computador e do driver; a tela informa a configuração em uso sem prometer ganho de velocidade. No navegador, essa opção fica desativada e o próprio navegador controla a aceleração.

O menu lateral anima a largura junto com o espaço do conteúdo, com entrada e saída suaves dos rótulos. A opção **Animações suaves** e a preferência do sistema por movimento reduzido continuam sendo respeitadas.

As cores de situação são independentes da cor de destaque: **verde** para pagamentos, entradas e saldo positivo; **amarelo** para pendências e atenção; **vermelho** para atrasos, saldo negativo e erros; **azul** para informações. Textos e ícones acompanham as cores para explicar os avisos. Os tons se ajustam aos temas Claro, Escuro e Ultra Dark.

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
npm run test:layout # dez telas, fontes oficiais, 320–1440 px e texto a 200%
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
