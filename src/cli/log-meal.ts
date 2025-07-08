import { db } from '../core/firestore';
import { FieldValue, Timestamp } from '@google-cloud/firestore';
import { getMealMacrosFromGPT, getDailySuggestion } from '../core/openai';
import { randomUUID } from 'crypto';
import { parseArgs } from '../utils/args';
import { Meal } from '../core/types';

const { date: targetDate, input: mealText } = parseArgs(process.argv.slice(2));

if (!mealText) {
  console.error('❌ Please provide a meal description.');
  process.exit(1);
}

(async () => {
  try {
    const macros = await getMealMacrosFromGPT(mealText);

    const meal: Meal = {
      id: randomUUID(),
      name: mealText,
      ...macros
    };

    const ref = db.collection('days').doc(targetDate);

    await ref.set(
      {
        meals: FieldValue.arrayUnion(meal),
        updatedAt: Timestamp.now(),
        createdAt: Timestamp.now()
      },
      { merge: true }
    );

    console.log(`✅ Logged meal to ${targetDate}:`, meal);

    // Fetch all meals + mood/weight
    const updatedSnap = await ref.get();
    const updatedData = updatedSnap.data();
    const meals = updatedData?.meals || [];

    const totals = meals.reduce(
      (acc, m) => {
        acc.kcal += m.kcal;
        acc.protein += m.protein;
        acc.carbs += m.carbs;
        acc.fat += m.fat;
        acc.fiber += m.fiber || 0;
        return acc;
      },
      { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
    );
  } catch (err) {
    console.error('❌ Error logging meal:', err);
  }
})();