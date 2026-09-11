import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 18, ...rest }: P) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    ...rest,
  };
}

export const IcLogo = ({ size = 22, ...rest }: P) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" {...rest}>
    <rect width="32" height="32" rx="7" fill="#16282F" />
    <g stroke="#F5B84B" strokeWidth="2.6" strokeLinecap="round">
      <path d="M7 13v6" />
      <path d="M12 9v14" />
      <path d="M17 12v8" />
      <path d="M22 6v20" />
    </g>
    <path d="M27 14v4" stroke="#43C79B" strokeWidth="2.6" strokeLinecap="round" />
  </svg>
);

export const IcUpload = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 16V4m0 0 4 4m-4-4L8 8" />
    <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
  </svg>
);
export const IcMic = (p: P) => (
  <svg {...base(p)}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
  </svg>
);
export const IcFileAudio = (p: P) => (
  <svg {...base(p)}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5" />
    <path d="M9.5 15.5v-3l2.5-.8v3.3" />
    <circle cx="8.6" cy="15.7" r="1" />
    <circle cx="11.1" cy="15" r="1" />
  </svg>
);
export const IcCheck = (p: P) => (
  <svg {...base(p)}>
    <path d="m4.5 12.5 5 5 10-11" />
  </svg>
);
export const IcCheckCircle = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8.2 12.4 2.6 2.6 5-5.6" />
  </svg>
);
export const IcX = (p: P) => (
  <svg {...base(p)}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);
export const IcAlert = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 4 2.8 19.5h18.4z" />
    <path d="M12 10v4.5M12 17.4v.1" />
  </svg>
);
export const IcInfo = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 7.5v.1" />
  </svg>
);
export const IcShield = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 3 5 6v6c0 4.4 3 7.4 7 9 4-1.6 7-4.6 7-9V6z" />
    <path d="m9 12 2.2 2.2L15.5 9.7" />
  </svg>
);
export const IcCopy = (p: P) => (
  <svg {...base(p)}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" transform="translate(1.5 1.5) scale(.9)" />
  </svg>
);
export const IcPlay = (p: P) => (
  <svg {...base(p)}>
    <path d="M7 5.5v13l11-6.5z" fill="currentColor" stroke="none" />
  </svg>
);
export const IcPause = (p: P) => (
  <svg {...base(p)}>
    <rect x="6.5" y="5" width="3.4" height="14" rx="1" fill="currentColor" stroke="none" />
    <rect x="14" y="5" width="3.4" height="14" rx="1" fill="currentColor" stroke="none" />
  </svg>
);
export const IcTrash = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6.5 7l.8 12a2 2 0 0 0 2 1.9h5.4a2 2 0 0 0 2-1.9l.8-12" />
  </svg>
);
export const IcDownload = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 4v12m0 0 4-4m-4 4-4-4" />
    <path d="M4 17v1a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1" />
  </svg>
);
export const IcDoc = (p: P) => (
  <svg {...base(p)}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5M9 13h6M9 16.5h6" />
  </svg>
);
export const IcBook = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" />
    <path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20" />
  </svg>
);
export const IcHistory = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 12a8 8 0 1 1 2.3 5.6M4 12l-1.5-3M4 12l3.2-.8" />
    <path d="M12 8v4.2l3 1.8" />
  </svg>
);
export const IcChevronR = (p: P) => (
  <svg {...base(p)}>
    <path d="m9 5 7 7-7 7" />
  </svg>
);
export const IcLock = (p: P) => (
  <svg {...base(p)}>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);
export const IcLogout = (p: P) => (
  <svg {...base(p)}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="M16 17l5-5-5-5" />
    <path d="M21 12H9" />
  </svg>
);
export const IcSpinner = (p: P) => (
  <svg {...base(p)} className={`anim-spin ${p.className ?? ""}`}>
    <path d="M12 3a9 9 0 1 1-9 9" />
  </svg>
);
export const IcUser = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20a7 7 0 0 1 14 0" />
  </svg>
);
export const IcUsers = (p: P) => (
  <svg {...base(p)}>
    <circle cx="9" cy="8.5" r="3" />
    <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
    <path d="M15.5 5.8a3 3 0 0 1 0 5.4M17.5 13.7a5.5 5.5 0 0 1 3 5.3" />
  </svg>
);
export const IcWave = (p: P) => (
  <svg {...base(p)}>
    <path d="M3 12h2l2-6 3 12 3-9 2 5 2-2h4" />
  </svg>
);
export const IcRefresh = (p: P) => (
  <svg {...base(p)}>
    <path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v4h-4" />
  </svg>
);
export const IcArrowL = (p: P) => (
  <svg {...base(p)}>
    <path d="M19 12H5m0 0 6-6m-6 6 6 6" />
  </svg>
);
export const IcArrowR = (p: P) => (
  <svg {...base(p)}>
    <path d="M5 12h14m0 0-6-6m6 6-6 6" />
  </svg>
);
export const IcCpu = (p: P) => (
  <svg {...base(p)}>
    <rect x="7" y="7" width="10" height="10" rx="1.5" />
    <path d="M10 3v3M14 3v3M10 18v3M14 18v3M3 10h3M3 14h3M18 10h3M18 14h3" />
  </svg>
);
export const IcOffline = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M5.6 5.6l12.8 12.8" />
  </svg>
);
export const IcEdit = (p: P) => (
  <svg {...base(p)}>
    <path d="M14.5 5 19 9.5 8.5 20H4v-4.5z" />
    <path d="m12.5 7 4.5 4.5" />
  </svg>
);
export const IcStop = (p: P) => (
  <svg {...base(p)}>
    <rect x="7" y="7" width="10" height="10" rx="1.5" fill="currentColor" stroke="none" />
  </svg>
);
export const IcFingerprint = (p: P) => (
  <svg {...base(p)}>
    <path d="M7 6.3A8 8 0 0 1 20 12c0 2.5-.4 4.8-1 6.5" />
    <path d="M4.6 9.5A8 8 0 0 0 4 12c0 3 .8 5.6 1.5 7" />
    <path d="M12 8a4 4 0 0 0-4 4c0 2.6.5 5 1.3 6.8" />
    <path d="M16 12c0 2.8-.3 5.3-.9 7.3M12 12c0 3.2-.5 6-1.4 8" />
  </svg>
);
