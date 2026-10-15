**ContaClara 4.1 — identidade oficial, fontes padronizadas e melhor leitura.**

Baixe **ContaClara-Windows-x64.zip**, extraia a pasta inteira e abra **saldo.exe**. O aplicativo funciona offline e não exige Node.js.

### O que mudou

- **Identidade ContaClara:** logo completa oficial na barra lateral e na abertura; símbolo original no executável Windows, favicon e navegação compacta. Cores, desenho e proporções preservados, com contraste nos temas Claro, Escuro e Ultra Dark.
- **Fontes oficiais:** Manrope Bold (700) no nome da marca, Manrope SemiBold (600) nos títulos e Inter nos textos, menus, botões, formulários, tabelas, saldos e faturas. Valores financeiros usam números tabulares.
- **Tipografia fixa:** removida a opção de trocar fontes. Backups antigos continuam válidos; a preferência antiga de fonte é descartada sem alterar os registros financeiros.
- **Melhor leitura:** legendas, rótulos, informações auxiliares e tabelas maiores, com espaçamentos ajustados. Cartões e painéis se reorganizam com texto ampliado; descrições de compras podem quebrar linha.
- **Acessibilidade:** tamanhos relativos acompanham as preferências de texto; o menu Visualizar permite aumentar, diminuir e restaurar o zoom, com os atalhos padrão. No Windows, pressione Alt para exibir o menu.
- Mantém rendas recorrentes, saldo entre meses, despesas, cartões, compras, assinaturas, filtros, gráficos, antecipações, temas, cores, glow, animações e backups.

### Como atualizar

Nas versões 3.0.1 ou 4.0, abra **Atualizações → Verificar atualizações → Baixar atualização → Reiniciar e atualizar**. O programa prepara um backup e preserva seus dados.

Para atualizar manualmente, feche o aplicativo antigo, extraia a pasta completa e abra **saldo.exe**. A pasta de dados permanece `%APPDATA%/saldo-desktop/`; não é necessário recadastrar suas informações. O nome técnico do executável e o ZIP Saldo-Windows-x64.zip são mantidos para compatibilidade com o atualizador das versões anteriores; os dois ZIPs contêm o mesmo aplicativo ContaClara.

### Validação

43 testes de cálculos e validação de dados, fluxos completos de interface, tipografia e logos nos três temas, dez telas entre 320 e 1440 px e texto ampliado a 200%. No aplicativo empacotado para Windows, a publicação verifica persistência, dados antigos e zoom real a 125% e 200%, além de atualização com backup e recuperação após falha simulada.

**SHA256SUMS.txt** contém os checksums dos arquivos. Seus dados financeiros continuam locais. Marcar pagamentos apenas registra valores; não movimenta dinheiro no banco.
