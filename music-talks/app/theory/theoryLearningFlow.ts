/** UI prototype — learning style sample cards for “More ways to understand”. */

export type PerspectiveCategoryId =
  | "music-core"
  | "art"
  | "everyday-life"
  | "performance";

export interface PerspectiveCategory {
  id: PerspectiveCategoryId;
  label: string;
  shortLabel: string;
  icon: string;
  description: string;
}

export const PERSPECTIVE_CATEGORIES: PerspectiveCategory[] = [
  {
    id: "music-core",
    label: "Analytical / STEM",
    shortLabel: "STEM",
    icon: "🔬",
    description:
      "Structured logic, patterns, and precise theory",
  },
  {
    id: "art",
    label: "Art",
    shortLabel: "Art",
    icon: "🎨",
    description: "Composition, color, and aesthetic thinking",
  },
  {
    id: "everyday-life",
    label: "Everyday analogies",
    shortLabel: "Daily",
    icon: "🏠",
    description: "Familiar situations and objects",
  },
  {
    id: "performance",
    label: "Performance",
    shortLabel: "Play",
    icon: "🎹",
    description: "How it feels at the instrument",
  },
];

/** Shown in Account — all selectable learning-style categories. */
export const LEARNING_STYLE_CATEGORIES = PERSPECTIVE_CATEGORIES;

export interface PerspectiveVariant {
  id: string;
  categoryId: PerspectiveCategoryId;
  title: string;
  /** Shown as “learned from community” in prototype */
  sourceLabel: string;
  preview: string;
  forumHint?: string;
  comingSoon?: boolean;
}

const STAFF_ART: PerspectiveVariant = {
  id: "staff-art-v1",
  categoryId: "art",
  title: "Five lines like a canvas for pitch",
  sourceLabel: "Sample · Art style",
  preview:
    "Think of the staff as a blank canvas with five horizontal guides. Each note is a mark placed higher or lower — like building a drawing on ruled paper. Clefs tell the eye which line means which pitch, the way a color key labels a palette.",
};

const STAFF_EVERYDAY: PerspectiveVariant = {
  id: "staff-daily-v1",
  categoryId: "everyday-life",
  title: "A grid for organizing height",
  sourceLabel: "Sample · Everyday analogies",
  preview:
    "Imagine shelves at different heights: higher shelf = higher sound. The staff is simply the diagram that shows which shelf each note sits on.",
};

const STAFF_STEM: PerspectiveVariant = {
  id: "staff-stem-v1",
  categoryId: "music-core",
  title: "A coordinate system for pitch",
  sourceLabel: "Sample · STEM style",
  preview:
    "The staff is a vertical axis: position maps to frequency. Ledger lines extend the axis; clefs set the origin. Reading notation is tracing points on a graph.",
};

function shuffleArray<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Mock perspectives per notation id (prototype content). */
export function getMockPerspectives(
  notationId: string,
  notationName: string
): PerspectiveVariant[] {
  const genericStem: PerspectiveVariant = {
    id: `stem-${notationId}`,
    categoryId: "music-core",
    title: `Break down ${notationName} step by step`,
    sourceLabel: "Sample · STEM style",
    preview: `Treat ${notationName} as a pattern you can name, count, and compare — what are its parts, how do they relate, and what rules stay consistent?`,
  };

  const genericArt: PerspectiveVariant = {
    id: `art-${notationId}`,
    categoryId: "art",
    title: `See ${notationName} through an artistic lens`,
    sourceLabel: "Sample · Art style",
    preview: `Think of ${notationName} like shapes and colors on a canvas — how elements balance, contrast, and blend to create a whole.`,
  };

  const genericEveryday: PerspectiveVariant = {
    id: `daily-${notationId}`,
    categoryId: "everyday-life",
    title: `Everyday analogy for ${notationName}`,
    sourceLabel: "Sample · Everyday analogies",
    preview: `Relate ${notationName} to something familiar — everyday objects, routines, or situations that make the idea easy to picture.`,
  };

  const genericPerformance: PerspectiveVariant = {
    id: `perf-${notationId}`,
    categoryId: "performance",
    title: `Feel ${notationName} at the instrument`,
    sourceLabel: "Sample · Performance style",
    preview: `At the keyboard or with your voice, notice how ${notationName} feels under your hands — touch, weight, and listening guide the meaning.`,
  };

  if (notationId === "staff") {
    return [STAFF_STEM, STAFF_ART, STAFF_EVERYDAY, genericPerformance];
  }

  if (notationId === "sharp" || notationId === "key-signature") {
    return [
      {
        id: `chord-color-${notationId}`,
        categoryId: "art",
        title: "Like mixing paint — one step brighter",
        sourceLabel: "Sample · Art style",
        preview:
          "A sharp raises pitch one step—the way adding white brightens a hue on the palette. Small shifts in color, like small shifts in pitch, change the whole mood.",
      },
      genericEveryday,
      genericPerformance,
    ];
  }

  return [genericStem, genericArt, genericEveryday, genericPerformance];
}

/** Random order of style sample cards for “More ways to understand”. */
export function getShuffledMockPerspectives(
  notationId: string,
  notationName: string
): PerspectiveVariant[] {
  return shuffleArray(getMockPerspectives(notationId, notationName));
}

export const THEORY_PREFS_STORAGE_KEY = "theoryLearningPreferences";

const LEGACY_CATEGORY_IDS: Record<string, PerspectiveCategoryId> = {
  "visual-arts": "art",
};

function normalizeCategoryId(id: string): PerspectiveCategoryId | null {
  const mapped = LEGACY_CATEGORY_IDS[id] ?? id;
  return PERSPECTIVE_CATEGORIES.some((c) => c.id === mapped)
    ? (mapped as PerspectiveCategoryId)
    : null;
}

export function getStoredPerspectivePrefs(): PerspectiveCategoryId[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(THEORY_PREFS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PerspectiveCategoryId[];
    if (!Array.isArray(parsed)) return [];
    // Single-select: keep at most one valid id
    const first = parsed
      .map((id) => (typeof id === "string" ? normalizeCategoryId(id) : null))
      .find((id): id is PerspectiveCategoryId => id !== null);
    const result = first ? [first] : [];
    // Persist legacy id migration (e.g. visual-arts → art)
    if (
      parsed.length > 0 &&
      JSON.stringify(parsed) !== JSON.stringify(result)
    ) {
      localStorage.setItem(THEORY_PREFS_STORAGE_KEY, JSON.stringify(result));
    }
    return result;
  } catch {
    return [];
  }
}

/** Current learning style, or null for None (default). */
export function getStoredLearningStyle(): PerspectiveCategoryId | null {
  return getStoredPerspectivePrefs()[0] ?? null;
}

export function setStoredPerspectivePrefs(ids: PerspectiveCategoryId[]) {
  if (typeof window === "undefined") return;
  const first = ids
    .map((id) => normalizeCategoryId(id))
    .find((id): id is PerspectiveCategoryId => id !== null);
  localStorage.setItem(
    THEORY_PREFS_STORAGE_KEY,
    JSON.stringify(first ? [first] : [])
  );
}

export function setStoredLearningStyle(id: PerspectiveCategoryId | null) {
  setStoredPerspectivePrefs(id ? [id] : []);
}

/** Single-select: pick one style, or tap again to clear back to None. */
export function selectStoredLearningStyle(
  id: PerspectiveCategoryId
): PerspectiveCategoryId | null {
  const current = getStoredLearningStyle();
  const next = current === id ? null : id;
  setStoredLearningStyle(next);
  return next;
}

/** @deprecated use selectStoredLearningStyle */
export function toggleStoredPerspectivePref(
  id: PerspectiveCategoryId
): PerspectiveCategoryId[] {
  selectStoredLearningStyle(id);
  return getStoredPerspectivePrefs();
}

const backendUrl =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

/** Persist learning style to the server when logged in. */
export async function syncLearningStyleToServer(
  categoryIds: PerspectiveCategoryId[]
): Promise<boolean> {
  if (typeof window === "undefined") return false;

  const token = localStorage.getItem("token");
  if (!token) return false;

  const response = await fetch(`${backendUrl}/api/account/learning-style`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ categoryIds }),
  });

  if (!response.ok) {
    throw new Error("Failed to save learning style");
  }

  return true;
}

/** Load server learning style into localStorage (logged-in users). */
export async function loadLearningStyleFromServer(): Promise<
  PerspectiveCategoryId[]
> {
  if (typeof window === "undefined") return [];

  const token = localStorage.getItem("token");
  if (!token) return getStoredPerspectivePrefs();

  const response = await fetch(`${backendUrl}/api/account/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    return getStoredPerspectivePrefs();
  }

  const data = await response.json();
  const ids = (data.learningStyleCategoryIds ?? []) as PerspectiveCategoryId[];
  if (Array.isArray(ids)) {
    setStoredPerspectivePrefs(ids);
    return ids;
  }

  return getStoredPerspectivePrefs();
}
