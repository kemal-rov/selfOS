import { db } from './src/core/firestore'; 
import weights from './firestore_weight_data.json';

async function importWeights() {
  for (const [path, data] of Object.entries(weights)) {
    await db.doc(path).set(data, { merge: true });
    console.log(`Imported: ${path}`);
  }
}

importWeights();