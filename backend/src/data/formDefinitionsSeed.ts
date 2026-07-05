import type { TheoryDefinitionSeed } from './scaleDefinitionsSeed';

export const FORM_DEFINITIONS_SEED: TheoryDefinitionSeed[] = [
  {
    id: 'phrase',
    name: 'Phrase',
    category: 'phrases',
    standardDefinition:
      'A phrase is a coherent musical thought — like a sentence in language — often ending with a cadence or pause. Phrases have a beginning, middle, and sense of closure, and combine to form periods and larger sections.',
  },
  {
    id: 'antecedent-consequent',
    name: 'Antecedent & Consequent',
    category: 'phrases',
    standardDefinition:
      'An antecedent phrase asks a question (often ending on a half cadence), and a consequent phrase answers it (often ending on an authentic cadence). Together they form a period when the consequent balances the antecedent in length.',
  },
  {
    id: 'period',
    name: 'Period (Musical Form)',
    category: 'phrases',
    standardDefinition:
      'A period is typically an antecedent–consequent pair of phrases, commonly 8 + 8 measures. Parallel periods repeat similar material; contrasting periods change melody or harmony in the second phrase.',
  },
  {
    id: 'sentence-form',
    name: 'Sentence (Form)',
    category: 'phrases',
    standardDefinition:
      'A sentence (in form theory) presents a basic idea, repeats or varies it, and then continues to a cadence — often in a 2 + 2 + 4 measure layout. It is a common building block in classical themes.',
  },
  {
    id: 'binary-form',
    name: 'Binary Form (AB)',
    category: 'small-forms',
    standardDefinition:
      'Binary form has two main sections (A and B). Each may repeat. Section B may move to a new key and return, or provide contrast while balancing A in length. Common in Baroque dances.',
  },
  {
    id: 'ternary-form',
    name: 'Ternary Form (ABA)',
    category: 'small-forms',
    standardDefinition:
      'Ternary form returns to opening material after a contrasting middle: A–B–A. The return may be exact or varied. Minuets, scherzos, and many slow movements use simple or compound ternary designs.',
  },
  {
    id: 'rondo-form',
    name: 'Rondo Form',
    category: 'large-forms',
    standardDefinition:
      'Rondo alternates a recurring refrain (A) with contrasting episodes (B, C, …) — e.g. ABACA or ABACABA. The refrain anchors the form; episodes provide variety. Often used in finales and concerto movements.',
  },
  {
    id: 'sonata-allegro',
    name: 'Sonata-Allegro Form',
    category: 'large-forms',
    standardDefinition:
      'Sonata-allegro (sonata form) typically includes exposition (themes in tonic and dominant or relative major), development (fragmentation and modulation), and recapitulation (themes return in tonic). It organizes large first movements in classical repertoire.',
  },
  {
    id: 'theme-and-variations',
    name: 'Theme and Variations',
    category: 'large-forms',
    standardDefinition:
      'Theme and variations presents a melody or harmonic plan followed by successive variations that alter melody, rhythm, harmony, texture, or character while maintaining recognizability. Each variation is usually a self-contained section.',
  },
];
