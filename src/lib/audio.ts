/**
 * Análise real de áudio no navegador:
 * - SHA-256 do arquivo (Web Crypto) — a mesma "impressão digital" usada no relatório;
 * - duração, forma de onda (picos) e volume médio (RMS) via decodificação.
 */

let ctxPromise: Promise<AudioContext> | null = null;

export function getAudioContext(): Promise<AudioContext> {
  if (!ctxPromise) {
    ctxPromise = new Promise((resolve, reject) => {
      try {
        const Ctor: typeof AudioContext =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        resolve(new Ctor());
      } catch (e) {
        reject(e);
      }
    });
  }
  return ctxPromise;
}

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Hash de texto (usado também para o hash do próprio relatório). */
/** Ambiente seguro para Web Crypto — retorna false se não disponível (HTTPS necessário) */
export function isWebCryptoAvailable(): boolean {
  return !!(globalThis.crypto?.subtle);
}

export async function sha256Hex(data: ArrayBuffer | string): Promise<string> {
  let buffer: ArrayBuffer;
  if (typeof data === "string") {
    buffer = new TextEncoder().encode(data).buffer as ArrayBuffer;
  } else {
    buffer = data;
  }
  const subtle = globalThis.crypto?.subtle;
  if (subtle) {
    const digest = await subtle.digest("SHA-256", buffer);
    return toHex(digest);
  }
  // Ambiente sem Web Crypto (contexto não seguro): fallback FNV-1a expandido,
  // apenas para não travar o fluxo — sinalizado no diário.
  const bytes = new Uint8Array(buffer);
  let h = 0x811c9dc5;
  let out = "";
  for (let round = 0; round < 8; round++) {
    for (let i = 0; i < bytes.length; i += 1) {
      h ^= bytes[i] + round;
      h = Math.imul(h, 0x01000193);
    }
    out += (h >>> 0).toString(16).padStart(8, "0");
  }
  return out.slice(0, 64);
}

export async function hashBlob(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  return sha256Hex(buf);
}

export interface AudioAnalysis {
  durationSec: number;
  peaks: number[];
  rms: number;
}

/**
 * Decodifica o áudio e extrai duração, ~120 picos normalizados (0..1)
 * e o volume médio (RMS). Lança erro se o arquivo estiver ilegível/corrompido.
 */
export async function analyzeBlob(blob: Blob, peakCount = 120): Promise<AudioAnalysis> {
  const ctx = await getAudioContext();
  const buf = await blob.arrayBuffer();
  let decoded: AudioBuffer;
  try {
    decoded = await ctx.decodeAudioData(buf.slice(0));
  } catch {
    throw new Error("decode-failed");
  }
  if (!isFinite(decoded.duration) || decoded.duration <= 0) {
    throw new Error("decode-failed");
  }

  const ch = decoded.getChannelData(0);
  const bucket = Math.max(1, Math.floor(ch.length / peakCount));
  const peaks: number[] = [];
  let max = 0;
  for (let i = 0; i < peakCount; i++) {
    let p = 0;
    const start = i * bucket;
    const end = Math.min(ch.length, start + bucket);
    for (let j = start; j < end; j += 4) {
      const v = Math.abs(ch[j]);
      if (v > p) p = v;
    }
    peaks.push(p);
    if (p > max) max = p;
  }
  if (max > 0) for (let i = 0; i < peaks.length; i++) peaks[i] = peaks[i] / max;

  let sum = 0;
  let n = 0;
  for (let j = 0; j < ch.length; j += 64) {
    sum += ch[j] * ch[j];
    n += 1;
  }
  const rms = n > 0 ? Math.sqrt(sum / n) : 0;

  return { durationSec: decoded.duration, peaks, rms };
}

export function pickMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c)) return c;
  }
  return "";
}
