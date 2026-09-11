import { useEffect, useRef, useState } from "react";
import type { AudioFileRec, LogKind, SpeakerRec, TranscriptResult, VerificationRec } from "../../lib/types";
import { MEMORY_RELEASE_MS, ProcessingAborted, runProcessing, STAGES, totalMsFor } from "../../lib/engine";
import { cx, fmtFriendly, fmtHMS, fmtMS, sleepAbort } from "../../lib/utils";
import { Btn, Callout, Chip, ProgressBar, SectionHead } from "../ui";
import { Term } from "../Term";
import { useToast } from "../Toasts";
import {
  IcAlert,
  IcArrowR,
  IcCheck,
  IcCheckCircle,
  IcCpu,
  IcInfo,
  IcSpinner,
  IcStop,
} from "../icons";

type RunState = "idle" | "running" | "memfree" | "done" | "cancelled";

// sleepAbort importado de utils.ts — função local removida para evitar duplicação

export function StepProcess({
  files,
  speakers,
  verifications,
  results,
  onResult,
  onGotoReport,
  log,
}: {
  files: AudioFileRec[];
  speakers: SpeakerRec[];
  verifications: Record<string, VerificationRec>;
  results: TranscriptResult[];
  onResult: (r: TranscriptResult) => void;
  onGotoReport: () => void;
  log: (kind: LogKind, title: string, detail?: string) => void;
}) {
  const toast = useToast();
  const [runState, setRunState] = useState<RunState>("idle");
  const [currentIdx, setCurrentIdx] = useState(-1);
  const [progress, setProgress] = useState({ overall: 0, stageIdx: 0, filePosSec: 0 });
  const [doneIds, setDoneIds] = useState<string[]>([]);
  const [now, setNow] = useState(0);
  const abortRef = useRef(false);
  const startedAtRef = useRef(0);

  const pending = files.filter((f) => !doneIds.includes(f.id) && !results.some((r) => r.fileId === f.id));
  const allDone = pending.length === 0 && (doneIds.length > 0 || results.length > 0);

  useEffect(() => {
    if (runState !== "running" && runState !== "memfree") return;
    const iv = window.setInterval(() => setNow(Date.now()), 400);
    return () => window.clearInterval(iv);
  }, [runState]);

  const start = async (all: boolean) => {
    const targets = all ? files : pending;
    if (targets.length === 0) return;
    abortRef.current = false;
    setRunState("running");
    startedAtRef.current = Date.now();
    setNow(Date.now());
    log("process", `Processamento iniciado (${targets.length} áudio${targets.length > 1 ? "s" : ""})`, "fila sequencial, liberação de memória entre arquivos");

    for (let i = 0; i < targets.length; i++) {
      const file = targets[i];
      const v = verifications[file.id];
      if (!v) continue;
      setCurrentIdx(i);
      setProgress({ overall: 0, stageIdx: 0, filePosSec: 0 });
      try {
        const res = await runProcessing(
          file,
          speakers,
          v,
          (p) => setProgress(p),
          () => abortRef.current
        );
        onResult(res);
        setDoneIds((prev) => [...prev, file.id]);
        log("process", `Processamento concluído: ${file.name}`, `${res.segments.length} trechos transcritos em ${(res.elapsedMs / 1000).toFixed(1)} s`);
      } catch (e) {
        if (e instanceof ProcessingAborted) {
          log("alert", `Processamento interrompido pelo usuário em “${file.name}”`, "nenhum dado foi perdido; é possível retomar");
          setRunState("cancelled");
          toast.push("warn", "Processamento interrompido", "Nada foi perdido. Os áudios já concluídos continuam guardados — retome quando quiser.");
          return;
        }
        log("alert", `Falha inesperada ao processar “${file.name}”`, "tente processar este áudio novamente");
        setRunState("cancelled");
        toast.push("warn", "Algo deu errado neste áudio", "Não se preocupe: nada foi corrompido. Tente processar de novo — se repetir, reimporte o arquivo.");
        return;
      }

      if (i < targets.length - 1) {
        setRunState("memfree");
        log("system", "Liberando memória antes do próximo áudio", "etapa de segurança para computadores com 8 GB de RAM");
        try {
          await sleepAbort(MEMORY_RELEASE_MS, () => abortRef.current);
        } catch {
          setRunState("cancelled");
          return;
        }
        setRunState("running");
      }
    }

    setRunState("done");
    log("process", "Lote concluído com sucesso", "resultados prontos para revisão e exportação");
    toast.push("ok", "Tudo pronto!", "A transcrição está completa. Revise o texto e gere o relatório.");
  };

  const cancel = () => {
    abortRef.current = true;
  };

  const running = runState === "running" || runState === "memfree";

  return (
    <div>
      <SectionHead
        step="Passo 4 de 5"
        title="Processamento em andamento no seu computador"
        desc="O sistema ouve cada áudio inteiro, escreve tudo o que foi dito e marca quem falou em cada trecho, com horário. Como o trabalho é feito só no processador comum, pode demorar alguns minutos — você verá o progresso o tempo todo."
        aside={
          !running && !allDone ? (
            <Btn variant="primary" onClick={() => void start(false)} className="px-5 py-2.5">
              <IcCpu size={17} />
              Iniciar processamento
            </Btn>
          ) : running ? (
            <Btn variant="danger" onClick={cancel} className="px-5 py-2.5">
              <IcStop size={15} />
              Interromper com segurança
            </Btn>
          ) : undefined
        }
      />

      <div className="mb-5 grid gap-3 md:grid-cols-2">
        <Callout tone="brand" title="Por que demora?">
          Todo o trabalho é feito no seu processador (<Term k="cpu">CPU</Term>), sem placa de vídeo
          e sem internet. É mais lento, mas o áudio nunca sai da sua máquina — e o resultado é{" "}
          <Term k="reprodutível">reproduzível</Term>.
        </Callout>
        <Callout tone="info" title="Ambiente de demonstração">
          Nesta vitrine, o texto gerado é simulado de forma determinística: o mesmo áudio produz
          sempre o mesmo relatório, exatamente como no sistema real com os modelos de IA.
        </Callout>
      </div>

      <div className="stagger space-y-4">
        {files.map((f, idx) => {
          const isDone = doneIds.includes(f.id) || results.some((r) => r.fileId === f.id);
          const isCurrent = running && currentIdx === idx && !isDone;
          const isMemfree = runState === "memfree" && currentIdx === idx;
          const total = totalMsFor(f.durationSec ?? 60);
          const elapsed = now ? (now - startedAtRef.current) / 1000 : 0;
          const remaining = Math.max(0, (total * (1 - (isCurrent ? progress.overall : 0))) / 1000);
          return (
            <div
              key={f.id}
              className={cx(
                "rounded-xl border bg-ink-850/80 p-5 transition-all",
                isCurrent || isMemfree ? "border-brand-400/50 shadow-[0_0_0_1px_rgba(245,184,75,0.12),0_12px_40px_rgba(0,0,0,0.35)]" : "border-ink-700",
                isDone && "border-ok-400/35"
              )}
            >
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={cx(
                    "flex h-10 w-10 items-center justify-center rounded-lg border font-mono text-sm font-semibold",
                    isDone ? "border-ok-400/50 bg-ok-400/12 text-ok-300" : isCurrent || isMemfree ? "border-brand-400/60 bg-brand-400/12 text-brand-300" : "border-ink-600 bg-ink-800 text-mist-400"
                  )}
                >
                  {isDone ? <IcCheck size={17} /> : idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-[15px] font-semibold">{f.name}</p>
                  <p className="mt-0.5 font-mono text-[12px] text-mist-400">
                    {fmtMS(f.durationSec ?? 0)} · {speakers.length} vozes cadastradas
                  </p>
                </div>
                {isDone ? (
                  <Chip tone="ok"><IcCheckCircle size={12} /> Concluído</Chip>
                ) : isMemfree ? (
                  <Chip tone="brand"><IcSpinner size={12} /> Liberando memória</Chip>
                ) : isCurrent ? (
                  <Chip tone="brand"><IcSpinner size={12} /> Processando</Chip>
                ) : running ? (
                  <Chip tone="neutral">Na fila</Chip>
                ) : (
                  <Chip tone="neutral">Aguardando</Chip>
                )}
              </div>

              {isMemfree && (
                <div className="mt-4 flex items-center gap-3 rounded-lg border border-brand-400/30 bg-brand-400/6 px-4 py-3 text-sm text-brand-300 anim-fade">
                  <IcSpinner size={16} />
                  Liberando memória do computador antes do próximo áudio — etapa de segurança para
                  máquinas com 8 GB de RAM.
                </div>
              )}

              {isCurrent && (
                <div className="mt-4">
                  <div className="mb-1.5 flex items-baseline justify-between gap-3">
                    <p className="text-sm font-semibold text-mist-100">
                      {STAGES[progress.stageIdx]?.label}
                    </p>
                    <p className="font-mono text-[12px] text-mist-400">
                      {Math.round(progress.overall * 100)}%
                    </p>
                  </div>
                  <ProgressBar value={progress.overall} />
                  <p className="mt-1.5 text-[12.5px] text-mist-400">
                    {STAGES[progress.stageIdx]?.plain}.
                  </p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    <div className="rounded-md border border-ink-700 bg-ink-900/50 px-3 py-2">
                      <p className="text-[10.5px] uppercase tracking-wider text-mist-500">Posição no áudio</p>
                      <p className="mt-0.5 font-mono text-[13px] text-mist-100">
                        {fmtHMS(progress.filePosSec)} <span className="text-mist-500">/ {fmtHMS(f.durationSec ?? 0)}</span>
                      </p>
                    </div>
                    <div className="rounded-md border border-ink-700 bg-ink-900/50 px-3 py-2">
                      <p className="text-[10.5px] uppercase tracking-wider text-mist-500">Tempo restante</p>
                      <p className="mt-0.5 font-mono text-[13px] text-brand-300">≈ {fmtFriendly(remaining)}</p>
                    </div>
                    <div className="rounded-md border border-ink-700 bg-ink-900/50 px-3 py-2">
                      <p className="text-[10.5px] uppercase tracking-wider text-mist-500">Decorrido</p>
                      <p className="mt-0.5 font-mono text-[13px] text-mist-100">{fmtFriendly(elapsed)}</p>
                    </div>
                  </div>

                  <ol className="mt-4 grid gap-1.5 sm:grid-cols-2">
                    {STAGES.map((s, si) => {
                      const done = si < progress.stageIdx;
                      const cur = si === progress.stageIdx;
                      return (
                        <li
                          key={s.id}
                          className={cx(
                            "flex items-center gap-2.5 rounded-md border px-3 py-2 text-[13px] transition-all",
                            done && "border-ok-400/25 bg-ok-400/5 text-ok-300",
                            cur && "border-brand-400/40 bg-brand-400/8 text-brand-300",
                            !done && !cur && "border-ink-700 bg-ink-900/40 text-mist-500"
                          )}
                        >
                          {done ? <IcCheck size={14} /> : cur ? <IcSpinner size={14} /> : <span className="inline-block h-3.5 w-3.5 rounded-full border border-ink-600" />}
                          {s.label}
                        </li>
                      );
                    })}
                  </ol>
                </div>
              )}

              {isDone && !isCurrent && (
                <p className="mt-3 flex items-center gap-2 text-[13px] text-mist-400 anim-fade">
                  <IcCheckCircle size={15} className="text-ok-400" />
                  Transcrição e separação de vozes concluídas — disponível no passo 5.
                </p>
              )}
            </div>
          );
        })}
      </div>

      {runState === "done" && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-ok-400/40 bg-ok-400/8 px-5 py-4 anim-pop">
          <div className="flex items-center gap-3">
            <IcCheckCircle size={26} className="text-ok-400" />
            <div>
              <p className="font-display text-[15px] font-semibold text-ok-300">Lote concluído</p>
              <p className="text-[13px] text-mist-300">
                Agora revise o texto com calma — você pode corrigir qualquer trecho antes de exportar.
              </p>
            </div>
          </div>
          <Btn variant="success" onClick={onGotoReport} className="px-5 py-2.5">
            Revisar e gerar relatório
            <IcArrowR size={16} />
          </Btn>
        </div>
      )}

      {runState === "cancelled" && (
        <div className="mt-6">
          <Callout tone="warn" title="Processamento interrompido — está tudo bem">
            Nenhum arquivo foi alterado ou perdido. Os áudios já concluídos continuam salvos. Quando
            quiser, clique em “Retomar de onde parou” para processar apenas o que falta.
            <div className="mt-3">
              <Btn variant="primary" onClick={() => void start(false)} disabled={pending.length === 0}>
                Retomar de onde parou
              </Btn>
            </div>
          </Callout>
        </div>
      )}

      {runState === "idle" && results.length > 0 && (
        <div className="mt-6">
          <Callout tone="ok" title="Já existem resultados para este lote">
            Você pode revisar os relatórios no passo 5 ou processar tudo de novo (o resultado será
            idêntico — é <Term k="reprodutível">reproduzível</Term>).
            <div className="mt-3 flex gap-2">
              <Btn variant="success" onClick={onGotoReport}>Ir para os relatórios</Btn>
              <Btn variant="subtle" onClick={() => void start(true)}>Processar tudo de novo</Btn>
            </div>
          </Callout>
        </div>
      )}

      {runState === "idle" && results.length === 0 && files.length > 0 && (
        <p className="mt-5 flex items-start gap-2 text-[13px] text-mist-500">
          <IcInfo size={15} className="mt-0.5 shrink-0 text-info-400" />
          Dica: deixe o computador ligado na tomada. Se precisar parar, use o botão “Interromper com
          segurança” — nada será perdido.
        </p>
      )}

      {runState === "idle" && files.length === 0 && (
        <p className="mt-5 flex items-center gap-2 text-sm text-mist-400">
          <IcAlert size={16} className="text-warn-300" />
          Nenhum áudio liberado para processamento. Conclua as etapas anteriores primeiro.
        </p>
      )}
    </div>
  );
}
