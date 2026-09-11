import { useCallback, useEffect, useRef, useState } from "react";
import type {
  AudioFileRec,
  LogEntry,
  LogKind,
  SpeakerRec,
  StepIndex,
  TranscriptResult,
  VerificationRec,
} from "./lib/types";
import { analyzeBlob, hashBlob } from "./lib/audio";
import { buildVerification } from "./lib/engine";
import { downloadText, loadLog, loadResults, logToText, saveLog, saveResults } from "./lib/log";
import { fmtBytes, fmtFriendly, uid } from "./lib/utils";
import { ToastProvider, useToast } from "./components/Toasts";
import { Sidebar, LogDrawer, STEP_ICONS, type StepMeta } from "./components/Sidebar";
import { GlossaryModal } from "./components/Term";
import { StepImport, type RejectedFile } from "./components/steps/StepImport";
import { StepSamples } from "./components/steps/StepSamples";
import { StepVerify } from "./components/steps/StepVerify";
import { StepProcess } from "./components/steps/StepProcess";
import { StepReport } from "./components/steps/StepReport";
import { IcBook, IcCpu, IcHistory, IcLogo, IcOffline } from "./components/icons";

const MAX_FILES = 2;
const MAX_SEC = 30 * 60;

/** Debounce para evitar writes excessivos no localStorage */
function createDebouncedSave<T>(saveFn: (data: T) => void, delayMs = 500) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let pendingData: T | null = null;
  
  return (data: T) => {
    pendingData = data;
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      if (pendingData) {
        saveFn(pendingData);
        pendingData = null;
      }
    }, delayMs);
  };
}

const openManual = () => {
  window.open("manual_altavoz.html", "_blank");
};

function AppShell() {
  const toast = useToast();
  const [step, setStep] = useState<StepIndex>(0);
  const [files, setFiles] = useState<AudioFileRec[]>([]);
  const [speakers, setSpeakers] = useState<SpeakerRec[]>([]);
  const [verifications, setVerifications] = useState<Record<string, VerificationRec>>({});
  const [results, setResults] = useState<TranscriptResult[]>(() => loadResults());
  const [logEntries, setLogEntries] = useState<LogEntry[]>(() => loadLog());
  const [logOpen, setLogOpen] = useState(false);
  const [glossaryOpen, setGlossaryOpen] = useState(false);

  const filesRef = useRef(files);
  filesRef.current = files;
  const speakersRef = useRef(speakers);
  speakersRef.current = speakers;
  const verifsRef = useRef(verifications);
  verifsRef.current = verifications;
  const bootRef = useRef(false);

  const addLog = useCallback((kind: LogKind, title: string, detail?: string) => {
    setLogEntries((prev) => [...prev, { id: uid(), at: Date.now(), kind, title, detail }]);
  }, []);

  /* Debounced saves para localStorage */
  const debouncedSaveLog = useMemo(() => createDebouncedSave(saveLog), []);
  const debouncedSaveResults = useMemo(() => createDebouncedSave(saveResults), []);

  useEffect(() => debouncedSaveLog(logEntries), [logEntries, debouncedSaveLog]);
  useEffect(() => debouncedSaveResults(results), [results, debouncedSaveResults]);

  /* boot: verificação de requisitos em linguagem simples */
  useEffect(() => {
    if (bootRef.current) return;
    bootRef.current = true;
    
    // Verificar Web Crypto e alertar se indisponível
    const hasWebCrypto = globalThis.crypto?.subtle != null;
    if (!hasWebCrypto) {
      addLog("alert", "Web Crypto API indisponível", "Hash SHA-256 usando fallback não criptográfico — execute em ambiente HTTPS para segurança máxima");
      toast.push(
        "warn",
        "Ambiente não seguro detectado",
        "Seu navegador está em modo HTTP. Os hashes usarão um algoritmo alternativo não criptográfico. Use HTTPS para garantir integridade completa."
      );
    }
    
    addLog("system", "Sistema iniciado", "AtaVoz v1.0 · uso pessoal · 100% local");
    const mem = (navigator as unknown as { deviceMemory?: number }).deviceMemory;
    if (mem && mem < 8) {
      addLog("alert", "Verificação de hardware: pouca memória detectada", `${mem} GB — o recomendado são 8 GB`);
      toast.push(
        "warn",
        "Este computador tem pouca memória",
        `Detectamos cerca de ${mem} GB de RAM. O sistema vai funcionar, mas processe um áudio por vez para evitar travamentos.`
      );
    } else {
      addLog("system", "Verificação de hardware aprovada", "memória suficiente para processar até 2 áudios de 30 min");
    }
    if (loadResults().length > 0) {
      toast.push("info", "Relatórios anteriores restaurados", "Seus relatórios salvos estão no passo 5. Os áudios precisam ser importados de novo.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ------------------------------ arquivos ------------------------------ */

  const addFiles = (list: FileList | File[]): RejectedFile[] => {
    const incoming = Array.from(list);
    const rejected: RejectedFile[] = [];
    const accepted: { rec: AudioFileRec; file: File }[] = [];
    let slots = MAX_FILES - filesRef.current.length;

    for (const file of incoming) {
      if (slots <= 0) {
        rejected.push({
          name: file.name,
          reason:
            "Este lote já tem 2 áudios, que é o limite por vez. Termine o lote atual (ou remova um áudio no passo 1) para incluir outro.",
        });
        continue;
      }
      if (!/\.(mp3|m4a)$/i.test(file.name)) {
        rejected.push({
          name: file.name,
          reason:
            "Só aceitamos gravações nos formatos MP3 ou M4A. Se o áudio está em outro formato, converta para MP3 e tente de novo.",
        });
        continue;
      }
      if (file.size > 400 * 1024 * 1024) {
        rejected.push({
          name: file.name,
          reason: `O arquivo tem ${fmtBytes(file.size)}, muito acima do tamanho de um áudio de 30 minutos. Confira se escolheu o arquivo certo.`,
        });
        continue;
      }
      const rec: AudioFileRec = {
        id: uid(),
        name: file.name,
        sizeBytes: file.size,
        sha256: null,
        hashing: true,
        durationSec: null,
        analyzeError: null,
        peaks: null,
        rms: null,
        blobUrl: URL.createObjectURL(file),
        addedAt: Date.now(),
        tooLong: false,
      };
      accepted.push({ rec, file });
      slots -= 1;
    }

    if (accepted.length > 0) {
      setFiles((prev) => [...prev, ...accepted.map((a) => a.rec)]);
      toast.push(
        "ok",
        accepted.length === 1 ? `“${accepted[0].rec.name}” recebido` : `${accepted.length} áudios recebidos`,
        "Conferindo duração e calculando a impressão digital — isso leva alguns segundos."
      );
      for (const { rec, file } of accepted) void prepareFile(rec.id, file);
    }
    return rejected;
  };

  const patchFile = (id: string, patch: Partial<AudioFileRec>) => {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };

  const prepareFile = async (id: string, file: File) => {
    addLog("import", `Áudio recebido: ${file.name}`, `${fmtBytes(file.size)} · aguardando conferências`);
    try {
      const a = await analyzeBlob(file);
      const tooLong = a.durationSec > MAX_SEC + 1;
      patchFile(id, { durationSec: a.durationSec, peaks: a.peaks, rms: a.rms, tooLong });
      addLog(
        "import",
        `Duração conferida: ${file.name}`,
        `${fmtFriendly(a.durationSec)}${tooLong ? " — ACIMA do limite de 30 minutos" : " — dentro do limite"}`
      );
      if (tooLong) {
        addLog("alert", `“${file.name}” passa de 30 minutos`, "o arquivo não será processado até ser dividido");
      }
    } catch {
      patchFile(id, { analyzeError: "decode-failed" });
      addLog("alert", `Não foi possível ler “${file.name}”`, "arquivo possivelmente danificado; nada foi processado");
      return;
    }
    try {
      const hash = await hashBlob(file);
      patchFile(id, { sha256: hash, hashing: false });
      addLog("hash", `Impressão digital (SHA-256) registrada: ${file.name}`, hash);
    } catch {
      patchFile(id, { hashing: false });
      addLog("alert", `Falha ao calcular a impressão digital de “${file.name}”`, "tente reimportar o arquivo");
    }
  };

  const removeFile = (id: string) => {
    const f = filesRef.current.find((x) => x.id === id);
    if (f) URL.revokeObjectURL(f.blobUrl);
    setFiles((prev) => prev.filter((x) => x.id !== id));
    setVerifications((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (f) addLog("import", `Áudio removido pelo usuário: ${f.name}`, "o arquivo original não foi tocado");
  };

  /* Cleanup de URLs ao desmontar */
  useEffect(() => {
    return () => {
      filesRef.current.forEach((f) => {
        if (f.blobUrl) URL.revokeObjectURL(f.blobUrl);
      });
      speakersRef.current.forEach((s) => {
        if (s.blobUrl) URL.revokeObjectURL(s.blobUrl);
      });
    };
  }, []);

  /* ------------------------------- amostras ----------------------------- */

  const addSpeaker = (sp: SpeakerRec): boolean => {
    if (speakersRef.current.some((s) => s.name.toLowerCase() === sp.name.toLowerCase())) return false;
    setSpeakers((prev) => [...prev, sp]);
    setVerifications({});
    addLog("sample", `Amostra de voz cadastrada: ${sp.name}`, `${Math.round(sp.durationSec)} s · ${sp.source === "gravada" ? "gravada no microfone" : "arquivo importado"} · volume ${sp.quality === "boa" ? "bom" : "baixo"}`);
    return true;
  };

  const removeSpeaker = (id: string) => {
    const sp = speakersRef.current.find((s) => s.id === id);
    if (sp?.blobUrl) URL.revokeObjectURL(sp.blobUrl);
    setSpeakers((prev) => prev.filter((s) => s.id !== id));
    setVerifications({});
    if (sp) addLog("sample", `Amostra removida: ${sp.name}`, "a verificação será refeita com as amostras restantes");
  };

  /* ----------------------------- verificação ---------------------------- */

  const readyFiles = useMemo(() => 
    files.filter(
      (f) => f.sha256 != null && f.durationSec != null && !f.analyzeError && !f.tooLong
    ),
    [files]
  );

  const ensureVerifications = useCallback(() => {
    const next = { ...verifsRef.current };
    let changed = false;
    for (const f of readyFiles) {
      if (!next[f.id]) {
        next[f.id] = buildVerification(f, speakersRef.current);
        changed = true;
        addLog("verify", `Teste de reconhecimento preparado: ${f.name}`, "trecho inicial comparado com as amostras de voz");
      }
    }
    if (changed) {
      verifsRef.current = next;
      setVerifications(next);
    }
  }, [readyFiles, addLog]);

  const goToStep = (idx: StepIndex) => {
    setStep(idx);
    if (idx === 2 && speakers.length >= 2 && readyFiles.length > 0) ensureVerifications();
  };

  const confirmVerification = (fileId: string) => {
    const f = filesRef.current.find((x) => x.id === fileId);
    setVerifications((prev) =>
      prev[fileId]
        ? { ...prev, [fileId]: { ...prev[fileId], status: "confirmado", decidedAt: Date.now() } }
        : prev
    );
    addLog("verify", `Identificação confirmada pelo usuário: ${f?.name ?? fileId}`, "processamento completo autorizado");
    toast.push("ok", "Identificação confirmada", "Sua confirmação ficou registrada no diário com data e hora.");
  };

  const reopenVerification = (fileId: string) => {
    setVerifications((prev) =>
      prev[fileId] ? { ...prev, [fileId]: { ...prev[fileId], status: "pendente", decidedAt: null } } : prev
    );
    addLog("verify", "Confirmação desfeita pelo usuário", "o teste pode ser respondido novamente");
  };

  const rejectGoSamples = (fileId: string) => {
    const f = filesRef.current.find((x) => x.id === fileId);
    setVerifications((prev) =>
      prev[fileId] ? { ...prev, [fileId]: { ...prev[fileId], status: "rejeitado" } } : prev
    );
    addLog("verify", `Identificação rejeitada pelo usuário: ${f?.name ?? fileId}`, "usuário orientado a regravar amostras");
    setVerifications({});
    setStep(1);
    toast.push("info", "Vamos melhorar as amostras", "Regrave as amostras seguindo as dicas e volte para refazer o teste.");
  };

  /* ---------------------------- processamento --------------------------- */

  const onResult = (r: TranscriptResult) => {
    setResults((prev) => [...prev.filter((x) => x.fileId !== r.fileId), r]);
  };

  /* -------------------------------- metas ------------------------------- */

  const allConfirmed =
    readyFiles.length > 0 && readyFiles.every((f) => verifications[f.id]?.status === "confirmado");
  const allProcessed = readyFiles.length > 0 && readyFiles.every((f) => results.some((r) => r.fileId === f.id));

  const steps: StepMeta[] = [
    {
      idx: 0,
      title: "Importar áudio",
      desc: "Entregue a gravação (MP3 ou M4A)",
      state: step === 0 ? "current" : readyFiles.length > 0 ? "done" : "open",
    },
    {
      idx: 1,
      title: "Amostras de voz",
      desc: "Cadastre quem participa da conversa",
      state:
        step === 1
          ? "current"
          : readyFiles.length === 0
            ? "locked"
            : speakers.length >= 2
              ? "done"
              : "open",
      lockReason: "Importe um áudio primeiro",
    },
    {
      idx: 2,
      title: "Verificação",
      desc: "Confirme quem o sistema reconheceu",
      state:
        step === 2
          ? "current"
          : readyFiles.length === 0 || speakers.length < 2
            ? "locked"
            : allConfirmed
              ? "done"
              : "open",
      lockReason: readyFiles.length === 0 ? "Importe um áudio primeiro" : "Cadastre pelo menos 2 amostras",
    },
    {
      idx: 3,
      title: "Processamento",
      desc: "Transcrição com horários e vozes",
      state:
        step === 3 ? "current" : !allConfirmed ? "locked" : allProcessed ? "done" : "open",
      lockReason: "Confirme a identificação no passo 3",
    },
    {
      idx: 4,
      title: "Relatório",
      desc: "Revise o texto e exporte com selos",
      state: step === 4 ? "current" : results.length === 0 ? "locked" : "done",
      lockReason: "Disponível após o processamento",
    },
  ];

  const exportLog = () => {
    downloadText("diario_de_integridade_atavoz.txt", logToText(logEntries), "text/plain");
    addLog("export", "Diário de integridade exportado (.txt)", `${logEntries.length} eventos registrados`);
    toast.push("ok", "Diário baixado", "A trilha completa de auditoria foi salva como arquivo de texto.");
  };

  return (
    <div className="min-h-full">
      <div className="bg-scene" />
      <div className="bg-grid" />
      <div className="bg-trace" />

      {/* header */}
      <header className="sticky top-0 z-40 border-b border-ink-700/70 bg-ink-900/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1400px] items-center gap-4 px-5 py-3 lg:px-8">
          <div className="flex items-center gap-3">
            <IcLogo size={34} />
            <div>
              <p className="font-display text-lg font-bold leading-none tracking-tight">
                AtaVoz
              </p>
              <p className="mt-1 text-[11px] leading-none text-mist-400">
                transcrição · quem falou o quê · uso pessoal
              </p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2 max-md:hidden">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-ok-400/30 bg-ok-400/8 px-2.5 py-1.5 text-[11.5px] font-semibold text-ok-300">
              <span className="live-dot h-1.5 w-1.5 rounded-full bg-ok-400" />
              100% local
            </span>
            <span className="inline-flex items-center gap-2 rounded-md border border-ink-600 bg-ink-800 px-2.5 py-1.5 text-[11.5px] font-semibold text-mist-300">
              <IcCpu size={13} className="text-brand-400" />
              só CPU
              <span className="flex h-3.5 items-end gap-[2.5px]">
                <span className="eq-bar" style={{ height: "60%" }} />
                <span className="eq-bar" style={{ height: "90%" }} />
                <span className="eq-bar" style={{ height: "45%" }} />
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-md border border-ink-600 bg-ink-800 px-2.5 py-1.5 text-[11.5px] font-semibold text-mist-300">
              <IcOffline size={13} className="text-info-400" />
              offline
            </span>
            <span className="rounded-md border border-brand-400/40 bg-brand-400/10 px-2.5 py-1.5 text-[11.5px] font-semibold text-brand-300">
              demonstração
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={openManual}
              className="flex items-center gap-2 rounded-lg border border-brand-400/40 bg-brand-400/10 px-3 py-2 text-[13px] font-medium text-brand-300 transition-all hover:border-brand-400/70 hover:bg-brand-400/20 hover:text-brand-200 active:scale-95 cursor-pointer"
              title="Manual do AltaVoz (by rogerelizar)"
            >
              <IcBook size={16} />
              <span className="max-sm:hidden">Manual</span>
            </button>
            <button
              onClick={() => setGlossaryOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-ink-600 bg-ink-800 px-3 py-2 text-[13px] font-medium text-mist-200 transition-all hover:border-brand-400/50 hover:text-brand-300 active:scale-95 cursor-pointer"
              title="Dicionário de termos"
            >
              <IcBook size={16} />
              <span className="max-sm:hidden">Dicionário</span>
            </button>
            <button
              onClick={() => setLogOpen(true)}
              className="relative flex items-center gap-2 rounded-lg border border-ink-600 bg-ink-800 px-3 py-2 text-[13px] font-medium text-mist-200 transition-all hover:border-brand-400/50 hover:text-brand-300 active:scale-95 cursor-pointer"
              title="Diário de integridade"
            >
              <IcHistory size={16} />
              <span className="max-sm:hidden">Diário</span>
              {logEntries.length > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-400 px-1 font-mono text-[10px] font-bold text-ink-950">
                  {logEntries.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* trilho de passos (mobile) */}
        <div className="flex gap-1.5 overflow-x-auto border-t border-ink-700/60 px-4 py-2 lg:hidden">
          {steps.map((s, i) => (
            <button
              key={s.idx}
              onClick={() => s.state !== "locked" && goToStep(s.idx)}
              disabled={s.state === "locked"}
              className={
                "shrink-0 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-all cursor-pointer disabled:opacity-40 " +
                (s.state === "current"
                  ? "border-brand-400/60 bg-brand-400/12 text-brand-300"
                  : s.state === "done"
                    ? "border-ok-400/40 text-ok-300"
                    : "border-ink-600 text-mist-400")
              }
            >
              {i + 1}. {s.title}
            </button>
          ))}
        </div>
      </header>

      {/* corpo */}
      <div className="mx-auto flex max-w-[1400px]">
        <Sidebar
          steps={steps}
          onNavigate={goToStep}
          logEntries={logEntries}
          hashCount={files.filter((f) => f.sha256).length + results.length}
          onOpenLog={() => setLogOpen(true)}
        />

        <main className="min-w-0 flex-1 px-5 py-8 lg:px-10">
          <div key={step} className="anim-rise">
            {step === 0 && (
              <StepImport
                files={files}
                onPickFiles={addFiles}
                onRemove={removeFile}
                onNext={() => goToStep(1)}
                canNext={readyFiles.length > 0}
              />
            )}
            {step === 1 && (
              <StepSamples
                speakers={speakers}
                onAdd={addSpeaker}
                onRemove={removeSpeaker}
                onNext={() => goToStep(2)}
                canNext={speakers.length >= 2 && readyFiles.length > 0}
              />
            )}
            {step === 2 && (
              <StepVerify
                files={readyFiles}
                speakers={speakers}
                verifications={verifications}
                onConfirm={confirmVerification}
                onReopen={reopenVerification}
                onRejectGoSamples={rejectGoSamples}
                onNext={() => goToStep(3)}
                allConfirmed={allConfirmed}
              />
            )}
            {step === 3 && (
              <StepProcess
                files={readyFiles}
                speakers={speakers}
                verifications={verifications}
                results={results}
                onResult={onResult}
                onGotoReport={() => goToStep(4)}
                log={addLog}
              />
            )}
            {step === 4 && (
              <StepReport
                results={results}
                onUpdate={onResult}
                logEntries={logEntries}
                log={addLog}
                onGoToProcess={() => goToStep(3)}
              />
            )}
          </div>

          <footer className="mt-14 border-t border-ink-700/70 pt-5 pb-2">
            <div className="flex flex-wrap items-center justify-between gap-3 text-[11.5px] text-mist-500">
              <p className="flex items-center gap-2">
                <IcLogo size={18} />
                AtaVoz v1.0 — software livre para uso pessoal. Seu áudio nunca sai deste computador.
              </p>
              <p className="max-w-md leading-relaxed">
                Este sistema maximiza integridade e rastreabilidade; a aceitação jurídica de uma
                prova depende da legislação e do juiz — nenhum software pode garanti-la.
              </p>
            </div>
          </footer>
        </main>
      </div>

      <LogDrawer open={logOpen} entries={logEntries} onClose={() => setLogOpen(false)} onExport={exportLog} />
      <GlossaryModal open={glossaryOpen} onClose={() => setGlossaryOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppShell />
    </ToastProvider>
  );
}
