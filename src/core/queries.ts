import { db } from './firestore';
import { FieldPath } from '@google-cloud/firestore';
import { Meal } from './types';

export async function getWeightHistory(): Promise<{ date: string; weight: number }[]> {
  const snapshot = await db.collection('days')
    .orderBy(FieldPath.documentId()) // sorts by date (doc ID)
    .select('weight')
    .get();

  return snapshot.docs
    .filter(doc => typeof doc.data().weight === 'number') // only entries with a weight
    .map(doc => ({
      date: doc.id,
      weight: doc.data().weight
    }
  ));
}

export async function getLast7DailyMacros(): Promise<Record<string, number>> {
  const today = new Date();
  const cutoff = new Date(today);
  cutoff.setDate(today.getDate() - 7);

  const snapshot = await db.collection('days')
    .orderBy('createdAt', 'desc')
    .get();

  const result: Record<string, number> = {};

  snapshot.docs.forEach(doc => {
    const date = doc.id;
    const data = doc.data();
    const meals: Meal[] = data.meals || [];
    const createdAt = data.createdAt?.toDate?.();

    if (!createdAt || createdAt < cutoff || meals.length === 0) return;

    const totalKcal = meals.reduce((sum, m) => sum + m.kcal, 0);
    result[date] = totalKcal;
  });

  return result;
}