import { getStartOfDay } from './attendance';

export function getInclusiveLeaveDays(startDate: string | Date, endDate: string | Date) {
  const start = getStartOfDay(startDate);
  const end = getStartOfDay(endDate);
  const diffMs = end.getTime() - start.getTime();

  if (diffMs < 0) return 0;

  return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
}
