import type { TheoryDefinitionSeed } from './scaleDefinitionsSeed';

export const INTERVAL_DEFINITIONS_SEED: TheoryDefinitionSeed[] = [
  {
    id: 'semitone',
    name: 'Semitone (Half Step)',
    category: 'building-blocks',
    standardDefinition:
      'A semitone (half step) is the smallest common interval in Western equal temperament — the distance from one piano key to the very next (white or black). Two semitones equal one whole step. Semitones measure interval size and scale construction.',
  },
  {
    id: 'whole-step',
    name: 'Whole Step',
    category: 'building-blocks',
    standardDefinition:
      'A whole step (whole tone) spans two semitones — for example, C to D, or E to F#. Major and minor scales are built from sequences of whole and half steps.',
  },
  {
    id: 'minor-second',
    name: 'Minor Second',
    category: 'within-octave',
    standardDefinition:
      'A minor second (m2) is one semitone. It is the smallest named interval — e.g. C to Db, or E to F. It sounds very tight and often creates strong dissonance in melody and harmony.',
  },
  {
    id: 'major-second',
    name: 'Major Second',
    category: 'within-octave',
    standardDefinition:
      'A major second (M2) spans two semitones — e.g. C to D, or F to G. It is the step size of major and minor scales between most adjacent scale degrees.',
  },
  {
    id: 'minor-third',
    name: 'Minor Third',
    category: 'within-octave',
    standardDefinition:
      'A minor third (m3) spans three semitones — e.g. C to Eb, or A to C. It is the bottom interval of a minor triad and contributes a darker, softer color than a major third.',
  },
  {
    id: 'major-third',
    name: 'Major Third',
    category: 'within-octave',
    standardDefinition:
      'A major third (M3) spans four semitones — e.g. C to E, or G to B. It defines the major quality in triads and scales and sounds relatively bright and stable.',
  },
  {
    id: 'perfect-fourth',
    name: 'Perfect Fourth',
    category: 'within-octave',
    standardDefinition:
      'A perfect fourth (P4) spans five semitones — e.g. C to F, or G to C. It belongs to the perfect interval group (with unison, fifth, and octave) and is common in melodies and open sonorities.',
  },
  {
    id: 'tritone',
    name: 'Tritone (Augmented Fourth)',
    category: 'within-octave',
    standardDefinition:
      'A tritone spans six semitones — e.g. C to F# (augmented fourth) or C to Gb (diminished fifth). It divides the octave in half and historically was called diabolus in musica because of its unstable, tense sound.',
  },
  {
    id: 'perfect-fifth',
    name: 'Perfect Fifth',
    category: 'within-octave',
    standardDefinition:
      'A perfect fifth (P5) spans seven semitones — e.g. C to G, or D to A. It is highly consonant and forms the outer frame of triads in root position. Tuning systems often build from the fifth relationship.',
  },
  {
    id: 'minor-sixth',
    name: 'Minor Sixth',
    category: 'within-octave',
    standardDefinition:
      'A minor sixth (m6) spans eight semitones — e.g. C to Ab, or E to C. It appears in minor-key melodies and certain chord extensions.',
  },
  {
    id: 'major-sixth',
    name: 'Major Sixth',
    category: 'within-octave',
    standardDefinition:
      'A major sixth (M6) spans nine semitones — e.g. C to A, or F to D. It is the inversion of a minor third and occurs in major scales and many harmonic contexts.',
  },
  {
    id: 'minor-seventh',
    name: 'Minor Seventh',
    category: 'within-octave',
    standardDefinition:
      'A minor seventh (m7) spans ten semitones — e.g. C to Bb, or G to F. It is the interval above the root in a dominant seventh chord and strongly pulls toward resolution.',
  },
  {
    id: 'major-seventh',
    name: 'Major Seventh',
    category: 'within-octave',
    standardDefinition:
      'A major seventh (M7) spans eleven semitones — e.g. C to B, or F to E. It is one semitone below the octave and creates a bright, restless color in maj7 chords.',
  },
  {
    id: 'perfect-octave',
    name: 'Perfect Octave',
    category: 'within-octave',
    standardDefinition:
      'A perfect octave (P8) spans twelve semitones. The upper note has twice the frequency of the lower and is heard as the same letter name — the strongest interval of equivalence in Western music.',
  },
  {
    id: 'compound-intervals',
    name: 'Compound Intervals',
    category: 'concepts',
    standardDefinition:
      'A compound interval spans more than an octave — e.g. a major tenth is a major third plus an octave. Naming follows simple intervals: subtract 7 from the number (a 10th becomes a 3rd) while keeping the quality.',
  },
  {
    id: 'interval-inversion',
    name: 'Interval Inversion',
    category: 'concepts',
    standardDefinition:
      'Inverting an interval flips its direction around the lower note. Perfect intervals stay perfect; major becomes minor and vice versa; augmented becomes diminished. The two sizes always add to nine (e.g. M3 inverts to m6).',
  },
  {
    id: 'interval-naming',
    name: 'Interval Number & Quality',
    category: 'concepts',
    standardDefinition:
      'Interval names combine a number (distance in letter names, inclusive) and a quality: perfect, major, minor, augmented, or diminished. Count lines and spaces on the staff from the lower note to the upper note for the number; semitone count determines quality.',
  },
];
