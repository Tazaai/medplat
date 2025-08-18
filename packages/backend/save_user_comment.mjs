import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// 🔑 Init Firebase
initializeApp({
  credential: applicationDefault(),
});

const db = getFirestore();

// 🔁 Justér disse værdier ved test eller brug fra frontend/app
const caseId = 'abc123'; // Unik ID for casen
const userComment = 'Hvorfor gives ikke antibiotika?';

// 📥 Gem brugerkommentaren
async function saveComment() {
  const docRef = db.collection('case_feedback').doc(); // auto-id

  await docRef.set({
    caseId: caseId,
    userComment: userComment,
    timestamp: FieldValue.serverTimestamp(),
  });

  console.log('📝 Kommentar gemt i Firestore.');
}

saveComment().catch(console.error);
