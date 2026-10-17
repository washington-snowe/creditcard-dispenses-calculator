# Decisões de produto

## Nome na tela de boas-vindas — 16/10/2026

Por solicitação do usuário, a saudação usa provisoriamente o nome da conta do sistema operacional. Em uma próxima etapa, substituir essa origem por um perfil do usuário do ContaClara, com nome próprio editável. Não considerar o nome do computador uma definição permanente da identidade do usuário.

O nome é lido localmente, não é enviado a serviços externos e não faz parte dos dados financeiros nem dos backups. Se não estiver disponível, a saudação permanece genérica.

## Site e comercialização — 16/10/2026

O site público está em `website/`, separado do aplicativo. O proprietário confirmou que os valores mensal e anual estão **em definição** e preferiu **definir o provedor de pagamento depois**. Não presumir Stripe ou Mercado Pago como escolha aprovada. Esta primeira versão deve apresentar o produto, permitir revisão da experiência e preparar autenticação Firebase e contrato de checkout sem ativar cobranças.

O executável atual mantém os registros locais e não passa a exigir login/licença como efeito da criação do site. A eventual integração de identidade e licença no Electron será uma etapa própria e deverá preservar registros, backups e o plano de substituir o nome da conta do computador por um perfil do ContaClara.

## Abertura e inspiração

A aba Resumo abre em Boas-vindas a cada inicialização; Início preserva o resumo financeiro existente. O banco local tem 200 frases originais. Uma frase é escolhida por processo do aplicativo, sem repetição até esgotar a lista, e não muda ao navegar ou recarregar a interface. O histórico de índices fica em welcome-state.json, separado de finances.json e dos backups.
