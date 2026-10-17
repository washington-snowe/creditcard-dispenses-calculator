import { site } from "./config";

export default function Legal({ page }: { page: "terms" | "privacy" }) {
  return (
    <article className="legal-copy">
      <p className="legal-intro">
        Versão inicial para revisão antes do lançamento comercial.
      </p>
      {page === "privacy" ? (
        <>
          <p>
            O ContaClara ajuda a organizar finanças pessoais. Esta política
            descreve a separação entre o aplicativo para computador e os
            serviços da conta no site.
          </p>
          <h3>Dados do aplicativo</h3>
          <p>
            Os registros financeiros e backups da versão atual são armazenados
            localmente no seu computador. Eles não são enviados automaticamente
            ao site ou ao Firebase. Os arquivos locais não são criptografados
            pelo ContaClara; proteja o acesso ao dispositivo e mantenha cópias
            seguras.
          </p>
          <h3>Conta e autenticação</h3>
          <p>
            Quando a área da conta estiver disponível, utilizaremos o Firebase
            Authentication para identificar usuários por e-mail, nome e
            identificador da conta. Ao escolher Google, os dados de
            identificação autorizados serão usados para autenticação. Sua senha
            não fica disponível para a equipe do ContaClara.
          </p>
          <h3>Assinaturas e pagamentos</h3>
          <p>
            O provedor de pagamento e os preços ainda estão em definição. Quando
            a contratação for disponibilizada, os dados do cartão ou meio de
            pagamento serão tratados pelo provedor escolhido. A conta poderá
            armazenar a identificação da assinatura, o plano, a situação e o
            período de acesso. Esta política será atualizada com o provedor e
            suas condições antes da ativação de cobranças.
          </p>
          <h3>Armazenamento no navegador</h3>
          <p>
            Esta versão do site não usa publicidade ou ferramentas de análise de
            navegação. A autenticação, quando configurada, utiliza armazenamento
            necessário para manter a sessão. Os dados fictícios da demonstração
            não são registros seus.
          </p>
          <h3>Seus direitos e contato</h3>
          <p>
            Você pode solicitar informações sobre tratamento, acesso, correção e
            exclusão dos dados da sua conta, observadas as obrigações de
            retenção aplicáveis. A exclusão da conta no site não apaga os
            arquivos armazenados no seu computador.
          </p>
        </>
      ) : (
        <>
          <p>
            Ao utilizar o ContaClara, considere estas condições. Os detalhes
            comerciais serão apresentados antes de qualquer contratação.
          </p>
          <h3>Finalidade do produto</h3>
          <p>
            O ContaClara é uma ferramenta de registro e planejamento financeiro
            pessoal. Os cálculos refletem os dados cadastrados. O programa não
            realiza pagamentos bancários, não consulta automaticamente suas
            contas e não oferece aconselhamento de investimento.
          </p>
          <h3>Uso e responsabilidade</h3>
          <p>
            Confira valores, datas e categorias antes de tomar decisões. As
            projeções podem diferir dos valores efetivamente cobrados pelas
            instituições financeiras. Não cadastre senhas bancárias, CVV ou
            números completos de cartão. Você é responsável por manter cópias
            dos seus dados e proteger seu computador.
          </p>
          <h3>Versão atual e planos futuros</h3>
          <p>
            O aplicativo disponível para Windows funciona localmente, sem exigir
            uma conta no site. Os planos mensal e anual, seus valores, limites
            de uso e condições de licença ainda estão em definição. Esta página
            não representa uma assinatura ativa ou uma oferta de cobrança. As
            condições finais de contratação, renovação, cancelamento e reembolso
            serão apresentadas antes da compra, respeitando a legislação
            aplicável.
          </p>
          <h3>Atualizações e disponibilidade</h3>
          <p>
            O aplicativo oferece consulta e instalação de atualizações. Preserve
            seus backups durante a atualização. Serviços online podem depender
            da conexão e da disponibilidade dos fornecedores. Não há garantia de
            resultado financeiro pelo uso do programa.
          </p>
          <h3>Conta e serviços</h3>
          <p>
            Quando habilitada, a conta será pessoal. Mantenha suas credenciais
            protegidas. A situação de uma assinatura será determinada pela
            confirmação do provedor no servidor, nunca apenas pelo retorno do
            checkout ao navegador.
          </p>
        </>
      )}
      <div className="legal-contact">
        <h3>Responsável e atendimento</h3>
        {site.sellerName ? (
          <p>
            {site.sellerName}
            {site.sellerDocument && ` · ${site.sellerDocument}`}
          </p>
        ) : (
          <p>
            Os dados do responsável comercial serão informados antes do início
            das vendas.
          </p>
        )}
        {site.supportEmail ? (
          <p>
            Contato:{" "}
            <a href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a>
          </p>
        ) : (
          <p>
            O canal de atendimento será informado antes da abertura de cadastros
            e contratações.
          </p>
        )}
      </div>
    </article>
  );
}
