**ContaClara 4.6.0 — interface mais coesa e menos carregada.**

Baixe **ContaClara-Windows-x64.zip**, extraia a pasta inteira e abra **saldo.exe**.

### O que mudou

- **Quatro áreas no menu:** Resumo, Movimentações, Planejamento e Configurações. As telas de cada área ficam na faixa superior; a última visitada é lembrada durante a sessão.
- **Início enxuto:** três blocos por padrão — disponível para gastar, pagamentos do mês e próximos compromissos. Atalhos explicativos aparecem no primeiro uso ou quando ativados. Personalizações anteriores são preservadas; “Restaurar organização padrão” aplica o novo início.
- **Identidade uniforme:** títulos curtos, Manrope e Inter oficiais, espaçamentos e bordas consistentes, superfícies neutras e cores de situação nos indicadores. Menos sombras, gradientes e brilho; glow discreto continua opcional.
- **Ações organizadas:** filtros avançados abrem pelo botão Filtros; antecipação e exclusão das compras ficam em Mais opções. Exportar e importar backups JSON ficam em Configurações → Dados e segurança. Explicações extensas ficam em detalhes expansíveis.
- **Menos avisos repetidos:** tema, privacidade e recolhimento do menu usam o indicador de salvamento.

### Correções

- Clicar no espaçamento interno de uma janela ou arrastar do formulário para fora não fecha mais o preenchimento. O clique fora continua funcionando, assim como Esc e Cancelar.
- Foco restaurado ao fechar janelas, inclusive ao trocar da busca para um formulário.
- Filtros de entradas, rendas, despesas e assinaturas mantidos ao navegar e reiniciados ao restaurar backup ou recarregar a janela.
- Seletores de cartão e banco deixam de apontar para opções removidas.
- Menus de ações abrem posicionados acima da tabela, sem recorte ou salto inicial para o canto da tela.

### Validação e atualização

61 testes financeiros e de persistência, mais fluxos completos da interface e do desktop. Verificações específicas de filtros, foco, cliques e arrastos nas janelas, navegação por teclado e menus flutuantes. Quinze telas de 320 a 1440 px, texto ampliado a 200%, temas e movimento reduzido. A publicação Windows verifica também atualização, recuperação após falha e preservação dos dados.

Atualize em **Configurações → Atualizações**, ou feche a versão antiga e abra saldo.exe da nova pasta extraída. Os dados permanecem em `%APPDATA%/saldo-desktop/`. Recursos financeiros, importação, backups, temas, sugestões, logos e acessibilidade foram preservados. **SHA256SUMS.txt** contém os checksums dos ZIPs.
