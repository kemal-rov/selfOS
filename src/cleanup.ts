import { db } from './core/firestore';

async function deleteDocAndSubcollections(docPath: string) {
  const docRef = db.doc(docPath);
  const collections = await docRef.listCollections();

  for (const col of collections) {
    const snapshots = await col.get();
    const batch = db.batch();
    snapshots.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    console.log(`Deleted ${snapshots.size} docs in subcollection ${col.id}`);
  }

  await docRef.delete();
  console.log(`Deleted main document: ${docPath}`);
}

deleteDocAndSubcollections('healthData/2025-07-09')
  .then(() => console.log('✅ Fully cleaned.'))
  .catch(console.error);