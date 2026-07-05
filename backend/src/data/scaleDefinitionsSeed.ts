/** Standard definitions for scale catalog items (pitch-scales-keys domain). */

export interface TheoryDefinitionSeed {
  id: string;
  name: string;
  category: string;
  standardDefinition: string;
}

const MAJOR_PATTERN =
  "whole, whole, half, whole, whole, whole, half (W–W–H–W–W–W–H)";

const NATURAL_MINOR_PATTERN =
  "whole, half, whole, whole, half, whole, whole (W–H–W–W–H–W–W)";

const HARMONIC_MINOR_PATTERN =
  "whole, half, whole, whole, half, augmented second, half";

const MELODIC_MINOR_ASC_PATTERN =
  "whole, half, whole, whole, whole, whole, half (ascending form)";

function scaleDef(
  id: string,
  name: string,
  category: string,
  pattern: string,
  notes: string[],
  extra = ""
): TheoryDefinitionSeed {
  return {
    id,
    name,
    category,
    standardDefinition: `The ${name} scale uses the ${pattern} step pattern. Its seven pitch classes are ${notes.join(", ")}.${extra ? ` ${extra}` : ""}`,
  };
}

export const SCALE_DEFINITIONS_SEED: TheoryDefinitionSeed[] = [
  scaleDef("c-major", "C Major", "major", MAJOR_PATTERN, [
    "C", "D", "E", "F", "G", "A", "B",
  ]),
  scaleDef("g-major", "G Major", "major", MAJOR_PATTERN, [
    "G", "A", "B", "C", "D", "E", "F#",
  ]),
  scaleDef("d-major", "D Major", "major", MAJOR_PATTERN, [
    "D", "E", "F#", "G", "A", "B", "C#",
  ]),
  scaleDef("f-major", "F Major", "major", MAJOR_PATTERN, [
    "F", "G", "A", "Bb", "C", "D", "E",
  ]),
  scaleDef("a-major", "A Major", "major", MAJOR_PATTERN, [
    "A", "B", "C#", "D", "E", "F#", "G#",
  ]),
  scaleDef("e-major", "E Major", "major", MAJOR_PATTERN, [
    "E", "F#", "G#", "A", "B", "C#", "D#",
  ]),
  scaleDef("b-major", "B Major", "major", MAJOR_PATTERN, [
    "B", "C#", "D#", "E", "F#", "G#", "A#",
  ]),

  scaleDef("a-natural-minor", "A Natural Minor", "natural-minor", NATURAL_MINOR_PATTERN, [
    "A", "B", "C", "D", "E", "F", "G",
  ], "It is the relative minor of C major."),
  scaleDef("e-natural-minor", "E Natural Minor", "natural-minor", NATURAL_MINOR_PATTERN, [
    "E", "F#", "G", "A", "B", "C", "D",
  ]),
  scaleDef("b-natural-minor", "B Natural Minor", "natural-minor", NATURAL_MINOR_PATTERN, [
    "B", "C#", "D", "E", "F#", "G", "A",
  ]),
  scaleDef("d-natural-minor", "D Natural Minor", "natural-minor", NATURAL_MINOR_PATTERN, [
    "D", "E", "F", "G", "A", "Bb", "C",
  ]),
  scaleDef("g-natural-minor", "G Natural Minor", "natural-minor", NATURAL_MINOR_PATTERN, [
    "G", "A", "Bb", "C", "D", "Eb", "F",
  ]),
  scaleDef("c-natural-minor", "C Natural Minor", "natural-minor", NATURAL_MINOR_PATTERN, [
    "C", "D", "Eb", "F", "G", "Ab", "Bb",
  ]),
  scaleDef("f-natural-minor", "F Natural Minor", "natural-minor", NATURAL_MINOR_PATTERN, [
    "F", "G", "Ab", "Bb", "C", "Db", "Eb",
  ]),

  scaleDef("a-harmonic-minor", "A Harmonic Minor", "harmonic-minor", HARMONIC_MINOR_PATTERN, [
    "A", "B", "C", "D", "E", "F", "G#",
  ], "The raised seventh creates a leading tone a semitone below the tonic."),
  scaleDef("e-harmonic-minor", "E Harmonic Minor", "harmonic-minor", HARMONIC_MINOR_PATTERN, [
    "E", "F#", "G", "A", "B", "C", "D#",
  ]),
  scaleDef("d-harmonic-minor", "D Harmonic Minor", "harmonic-minor", HARMONIC_MINOR_PATTERN, [
    "D", "E", "F", "G", "A", "Bb", "C#",
  ]),
  scaleDef("b-harmonic-minor", "B Harmonic Minor", "harmonic-minor", HARMONIC_MINOR_PATTERN, [
    "B", "C#", "D", "E", "F#", "G", "A#",
  ]),
  scaleDef("g-harmonic-minor", "G Harmonic Minor", "harmonic-minor", HARMONIC_MINOR_PATTERN, [
    "G", "A", "Bb", "C", "D", "Eb", "F#",
  ]),

  scaleDef("a-melodic-minor", "A Melodic Minor", "melodic-minor", MELODIC_MINOR_ASC_PATTERN, [
    "A", "B", "C", "D", "E", "F#", "G#",
  ], "Descending melodic minor often matches natural minor; ascending raises 6 and 7."),
  scaleDef("e-melodic-minor", "E Melodic Minor", "melodic-minor", MELODIC_MINOR_ASC_PATTERN, [
    "E", "F#", "G", "A", "B", "C#", "D#",
  ]),
  scaleDef("d-melodic-minor", "D Melodic Minor", "melodic-minor", MELODIC_MINOR_ASC_PATTERN, [
    "D", "E", "F", "G", "A", "B", "C#",
  ]),
  scaleDef("b-melodic-minor", "B Melodic Minor", "melodic-minor", MELODIC_MINOR_ASC_PATTERN, [
    "B", "C#", "D", "E", "F#", "G#", "A#",
  ]),
  scaleDef("g-melodic-minor", "G Melodic Minor", "melodic-minor", MELODIC_MINOR_ASC_PATTERN, [
    "G", "A", "Bb", "C", "D", "E", "F#",
  ]),
];
