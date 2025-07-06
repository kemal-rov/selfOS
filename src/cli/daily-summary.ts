import { db } from '../core/firestore';
import { parseArgs } from '../utils/args';
import { getDailySuggestion } from '../core/openai';
import { Timestamp } from '@google-cloud/firestore';

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

  const suggestion = await getDailySuggestion({
    ...totals,
    mood,
    weight
  });

  console.log(`🗓️  Daily Summary for ${date}`);
  console.log(`📊 Totals: ${totals.kcal} kcal | P:${totals.protein} C:${totals.carbs} F:${totals.fat} FIB:${totals.fiber}`);
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