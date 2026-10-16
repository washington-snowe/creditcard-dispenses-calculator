import {
  House,
  LayoutDashboard,
  CreditCard,
  ShoppingBag,
  Banknote,
  ReceiptText,
  Repeat,
  CalendarDays,
  Bell,
  Zap,
  Calculator,
  Palette,
  DatabaseBackup,
  RefreshCw,
  Settings2,
  Target,
  type LucideIcon,
} from "lucide-react";

export type PageId =
  | "home"
  | "overview"
  | "cards"
  | "purchases"
  | "income"
  | "expenses"
  | "subscriptions"
  | "calendar"
  | "pending"
  | "planning"
  | "goals"
  | "anticipation"
  | "simulator"
  | "appearance"
  | "data"
  | "updates";
export type NavigationFunction = {
  id: PageId;
  title: string;
  description: string;
  keywords: string;
  icon: LucideIcon;
};
export const NAV_FUNCTIONS: NavigationFunction[] = [
  {
    id: "home",
    title: "Início",
    description: "Seu resumo do mês e atalhos úteis.",
    keywords:
      "inicio resumo hoje ajuda funcoes começar disponivel reserva quanto posso gastar orçamento",
    icon: House,
  },
  {
    id: "overview",
    title: "Visão geral",
    description: "Compare gastos, dívidas e gráficos dos cartões.",
    keywords:
      "graficos estatisticas quanto estou devendo total divida devo gastos bancos comparacao comparar",
    icon: LayoutDashboard,
  },
  {
    id: "cards",
    title: "Meus cartões",
    description: "Consulte limites, faturas e registre pagamentos.",
    keywords:
      "adicionar cadastrar editar registrar cartao cartoes banco bancos limite pagar fatura faturas marcar pago vencimento",
    icon: CreditCard,
  },
  {
    id: "purchases",
    title: "Minhas compras",
    description: "Registre compras e acompanhe suas parcelas.",
    keywords:
      "compra compras anotar adicionar cadastrar parcelamento parcelas filtrar pesquisar",
    icon: ShoppingBag,
  },
  {
    id: "income",
    title: "Entradas do mês",
    description: "Registre rendimentos e veja quanto sobrará.",
    keywords:
      "adicionar cadastrar editar registrar salario renda rendas recorrentes dinheiro recebimento receber entradas sobra sobrar quanto sobra saldo transporte mes",
    icon: Banknote,
  },
  {
    id: "expenses",
    title: "Despesas",
    description: "Organize contas, despesas e pagamentos do mês.",
    keywords:
      "adicionar cadastrar editar registrar despesa despesas gasto gastos contas boleto boletos pix aluguel luz agua pagar",
    icon: ReceiptText,
  },
  {
    id: "subscriptions",
    title: "Assinaturas",
    description: "Gerencie serviços recorrentes e mensalidades.",
    keywords:
      "adicionar cadastrar editar registrar assinatura assinaturas streaming netflix spotify mensalidade recorrente servico cancelar",
    icon: Repeat,
  },
  {
    id: "calendar",
    title: "Calendário",
    description: "Veja recebimentos, fechamentos e vencimentos.",
    keywords: "agenda calendario datas dia vencimento recebimento fechamento",
    icon: CalendarDays,
  },
  {
    id: "pending",
    title: "Pendências",
    description: "Encontre atrasos e compromissos a confirmar.",
    keywords:
      "pendencia pendencias atrasado atraso atrasos alerta aviso falta pagar confirmar",
    icon: Bell,
  },
  {
    id: "planning",
    title: "Planejamento",
    description: "Veja quanto pagará nos próximos meses.",
    keywords:
      "planejar planejamento previsao futuro proximos meses mensal parcelas orcamento quanto vou pagar",
    icon: CalendarDays,
  },
  {
    id: "anticipation",
    title: "Antecipações",
    description: "Compare parcelas caras e o alívio ao antecipar.",
    keywords:
      "antecipar antecipacao antecipacoes quitar quitacao adiantar adiantado aliviar alivio parcelas caras divida",
    icon: Zap,
  },
  {
    id: "goals",
    title: "Metas",
    description: "Planeje conquistas, acompanhe economias e reduza gastos.",
    keywords:
      "meta metas objetivo objetivos comprar algo juntar guardar dinheiro economizar economizei economia economias gastar menos reduzir gastos reserva viagem viajar sonho prioridade quanto falta poupar poupanca",
    icon: Target,
  },
  {
    id: "simulator",
    title: "Simular compra",
    description: "Confira o impacto de uma compra antes de cadastrar.",
    keywords:
      "simular simulacao simulador posso comprar cabe orcamento impacto nova compra melhor cartao",
    icon: Calculator,
  },
  {
    id: "appearance",
    title: "Aparência",
    description: "Ajuste tema, cores, efeitos e desempenho.",
    keywords:
      "aparencia tema claro escuro ultra dark cor cores animacao animacoes glow efeito fonte visual hardware aceleracao desempenho",
    icon: Palette,
  },
  {
    id: "data",
    title: "Dados e segurança",
    description: "Exporte, importe e restaure seus backups.",
    keywords:
      "backup backups copia seguranca dados exportar importar restaurar csv historico desfazer privacidade",
    icon: DatabaseBackup,
  },
  {
    id: "updates",
    title: "Atualizações",
    description: "Verifique e instale novas versões do programa.",
    keywords:
      "atualizar atualizacao atualizacoes versao download github instalar armazenamento limpeza",
    icon: RefreshCw,
  },
];
export const NAV_GROUPS: {
  title: string;
  description: string;
  icon: LucideIcon;
  ids: PageId[];
}[] = [
  {
    title: "Resumo",
    description: "Início, calendário e pendências",
    icon: House,
    ids: ["home", "overview", "calendar", "pending"],
  },
  {
    title: "Movimentações",
    description: "Compras, cartões e dinheiro",
    icon: ReceiptText,
    ids: ["purchases", "cards", "income", "expenses", "subscriptions"],
  },
  {
    title: "Planejamento",
    description: "Previsões, metas e antecipações",
    icon: CalendarDays,
    ids: ["planning", "goals", "anticipation", "simulator"],
  },
  {
    title: "Configurações",
    description: "Aparência, backups e versão",
    icon: Settings2,
    ids: ["appearance", "data", "updates"],
  },
];
export const SEARCH_EXAMPLES = [
  "Pagar fatura",
  "Salário",
  "Backup",
  "Tema escuro",
  "Parcelas caras",
  "Quanto sobra",
  "Assinaturas",
  "Atualizar",
];
const fold = (value: string) =>
  value.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("pt-BR");
export function findFunctions(query: string): NavigationFunction[] {
  const text = fold(query.trim());
  if (!text)
    return [
      "cards",
      "purchases",
      "income",
      "anticipation",
      "data",
      "appearance",
    ].map((id) => NAV_FUNCTIONS.find((item) => item.id === id)!);
  const words = text
    .split(/\s+/)
    .filter(
      (word) =>
        ![
          "como",
          "onde",
          "quero",
          "vejo",
          "ver",
          "de",
          "do",
          "da",
          "dos",
          "das",
          "o",
          "a",
          "os",
          "as",
          "meu",
          "meus",
          "minha",
          "minhas",
          "um",
          "uma",
          "no",
          "na",
          "para",
        ].includes(word),
    );
  if (!words.length) return findFunctions("");
  return NAV_FUNCTIONS.map((item) => {
    const title = fold(item.title),
      description = fold(item.description),
      keywords = fold(
        `${item.keywords} ${NAV_GROUPS.find((group) => group.ids.includes(item.id))?.title ?? ""}`,
      );
    const haystack = `${title} ${description} ${keywords}`;
    if (!words.every((word) => haystack.includes(word)))
      return { item, score: 0 };
    return {
      item,
      score:
        (title === text ? 100 : title.startsWith(text) ? 50 : 0) +
        words.reduce(
          (score, word) =>
            score +
            (title.includes(word) ? 20 : keywords.includes(word) ? 12 : 5),
          0,
        ),
    };
  })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((row) => row.item);
}
