import { db } from '../core/firestore';
import { parseArgs } from '../utils/args';
import { Meal } from '../core/types';

const { date } = parseArgs(process.argv.slice(2));
const ref = db.collection('days').doc(date);

(async () => {
  const snapshot = await ref.get();

  if (!snapshot.exists) {
    console.log(`No entry found for ${date}`);
    process.exit(0);
  }

  const data = snapshot.data();
  const meals: Meal[] = data?.meals || [];

  if (meals.length === 0) {
    console.log(`No meals found for ${date}`);
    process.exit(0);
  }

  console.log(`📅 Meals for ${date}:\n`);

  meals.forEach((meal, index) => {
    console.log(`#${index + 1} – ID: ${meal.id}`);
    console.log(`   ${meal.name}`);
    console.log(`   🔸 ${meal.kcal} kcal | P:${meal.protein} C:${meal.carbs} F:${meal.fat}${meal.fiber !== undefined ? ` FIB:${meal.fiber}` : ''}\n`);
  });
})();