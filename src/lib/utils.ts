export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Sleep utilitário com suporte a abort, consolidado para uso em todo o código */
export async function sleepAbort(ms: number, isAborted: () => boolean): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = performance.now();
    const iv = window.setInterval(() => {
      if (isAborted()) {
        window.clearInterval(iv);
        reject(new Error("aborted"));
      } else if (performance.now() - start >= ms) {
        window.clearInterval(iv);
        resolve();
      }
    }, 90);
  });
}

/** 00:04:07 — sempre hh:mm:ss, como exigido pelo relatório. */
export function fmtHMS(sec: number): string {
  if (!isFinite(sec) || sec < 0) {
    throw new Error("fmtHMS: duração inválida");
  }
  const s = Math.floor(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return [h, m, r].map((n) => String(n).padStart(2, "0")).join(":");
}

/** 04:07 */
export function fmtMS(sec: number): string {
  if (!isFinite(sec) || sec < 0) {
    throw new Error("fmtMS: duração inválida");
  }
  const s = Math.floor(sec);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

/** "28 min 10 s" para cartões e estimativas. */
export function fmtFriendly(sec: number): string {
  if (!isFinite(sec) || sec < 0) {
    throw new Error("fmtFriendly: duração inválida");
  }
  const s = Math.round(sec);
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m < 60) return r ? `${m} min ${r} s` : `${m} min`;
  const h = Math.floor(m / 60);
  return `${h} h ${m % 60} min`;
}

export function fmtBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function fmtDateTime(ts: number): string {
  return new Date(ts).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function fmtTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function shortHash(h: string, head = 10, tail = 8): string {
  if (h.length <= head + tail + 1) return h;
  return `${h.slice(0, head)}…${h.slice(-tail)}`;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

/** Semente numérica estável derivada de texto (ex.: hash SHA-256 do áudio). */
export function seedFrom(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** PRNG determinístico (mulberry32) — garante resultado reproduzível. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface ConfLabel {
  label: string;
  tone: "ok" | "warn" | "info";
  hint: string;
}

export function confidenceLabel(c: number): ConfLabel {
  if (c >= 0.8)
    return {
      label: "Alta",
      tone: "ok",
      hint: "O sistema tem boa certeza de quem está falando.",
    };
  if (c >= 0.65)
    return {
      label: "Média",
      tone: "info",
      hint: "Provavelmente é esta pessoa, mas confira com atenção.",
    };
  return {
    label: "Baixa",
    tone: "warn",
    hint: "O sistema não tem certeza. Uma amostra de voz melhor ajudaria.",
  };
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
