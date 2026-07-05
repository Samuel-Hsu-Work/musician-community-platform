import type { TheoryDefinitionSeed } from './scaleDefinitionsSeed';

export const CHORD_DEFINITIONS_SEED: TheoryDefinitionSeed[] = [
  {
    id: 'major-triad',
    name: 'Major Triad',
    category: 'triads',
    standardDefinition:
      'A major triad stacks a major third and then a minor third above the root (root–major 3rd–perfect 5th). It sounds stable and bright and is notated as C, Cmaj, or CΔ for C major.',
  },
  {
    id: 'minor-triad',
    name: 'Minor Triad',
    category: 'triads',
    standardDefinition:
      'A minor triad stacks a minor third and then a major third above the root (root–minor 3rd–perfect 5th). It sounds darker than major and is labeled Cm or C– for C minor.',
  },
  {
    id: 'diminished-triad',
    name: 'Diminished Triad',
    category: 'triads',
    standardDefinition:
      'A diminished triad uses two minor thirds (root–minor 3rd–diminished 5th). The fifth is lowered, creating instability often used on leading-tone vii° in minor keys.',
  },
  {
    id: 'augmented-triad',
    name: 'Augmented Triad',
    category: 'triads',
    standardDefinition:
      'An augmented triad uses two major thirds (root–major 3rd–augmented 5th). The raised fifth creates symmetry and tonal ambiguity, common as a passing sonority.',
  },
  {
    id: 'major-seventh-chord',
    name: 'Major Seventh Chord',
    category: 'sevenths',
    standardDefinition:
      'A major seventh chord adds a major seventh above a major triad (C–E–G–B in Cmaj7). The major seventh sits a semitone below the octave and produces a lush, jazz-influenced color.',
  },
  {
    id: 'dominant-seventh-chord',
    name: 'Dominant Seventh Chord',
    category: 'sevenths',
    standardDefinition:
      'A dominant seventh chord adds a minor seventh to a major triad (C–E–G–Bb in C7). The tritone between the third and seventh creates tension that strongly resolves to the tonic, especially in V7–I motion.',
  },
  {
    id: 'minor-seventh-chord',
    name: 'Minor Seventh Chord',
    category: 'sevenths',
    standardDefinition:
      'A minor seventh chord adds a minor seventh to a minor triad (C–Eb–G–Bb in Cm7). It is common in ii7 in major keys and modal jazz harmony.',
  },
  {
    id: 'half-diminished-seventh',
    name: 'Half-Diminished Seventh (ø7)',
    category: 'sevenths',
    standardDefinition:
      'A half-diminished seventh chord (ø7) is a diminished triad plus a minor seventh — e.g. B–D–F–A for Bø7. It often functions as iiø7 in minor keys and contains a diminished fifth but not a fully diminished seventh.',
  },
  {
    id: 'diminished-seventh-chord',
    name: 'Fully Diminished Seventh',
    category: 'sevenths',
    standardDefinition:
      'A fully diminished seventh chord stacks three minor thirds (e.g. B–D–F–Ab). Every interval above the root is a minor third; it is symmetrical and often connects distant keys as a passing dominant substitute.',
  },
  {
    id: 'root-position',
    name: 'Root Position',
    category: 'inversions',
    standardDefinition:
      'A chord is in root position when the root is the lowest sounding note. Roman-figured bass uses no numbers for triads in root position (e.g. C major over C).',
  },
  {
    id: 'first-inversion',
    name: 'First Inversion',
    category: 'inversions',
    standardDefinition:
      'First inversion places the third of the chord in the bass. A C major triad in first inversion is E–G–C (lowest to highest in close position). Figured bass: 6/3 for triads.',
  },
  {
    id: 'second-inversion',
    name: 'Second Inversion',
    category: 'inversions',
    standardDefinition:
      'Second inversion places the fifth in the bass — e.g. G–C–E for C major. It often appears as a cadential 6/4 before V, where the bass fifth needs careful voice-leading to resolve.',
  },
  {
    id: 'roman-numerals',
    name: 'Roman Numeral Analysis',
    category: 'harmony',
    standardDefinition:
      'Roman numerals label chords by scale degree and quality (I, ii, V7, etc.). Uppercase denotes major or dominant; lowercase denotes minor. They describe function within a key regardless of transposition.',
  },
  {
    id: 'authentic-cadence',
    name: 'Authentic Cadence (V–I)',
    category: 'harmony',
    standardDefinition:
      'An authentic cadence moves from dominant to tonic (V–I or V7–I). It is the strongest harmonic punctuation in tonal music, creating a sense of arrival at home.',
  },
  {
    id: 'plagal-cadence',
    name: 'Plagal Cadence (IV–I)',
    category: 'harmony',
    standardDefinition:
      'A plagal cadence moves from subdominant to tonic (IV–I), often called the “Amen” cadence. It is softer than an authentic cadence and frequently follows V–I for extra closure.',
  },
  {
    id: 'ii-v-i-progression',
    name: 'ii–V–I Progression',
    category: 'harmony',
    standardDefinition:
      'The ii–V–I progression chains pre-dominant, dominant, and tonic — e.g. Dm7–G7–Cmaj in C major. It is the central harmonic loop in jazz and common-practice tonality, guiding the ear through subdominant preparation to resolution.',
  },
];
