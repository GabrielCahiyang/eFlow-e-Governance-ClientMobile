const RELATIVE_MONTH_PATTERN = /\bmonth\s*(\d+)(?:\s*[-\u2013\u2014]\s*(\d+))?\b/i;
const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})(?:$|T)/;

function validLocalDate(year: number, monthIndex: number, day: number): Date | null {
  const value = new Date(year, monthIndex, day);
  if (
    value.getFullYear() !== year
    || value.getMonth() !== monthIndex
    || value.getDate() !== day
  ) return null;
  return value;
}

function addCalendarMonthsClamped(anchor: Date, months: number): Date {
  const targetMonthStart = new Date(
    anchor.getFullYear(),
    anchor.getMonth() + months,
    1,
  );
  const lastDay = new Date(
    targetMonthStart.getFullYear(),
    targetMonthStart.getMonth() + 1,
    0,
  ).getDate();
  return new Date(
    targetMonthStart.getFullYear(),
    targetMonthStart.getMonth(),
    Math.min(anchor.getDate(), lastDay),
  );
}

/** Returns the final month in a proposal-relative label such as Month 1-2. */
export function relativeScheduleEndMonth(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = value.match(RELATIVE_MONTH_PATTERN);
  if (!match) return null;
  const first = Number(match[1]);
  const last = Number(match[2] || match[1]);
  if (!Number.isInteger(first) || !Number.isInteger(last) || first < 1 || last < first) {
    return null;
  }
  return last;
}

/**
 * Parses only real calendar dates. Proposal labels like "Month 1" are never
 * handed to the JavaScript Date string parser (which interprets them as 2001).
 */
export function parseCalendarDate(value: string | null | undefined): number | null {
  const raw = value?.trim();
  if (!raw || relativeScheduleEndMonth(raw) !== null) return null;
  const iso = raw.match(ISO_DATE_PATTERN);
  if (iso) {
    const date = validLocalDate(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    return date?.getTime() ?? null;
  }
  // Preserve compatibility with existing full ISO timestamps, while refusing
  // ambiguous short labels and browser-specific natural-language parsing.
  if (!/^\d{4}-\d{2}-\d{2}T/.test(raw)) return null;
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Month 1 is one calendar month after the plan is committed. A range uses its
 * final month, so Month 1-2 is due two calendar months after the anchor.
 */
export function resolveScheduleTimestamp(
  schedule: string | null | undefined,
  anchorTimestamp: number,
): number | null {
  const calendarDate = parseCalendarDate(schedule);
  if (calendarDate !== null) return calendarDate;
  const endMonth = relativeScheduleEndMonth(schedule);
  if (endMonth === null || !Number.isFinite(anchorTimestamp)) return null;
  return addCalendarMonthsClamped(new Date(anchorTimestamp), endMonth).getTime();
}

export function toDateInputValue(timestamp: number): string {
  const value = new Date(timestamp);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function resolveScheduleDateInput(
  schedule: string | null | undefined,
  anchorTimestamp: number,
): string | null {
  const timestamp = resolveScheduleTimestamp(schedule, anchorTimestamp);
  return timestamp === null ? null : toDateInputValue(timestamp);
}
