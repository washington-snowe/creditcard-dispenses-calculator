import { CATEGORIES, type Data } from "./domain";
export type CategoryRecord = { name: string; category: string };
export const foldName = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
export const EXAMPLES = {
  purchase: [
    "Notebook",
    "Celular",
    "Sofá",
    "Supermercado",
    "Curso de inglês",
    "Passagem aérea",
    "Combustível",
    "Consulta médica",
    "Restaurante",
    "Tênis",
    "Videogame",
  ],
  subscription: [
    "Netflix",
    "Spotify",
    "Amazon Prime",
    "YouTube Premium",
    "Disney+",
    "HBO Max",
    "Apple Music",
    "iCloud",
    "Google One",
    "Microsoft 365",
    "Adobe Creative Cloud",
    "Academia",
    "Internet residencial",
    "Plano de celular",
    "ChatGPT Plus",
  ],
  expense: [
    "Conta de luz",
    "Conta de água",
    "Aluguel",
    "Condomínio",
    "Internet residencial",
    "Plano de saúde",
    "Supermercado",
    "Combustível",
    "Consulta médica",
    "IPTU",
    "IPVA",
    "Mensalidade escolar",
  ],
  income: [
    "Salário",
    "Freelance",
    "Vendas",
    "Reembolso",
    "Aluguel recebido",
    "Dividendos",
    "Rendimentos",
    "Pagamento de cliente",
  ],
  card: [
    "Principal",
    "Meu cartão",
    "Meu roxinho",
    "Viagens",
    "Compras online",
    "Dia a dia",
  ],
  source: [
    "Salário",
    "Freelance",
    "Vendas",
    "Reembolso",
    "Investimentos",
    "Empresa",
    "Cliente",
  ],
};
export function nameOptions(
  history: readonly string[],
  examples: readonly string[] = [],
) {
  const entries = new Map<
    string,
    { value: string; count: number; recent: number }
  >();
  history.forEach((value, index) => {
    const clean = value.trim();
    if (!clean) return;
    const key = foldName(clean),
      old = entries.get(key);
    entries.set(key, {
      value: clean,
      count: (old?.count ?? 0) + 1,
      recent: index,
    });
  });
  const names = [...entries.values()]
    .sort((a, b) => b.count - a.count || b.recent - a.recent)
    .slice(0, 1000)
    .map((x) => x.value);
  for (const example of examples) {
    if (!entries.has(foldName(example))) names.push(example);
  }
  return names;
}
export function completionFor(
  value: string,
  options: readonly string[],
  limit = 100,
) {
  const prefix = value.normalize("NFC");
  if (prefix.trim().length < 2) return null;
  const folded = foldName(prefix);
  for (const option of options) {
    const candidate = option.normalize("NFC");
    if (
      foldName(candidate).startsWith(folded) &&
      candidate.length > prefix.length
    ) {
      const suffix = candidate.slice(prefix.length);
      if ((value + suffix).length <= limit)
        return { suffix, accepted: value + suffix };
    }
  }
  return null;
}
const RULES: readonly [string, readonly string[]][] = [
  [
    "Casa",
    [
      "conta de luz",
      "conta de agua",
      "energia eletrica",
      "gas de cozinha",
      "ar condicionado",
      "internet residencial",
      "iptu",
      "aluguel",
      "condominio",
      "sofa",
      "geladeira",
      "fogao",
      "lavadora",
      "microondas",
      "moveis",
      "colchao",
      "construcao",
      "encanador",
      "eletricista",
    ],
  ],
  [
    "Saúde",
    [
      "plano de saude",
      "consulta medica",
      "consulta odontologica",
      "farmacia",
      "medicamento",
      "dentista",
      "hospital",
      "exame",
      "academia",
      "crossfit",
      "terapia",
      "psicologo",
      "fisioterapia",
    ],
  ],
  [
    "Lazer",
    [
      "amazon prime",
      "prime video",
      "youtube premium",
      "apple music",
      "netflix",
      "spotify",
      "disney",
      "hbo",
      "cinema",
      "teatro",
      "show",
      "viagem",
      "hotel",
      "videogame",
      "playstation",
      "xbox",
      "steam",
    ],
  ],
  [
    "Tecnologia",
    [
      "google one",
      "microsoft 365",
      "adobe creative cloud",
      "notebook",
      "computador",
      "celular",
      "smartphone",
      "tablet",
      "software",
      "icloud",
      "armazenamento",
      "chatgpt",
      "adobe",
      "monitor",
      "impressora",
      "roteador",
    ],
  ],
  [
    "Educação",
    [
      "mensalidade escolar",
      "curso",
      "faculdade",
      "escola",
      "livro",
      "universidade",
      "material escolar",
      "apostila",
      "udemy",
      "alura",
    ],
  ],
  [
    "Alimentação",
    [
      "supermercado",
      "mercado",
      "padaria",
      "restaurante",
      "ifood",
      "lanche",
      "almoco",
      "jantar",
      "pizza",
      "acougue",
      "hortifruti",
      "cafe da manha",
    ],
  ],
  [
    "Transporte",
    [
      "passagem aerea",
      "uber",
      "taxi",
      "onibus",
      "metro",
      "combustivel",
      "gasolina",
      "etanol",
      "estacionamento",
      "pedagio",
      "ipva",
      "mecanico",
      "99",
    ],
  ],
  [
    "Compras",
    [
      "roupa",
      "calcado",
      "tenis",
      "vestuario",
      "amazon",
      "shopee",
      "shein",
      "loja",
    ],
  ],
];
function words(value: string) {
  return foldName(value)
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
export function detectCategory(
  name: string,
  history: readonly CategoryRecord[] = [],
) {
  const normalized = words(name);
  if (!normalized) return null;
  const learned = history.filter(
    (item) =>
      words(item.name) === normalized && CATEGORIES.includes(item.category),
  );
  if (learned.length) {
    const totals = new Map<string, { count: number; recent: number }>();
    learned.forEach((item, index) =>
      totals.set(item.category, {
        count: (totals.get(item.category)?.count ?? 0) + 1,
        recent: index,
      }),
    );
    const best = [...totals].sort(
      (a, b) => b[1].count - a[1].count || b[1].recent - a[1].recent,
    )[0]!;
    return { category: best[0], source: "history" as const };
  }
  const candidates = RULES.flatMap(([category, terms]) =>
    terms
      .filter((term) => ` ${normalized} `.includes(` ${term} `))
      .map((term) => ({ category, score: term.length })),
  );
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0]
    ? { category: candidates[0].category, source: "name" as const }
    : null;
}
export function categoryHistory(
  data: Data | undefined,
  kind: "purchase" | "subscription" | "expense",
): CategoryRecord[] {
  if (!data) return [];
  if (kind === "subscription")
    return (data.subscriptions ?? []).map((x) => ({
      name: x.name,
      category: x.category,
    }));
  const entries = kind === "purchase" ? data.purchases : (data.expenses ?? []);
  return entries.map((x) => ({ name: x.description, category: x.category }));
}
