import { db } from './firestore';
import { Timestamp } from '@google-cloud/firestore';
import { parseArgs } from './utils/args';

const { date, input } = parseArgs(process.argv.slice(2));

if (!input || isNaN(parseFloat(input))) {
  console.error('❌ Please provide a valid weight (e.g. 84.3)');
  process.exit(1);
}

const weight = parseFloat(input);
const ref = db.collection('days').doc(date);

(async () => {
  try {
    await ref.set(
      {
        weight,
        updatedAt: Timestamp.now(),
        createdAt: Timestamp.now()
      },
      { merge: true }
    );

    console.log(`✅ Logged weight for ${date}: ${weight} kg`);
  } catch (err) {
    console.error('❌ Error logging weight:', err);
  }
})();