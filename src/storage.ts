import { EMPTY, validateData, type Data } from "./domain";
declare global {
  interface Window {
    saldo?: {
      load: () => Promise<unknown>;
      save: (data: Data) => Promise<void>;
      ready?: () => Promise<void>;
      updateInfo: () => Promise<UpdateInfo>;
      openReleases: () => Promise<void>;
      checkUpdates: () => Promise<UpdateInfo>;
      downloadUpdate: () => Promise<{ version: string; ready: boolean }>;
      cancelUpdate: () => Promise<void>;
      applyUpdate: () => Promise<{ restarting: boolean }>;
      onUpdateProgress: (
        callback: (progress: UpdateProgress) => void,
      ) => () => void;
    };
  }
}
export type UpdateInfo = {
  currentVersion: string;
  canInstall: boolean;
  repository: string;
  available?: boolean;
  version?: string;
  releaseUrl?: string;
  downloadUrl?: string;
  lastUpdate?: { success: boolean; version: string; message?: string } | null;
  readyVersion?: string | null;
  downloading?: boolean;
};
export type UpdateProgress = {
  phase: "download" | "verify" | "ready" | "error";
  message?: string;
  version?: string;
  percent: number | null;
  received: number;
  total: number;
};
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
