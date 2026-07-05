export const DEFAULT_TIMEZONE = "UTC";

/** Browser/device IANA timezone (e.g. Asia/Taipei). */
export function getBrowserTimezone(): string {
  if (typeof window === "undefined") {
    return DEFAULT_TIMEZONE;
  }

  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TIMEZONE;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

export function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

export function resolveDisplayTimezone(
  preferenceTimezone?: string | null
): string {
  if (preferenceTimezone && isValidTimezone(preferenceTimezone)) {
    return preferenceTimezone;
  }
  return getBrowserTimezone();
}

/** Common IANA zones for account settings (not exhaustive). */
export const TIMEZONE_OPTIONS = [
  { value: "UTC", label: "UTC" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles (Pacific)" },
  { value: "America/New_York", label: "America/New_York (Eastern)" },
  { value: "America/Chicago", label: "America/Chicago (Central)" },
  { value: "Europe/London", label: "Europe/London" },
  { value: "Europe/Paris", label: "Europe/Paris" },
  { value: "Asia/Taipei", label: "Asia/Taipei" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo" },
  { value: "Asia/Shanghai", label: "Asia/Shanghai" },
  { value: "Asia/Singapore", label: "Asia/Singapore" },
  { value: "Australia/Sydney", label: "Australia/Sydney" },
] as const;
