/** Canonical notation definitions — seeded into notation_definitions. */
export const NOTATION_DEFINITIONS_SEED = [
  {
    id: 'staff',
    name: 'Staff',
    category: 'reading',
    standardDefinition:
      'The staff is five horizontal lines (and the four spaces between them) where notes and symbols are written. Vertical position represents pitch: higher on the staff means higher pitch. By itself a staff does not name exact pitches until a clef (and usually a key signature) is added.',
  },
  {
    id: 'bar-line',
    name: 'Bar Line',
    category: 'reading',
    standardDefinition:
      'A bar line is a vertical line drawn through the staff that divides the music into measures (bars). It helps organize rhythm and meter so performers can see where beats and phrases are grouped.',
  },
  {
    id: 'double-bar-line',
    name: 'Double Bar Line',
    category: 'reading',
    standardDefinition:
      'A double bar line is two vertical lines that mark a stronger division than a single bar line. A thin line followed by a thicker line often ends a section or piece; two thin lines can mark a major phrase boundary within the music.',
  },
  {
    id: 'treble-clef',
    name: 'Treble Clef',
    category: 'reading',
    standardDefinition:
      'The treble clef (G clef) curls around the second line from the bottom of the staff, fixing that line as G4 (G above middle C). It is used for higher instruments and voices such as violin, flute, and soprano lines.',
  },
  {
    id: 'bass-clef',
    name: 'Bass Clef',
    category: 'reading',
    standardDefinition:
      'The bass clef (F clef) places F3 on the fourth line of the staff (between the two dots). It is used for lower instruments and voices such as cello, bassoon, trombone, and the left hand in much piano music.',
  },
  {
    id: 'alto-clef',
    name: 'Alto Clef',
    category: 'reading',
    standardDefinition:
      'The alto clef (C clef) centers on the middle line of the staff so that line is middle C. It is common in viola music and some choral scores to keep notes comfortably within the staff.',
  },
  {
    id: 'time-4-4',
    name: '4/4 Time Signature',
    category: 'rhythm',
    standardDefinition:
      '4/4 (common time) means four quarter-note beats per measure. The top number counts beats in each bar; the bottom number shows the note value that receives one beat (4 = quarter note). It is the most frequent meter in Western popular and classical music.',
  },
  {
    id: 'time-3-4',
    name: '3/4 Time Signature',
    category: 'rhythm',
    standardDefinition:
      '3/4 time has three quarter-note beats per measure, creating a triple meter often felt as strong–weak–weak. It is characteristic of waltzes and many folk dances.',
  },
  {
    id: 'time-2-4',
    name: '2/4 Time Signature',
    category: 'rhythm',
    standardDefinition:
      '2/4 time has two quarter-note beats per measure. The pulse is usually brisk and march-like (ONE-two), common in polkas, some marches, and quick duple music.',
  },
  {
    id: 'time-6-8',
    name: '6/8 Time Signature',
    category: 'rhythm',
    standardDefinition:
      '6/8 time groups six eighth notes per measure, usually felt as two beats with three eighth notes each (a compound duple meter). The bottom number 8 means the beat unit is an eighth note.',
  },
  {
    id: 'whole-note',
    name: 'Whole Note',
    category: 'rhythm',
    standardDefinition:
      'A whole note is an open notehead without a stem. In 4/4 time it lasts four beats (the entire measure). Its duration depends on the tempo and time signature.',
  },
  {
    id: 'half-note',
    name: 'Half Note',
    category: 'rhythm',
    standardDefinition:
      'A half note has an open notehead and a stem. In 4/4 time it lasts two beats. Two half notes fill one measure of 4/4.',
  },
  {
    id: 'quarter-note',
    name: 'Quarter Note',
    category: 'rhythm',
    standardDefinition:
      'A quarter note has a filled notehead and a stem. In 4/4 time it lasts one beat. It is the basic counting unit in many exercises and metronome settings.',
  },
  {
    id: 'eighth-note',
    name: 'Eighth Note',
    category: 'rhythm',
    standardDefinition:
      'An eighth note lasts half a quarter-note beat in simple meter. It has a filled notehead, a stem, and one flag (or beam). Two eighth notes typically fit in one beat of 4/4.',
  },
  {
    id: 'sixteenth-note',
    name: 'Sixteenth Note',
    category: 'rhythm',
    standardDefinition:
      'A sixteenth note lasts one quarter of a beat in 4/4. It has two flags or is joined by two beams. It is used for faster subdivisions and ornamental passages.',
  },
  {
    id: 'dotted-note',
    name: 'Dotted Note',
    category: 'rhythm',
    standardDefinition:
      'A dot placed to the right of a notehead adds half of that note’s value to its duration. For example, a dotted quarter note in 4/4 lasts one and a half beats.',
  },
  {
    id: 'beamed-eighth',
    name: 'Beamed Eighth Notes',
    category: 'rhythm',
    standardDefinition:
      'Eighth notes in succession are often connected with a horizontal beam instead of separate flags. Beaming shows rhythmic grouping within a beat and makes the music easier to read.',
  },
  {
    id: 'triplet',
    name: 'Triplet',
    category: 'rhythm',
    standardDefinition:
      'A triplet fits three notes in the time normally occupied by two of the same value, indicated by a bracket or number 3. It creates a temporary shift from even to divided pulse.',
  },
  {
    id: 'tie',
    name: 'Tie',
    category: 'rhythm',
    standardDefinition:
      'A tie is a curved line connecting two notes of the same pitch. The pitches are not re-articulated; their durations are added together. Ties are used to sustain sound across bar lines or to write durations that are awkward to notate with a single note value.',
  },
  {
    id: 'slur',
    name: 'Slur',
    category: 'rhythm',
    standardDefinition:
      'A slur is a curved line over or under notes of different pitches indicating they should be played smoothly in one breath or bow stroke (legato). Unlike a tie, it does not add duration; it shapes articulation and phrasing.',
  },
  {
    id: 'whole-rest',
    name: 'Whole Rest',
    category: 'rhythm',
    standardDefinition:
      'A whole rest hangs from the fourth line of the staff and indicates silence for four beats in 4/4. It fills an entire measure when that measure has no sounding notes.',
  },
  {
    id: 'half-rest',
    name: 'Half Rest',
    category: 'rhythm',
    standardDefinition:
      'A half rest sits on the third line of the staff and marks two beats of silence in 4/4. Its block shape distinguishes it from the whole rest.',
  },
  {
    id: 'quarter-rest',
    name: 'Quarter Rest',
    category: 'rhythm',
    standardDefinition:
      'A quarter rest looks like a stylized “Z” with a tail and represents one beat of silence in 4/4. It is the silent equivalent of a quarter note.',
  },
  {
    id: 'eighth-rest',
    name: 'Eighth Rest',
    category: 'rhythm',
    standardDefinition:
      'An eighth rest lasts half a beat in 4/4. Its single flag-like shape matches the rhythmic value of an eighth note.',
  },
  {
    id: 'sixteenth-rest',
    name: 'Sixteenth Rest',
    category: 'rhythm',
    standardDefinition:
      'A sixteenth rest lasts one quarter of a beat in 4/4. It pairs with the sixteenth note for very short silent subdivisions.',
  },
  {
    id: 'sharp',
    name: 'Sharp',
    category: 'pitch',
    standardDefinition:
      'A sharp (♯) raises a pitch by one half step (semitone). It appears as an accidental before a note or in a key signature. On a piano, the next key to the right is the sharpened pitch.',
  },
  {
    id: 'flat',
    name: 'Flat',
    category: 'pitch',
    standardDefinition:
      'A flat (♭) lowers a pitch by one half step. It appears before a note or in a key signature. On a piano, the next key to the left is the flattened pitch.',
  },
  {
    id: 'natural',
    name: 'Natural',
    category: 'pitch',
    standardDefinition:
      'A natural (♮) cancels a previous sharp or flat on that pitch for the rest of the measure (unless changed again). It returns the note to the diatonic pitch named by the key signature.',
  },
  {
    id: 'double-sharp',
    name: 'Double Sharp',
    category: 'pitch',
    standardDefinition:
      'A double sharp (𝄪) raises a pitch by two half steps (one whole step). It is used in advanced harmony and certain key contexts where notation must show an extra raise.',
  },
  {
    id: 'double-flat',
    name: 'Double Flat',
    category: 'pitch',
    standardDefinition:
      'A double flat (𝄫) lowers a pitch by two half steps. It appears in specialized harmonic spelling, often to keep letter names consistent in chromatic passages.',
  },
  {
    id: 'key-signature',
    name: 'Key Signature',
    category: 'pitch',
    standardDefinition:
      'A key signature is a set of sharps or flats placed after the clef at the start of each staff. It tells which pitches are altered throughout the piece unless overridden by accidentals. It defines the tonal center (key) at a glance.',
  },
  {
    id: 'staccato',
    name: 'Staccato',
    category: 'expression',
    standardDefinition:
      'Staccato (a dot above or below the notehead) means the note should be played short and detached. The pitch is sounded briefly with space before the next note.',
  },
  {
    id: 'accent',
    name: 'Accent',
    category: 'expression',
    standardDefinition:
      'An accent mark (>, ∧, or a horizontal wedge) tells the performer to emphasize that note with extra weight or attack compared to surrounding notes.',
  },
  {
    id: 'tenuto',
    name: 'Tenuto',
    category: 'expression',
    standardDefinition:
      'Tenuto (a short line above or below the note) means hold the note for its full value, often with slight emphasis and smooth connection. It sits between detached and heavily accented playing.',
  },
  {
    id: 'fermata',
    name: 'Fermata',
    category: 'expression',
    standardDefinition:
      'A fermata (𝄐) over a note or rest means pause and hold longer than the written duration, at the performer’s or conductor’s discretion. It often appears at cadences or dramatic moments.',
  },
  {
    id: 'crescendo',
    name: 'Crescendo',
    category: 'expression',
    standardDefinition:
      'A crescendo (often shown as ⟨ or “cresc.”) means gradually get louder over the notes under the marking or hairpin.',
  },
  {
    id: 'diminuendo',
    name: 'Diminuendo',
    category: 'expression',
    standardDefinition:
      'A diminuendo or decrescendo (⟩ or “dim.”) means gradually get softer. It is the opposite of a crescendo.',
  },
  {
    id: 'repeat-sign',
    name: 'Repeat Sign',
    category: 'navigation',
    standardDefinition:
      'Repeat signs (heavy bar lines with dots) instruct the performer to go back to an earlier repeat sign or the beginning of the piece. They avoid rewriting repeated sections in full.',
  },
  {
    id: 'octave-8va',
    name: 'Octave Mark (8va)',
    category: 'navigation',
    standardDefinition:
      '8va (ottava) means play the written notes one octave higher (8va alta) or lower (8va bassa) than notated, so extreme pitches fit on the staff. A dashed line shows how long the instruction applies.',
  },
] as const;
