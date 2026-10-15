import { useEffect, useState, type ReactNode } from "react";
import { AvailableCard, ComparisonPanel, LedgerList } from "./workbench";
import { pendingItems, type Destination, type LedgerItem } from "../insights";
import {
  ArrowUpRight,
  Banknote,
  CalendarDays,
  CreditCard,
  LayoutDashboard,
  ReceiptText,
  Repeat,
  ShoppingBag,
  Zap,
} from "lucide-react";
import { money, type Data, type Settings } from "../domain";
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
  saving,
  onSettings,
  onOpen,
  onDrill,
}: {
  data: Data;
  month: string;
  onNavigate: (tab: WelcomeTab) => void;
  onStart: () => void;
  onDemo: () => void;
  saving: boolean;
  onSettings: (settings: Settings) => Promise<boolean>;
  onOpen: (r: Destination) => void;
  onDrill: (rows: LedgerItem[], title: string) => void;
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
  const defaultWidgets = hasData
    ? ["summary", "available", "attention"]
    : ["summary", "functions"];
  const [widgets, setWidgets] = useState(
    data.settings?.homeWidgets ?? defaultWidgets,
  );
  useEffect(
    () => setWidgets(data.settings?.homeWidgets ?? defaultWidgets),
    [data.settings?.homeWidgets, hasData],
  );
  const [customizing, setCustomizing] = useState(false);
  const names: Record<string, string> = {
    summary: "Resumo de pagamentos",
    available: "Disponível para gastar",
    attention: "Próximas pendências",
    functions: "Atalhos das funções",
    comparison: "Comparação entre meses",
  };
  const widget = (id: string, content: ReactNode) =>
    widgets.includes(id) ? (
      <div
        className="home-widget"
        data-widget={id}
        style={{ order: widgets.indexOf(id) }}
      >
        {content}
      </div>
    ) : null;
  const saveWidgets = async (homeWidgets: string[]) => {
    const previous = widgets;
    setWidgets(homeWidgets);
    if (
      !(await onSettings({
        ...data.settings,
        theme: data.settings?.theme ?? "light",
        homeWidgets,
      }))
    )
      setWidgets(previous);
  };
  const percentage = flow.commitments
    ? Math.round((flow.paid / flow.commitments) * 100)
    : 0;
  return (
    <div className="welcome-page">
      <div className="home-customize">
        <button
          className="button secondary"
          aria-expanded={customizing}
          onClick={() => setCustomizing(!customizing)}
        >
          Personalizar início
        </button>
        {customizing && (
          <div className="widget-settings">
            <p>Escolha os cards e use as setas para ordenar.</p>
            {[
              ...widgets,
              ...Object.keys(names).filter((w) => !widgets.includes(w)),
            ].map((id) => (
              <div key={id}>
                <label className="check-line">
                  <input
                    type="checkbox"
                    checked={widgets.includes(id)}
                    disabled={saving}
                    onChange={(e) =>
                      saveWidgets(
                        e.target.checked
                          ? [...widgets, id]
                          : widgets.filter((w) => w !== id),
                      )
                    }
                  />
                  {names[id]}
                </label>
                {widgets.includes(id) && (
                  <>
                    <button
                      className="icon-button"
                      aria-label={`Mover ${names[id]} para cima`}
                      disabled={saving || widgets.indexOf(id) === 0}
                      onClick={() => {
                        const next = [...widgets],
                          i = next.indexOf(id);
                        [next[i - 1], next[i]] = [next[i], next[i - 1]];
                        saveWidgets(next);
                      }}
                    >
                      ↑
                    </button>
                    <button
                      className="icon-button"
                      aria-label={`Mover ${names[id]} para baixo`}
                      disabled={
                        saving || widgets.indexOf(id) === widgets.length - 1
                      }
                      onClick={() => {
                        const next = [...widgets],
                          i = next.indexOf(id);
                        [next[i + 1], next[i]] = [next[i], next[i + 1]];
                        saveWidgets(next);
                      }}
                    >
                      ↓
                    </button>
                  </>
                )}
              </div>
            ))}
            <button
              className="text-button"
              disabled={saving}
              onClick={() => saveWidgets(defaultWidgets)}
            >
              Restaurar organização padrão
            </button>
          </div>
        )}
      </div>
      {widget(
        "available",
        <AvailableCard
          key={data.settings?.reserveCents ?? 0}
          data={data}
          month={month}
          saving={saving}
          onSettings={onSettings}
        />,
      )}
      {widget(
        "attention",
        <section className="panel attention-widget">
          <div className="panel-heading">
            <div>
              <h2>Próximos compromissos</h2>
            </div>
          </div>
          <LedgerList
            rows={pendingItems(data, month).slice(0, 3)}
            onOpen={onOpen}
          />
        </section>,
      )}
      {widget(
        "comparison",
        <ComparisonPanel data={data} month={month} onOpen={onDrill} />,
      )}
      {widget(
        "summary",
        <>
          <section
            className="welcome-summary"
            aria-label="Resumo financeiro do mês"
          >
            <div
              className="welcome-balance"
              data-tone={flow.pending > 0 ? "warning" : "success"}
            >
              <p>Falta pagar no mês</p>
              <strong data-testid="welcome-pending">
                {money(flow.pending)}
              </strong>
              <span>
                Parcelas de cartões, assinaturas e despesas pendentes.
              </span>
              <button
                className="text-button"
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
                <small>Inclui antecipações pagas no mês.</small>
              </div>
            )}
          </section>
          {!hasData && (
            <section className="welcome-start" aria-label="Primeiros passos">
              <div>
                <h2>Comece pelo seu primeiro cartão</h2>
                <p>
                  Depois, registre uma compra. Seus saldos e gráficos são
                  calculados automaticamente.
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
        </>,
      )}
      {widget(
        "functions",
        <>
          <div className="welcome-section-heading">
            <div>
              <h2>O que você quer organizar hoje?</h2>
              <p>Escolha uma sugestão para conhecer e usar cada função.</p>
            </div>
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
        </>,
      )}
    </div>
  );
}
