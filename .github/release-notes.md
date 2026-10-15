**ContaClara 4.2 — boas-vindas, navegação organizada e gráficos mais claros.**

Baixe **ContaClara-Windows-x64.zip**, extraia a pasta inteira e abra **saldo.exe**. Funciona offline e não exige Node.js.

### O que mudou

- **Boas-vindas:** a nova tela Início explica as funções em oito cards interativos, com atalhos pelo mouse e teclado. Inclui sugestões para cadastrar o primeiro cartão ou experimentar dados fictícios.
- **Resumo do mês:** mostra quanto falta pagar em parcelas, assinaturas e despesas. Quando existem pagamentos registrados no mês, apresenta também o total já pago e o progresso. Sem pagamentos, esse bloco é omitido. O seletor permite explorar outros meses; os filtros das compras não escondem valores desse resumo.
- **Gráficos legíveis:** as caixas de valores ficam em uma camada acima dos gráficos e do centro da rosca, sem serem cortadas pelos painéis. O posicionamento acompanha rolagem, redimensionamento e zoom, respeitando as bordas da janela.
- **Logo sem fundo na interface:** o desenho oficial é exibido sem o bloco preto e acompanha o contraste de cada tema. Os arquivos originais permanecem preservados.
- **Menu recolhível:** recolha a barra lateral para ampliar o conteúdo. A preferência fica salva em janelas maiores; em janelas pequenas, abra o menu sobre o conteúdo e feche com Esc ou ao escolher uma função.
- **Mais organização:** navegação dividida em Acompanhar, Organizar, Planejar e Preferências; exportação e importação reunidas em **Opções de backup (•••)** no topo.
- Mantém tipografia oficial Manrope e Inter, temas Claro/Escuro/Ultra Dark, cores, efeitos, acessibilidade, rendas, saldo entre meses, despesas, cartões, compras, assinaturas, filtros, antecipações e backups.

### Como atualizar

Abra **Atualizações → Verificar atualizações → Baixar atualização → Reiniciar e atualizar**. O programa prepara um backup e preserva os dados.

Para atualizar manualmente, feche o aplicativo antigo, extraia a pasta completa e abra **saldo.exe**. A pasta de dados permanece `%APPDATA%/saldo-desktop/`; não é necessário recadastrar informações. O nome técnico do executável e o ZIP Saldo-Windows-x64.zip são mantidos para compatibilidade com o atualizador das versões anteriores; os dois ZIPs contêm o mesmo aplicativo ContaClara.

### Validação

43 testes de cálculos e validação de dados, fluxos financeiros completos, novos resumos mensais com e sem pagamentos, atalhos dos cards, menu recolhível persistente e menu compacto. Verificação real de sobreposição dos valores nos três gráficos, nos temas Claro/Escuro/Ultra Dark, onze telas de 320 a 1440 px e texto ampliado a 200%. A publicação também testa o aplicativo Windows empacotado, persistência, dados antigos, zoom real, atualização com backup e recuperação após falha simulada.

**SHA256SUMS.txt** contém os checksums dos arquivos. Seus dados financeiros continuam locais. Marcar pagamentos apenas registra valores; não movimenta dinheiro no banco.
