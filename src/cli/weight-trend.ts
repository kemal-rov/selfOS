import { getISOWeek } from 'date-fns';
import { getWeightHistory } from '../core/queries';
import { getWeightReflection } from '../core/openai';

(async () => {
  const entries = await getWeightHistory();

  if (entries.length === 0) {
    console.log('No weight data available.');
    process.exit(0);
  }

  const weekly = new Map<string, number[]>();

  for (const { date, weight } of entries) {
    const weekKey = `${date.slice(0, 4)}-W${getISOWeek(new Date(date))}`;
    if (!weekly.has(weekKey)) weekly.set(weekKey, []);
    weekly.get(weekKey)?.push(weight);
  }

  console.log('\n📊 Weekly averages:\n');
  [...weekly.entries()].forEach(([week, weights]) => {
    const avg = (weights.reduce((a, b) => a + b, 0) / weights.length).toFixed(2);
    console.log(`${week}: ${avg} kg`);
  });

  const reflection = await getWeightReflection(entries);
  console.log('\n🧠 GPT Reflection:\n' + reflection);
})();