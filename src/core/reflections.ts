import { db } from './firestore';
import { Meal } from './types';
import { goals } from './goals';
import { FieldPath } from '@google-cloud/firestore';

export function getReflectionTags({
  kcal,
  protein,
  meals,
  mood,
  workoutLogged
}: {
  kcal: number;
  protein: number;
  meals: Meal[];
  mood?: string;
  workoutLogged?: boolean;
}): string[] {
  const tags: string[] = [];

  // Workout inferred from mood
  if (workoutLogged || mood?.toLowerCase().includes('gym') || mood?.toLowerCase().includes('run')) {
    tags.push('workout_day');
  }

  // Protein > 2g/kg (e.g. 150g for 75kg)
  if (protein >= 2 * goals.goalWeight) {
    tags.push('very_high_protein');
  }

  // Low kcal margin
  if (kcal <= goals.kcalLimit - 300) {
    tags.push('significant_calorie_deficit');
  }

  // Processed/indulgent heuristic
  const cheatKeywords = ['pizza', 'fries', 'kapsalon', 'pie', 'chocolate', 'chips', 'ice cream'];
  const mealsJoined = meals.map(m => m.name.toLowerCase()).join(' ');
  if (cheatKeywords.some(k => mealsJoined.includes(k))) {
    tags.push('possible_indulgence');
  }

  return tags;
}

export async function getLast7Reflections(): Promise<
  { date: string; reflection: string; mood?: string }[]
> {
  const snapshot = await db.collection('days')
    .orderBy(FieldPath.documentId(), 'desc')
    .limit(7)
    .select('reflection', 'mood')
    .get();

  return snapshot.docs
    .filter(doc => doc.data()?.reflection)
    .map(doc => ({
      date: doc.id,
      reflection: doc.data().reflection,
      mood: doc.data().mood
    }))
    .reverse(); // oldest to newest
}