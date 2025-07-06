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
  const meals = data?.meals || [];

  const total = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
  const lines: string[] = [];

  lines.push(`🗓️  SelfOS log for ${date}\n`);

  const simpleFields: Record<string, string> = {
    weight: data?.weight ? `⚖️  Weight: ${data.weight} kg` : '',
    mood: data?.mood ? `🧠 Mood: ${data.mood}` : '',
    updatedAt: data?.updatedAt?.toDate?.()?.toLocaleString()
      ? `🕒 Last updated: ${data.updatedAt.toDate().toLocaleString()}`
      : '',
  };

  Object.values(simpleFields).forEach((line) => {
    if (line) lines.push(line);
  });

  if (data?.reflection) {
    lines.push(`\n💬 Reflection:\n${data.reflection}`);
  }

  if (meals.length === 0) {
    lines.push(`\nNo meals logged for ${date}`);
    console.log(lines.join('\n'));
    process.exit(0);
  }

  lines.push(`\n🍽️  Meals:\n`);

  meals.forEach((meal: Meal, i: number) => {
    const fiberInfo = meal.fiber !== undefined ? ` FIB:${meal.fiber}` : '';
    lines.push(
      `#${i + 1}: ${meal.name} – ${meal.kcal} kcal | P:${meal.protein} C:${meal.carbs} F:${meal.fat}${fiberInfo}`
    );

    total.kcal += meal.kcal;
    total.protein += meal.protein;
    total.carbs += meal.carbs;
    total.fat += meal.fat;
    total.fiber += meal.fiber || 0;
  });

  lines.push(
    `\n📊 Total: ${total.kcal} kcal | P:${total.protein} C:${total.carbs} F:${total.fat} FIB:${total.fiber}`
  );

  console.log(lines.join('\n'));
})();