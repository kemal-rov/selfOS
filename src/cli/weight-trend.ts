import { getWeightHistory } from '../core/queries';
import { getWeeklyWeightAverages } from '../core/weight';
import { getWeightReflection } from '../core/openai';

(async () => {
  const entries = await getWeightHistory();

  if (entries.length === 0) {
    console.log('No weight data available.');
    process.exit(0);
  }

  const weeklyAverages = getWeeklyWeightAverages(entries);

  console.log('\n📊 Weekly averages:\n');
  weeklyAverages.forEach((avg, i) => {
    console.log(`Week ${i + 1}: ${avg} kg`);
  });

  const reflection = await getWeightReflection(entries);
  console.log('\n🧠 GPT Reflection:\n' + reflection);
})();