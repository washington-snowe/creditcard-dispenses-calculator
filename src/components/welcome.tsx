import {
  ArrowUpRight,
  Banknote,
  CalendarDays,
  CheckCheck,
  CreditCard,
  LayoutDashboard,
  Palette,
  ReceiptText,
  RefreshCw,
  Repeat,
  ShoppingBag,
  Sparkles,
  Zap,
} from "lucide-react";
import { money, monthLabel, type Data } from "../domain";
import { monthFlow } from "../finance";
export const destinations = [
  {
    id: "overview",
    title: "Visão geral",
    icon: LayoutDashboard,
    description:
      "Entenda seus gastos com gráficos, saldos por cartão e parcelas do mês.",
  },
  {
    id: "cards",
    title: "Meus cartões",
    icon: CreditCard,
    description:
      "Cadastre bancos e cartões, acompanhe limites e marque a fatura como paga.",
  },
  {
    id: "purchases",
    title: "Minhas compras",
    icon: ShoppingBag,
    description:
      "Anote compras e parcelas. Encontre qualquer lançamento com os filtros.",
  },
  {
    id: "income",
    title: "Entradas do mês",
    icon: Banknote,
    description:
      "Registre rendas e recebimentos, ajuste valores e descubra quanto vai sobrar.",
  },
  {
    id: "expenses",
    title: "Despesas",
    icon: ReceiptText,
    description:
      "Organize contas fora do cartão, como Pix, boletos e pagamentos em dinheiro.",
  },
  {
    id: "subscriptions",
    title: "Assinaturas",
    icon: Repeat,
    description:
      "Acompanhe serviços recorrentes, renovações e pagamentos no cartão ou fora dele.",
  },
  {
    id: "planning",
    title: "Planejamento",
    icon: CalendarDays,
    description:
      "Explore os próximos meses e veja como as parcelas cabem no seu orçamento.",
  },
  {
    id: "anticipation",
    title: "Antecipações",
    icon: Zap,
    description:
      "Compare parcelas mais caras e simule quais compras quitar para aliviar o mês.",
  },
] as const;
export type WelcomeTab =
  (typeof destinations)[number]["id"] | "appearance" | "updates";
export function WelcomePage({
  data,
  month,
  onNavigate,
  onStart,
  onDemo,
}: {
  data: Data;
  month: string;
  onNavigate: (tab: WelcomeTab) => void;
  onStart: () => void;
  onDemo: () => void;
}) {
  const flow = monthFlow(data, month);
  const hasData = !!(
    data.cards.length ||
    data.purchases.length ||
    data.cashEntries?.length ||
    data.recurringIncomes?.length ||
    data.expenses?.length ||
    data.subscriptions?.length
  );
  const percentage = flow.commitments
    ? Math.round((flow.paid / flow.commitments) * 100)
    : 0;
  return (
    <div className="welcome-page">
      <section
        className="welcome-summary"
        aria-label="Resumo financeiro do mês"
      >
        <div
          className="welcome-balance"
          data-tone={flow.pending > 0 ? "warning" : "success"}
        >
          <span className="eyebrow">
            <span className="welcome-symbol">
              <Sparkles size={20} />
            </span>
            SEU MÊS EM FOCO
          </span>
          <p>Falta pagar em {monthLabel(month).toLocaleLowerCase("pt-BR")}</p>
          <strong data-testid="welcome-pending">{money(flow.pending)}</strong>
          <span>Parcelas de cartões, assinaturas e despesas pendentes.</span>
          <button
            className="button primary"
            onClick={() => onNavigate("income")}
          >
            Ver meu orçamento <ArrowUpRight size={17} />
          </button>
        </div>
        {flow.paid > 0 && (
          <div
            className="welcome-paid"
            data-testid="welcome-paid"
            data-tone="success"
          >
            <span className="welcome-symbol">
              <CheckCheck size={23} />
            </span>
            <p>Você já pagou neste mês</p>
            <strong>{money(flow.paid)}</strong>
            <div
              role="progressbar"
              aria-label="Compromissos do mês pagos"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percentage}
              className="welcome-progress"
            >
              <i style={{ width: `${percentage}%` }} />
            </div>
            <span>{percentage}% dos compromissos registrados no mês.</span>
            <small>
              Pagamentos pela data em que saíram do seu dinheiro, incluindo
              antecipações.
            </small>
          </div>
        )}
      </section>
      {!hasData && (
        <section className="welcome-start" aria-label="Primeiros passos">
          <div>
            <h2>Comece pelo seu primeiro cartão</h2>
            <p>
              Depois, registre uma compra. Seus saldos e gráficos são calculados
              automaticamente.
            </p>
          </div>
          <div className="welcome-start-actions">
            <button className="button primary" onClick={onStart}>
              Cadastrar primeiro cartão <ArrowUpRight size={16} />
            </button>
            <button className="text-button" onClick={onDemo}>
              Experimentar exemplo
            </button>
          </div>
        </section>
      )}
      <div className="welcome-section-heading">
        <div>
          <h2>O que você quer organizar hoje?</h2>
          <p>Escolha uma sugestão para conhecer e usar cada função.</p>
        </div>
        <span className="badge accent-badge">Tudo em um só lugar</span>
      </div>
      <section className="welcome-cards" aria-label="Conheça as funções">
        {destinations.map((item) => (
          <button
            key={item.id}
            className="welcome-card"
            data-tone={
              item.id === "income" || item.id === "anticipation"
                ? "success"
                : item.id === "expenses" || item.id === "subscriptions"
                  ? "warning"
                  : "info"
            }
            onClick={() => onNavigate(item.id)}
            aria-label={`Explorar ${item.title}`}
          >
            <span className="welcome-card-top">
              <span className="welcome-symbol">
                <item.icon size={22} />
              </span>
              <ArrowUpRight size={18} />
            </span>
            <h3>{item.title}</h3>
            <p>{item.description}</p>
            <span className="welcome-card-link">
              Abrir {item.title.toLocaleLowerCase("pt-BR")}{" "}
              <ArrowUpRight size={14} />
            </span>
          </button>
        ))}
      </section>
      <section
        className="welcome-preferences"
        aria-label="Personalização e versão"
      >
        <button onClick={() => onNavigate("appearance")}>
          <Palette size={19} />
          <span>
            <strong>Do seu jeito</strong>
            <small>Temas, cores e efeitos em Aparência</small>
          </span>
          <ArrowUpRight size={16} />
        </button>
        <button onClick={() => onNavigate("updates")}>
          <RefreshCw size={19} />
          <span>
            <strong>Sempre em dia</strong>
            <small>Confira as novidades em Atualizações</small>
          </span>
          <ArrowUpRight size={16} />
        </button>
      </section>
    </div>
  );
}
