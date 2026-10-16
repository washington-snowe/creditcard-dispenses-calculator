import { useEffect, useState } from "react";
import {
  ArrowRight,
  Banknote,
  CalendarDays,
  CreditCard,
  House,
  ShoppingBag,
  Sparkles,
  Target,
} from "lucide-react";
import { welcomeSession, type WelcomeInfo } from "../welcome-session";
import type { PageId } from "../navigation";

export function GreetingPage({
  hasCards,
  onNavigate,
  onPurchase,
  onCard,
  onIncome,
}: {
  hasCards: boolean;
  onNavigate: (page: PageId) => void;
  onPurchase: () => void;
  onCard: () => void;
  onIncome: () => void;
}) {
  const [info, setInfo] = useState<WelcomeInfo | null>(null);
  useEffect(() => {
    let active = true;
    void welcomeSession().then((value) => {
      if (active) setInfo(value);
    });
    return () => {
      active = false;
    };
  }, []);
  const shortcuts = [
    {
      title: "Ver meu resumo",
      description: "Confira as faturas, o saldo e os compromissos do mês.",
      icon: House,
      action: () => onNavigate("home"),
    },
    hasCards
      ? {
          title: "Anotar uma compra",
          description: "Registre um gasto e acompanhe suas parcelas.",
          icon: ShoppingBag,
          action: onPurchase,
        }
      : {
          title: "Cadastrar meu primeiro cartão",
          description:
            "Adicione seu cartão para começar a organizar as faturas.",
          icon: CreditCard,
          action: onCard,
        },
    {
      title: "Registrar uma entrada",
      description: "Anote o dinheiro que recebeu ou espera receber.",
      icon: Banknote,
      action: onIncome,
    },
    {
      title: "Cuidar das minhas metas",
      description: "Planeje uma conquista ou acompanhe quanto economizou.",
      icon: Target,
      action: () => onNavigate("goals"),
    },
    {
      title: "Revisar minhas contas",
      description: "Veja pagamentos e recebimentos que precisam de atenção.",
      icon: CreditCard,
      action: () => onNavigate("pending"),
    },
    {
      title: "Planejar próximos meses",
      description: "Entenda o impacto das parcelas no seu orçamento futuro.",
      icon: CalendarDays,
      action: () => onNavigate("planning"),
    },
  ];
  return (
    <section
      className="greeting"
      data-testid="launch-welcome"
      aria-label="Boas-vindas"
    >
      <header className="greeting-hero">
        <span className="greeting-eyebrow">
          <Sparkles size={16} aria-hidden="true" /> Seu próximo passo começa
          aqui
        </span>
        <h1 tabIndex={-1}>
          {info?.name ? `Boas-vindas, ${info.name}!` : "Boas-vindas!"}
        </h1>
        <blockquote
          className="greeting-quote"
          data-testid="welcome-phrase"
          data-phrase-id={info?.phraseId}
          aria-busy={!info}
        >
          {info ? info.phrase : "Preparando sua inspiração de hoje…"}
        </blockquote>
      </header>
      <section
        className="greeting-suggestions"
        aria-labelledby="greeting-actions-title"
      >
        <div className="greeting-section-heading">
          <h2 id="greeting-actions-title">Por onde vamos começar?</h2>
          <p>Escolha um atalho para seguir com seus planos.</p>
        </div>
        <div className="greeting-grid">
          {shortcuts.map(({ title, description, icon: Icon, action }, i) => (
            <button
              type="button"
              className="greeting-shortcut"
              key={title}
              onClick={action}
              style={{ animationDelay: `${i * 35}ms` }}
            >
              <span className="greeting-shortcut-icon">
                <Icon size={21} aria-hidden="true" />
              </span>
              <span className="greeting-shortcut-copy">
                <strong>{title}</strong>
                <span>{description}</span>
              </span>
              <ArrowRight
                className="greeting-arrow"
                size={19}
                aria-hidden="true"
              />
            </button>
          ))}
        </div>
      </section>
    </section>
  );
}
