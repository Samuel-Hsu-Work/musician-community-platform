import type { TheoryTopic, TheoryTopicCategory } from "./theoryTopicTypes";

export const INTERVAL_CATEGORIES: TheoryTopicCategory[] = [
  { id: "simple", label: "Simple Intervals", shortLabel: "Simple" },
  { id: "quality", label: "Quality & Naming", shortLabel: "Naming" },
  { id: "usage", label: "Usage & Hearing", shortLabel: "Usage" },
];

const k = "concept" as const;

export const INTERVAL_TOPICS: TheoryTopic[] = [
  { id: "minor-second", name: "Minor Second", category: "simple", kind: k },
  { id: "major-second", name: "Major Second", category: "simple", kind: k },
  { id: "minor-third", name: "Minor Third", category: "simple", kind: k },
  { id: "major-third", name: "Major Third", category: "simple", kind: k },
  { id: "perfect-fourth", name: "Perfect Fourth", category: "simple", kind: k },
  { id: "tritone", name: "Tritone", category: "simple", kind: k },
  { id: "perfect-fifth", name: "Perfect Fifth", category: "simple", kind: k },
  { id: "minor-sixth", name: "Minor Sixth", category: "simple", kind: k },
  { id: "major-sixth", name: "Major Sixth", category: "simple", kind: k },
  { id: "minor-seventh", name: "Minor Seventh", category: "simple", kind: k },
  { id: "major-seventh", name: "Major Seventh", category: "simple", kind: k },
  { id: "perfect-octave", name: "Perfect Octave", category: "simple", kind: k },
  { id: "interval-naming", name: "Interval Number & Quality", category: "quality", kind: k },
  { id: "compound-intervals", name: "Compound Intervals", category: "quality", kind: k },
  { id: "interval-inversion", name: "Interval Inversion", category: "quality", kind: k },
  { id: "harmonic-interval", name: "Harmonic Interval", category: "usage", kind: k },
  { id: "melodic-interval", name: "Melodic Interval", category: "usage", kind: k },
  { id: "consonance-dissonance", name: "Consonance & Dissonance", category: "usage", kind: k },
];
