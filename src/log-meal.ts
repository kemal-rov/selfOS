import { db } from './firestore';
import { getMealMacrosFromGPT } from './openai';
import { randomUUID } from 'crypto';
import { parseArgs } from './utils/args';
import { Meal } from './types';

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
      { meals: [meal] },
      { merge: true }
    );

    console.log(`✅ Logged meal to ${targetDate}:`, meal);
  } catch (err) {
    console.error('❌ Error logging meal:', err);
  }
})();