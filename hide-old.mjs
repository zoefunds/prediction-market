import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const sa = JSON.parse(readFileSync(process.env.HOME + '/dev/prediction-market/secrets/firebase-admin.json', 'utf8'));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

const snap = await db.collection('markets').get();
let count = 0;
const batch = db.batch();
snap.forEach(doc => {
  batch.update(doc.ref, { hidden: true, updatedAt: FieldValue.serverTimestamp() });
  count++;
});
await batch.commit();
console.log(`hid ${count} old markets`);
process.exit(0);
