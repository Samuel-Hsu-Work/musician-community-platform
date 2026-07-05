"use client";

import { useEffect, useState } from "react";
import {
  getBrowserTimezone,
  getCachedTimezone,
  fetchAndCacheUserTimezone,
  resolveDisplayTimezone,
  TIMEZONE_UPDATED_EVENT,
} from "../utils/userTimezone";

const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

/**
 * Display timezone for timestamps:
 * - Logged-in: UserPreferences.timezone (falls back to device)
 * - Guests: device/browser IANA timezone
 */
export function useUserTimezone() {
  const [timezone, setTimezone] = useState(getBrowserTimezone);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTimezone = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        setTimezone(getBrowserTimezone());
        setLoading(false);
        return;
      }

      setTimezone(resolveDisplayTimezone(getCachedTimezone()));

      const resolved = await fetchAndCacheUserTimezone(token, backendUrl);
      setTimezone(resolved);
      setLoading(false);
    };

    loadTimezone();
  }, []);

  useEffect(() => {
    const onTimezoneUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ timezone?: string }>).detail;
      if (detail?.timezone) {
        setTimezone(detail.timezone);
        return;
      }
      setTimezone(getBrowserTimezone());
    };

    window.addEventListener(TIMEZONE_UPDATED_EVENT, onTimezoneUpdated);
    return () => {
      window.removeEventListener(TIMEZONE_UPDATED_EVENT, onTimezoneUpdated);
    };
  }, []);

  return { timezone, loading };
}
