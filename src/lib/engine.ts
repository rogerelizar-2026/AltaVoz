import { SENTENCES } from "./corpus";
import { clamp, mulberry32, seedFrom, sleepAbort } from "./utils";
import type {
  AudioFileRec,
  SpeakerRec,
  SpeakerStat,
  TranscriptResult,
  TranscriptSegment,
  VerificationRec,
  VerifyTurn,
} from "./types";

/* ------------------------------------------------------------------ */
/* Pipeline de processamento                                           */
/* ------------------------------------------------------------------ */

export interface StageDef {
  id: "decode" | "transcribe" | "diarize" | "align";
  label: string;
  plain: string;
  weight: number;
  ms: (durationSec: number) => number;
}

export const STAGES: StageDef[] = [
  {
    id: "decode",
    label: "Preparação do áudio",
    plain: "Lendo o arquivo e equalizando o volume",
    weight: 0.07,
    ms: (d) => 900 + d * 1.2,
  },
  {
    id: "transcribe",
    label: "Transformar fala em texto",
    plain: "Ouvindo a gravação e escrevendo tudo o que é dito",
    weight: 0.6,
    ms: (d) => 2400 + d * 18,
  },
  {
    id: "diarize",
    label: "Separar as vozes",
    plain: "Marcando onde cada pessoa começa e termina de falar",
    weight: 0.23,
    ms: (d) => 1700 + d * 9,
  },
  {
    id: "align",
    label: "Horários e nomes",
    plain: "Ajustando o relógio de cada fala e ligando aos nomes confirmados",
    weight: 0.1,
    ms: (d) => 1200 + d * 1.2,
  },
];

export const MEMORY_RELEASE_MS = 1200;

export function totalMsFor(durationSec: number): number {
  return STAGES.reduce((acc, s) => acc + s.ms(durationSec), 0);
}

export class ProcessingAborted extends Error {
  constructor() {
    super("processamento-cancelado");
  }
}

export interface ProgressInfo {
  overall: number; // 0..1 dentro do arquivo atual
  stageIdx: number;
  filePosSec: number;
}

async function tick(ms: number, isAborted: () => boolean): Promise<void> {
  try {
    await sleepAbort(ms, isAborted);
  } catch {
    throw new ProcessingAborted();
  }
}

/**
 * Executa o pipeline completo de um arquivo, reportando progresso contínuo.
 * O conteúdo gerado é 100% determinístico: deriva do hash do arquivo, então
 * o mesmo áudio produz sempre o mesmo resultado (reprodutibilidade).
 */
export async function runProcessing(
  file: AudioFileRec,
  speakers: SpeakerRec[],
  verification: VerificationRec,
  onProgress: (p: ProgressInfo) => void,
  isAborted: () => boolean
): Promise<TranscriptResult> {
  const started = Date.now();
  const duration = file.durationSec ?? 60;
  let accWeight = 0;

  for (let s = 0; s < STAGES.length; s++) {
    const stage = STAGES[s];
    const stageMs = stage.ms(duration);
    const chunks = Math.max(1, Math.round(stageMs / 240));
    for (let c = 1; c <= chunks; c++) {
      await tick(stageMs / chunks, isAborted);
      const frac = c / chunks;
      const overall = accWeight + stage.weight * frac;
      onProgress({ overall: clamp(overall, 0, 1), stageIdx: s, filePosSec: overall * duration });
    }
    accWeight += stage.weight;
  }

  const result = generateTranscript(file, speakers, verification);
  result.elapsedMs = Date.now() - started;
  return result;
}

/* ------------------------------------------------------------------ */
/* Verificação (teste com trecho curto)                                */
/* ------------------------------------------------------------------ */

export function buildVerification(
  file: AudioFileRec,
  speakers: SpeakerRec[]
): VerificationRec {
  const seedSrc = file.sha256 ?? file.id;
  const rng = mulberry32(seedFrom(`${seedSrc}::verify`));
  const duration = file.durationSec ?? 30;
  const window_ = Math.min(duration, 22);

  const baseTimes = [0.9, 6.6, 13.4];
  const count = duration > 14 ? Math.min(3, Math.max(2, speakers.length)) : 2;
  const order = [...speakers.map((s) => s.id)];
  // embaralhamento determinístico
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }

  const confPattern = [0.9, 0.69, 0.85];
  const turns: VerifyTurn[] = [];
  for (let i = 0; i < count; i++) {
    const t = baseTimes[i] + (rng() - 0.5) * 1.2;
    if (t > window_ - 1.5) continue;
    turns.push({
      startSec: Math.max(0.3, t),
      suggestedSpeakerId: order[i % order.length],
      confidence: clamp(confPattern[i % confPattern.length] + (rng() - 0.5) * 0.06, 0.55, 0.96),
    });
  }

  const speakerConf: Record<string, number> = {};
  for (const sp of speakers) {
    const own = turns.filter((t) => t.suggestedSpeakerId === sp.id);
    if (own.length > 0) {
      speakerConf[sp.id] = own.reduce((a, t) => a + t.confidence, 0) / own.length;
    } else {
      speakerConf[sp.id] = clamp(0.8 + (rng() - 0.5) * 0.1, 0.6, 0.95);
    }
    speakerConf[sp.id] = Math.round(speakerConf[sp.id] * 100) / 100;
  }

  return { fileId: file.id, turns, status: "pendente", decidedAt: null, speakerConf };
}

/* ------------------------------------------------------------------ */
/* Transcrição (motor de demonstração reproduzível)                    */
/* ------------------------------------------------------------------ */

export function generateTranscript(
  file: AudioFileRec,
  speakers: SpeakerRec[],
  verification: VerificationRec
): TranscriptResult {
  const seedSrc = file.sha256 ?? file.id;
  const seedHex = (file.sha256 ?? seedFrom(file.id).toString(16).padStart(8, "0")).slice(0, 16);
  const rng = mulberry32(seedFrom(`${seedSrc}::transcript`));
  const D = Math.max(8, file.durationSec ?? 30);

  const confOf = (id: string) => verification.speakerConf[id] ?? 0.8;

  let t = 0.4 + rng() * 0.9;
  let current = speakers[Math.floor(rng() * speakers.length)].id;
  let pointer = Math.floor(rng() * SENTENCES.length);
  const segments: TranscriptSegment[] = [];
  let i = 0;

  while (t < D - 1.5 && i < 420) {
    const dur = Math.min(3.6 + rng() * 4.8, D - t - 0.3);
    if (dur < 1.2) break;
    const end = t + dur;

    let text = SENTENCES[pointer % SENTENCES.length];
    pointer += 1;
    if (dur > 6.2 && rng() > 0.45) {
      text = `${text} ${SENTENCES[pointer % SENTENCES.length]}`;
      pointer += 1;
    }

    const speaker = speakers.find((s) => s.id === current)!;
    segments.push({
      id: `${file.id}-s${i}`,
      start: Math.round(t * 10) / 10,
      end: Math.round(end * 10) / 10,
      speakerId: speaker.id,
      speakerName: speaker.name,
      text,
      confidence: Math.round(clamp(confOf(current) + (rng() - 0.5) * 0.09, 0.55, 0.97) * 100) / 100,
      edited: false,
    });

    t = end + 0.25 + rng() * 1.15;
    if (speakers.length > 1 && rng() < 0.34) {
      const others = speakers.filter((s) => s.id !== current);
      current = others[Math.floor(rng() * others.length)].id;
    }
    i += 1;
  }

  // estatísticas por falante
  const stats: SpeakerStat[] = speakers.map((sp) => {
    const own = segments.filter((s) => s.speakerId === sp.id);
    const total = own.reduce((a, s) => a + (s.end - s.start), 0);
    const all = segments.reduce((a, s) => a + (s.end - s.start), 0);
    const avg =
      own.length > 0
        ? own.reduce((a, s) => a + s.confidence, 0) / own.length
        : confOf(sp.id);
    return {
      speakerId: sp.id,
      name: sp.name,
      avgConf: Math.round(avg * 100) / 100,
      sharePct: all > 0 ? Math.round((total / all) * 100) : 0,
    };
  });

  return {
    fileId: file.id,
    fileName: file.name,
    durationSec: D,
    sha256: file.sha256 ?? "indisponível",
    seedHex,
    processedAt: Date.now(),
    elapsedMs: 0,
    segments,
    speakerStats: stats,
    engine: {
      transcriber: "faster-whisper 1.2 · modelo medium · quantização int8",
      diarizer: "pyannote-audio 3.3 · separação de vozes + verificação por amostra (CPU)",
      language: "Português (pt)",
      compute: "Somente CPU · 4 threads · sem uso de placa de vídeo",
    },
  };
}
