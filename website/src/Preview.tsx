import { useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  LayoutDashboard,
  Sparkles,
  Target,
  TrendingUp,
  Wallet,
  Check,
} from "lucide-react";
import { money } from "./config";

const months = [
  {
    name: "Maio",
    income: 640000,
    bills: 218000,
    paid: 146000,
    forecast: [218000, 184000, 157000, 126000, 98000, 72000],
  },
  {
    name: "Junho",
    income: 640000,
    bills: 184000,
    paid: 124000,
    forecast: [184000, 157000, 126000, 98000, 72000, 54000],
  },
  {
    name: "Julho",
    income: 640000,
    bills: 157000,
    paid: 92000,
    forecast: [157000, 126000, 98000, 72000, 54000, 39000],
  },
];
const tabs = ["Visão geral", "Cartões", "Metas"] as const;
type Tab = (typeof tabs)[number];
export default function Preview() {
  const [tab, setTab] = useState<Tab>("Visão geral");
  const [month, setMonth] = useState(1);
  const data = months[month];
  return (
    <div className="preview-wrap" id="demonstracao">
      <div className="preview-glow" aria-hidden="true" />
      <div
        className="app-preview"
        aria-label="Demonstração interativa do ContaClara"
      >
        <div className="window-bar">
          <span className="window-dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span>contaclara / seu espaço financeiro</span>
          <span className="window-status">
            <i /> Tudo em dia
          </span>
        </div>
        <div className="preview-shell">
          <aside className="preview-sidebar" aria-hidden="true">
            <span className="symbol" />
            <span className="preview-nav active">
              <LayoutDashboard />
            </span>
            <span className="preview-nav">
              <Wallet />
            </span>
            <span className="preview-nav">
              <CreditCard />
            </span>
            <span className="preview-nav">
              <Target />
            </span>
            <span className="preview-avatar">CC</span>
          </aside>
          <div className="preview-body">
            <div className="preview-top">
              <div>
                <span className="preview-eyebrow">
                  SEU DINHEIRO, MAIS CLARO
                </span>
                <h3>
                  Um bom dia começa com clareza<span>.</span>
                </h3>
              </div>
              <span className="preview-top-icon" aria-hidden="true">
                <Bell size={17} />
              </span>
            </div>
            <div className="preview-toolbar">
              <div
                className="preview-tabs"
                role="tablist"
                aria-label="Explorar a demonstração"
              >
                {tabs.map((item, index) => (
                  <button
                    key={item}
                    role="tab"
                    id={`preview-tab-${index}`}
                    tabIndex={tab === item ? 0 : -1}
                    aria-selected={tab === item}
                    aria-controls="preview-panel"
                    onClick={() => setTab(item)}
                    onKeyDown={(event) => {
                      let next: number;
                      if (event.key === "ArrowRight")
                        next = (index + 1) % tabs.length;
                      else if (event.key === "ArrowLeft")
                        next = (index + tabs.length - 1) % tabs.length;
                      else if (event.key === "Home") next = 0;
                      else if (event.key === "End") next = tabs.length - 1;
                      else return;
                      event.preventDefault();
                      setTab(tabs[next]);
                      document.getElementById(`preview-tab-${next}`)?.focus();
                    }}
                  >
                    {item}
                  </button>
                ))}
              </div>
              <div className="preview-month">
                <button
                  aria-label="Mês anterior da demonstração"
                  disabled={month === 0}
                  onClick={() => setMonth(month - 1)}
                >
                  <ChevronLeft size={14} />
                </button>
                <span>{data.name} 2026</span>
                <button
                  aria-label="Próximo mês da demonstração"
                  disabled={month === months.length - 1}
                  onClick={() => setMonth(month + 1)}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
            <div
              id="preview-panel"
              role="tabpanel"
              aria-labelledby={`preview-tab-${tabs.indexOf(tab)}`}
              tabIndex={0}
              key={tab}
              className="preview-panel"
            >
              {tab === "Visão geral" && (
                <>
                  <div className="preview-stats">
                    <div className="preview-stat primary">
                      <span>
                        <Wallet size={14} /> Vai sobrar no mês
                      </span>
                      <strong>{money(data.income - data.bills)}</strong>
                      <small>
                        <span className="positive">
                          <TrendingUp size={12} /> Seu mês em perspectiva
                        </span>
                      </small>
                    </div>
                    <div className="preview-stat">
                      <span>
                        <ArrowDownLeft size={14} /> Entradas
                      </span>
                      <strong>{money(data.income)}</strong>
                      <small>Valores cadastrados no mês</small>
                    </div>
                    <div className="preview-stat">
                      <span>
                        <CreditCard size={14} /> Faturas do mês
                      </span>
                      <strong>{money(data.bills)}</strong>
                      <small>
                        <span className="status-dot" /> {money(data.paid)} já
                        pagos
                      </small>
                    </div>
                  </div>
                  <div className="preview-bottom">
                    <div className="preview-chart">
                      <div className="preview-section-label">
                        <strong>Um futuro mais leve</strong>
                        <span>
                          Previsão de parcelas <ArrowUpRight size={12} />
                        </span>
                      </div>
                      <div
                        className="bar-chart"
                        role="img"
                        aria-label={`Exemplo de previsão: ${data.forecast.map((amount, index) => `${["Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"][month + index]} ${money(amount)}`).join(", ")}`}
                      >
                        {data.forecast.map((amount, index) => (
                          <div className="bar-column" key={index}>
                            <div
                              style={{ height: `${(amount / 250000) * 100}%` }}
                            >
                              <i />
                              <span>{money(amount)}</span>
                            </div>
                            <small>
                              {
                                [
                                  "Mai",
                                  "Jun",
                                  "Jul",
                                  "Ago",
                                  "Set",
                                  "Out",
                                  "Nov",
                                  "Dez",
                                ][month + index]
                              }
                            </small>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="preview-goal">
                      <span className="goal-icon">
                        <Target size={17} />
                      </span>
                      <span>UM PASSO DE CADA VEZ</span>
                      <h4>Sua próxima viagem</h4>
                      <div className="goal-amount">
                        <strong>R$ 2.800</strong>
                        <span>de R$ 4.000</span>
                      </div>
                      <div className="progress-track">
                        <i style={{ width: "70%" }} />
                      </div>
                      <div className="goal-progress">
                        <span>Você já chegou a</span>
                        <strong>70%</strong>
                      </div>
                      <span className="goal-note">
                        <Sparkles size={12} /> Seu objetivo está mais perto.
                      </span>
                    </div>
                  </div>
                </>
              )}
              {tab === "Cartões" && (
                <div className="demo-cards">
                  <div className="demo-bank-card">
                    <div>
                      <span>Seu cartão</span>
                      <CreditCard size={24} />
                    </div>
                    <strong>
                      Mais controle.
                      <br />
                      Menos surpresas.
                    </strong>
                    <span>•••• &nbsp; •••• &nbsp; •••• &nbsp; 2048</span>
                    <div>
                      <span>Fatura de {data.name.toLowerCase()}</span>
                      <b>{money(data.bills)}</b>
                    </div>
                  </div>
                  <div className="demo-card-list">
                    <span className="preview-eyebrow">TUDO NO SEU TEMPO</span>
                    <h4>Saiba o que vem pela frente.</h4>
                    {[
                      ["Notebook", "Parcela 4 de 10", "R$ 420,00"],
                      ["Sua próxima viagem", "Parcela 2 de 6", "R$ 280,00"],
                      ["Curso de fotografia", "Parcela 3 de 4", "R$ 149,90"],
                    ].map(([name, detail, value]) => (
                      <div key={name}>
                        <span>
                          <strong>{name}</strong>
                          <small>{detail}</small>
                        </span>
                        <b>{value}</b>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {tab === "Metas" && (
                <div className="demo-goals">
                  <div>
                    <span className="goal-icon">
                      <Target />
                    </span>
                    <h4>
                      Pequenos passos.
                      <br />
                      Grandes conquistas.
                    </h4>
                    <p>
                      Acompanhe suas metas com base nos valores registrados no
                      aplicativo.
                    </p>
                  </div>
                  <div>
                    {[
                      ["Sua próxima viagem", 70, "R$ 2.800 de R$ 4.000"],
                      ["Um novo notebook", 45, "R$ 2.250 de R$ 5.000"],
                      [
                        "Gastar menos com lazer",
                        82,
                        "Orçamento do mês sob controle",
                      ],
                    ].map(([name, progress, detail]) => (
                      <div className="demo-goal-row" key={String(name)}>
                        <div>
                          <strong>{name}</strong>
                          <span>{progress}%</span>
                        </div>
                        <div className="progress-track">
                          <i style={{ width: `${progress}%` }} />
                        </div>
                        <small>{detail}</small>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="preview-footer">
              <span>
                <Check size={12} /> Seu planejamento começa aqui
              </span>
              <span>Dados ilustrativos · Experimente as abas e os meses</span>
            </div>
          </div>
        </div>
      </div>
      <div className="floating-note">
        <span>
          <Check size={14} />
        </span>
        <div>
          <strong>Mais clareza, menos preocupação.</strong>
          <small>Um novo jeito de olhar para o seu dinheiro.</small>
        </div>
      </div>
    </div>
  );
}
