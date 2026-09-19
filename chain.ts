/**
 * Módulo de cadeia de hash para auditoria de processo de transcrição
 * 
 * Este módulo cria uma cadeia imutável de hashes que rastreia cada etapa
 * do processo: arquivo original → transcrição → diarização → relatório final
 */

export interface ChainStep {
  step: string;
  hash: string;
  timestamp: string;
  input_hash: string | null;
}

export interface TranscriptionData {
  text: string;
  confidence?: number;
  language?: string;
  [key: string]: unknown;
}

export interface DiarizationData {
  speakers: Array<{
    speaker_id: string;
    segments: Array<{
      start: number;
      end: number;
      text: string;
    }>;
  }>;
  [key: string]: unknown;
}

export interface ReportData {
  summary: string;
  metadata: Record<string, unknown>;
  conclusions?: string[];
  [key: string]: unknown;
}

export interface VerificationResult {
  valid: boolean;
  details: Array<{
    step: string;
    valid: boolean;
    expected_hash: string;
    calculated_hash: string;
  }>;
}

/**
 * Converte um ArrayBuffer para string hexadecimal
 */
function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Calcula o hash SHA-256 de uma string usando Web Crypto API
 */
async function calculateHash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  return bufferToHex(hashBuffer);
}

/**
 * Obtém o timestamp atual em formato ISO
 */
function getTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Inicia a cadeia de hash com o hash do arquivo original
 */
export async function initializeChain(originalFileHash: string): Promise<ChainStep[]> {
  const initialStep: ChainStep = {
    step: 'original_file',
    hash: originalFileHash,
    timestamp: getTimestamp(),
    input_hash: null,
  };

  return [initialStep];
}

/**
 * Adiciona o resultado da transcrição à cadeia
 * Calcula: hash(hash_anterior + JSON.stringify(transcricao))
 */
export async function addTranscription(
  chain: ChainStep[],
  transcription: TranscriptionData
): Promise<ChainStep[]> {
  if (chain.length === 0) {
    throw new Error('Cadeia vazia. Inicie com initializeChain primeiro.');
  }

  const previousStep = chain[chain.length - 1];
  const inputHash = previousStep.hash;
  
  // Concatena hash anterior com a transcrição serializada
  const dataToHash = inputHash + JSON.stringify(transcription);
  const newHash = await calculateHash(dataToHash);

  const newStep: ChainStep = {
    step: 'transcription',
    hash: newHash,
    timestamp: getTimestamp(),
    input_hash: inputHash,
  };

  return [...chain, newStep];
}

/**
 * Adiciona a diarização à cadeia
 * Calcula: hash(hash_anterior + JSON.stringify(diarizacao))
 */
export async function addDiarization(
  chain: ChainStep[],
  diarization: DiarizationData
): Promise<ChainStep[]> {
  if (chain.length === 0) {
    throw new Error('Cadeia vazia. Inicie com initializeChain primeiro.');
  }

  const previousStep = chain[chain.length - 1];
  const inputHash = previousStep.hash;
  
  const dataToHash = inputHash + JSON.stringify(diarization);
  const newHash = await calculateHash(dataToHash);

  const newStep: ChainStep = {
    step: 'diarization',
    hash: newHash,
    timestamp: getTimestamp(),
    input_hash: inputHash,
  };

  return [...chain, newStep];
}

/**
 * Adiciona o relatório final à cadeia e completa o processo
 * Calcula: hash(hash_anterior + JSON.stringify(relatorio))
 */
export async function addFinalReport(
  chain: ChainStep[],
  report: ReportData
): Promise<ChainStep[]> {
  if (chain.length === 0) {
    throw new Error('Cadeia vazia. Inicie com initializeChain primeiro.');
  }

  const previousStep = chain[chain.length - 1];
  const inputHash = previousStep.hash;
  
  const dataToHash = inputHash + JSON.stringify(report);
  const newHash = await calculateHash(dataToHash);

  const newStep: ChainStep = {
    step: 'final_report',
    hash: newHash,
    timestamp: getTimestamp(),
    input_hash: inputHash,
  };

  return [...chain, newStep];
}

/**
 * Verifica a integridade de toda a cadeia
 * Recalcula cada hash e compara com os valores armazenados
 */
export async function verifyChain(
  chain: ChainStep[],
  originalFileHash: string,
  transcription: TranscriptionData,
  diarization: DiarizationData,
  report: ReportData
): Promise<VerificationResult> {
  const details: VerificationResult['details'] = [];
  let allValid = true;

  if (chain.length !== 4) {
    return {
      valid: false,
      details: [{
        step: 'structure',
        valid: false,
        expected_hash: '4 steps',
        calculated_hash: `${chain.length} steps`,
      }],
    };
  }

  // Verifica passo 0: original_file
  const originalValid = chain[0].hash === originalFileHash && chain[0].input_hash === null;
  details.push({
    step: chain[0].step,
    valid: originalValid,
    expected_hash: chain[0].hash,
    calculated_hash: originalFileHash,
  });
  if (!originalValid) allValid = false;

  // Verifica passo 1: transcription
  const transcriptionInputHash = chain[0].hash;
  const transcriptionDataToHash = transcriptionInputHash + JSON.stringify(transcription);
  const transcriptionCalculatedHash = await calculateHash(transcriptionDataToHash);
  const transcriptionValid = chain[1].hash === transcriptionCalculatedHash && 
                             chain[1].input_hash === transcriptionInputHash;
  details.push({
    step: chain[1].step,
    valid: transcriptionValid,
    expected_hash: chain[1].hash,
    calculated_hash: transcriptionCalculatedHash,
  });
  if (!transcriptionValid) allValid = false;

  // Verifica passo 2: diarization
  const diarizationInputHash = chain[1].hash;
  const diarizationDataToHash = diarizationInputHash + JSON.stringify(diarization);
  const diarizationCalculatedHash = await calculateHash(diarizationDataToHash);
  const diarizationValid = chain[2].hash === diarizationCalculatedHash && 
                           chain[2].input_hash === diarizationInputHash;
  details.push({
    step: chain[2].step,
    valid: diarizationValid,
    expected_hash: chain[2].hash,
    calculated_hash: diarizationCalculatedHash,
  });
  if (!diarizationValid) allValid = false;

  // Verifica passo 3: final_report
  const reportInputHash = chain[2].hash;
  const reportDataToHash = reportInputHash + JSON.stringify(report);
  const reportCalculatedHash = await calculateHash(reportDataToHash);
  const reportValid = chain[3].hash === reportCalculatedHash && 
                      chain[3].input_hash === reportInputHash;
  details.push({
    step: chain[3].step,
    valid: reportValid,
    expected_hash: chain[3].hash,
    calculated_hash: reportCalculatedHash,
  });
  if (!reportValid) allValid = false;

  return {
    valid: allValid,
    details,
  };
}

/**
 * Exporta a cadeia para JSON (útil para armazenamento)
 */
export function exportChain(chain: ChainStep[]): string {
  return JSON.stringify(chain, null, 2);
}

/**
 * Importa a cadeia de JSON
 */
export function importChain(json: string): ChainStep[] {
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) {
      throw new Error('Formato inválido: esperado um array');
    }
    return parsed as ChainStep[];
  } catch (error) {
    throw new Error(`Falha ao importar cadeia: ${(error as Error).message}`);
  }
}
