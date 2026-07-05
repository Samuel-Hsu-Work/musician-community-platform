import type { TheoryTopic, TheoryTopicCategory } from "./theoryTopicTypes";

export const RHYTHM_METER_CATEGORIES: TheoryTopicCategory[] = [
  { id: "durations", label: "Note Durations", shortLabel: "Notes" },
  { id: "rests", label: "Rests", shortLabel: "Rests" },
  { id: "meters", label: "Time Signatures", shortLabel: "Meter" },
  { id: "grouping", label: "Grouping & Beaming", shortLabel: "Group" },
  { id: "concepts", label: "Rhythm Concepts", shortLabel: "Concepts" },
];

const c = "symbol" as const;
const k = "concept" as const;

export const RHYTHM_METER_TOPICS: TheoryTopic[] = [
  // Durations
  { id: "whole-note", name: "Whole Note", category: "durations", kind: c },
  { id: "half-note", name: "Half Note", category: "durations", kind: c },
  { id: "quarter-note", name: "Quarter Note", category: "durations", kind: c },
  { id: "eighth-note", name: "Eighth Note", category: "durations", kind: c },
  { id: "sixteenth-note", name: "Sixteenth Note", category: "durations", kind: c },
  { id: "thirty-second-note", name: "Thirty-Second Note", category: "durations", kind: k },
  { id: "dotted-note", name: "Dotted Note", category: "durations", kind: c },
  { id: "double-dotted-note", name: "Double-Dotted Note", category: "durations", kind: k },

  // Rests
  { id: "whole-rest", name: "Whole Rest", category: "rests", kind: c },
  { id: "half-rest", name: "Half Rest", category: "rests", kind: c },
  { id: "quarter-rest", name: "Quarter Rest", category: "rests", kind: c },
  { id: "eighth-rest", name: "Eighth Rest", category: "rests", kind: c },
  { id: "sixteenth-rest", name: "Sixteenth Rest", category: "rests", kind: c },

  // Meters
  { id: "common-time", name: "Common Time (C)", category: "meters", kind: k },
  { id: "cut-time", name: "Cut Time (¢)", category: "meters", kind: k },
  { id: "time-4-4", name: "4/4 Time Signature", category: "meters", kind: c },
  { id: "time-3-4", name: "3/4 Time Signature", category: "meters", kind: c },
  { id: "time-2-4", name: "2/4 Time Signature", category: "meters", kind: c },
  { id: "time-6-8", name: "6/8 Time Signature", category: "meters", kind: c },
  { id: "time-9-8", name: "9/8 Time Signature", category: "meters", kind: k },
  { id: "time-12-8", name: "12/8 Time Signature", category: "meters", kind: k },
  { id: "simple-meter", name: "Simple Meter", category: "meters", kind: k },
  { id: "compound-meter", name: "Compound Meter", category: "meters", kind: k },

  // Grouping
  { id: "tie", name: "Tie", category: "grouping", kind: c },
  { id: "beamed-eighth", name: "Beamed Notes", category: "grouping", kind: c },
  { id: "triplet", name: "Triplet", category: "grouping", kind: c },
  { id: "duplet", name: "Duplet", category: "grouping", kind: k },

  // Concepts
  { id: "beat", name: "Beat", category: "concepts", kind: k },
  { id: "measure", name: "Measure (Bar)", category: "concepts", kind: k },
  { id: "syncopation", name: "Syncopation", category: "concepts", kind: k },
  { id: "pickup-note", name: "Pickup (Anacrusis)", category: "concepts", kind: k },
  { id: "hemiola", name: "Hemiola", category: "concepts", kind: k },
];
