import { db } from './firestore';
import { FieldPath } from '@google-cloud/firestore';

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