import { db } from '../core/firestore';
import { format, subDays } from 'date-fns';

async function getHealthData(date: string) {
  const doc = await db.collection('healthData').doc(date).get();
  return doc.exists ? doc.data() : null;
}

async function getMealData(date: string) {
  const doc = await db.collection('days').doc(date).get();
  return doc.exists ? doc.data() : null;
}

async function weeklySummary() {
  const today = new Date();
  const dates = Array.from({ length: 7 }, (_, i) =>
    format(subDays(today, i), 'yyyy-MM-dd')
  ).reverse();

  const summary = [];

  for (const date of dates) {
    const health = await getHealthData(date);
    const meals = await getMealData(date);

    const kcal = meals?.kcal ?? 0;
    const protein = meals?.protein ?? 0;
    const mood = meals?.mood ?? '–';
    const weight = meals?.weight ?? null;
    const reflection = meals?.reflection ?? null;

    const activeEnergy = health?.metrics?.active_energy?.data?.reduce(
      (sum: number, e: any) => sum + (e.qty || 0),
      0
    );

    const steps = health?.metrics?.step_count?.data?.reduce(
      (sum: number, e: any) => sum + (e.qty || 0),
      0
    );

    summary.push({
      date,
      kcal,
      protein,
      mood,
      weight,
      reflection,
      activeEnergy: activeEnergy ? (activeEnergy / 4.184).toFixed(1) : null,
      steps: steps ? Math.round(steps) : null,
    });
  }

  console.log('📊 Weekly Summary:\n');
  summary.forEach((entry) => {
    console.log(
      `📅 ${entry.date}\n` +
      `• kcal: ${entry.kcal} | protein: ${entry.protein}g\n` +
      `• steps: ${entry.steps ?? '–'} | activeEnergy: ${entry.activeEnergy ?? '–'} kcal\n` +
      `• mood: ${entry.mood} | weight: ${entry.weight ?? '–'} kg\n` +
      (entry.reflection ? `🧠 ${entry.reflection}\n` : '') +
      '—'
    );
  });
}

weeklySummary();