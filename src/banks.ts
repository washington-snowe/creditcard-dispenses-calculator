// Original images and their source checksums are kept in public/banks/sources.json.
const BANK_FILES: Record<string, string> = {
  nubank: "nubank.ico",
  itau: "itau.png",
  bancodobrasil: "bb.ico",
  bradesco: "bradesco.ico",
  santander: "santander.ico",
  inter: "inter.svg",
  caixa: "caixa.png",
  c6bank: "c6.png",
  btgpactual: "btg.png",
  mercadopago: "mercadopago.svg",
  picpay: "picpay.png",
};
const ALIASES: Record<string, string> = {
  bancoitau: "itau",
  itauunibanco: "itau",
  bb: "bancodobrasil",
  bancobradesco: "bradesco",
  bancosantander: "santander",
  bancointer: "inter",
  caixaeconomicafederal: "caixa",
  cef: "caixa",
  c6: "c6bank",
  btg: "btgpactual",
};
export function bankLogoFile(name: string) {
  const key = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]/g, "");
  return BANK_FILES[ALIASES[key] ?? key] ?? null;
}
