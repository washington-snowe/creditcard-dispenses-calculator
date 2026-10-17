# Contrato preparado para a cobrança futura

**Estado: integração de pagamentos não implementada. Provedor e valores aguardam definição.** Este documento descreve a interface que o site já sabe consumir, sem assumir Stripe ou Mercado Pago como escolha comercial.

## Identidade e funções

O cliente usa Firebase Functions Callable na região `southamerica-east1` (configurável). A função deve exigir `request.auth`, validar o token e, para novas contratações, a confirmação do e-mail. Nunca aceite UID, preço, moeda, plano ativo ou URL de retorno fornecidos pelo cliente.

| Função           | Entrada                           | Saída                  |
| ---------------- | --------------------------------- | ---------------------- |
| `createCheckout` | `{ plan: 'monthly' \| 'annual' }` | `{ url: 'https://…' }` |
| `createPortal`   | `{}`                              | `{ url: 'https://…' }` |

O cliente permite redirecionamento somente HTTPS para `checkout.stripe.com`, `billing.stripe.com` ou `www.mercadopago.com.br`. Depois de escolher o provedor, restrinja a lista aos domínios efetivamente necessários. Se outro provedor for escolhido, revise a lista e o contrato junto com a implementação.

Preços, IDs de produto e moeda vêm de uma tabela do servidor. A associação UID/cliente do provedor fica em uma coleção privada, inacessível ao navegador. As chaves secretas ficam em Secret Manager ou equivalente no servidor.

Uma implementação deve tratar concorrência e idempotência para não criar clientes ou assinaturas duplicadas; reutilizar checkout aberto quando apropriado; recusar nova contratação quando já houver assinatura gerenciável e encaminhar ao portal.

## Visão de assinatura para o cliente

`/billing/{uid}` só pode ser lido pelo próprio usuário e escrito pelo servidor:

```json
{
  "plan": "annual",
  "status": "active",
  "accessUntil": 1823803200000,
  "cancelAtPeriodEnd": false,
  "canManage": true
}
```

`accessUntil` é um timestamp Unix em milissegundos, normalizado pelo backend. `status` usa os valores de domínio `active`, `trialing`, `past_due`, `canceled`, `unpaid`, `incomplete` ou `paused`, independentemente do fornecedor. `canManage` significa que já existe uma relação de cobrança que pode ser gerenciada pelo usuário. Dados de cartão e chaves secretas não fazem parte desse documento.

Antes da ativação comercial, validar os documentos do servidor e explicitar períodos de tolerância/regras de acesso. O site apresenta o estado; a proteção efetiva de funcionalidades deve existir no serviço ou licença do aplicativo, nunca apenas em componentes React.

## Confirmação e retornos

URLs de retorno devem ser configuradas exclusivamente no servidor com um domínio permitido:

- Sucesso: `https://DOMINIO/?checkout=success#conta`
- Cancelamento: `https://DOMINIO/?checkout=cancelled#conta`
- Retorno do portal: `https://DOMINIO/#conta`

A tela de sucesso informa que aguarda confirmação. **A URL não ativa acesso**. O webhook deve verificar assinatura/segredo usando o corpo original, deduplicar eventos, conferir a associação do cliente/assinatura com o UID, consultar o estado atual no provedor e tratar eventos fora de ordem, renovações, falhas, cancelamentos e reembolsos. As regras não podem permitir escrita do cliente em `/billing`.

Testes de integração obrigatórios antes de habilitar o botão: token ausente/forjado, UID de terceiro, alteração de plano/preço, webhook falso/repetido/fora de ordem, múltiplas abas, pagamento aprovado/pendente/recusado, cancelamento imediato/no fim do período, renovação, reembolso, falha de rede e retorno de URL sem pagamento. Só depois escolher a política offline e integrar a licença no Electron, preservando registros e backups existentes.
