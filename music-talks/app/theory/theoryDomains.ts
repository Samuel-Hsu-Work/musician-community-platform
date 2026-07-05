export type TheoryDomainId =
  | "notation-reading"
  | "rhythm-meter"
  | "pitch-scales-keys"
  | "intervals"
  | "chords-harmony"
  | "form-analysis";

export type TheoryDomainStatus = "live" | "coming-soon";

export interface TheoryDomain {
  id: TheoryDomainId;
  label: string;
  shortLabel: string;
  description: string;
  href: string;
  icon: string;
  status: TheoryDomainStatus;
}

/**
 * Top-level Theory curriculum.
 * Each domain has its own catalog in theoryDomainConfig.ts.
 */
export const THEORY_DOMAINS: TheoryDomain[] = [
  {
    id: "notation-reading",
    label: "Notation & Reading",
    shortLabel: "Notation",
    description:
      "Staff, clefs, articulation, dynamics, and navigation symbols on the score.",
    href: "/theory/notation-reading",
    icon: "📖",
    status: "live",
  },
  {
    id: "rhythm-meter",
    label: "Rhythm & Meter",
    shortLabel: "Rhythm",
    description:
      "Note values, rests, time signatures, grouping, and rhythmic concepts.",
    href: "/theory/rhythm-meter",
    icon: "🥁",
    status: "live",
  },
  {
    id: "pitch-scales-keys",
    label: "Pitch, Scales & Keys",
    shortLabel: "Pitch & Keys",
    description:
      "Pitch, accidentals, keys, scale patterns, and scale reference with frequencies.",
    href: "/theory/pitch-scales-keys",
    icon: "🎹",
    status: "live",
  },
  {
    id: "intervals",
    label: "Intervals",
    shortLabel: "Intervals",
    description:
      "Distance between pitches — quality, naming, inversion, and consonance.",
    href: "/theory/intervals",
    icon: "↕️",
    status: "live",
  },
  {
    id: "chords-harmony",
    label: "Chords & Harmony",
    shortLabel: "Harmony",
    description:
      "Triads, seventh chords, extensions, voice leading, and progressions.",
    href: "/theory/chords-harmony",
    icon: "🎼",
    status: "live",
  },
  {
    id: "form-analysis",
    label: "Form & Analysis",
    shortLabel: "Form",
    description:
      "Phrases, small and large forms, and tools for analyzing structure.",
    href: "/theory/form-analysis",
    icon: "📐",
    status: "live",
  },
];

export function getTheoryDomain(id: TheoryDomainId): TheoryDomain {
  const domain = THEORY_DOMAINS.find((d) => d.id === id);
  if (!domain) {
    throw new Error(`Unknown theory domain: ${id}`);
  }
  return domain;
}

export function isTheoryDomainPath(pathname: string): boolean {
  return pathname === "/theory" || pathname.startsWith("/theory/");
}

export function getActiveTheoryDomain(pathname: string): TheoryDomain | null {
  if (pathname === "/theory") {
    return getTheoryDomain("notation-reading");
  }
  return (
    THEORY_DOMAINS.find(
      (d) => pathname === d.href || pathname.startsWith(`${d.href}/`)
    ) ?? null
  );
}
