"use client";

import {
  CalendarReleaseItem,
  MOCK_CALENDAR_RELEASES,
  ReleaseCategory,
} from "../mocks/release-calendar.mock";

export const CALENDAR_STORAGE_KEY = "mock_release_calendar";
export const CALENDAR_UPDATED_EVENT = "manga-collectibles-calendar-updated";

export function getCalendarReleases(): CalendarReleaseItem[] {
  if (typeof window === "undefined") {
    return [...MOCK_CALENDAR_RELEASES];
  }
  try {
    const raw = window.localStorage.getItem(CALENDAR_STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(
        CALENDAR_STORAGE_KEY,
        JSON.stringify(MOCK_CALENDAR_RELEASES),
      );
      return [...MOCK_CALENDAR_RELEASES];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0
      ? parsed
      : [...MOCK_CALENDAR_RELEASES];
  } catch {
    return [...MOCK_CALENDAR_RELEASES];
  }
}

function notifyCalendarChanged(): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new CustomEvent(CALENDAR_UPDATED_EVENT));
  } catch {
    // Ignore
  }
}

export function addCalendarRelease(
  item: Omit<CalendarReleaseItem, "id">,
): CalendarReleaseItem {
  const current = getCalendarReleases();
  const newItem: CalendarReleaseItem = {
    ...item,
    id: `cal-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
  };
  const updated = [newItem, ...current];
  try {
    window.localStorage.setItem(CALENDAR_STORAGE_KEY, JSON.stringify(updated));
    notifyCalendarChanged();
  } catch {
    // Ignore
  }
  return newItem;
}

export function updateCalendarRelease(
  id: string,
  updates: Partial<CalendarReleaseItem>,
): CalendarReleaseItem | null {
  const current = getCalendarReleases();
  const index = current.findIndex((item) => item.id === id);
  if (index === -1) return null;

  const updatedItem = { ...current[index], ...updates };
  current[index] = updatedItem;
  try {
    window.localStorage.setItem(CALENDAR_STORAGE_KEY, JSON.stringify(current));
    notifyCalendarChanged();
  } catch {
    // Ignore
  }
  return updatedItem;
}

export function deleteCalendarRelease(id: string): boolean {
  const current = getCalendarReleases();
  const filtered = current.filter((item) => item.id !== id);
  if (filtered.length === current.length) return false;

  try {
    window.localStorage.setItem(CALENDAR_STORAGE_KEY, JSON.stringify(filtered));
    notifyCalendarChanged();
    return true;
  } catch {
    return false;
  }
}

export function resetCalendarReleases(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      CALENDAR_STORAGE_KEY,
      JSON.stringify(MOCK_CALENDAR_RELEASES),
    );
    notifyCalendarChanged();
  } catch {
    // Ignore
  }
}

export function subscribeCalendarReleases(
  listener: (items: CalendarReleaseItem[]) => void,
): () => void {
  if (typeof window === "undefined") return () => {};

  const handleUpdate = () => {
    listener(getCalendarReleases());
  };

  window.addEventListener(CALENDAR_UPDATED_EVENT, handleUpdate);
  window.addEventListener("storage", handleUpdate);

  return () => {
    window.removeEventListener(CALENDAR_UPDATED_EVENT, handleUpdate);
    window.removeEventListener("storage", handleUpdate);
  };
}
