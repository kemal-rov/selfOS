import { db } from './firestore';
import { parseArgs } from './utils/args';
import { Meal } from './types';

const { date } = parseArgs(process.argv.slice(2));
const ref = db.collection('days').doc(date);

(async () => {
  const snapshot = await ref.get();

  if (!snapshot.exists) {
    console.log(`No entry found for ${date}`);
    process.exit(0);
  }

  const data = snapshot.data();
  const weight = data?.weight;
  const mood = data?.mood;
  const updatedAt = data?.updatedAt?.toDate?.()?.toLocaleString() || null;

  if (weight) {
  console.log(`⚖️  Weight: ${weight} kg`);
  }
  if (mood) {
  console.log(`🧠 Mood: ${mood}`);
  }
  if (updatedAt) {
  console.log(`🕒 Last updated: ${updatedAt}`);
  }
  
  const meals = data?.meals || [];

  if (meals.length === 0) {
    console.log(`No meals logged for ${date}`);
    process.exit(0);
  }

  let total = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };

  console.log(`🍽️  Meals for ${date}:\n`);

  meals.forEach((meal: Meal, i: number) => {
    console.log(
      `#${i + 1}: ${meal.name} – ${meal.kcal} kcal | P:${meal.protein} C:${meal.carbs} F:${meal.fat}${meal.fiber !== undefined ? ` FIB:${meal.fiber}` : ''}`
    );

    total.kcal += meal.kcal;
    total.protein += meal.protein;
    total.carbs += meal.carbs;
    total.fat += meal.fat;
    total.fiber += meal.fiber || 0;
  });

  console.log(`\n📊 Total: ${total.kcal} kcal | P:${total.protein} C:${total.carbs} F:${total.fat} FIB:${total.fiber}`);
})();