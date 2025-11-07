// Test Firestore topics2 collection
import { initFirebase } from "./backend/firebaseClient.js";

async function main() {
  const fb = initFirebase();
  
  if (!fb.initialized) {
    console.log("❌ Firebase not initialized");
    process.exit(1);
  }
  
  console.log("✅ Firebase initialized");
  
  const snapshot = await fb.firestore.collection("topics2").limit(5).get();
  
  console.log("\n📊 Topics2 collection stats:");
  console.log("  - Size:", snapshot.size);
  console.log("  - Empty:", snapshot.empty);
  
  if (!snapshot.empty) {
    console.log("\n📝 First 5 documents:");
    snapshot.docs.forEach((doc, idx) => {
      const data = doc.data();
      console.log(`  ${idx + 1}. ID: ${doc.id}`);
      console.log(`     Title: ${data.title || "(no title)"}`);
      console.log(`     Category: ${data.category || "(no category)"}`);
    });
  } else {
    console.log("\n⚠️  Collection is EMPTY!");
  }
  
  // Try counting all documents
  const allSnapshot = await fb.firestore.collection("topics2").get();
  console.log("\n📈 Total documents in topics2:", allSnapshot.size);
  
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
