import { DateTime } from "luxon";

export interface AvailabilityWindow {
  startMinute: number;
  endMinute: number;
}

export interface AvailabilityException {
  type: "unavailable" | "custom_hours";
  startMinute?: number;
  endMinute?: number;
}

export interface BookedInterval {
  startTime: number; // UTC epoch ms
  endTime: number;
}

export interface Slot {
  startTime: number; // UTC epoch ms
  endTime: number;
}

export interface ComputeSlotsParams {
  hostTimezone: string; // IANA, e.g. "Europe/Bucharest" — the tz weekly rules are expressed in
  rangeFromDate: string; // "YYYY-MM-DD", interpreted in bookerTimezone
  rangeToDate: string; // "YYYY-MM-DD", interpreted in bookerTimezone, inclusive
  bookerTimezone: string;
  durationMinutes: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  minNoticeMinutes: number;
  maxAdvanceDays: number;
  nowMs: number;
  rulesByWeekday: Map<number, AvailabilityWindow[]>; // 0 = Sunday ... 6 = Saturday
  exceptionsByDate: Map<string, AvailabilityException>; // keyed by "YYYY-MM-DD" in hostTimezone
  bookedIntervals: BookedInterval[]; // existing confirmed bookings for this host, UTC ms
}

/**
 * Pure, timezone-aware slot computation. Weekly rules/exceptions are defined
 * in the host's own IANA timezone (their working hours are fixed to their
 * local clock across DST changes), so we walk host-local calendar days —
 * never fixed UTC offsets — and only convert to UTC once a concrete
 * start/end instant is known. This is what keeps slot generation correct
 * across DST transitions in either the host's or the booker's timezone.
 */
export function computeAvailableSlots(params: ComputeSlotsParams): Slot[] {
  const {
    hostTimezone,
    rangeFromDate,
    rangeToDate,
    bookerTimezone,
    durationMinutes,
    bufferBeforeMinutes,
    bufferAfterMinutes,
    minNoticeMinutes,
    maxAdvanceDays,
    nowMs,
    rulesByWeekday,
    exceptionsByDate,
    bookedIntervals,
  } = params;

  const rangeStartUtc = DateTime.fromISO(rangeFromDate, { zone: bookerTimezone })
    .startOf("day")
    .toUTC();
  const rangeEndUtc = DateTime.fromISO(rangeToDate, { zone: bookerTimezone })
    .endOf("day")
    .toUTC();

  if (!rangeStartUtc.isValid || !rangeEndUtc.isValid) {
    throw new Error("Invalid date range or timezone");
  }

  const earliestAllowedMs = nowMs + minNoticeMinutes * 60_000;
  const latestAllowedMs = nowMs + maxAdvanceDays * 24 * 60 * 60_000;

  // Walk host-local days with a one-day buffer on each side to cover cases
  // where the booker's requested window and the host's local day don't
  // line up (e.g. booker in UTC-8 requesting a day that starts while it's
  // still "yesterday" for a host in UTC+2).
  let cursor = rangeStartUtc.setZone(hostTimezone).startOf("day").minus({ days: 1 });
  const walkEnd = rangeEndUtc.setZone(hostTimezone).startOf("day").plus({ days: 1 });

  const slots: Slot[] = [];

  while (cursor <= walkEnd) {
    const isoDate = cursor.toISODate();
    if (isoDate === null) {
      cursor = cursor.plus({ days: 1 });
      continue;
    }

    const exception = exceptionsByDate.get(isoDate);
    let windows: AvailabilityWindow[];

    if (exception?.type === "unavailable") {
      windows = [];
    } else if (
      exception?.type === "custom_hours" &&
      exception.startMinute !== undefined &&
      exception.endMinute !== undefined
    ) {
      windows = [{ startMinute: exception.startMinute, endMinute: exception.endMinute }];
    } else {
      const jsWeekday = cursor.weekday % 7; // Luxon: 1=Mon..7=Sun -> 0=Sun..6=Sat
      windows = rulesByWeekday.get(jsWeekday) ?? [];
    }

    for (const window of windows) {
      const windowStartUtc = cursor.plus({ minutes: window.startMinute }).toUTC();
      const windowEndUtc = cursor.plus({ minutes: window.endMinute }).toUTC();

      let slotStart = windowStartUtc;
      while (slotStart.plus({ minutes: durationMinutes }) <= windowEndUtc) {
        const slotEnd = slotStart.plus({ minutes: durationMinutes });
        slots.push({ startTime: slotStart.toMillis(), endTime: slotEnd.toMillis() });
        slotStart = slotEnd;
      }
    }

    cursor = cursor.plus({ days: 1 });
  }

  return slots
    .filter((slot) => slot.startTime >= rangeStartUtc.toMillis())
    .filter((slot) => slot.endTime <= rangeEndUtc.toMillis())
    .filter((slot) => slot.startTime >= earliestAllowedMs)
    .filter((slot) => slot.startTime <= latestAllowedMs)
    .filter((slot) => {
      const bufferedStart = slot.startTime - bufferBeforeMinutes * 60_000;
      const bufferedEnd = slot.endTime + bufferAfterMinutes * 60_000;
      return !bookedIntervals.some(
        (booked) => bufferedStart < booked.endTime && bufferedEnd > booked.startTime
      );
    })
    .sort((a, b) => a.startTime - b.startTime);
}
