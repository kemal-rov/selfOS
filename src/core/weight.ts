import { getISOWeek } from 'date-fns';

/**
 * Groups weights into weekly averages by ISO week.
 */
export function getWeeklyWeightAverages(entries: { date: string; weight: number }[]): number[] {
  const weekly = new Map<string, number[]>();

  for (const { date, weight } of entries) {
    const weekKey = `${date.slice(0, 4)}-W${getISOWeek(new Date(date))}`;
    if (!weekly.has(weekKey)) weekly.set(weekKey, []);
    weekly.get(weekKey)?.push(weight);
  }

  // Convert to sorted list of weekly averages (most recent last)
  return [...weekly.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([_, weights]) =>
      +(weights.reduce((a, b) => a + b, 0) / weights.length).toFixed(1)
    )
    .reverse()
    .slice(0, 4); // Most recent 4 weeks
}