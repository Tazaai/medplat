import json
import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime

cred = credentials.Certificate("firebase-key.json")  # ← erstat evt. med din nøglefil
firebase_admin.initialize_app(cred)
db = firestore.client()

with open("topics.jsonl", "r", encoding="utf-8") as f:
    for line in f:
        data = json.loads(line)
        data["created_at"] = datetime.utcnow().isoformat() + "Z"
        db.collection("ai_case_topics").add(data)

print("✅ Upload færdig.")
