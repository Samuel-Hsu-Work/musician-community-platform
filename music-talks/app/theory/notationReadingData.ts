import type { TheoryTopic, TheoryTopicCategory } from "./theoryTopicTypes";

export const NOTATION_READING_CATEGORIES: TheoryTopicCategory[] = [
  { id: "staff-clefs", label: "Staff & Clefs", shortLabel: "Clefs" },
  { id: "structure", label: "Score Structure", shortLabel: "Structure" },
  { id: "articulation", label: "Articulation", shortLabel: "Artic." },
  { id: "dynamics", label: "Dynamics", shortLabel: "Dynamics" },
  { id: "navigation", label: "Repeats & Navigation", shortLabel: "Nav" },
];

const c = "symbol" as const;
const k = "concept" as const;

export const NOTATION_READING_TOPICS: TheoryTopic[] = [
  // Staff & clefs
  { id: "staff", name: "Staff", category: "staff-clefs", kind: c },
  { id: "grand-staff", name: "Grand Staff", category: "staff-clefs", kind: k },
  { id: "ledger-lines", name: "Ledger Lines", category: "staff-clefs", kind: k },
  { id: "treble-clef", name: "Treble Clef", category: "staff-clefs", kind: c },
  { id: "bass-clef", name: "Bass Clef", category: "staff-clefs", kind: c },
  { id: "alto-clef", name: "Alto Clef", category: "staff-clefs", kind: c },
  { id: "tenor-clef", name: "Tenor Clef", category: "staff-clefs", kind: k },
  { id: "note-heads-stems", name: "Note Heads & Stems", category: "staff-clefs", kind: k },

  // Structure
  { id: "bar-line", name: "Bar Line", category: "structure", kind: c },
  { id: "double-bar-line", name: "Double Bar Line", category: "structure", kind: c },
  { id: "final-bar-line", name: "Final Bar Line", category: "structure", kind: k },
  { id: "system-brace", name: "Brace & System", category: "structure", kind: k },

  // Articulation
  { id: "staccato", name: "Staccato", category: "articulation", kind: c },
  { id: "staccatissimo", name: "Staccatissimo", category: "articulation", kind: k },
  { id: "tenuto", name: "Tenuto", category: "articulation", kind: c },
  { id: "accent", name: "Accent", category: "articulation", kind: c },
  { id: "marcato", name: "Marcato", category: "articulation", kind: k },
  { id: "legato", name: "Legato", category: "articulation", kind: k },
  { id: "slur", name: "Slur", category: "articulation", kind: c },
  { id: "phrase-mark", name: "Phrase Mark", category: "articulation", kind: k },
  { id: "fermata", name: "Fermata", category: "articulation", kind: c },

  // Dynamics
  { id: "piano-dynamic", name: "Piano (p)", category: "dynamics", kind: k },
  { id: "forte-dynamic", name: "Forte (f)", category: "dynamics", kind: k },
  { id: "mezzo-dynamics", name: "Mezzo Piano & Forte", category: "dynamics", kind: k },
  { id: "crescendo", name: "Crescendo", category: "dynamics", kind: c },
  { id: "diminuendo", name: "Diminuendo", category: "dynamics", kind: c },
  { id: "sforzando", name: "Sforzando (sf, sfz)", category: "dynamics", kind: k },

  // Navigation
  { id: "repeat-sign", name: "Repeat Sign", category: "navigation", kind: c },
  { id: "dal-capo", name: "D.C. (Da Capo)", category: "navigation", kind: k },
  { id: "dal-segno", name: "D.S. (Dal Segno)", category: "navigation", kind: k },
  { id: "coda", name: "Coda", category: "navigation", kind: k },
  { id: "segno", name: "Segno", category: "navigation", kind: k },
  { id: "volta-brackets", name: "Volta Brackets (1st/2nd Ending)", category: "navigation", kind: k },
  { id: "octave-8va", name: "Octave Mark (8va / 8vb)", category: "navigation", kind: c },
];
