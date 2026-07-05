import { DEFAULT_TIMEZONE } from "./timezone";

type DateTimeFormatOptions = Intl.DateTimeFormatOptions;

const SECOND_MS = 1000;
const MINUTE_MS = 60 * SECOND_MS;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

function parseUtcDate(iso: string): Date {
  return new Date(iso);
}

function getDateKey(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function resolveTimezone(timezone?: string): string {
  return timezone?.trim() || DEFAULT_TIMEZONE;
}

/**
 * Absolute local time for tooltips and account pages.
 * Storage is always UTC ISO; only display converts.
 */
export function formatDateTime(
  iso: string | null | undefined,
  timezone: string = DEFAULT_TIMEZONE,
  options: DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }
): string {
  if (!iso) return "Not set";

  const tz = resolveTimezone(timezone);
  try {
    return new Intl.DateTimeFormat("en-US", {
      ...options,
      timeZone: tz,
    }).format(parseUtcDate(iso));
  } catch {
    return new Intl.DateTimeFormat("en-US", options).format(parseUtcDate(iso));
  }
}

/** Industry-style relative time (UTC instant → viewer timezone). */
export function formatRelativeTime(
  iso: string,
  timezone: string = DEFAULT_TIMEZONE
): string {
  const tz = resolveTimezone(timezone);
  const date = parseUtcDate(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  if (diffMs < 45 * SECOND_MS) {
    return "just now";
  }

  if (diffMs < MINUTE_MS) {
    return "less than a minute ago";
  }

  if (diffMs < HOUR_MS) {
    const minutes = Math.floor(diffMs / MINUTE_MS);
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }

  if (diffMs < DAY_MS) {
    const hours = Math.floor(diffMs / HOUR_MS);
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  try {
    const todayKey = getDateKey(now, tz);
    const dateKey = getDateKey(date, tz);
    const yesterday = new Date(now.getTime() - DAY_MS);
    const yesterdayKey = getDateKey(yesterday, tz);

    if (dateKey === yesterdayKey) {
      return "yesterday";
    }

    const diffDays = Math.floor(diffMs / DAY_MS);
    if (diffDays < 7) {
      return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
    }
  } catch {
    // fall through to absolute
  }

  return formatDateTime(iso, tz, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

/** Relative label with full absolute time for title/hover. */
export function formatTimestampDisplay(
  iso: string,
  timezone: string = DEFAULT_TIMEZONE
): { label: string; title: string } {
  const tz = resolveTimezone(timezone);
  return {
    label: formatRelativeTime(iso, tz),
    title: formatDateTime(iso, tz),
  };
}

export function formatTopicDateTime(
  iso: string,
  timezone: string = DEFAULT_TIMEZONE
): string {
  return formatRelativeTime(iso, timezone);
}

export function formatCommentDateTime(
  iso: string,
  timezone: string = DEFAULT_TIMEZONE
): string {
  return formatRelativeTime(iso, timezone);
}

/** Archive sidebar date label (YYYY-MM-DD stored as calendar day in UTC). */
export function formatArchiveDate(
  dateStr: string,
  timezone: string = DEFAULT_TIMEZONE
): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  if (!year || !month || !day) return dateStr;

  const utcNoon = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const tz = resolveTimezone(timezone);

  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(utcNoon);
  } catch {
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(utcNoon);
  }
}

export function formatTimezoneLabel(timezone: string): string {
  return resolveTimezone(timezone);
}
