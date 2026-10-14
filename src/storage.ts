import { EMPTY, validateData, type Data } from "./domain";
declare global {
  interface Window {
    saldo?: {
      load: () => Promise<unknown>;
      save: (data: Data) => Promise<void>;
    };
  }
}
const key = "saldo-data-v1";
export async function loadData(): Promise<Data> {
  const value = window.saldo
    ? await window.saldo.load()
    : JSON.parse(localStorage.getItem(key) || "null");
  return value === null ? structuredClone(EMPTY) : validateData(value);
}
export async function saveData(data: Data) {
  const validated = validateData(data);
  if (window.saldo) await window.saldo.save(validated);
  else localStorage.setItem(key, JSON.stringify(validated));
}
