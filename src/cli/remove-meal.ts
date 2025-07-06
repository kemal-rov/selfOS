import { db } from '../core/firestore';
import { parseArgs } from '../utils/args';
import { Meal } from '../core/types';
import { Timestamp } from '@google-cloud/firestore';

const { date, flags } = parseArgs(process.argv.slice(2));
const indexFlag = flags.has('index') ? parseInt(flags.get('index') || '', 10) : undefined;
const idFlag = flags.get('id');
const ref = db.collection('days').doc(date);

if (indexFlag === undefined && !idFlag) {
  console.error('❌ Please provide either --index or --id to remove a meal.');
  process.exit(1);
}

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

  let updatedMeals: Meal[];

  if (indexFlag !== undefined) {
    if (indexFlag < 0 || indexFlag >= meals.length) {
      console.error(`❌ Invalid index: ${indexFlag}. Max is ${meals.length - 1}.`);
      process.exit(1);
    }
    const removed = meals[indexFlag];
    updatedMeals = meals.filter((_, i) => i !== indexFlag);
    console.log(`🗑️  Removed meal #${indexFlag + 1}: ${removed.name}`);
  } else if (idFlag) {
    const exists = meals.find(m => m.id === idFlag);
    if (!exists) {
      console.error(`❌ No meal found with ID: ${idFlag}`);
      process.exit(1);
    }
    updatedMeals = meals.filter(m => m.id !== idFlag);
    console.log(`🗑️  Removed meal with ID: ${idFlag}`);
  } else {
    console.error('❌ Unexpected input. Provide --index or --id.');
    process.exit(1);
  }

  await ref.set(
    {
      meals: updatedMeals,
      updatedAt: Timestamp.now()
    },
    { merge: true }
  );

  console.log(`✅ Updated meal list saved for ${date}.`);
})();