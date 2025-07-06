import { Firestore } from '@google-cloud/firestore';

const db = new Firestore(); // Uses Application Default Credentials (ADC)

export { db };