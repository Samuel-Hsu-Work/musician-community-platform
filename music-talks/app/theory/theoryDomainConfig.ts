import type { TheoryTopic, TheoryTopicCategory } from "./theoryTopicTypes";
import type { TheoryDomainId } from "./theoryDomains";
import {
  NOTATION_READING_CATEGORIES,
  NOTATION_READING_TOPICS,
} from "./notationReadingData";
import { RHYTHM_METER_CATEGORIES, RHYTHM_METER_TOPICS } from "./rhythmMeterData";
import {
  PITCH_SCALES_KEYS_CATEGORIES,
  PITCH_SCALES_KEYS_TOPICS,
} from "./pitchScalesKeysData";
import { INTERVAL_CATEGORIES, INTERVAL_TOPICS } from "./intervalData";
import { CHORD_CATEGORIES, CHORD_TOPICS } from "./chordData";
import { FORM_CATEGORIES, FORM_TOPICS } from "./formData";

export interface TheoryDomainConfig {
  categories: TheoryTopicCategory[];
  topics: TheoryTopic[];
}

export const THEORY_DOMAIN_CONFIG: Record<TheoryDomainId, TheoryDomainConfig> = {
  "notation-reading": {
    categories: NOTATION_READING_CATEGORIES,
    topics: NOTATION_READING_TOPICS,
  },
  "rhythm-meter": {
    categories: RHYTHM_METER_CATEGORIES,
    topics: RHYTHM_METER_TOPICS,
  },
  "pitch-scales-keys": {
    categories: PITCH_SCALES_KEYS_CATEGORIES,
    topics: PITCH_SCALES_KEYS_TOPICS,
  },
  intervals: {
    categories: INTERVAL_CATEGORIES,
    topics: INTERVAL_TOPICS,
  },
  "chords-harmony": {
    categories: CHORD_CATEGORIES,
    topics: CHORD_TOPICS,
  },
  "form-analysis": {
    categories: FORM_CATEGORIES,
    topics: FORM_TOPICS,
  },
};

export function getDomainConfig(domainId: TheoryDomainId): TheoryDomainConfig {
  return THEORY_DOMAIN_CONFIG[domainId];
}

/** Flat catalog export for tooling / docs */
export function getAllTheoryTopics(): TheoryTopic[] {
  return Object.values(THEORY_DOMAIN_CONFIG).flatMap((config) => config.topics);
}
