**ContaClara 4.3 — menu mais fluido, controle de hardware e avisos com significado.**

Baixe **ContaClara-Windows-x64.zip**, extraia a pasta inteira e abra **saldo.exe**. Funciona offline e não exige Node.js.

### O que mudou

- **Menu mais fluido:** abertura e recolhimento com transição de largura sincronizada ao conteúdo; rótulos entram e saem suavemente, e a logo alterna com o símbolo compacto. Em janelas pequenas, o fundo do menu também aparece e desaparece suavemente.
- **Aceleração de hardware:** em **Aparência → Desempenho**, ative ou desative **Usar aceleração de hardware**. A escolha é salva imediatamente e aplicada na próxima inicialização. A tela mostra quando é necessário reiniciar, oferece **Reiniciar para aplicar** e informa o estado em uso. O uso efetivo da GPU depende do computador e do driver.
- **Cores de situação:** verde para pagamentos e saldo positivo, amarelo para pendências e atenção, vermelho para atrasos, saldo negativo e erros, azul para informações. Os cards financeiros, avisos, etiquetas e atalhos usam tons próprios, independentes da cor de destaque escolhida.
- **Notificações mais claras:** avisos de ação impedida e orçamento insuficiente usam amarelo; falhas ao salvar ou importar usam vermelho, com ícones correspondentes.
- **Acessibilidade preservada:** as transições respeitam a opção Animações suaves e a preferência do sistema por movimento reduzido. Manrope, Inter, números tabulares e os controles de zoom permanecem disponíveis.
- Mantém boas-vindas, resumo mensal, gráficos com detalhes sobrepostos, identidade visual, temas, cores, rendas, saldo entre meses, despesas, cartões, compras, assinaturas, filtros, antecipações e backups.

### Como atualizar

Abra **Atualizações → Verificar atualizações → Baixar atualização → Reiniciar e atualizar**. O programa prepara um backup e preserva os dados.

Para atualizar manualmente, feche o aplicativo antigo, extraia a pasta completa e abra **saldo.exe**. A pasta de dados permanece `%APPDATA%/saldo-desktop/`; não é necessário recadastrar informações. Os nomes técnicos saldo.exe e Saldo-Windows-x64.zip permanecem para compatibilidade com versões anteriores; os dois ZIPs contêm o mesmo ContaClara.

### Validação

44 testes de cálculos, persistência e validação. Verificação de larguras intermediárias na animação do menu, conteúdo sincronizado, movimento reduzido, cores de pendências/atrasos/saldo negativo e onze telas de 320 a 1440 px, nos três temas e com texto a 200%. Fluxos financeiros, fontes, gráficos e zoom nativo foram exercitados no Electron. A publicação Windows verifica desativação da aceleração antes de ready, reativação após nova abertura, comando de reinício, dados preservados e atualização com recuperação após falha.

**SHA256SUMS.txt** contém os checksums dos arquivos. Seus dados financeiros continuam locais. Marcar pagamentos apenas registra valores; não movimenta dinheiro no banco.
