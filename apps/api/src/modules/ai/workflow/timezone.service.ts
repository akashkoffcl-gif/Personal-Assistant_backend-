/**
 * Robust, dependency-free IANA timezone converter using standard ECMAScript Intl API.
 * Converts local wall-clock time in any valid IANA timezone (e.g. Asia/Kolkata, America/New_York)
 * to exact UTC Date instant, handling DST offsets, month boundaries, and leap years.
 */
export class TimezoneService {
  /**
   * Returns the current date (YYYY-MM-DD) in the specified IANA timezone.
   */
  static getLocalDateString(timeZone = 'UTC', date = new Date()): string {
    try {
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      return formatter.format(date);
    } catch {
      return date.toISOString().split('T')[0];
    }
  }

  /**
   * Adds specified number of days to a YYYY-MM-DD date string.
   */
  static addDays(dateStr: string, days: number): string {
    const [year, month, day] = dateStr.split('-').map(Number);
    const d = new Date(Date.UTC(year, month - 1, day + days));
    return d.toISOString().split('T')[0];
  }

  /**
   * Converts a local date and time in a given timezone to an authoritative UTC ISO string.
   * e.g. "2026-11-07", 16, 0 in "Asia/Kolkata" -> "2026-11-07T10:30:00.000Z"
   */
  static localTimeToUTC(dateStr: string, hour = 16, minute = 0, timeZone = 'UTC'): string {
    const [year, month, day] = dateStr.split('-').map(Number);
    if (!year || !month || !day) {
      throw new Error(`Invalid date format "${dateStr}". Expected YYYY-MM-DD.`);
    }

    try {
      // 1. Initial UTC guess
      const targetLocalEpoch = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
      const tempDate = new Date(targetLocalEpoch);

      // 2. Measure timezone offset via Intl formatToParts
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: false,
      }).formatToParts(tempDate);

      const p: Record<string, string> = {};
      parts.forEach(({ type, value }) => (p[type] = value));

      const hourNum = parseInt(p.hour, 10) === 24 ? 0 : parseInt(p.hour, 10);
      const actualLocalEpoch = Date.UTC(
        parseInt(p.year, 10),
        parseInt(p.month, 10) - 1,
        parseInt(p.day, 10),
        hourNum,
        parseInt(p.minute, 10),
        parseInt(p.second, 10),
      );

      const offsetMs = actualLocalEpoch - tempDate.getTime();
      const utcInstant = new Date(targetLocalEpoch - offsetMs);
      return utcInstant.toISOString();
    } catch {
      // Fallback to UTC if timezone is unrecognized
      const d = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
      return d.toISOString();
    }
  }

  /**
   * Formats a UTC ISO string into a human-readable local time description for the UI
   */
  static formatInTimezone(utcIso: string, timeZone = 'UTC'): string {
    try {
      const d = new Date(utcIso);
      return new Intl.DateTimeFormat('en-US', {
        timeZone,
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(d);
    } catch {
      return utcIso;
    }
  }
}

