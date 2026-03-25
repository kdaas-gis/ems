/**
 * Returns a YYYY-MM-DD string representing the current date in IST (UTC+5:30).
 * Works correctly regardless of the server/client timezone setting.
 */
export function getLocalDateString(date: Date = new Date()): string {
  const istOffset = 5.5 * 60 * 60 * 1000; // IST = UTC+5:30
  const istTime = new Date(date.getTime() + istOffset);
  const year = istTime.getUTCFullYear();
  const month = String(istTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(istTime.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
