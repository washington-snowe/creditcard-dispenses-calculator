/** Edit this file to define the commercial offer. Null means not yet announced. */
export const site = {
  downloadUrl:
    "https://github.com/washington-snowe/creditcard-dispenses-calculator/releases/latest/download/ContaClara-Windows-x64.zip",
  supportEmail: import.meta.env.VITE_SUPPORT_EMAIL?.trim() || "",
  sellerName: import.meta.env.VITE_SELLER_NAME?.trim() || "",
  sellerDocument: import.meta.env.VITE_SELLER_DOCUMENT?.trim() || "",
  checkoutEnabled: import.meta.env.VITE_CHECKOUT_ENABLED === "true",
  monthlyCents: null as number | null,
  annualCents: null as number | null,
};
export type PlanId = "monthly" | "annual";
export const money = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    cents / 100,
  );
export const planNames: Record<PlanId, string> = {
  monthly: "Mensal",
  annual: "Anual",
};
