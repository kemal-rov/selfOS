import { getLast7Reflections } from '../core/reflections';
import { getLast7DailyMacros, getWeightHistory } from '../core/queries';
import { getWeeklyWeightAverages } from '../core/weight';
import { getWeeklyReflectionSummary } from '../core/openai';

(async () => {
  // Fetch all required data in parallel
  const [reflections, dailyMacros, weightHistory] = await Promise.all([
    getLast7Reflections(),
    getLast7DailyMacros(),
    getWeightHistory()
  ]);

  if (reflections.length === 0) {
    console.log('❌ No reflections found for the last 7 days.');
    return;
  }

  const weeklyAverages = getWeeklyWeightAverages(weightHistory);
  const summary = await getWeeklyReflectionSummary({
    reflections,
    dailyKcal: dailyMacros,
    weeklyWeightAverages: weeklyAverages
  });

  console.log('📈 Weekly Summary:\n');
  console.log(summary);
})();