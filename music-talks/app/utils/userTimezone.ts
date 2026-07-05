import {
  DEFAULT_TIMEZONE,
  getBrowserTimezone,
  resolveDisplayTimezone,
} from "./timezone";

export { DEFAULT_TIMEZONE, getBrowserTimezone, resolveDisplayTimezone };

const STORAGE_KEY = "userTimezone";

/** Dispatched when cached display timezone changes (preferences save, login, logout). */
export const TIMEZONE_UPDATED_EVENT = "musictalks:timezone-updated";

function notifyTimezoneUpdated(timezone: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(TIMEZONE_UPDATED_EVENT, { detail: { timezone } })
  );
}

export function getCachedTimezone(): string {
  if (typeof window === "undefined") return getBrowserTimezone();
  return localStorage.getItem(STORAGE_KEY) || getBrowserTimezone();
}

export function setCachedTimezone(timezone: string) {
  if (typeof window === "undefined") return;
  const resolved =
    resolveDisplayTimezone(timezone) || getBrowserTimezone();
  localStorage.setItem(STORAGE_KEY, resolved);
  notifyTimezoneUpdated(resolved);
}

export function clearCachedTimezone() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
  notifyTimezoneUpdated(getBrowserTimezone());
}

export async function fetchAndCacheUserTimezone(
  token: string,
  backendUrl: string
): Promise<string> {
  try {
    const response = await fetch(`${backendUrl}/api/account/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) return getBrowserTimezone();

    const data = await response.json();
    const timezone = resolveDisplayTimezone(data.preferences?.timezone);
    setCachedTimezone(timezone);
    return timezone;
  } catch {
    return getBrowserTimezone();
  }
}
