import { EMPTY, validateData, type Data } from "./domain";
declare global {
  interface Window {
    saldo?: {
      performanceInfo?: () => Promise<PerformanceInfo>;
      restart?: () => Promise<{ restarting: boolean }>;
      listBackups?: () => Promise<BackupInfo[]>;
      readBackup?: (id: string) => Promise<unknown>;
      createBackup?: () => Promise<void>;
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
export type BackupInfo = { id: string; createdAt: string; bytes: number };
export type PerformanceInfo = {
  enabledAtLaunch: boolean;
  accelerationEnabled: boolean;
  gpuCompositing: string;
};
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
  else {
    if (validated.settings?.automaticBackups !== false) {
      const previous = localStorage.getItem(key);
      if (previous) await browserSnapshot(previous);
    }
    localStorage.setItem(key, JSON.stringify(validated));
  }
}

const backupKey = "contaclara-backups-v1";
type BrowserBackup = BackupInfo & { data: Data };
function browserBackups(): BrowserBackup[] {
  const saved = JSON.parse(localStorage.getItem(backupKey) || "[]");
  if (!Array.isArray(saved)) throw new Error("Lista de backups inválida.");
  return saved;
}
async function browserSnapshot(text: string, force = false) {
  const data = validateData(JSON.parse(text)),
    list = browserBackups();
  if (
    !force &&
    list.length &&
    Date.now() - Date.parse(list[0].createdAt) < 86400000
  )
    return;
  const item = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    bytes: new TextEncoder().encode(text).length,
    data,
  };
  // Browser preview has a small storage quota; the desktop retains 30 copies on disk.
  localStorage.setItem(backupKey, JSON.stringify([item, ...list].slice(0, 5)));
}
export async function listBackups(): Promise<BackupInfo[]> {
  return window.saldo?.listBackups
    ? window.saldo.listBackups()
    : browserBackups().map(({ data: _, ...info }) => info);
}
export async function readBackup(id: string): Promise<Data> {
  const data = window.saldo?.readBackup
    ? await window.saldo.readBackup(id)
    : browserBackups().find((b) => b.id === id)?.data;
  return validateData(data);
}
export async function createBackup(data: Data) {
  if (window.saldo?.createBackup) await window.saldo.createBackup();
  else await browserSnapshot(JSON.stringify(data), true);
}
