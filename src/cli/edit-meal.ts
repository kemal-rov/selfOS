import { db } from '../core/firestore';
import { parseArgs } from '../utils/args';
import { getMealMacrosFromGPT } from '../core/openai';
import { Meal } from '../core/types';
import { Timestamp } from '@google-cloud/firestore';
import { randomUUID } from 'crypto';

const { date, flags } = parseArgs(process.argv.slice(2));
const indexArg = flags.get('index');
const idArg = flags.get('id');
const newName = flags.get('name');

if (!newName || (!indexArg && !idArg)) {
  console.error(`
❌ Usage: npm run edit:meal -- --index=<number> --name="New meal name"
   or:    npm run edit:meal -- --id=<mealId> --name="New meal name"
`);
  process.exit(1);
}

const ref = db.collection('days').doc(date);

(async () => {
  const snapshot = await ref.get();
  if (!snapshot.exists) {
    console.error(`❌ No entry found for ${date}`);
    process.exit(1);
  }

  const data = snapshot.data();
  const meals: Meal[] = data?.meals || [];

  let targetIndex = -1;

  if (indexArg) {
    const i = parseInt(indexArg, 10);
    if (isNaN(i) || i < 0 || i >= meals.length) {
      console.error(`❌ Invalid index: ${indexArg}`);
      process.exit(1);
    }
    targetIndex = i;
  } else if (idArg) {
    targetIndex = meals.findIndex(m => m.id === idArg);
    if (targetIndex === -1) {
      console.error(`❌ Meal with ID "${idArg}" not found.`);
      process.exit(1);
    }
  }

  const oldMeal = meals[targetIndex];

  console.log(`🔄 Recalculating macros for "${newName}"...`);
  const macros = await getMealMacrosFromGPT(newName);

  const updatedMeal: Meal = {
    id: randomUUID(),
    name: newName,
    ...macros
  };

  meals[targetIndex] = updatedMeal;

  await ref.set({ meals, updatedAt: Timestamp.now() }, { merge: true });

  console.log(`✅ Replaced meal #${targetIndex + 1} on ${date}:`);
  console.log(`   • Old: ${oldMeal.name}`);
  console.log(`   • New: ${updatedMeal.name} (${updatedMeal.kcal} kcal | P:${updatedMeal.protein} C:${updatedMeal.carbs} F:${updatedMeal.fat}${updatedMeal.fiber ? ` FIB:${updatedMeal.fiber}` : ''})`);
})();