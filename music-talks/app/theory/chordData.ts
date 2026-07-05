import type { TheoryTopic, TheoryTopicCategory } from "./theoryTopicTypes";

export const CHORD_CATEGORIES: TheoryTopicCategory[] = [
  { id: "triads", label: "Triads", shortLabel: "Triads" },
  { id: "sevenths", label: "Seventh Chords", shortLabel: "7ths" },
  { id: "extensions", label: "Extensions & Color", shortLabel: "Ext." },
  { id: "inversions", label: "Inversions & Voicing", shortLabel: "Voicing" },
  { id: "harmony", label: "Harmony & Progressions", shortLabel: "Harmony" },
];

const k = "concept" as const;

export const CHORD_TOPICS: TheoryTopic[] = [
  { id: "major-triad", name: "Major Triad", category: "triads", kind: k },
  { id: "minor-triad", name: "Minor Triad", category: "triads", kind: k },
  { id: "diminished-triad", name: "Diminished Triad", category: "triads", kind: k },
  { id: "augmented-triad", name: "Augmented Triad", category: "triads", kind: k },
  { id: "suspended-chords", name: "Suspended Chords (sus2, sus4)", category: "triads", kind: k },

  { id: "major-seventh-chord", name: "Major Seventh Chord", category: "sevenths", kind: k },
  { id: "dominant-seventh-chord", name: "Dominant Seventh Chord", category: "sevenths", kind: k },
  { id: "minor-seventh-chord", name: "Minor Seventh Chord", category: "sevenths", kind: k },
  { id: "half-diminished-seventh", name: "Half-Diminished Seventh (ø7)", category: "sevenths", kind: k },
  { id: "diminished-seventh-chord", name: "Fully Diminished Seventh", category: "sevenths", kind: k },

  { id: "added-sixth", name: "Added Sixth Chord", category: "extensions", kind: k },
  { id: "ninth-chords", name: "Ninth Chords", category: "extensions", kind: k },
  { id: "eleventh-chords", name: "Eleventh Chords", category: "extensions", kind: k },
  { id: "thirteenth-chords", name: "Thirteenth Chords", category: "extensions", kind: k },

  { id: "root-position", name: "Root Position", category: "inversions", kind: k },
  { id: "first-inversion", name: "First Inversion", category: "inversions", kind: k },
  { id: "second-inversion", name: "Second Inversion", category: "inversions", kind: k },
  { id: "voice-leading", name: "Voice Leading Basics", category: "inversions", kind: k },

  { id: "roman-numerals", name: "Roman Numeral Analysis", category: "harmony", kind: k },
  { id: "tonic-function", name: "Tonic Function (I)", category: "harmony", kind: k },
  { id: "dominant-function", name: "Dominant Function (V)", category: "harmony", kind: k },
  { id: "subdominant-function", name: "Subdominant Function (IV)", category: "harmony", kind: k },
  { id: "authentic-cadence", name: "Authentic Cadence (V–I)", category: "harmony", kind: k },
  { id: "plagal-cadence", name: "Plagal Cadence (IV–I)", category: "harmony", kind: k },
  { id: "half-cadence", name: "Half Cadence", category: "harmony", kind: k },
  { id: "deceptive-cadence", name: "Deceptive Cadence", category: "harmony", kind: k },
  { id: "ii-v-i-progression", name: "ii–V–I Progression", category: "harmony", kind: k },
  { id: "i-iv-v-progression", name: "I–IV–V Progression", category: "harmony", kind: k },
  { id: "secondary-dominant", name: "Secondary Dominant", category: "harmony", kind: k },
];
