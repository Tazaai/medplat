const admin = require('firebase-admin');
const path = require('path');
(async ()=>{
  try {
    const credPath = path.resolve(__dirname, '..', 'keys', 'serviceAccountKey.json');
    let cred;
    try { cred = require(credPath); } catch(e) {
      console.error('No local serviceAccountKey.json found at', credPath); process.exit(2);
    }
    if (cred && cred.private_key && typeof cred.private_key === 'string' && cred.private_key.indexOf('\\n') !== -1) {
      cred.private_key = cred.private_key.replace(/\\n/g,'\n');
    }
    try{ admin.initializeApp({ credential: admin.credential.cert(cred) }); } catch(e){}
    const db = admin.firestore();
    console.log('serviceAccount.project_id:', cred.project_id || '(none in JSON)');
    try{
      const snapshot = await db.collection('topics2').limit(5).get();
      console.log('topics2.docs_count:', snapshot.size);
      snapshot.forEach(d => console.log('doc:', d.id, JSON.stringify(d.data())));
    }catch(e){ console.error('Error reading topics2:', e && e.message ? e.message : e); process.exit(3);}    
    process.exit(0);
  }catch(e){ console.error(e && e.stack ? e.stack : e); process.exit(4);} 
})();
