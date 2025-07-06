import { db } from './firestore';
import { Timestamp } from '@google-cloud/firestore';
import { parseArgs } from './utils/args';

const { date, input: mood } = parseArgs(process.argv.slice(2));

if (!mood) {
  console.error('❌ Please provide a mood (e.g. relaxed, stressed, focused)');
  process.exit(1);
}

const ref = db.collection('days').doc(date);

(async () => {
  try {
    await ref.set(
      {
        mood,
        updatedAt: Timestamp.now(),
        createdAt: Timestamp.now()
      },
      { merge: true }
    );

    console.log(`✅ Logged mood for ${date}: ${mood}`);
  } catch (err) {
    console.error('❌ Error logging mood:', err);
  }
})();