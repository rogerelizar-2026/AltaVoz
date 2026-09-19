import type { LogEntry, TranscriptResult } from "./types";
import { fmtDateTime } from "./utils";

const LOG_KEY = "altavoz.log.v1";
const RESULTS_KEY = "altavoz.results.v1";

function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* armazenamento indisponível — o fluxo continua em memória */
  }
}

export function loadLog(): LogEntry[] {
  const raw = safeGet(LOG_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as LogEntry[];
    return Array.isArray(parsed) ? parsed.slice(0, 400) : [];
  } catch {
    return [];
  }
}

export function saveLog(entries: LogEntry[]): void {
  safeSet(LOG_KEY, JSON.stringify(entries.slice(0, 400)));
}

export function loadResults(): TranscriptResult[] {
  const raw = safeGet(RESULTS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as TranscriptResult[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveResults(results: TranscriptResult[]): void {
  safeSet(RESULTS_KEY, JSON.stringify(results.slice(0, 20)));
}

export function logToText(entries: LogEntry[]): string {
  const lines = entries.map((e) => {
    const base = `${fmtDateTime(e.at)}  [${e.kind.toUpperCase().padEnd(7, " ")}]  ${e.title}`;
    return e.detail ? `${base}\n${" ".repeat(34)}${e.detail}` : base;
  });
  return [
    "AtaVoz — Diário de integridade (cadeia de custódia)",
    `Exportado em ${fmtDateTime(Date.now())}`,
    "=".repeat(72),
    ...lines,
  ].join("\n");
}

export function downloadText(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}
