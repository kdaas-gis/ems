/**
 * Returns a Date at UTC midnight for the given input.
 * For string inputs (YYYY-MM-DD), parses as UTC to match PostgreSQL DATE storage.
 * For Date inputs, extracts the IST date and converts to UTC midnight.
 */
export function getStartOfDay(dateInput?: Date | string) {
  if (typeof dateInput === 'string') {
    // "2026-03-25" → 2026-03-25T00:00:00Z (UTC midnight)
    return new Date(`${dateInput}T00:00:00Z`);
  }

  // For Date objects (e.g. new Date()), get the IST date then produce UTC midnight
  const d = dateInput ? new Date(dateInput) : new Date();
  const istOffset = 5.5 * 60 * 60 * 1000; // IST = UTC+5:30
  const istTime = new Date(d.getTime() + istOffset);
  const yyyy = istTime.getUTCFullYear();
  const mm = String(istTime.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(istTime.getUTCDate()).padStart(2, '0');
  return new Date(`${yyyy}-${mm}-${dd}T00:00:00Z`);
}

export function getEndOfDay(dateInput?: Date | string) {
  const start = getStartOfDay(dateInput);
  return new Date(start.getTime() + 24 * 60 * 60 * 1000);
}

export function getDurationHours(checkIn?: string | Date | null, checkOut?: string | Date | null) {
  if (!checkIn || !checkOut) return null;

  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const diffMs = end.getTime() - start.getTime();

  if (Number.isNaN(diffMs) || diffMs < 0) return null;

  return diffMs / (1000 * 60 * 60);
}
