// Date & time helpers — ported from legacy js/ui.js + app.js (TimeSlotManager).
// All timezone-safe: dates are handled as local "YYYY-MM-DD" strings and any
// string→Date conversion is anchored at noon to avoid the UTC off-by-one that
// bit the legacy app in UTC+3 (Nairobi). No DOM, no globals — pure functions.

export type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
export const DAY_KEYS: DayKey[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
export const WEEKDAY_KEYS: DayKey[] = ["mon", "tue", "wed", "thu", "fri"];
export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const;

/** Anchor a "YYYY-MM-DD" at local noon so day arithmetic never crosses a TZ boundary. */
export function noon(dateStr: string): Date {
  return new Date(`${dateStr}T12:00:00`);
}

/** Local "YYYY-MM-DD". Strings already in that form are returned untouched. */
export function formatDate(input: Date | string): string {
  if (typeof input === "string") {
    const m = input.match(/^\d{4}-\d{2}-\d{2}/);
    if (m) return m[0];
    input = new Date(input);
  }
  const y = input.getFullYear();
  const m = String(input.getMonth() + 1).padStart(2, "0");
  const d = String(input.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Human display "DD/MM/YYYY". */
export function formatDateDisplay(input: Date | string): string {
  const d = typeof input === "string" ? noon(formatDate(input)) : input;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function addDays(input: Date | string, n: number): Date {
  const d = typeof input === "string" ? noon(formatDate(input)) : new Date(input);
  d.setDate(d.getDate() + n);
  return d;
}

/** Monday of the week containing `input` (legacy getMonday). */
export function getMonday(input: Date | string): Date {
  const d = typeof input === "string" ? noon(formatDate(input)) : new Date(input);
  const day = d.getDay(); // 0 = Sun
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

/** "YYYY-MM-DD" of the Monday that starts the week (legacy currentWeekStartStr/getWeekStartFromDate). */
export function getWeekStartStr(input: Date | string = new Date()): string {
  return formatDate(getMonday(input));
}

/** The five weekday dates (Mon–Fri) of a week, as "YYYY-MM-DD" strings. */
export function getWeekDates(weekStartStr: string): string[] {
  const base = noon(weekStartStr);
  return [0, 1, 2, 3, 4].map((i) => formatDate(addDays(base, i)));
}

/** 0=Mon … 4=Fri for "today"; Sun→4, Sat→4 (legacy getCurrentDayIndex). */
export function getCurrentDayIndex(now: Date = new Date()): number {
  const day = now.getDay();
  return day === 0 ? 4 : Math.min(day - 1, 4);
}

/** Lowercase 3-letter day key for a date string (matches the day_of_week enum). */
export function dayKeyFromDate(dateStr: string): DayKey {
  return DAY_KEYS[noon(dateStr).getDay()];
}

export function normalizeDay(day: string): DayKey {
  return day.trim().toLowerCase().slice(0, 3) as DayKey;
}

/* ----------------------------------------------------------------- time of day */

/** Minutes since midnight for "08:00AM", "8:00 PM", "08:00", or "08:00:00". */
export function timeToMinutes(time: string): number {
  if (!time) return 0;
  const s = time.trim().toUpperCase();
  const m12 = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
  if (m12) {
    let h = parseInt(m12[1], 10);
    const min = parseInt(m12[2], 10);
    if (m12[3] === "PM" && h !== 12) h += 12;
    if (m12[3] === "AM" && h === 12) h = 0;
    return h * 60 + min;
  }
  const m24 = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (m24) return parseInt(m24[1], 10) * 60 + parseInt(m24[2], 10);
  return 0;
}

/** Parse a legacy range string "08:00AM TO 10:00AM" → minutes, or null. */
export function parseTimeRange(range: string): { start: number; end: number } | null {
  if (!range) return null;
  const parts = range.toUpperCase().split(/\s+TO\s+/);
  if (parts.length !== 2) return null;
  return { start: timeToMinutes(parts[0]), end: timeToMinutes(parts[1]) };
}

export function nowMinutes(date: Date = new Date()): number {
  return date.getHours() * 60 + date.getMinutes();
}

/** Display label for a time range, e.g. "08:00–10:00". */
export function timeRangeLabel(startTime: string, endTime: string): string {
  const fmt = (t: string) => {
    const mins = timeToMinutes(t);
    return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
  };
  return `${fmt(startTime)}–${fmt(endTime)}`;
}
