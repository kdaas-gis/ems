export function getStartOfDay(dateInput?: Date | string) {
  const baseDate = dateInput
    ? typeof dateInput === 'string'
      ? new Date(`${dateInput}T00:00:00`)
      : new Date(dateInput)
    : new Date();

  baseDate.setHours(0, 0, 0, 0);
  return baseDate;
}

export function getEndOfDay(dateInput?: Date | string) {
  const nextDay = new Date(getStartOfDay(dateInput));
  nextDay.setDate(nextDay.getDate() + 1);
  return nextDay;
}

export function getDurationHours(checkIn?: string | Date | null, checkOut?: string | Date | null) {
  if (!checkIn || !checkOut) return null;

  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const diffMs = end.getTime() - start.getTime();

  if (Number.isNaN(diffMs) || diffMs < 0) return null;

  return diffMs / (1000 * 60 * 60);
}
