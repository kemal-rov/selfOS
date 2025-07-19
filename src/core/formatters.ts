import { DateTime } from 'luxon';

export function formatSleepEntry(entry: any): string {
  const { sleepStart, sleepEnd, totalSleep } = entry;

  const start = DateTime.fromFormat(sleepStart, 'yyyy-MM-dd HH:mm:ss ZZZ');
  const end = DateTime.fromFormat(sleepEnd, 'yyyy-MM-dd HH:mm:ss ZZZ');

  if (!start.isValid || !end.isValid || typeof totalSleep !== 'number') {
    return '🛌 Sleep: unknown duration';
  }

  const hours = Math.floor(totalSleep);
  const minutes = Math.round((totalSleep - hours) * 60);

  return `${hours}h ${minutes}min (${start.toFormat('HH:mm')} – ${end.toFormat('HH:mm')})`;
}