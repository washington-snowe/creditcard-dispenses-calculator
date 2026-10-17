import { useEffect, useRef, useState } from "react";
import type { User } from "firebase/auth";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  CreditCard,
  Download,
  Menu,
  Monitor,
  Moon,
  Plus,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Wallet,
  X,
  CalendarDays,
  HelpCircle,
  Mail,
  FolderHeart,
  ChartNoAxesCombined,
  CheckCheck,
  CircleHelp,
} from "lucide-react";
import Preview from "./Preview";
import Dialog from "./Dialog";
import Account from "./Account";
import Legal from "./Legal";
import { site, money, type PlanId } from "./config";
import { watchAccount, watchBilling, type Billing } from "./services";

type Modal = "account" | "terms" | "privacy" | "support" | "plans" | null;
const features = [
  {
    icon: CreditCard,
    title: "Encare o total, não só a parcela.",
    text: "Uma parcela pequena pode esconder meses de compromisso. Veja o saldo devedor dos cartões cadastrados e o que falta quitar.",
    tag: "CARTÕES E PARCELAS",
    className: "feature-cards",
  },
  {
    icon: CalendarDays,
    title: "Não comprometa o futuro sem perceber.",
    text: "A compra é de hoje. A cobrança pode durar meses. Confira as parcelas futuras antes de assumir outro compromisso.",
    tag: "PLANEJAMENTO",
    className: "feature-calendar",
  },
  {
    icon: Wallet,
    title: "Descubra o que sobra antes de gastar.",
    text: "Saldo na conta não conta a história inteira. Compare entradas, despesas e faturas para enxergar o que ainda cabe no mês.",
    tag: "ENTRADAS E DESPESAS",
    className: "feature-balance",
  },
  {
    icon: Target,
    title: "Dê um destino ao dinheiro que quer guardar.",
    text: "Transforme o desejo de economizar em uma meta com valor e prazo. Acompanhe o progresso com base nos seus registros.",
    tag: "METAS",
    className: "feature-target",
  },
  {
    icon: CheckCheck,
    title: "Tire cobranças do ponto cego.",
    text: "Assinaturas e vencimentos não param porque você esqueceu deles. Reúna seus compromissos e confira o que já foi pago.",
    tag: "ROTINA MAIS LEVE",
    className: "feature-subscriptions",
  },
  {
    icon: ChartNoAxesCombined,
    title: "Encontre o peso de cada gasto.",
    text: "Chega de tentar adivinhar para onde foi o dinheiro. Use gráficos e filtros para decidir o que revisar primeiro.",
    tag: "VISÃO CLARA",
    className: "feature-charts",
  },
];
const questions = [
  [
    "Mais uma ferramenta para dar trabalho?",
    "Comece por um cartão e pelas contas deste mês. Você não precisa cadastrar sua vida inteira de uma vez. Amplie o controle aos poucos, com sugestões de preenchimento e importação de arquivos compatíveis.",
  ],
  [
    "O que é o ContaClara?",
    "É um aplicativo de finanças pessoais para Windows. Você cadastra cartões, compras, parcelas, entradas, despesas, assinaturas e metas para entender o mês e planejar os próximos passos.",
  ],
  [
    "Preciso conectar minha conta bancária?",
    "Não. O cadastro é manual e você também pode importar arquivos CSV ou OFX compatíveis. O ContaClara calcula com base nos registros inseridos e não acessa seu banco, não faz pagamentos e não pede senhas bancárias.",
  ],
  [
    "O aplicativo funciona sem internet?",
    "Sim. Depois de baixar e extrair o aplicativo, a gestão financeira funciona localmente no computador. Downloads e consulta de atualizações precisam de internet. As condições de acesso dos planos futuros serão informadas antes da contratação.",
  ],
  [
    "Meus dados financeiros ficam no site?",
    "Na versão atual, os registros financeiros ficam no seu computador. O site e a futura área da conta não sincronizam esses registros automaticamente. Você pode exportar backups e deve manter cópias em um local seguro.",
  ],
  [
    "Como instalo no Windows?",
    "Baixe o ZIP, clique com o botão direito e escolha Extrair tudo. Abra a pasta Saldo-win32-x64 e execute saldo.exe. Mantenha o executável junto dos demais arquivos da pasta. Não é necessário instalar Node.js.",
  ],
  [
    "Quanto custam os planos?",
    "Os valores dos planos mensal e anual estão em definição. Nenhuma cobrança ou assinatura é ativada nesta primeira versão do site. As condições completas estarão disponíveis antes da contratação.",
  ],
];

function Brand() {
  return <span className="brand-image" role="img" aria-label="ContaClara" />;
}
export default function App() {
  const [menu, setMenu] = useState(false);
  const [modal, setModal] = useState<Modal>(null);
  const [user, setUser] = useState<User | null>(null);
  const [billing, setBilling] = useState<Billing | null>(null);
  const [billingError, setBillingError] = useState(false);
  const [plan, setPlan] = useState<PlanId>("annual");
  const menuButton = useRef<HTMLButtonElement>(null);
  const header = useRef<HTMLElement>(null);
  const [checkoutReturn, setCheckoutReturn] = useState("");
  useEffect(() => watchAccount(setUser), []);
  useEffect(() => {
    setBilling(null);
    setBillingError(false);
    if (user && site.checkoutEnabled)
      return watchBilling(user.uid, setBilling, () => setBillingError(true));
  }, [user?.uid]);
  useEffect(() => {
    function route() {
      const hash = location.hash.slice(1);
      const routeMap: Record<string, Modal> = {
        conta: "account",
        termos: "terms",
        privacidade: "privacy",
        suporte: "support",
      };
      setModal(routeMap[hash] || null);
      setMenu(false);
    }
    route();
    const status = new URLSearchParams(location.search).get("checkout");
    if (status === "success" || status === "cancelled") {
      setCheckoutReturn(status);
      location.hash = "conta";
      const url = new URL(location.href);
      url.searchParams.delete("checkout");
      history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    }
    window.addEventListener("hashchange", route);
    return () => window.removeEventListener("hashchange", route);
  }, []);
  useEffect(() => {
    if (!menu) return;
    function outside(event: PointerEvent) {
      if (!header.current?.contains(event.target as Node)) setMenu(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenu(false);
        menuButton.current?.focus();
      }
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [menu]);
  function open(next: Exclude<Modal, null>) {
    setMenu(false);
    const hashes = {
      account: "conta",
      terms: "termos",
      privacy: "privacidade",
      support: "suporte",
      plans: "planos",
    };
    if (next === "plans") setModal("plans");
    else if (location.hash === `#${hashes[next]}`) setModal(next);
    else location.hash = hashes[next];
  }
  function close() {
    setModal(null);
    setCheckoutReturn("");
    if (
      ["#conta", "#termos", "#privacidade", "#suporte"].includes(location.hash)
    )
      history.replaceState(null, "", `${location.pathname}${location.search}`);
  }
  const choosePlan = () =>
    site.checkoutEnabled ? open("account") : open("plans");
  return (
    <>
      <a href="#conteudo" className="skip-link">
        Ir para o conteúdo
      </a>
      <header className="site-header" ref={header}>
        <div className="container header-inner">
          <a
            className="brand-link"
            href="#"
            aria-label="ContaClara — início"
            onClick={() => {
              setMenu(false);
              setModal(null);
            }}
          >
            <Brand />
          </a>
          <nav
            id="site-navigation"
            className={menu ? "open" : ""}
            aria-label="Navegação principal"
          >
            <a href="#recursos" onClick={() => setMenu(false)}>
              Recursos
            </a>
            <a href="#como-funciona" onClick={() => setMenu(false)}>
              Como funciona
            </a>
            <a href="#planos" onClick={() => setMenu(false)}>
              Planos
            </a>
            <a href="#duvidas" onClick={() => setMenu(false)}>
              Dúvidas
            </a>
            <button className="nav-account" onClick={() => open("account")}>
              {user ? "Minha conta" : "Entrar"}
              <ArrowUpRight size={14} />
            </button>
          </nav>
          <a className="button header-download" href={site.downloadUrl}>
            Baixar o app <ArrowDown size={15} />
          </a>
          <button
            ref={menuButton}
            className="icon-button mobile-menu"
            aria-label={menu ? "Fechar menu" : "Abrir menu"}
            aria-expanded={menu}
            aria-controls="site-navigation"
            onClick={() => setMenu(!menu)}
          >
            {menu ? <X /> : <Menu />}
          </button>
        </div>
      </header>
      <main id="conteudo">
        <section className="hero container">
          <div className="hero-orbit" aria-hidden="true" />
          <div className="hero-copy">
            <a className="eyebrow hero-badge" href="#recursos">
              <span className="live-dot" /> A PRÓXIMA FATURA NÃO ESPERA{" "}
              <ArrowRight size={13} />
            </a>
            <h1>
              Pare de pagar
              <br />
              <span>contas no escuro.</span>
            </h1>
            <p className="hero-description">
              Parcelas se acumulam. Assinaturas passam despercebidas. E o mês
              seguinte começa comprometido. Veja o que você deve, quanto ainda
              cabe no orçamento e o impacto da próxima compra antes de decidir.
            </p>
            <div className="hero-actions">
              <a className="button primary cta" href={site.downloadUrl}>
                <Download size={18} /> Quero assumir o controle{" "}
                <ArrowUpRight size={16} />
              </a>
              <a className="button text-cta" href="#demonstracao">
                Ver como funciona <ArrowDown size={16} />
              </a>
            </div>
            <p className="cta-caption">
              Download para Windows 64 bits · Comece pelos registros deste mês
            </p>
            <div className="hero-benefits">
              <span>
                <Monitor size={14} /> Sem conectar seu banco
              </span>
              <span>
                <ShieldCheck size={14} /> Seus registros sob seu controle
              </span>
              <span>
                <Moon size={14} /> Gestão financeira offline
              </span>
            </div>
          </div>
          <Preview />
        </section>
        <div className="clarity-strip container">
          <p>
            O cartão mostra uma fatura.
            <br />
            <strong>Você precisa enxergar o mês inteiro.</strong>
          </p>
          <div>
            <span>
              <CreditCard /> Cartões
            </span>
            <span>
              <Wallet /> Entradas
            </span>
            <span>
              <CalendarDays /> Despesas
            </span>
            <span>
              <Target /> Metas
            </span>
          </div>
        </div>
        <section className="section container" id="recursos">
          <div className="section-heading">
            <div>
              <span className="eyebrow">
                <span /> O CONTROLE COMEÇA COM O QUE VOCÊ VÊ
              </span>
              <h2>
                Seu dinheiro tem destino.
                <br />
                <span>Você precisa decidir qual.</span>
              </h2>
            </div>
            <p>
              Uma parcela aqui, uma assinatura ali. Sem uma visão completa,
              pequenos compromissos ocupam o espaço dos seus planos.
            </p>
          </div>
          <div className="feature-grid">
            {features.map(
              ({ icon: Icon, title, text, tag, className }, index) => (
                <article className={`feature ${className}`} key={title}>
                  <div className="feature-top">
                    <span className="feature-icon">
                      <Icon size={22} strokeWidth={1.75} />
                    </span>
                    <span className="feature-number">0{index + 1}</span>
                  </div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                  <div className="feature-visual" aria-hidden="true">
                    {index === 0 ? (
                      <>
                        <div className="mini-credit-card">
                          <CreditCard size={17} />
                          <span>•••• 2048</span>
                          <strong>
                            Seu próximo mês,
                            <br />
                            sem surpresas.
                          </strong>
                        </div>
                        <span className="mini-card-back" />
                      </>
                    ) : index === 1 ? (
                      <div className="mini-timeline">
                        {["JUN", "JUL", "AGO", "SET"].map((m, i) => (
                          <div key={m}>
                            <span>{m}</span>
                            <i style={{ height: `${58 - i * 12}px` }} />
                          </div>
                        ))}
                        <span className="timeline-label">
                          <TrendingUp size={12} /> Mais espaço no orçamento
                        </span>
                      </div>
                    ) : index === 2 ? (
                      <div className="balance-example">
                        <span>
                          Entradas <strong>R$ 6.400,00</strong>
                        </span>
                        <span>
                          Compromissos <strong>− R$ 1.840,00</strong>
                        </span>
                        <span>
                          Para seus planos <strong>R$ 4.560,00</strong>
                        </span>
                      </div>
                    ) : index === 3 ? (
                      <div className="mini-target">
                        <div>
                          <Target size={23} />
                          <span>
                            Sua próxima conquista<strong>70% do caminho</strong>
                          </span>
                        </div>
                        <div className="progress-track">
                          <i style={{ width: "70%" }} />
                        </div>
                      </div>
                    ) : index === 4 ? (
                      <div className="mini-reminders">
                        <span>
                          <span className="reminder-icon">
                            <Check size={13} />
                          </span>{" "}
                          Fatura do cartão <small>Pago</small>
                        </span>
                        <span>
                          <span className="reminder-icon amber">
                            <CalendarDays size={13} />
                          </span>{" "}
                          Assinatura mensal <small>Em breve</small>
                        </span>
                      </div>
                    ) : (
                      <div className="mini-chart">
                        <span />
                        <span />
                        <span />
                        <span />
                        <span />
                        <span />
                        <span />
                        <i />
                      </div>
                    )}
                  </div>
                  <span className="feature-tag">{tag}</span>
                </article>
              ),
            )}
          </div>
          <p className="section-note">
            Os valores exibidos são ilustrativos. O ContaClara calcula com base
            no que você cadastra.
          </p>
        </section>
        <section className="how-section" id="como-funciona">
          <div className="container how-layout">
            <div className="how-intro">
              <span className="eyebrow">
                <span /> SIMPLES DESDE O COMEÇO
              </span>
              <h2>
                Comece pelo mês atual.
                <br />
                Pare de adiar o controle.
              </h2>
              <p>
                Você não precisa organizar a vida inteira hoje. Um cartão e as
                contas deste mês já dão um ponto de partida.
              </p>
              <a href={site.downloadUrl} className="text-link">
                Organizar meu primeiro mês <ArrowUpRight size={18} />
              </a>
              <div className="how-decoration" aria-hidden="true">
                <span className="symbol" />
                <span className="orbit-dot one" />
                <span className="orbit-dot two" />
              </div>
            </div>
            <div className="steps">
              {[
                [
                  "01",
                  "Abra espaço para a mudança.",
                  "Baixe o ContaClara para Windows, extraia a pasta e abra o aplicativo. A versão atual não exige cadastro.",
                  Download,
                ],
                [
                  "02",
                  "Tire as contas da cabeça.",
                  "Cadastre um cartão, suas compras e as entradas do mês. Inclua despesas e assinaturas para completar o planejamento.",
                  Plus,
                ],
                [
                  "03",
                  "Decida antes de comprometer.",
                  "Confira o que falta pagar e a projeção dos próximos meses. Consulte o impacto de uma nova compra antes de registrá-la.",
                  Sparkles,
                ],
              ].map(([number, title, text, Icon]) => {
                const StepIcon = Icon as typeof Download;
                return (
                  <article className="step" key={String(number)}>
                    <span className="step-number">{String(number)}</span>
                    <div>
                      <span className="step-icon">
                        <StepIcon size={22} strokeWidth={1.75} />
                      </span>
                      <h3>{String(title)}</h3>
                      <p>{String(text)}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
        <section className="section container personal-section">
          <div className="personal-art" aria-hidden="true">
            <div className="theme-window">
              <div>
                <span className="symbol" />
                <span>Do seu jeito.</span>
                <Moon size={18} />
              </div>
              <div className="theme-swatch-row">
                <span />
                <span />
                <span />
                <span />
              </div>
              <div className="theme-lines">
                <span />
                <span />
                <span />
              </div>
              <div className="theme-card">
                <span>
                  <Sparkles size={16} /> Pequenos passos também contam.
                </span>
                <strong>
                  Seu futuro começa
                  <br />
                  nas escolhas de hoje.
                </strong>
                <div className="progress-track">
                  <i style={{ width: "65%" }} />
                </div>
              </div>
            </div>
            <span className="personal-chip">
              <ShieldCheck size={15} /> Seus dados. Seu computador.
            </span>
          </div>
          <div className="personal-copy">
            <span className="eyebrow">
              <span /> MENOS ATRITO PARA MANTER O CONTROLE
            </span>
            <h2>
              Seu planejamento precisa
              <br />
              acompanhar você.
            </h2>
            <p>
              Não dependa da memória para saber o que já comprometeu. Mantenha
              os registros por perto, personalize a aparência e volte ao seu
              planejamento sempre que precisar decidir.
            </p>
            <ul className="check-list">
              <li>
                <Check /> Temas Claro, Escuro e Ultra Dark
              </li>
              <li>
                <Check /> Cores e animações do seu jeito
              </li>
              <li>
                <Check /> Gestão financeira que funciona offline
              </li>
              <li>
                <Check /> Backups para cuidar do seu histórico
              </li>
            </ul>
            <a className="text-link" href="#planos">
              Conhecer os planos <ArrowRight size={17} />
            </a>
          </div>
        </section>
        <section className="section plans-section container" id="planos">
          <div className="section-heading centered">
            <span className="eyebrow">
              <span /> DÊ VALOR AO SEU CONTROLE
            </span>
            <h2>
              Seu orçamento merece
              <br />
              <span>mais que um palpite.</span>
            </h2>
            <p>
              Conheça os períodos mensal e anual. Os valores e as condições
              estarão disponíveis antes da abertura das contratações.
            </p>
          </div>
          <div
            className="plan-switch"
            role="group"
            aria-label="Período do plano"
          >
            <button
              aria-pressed={plan === "monthly"}
              onClick={() => setPlan("monthly")}
            >
              Mensal
            </button>
            <button
              aria-pressed={plan === "annual"}
              onClick={() => setPlan("annual")}
            >
              Anual <span>Visão de longo prazo</span>
            </button>
          </div>
          <div className="plans-layout">
            <article className="plan-card">
              <span className="plan-icon">
                <Sparkles size={22} />
              </span>
              <div className="plan-heading">
                <h3>ContaClara</h3>
                <span className="pill">
                  {plan === "annual" ? "Plano anual" : "Plano mensal"}
                </span>
              </div>
              <p>
                Saiba o que já comprometeu.
                <br />
                Decida o que vem depois.
              </p>
              <div className="plan-price" aria-live="polite">
                {(plan === "annual" ? site.annualCents : site.monthlyCents) ===
                null ? (
                  <>
                    <strong>Em definição</strong>
                    <span>Valores anunciados em breve</span>
                  </>
                ) : (
                  <>
                    <strong>
                      {money(
                        (plan === "annual"
                          ? site.annualCents
                          : site.monthlyCents)!,
                      )}
                    </strong>
                    <span>{plan === "annual" ? "por ano" : "por mês"}</span>
                  </>
                )}
              </div>
              <button className="button primary cta full" onClick={choosePlan}>
                {site.checkoutEnabled
                  ? "Escolher este plano"
                  : "Conhecer os planos"}
                <ArrowRight size={17} />
              </button>
              <small className="plan-caption">
                {site.checkoutEnabled
                  ? "Revise valores e condições antes de confirmar."
                  : "Os planos ainda não estão disponíveis para contratação."}
              </small>
              <div className="plan-divider" />
              <span className="plan-features-label">
                O QUE VOCÊ JÁ ENCONTRA NO APLICATIVO
              </span>
              <ul className="check-list">
                {[
                  "Cartões, compras e parcelas",
                  "Entradas, despesas e assinaturas",
                  "Planejamento mensal e antecipações",
                  "Metas, gráficos e filtros",
                  "Temas, backups e atualizações",
                ].map((text) => (
                  <li key={text}>
                    <Check size={16} />
                    {text}
                  </li>
                ))}
              </ul>
            </article>
            <div className="plan-aside">
              <span className="plan-aside-icon">
                <FolderHeart size={24} />
              </span>
              <h3>
                O pequeno gasto
                <br />
                também pesa no ano.
              </h3>
              <p>
                Uma assinatura que você deixou de usar pode continuar ocupando
                seu orçamento. Coloque os compromissos à vista antes de somar
                mais uma cobrança.
              </p>
              <div className="cost-anchor">
                <span>EXEMPLO DE GASTO RECORRENTE</span>
                <p>
                  <strong>R$ 29,90 por mês</strong> representam{" "}
                  <strong>R$ 358,80 em um ano.</strong>
                </p>
                <small>Custo ilustrativo de uma assinatura para revisar.</small>
              </div>
              <a className="button secondary" href={site.downloadUrl}>
                <Download size={17} /> Baixar versão para Windows
              </a>
              <div className="plan-info">
                <CircleHelp size={18} />
                <p>
                  Preços, condições de licença e provedor de pagamento serão
                  informados antes da abertura das assinaturas.
                </p>
              </div>
              <a href="#duvidas" className="text-link">
                Tirar minhas dúvidas <ArrowDown size={15} />
              </a>
            </div>
          </div>
        </section>
        <section className="section container faq-section" id="duvidas">
          <div className="faq-intro">
            <span className="eyebrow">
              <span /> TIRE A DÚVIDA. DÊ O PRIMEIRO PASSO.
            </span>
            <h2>
              O que ainda impede
              <br />
              você de começar?
            </h2>
            <p>
              Entenda como começar, onde ficam seus dados e o que esperar dos
              planos.
            </p>
            <button className="text-link" onClick={() => open("support")}>
              Ainda preciso de ajuda <ArrowUpRight size={17} />
            </button>
          </div>
          <div className="faq-list">
            {questions.map(([question, answer], index) => (
              <details key={question} name="faq">
                <summary>
                  <span className="faq-number">0{index + 1}</span>
                  <span>{question}</span>
                  <Plus size={18} />
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>
        <section className="container final-section">
          <div className="final-cta">
            <div>
              <span className="eyebrow">
                <span /> CUIDE DO MÊS QUE JÁ ESTÁ ACONTECENDO
              </span>
              <h2>
                A próxima fatura não espera
                <br />
                <span>você se organizar.</span>
              </h2>
              <p>
                Comece pelas contas deste mês. Enxergue os compromissos que já
                assumiu e escolha o próximo passo com mais clareza.
              </p>
              <a className="button primary cta" href={site.downloadUrl}>
                <Download size={18} /> Começar agora no Windows{" "}
                <ArrowUpRight size={16} />
              </a>
              <small>Disponível para Windows 64 bits</small>
            </div>
            <div className="final-symbol" aria-hidden="true">
              <span className="symbol" />
            </div>
          </div>
        </section>
      </main>
      <footer className="site-footer container">
        <div className="footer-top">
          <div>
            <a href="#" className="brand-link" aria-label="ContaClara — início">
              <Brand />
            </a>
            <p>
              Seu dinheiro. Mais claro.
              <br />
              Sua vida, com mais possibilidades.
            </p>
          </div>
          <div className="footer-links">
            <div>
              <strong>Explore</strong>
              <a href="#recursos">Recursos</a>
              <a href="#como-funciona">Como funciona</a>
              <a href="#planos">Planos</a>
              <a href={site.downloadUrl}>Download</a>
            </div>
            <div>
              <strong>Conte com a gente</strong>
              <a href="#duvidas">Dúvidas frequentes</a>
              <button onClick={() => open("support")}>Suporte</button>
              <button onClick={() => open("account")}>Minha conta</button>
            </div>
            <div>
              <strong>Transparência</strong>
              <button onClick={() => open("privacy")}>Privacidade</button>
              <button onClick={() => open("terms")}>Termos de uso</button>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} ContaClara. Todos os direitos
            reservados.
          </span>
          <span>
            Feito para dar clareza aos seus próximos passos{" "}
            <span className="footer-sparkle">✳</span>
          </span>
        </div>
      </footer>
      {modal && (
        <Dialog
          title={
            modal === "account"
              ? user
                ? "Sua conta, mais clara."
                : "Que bom ter você aqui."
              : modal === "terms"
                ? "Termos de uso"
                : modal === "privacy"
                  ? "Política de privacidade"
                  : modal === "plans"
                    ? "Um novo capítulo está chegando."
                    : "Vamos ajudar você."
          }
          wide={modal === "terms" || modal === "privacy"}
          onClose={close}
        >
          {modal === "account" && (
            <>
              {checkoutReturn && (
                <p className="form-message" role="status">
                  {checkoutReturn === "success"
                    ? "Recebemos seu retorno do checkout. A assinatura só será exibida como ativa após a confirmação do pagamento."
                    : "O checkout foi encerrado. Nenhuma assinatura é ativada apenas por visitar esta página."}
                </p>
              )}
              <Account
                user={user}
                billing={billing}
                billingError={billingError}
                selectedPlan={plan}
                onClose={close}
              />
            </>
          )}
          {(modal === "terms" || modal === "privacy") && <Legal page={modal} />}
          {modal === "plans" && (
            <div className="account-soon">
              <span className="dialog-feature-icon">
                <Sparkles />
              </span>
              <p>
                Os planos mensal e anual estão sendo preparados. Valores,
                condições e formas de pagamento serão apresentados antes de
                qualquer contratação.
              </p>
              <p>
                Enquanto isso, conheça a versão atual para Windows. Ela funciona
                com seus registros salvos no computador.
              </p>
              <a className="button primary full" href={site.downloadUrl}>
                <Download size={17} /> Conhecer o aplicativo
              </a>
              <button className="button secondary full" onClick={close}>
                Voltar ao site
              </button>
            </div>
          )}
          {modal === "support" && (
            <div className="support-content">
              <p className="dialog-description">
                Algumas respostas rápidas para seguir com tranquilidade.
              </p>
              <a className="support-row" href="#duvidas" onClick={close}>
                <span>
                  <HelpCircle />
                  <span>
                    <strong>Dúvidas frequentes</strong>
                    <small>Instalação, dados e funcionamento</small>
                  </span>
                </span>
                <ArrowUpRight size={18} />
              </a>
              <a className="support-row" href={site.downloadUrl}>
                <span>
                  <Download />
                  <span>
                    <strong>Baixar o aplicativo</strong>
                    <small>Versão mais recente para Windows</small>
                  </span>
                </span>
                <ArrowUpRight size={18} />
              </a>
              {site.supportEmail ? (
                <a className="support-row" href={`mailto:${site.supportEmail}`}>
                  <span>
                    <Mail />
                    <span>
                      <strong>Fale com a equipe</strong>
                      <small>{site.supportEmail}</small>
                    </span>
                  </span>
                  <ArrowUpRight size={18} />
                </a>
              ) : (
                <p className="muted">
                  Nosso canal de atendimento será informado antes da abertura de
                  cadastros e assinaturas.
                </p>
              )}
              <div className="support-tip">
                <ShieldCheck size={19} />
                <p>
                  Antes de atualizar ou mover o aplicativo, exporte um backup em{" "}
                  <strong>Configurações → Dados e segurança.</strong>
                </p>
              </div>
            </div>
          )}
        </Dialog>
      )}
    </>
  );
}
