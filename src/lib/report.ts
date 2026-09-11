import type { LogEntry, TranscriptResult } from "./types";
import { sha256Hex } from "./audio";
import { fmtDateTime, fmtFriendly, fmtHMS } from "./utils";

function baseName(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, "").replace(/[^\p{L}\p{N}_-]+/gu, "_").slice(0, 48) || "relatorio";
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function mdPipe(s: string): string {
  // Escapar caracteres especiais Markdown para evitar quebra de formato na tabela
  return s.replace(/\|/g, "/");
}

const DISCLAIMER =
  "Este relatório maximiza a integridade e a rastreabilidade da evidência (hash SHA-256, trilha de auditoria, metadados). " +
  "A aceitação jurídica final depende da legislação aplicável, do tipo de processo e da avaliação do juiz — nenhum software pode garanti-la.";

/* ------------------------------- Markdown ------------------------------- */

export function buildMarkdown(r: TranscriptResult, log: LogEntry[]): string {
  const L: string[] = [];
  L.push(`# Relatório de transcrição e identificação de falantes`);
  L.push("");
  L.push(`## Arquivo de origem`);
  L.push(`- **Arquivo:** ${r.fileName}`);
  L.push(`- **Duração:** ${fmtHMS(r.durationSec)} (${fmtFriendly(r.durationSec)})`);
  L.push(`- **Processado em:** ${fmtDateTime(r.processedAt)}`);
  L.push(`- **Tempo de processamento:** ${(r.elapsedMs / 1000).toFixed(1)} s`);
  L.push("");
  L.push(`## Integridade`);
  L.push(`- **SHA-256 do áudio original:** \`${r.sha256}\``);
  L.push(`- **Semente de reprodutibilidade:** \`${r.seedHex}\` (mesmo áudio + mesmas amostras → mesmo resultado)`);
  L.push("");
  L.push(`## Falantes identificados`);
  for (const s of r.speakerStats) {
    L.push(`- **${s.name}** — confiança média ${Math.round(s.avgConf * 100)}% · participação ${s.sharePct}% do tempo falado`);
  }
  L.push("");
  L.push(`## Transcrição`);
  L.push(`| Início | Fim | Falante | Confiança | Texto |`);
  L.push(`|---|---|---|---|---|`);
  for (const s of r.segments) {
    L.push(
      `| ${fmtHMS(s.start)} | ${fmtHMS(s.end)} | ${mdPipe(s.speakerName)} | ${Math.round(s.confidence * 100)}% | ${mdPipe(s.text)} |`
    );
  }
  L.push("");
  L.push(`## Metadados técnicos`);
  L.push(`- Transcrição: ${r.engine.transcriber}`);
  L.push(`- Diarização: ${r.engine.diarizer}`);
  L.push(`- Idioma: ${r.engine.language}`);
  L.push(`- Computação: ${r.engine.compute}`);
  L.push(`- Trechos transcritos: ${r.segments.length}`);
  L.push("");
  if (log.length > 0) {
    L.push(`## Trilha de auditoria (últimos eventos)`);
    for (const e of log.slice(0, 30)) {
      L.push(`- ${fmtDateTime(e.at)} — ${e.title}${e.detail ? ` (${e.detail})` : ""}`);
    }
    L.push("");
  }
  L.push(`---`);
  L.push(`> ${DISCLAIMER}`);
  L.push("");
  return L.join("\n");
}

/* --------------------------------- HTML --------------------------------- */

export function buildHtml(r: TranscriptResult, log: LogEntry[]): string {
  const rows = r.segments
    .map(
      (s) =>
        `<tr><td class="mono">${fmtHMS(s.start)}</td><td class="mono">${fmtHMS(s.end)}</td><td><strong>${esc(
          s.speakerName
        )}</strong></td><td class="mono">${Math.round(s.confidence * 100)}%</td><td>${esc(s.text)}${
          s.edited ? ' <em class="edited">(revisado manualmente)</em>' : ""
        }</td></tr>`
    )
    .join("\n");

  const speakers = r.speakerStats
    .map(
      (s) =>
        `<li><strong>${esc(s.name)}</strong> — confiança média ${Math.round(s.avgConf * 100)}% · participação ${
          s.sharePct
        }% do tempo falado</li>`
    )
    .join("\n");

  const trail = log
    .slice(0, 30)
    .map((e) => `<li><span class="mono">${fmtDateTime(e.at)}</span> — ${esc(e.title)}</li>`)
    .join("\n");

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Relatório — ${esc(r.fileName)}</title>
<style>
  :root { --ink:#1c2b2f; --muted:#5c6f73; --line:#d9ded9; --accent:#8a6116; }
  * { box-sizing: border-box; }
  body { margin:0; background:#f4f4f0; color:var(--ink); font:15px/1.6 Georgia, 'Times New Roman', serif; }
  .sheet { max-width: 900px; margin: 32px auto; background:#fff; border:1px solid var(--line); padding: 56px 64px; box-shadow: 0 2px 18px rgba(28,43,47,.08); }
  header { border-bottom: 3px double var(--ink); padding-bottom: 20px; margin-bottom: 28px; }
  h1 { font-size: 26px; margin: 0 0 6px; letter-spacing: .2px; }
  h2 { font-size: 17px; margin: 34px 0 10px; text-transform: uppercase; letter-spacing: 1.4px; color: var(--accent); border-bottom: 1px solid var(--line); padding-bottom: 6px; }
  .sub { color: var(--muted); margin: 0; font-size: 14px; }
  dl { display: grid; grid-template-columns: 220px 1fr; gap: 6px 16px; margin: 0; }
  dt { color: var(--muted); }
  dd { margin: 0; }
  .mono { font-family: 'Courier New', ui-monospace, monospace; font-size: 13px; word-break: break-all; }
  .hashbox { background:#f6f5ef; border:1px solid var(--line); padding: 12px 14px; margin-top: 6px; }
  table { width:100%; border-collapse: collapse; font-size: 13.5px; font-family: system-ui, sans-serif; }
  th { text-align:left; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: var(--muted); border-bottom: 2px solid var(--ink); padding: 8px 6px; }
  td { border-bottom: 1px solid var(--line); padding: 7px 6px; vertical-align: top; }
  tr:nth-child(even) td { background:#fbfaf6; }
  .edited { color: var(--accent); font-size: 12px; }
  footer { margin-top: 40px; border-top: 1px solid var(--line); padding-top: 16px; color: var(--muted); font-size: 12.5px; font-style: italic; }
  @media print { body { background:#fff; } .sheet { margin:0; border:0; box-shadow:none; padding: 24px 8px; } }
</style>
</head>
<body>
<div class="sheet">
  <header>
    <h1>Relatório de transcrição e identificação de falantes</h1>
    <p class="sub">Gerado localmente pelo AtaVoz · ${fmtDateTime(r.processedAt)}</p>
  </header>

  <h2>1 · Arquivo de origem</h2>
  <dl>
    <dt>Arquivo</dt><dd>${esc(r.fileName)}</dd>
    <dt>Duração</dt><dd>${fmtHMS(r.durationSec)} (${fmtFriendly(r.durationSec)})</dd>
    <dt>Processado em</dt><dd>${fmtDateTime(r.processedAt)}</dd>
    <dt>Tempo de processamento</dt><dd>${(r.elapsedMs / 1000).toFixed(1)} segundos</dd>
    <dt>Trechos transcritos</dt><dd>${r.segments.length}</dd>
  </dl>

  <h2>2 · Integridade da evidência</h2>
  <dl>
    <dt>SHA-256 do áudio original</dt>
    <dd><div class="hashbox mono">${esc(r.sha256)}</div></dd>
    <dt>Reprodutibilidade</dt>
    <dd>Semente <span class="mono">${esc(r.seedHex)}</span> — o mesmo áudio, com as mesmas amostras de voz, reproduz este resultado. Qualquer alteração no arquivo original muda o hash acima.</dd>
  </dl>

  <h2>3 · Falantes identificados</h2>
  <ul>${speakers}</ul>

  <h2>4 · Transcrição integral</h2>
  <table>
    <thead><tr><th>Início</th><th>Fim</th><th>Falante</th><th>Conf.</th><th>Conteúdo</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>

  <h2>5 · Metadados técnicos</h2>
  <dl>
    <dt>Transcrição</dt><dd>${esc(r.engine.transcriber)}</dd>
    <dt>Identificação de falantes</dt><dd>${esc(r.engine.diarizer)}</dd>
    <dt>Idioma</dt><dd>${esc(r.engine.language)}</dd>
    <dt>Computação</dt><dd>${esc(r.engine.compute)}</dd>
  </dl>

  ${
    trail
      ? `<h2>6 · Trilha de auditoria (últimos eventos)</h2><ul style="font-family:system-ui,sans-serif;font-size:13px">${trail}</ul>`
      : ""
  }

  <footer>${DISCLAIMER}</footer>
</div>
</body>
</html>`;
}

/* -------------------------------- saída --------------------------------- */

export async function exportReport(
  kind: "md" | "html",
  r: TranscriptResult,
  log: LogEntry[]
): Promise<{ hash: string; filename: string }> {
  const content = kind === "md" ? buildMarkdown(r, log) : buildHtml(r, log);
  const hash = await sha256Hex(content);
  const stamp = new Date().toISOString().slice(0, 16).replace(/[T:]/g, "-");
  const filename = `${baseName(r.fileName)}_${kind === "md" ? "relatorio" : "relatorio"}_${stamp}.${kind === "md" ? "md" : "html"}`;
  const mime = kind === "md" ? "text/markdown" : "text/html";
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
  return { hash, filename };
}

/** PDF via diálogo de impressão do navegador (escolher "Salvar como PDF"). */
export function printAsPdf(r: TranscriptResult, log: LogEntry[]): void {
  const html = buildHtml(r, log);
  const frame = document.createElement("iframe");
  frame.style.position = "fixed";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  if (!doc) return;
  doc.open();
  doc.write(html);
  doc.close();
  frame.onload = () => {
    window.setTimeout(() => {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
      window.setTimeout(() => frame.remove(), 60_000);
    }, 120);
  };
  // alguns navegadores não disparam onload com doc.write — garantimos a impressão:
  window.setTimeout(() => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
  }, 400);
}
