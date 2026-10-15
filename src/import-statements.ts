import {
  validateData,
  type Data,
  type Purchase,
  type CashEntry,
} from "./domain";
import { detectCategory } from "./suggestions";
export type StatementRow = {
  line: number;
  date: string;
  description: string;
  cents: number;
  reference?: string;
  error?: string;
};
const fold = (s: string) =>
  s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
export function statementDate(text: string) {
  let value = text.trim(),
    m: RegExpMatchArray | null;
  if ((m = value.match(/^(\d{4})[-/]?(\d{2})[-/]?(\d{2})(?:T|\d|\[|$)/)))
    value = `${m[1]}-${m[2]}-${m[3]}`;
  else if ((m = value.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/)))
    value = `${m[3]}-${m[2]}-${m[1]}`;
  if (
    !/^(20\d{2}|21\d{2})-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/.test(value) ||
    new Date(value + "T12:00:00Z").toISOString().slice(0, 10) !== value
  )
    throw new Error("Data inválida.");
  return value;
}
export function statementMoney(text: string) {
  let v = text.trim().replace(/R\$|\s/g, "");
  const negative = v.startsWith("-") || /^\(.*\)$/.test(v);
  v = v.replace(/^[+-]/, "").replace(/^\(|\)$/g, "");
  if (v.includes(",")) {
    if (!/^(\d+|\d{1,3}(\.\d{3})+),\d{1,2}$/.test(v))
      throw new Error("Valor inválido.");
    v = v.replaceAll(".", "").replace(",", ".");
  } else if (!/^\d+(\.\d{1,2})?$/.test(v)) throw new Error("Valor inválido.");
  const [whole, decimal = ""] = v.split("."),
    cents = Number(whole) * 100 + Number(decimal.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents) || cents === 0 || cents > 100_000_000_000)
    throw new Error("Valor inválido.");
  return negative ? -cents : cents;
}
export function csvCells(text: string, separator: string) {
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (quoted || !cell) quoted = !quoted;
      else throw new Error("Aspas inválidas no CSV.");
    } else if (ch === separator && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((ch === "\n" || ch === "\r") && !quoted) {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((c) => c.trim())) rows.push(row);
      row = [];
      cell = "";
      if (rows.length > 1001)
        throw new Error("Importe até 1.000 lançamentos por arquivo.");
    } else cell += ch;
  }
  if (quoted) throw new Error("O CSV contém aspas não fechadas.");
  row.push(cell);
  if (row.some((c) => c.trim())) rows.push(row);
  if (rows.length > 1001)
    throw new Error("Importe até 1.000 lançamentos por arquivo.");
  return rows;
}
export const COLUMN_ALIASES = {
  date: [
    "data",
    "date",
    "data da compra",
    "data de compra",
    "data lancamento",
    "data de lancamento",
    "dtposted",
  ],
  description: [
    "descricao",
    "description",
    "titulo",
    "title",
    "historico",
    "estabelecimento",
    "memo",
    "nome",
  ],
  value: ["valor", "value", "amount", "total", "trnamt"],
};
export function parseCsv(
  text: string,
  mapping?: { date: number; description: number; value: number },
  separator?: string,
) {
  text = text.replace(/^\uFEFF/, "");
  const first = text.split(/\r?\n/, 1)[0];
  const sep =
    separator ??
    [";", ",", "\t"].sort(
      (a, b) => csvCells(first, b)[0]?.length - csvCells(first, a)[0]?.length,
    )[0];
  const cells = csvCells(text, sep);
  if (cells.length < 2)
    throw new Error("O CSV precisa de cabeçalho e lançamentos.");
  const headers = cells[0].map((h) => h.trim());
  const index = (key: keyof typeof COLUMN_ALIASES) =>
    headers.findIndex((h) => COLUMN_ALIASES[key].includes(fold(h)));
  const columns = mapping ?? {
    date: index("date"),
    description: index("description"),
    value: index("value"),
  };
  if (
    new Set(Object.values(columns)).size !== 3 ||
    Object.values(columns).some((i) => i < 0 || i >= headers.length)
  )
    return {
      headers,
      separator: sep,
      columns,
      rows: [] as StatementRow[],
      needsMapping: true,
    };
  const rows = cells.slice(1).map((cells, i): StatementRow => {
    let date = "",
      cents = 0;
    const description = cells[columns.description]?.trim() ?? "";
    try {
      if (description.length === 0 || description.length > 100)
        throw new Error("Descrição deve ter de 1 a 100 caracteres.");
      date = statementDate(cells[columns.date] ?? "");
      cents = statementMoney(cells[columns.value] ?? "");
      return { line: i + 2, date, description, cents };
    } catch (e) {
      return {
        line: i + 2,
        date,
        description,
        cents,
        error: (e as Error).message,
      };
    }
  });
  return { headers, separator: sep, columns, rows, needsMapping: false };
}
const decode = (s: string) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'");
export function parseOfx(text: string): StatementRow[] {
  if (/<!DOCTYPE|<!ENTITY/i.test(text))
    throw new Error("OFX com declarações externas não é aceito.");
  const blocks = [...text.matchAll(/<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi)];
  if (!blocks.length || blocks.length > 1000)
    throw new Error("O OFX precisa conter de 1 a 1.000 transações.");
  return blocks.map((block, i) => {
    const field = (key: string) =>
      decode(
        block[1].match(new RegExp(`<${key}>([^<\\r\\n]*)`, "i"))?.[1]?.trim() ??
          "",
      );
    const description = field("MEMO") || field("NAME"),
      reference = field("FITID");
    try {
      if (!description || description.length > 100)
        throw new Error("Descrição deve ter de 1 a 100 caracteres.");
      if (reference.length > 100)
        throw new Error("Identificador de transação inválido.");
      return {
        line: i + 1,
        date: statementDate(field("DTPOSTED")),
        description,
        cents: statementMoney(field("TRNAMT")),
        reference,
      };
    } catch (e) {
      return {
        line: i + 1,
        date: "",
        description,
        cents: 0,
        error: (e as Error).message,
      };
    }
  });
}
export type ImportTarget =
  | { kind: "card"; cardId: string; month: string; positiveCharges: boolean }
  | { kind: "cash"; source: string };
export function importPreview(
  data: Data,
  rows: StatementRow[],
  target: ImportTarget,
) {
  const seen = new Set<string>();
  return rows.map((row) => {
    const identity = row.reference
      ? `id:${row.reference}`
      : `${row.date}:${fold(row.description)}:${row.cents}`;
    const importKey =
      `${target.kind === "card" ? target.cardId : "cash"}:${identity}`.slice(
        0,
        200,
      );
    const duplicate =
      seen.has(importKey) ||
      data.purchases.some((p) => p.importKey === importKey) ||
      !!data.cashEntries?.some((e) => e.importKey === importKey) ||
      (target.kind === "card"
        ? data.purchases.some(
            (p) =>
              p.cardId === target.cardId &&
              p.installments === 1 &&
              p.nextMonth === target.month &&
              fold(p.description) === fold(row.description) &&
              p.totalCents === Math.abs(row.cents),
          )
        : !!data.cashEntries?.some(
            (e) =>
              e.date === row.date &&
              e.kind === (row.cents > 0 ? "income" : "deduction") &&
              fold(e.description) === fold(row.description) &&
              e.amountCents === Math.abs(row.cents),
          ));
    seen.add(importKey);
    const credit =
      target.kind === "card" &&
      (target.positiveCharges ? row.cents < 0 : row.cents > 0);
    const category = detectCategory(row.description, [])?.category ?? "Outros";
    return {
      ...row,
      importKey,
      duplicate,
      credit,
      category,
      selected: !row.error && !duplicate && !credit,
    };
  });
}
export function applyStatement(
  data: Data,
  rows: StatementRow[],
  target: ImportTarget,
  selection: Set<number>,
  categories: Record<number, string> = {},
): Data {
  const preview = importPreview(data, rows, target);
  const selected = preview.filter(
    (r) => selection.has(r.line) && !r.error && !r.duplicate && !r.credit,
  );
  if (!selected.length)
    throw new Error(
      "Selecione pelo menos um lançamento válido e sem duplicidade.",
    );
  if (target.kind === "card") {
    if (!data.cards.some((c) => c.id === target.cardId))
      throw new Error("Escolha um cartão válido.");
    const purchases: Purchase[] = selected.map((r) => ({
      id: crypto.randomUUID(),
      description: r.description,
      cardId: target.cardId,
      category: categories[r.line] ?? r.category,
      totalCents: Math.abs(r.cents),
      installments: 1,
      paid: 0,
      nextMonth: target.month,
      importKey: r.importKey,
    }));
    return validateData({
      ...data,
      purchases: [...data.purchases, ...purchases],
    });
  }
  const entries: CashEntry[] = selected.map((r) => ({
    id: crypto.randomUUID(),
    description: r.description,
    source: target.source.trim() || "Extrato importado",
    date: r.date,
    kind: r.cents > 0 ? "income" : "deduction",
    amountCents: Math.abs(r.cents),
    ...(r.cents > 0 ? { status: "received" as const } : {}),
    importKey: r.importKey,
  }));
  return validateData({
    ...data,
    cashEntries: [...(data.cashEntries ?? []), ...entries],
  });
}
