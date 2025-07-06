import { db } from '../core/firestore';
import { parseArgs } from '../utils/args';
import { getMealMacrosFromGPT } from '../core/openai';
import { Meal } from '../core/types';
import { Timestamp } from '@google-cloud/firestore';
import { randomUUID } from 'crypto';

const { date, flags } = parseArgs(process.argv.slice(2));
const indexStr = flags.get('index');
const id = flags.get('id');
const newName = flags.get('name');

if (!newName || (!indexStr && !id)) {
  console.error('❌ Please provide a new --name and either --index or --id.');
  process.exit(1);
}

const ref = db.collection('days').doc(date);

(async () => {
  const snapshot = await ref.get();

  if (!snapshot.exists) {
    console.error(`No entry found for ${date}`);
    process.exit(1);
  }

  const data = snapshot.data();
  const meals: Meal[] = data?.meals || [];

  let targetIndex = -1;

  if (indexStr) {
    const index = parseInt(indexStr, 10);
    if (isNaN(index) || index < 0 || index >= meals.length) {
      console.error(`❌ Invalid index: ${indexStr}`);
      process.exit(1);
    }
    targetIndex = index;
  } else if (id) {
    targetIndex = meals.findIndex(m => m.id === id);
    if (targetIndex === -1) {
      console.error(`❌ Meal with ID ${id} not found.`);
      process.exit(1);
    }
  }

  console.log(`🔄 Re-parsing macros for new meal: "${newName}"...`);
  const macros = await getMealMacrosFromGPT(newName);

  const updatedMeal: Meal = {
    id: randomUUID(),
    name: newName,
    ...macros
  };

  meals[targetIndex] = updatedMeal;

  await ref.set(
    {
      meals,
      updatedAt: Timestamp.now()
    },
    { merge: true }
  );

  console.log(`✅ Meal updated successfully for ${date}.`);
})();