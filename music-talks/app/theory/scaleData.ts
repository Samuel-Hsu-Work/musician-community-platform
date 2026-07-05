export type ScaleCategory =
  | "major"
  | "natural-minor"
  | "harmonic-minor"
  | "melodic-minor";

export interface ScaleDefinition {
  id: string;
  name: string;
  category: ScaleCategory;
  notes: string[];
  rootFrequency: number;
}

export const SCALE_CATEGORIES: {
  id: ScaleCategory;
  label: string;
  shortLabel: string;
}[] = [
  { id: "major", label: "Major Scales", shortLabel: "Major" },
  {
    id: "natural-minor",
    label: "Natural Minor Scales",
    shortLabel: "Nat. Minor",
  },
  {
    id: "harmonic-minor",
    label: "Harmonic Minor Scales",
    shortLabel: "Harm. Minor",
  },
  {
    id: "melodic-minor",
    label: "Melodic Minor Scales",
    shortLabel: "Mel. Minor",
  },
];

export function getScaleCategoryLabel(category: ScaleCategory): string {
  return SCALE_CATEGORIES.find((c) => c.id === category)?.label ?? category;
}

const C4_FREQUENCY = 261.63;

const NOTE_TO_INDEX: Record<string, number> = {
  C: 0,
  "C#": 1,
  Db: 1,
  D: 2,
  "D#": 3,
  Eb: 3,
  E: 4,
  F: 5,
  "F#": 6,
  Gb: 6,
  G: 7,
  "G#": 8,
  Ab: 8,
  A: 9,
  "A#": 10,
  Bb: 10,
  B: 11,
};

function rootFrequency(root: string): number {
  const index = NOTE_TO_INDEX[root];
  return C4_FREQUENCY * Math.pow(2, index / 12);
}

function scale(
  id: string,
  name: string,
  category: ScaleCategory,
  notes: string[]
): ScaleDefinition {
  return {
    id,
    name,
    category,
    notes,
    rootFrequency: rootFrequency(notes[0]),
  };
}

/** Scale catalog — sidebar browse; main panel shows notes & frequencies */
export const MUSIC_SCALES: ScaleDefinition[] = [
  // Major Scales
  scale("c-major", "C Major", "major", ["C", "D", "E", "F", "G", "A", "B"]),
  scale("g-major", "G Major", "major", ["G", "A", "B", "C", "D", "E", "F#"]),
  scale("d-major", "D Major", "major", ["D", "E", "F#", "G", "A", "B", "C#"]),
  scale("f-major", "F Major", "major", ["F", "G", "A", "Bb", "C", "D", "E"]),
  scale("a-major", "A Major", "major", ["A", "B", "C#", "D", "E", "F#", "G#"]),
  scale("e-major", "E Major", "major", ["E", "F#", "G#", "A", "B", "C#", "D#"]),
  scale("b-major", "B Major", "major", ["B", "C#", "D#", "E", "F#", "G#", "A#"]),

  // Natural Minor Scales
  scale("a-natural-minor", "A Natural Minor", "natural-minor", [
    "A", "B", "C", "D", "E", "F", "G",
  ]),
  scale("e-natural-minor", "E Natural Minor", "natural-minor", [
    "E", "F#", "G", "A", "B", "C", "D",
  ]),
  scale("b-natural-minor", "B Natural Minor", "natural-minor", [
    "B", "C#", "D", "E", "F#", "G", "A",
  ]),
  scale("d-natural-minor", "D Natural Minor", "natural-minor", [
    "D", "E", "F", "G", "A", "Bb", "C",
  ]),
  scale("g-natural-minor", "G Natural Minor", "natural-minor", [
    "G", "A", "Bb", "C", "D", "Eb", "F",
  ]),
  scale("c-natural-minor", "C Natural Minor", "natural-minor", [
    "C", "D", "Eb", "F", "G", "Ab", "Bb",
  ]),
  scale("f-natural-minor", "F Natural Minor", "natural-minor", [
    "F", "G", "Ab", "Bb", "C", "Db", "Eb",
  ]),

  // Harmonic Minor Scales
  scale("a-harmonic-minor", "A Harmonic Minor", "harmonic-minor", [
    "A", "B", "C", "D", "E", "F", "G#",
  ]),
  scale("e-harmonic-minor", "E Harmonic Minor", "harmonic-minor", [
    "E", "F#", "G", "A", "B", "C", "D#",
  ]),
  scale("d-harmonic-minor", "D Harmonic Minor", "harmonic-minor", [
    "D", "E", "F", "G", "A", "Bb", "C#",
  ]),
  scale("b-harmonic-minor", "B Harmonic Minor", "harmonic-minor", [
    "B", "C#", "D", "E", "F#", "G", "A#",
  ]),
  scale("g-harmonic-minor", "G Harmonic Minor", "harmonic-minor", [
    "G", "A", "Bb", "C", "D", "Eb", "F#",
  ]),

  // Melodic Minor Scales (ascending)
  scale("a-melodic-minor", "A Melodic Minor", "melodic-minor", [
    "A", "B", "C", "D", "E", "F#", "G#",
  ]),
  scale("e-melodic-minor", "E Melodic Minor", "melodic-minor", [
    "E", "F#", "G", "A", "B", "C#", "D#",
  ]),
  scale("d-melodic-minor", "D Melodic Minor", "melodic-minor", [
    "D", "E", "F", "G", "A", "B", "C#",
  ]),
  scale("b-melodic-minor", "B Melodic Minor", "melodic-minor", [
    "B", "C#", "D", "E", "F#", "G#", "A#",
  ]),
  scale("g-melodic-minor", "G Melodic Minor", "melodic-minor", [
    "G", "A", "Bb", "C", "D", "E", "F#",
  ]),
];

function semitoneFromRoot(root: string, note: string): number {
  return (NOTE_TO_INDEX[note] - NOTE_TO_INDEX[root] + 12) % 12;
}

/** Compute Hz for each note in the scale (one octave from root) */
export function getScaleFrequencies(scaleDef: ScaleDefinition): number[] {
  const root = scaleDef.notes[0];
  return scaleDef.notes.map((note) => {
    const semitones = semitoneFromRoot(root, note);
    return scaleDef.rootFrequency * Math.pow(2, semitones / 12);
  });
}
