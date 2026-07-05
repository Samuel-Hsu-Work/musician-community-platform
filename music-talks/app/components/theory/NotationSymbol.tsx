interface NotationSymbolProps {
  id: string;
  className?: string;
  active?: boolean;
}

function StaffIcon({ active }: { active?: boolean }) {
  const stroke = active ? "currentColor" : "currentColor";
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" aria-hidden>
      {[4, 8, 12, 16, 20].map((y) => (
        <line key={y} x1="2" y1={y} x2="22" y2={y} stroke={stroke} strokeWidth="1.2" />
      ))}
    </svg>
  );
}

function BarLineIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" aria-hidden>
      {[4, 8, 12, 16, 20].map((y) => (
        <line key={y} x1="2" y1={y} x2="22" y2={y} stroke="currentColor" strokeWidth="1" opacity="0.5" />
      ))}
      <line x1="14" y1="3" x2="14" y2="21" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function DoubleBarLineIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" aria-hidden>
      {[4, 8, 12, 16, 20].map((y) => (
        <line key={y} x1="2" y1={y} x2="22" y2={y} stroke="currentColor" strokeWidth="1" opacity="0.5" />
      ))}
      <line x1="12" y1="3" x2="12" y2="21" stroke="currentColor" strokeWidth="1.5" />
      <line x1="15" y1="3" x2="15" y2="21" stroke="currentColor" strokeWidth="2.5" />
    </svg>
  );
}

function TieIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" aria-hidden>
      <path d="M4 16 Q12 8 20 16" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <ellipse cx="6" cy="16" rx="2" ry="1.5" fill="currentColor" />
      <ellipse cx="18" cy="16" rx="2" ry="1.5" fill="currentColor" />
    </svg>
  );
}

function SlurIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" aria-hidden>
      <path d="M3 14 Q12 4 21 14" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function CrescendoIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" aria-hidden>
      <path d="M4 18 L20 6 M4 18 L20 18" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function DiminuendoIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" aria-hidden>
      <path d="M4 6 L20 18 M4 18 L20 18" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function RepeatIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" aria-hidden>
      <line x1="10" y1="4" x2="10" y2="20" stroke="currentColor" strokeWidth="2" />
      <line x1="13" y1="4" x2="13" y2="20" stroke="currentColor" strokeWidth="1" />
      <path d="M16 8 A4 4 0 1 1 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <polygon points="16,16 20,14 20,18" fill="currentColor" />
    </svg>
  );
}

function TripletIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" aria-hidden>
      <path d="M5 14 Q12 6 19 14" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <text x="12" y="22" textAnchor="middle" fontSize="9" fill="currentColor" fontWeight="bold">
        3
      </text>
    </svg>
  );
}

const UNICODE_SYMBOLS: Record<string, string> = {
  "treble-clef": "\u{1D11E}",
  "bass-clef": "\u{1D122}",
  "alto-clef": "\u{1D121}",
  "whole-note": "\u{1D15D}",
  "half-note": "\u{1D15E}",
  "quarter-note": "\u{2669}",
  "eighth-note": "\u{266A}",
  "sixteenth-note": "\u{266C}",
  "dotted-note": "\u{2669}\u{00B7}",
  "beamed-eighth": "\u{266B}",
  "whole-rest": "\u{1D13B}",
  "half-rest": "\u{1D13C}",
  "quarter-rest": "\u{1D13D}",
  "eighth-rest": "\u{1D13E}",
  "sixteenth-rest": "\u{1D13F}",
  sharp: "\u{266F}",
  flat: "\u{266D}",
  natural: "\u{266E}",
  "double-sharp": "\u{1D12A}",
  "double-flat": "\u{1D12B}",
  "key-signature": "\u{266F}\u{266F}\u{266F}",
  staccato: "\u{2022}",
  accent: "\u{203A}",
  tenuto: "\u{2014}",
  fermata: "\u{1D110}",
  "octave-8va": "8va",
};

const TEXT_SYMBOLS: Record<string, string> = {
  "time-4-4": "4/4",
  "time-3-4": "3/4",
  "time-2-4": "2/4",
  "time-6-8": "6/8",
};

export default function NotationSymbol({
  id,
  className = "",
  active = false,
}: NotationSymbolProps) {
  const base = `flex items-center justify-center flex-shrink-0 ${className}`;

  switch (id) {
    case "staff":
      return (
        <span className={base}>
          <StaffIcon active={active} />
        </span>
      );
    case "bar-line":
      return (
        <span className={base}>
          <BarLineIcon />
        </span>
      );
    case "double-bar-line":
      return (
        <span className={base}>
          <DoubleBarLineIcon />
        </span>
      );
    case "tie":
      return (
        <span className={base}>
          <TieIcon />
        </span>
      );
    case "slur":
      return (
        <span className={base}>
          <SlurIcon />
        </span>
      );
    case "crescendo":
      return (
        <span className={base}>
          <CrescendoIcon />
        </span>
      );
    case "diminuendo":
      return (
        <span className={base}>
          <DiminuendoIcon />
        </span>
      );
    case "repeat-sign":
      return (
        <span className={base}>
          <RepeatIcon />
        </span>
      );
    case "triplet":
      return (
        <span className={base}>
          <TripletIcon />
        </span>
      );
    default:
      break;
  }

  if (TEXT_SYMBOLS[id]) {
    return (
      <span className={`${base} w-9 text-sm font-bold tracking-tight`}>
        {TEXT_SYMBOLS[id]}
      </span>
    );
  }

  const symbol = UNICODE_SYMBOLS[id];
  if (symbol) {
    return (
      <span
        className={`${base} w-9 text-2xl leading-none`}
        style={{ fontFamily: "serif" }}
      >
        {symbol}
      </span>
    );
  }

  return (
    <span className={`${base} w-9 text-lg font-bold`}>?</span>
  );
}
