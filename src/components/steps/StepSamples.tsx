import { useEffect, useRef, useState } from "react";
import type { SpeakerRec, SpeakerSegment, AudioFileRec } from "../../lib/types";
import { analyzeBlob, getAudioContext, pickMime, extractSegment } from "../../lib/audio";
import { cx, uid } from "../../lib/utils";
import { Btn, Callout, Chip, SectionHead } from "../ui";
import { Term } from "../Term";
import { PlayButton, usePlayback, Waveform } from "../Waveform";
import { useToast } from "../Toasts";
import {
  IcAlert,
  IcArrowR,
  IcCheck,
  IcCheckCircle,
  IcSpinner,
  IcTrash,
  IcUser,
} from "../icons";

const MIN_SEC = 5;
const MAX_SEC = 30;
const NUM_SEGMENTS = 5;

export function StepSamples({
  speakers,
  files,
  onAdd,
  onRemove,
  onNext,
  canNext,
}: {
  speakers: SpeakerRec[];
  files: AudioFileRec[];
  onAdd: (sp: SpeakerRec) => boolean;
  onRemove: (id: string) => void;
  onNext: () => void;
  canNext: boolean;
}) {
  const toast = useToast();
  const [selectedFileId, setSelectedFileId] = useState<string>(files[0]?.id ?? "");
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [segments, setSegments] = useState<SpeakerSegment[]>([]);
  const [segmentNames, setSegmentNames] = useState<Record<number, string>>({});

  useEffect(() => {
    if (files.length > 0 && !selectedFileId) {
      setSelectedFileId(files[0].id);
    }
  }, [files, selectedFileId]);

  const validateName = (): boolean => {
    const n = name.trim();
    if (!n) {
      setNameError("Antes de começar, escreva o nome de quem será gravado.");
      return false;
    }
    if (speakers.some((s) => s.name.toLowerCase() === n.toLowerCase())) {
      setNameError("Já existe uma amostra com esse nome. Use outro nome ou remova a anterior.");
      return false;
    }
    setNameError(null);
    return true;
  };

  /* ------------------------------ gravação ------------------------------ */

  const startRecording = async () => {
    if (!validateName()) return;
    setMicError(null);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
    } catch {
      setMicError(
        "Não conseguimos acessar o microfone. Veja se outro aplicativo não está usando o microfone e se o navegador tem permissão (ícone de cadeado ao lado do endereço do site)."
      );
      return;
    }
    streamRef.current = stream;
    chunksRef.current = [];
    levelsRef.current = [];
    startRef.current = performance.now();
    elapsedRef.current = 0;

    const ctx = await getAudioContext();
    void ctx.resume().catch(() => undefined);
    const src = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    src.connect(analyser);
    const data = new Uint8Array(analyser.fftSize);
    const loop = () => {
      analyser.getByteTimeDomainData(data);
      let peak = 0;
      for (let i = 0; i < data.length; i++) {
        const v = Math.abs(data[i] - 128) / 128;
        if (v > peak) peak = v;
      }
      levelsRef.current.push(peak);
      if (levelsRef.current.length > 900) levelsRef.current.shift();
      setLevel(peak);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    const mime = pickMime();
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    recorderRef.current = rec;
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    rec.onstop = () => finalizeRecording();
    rec.start();

    setRecState("rec");
    setRecTime(0);
    timerRef.current = window.setInterval(() => {
      const el = (performance.now() - startRef.current) / 1000;
      elapsedRef.current = el;
      setRecTime(el);
      if (el >= MAX_SEC) stopRecording(false);
    }, 150);
  };

  const stopRecording = (cancelled: boolean) => {
    window.clearInterval(timerRef.current);
    cancelAnimationFrame(rafRef.current);
    setLevel(0);
    const rec = recorderRef.current;
    if (cancelled) {
      if (rec && rec.state !== "inactive") rec.onstop = null;
      rec?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      setRecState("idle");
      setRecTime(0);
      return;
    }
    if (rec && rec.state !== "inactive") rec.stop();
    else finalizeRecording();
  };

  const finalizeRecording = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setRecState("processing");
    const elapsed = Math.min(elapsedRef.current, MAX_SEC);
    const levels = levelsRef.current;

    if (elapsed < MIN_SEC) {
      setRecState("idle");
      setRecTime(0);
      toast.push(
        "warn",
        "A gravação ficou curta demais",
        `Fale por pelo menos ${MIN_SEC} segundos — o sistema precisa de voz suficiente para reconhecer a pessoa.`
      );
      return;
    }

    // forma de onda a partir do medidor de volume ao vivo
    const peaks: number[] = [];
    const target = 80;
    const bucket = Math.max(1, Math.floor(levels.length / target));
    for (let i = 0; i < target; i++) {
      let p = 0;
      for (let j = i * bucket; j < Math.min(levels.length, (i + 1) * bucket); j++) {
        if (levels[j] > p) p = levels[j];
      }
      peaks.push(p);
    }
    const max = Math.max(...peaks, 0.001);
    for (let i = 0; i < peaks.length; i++) peaks[i] = peaks[i] / max;
    const rms = levels.length > 0 ? levels.reduce((a, b) => a + b, 0) / levels.length : 0;

    const rec = recorderRef.current;
    const blob = new Blob(chunksRef.current, { type: rec?.mimeType || "audio/webm" });
    const url = URL.createObjectURL(blob);

    finishAdd({
      id: uid(),
      name: name.trim(),
      source: "gravada",
      durationSec: elapsed,
      rms,
      peaks,
      blobUrl: url,
      quality: rms < 0.035 ? "volume-baixo" : "boa",
      createdAt: Date.now(),
    });
  };

  /* ------------------------------ importação ---------------------------- */

  const importSample = async (file: File) => {
    setImportMsg(null);
    if (!validateName()) return;
    setRecState("processing");
    try {
      const a = await analyzeBlob(file, 80);
      if (a.durationSec < MIN_SEC) {
        setImportMsg(
          `Esta amostra tem só ${Math.round(a.durationSec)} segundos. O ideal é entre ${MIN_SEC} e ${MAX_SEC} segundos de fala contínua.`
        );
        setRecState("idle");
        return;
      }
      if (a.durationSec > MAX_SEC + 5) {
        setImportMsg(
          `Esta amostra tem ${Math.round(a.durationSec)} segundos — mais que o limite de ${MAX_SEC}. Recorte um trecho curto com a própria pessoa falando.`
        );
        setRecState("idle");
        return;
      }
      const url = URL.createObjectURL(file);
      finishAdd({
        id: uid(),
        name: name.trim(),
        source: "importada",
        durationSec: Math.min(a.durationSec, MAX_SEC),
        rms: a.rms,
        peaks: a.peaks,
        blobUrl: url,
        quality: a.rms < 0.008 ? "volume-baixo" : "boa",
        createdAt: Date.now(),
      });
    } catch {
      setImportMsg(
        "Não foi possível ler este arquivo de áudio. Confira se ele toca normalmente e tente de novo, ou grave a amostra pelo microfone."
      );
      setRecState("idle");
    }
  };

  const finishAdd = (sp: SpeakerRec) => {
    const ok = onAdd(sp);
    setRecState("idle");
    setRecTime(0);
    if (ok) {
      toast.push(
        sp.quality === "volume-baixo" ? "warn" : "ok",
        `Amostra de ${sp.name} guardada`,
        sp.quality === "volume-baixo"
          ? "O volume ficou baixo. Ela já vale, mas uma amostra mais alta e clara melhora o reconhecimento."
          : "Duração e volume conferidos. Quanto mais pessoas cadastradas, melhor a separação de vozes."
      );
      setName("");
    }
  };

  /* -------------------------------- render ------------------------------ */

  const ready = speakers.length >= 2;

  return (
    <div>
      <SectionHead
        step="Passo 2 de 5"
        title="Ensine o sistema a reconhecer cada voz"
        desc={`Cadastre uma amostra de voz para cada pessoa que aparece na gravação — de ${MIN_SEC} a ${MAX_SEC} segundos cada. Grave na hora ou importe um arquivo pronto.`}
        aside={
          <Btn variant="primary" onClick={onNext} disabled={!canNext} className="px-5 py-2.5">
            Continuar
            <IcArrowR size={16} />
          </Btn>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[400px_1fr]">
        {/* painel de cadastro */}
        <div className="rounded-xl border border-ink-700 bg-ink-850/80 p-5 h-fit">
          <div className="mb-4 grid grid-cols-2 gap-1.5 rounded-lg border border-ink-700 bg-ink-900/70 p-1.5">
            {(["gravar", "importar"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cx(
                  "flex items-center justify-center gap-2 rounded-md px-3 py-2 text-[13px] font-semibold transition-all cursor-pointer",
                  mode === m ? "bg-brand-400 text-ink-950" : "text-mist-300 hover:text-mist-100"
                )}
              >
                {m === "gravar" ? <IcMic size={15} /> : <IcUpload size={15} />}
                {m === "gravar" ? "Gravar agora" : "Importar arquivo"}
              </button>
            ))}
          </div>

          <label className="block">
            <span className="mb-1.5 block text-[13px] font-semibold text-mist-200">
              Nome de quem vai falar
            </span>
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (nameError) validateName();
              }}
              placeholder="Ex.: Maria, Dr. Souza, Cliente…"
              className={cx(
                "w-full rounded-lg border bg-ink-900/80 px-3.5 py-2.5 text-sm text-mist-100 placeholder:text-mist-500 transition-colors",
                nameError ? "border-warn-400/60" : "border-ink-600 focus:border-brand-400/60"
              )}
            />
            {nameError && (
              <span className="mt-1.5 flex items-start gap-1.5 text-[12.5px] text-warn-300">
                <IcAlert size={13} className="mt-0.5 shrink-0" /> {nameError}
              </span>
            )}
          </label>

          {mode === "gravar" ? (
            <div className="mt-5">
              {recState === "rec" ? (
                <div className="rounded-lg border border-warn-400/40 bg-warn-400/6 p-5 text-center anim-pop">
                  <button
                    onClick={() => stopRecording(false)}
                    className="rec-pulse mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-warn-400 text-ink-950 transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                    aria-label="Parar gravação"
                  >
                    <IcStop size={26} />
                  </button>
                  <p className="mt-3 flex items-center justify-center gap-2 font-mono text-2xl font-semibold text-warn-300">
                    <span className="live-dot inline-block h-2.5 w-2.5 rounded-full bg-warn-400" />
                    {fmtMS(recTime)}
                  </p>
                  <p className="mt-1 text-[12.5px] text-mist-300">
                    Gravando… fale naturalmente. Para em {MAX_SEC} s automaticamente.
                  </p>
                  {/* medidor ao vivo */}
                  <div className="mx-auto mt-3 h-2 max-w-[240px] overflow-hidden rounded-full bg-ink-700">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-ok-500 to-brand-400 transition-[width] duration-100"
                      style={{ width: `${Math.min(100, level * 160)}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-mist-500">Medidor de volume da sua voz</p>
                  <button
                    onClick={() => stopRecording(true)}
                    className="mt-3 text-[12.5px] text-mist-400 underline decoration-dotted underline-offset-4 hover:text-mist-100 cursor-pointer"
                  >
                    Descartar e começar de novo
                  </button>
                </div>
              ) : (
                <div className="rounded-lg border border-ink-700 bg-ink-900/50 p-5 text-center">
                  <button
                    onClick={startRecording}
                    disabled={recState === "processing"}
                    className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-brand-400/60 bg-brand-400/12 text-brand-300 transition-all hover:scale-105 hover:bg-brand-400/20 active:scale-95 disabled:opacity-40 cursor-pointer"
                    aria-label="Começar a gravar"
                  >
                    {recState === "processing" ? <IcSpinner size={24} /> : <IcMic size={26} />}
                  </button>
                  <p className="mt-3 font-display text-[15px] font-semibold">
                    {recState === "processing" ? "Conferindo a gravação…" : "Clique para gravar"}
                  </p>
                  <p className="mx-auto mt-1 max-w-[260px] text-[12.5px] leading-relaxed text-mist-400">
                    Fale de {MIN_SEC} a {MAX_SEC} segundos com a voz que a pessoa usa normalmente.
                    Um ambiente silencioso ajuda muito.
                  </p>
                </div>
              )}
              {micError && (
                <div className="mt-3">
                  <Callout tone="warn" title="Microfone bloqueado">
                    {micError}
                  </Callout>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-5">
              <input
                ref={fileRef}
                type="file"
                accept="audio/*,.mp3,.m4a,.wav,.ogg,.webm"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void importSample(f);
                  e.target.value = "";
                }}
              />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={recState === "processing"}
                className="w-full rounded-lg border-2 border-dashed border-ink-600 bg-ink-900/50 px-4 py-7 text-center transition-all hover:border-brand-400/50 hover:bg-ink-900 disabled:opacity-50 cursor-pointer"
              >
                {recState === "processing" ? (
                  <span className="inline-flex items-center gap-2 text-sm text-mist-300">
                    <IcSpinner size={16} /> Conferindo o arquivo…
                  </span>
                ) : (
                  <>
                    <IcUpload size={22} className="mx-auto mb-2 text-mist-400" />
                    <span className="block text-sm font-semibold text-mist-100">
                      Escolher arquivo de áudio
                    </span>
                    <span className="mt-1 block text-[12.5px] text-mist-400">
                      MP3, M4A, WAV ou OGG · trecho de {MIN_SEC} a {MAX_SEC} segundos
                    </span>
                  </>
                )}
              </button>
              {importMsg && (
                <div className="mt-3">
                  <Callout tone="warn">{importMsg}</Callout>
                </div>
              )}
            </div>
          )}

          <p className="mt-4 text-[12px] leading-relaxed text-mist-500">
            A amostra fica guardada só neste computador e é usada apenas para reconhecer a voz —{" "}
            <Term k="amostra">o que é uma amostra de voz?</Term>
          </p>
        </div>

        {/* lista de pessoas */}
        <div>
          <div className="mb-3">
            {ready ? (
              <Callout tone="ok" title={`${speakers.length} pessoas cadastradas — pronto para a verificação`}>
                No próximo passo, o sistema testa um trecho do seu áudio e mostra quem ele acha que
                está falando, para você confirmar antes do processamento completo.
              </Callout>
            ) : (
              <Callout tone="brand" title={`Faltam ${2 - speakers.length} pessoa${speakers.length === 1 ? "" : "s"}`}>
                Para separar as vozes (<Term k="diarização">diarização</Term>), o sistema precisa
                conhecer pelo menos 2 pessoas. Cadastre uma amostra para cada voz que aparece no
                áudio.
              </Callout>
            )}
          </div>

          {speakers.length === 0 ? (
            <div className="rounded-xl border border-ink-700 bg-ink-850/40 px-6 py-12 text-center">
              <IcUser size={30} className="mx-auto mb-3 text-mist-500" />
              <p className="font-display text-[15px] font-semibold text-mist-200">
                Nenhuma pessoa cadastrada ainda
              </p>
              <p className="mx-auto mt-1 max-w-sm text-[13px] leading-relaxed text-mist-400">
                Cada pessoa que fala no áudio precisa de uma amostra de voz com nome. É isso que
                permite escrever “Maria disse…”, “João respondeu…”.
              </p>
            </div>
          ) : (
            <div className="stagger space-y-3">
              {speakers.map((sp) => (
                <SpeakerCard key={sp.id} sp={sp} onRemove={() => onRemove(sp.id)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SpeakerCard({ sp, onRemove }: { sp: SpeakerRec; onRemove: () => void }) {
  const pb = usePlayback(sp.blobUrl);
  return (
    <div className="rounded-xl border border-ink-700 bg-ink-850/80 p-4 transition-colors hover:border-ink-600">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-ink-600 bg-ink-800 text-brand-300">
          <IcUser size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-[15px] font-semibold">{sp.name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Chip tone="neutral">{sp.source === "gravada" ? "Gravada aqui" : "Arquivo importado"}</Chip>
            <Chip tone="neutral" className="font-mono normal-case! tracking-normal!">
              {Math.round(sp.durationSec)} s de voz
            </Chip>
            {sp.quality === "boa" ? (
              <Chip tone="ok">
                <IcCheck size={11} /> Amostra boa
              </Chip>
            ) : (
              <Chip tone="warn">
                <IcAlert size={11} /> Volume baixo
              </Chip>
            )}
          </div>
        </div>
        <button
          onClick={onRemove}
          aria-label={`Remover amostra de ${sp.name}`}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-ink-600 text-mist-400 transition-all hover:border-warn-400/50 hover:text-warn-300 active:scale-90 cursor-pointer"
        >
          <IcTrash size={15} />
        </button>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <PlayButton playback={pb} size="sm" disabled={!sp.blobUrl} />
        <Waveform peaks={sp.peaks} progress={pb.duration > 0 ? pb.time / pb.duration : 0} onSeek={pb.seekTo} height={34} />
      </div>
      {sp.quality === "volume-baixo" && (
        <p className="mt-2.5 flex items-start gap-1.5 text-[12.5px] text-mist-400">
          <IcCheckCircle size={14} className="mt-0.5 shrink-0 text-warn-300" />
          A amostra vale, mas o reconhecimento pode falhar em trechos baixos. Se puder, grave de
          novo um pouco mais perto do microfone.
        </p>
      )}
    </div>
  );
}
