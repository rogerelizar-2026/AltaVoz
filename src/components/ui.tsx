import { useEffect, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cx } from "../lib/utils";
import { IcX } from "./icons";

/* ------------------------------- Button ------------------------------- */

type BtnVariant = "primary" | "success" | "ghost" | "subtle" | "danger" | "outline";

export function Btn({
  variant = "subtle",
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant }) {
  const styles: Record<BtnVariant, string> = {
    primary:
      "bg-brand-400 text-ink-950 font-semibold hover:bg-brand-300 active:scale-[0.97] shadow-[0_2px_16px_rgba(245,184,75,0.25)]",
    success:
      "bg-ok-400 text-ink-950 font-semibold hover:bg-ok-300 active:scale-[0.97] shadow-[0_2px_16px_rgba(67,199,155,0.25)]",
    danger:
      "bg-warn-400/15 text-warn-300 border border-warn-400/40 hover:bg-warn-400/25 active:scale-[0.97]",
    ghost: "text-mist-300 hover:text-mist-100 hover:bg-ink-750 active:scale-[0.97]",
    subtle:
      "bg-ink-750 text-mist-100 border border-ink-600 hover:border-mist-500 hover:bg-ink-700 active:scale-[0.97]",
    outline:
      "bg-transparent border border-brand-400/50 text-brand-300 hover:bg-brand-400/10 active:scale-[0.97]",
  };
  return (
    <button
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none cursor-pointer select-none",
        styles[variant],
        className
      )}
      {...rest}
    />
  );
}

/* -------------------------------- Modal ------------------------------- */

export function Modal({
  open,
  onClose,
  title,
  icon,
  children,
  width = "max-w-lg",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  width?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-ink-950/75 backdrop-blur-[3px] anim-fade"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={cx(
          "w-full rounded-xl border border-ink-600 bg-ink-850 shadow-[0_24px_70px_rgba(0,0,0,0.55)] anim-pop",
          width
        )}
      >
        <div className="flex items-center gap-3 border-b border-ink-700 px-5 py-4">
          {icon}
          <h3 className="font-display text-lg font-semibold flex-1">{title}</h3>
          <button
            onClick={onClose}
            className="text-mist-400 hover:text-mist-100 transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <IcX size={18} />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

/* -------------------------------- Chip -------------------------------- */

export function Chip({
  tone = "neutral",
  children,
  className,
}: {
  tone?: "neutral" | "ok" | "warn" | "info" | "brand" | "rec";
  children: ReactNode;
  className?: string;
}) {
  const tones = {
    neutral: "bg-ink-750 text-mist-300 border-ink-600",
    ok: "bg-ok-400/12 text-ok-300 border-ok-400/35",
    warn: "bg-warn-400/12 text-warn-300 border-warn-400/35",
    info: "bg-info-400/12 text-info-300 border-info-400/35",
    brand: "bg-brand-400/12 text-brand-300 border-brand-400/35",
    rec: "bg-warn-400/15 text-warn-300 border-warn-400/40",
  };
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

/* ------------------------------ ProgressBar --------------------------- */

export function ProgressBar({
  value,
  tone = "brand",
  className,
}: {
  value: number;
  tone?: "brand" | "ok";
  className?: string;
}) {
  return (
    <div className={cx("h-2 w-full overflow-hidden rounded-full bg-ink-700", className)}>
      <div
        className={cx(
          "h-full rounded-full transition-[width] duration-200 ease-out",
          tone === "brand"
            ? "bg-gradient-to-r from-brand-500 to-brand-300"
            : "bg-gradient-to-r from-ok-500 to-ok-300"
        )}
        style={{ width: `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%` }}
      />
    </div>
  );
}

/* ------------------------------ SectionHead --------------------------- */

export function SectionHead({
  step,
  title,
  desc,
  aside,
}: {
  step: string;
  title: string;
  desc: string;
  aside?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-brand-400">
          {step}
        </p>
        <h1 className="font-display text-3xl font-bold leading-tight mt-1.5 sm:text-[34px]">
          {title}
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-mist-300">{desc}</p>
      </div>
      {aside}
    </div>
  );
}

/* ------------------------------- Callout ------------------------------ */

export function Callout({
  tone = "info",
  title,
  children,
}: {
  tone?: "info" | "ok" | "warn" | "brand";
  title?: string;
  children: ReactNode;
}) {
  const tones = {
    info: "border-info-400/30 bg-info-400/8 text-info-300",
    ok: "border-ok-400/30 bg-ok-400/8 text-ok-300",
    warn: "border-warn-400/30 bg-warn-400/8 text-warn-300",
    brand: "border-brand-400/30 bg-brand-400/8 text-brand-300",
  };
  return (
    <div className={cx("rounded-lg border px-4 py-3 text-sm leading-relaxed", tones[tone])}>
      {title && <p className="mb-1 font-semibold text-mist-100">{title}</p>}
      <div className="text-mist-200">{children}</div>
    </div>
  );
}
