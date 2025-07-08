import { db } from '../core/firestore';
import { parseArgs } from '../utils/args';
import { getDailySuggestion } from '../core/openai';
import { getWeightHistory } from '../core/queries';
import { getWeeklyWeightAverages } from '../core/weight';
import { Timestamp } from '@google-cloud/firestore';
import { Meal } from '../core/types';

const { date, flags } = parseArgs(process.argv.slice(2));
const ref = db.collection('days').doc(date);

(async () => {
  const snapshot = await ref.get();

  if (!snapshot.exists) {
    console.log(`No entry found for ${date}`);
    process.exit(0);
  }

  const data = snapshot.data();
  const meals = data?.meals || [];

  if (meals.length === 0) {
    console.log(`No meals found for ${date}.`);
    process.exit(0);
  }

  const totals = meals.reduce(
    (acc, meal) => {
      acc.kcal += meal.kcal;
      acc.protein += meal.protein;
      acc.carbs += meal.carbs;
      acc.fat += meal.fat;
      acc.fiber += meal.fiber || 0;
      return acc;
    },
    { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  );

  const mood = data?.mood;
  const weight = data?.weight;

  const today = new Date().toISOString().split('T')[0];
  const shouldCallGPT = flags.has('save') || date === today;

  let suggestion = data?.reflection ?? '';
  let weeklyAverages: number[] = [];

  if (shouldCallGPT) {
    const weightHistory = await getWeightHistory();
    weeklyAverages = getWeeklyWeightAverages(weightHistory);

    suggestion = await getDailySuggestion({
      ...totals,
      mood,
      weight,
      weeklyAverages,
      meals
    });
  } else {
    console.log(`📎 Skipping GPT call for ${date} — using cached reflection if present.`);
  }

  console.log(`🗓️  Daily Summary for ${date}`);

  console.log(`\n🍽️  Meals:\n`);
  meals.forEach((meal: Meal, i: number) => {
    console.log(
      `#${i + 1}: ${meal.name} – ${meal.kcal} kcal | P:${meal.protein} C:${meal.carbs} F:${meal.fat}${meal.fiber !== undefined ? ` FIB:${meal.fiber}` : ''}`
    );
  });

  console.log(`\n📊 Totals: ${totals.kcal} kcal | P:${totals.protein} C:${totals.carbs} F:${totals.fat} FIB:${totals.fiber}\n`);

  if (weeklyAverages?.length) {
    console.log(`📉 Recent weekly weight averages: ${weeklyAverages.join(', ')} kg`);
  }

  if (mood) console.log(`🧠 Mood: ${mood}`);
  if (weight) console.log(`⚖️  Weight: ${weight} kg`);
  console.log(`\n💬 GPT Reflection:\n${suggestion}`);

  if (flags.has('save')) {
    await ref.set(
      {
        reflection: suggestion,
        updatedAt: Timestamp.now()
      },
      { merge: true }
    );
    console.log(`✅ Reflection saved to Firestore.`);
  }
})();