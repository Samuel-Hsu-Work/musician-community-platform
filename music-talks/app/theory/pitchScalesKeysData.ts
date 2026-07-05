import type { TheoryTopic, TheoryTopicCategory } from "./theoryTopicTypes";
import { MUSIC_SCALES } from "./scaleData";

export const PITCH_SCALES_KEYS_CATEGORIES: TheoryTopicCategory[] = [
  { id: "fundamentals", label: "Pitch Fundamentals", shortLabel: "Pitch" },
  { id: "accidentals", label: "Accidentals", shortLabel: "Accid." },
  { id: "keys", label: "Keys & Tonality", shortLabel: "Keys" },
  { id: "scale-patterns", label: "Scale Patterns", shortLabel: "Patterns" },
  { id: "scale-reference", label: "Scale Reference", shortLabel: "Scales" },
];

const c = "symbol" as const;
const k = "concept" as const;
const s = "scale" as const;

const CONCEPT_TOPICS: TheoryTopic[] = [
  // Fundamentals
  { id: "pitch", name: "Pitch", category: "fundamentals", kind: k },
  { id: "octave", name: "Octave", category: "fundamentals", kind: k },
  { id: "semitone", name: "Semitone (Half Step)", category: "fundamentals", kind: k },
  { id: "whole-step", name: "Whole Step", category: "fundamentals", kind: k },
  { id: "chromatic-scale", name: "Chromatic Scale", category: "fundamentals", kind: k },
  { id: "concert-pitch-a440", name: "Concert Pitch (A440)", category: "fundamentals", kind: k },

  // Accidentals
  { id: "sharp", name: "Sharp", category: "accidentals", kind: c },
  { id: "flat", name: "Flat", category: "accidentals", kind: c },
  { id: "natural", name: "Natural", category: "accidentals", kind: c },
  { id: "double-sharp", name: "Double Sharp", category: "accidentals", kind: c },
  { id: "double-flat", name: "Double Flat", category: "accidentals", kind: c },
  { id: "enharmonic-equivalence", name: "Enharmonic Equivalence", category: "accidentals", kind: k },

  // Keys
  { id: "key-signature", name: "Key Signature", category: "keys", kind: c },
  { id: "major-key", name: "Major Key", category: "keys", kind: k },
  { id: "minor-key", name: "Minor Key", category: "keys", kind: k },
  { id: "relative-keys", name: "Relative Major & Minor", category: "keys", kind: k },
  { id: "parallel-keys", name: "Parallel Major & Minor", category: "keys", kind: k },
  { id: "circle-of-fifths", name: "Circle of Fifths", category: "keys", kind: k },
  { id: "tonality", name: "Tonality", category: "keys", kind: k },

  // Scale patterns
  { id: "major-scale-pattern", name: "Major Scale Pattern", category: "scale-patterns", kind: k },
  { id: "natural-minor-pattern", name: "Natural Minor Pattern", category: "scale-patterns", kind: k },
  { id: "harmonic-minor-pattern", name: "Harmonic Minor Pattern", category: "scale-patterns", kind: k },
  { id: "melodic-minor-pattern", name: "Melodic Minor Pattern", category: "scale-patterns", kind: k },
  { id: "modes-overview", name: "Modes (Ionian–Locrian)", category: "scale-patterns", kind: k },
];

const SCALE_TOPICS: TheoryTopic[] = MUSIC_SCALES.map((scale) => ({
  id: scale.id,
  name: scale.name,
  category: "scale-reference",
  kind: s,
  notes: scale.notes,
  rootFrequency: scale.rootFrequency,
}));

export const PITCH_SCALES_KEYS_TOPICS: TheoryTopic[] = [
  ...CONCEPT_TOPICS,
  ...SCALE_TOPICS,
];
