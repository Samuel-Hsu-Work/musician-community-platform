import { NOTATION_DEFINITIONS_SEED } from './notationDefinitionsSeed';
import { SCALE_DEFINITIONS_SEED } from './scaleDefinitionsSeed';
import { INTERVAL_DEFINITIONS_SEED } from './intervalDefinitionsSeed';
import { CHORD_DEFINITIONS_SEED } from './chordDefinitionsSeed';
import { FORM_DEFINITIONS_SEED } from './formDefinitionsSeed';
import { THEORY_TOPIC_CATALOG } from './theoryTopicCatalog';

export interface TheoryDefinitionSeedEntry {
  id: string;
  name: string;
  category: string;
  standardDefinition: string;
}

/** Reused standardDefinition text keyed by topic id (from legacy domain seeds). */
const REUSED_DEFINITIONS: Record<string, string> = Object.fromEntries(
  [
    ...NOTATION_DEFINITIONS_SEED,
    ...SCALE_DEFINITIONS_SEED,
    ...INTERVAL_DEFINITIONS_SEED.filter(
      (entry) => entry.id !== 'semitone' && entry.id !== 'whole-step'
    ),
    ...CHORD_DEFINITIONS_SEED,
    ...FORM_DEFINITIONS_SEED,
  ].map((entry) => [entry.id, entry.standardDefinition])
);

/** New and updated definitions for the restructured 6-domain catalog. */
const DEFINITION_OVERRIDES: Record<string, string> = {
  // Notation — staff & structure
  'grand-staff':
    'The grand staff joins a treble staff and a bass staff with a brace, used for piano and other instruments that span a wide range. Middle C sits on a ledger line between the two staves. Reading grand staff means tracking both hands or voices at once.',
  'ledger-lines':
    'Ledger lines are short horizontal lines added above or below the staff to notate pitches that fall outside the five lines. Each ledger line continues the staff’s line-and-space pattern. Middle C often appears on one ledger line between treble and bass staves.',
  'tenor-clef':
    'The tenor clef is a C clef placing middle C on the fourth line from the bottom of the staff. It appears in cello upper register, bassoon, and some vocal scores to keep notes within a readable range without excessive ledger lines.',
  'note-heads-stems':
    'Note heads are oval shapes whose vertical position shows pitch; stems are vertical lines attached to note heads showing rhythmic voice and direction. Open heads usually mean longer values; filled heads mean shorter ones. Stem direction follows ensemble rules so multiple parts remain readable.',
  'final-bar-line':
    'A final bar line is a thin vertical line followed by a thick line at the end of a piece or movement. It marks the definitive close of the music, stronger than an internal double bar line.',
  'system-brace':
    'A brace connects two or more staves that belong to one player or instrument, such as piano or harp. A system is the full set of staves read together on one horizontal line across the page.',

  // Notation — articulation
  staccatissimo:
    'Staccatissimo means extremely short and detached — shorter than ordinary staccato. It may be marked with a wedge or “staccatiss.” above or below the note. The sound is crisp and clipped, with very little sustain.',
  marcato:
    'Marcato (often marked ^ or “marc.”) tells the performer to play with a strong, accented attack and firm tone. It is heavier than a light accent and emphasizes structural or dramatic notes.',
  legato:
    'Legato means smooth and connected, with minimal gap between successive notes. On string and wind instruments it implies one bow or breath across the group; at the piano it means overlapping touch so the line sings without breaks.',
  'phrase-mark':
    'A phrase mark is a long curved line over or under a group of notes showing a musical sentence or breathing unit. Unlike a slur on single parts, it guides phrasing and rubato even when inner articulation varies.',
  slur:
    'A slur is a curved line over or under notes of different pitches indicating they should be played smoothly in one breath or bow stroke (legato). Unlike a tie, it does not add duration; it shapes articulation and phrasing.',

  // Notation — dynamics
  'piano-dynamic':
    'Piano (p) means soft. The letter p is written below or above the staff to set a sustained quiet level. It contrasts with forte (f) and combines with mezzo (m) for intermediate shades such as mp and mf.',
  'forte-dynamic':
    'Forte (f) means loud. The letter f marks a sustained strong dynamic level. Performers project more tone and weight while still observing phrasing; ff and fff indicate progressively greater force.',
  'mezzo-dynamics':
    'Mezzo piano (mp) means moderately soft and mezzo forte (mf) means moderately loud. They sit between piano and forte and are among the most common dynamic markings in ensemble music, balancing presence with control.',
  sforzando:
    'Sforzando (sf or sfz) means a sudden strong accent on a single note or chord. It differs from a sustained forte level: the emphasis is immediate and often decays quickly into the surrounding dynamic.',

  // Notation — navigation
  'dal-capo':
    'D.C. (da capo) means “from the head” — return to the beginning of the piece. D.C. al Fine tells the performer to replay from the start and stop at the marking Fine rather than reaching the original end.',
  'dal-segno':
    'D.S. (dal segno) means “from the sign” — jump to the segno symbol (𝄋) and continue. D.S. al Coda often sends the player to the sign, then later to the coda section for the closing passage.',
  coda:
    'A coda is a concluding section separate from the main form, reached by a jump marking such as “To Coda” or D.S. al Coda. It provides a distinct ending after repeats or da capo structures.',
  segno:
    'The segno (𝄋) marks a reference point in the score. Navigation instructions such as D.S. al Fine send the performer back to this sign instead of to the beginning.',
  'volta-brackets':
    'Volta brackets (first and second endings) show alternate measures after a repeat. The first time through, play the measures under “1.”; on the repeat, skip the first ending and play “2.” instead.',
  'octave-8va':
    '8va (ottava alta) means play one octave higher than written; 8vb or 8va bassa means one octave lower. A dashed line shows how long the instruction applies, keeping extreme pitches readable on the staff.',

  // Rhythm — durations & rests
  'thirty-second-note':
    'A thirty-second note lasts one eighth of a beat in 4/4. It has a filled notehead, a stem, and three flags or beams. It appears in fast passages and ornate figuration.',
  'double-dotted-note':
    'A double-dotted note adds three quarters of its original value: the first dot adds half, the second dot adds half of the first dot’s value. A double-dotted quarter in 4/4 lasts one and three-quarter beats.',

  // Rhythm — meters
  'common-time':
    'Common time is often written as a large “C” and is equivalent to 4/4: four quarter-note beats per measure. It signals the familiar quadruple meter used in much Western repertoire.',
  'cut-time':
    'Cut time (alla breve) is marked ¢ or 2/2 and is felt as two half-note beats per bar. The music often moves in a broad two-beat pulse, common in marches and fast orchestral movements.',
  'time-9-8':
    '9/8 time contains nine eighth notes per measure, usually grouped as three beats of three eighths each (compound triple). It creates a rolling, lilting pulse distinct from simple 3/4.',
  'time-12-8':
    '12/8 time has twelve eighth notes per measure, typically felt as four beats subdivided into three eighths each (compound quadruple). Blues and many ballads use this meter for a swung or flowing feel.',
  'simple-meter':
    'Simple meter divides each beat into two equal parts — for example 2/4, 3/4, and 4/4. The bottom number of the time signature is usually 4 (quarter-note beat) or 2 (half-note beat).',
  'compound-meter':
    'Compound meter divides each beat into three equal parts — for example 6/8, 9/8, and 12/8. Each beat is a dotted quarter in 6/8-style signatures, giving a lilt different from simple triple meters.',

  // Rhythm — grouping & concepts
  duplet:
    'A duplet fits two notes in the time normally occupied by three of the same value, common in compound meter. It is the inverse of a triplet and is marked with a bracket or the number 2.',
  beat:
    'A beat is the basic pulse listeners tap or feel — the steady “heartbeat” of the music. Tempo tells how fast beats pass; meter tells how beats group into measures.',
  measure:
    'A measure (bar) is the span between two bar lines containing a fixed number of beats set by the time signature. It organizes rhythm so performers can read and count in consistent units.',
  syncopation:
    'Syncopation places accents on weak beats or offbeat positions, displacing the expected strong-beat emphasis. It creates rhythmic tension and drive in jazz, funk, and much popular music.',
  'pickup-note':
    'A pickup (anacrusis) is a short phrase before the first full measure, leading into downbeat one. The final bar may be shortened so the total duration still aligns with the meter.',
  hemiola:
    'A hemiola temporarily suggests a different meter — for example two groups of three in 3/4 feeling like three groups of two. It is a classic rhythmic illusion in Baroque dance music and beyond.',

  // Pitch — fundamentals
  pitch:
    'Pitch is how high or low a sound is, determined by vibration frequency. In staff notation, higher vertical placement means higher pitch. Pitch names use letters A through G with accidentals for alterations.',
  octave:
    'An octave is the interval between one pitch and the next higher pitch with the same letter name. The upper pitch vibrates at twice the frequency and sounds like the same note in a higher register.',
  semitone:
    'A semitone (half step) is the smallest common interval in Western equal temperament — the distance from one piano key to the very next (white or black). Two semitones equal one whole step. Semitones measure interval size and scale construction.',
  'whole-step':
    'A whole step (whole tone) spans two semitones — for example, C to D, or E to F#. Major and minor scales are built from sequences of whole and half steps.',
  'chromatic-scale':
    'The chromatic scale moves in consecutive semitones through all twelve pitch classes within an octave. It contains every note on the keyboard, white and black, and underlies advanced harmony and modulation.',
  'concert-pitch-a440':
    'Concert pitch A440 means the note A above middle C vibrates at 440 Hz, the modern tuning standard. Orchestras and electronic tuners reference A4 so instruments agree on absolute pitch.',

  // Pitch — accidentals & keys
  'enharmonic-equivalence':
    'Enharmonic equivalence means two spellings — such as C# and Db — sound the same in equal temperament but differ in notation and harmonic function. Spelling follows key context and voice-leading rules.',
  'major-key':
    'A major key centers on a tonic with a major scale pattern (W–W–H–W–W–W–H). Its key signature places sharps or flats so diatonic melodies and harmonies align with that bright, stable tonal center.',
  'minor-key':
    'A minor key centers on a tonic with a minor scale flavor — natural, harmonic, or melodic minor. Minor keys often share key signatures with their relative major but emphasize a different tonic and mood.',
  'relative-keys':
    'Relative major and minor share the same key signature but different tonics — for example, C major and A minor. The minor tonic lies a minor third below its relative major.',
  'parallel-keys':
    'Parallel major and minor share the same tonic but different key signatures — for example, C major and C minor. Parallel keys highlight bright versus dark color on the same home note.',
  'circle-of-fifths':
    'The circle of fifths arranges keys by ascending fifths (or descending fourths), showing how many sharps or flats each key uses. Adjacent keys differ by one accidental, making modulation paths easy to visualize.',
  tonality:
    'Tonality is music organized around a central tonic and hierarchical chord relationships. Functional harmony, cadences, and scale degrees derive their meaning from attraction toward or away from that tonic.',

  // Pitch — scale patterns
  'major-scale-pattern':
    'The major scale follows whole, whole, half, whole, whole, whole, half (W–W–H–W–W–W–H). This fixed pattern of steps produces the bright, stable sound associated with major keys from any starting note.',
  'natural-minor-pattern':
    'The natural minor scale follows whole, half, whole, whole, half, whole, whole (W–H–W–W–H–W–W). It is the pure minor form drawn from the key signature without raised sixth or seventh degrees.',
  'harmonic-minor-pattern':
    'The harmonic minor scale raises the seventh degree while keeping other natural-minor steps, creating a leading tone a semitone below the tonic. The augmented second between lowered sixth and raised seventh gives it a distinctive color.',
  'melodic-minor-pattern':
    'Melodic minor traditionally raises the sixth and seventh degrees ascending for smoother melody and leading-tone pull, then often reverts to natural minor descending. Jazz practice sometimes uses the ascending form in both directions.',
  'modes-overview':
    'Modes are seven-note scales built on each degree of the major scale — Ionian (major), Dorian, Phrygian, Lydian, Mixolydian, Aeolian (natural minor), and Locrian. Each mode has a unique whole- and half-step pattern and characteristic mood.',

  // Intervals — usage
  'harmonic-interval':
    'A harmonic interval is two pitches sounding at the same time. Its quality shapes chord color and stability — thirds and fifths build triads; seconds and sevenths create tension.',
  'melodic-interval':
    'A melodic interval is the distance between two pitches heard in succession. Melodic intervals shape contour, motive, and the expressive rise and fall of a line.',
  'consonance-dissonance':
    'Consonance describes intervals or chords that sound stable or restful; dissonance describes those that feel tense and seek resolution. The balance between them drives harmonic motion and listener expectation.',

  // Chords — extensions & harmony
  'suspended-chords':
    'A suspended chord replaces the third with a second (sus2) or fourth (sus4) above the root, postponing the triad’s major or minor color. The suspended tone often resolves down (sus4) or up (sus2) to form a complete triad.',
  'added-sixth':
    'An added sixth chord places a major sixth above the root without a seventh — for example, C6 (C–E–G–A). It adds warmth and color while keeping a consonant, open triad-based sound common in jazz and pop.',
  'ninth-chords':
    'A ninth chord stacks a major or minor ninth above the seventh — for example, Cmaj9 or C9. The ninth extends the harmonic palette beyond the seventh, adding richness in jazz, R&B, and film scoring.',
  'eleventh-chords':
    'An eleventh chord adds the perfect eleventh (often with the third omitted on guitar voicings) above a seventh chord foundation. It produces a suspended, modal color especially in jazz and fusion harmony.',
  'thirteenth-chords':
    'A thirteenth chord extends through the flat or natural thirteenth above a seventh chord, usually with some upper extensions omitted in performance voicings. It is among the richest tertian sonorities in jazz harmony.',
  'voice-leading':
    'Voice leading is the smooth movement of individual parts between chords, minimizing large leaps and handling tendency tones (such as leading tones and chord sevenths). Good voice leading keeps harmony clear and lines singable.',
  'tonic-function':
    'Tonic function (I or i) is the home chord of a key — stable and resolving. Music often begins and ends on tonic harmony, and other functions move toward or away from it.',
  'dominant-function':
    'Dominant function (V or V7) creates tension that pulls toward the tonic. The leading tone and chord seventh in V7 strongly resolve to I, making dominant harmony the engine of cadential motion.',
  'subdominant-function':
    'Subdominant function (IV or ii) moves away from tonic toward dominant preparation. It often introduces contrast before dominant harmony and appears prominently in plagal and many folk progressions.',
  'half-cadence':
    'A half cadence ends a phrase on dominant harmony (V) rather than tonic, sounding like a musical comma or question. Antecedent phrases frequently close with half cadences before a consequent answers with V–I.',
  'deceptive-cadence':
    'A deceptive cadence moves from V to vi (or VI) instead of the expected I, surprising the ear while staying in key. It delays full closure and is a staple of expressive harmonic coloring.',
  'i-iv-v-progression':
    'The I–IV–V progression uses tonic, subdominant, and dominant triads — for example, C–F–G in C major. It underpins countless folk, rock, and country songs because it clearly defines the key with simple functional motion.',
  'secondary-dominant':
    'A secondary dominant is a dominant-function chord that targets a scale degree other than the tonic — for example, V/V (D7 in C major) resolving to V. It temporarily tonicizes another chord and intensifies harmonic direction.',

  // Form — phrases & small forms
  'cadence-in-form':
    'Cadences in form mark phrase endings and structural articulation. Half cadences pose questions; authentic cadences answer; deceptive cadences delay closure. Their placement defines antecedent–consequent pairs and larger sections.',
  'minuet-trio':
    'Minuet and trio form wraps a contrasting trio (often lighter or more lyrical) between two minuet sections — Minuet–Trio–Minuet. The da capo return of the minuet creates a compact A–B–A dance movement common in symphonies and chamber works.',
  'strophic-form':
    'Strophic form repeats the same music for successive stanzas of text — verse after verse with identical melody and harmony. Hymns, folk songs, and many pop ballads use strophic design for direct textual delivery.',

  // Form — large forms & analysis
  fugue:
    'A fugue is a contrapuntal form built on a subject stated in imitation across voices, with episodes and entries developing the material. Bach’s Well-Tempered Clavier is the canonical reference for fugue technique.',
  'through-composed':
    'Through-composed form presents new music throughout without large-scale repetition of sections. Art songs and dramatic works often use it so music follows the text or narrative without returning to a fixed refrain.',
  motif:
    'A motif is a short, distinctive musical idea — a few notes, rhythm, or contour — that unifies a work through repetition and development. Beethoven’s fifth symphony opening is a famous motivic cell.',
  'section-labels':
    'Section labels (A, B, C, …) name main blocks of a piece for analysis. Letters show repetition and contrast: returning A sections in rondo or ternary forms, new B material for contrast.',
  'harmonic-rhythm':
    'Harmonic rhythm is the rate at which chords change — how often a new harmony arrives. Slow harmonic rhythm feels spacious and stable; fast changes create urgency and forward motion.',
};

function definitionFor(id: string): string {
  const override = DEFINITION_OVERRIDES[id];
  if (override) {
    return override;
  }

  const reused = REUSED_DEFINITIONS[id];
  if (reused) {
    return reused;
  }

  throw new Error(`Missing standardDefinition for theory topic: ${id}`);
}

export const THEORY_DEFINITIONS_SEED: TheoryDefinitionSeedEntry[] =
  THEORY_TOPIC_CATALOG.map((topic) => ({
    id: topic.id,
    name: topic.name,
    category: topic.category,
    standardDefinition: definitionFor(topic.id),
  }));
