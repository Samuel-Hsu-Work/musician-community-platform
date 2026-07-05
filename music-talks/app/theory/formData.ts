import type { TheoryTopic, TheoryTopicCategory } from "./theoryTopicTypes";

export const FORM_CATEGORIES: TheoryTopicCategory[] = [
  { id: "phrases", label: "Phrases & Periods", shortLabel: "Phrases" },
  { id: "small-forms", label: "Small Forms", shortLabel: "Small" },
  { id: "large-forms", label: "Large Forms", shortLabel: "Large" },
  { id: "analysis", label: "Analysis Tools", shortLabel: "Analysis" },
];

const k = "concept" as const;

export const FORM_TOPICS: TheoryTopic[] = [
  { id: "phrase", name: "Phrase", category: "phrases", kind: k },
  { id: "antecedent-consequent", name: "Antecedent & Consequent", category: "phrases", kind: k },
  { id: "period", name: "Period", category: "phrases", kind: k },
  { id: "sentence-form", name: "Sentence", category: "phrases", kind: k },
  { id: "cadence-in-form", name: "Cadence in Form", category: "phrases", kind: k },

  { id: "binary-form", name: "Binary Form (AB)", category: "small-forms", kind: k },
  { id: "ternary-form", name: "Ternary Form (ABA)", category: "small-forms", kind: k },
  { id: "minuet-trio", name: "Minuet & Trio", category: "small-forms", kind: k },
  { id: "strophic-form", name: "Strophic Form", category: "small-forms", kind: k },

  { id: "rondo-form", name: "Rondo Form", category: "large-forms", kind: k },
  { id: "sonata-allegro", name: "Sonata-Allegro Form", category: "large-forms", kind: k },
  { id: "theme-and-variations", name: "Theme and Variations", category: "large-forms", kind: k },
  { id: "fugue", name: "Fugue", category: "large-forms", kind: k },
  { id: "through-composed", name: "Through-Composed Form", category: "large-forms", kind: k },

  { id: "motif", name: "Motif & Motivic Development", category: "analysis", kind: k },
  { id: "section-labels", name: "Section Labels (A, B, C…)", category: "analysis", kind: k },
  { id: "harmonic-rhythm", name: "Harmonic Rhythm", category: "analysis", kind: k },
];
