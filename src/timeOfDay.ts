import type { TimeOfDay } from './domain/types';

export function getDefaultTimeOfDay(date: Date = new Date()): TimeOfDay {
  const h = date.getHours();
  if (h >= 5 && h < 12) return 'morning';
  if (h >= 12 && h < 18) return 'midday';
  return 'evening';
}
