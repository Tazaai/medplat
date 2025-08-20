import firebase_admin
from firebase_admin import credentials, firestore

# Indlæs servicekonto
cred = credentials.Certificate("firebase-key.json")
firebase_admin.initialize_app(cred)

# Firestore klient
db = firestore.client()

# Navn på samling der skal slettes
collection_name = "ai_case_texts"

def delete_all_documents():
    docs = db.collection(collection_name).stream()
    deleted = 0
    for doc in docs:
        doc.reference.delete()
        deleted += 1
    print(f"✅ Slettet {deleted} dokumenter fra '{collection_name}'")

delete_all_documents()
