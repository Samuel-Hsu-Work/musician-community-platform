export const DEFAULT_TIMEZONE = 'UTC';

/** Validate IANA timezone; returns normalized id or default. */
export function resolveTimezone(
  value: string | undefined | null,
  fallback: string = DEFAULT_TIMEZONE
): string {
  if (!value || typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return fallback;
  }

  try {
    Intl.DateTimeFormat(undefined, { timeZone: trimmed });
    return trimmed;
  } catch {
    return fallback;
  }
}

/** Calendar date YYYY-MM-DD for an instant in the given IANA timezone. */
export function getCalendarDateInTimezone(
  date: Date = new Date(),
  timezone: string = DEFAULT_TIMEZONE
): string {
  const tz = resolveTimezone(timezone);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}
