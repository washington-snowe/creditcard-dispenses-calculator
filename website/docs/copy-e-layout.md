# Copy e refinamento visual — ContaClara

## Hero

**Chamada:** A próxima fatura não espera.

**Título:** Pare de pagar contas no escuro.

**Texto:** Parcelas se acumulam. Assinaturas passam despercebidas. E o mês seguinte começa comprometido. Veja o que você deve, quanto ainda cabe no orçamento e o impacto da próxima compra antes de decidir.

**CTA principal:** Quero assumir o controle.

**Apoio ao CTA:** Download para Windows 64 bits · Comece pelos registros deste mês.

**CTA secundário:** Ver como funciona.

**Sinais de confiança:** Sem conectar seu banco · Seus registros sob seu controle · Gestão financeira offline.

## Benefícios

**Título da seção:** Seu dinheiro tem destino. Você precisa decidir qual.

Uma parcela aqui, uma assinatura ali. Sem uma visão completa, pequenos compromissos ocupam o espaço dos seus planos.

1. **Encare o total, não só a parcela.** Uma parcela pequena pode esconder meses de compromisso. Veja o saldo devedor dos cartões cadastrados e o que falta quitar.
2. **Não comprometa o futuro sem perceber.** A compra é de hoje. A cobrança pode durar meses. Confira as parcelas futuras antes de assumir outro compromisso.
3. **Descubra o que sobra antes de gastar.** Saldo na conta não conta a história inteira. Compare entradas, despesas e faturas para enxergar o que ainda cabe no mês.
4. **Dê um destino ao dinheiro que quer guardar.** Transforme o desejo de economizar em uma meta com valor e prazo. Acompanhe o progresso com base nos seus registros.
5. **Tire cobranças do ponto cego.** Assinaturas e vencimentos não param porque você esqueceu deles. Reúna seus compromissos e confira o que já foi pago.
6. **Encontre o peso de cada gasto.** Chega de tentar adivinhar para onde foi o dinheiro. Use gráficos e filtros para decidir o que revisar primeiro.

## Como começar

**Título:** Comece pelo mês atual. Pare de adiar o controle.

Você não precisa organizar a vida inteira hoje. Um cartão e as contas deste mês já dão um ponto de partida.

1. **Abra espaço para a mudança.** Baixe o ContaClara para Windows, extraia a pasta e abra o aplicativo. A versão atual não exige cadastro.
2. **Tire as contas da cabeça.** Cadastre um cartão, suas compras e as entradas do mês. Inclua despesas e assinaturas para completar o planejamento.
3. **Decida antes de comprometer.** Confira o que falta pagar e a projeção dos próximos meses. Consulte o impacto de uma nova compra antes de registrá-la.

## Oferta e referência de custo

**Título:** Seu orçamento merece mais que um palpite.

Conheça os períodos mensal e anual. Os valores e as condições estarão disponíveis antes da abertura das contratações.

**Referência:** O pequeno gasto também pesa no ano. Uma assinatura que você deixou de usar pode continuar ocupando seu orçamento. Coloque os compromissos à vista antes de somar mais uma cobrança.

**Exemplo de gasto recorrente:** R$ 29,90 por mês representam R$ 358,80 em um ano. Custo ilustrativo de uma assinatura para revisar.

Os valores são uma referência aritmética de despesa, identificada separadamente do plano. Os planos continuam **em definição**, com checkout desativado. A comunicação não usa economia garantida, preço fictício, contagem regressiva ou escassez inventada.

## Quebra de objeções

- **Mais uma ferramenta para dar trabalho?** Comece por um cartão e pelas contas deste mês. Você não precisa cadastrar sua vida inteira de uma vez. Amplie o controle aos poucos, com sugestões de preenchimento e importação de arquivos compatíveis.
- **Preciso conectar minha conta bancária?** Não. O cadastro é manual e você também pode importar arquivos CSV ou OFX compatíveis. O ContaClara calcula com base nos registros inseridos e não acessa seu banco, não faz pagamentos e não pede senhas bancárias.
- **O aplicativo funciona sem internet?** Sim. Depois de baixar e extrair o aplicativo, a gestão financeira funciona localmente no computador. Downloads e consulta de atualizações precisam de internet. As condições de acesso dos planos futuros serão informadas antes da contratação.
- **Meus dados financeiros ficam no site?** Na versão atual, os registros financeiros ficam no seu computador. O site e a futura área da conta não sincronizam esses registros automaticamente. Você pode exportar backups e deve manter cópias em um local seguro.
- **Quanto custam os planos?** Os valores dos planos mensal e anual estão em definição. As condições completas estarão disponíveis antes da contratação.

## CTA final

**Chamada:** Cuide do mês que já está acontecendo.

**Título:** A próxima fatura não espera você se organizar.

**Texto:** Comece pelas contas deste mês. Enxergue os compromissos que já assumiu e escolha o próximo passo com mais clareza.

**Botão:** Começar agora no Windows.

## Onde estão as alterações de código

- `src/App.tsx`: textos, seções, referência de custo e CTAs.
- `src/layout.css`: layout comercial e comentários em português iniciados por **ALTERAÇÃO**. As regras anteriores correspondentes foram removidas de `styles.css` para evitar sobreposições entre breakpoints.
- `src/styles.css`: base visual, demonstração, ilustrações e formulários preservados.
- `src/main.tsx`: carrega a base e depois o layout comercial.

| Definição em `layout.css`      | Finalidade                                                         |
| ------------------------------ | ------------------------------------------------------------------ |
| `--page-gutter`                | Margem lateral compartilhada por cabeçalho, seções e rodapé.       |
| `--content-width`              | Limite de largura do conteúdo, centrado com `margin-inline: auto`. |
| `--section-space`              | Respiro vertical fluido de todas as seções.                        |
| `--section-gap`                | Distância entre título e conteúdo ou blocos da mesma seção.        |
| `--column-gap`                 | Separação entre colunas de igual largura.                          |
| `--card-gap`, `--card-padding` | Espaçamento externo e interno dos cards.                           |

As grids usam `minmax(0, 1fr)` para permitir redução da largura sem transbordamento. Os benefícios usam subgrid quando disponível, alinhando títulos, textos e ilustrações por linha; há fallback para navegadores sem suporte. A versão móvel reorganiza os blocos em vez de diminuir textos. Os ícones de benefícios usam Lucide com 22 px e traço 1,75; CTAs têm alvo de pelo menos 56 px e foco visível. A preferência por movimento reduzido continua sendo respeitada.
