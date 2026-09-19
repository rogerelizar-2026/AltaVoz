export interface AudioFileRec {
  id: string;
  name: string;
  sizeBytes: number;
  sha256: string | null;
  hashing: boolean;
  durationSec: number | null;
  analyzeError: string | null;
  peaks: number[] | null;
  rms: number | null;
  blobUrl: string;
  addedAt: number;
  tooLong: boolean;
}

export interface SpeakerRec {
  id: string;
  name: string;
  source: "extraida";
  fileId: string;
  segments: SpeakerSegment[];
  createdAt: number;
}

export interface SpeakerSegment {
  startSec: number;
  endSec: number;
  blobUrl: string | null;
  peaks: number[];
  rms: number;
  durationSec: number;
}

export interface VerifyTurn {
  startSec: number;
  suggestedSpeakerId: string;
  confidence: number;
}

export type VerifyStatus = "pendente" | "confirmado" | "rejeitado";

export interface VerificationRec {
  fileId: string;
  turns: VerifyTurn[];
  status: VerifyStatus;
  decidedAt: number | null;
  speakerConf: Record<string, number>;
}

export interface TranscriptSegment {
  id: string;
  start: number;
  end: number;
  speakerId: string;
  speakerName: string;
  text: string;
  confidence: number;
  edited: boolean;
}

export interface SpeakerStat {
  speakerId: string;
  name: string;
  avgConf: number;
  sharePct: number;
}

export interface TranscriptResult {
  fileId: string;
  fileName: string;
  durationSec: number;
  sha256: string;
  seedHex: string;
  processedAt: number;
  elapsedMs: number;
  segments: TranscriptSegment[];
  speakerStats: SpeakerStat[];
  engine: {
    transcriber: string;
    diarizer: string;
    language: string;
    compute: string;
  };
}

export type LogKind =
  | "import"
  | "hash"
  | "sample"
  | "verify"
  | "process"
  | "export"
  | "edit"
  | "system"
  | "alert";

export interface LogEntry {
  id: string;
  at: number;
  kind: LogKind;
  title: string;
  detail?: string;
}

export type StepIndex = 0 | 1 | 2 | 3 | 4;
