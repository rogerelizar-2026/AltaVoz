import { useMemo, useRef, useState } from "react";
import type { LogEntry, LogKind, TranscriptResult, TranscriptSegment } from "../../lib/types";
import { exportReport, printAsPdf } from "../../lib/report";
import { downloadText, logToText } from "../../lib/log";
import { confidenceLabel, copyText, cx, fmtBytes, fmtDateTime, fmtFriendly, fmtHMS, shortHash } from "../../lib/utils";
import { Btn, Callout, Chip, SectionHead } from "../ui";
import { Term } from "../Term";
import { useToast } from "../Toasts";
import {
  IcCheck,
  IcCopy,
  IcDoc,
  IcDownload,
  IcEdit,
  IcFingerprint,
  IcHistory,
  IcInfo,
  IcSpinner,
  IcWave,
} from "../icons";

function recomputeStats(r: TranscriptResult): TranscriptResult {
  const all = r.segments.reduce((a, s) => a + (s.end - s.start), 0);
  const stats = r.speakerStats.map((st) => {
    const own = r.segments.filter((s) => s.speakerId === st.speakerId);
    const total = own.reduce((a, s) => a + (s.end - s.start), 0);
    const avg = own.length > 0 ? own.reduce((a, s) => a + s.confidence, 0) / own.length : st.avgConf;
    return {
      ...st,
      avgConf: Math.round(avg * 100) / 100,
      sharePct: all > 0 ? Math.round((total / all) * 100) : 0,
    };
  });
  return { ...r, speakerStats: stats };
}

export function StepReport({
  results,
  onUpdate,
  logEntries,
  log,
  onGoToProcess,
}: {
  results: TranscriptResult[];
  onUpdate: (r: TranscriptResult) => void;
  logEntries: LogEntry[];
  log: (kind: LogKind, title: string, detail?: string) => void;
  onGoToProcess: () => void;
}) {
  const toast = useToast();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const result = useMemo(() => {
    if (results.length === 0) return null;
    return results.find((r) => r.fileId === selectedId) ?? results[0];
  }, [results, selectedId]);

  if (!result) {
    return (
      <div>
        <SectionHead
          step="Passo 5 de 5"
          title="Revisão e relatório"
          desc="Aqui você confere o texto com calma, corrige o que precisar e exporta o relatório final com todos os selos de integridade."
        />
        <Callout tone="info" title="Nada para revisar ainda">
          O relatório aparece aqui depois que o processamento (passo 4) termina.
          <div className="mt-3">
            <Btn variant="primary" onClick={onGoToProcess}>Ir para o processamento</Btn>
          </div>
        </Callout>
      </div>
    );
  }

  const setSegment = (segId: string, patch: Partial<TranscriptSegment>) => {
    const next = recomputeStats({
      ...result,
      segments: result.segments.map((s) => (s.id === segId ? { ...s, ...patch } : s)),
    });
    onUpdate(next);
  };

  const doExport = async (kind: "md" | "html" | "pdf") => {
    setBusy(kind);
    try {
      if (kind === "pdf") {
        printAsPdf(result, logEntries);
        log("export", `Relatório PDF solicitado: ${result.fileName}`, "via diálogo de impressão do navegador");
        toast.push("ok", "Janela de impressão aberta", "Escolha “Salvar como PDF” na janela que apareceu para guardar o relatório.");
      } else {
        const { hash, filename } = await exportReport(kind, result, logEntries);
        log("export", `Relatório ${kind.toUpperCase()} exportado: ${filename}`, `SHA-256 do relatório: ${hash}`);
        toast.push(
          "ok",
          `Relatório ${kind.toUpperCase()} salvo`,
          `Impressão digital do relatório: ${shortHash(hash)} — ela prova que o documento não foi alterado depois de gerado.`
        );
      }
    } catch {
      toast.push("warn", "Não foi possível exportar agora", "Tente novamente em alguns segundos.");
    } finally {
      setBusy(null);
    }
  };

  const doCopy = async (key: string, value: string) => {
    if (await copyText(value)) {
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey(null), 1800);
    }
  };

  const editedCount = result.segments.filter((s) => s.edited).length;

  return (
    <div>
      <SectionHead
        step="Passo 5 de 5"
        title="Revise o texto e gere o relatório"
        desc="Confira a transcrição com calma. Você pode corrigir qualquer trecho ou trocar o nome de quem falou — cada correção fica anotada no diário, mantendo a transparência da cadeia de custódia."
      />

      {results.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {results.map((r) => (
            <button
              key={r.fileId}
              onClick={() => setSelectedId(r.fileId)}
              className={cx(
                "rounded-lg border px-4 py-2 text-[13px] font-semibold transition-all cursor-pointer",
                r.fileId === result.fileId
                  ? "border-brand-400/60 bg-brand-400/12 text-brand-300"
                  : "border-ink-600 bg-ink-850 text-mist-300 hover:border-mist-500"
              )}
            >
              {r.fileName}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[1fr_330px]">
        {/* editor de transcrição */}
        <div className="rounded-xl border border-ink-700 bg-ink-850/80">
          <div className="flex flex-wrap items-center gap-3 border-b border-ink-700 px-5 py-4">
            <IcEdit size={18} className="text-brand-400" />
            <div className="flex-1">
              <p className="font-display text-[15px] font-semibold">Transcrição — {result.fileName}</p>
              <p className="text-[12.5px] text-mist-400">
                {result.segments.length} trechos · duração {fmtHMS(result.durationSec)}
                {editedCount > 0 && (
                  <span className="text-brand-300"> · {editedCount} revisado{editedCount > 1 ? "s" : ""} manualmente</span>
                )}
              </p>
            </div>
            <Chip tone="neutral" className="font-mono normal-case! tracking-normal!">
              processado em {(result.elapsedMs / 1000).toFixed(1)} s
            </Chip>
          </div>

          <div className="max-h-[560px] space-y-1 overflow-y-auto p-3">
            {result.segments.map((seg) => {
              const lbl = confidenceLabel(seg.confidence);
              return (
                <div
                  key={seg.id}
                  className={cx(
                    "group rounded-lg border border-transparent px-3 py-2.5 transition-all hover:border-ink-600 hover:bg-ink-900/60",
                    seg.edited && "border-brand-400/25 bg-brand-400/4"
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md border border-ink-600 bg-ink-900 px-2 py-0.5 font-mono text-[11.5px] text-brand-300">
                      {fmtHMS(seg.start)} – {fmtHMS(seg.end)}
                    </span>
                    <select
                      value={seg.speakerId}
                      onChange={(e) => {
                        const st = result.speakerStats.find((s) => s.speakerId === e.target.value);
                        setSegment(seg.id, {
                          speakerId: e.target.value,
                          speakerName: st?.name ?? seg.speakerName,
                          edited: true,
                        });
                        log("edit", `Falante corrigido no trecho ${fmtHMS(seg.start)}`, `novo falante: ${st?.name ?? e.target.value}`);
                      }}
                      className="rounded-md border border-ink-600 bg-ink-900 px-2 py-0.5 text-[12.5px] font-semibold text-mist-100 cursor-pointer"
                      aria-label="Trocar falante deste trecho"
                    >
                      {result.speakerStats.map((s) => (
                        <option key={s.speakerId} value={s.speakerId}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    <span title={lbl.hint} className="cursor-help">
                      <Chip tone={lbl.tone}>
                        {Math.round(seg.confidence * 100)}% {lbl.label}
                      </Chip>
                    </span>
                    {seg.edited && (
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-brand-300">
                        revisado
                      </span>
                    )}
                  </div>
                  <textarea
                    defaultValue={seg.text}
                    key={`${seg.id}-ta`}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v && v !== seg.text) {
                        setSegment(seg.id, { text: v, edited: true });
                        log("edit", `Texto revisado no trecho ${fmtHMS(seg.start)}`, `${seg.speakerName}: ${v.slice(0, 80)}${v.length > 80 ? "…" : ""}`);
                      } else {
                        e.target.value = seg.text;
                      }
                    }}
                    className="mt-1.5 w-full resize-none rounded-md border border-transparent bg-transparent px-2 py-1.5 text-[14px] leading-relaxed text-mist-100 transition-colors focus:border-ink-600 focus:bg-ink-900/70"
                    rows={2}
                    aria-label={`Texto do trecho iniciado em ${fmtHMS(seg.start)}`}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* painel lateral */}
        <div className="space-y-4">
          <div className="rounded-xl border border-ink-700 bg-ink-850/80 p-4">
            <p className="mb-3 flex items-center gap-2 font-display text-[14px] font-semibold">
              <IcFingerprint size={16} className="text-brand-400" /> Integridade
            </p>
            <dl className="space-y-2.5 text-[12.5px]">
              <div>
                <dt className="text-mist-500">Arquivo de origem</dt>
                <dd className="font-medium text-mist-100">{result.fileName}</dd>
              </div>
              <div>
                <dt className="text-mist-500">Duração</dt>
                <dd className="font-mono text-mist-100">
                  {fmtHMS(result.durationSec)} ({fmtFriendly(result.durationSec)})
                </dd>
              </div>
              <div>
                <dt className="text-mist-500">Processado em</dt>
                <dd className="text-mist-100">{fmtDateTime(result.processedAt)}</dd>
              </div>
              <div>
                <dt className="mb-1 flex items-center justify-between text-mist-500">
                  <span>SHA-256 do áudio <Term k="hash">(o que é?)</Term></span>
                  <button
                    onClick={() => void doCopy("audio", result.sha256)}
                    className="inline-flex items-center gap-1 rounded border border-ink-600 px-1.5 py-0.5 text-[10.5px] text-mist-300 hover:border-brand-400/50 hover:text-brand-300 cursor-pointer"
                  >
                    {copiedKey === "audio" ? <IcCheck size={10} className="text-ok-400" /> : <IcCopy size={10} />}
                    copiar
                  </button>
                </dt>
                <dd className="break-all rounded-md border border-ink-700 bg-ink-900/70 p-2 font-mono text-[10.5px] leading-relaxed text-mist-300">
                  {result.sha256}
                </dd>
              </div>
              <div>
                <dt className="text-mist-500">Semente de reprodutibilidade</dt>
                <dd className="font-mono text-mist-100">{result.seedHex}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-xl border border-ink-700 bg-ink-850/80 p-4">
            <p className="mb-3 flex items-center gap-2 font-display text-[14px] font-semibold">
              <IcWave size={16} className="text-brand-400" /> Falantes
            </p>
            <div className="space-y-3">
              {result.speakerStats.map((s) => (
                <div key={s.speakerId}>
                  <div className="flex items-baseline justify-between text-[13px]">
                    <span className="font-semibold text-mist-100">{s.name}</span>
                    <span className="font-mono text-[11.5px] text-mist-400">
                      {s.sharePct}% do tempo · confiança {Math.round(s.avgConf * 100)}%
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink-700">
                    <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-ok-400" style={{ width: `${s.sharePct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-ink-700 bg-ink-850/80 p-4">
            <p className="mb-3 flex items-center gap-2 font-display text-[14px] font-semibold">
              <IcInfo size={16} className="text-info-400" /> Metadados técnicos
            </p>
            <ul className="space-y-2 text-[12px] leading-relaxed text-mist-300">
              <li><span className="text-mist-500">Transcrição:</span> {result.engine.transcriber}</li>
              <li><span className="text-mist-500">Vozes:</span> {result.engine.diarizer}</li>
              <li><span className="text-mist-500">Idioma:</span> {result.engine.language}</li>
              <li><span className="text-mist-500">Computação:</span> {result.engine.compute}</li>
            </ul>
          </div>

          <div className="rounded-xl border border-brand-400/35 bg-brand-400/6 p-4">
            <p className="mb-3 flex items-center gap-2 font-display text-[14px] font-semibold text-brand-300">
              <IcDoc size={16} /> Exportar relatório
            </p>
            <div className="grid gap-2">
              <Btn variant="primary" disabled={busy != null} onClick={() => void doExport("pdf")}>
                {busy === "pdf" ? <IcSpinner size={15} /> : <IcDoc size={15} />}
                Relatório em PDF
              </Btn>
              <Btn variant="subtle" disabled={busy != null} onClick={() => void doExport("html")}>
                {busy === "html" ? <IcSpinner size={15} /> : <IcDownload size={15} />}
                Página web (HTML)
              </Btn>
              <Btn variant="subtle" disabled={busy != null} onClick={() => void doExport("md")}>
                {busy === "md" ? <IcSpinner size={15} /> : <IcDownload size={15} />}
                Texto simples (Markdown)
              </Btn>
              <Btn
                variant="ghost"
                className="mt-1"
                onClick={() => {
                  downloadText("diario_de_integridade_altavoz.txt", logToText(logEntries), "text/plain");
                  log("export", "Diário de integridade exportado (.txt)", `${logEntries.length} eventos`);
                  toast.push("ok", "Diário baixado", "A trilha completa de auditoria foi salva como arquivo de texto.");
                }}
              >
                <IcHistory size={15} />
                Baixar diário de integridade
              </Btn>
            </div>
            <p className="mt-3 text-[11.5px] leading-relaxed text-mist-400">
              Cada relatório sai com o <Term k="hash">hash</Term> do áudio original, os metadados do
              modelo e a trilha de auditoria — tudo dentro do próprio documento.
            </p>
          </div>

          <Callout tone="warn" title="Aviso importante e honesto">
            Este sistema maximiza a integridade e a rastreabilidade da evidência. A aceitação
            jurídica final depende da legislação do seu país, do tipo de processo e da avaliação do
            juiz — nenhum software pode garanti-la.
          </Callout>
        </div>
      </div>
    </div>
  );
}

export function sizeLabel(bytes: number): string {
  return fmtBytes(bytes);
}
