export interface ExplanationCategorySeed {
  id: string;
  label: string;
  shortLabel: string;
  icon: string;
  description: string;
  sortOrder: number;
  aiGuidance: string;
}

export const EXPLANATION_CATEGORIES_SEED: ExplanationCategorySeed[] = [
  {
    id: 'music-core',
    label: 'Analytical / STEM',
    shortLabel: 'STEM',
    icon: '🔬',
    description: 'Structured logic, patterns, and precise theory',
    sortOrder: 0,
    aiGuidance:
      'Explain with analytical and STEM-style thinking: clear definitions, step-by-step logic, patterns, and ratios. For pitch topics, you may use frequency (Hz), wavelength, or the A440 reference when it helps — but only when the concept involves pitch. For rhythm or form topics, use counting, fractions, and proportional reasoning instead. Always define standard theory terms. Avoid fluffy metaphors; prioritize accuracy and systematic reasoning.',
  },
  {
    id: 'art',
    label: 'Art',
    shortLabel: 'Art',
    icon: '🎨',
    description: 'Composition, color, and aesthetic thinking',
    sortOrder: 1,
    aiGuidance:
      'Explain through an artistic lens: composition, contrast, balance, color, texture, mood, and creative metaphor. Treat notation and theory like elements in a painting or design — how marks relate on the page, what feels harmonious or tense, how light and shade or warm and cool hues might echo sound character. Use art-school thinking (palette, gesture, foreground/background, negative space) rather than physics, engineering, or everyday chores. Keep the metaphor brief and always tie it back to the correct musical meaning.',
  },
  {
    id: 'everyday-life',
    label: 'Everyday analogies',
    shortLabel: 'Daily',
    icon: '🏠',
    description: 'Familiar situations and objects',
    sortOrder: 2,
    aiGuidance:
      'Ground the explanation in familiar everyday situations—shelves, steps, traffic signals, labels on containers, or routines people already know. Make the symbol feel concrete before stating the formal definition.',
  },
  {
    id: 'performance',
    label: 'Performance',
    shortLabel: 'Play',
    icon: '🎹',
    description: 'How it feels at the instrument',
    sortOrder: 3,
    aiGuidance:
      'Describe how a performer encounters this symbol: hand shape, touch, listening cues, counting, or what changes when reading vs playing. Connect notation to sound production and rehearsal habits.',
  },
];
