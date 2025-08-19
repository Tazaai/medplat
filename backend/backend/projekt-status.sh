#!/bin/bash

echo "📊 STATUSOVERSIGT – AI CASE PLATFORM (Maj 2025)"
echo "---------------------------------------------"

# 1. CASE-FILER
case_count=$(ls *.txt 2>/dev/null | wc -l)
echo "📝 Antal .txt-casefiler i mappen: $case_count"

# 2. FIRESTORE JSON-CASENE
json_cases=$(ls *_cases_firestore.json 2>/dev/null | wc -l)
echo "🔥 Firestore JSON klar til upload: $json_cases"

# 3. UPLOAD-LOGS
if [ -f upload_cases.log ]; then
  echo "✅ upload_cases.log eksisterer – cases er forsøgt uploadet"
else
  echo "⚠️  upload_cases.log mangler – ingen upload-log fundet"
fi

# 4. DOCKER / DEPLOY
backend_url=$(gcloud run services describe medplat-backend \
  --platform managed \
  --region europe-west1 \
  --format='value(status.url)' 2>/dev/null)

if [ -n "$backend_url" ]; then
  echo "🚀 Backend er live på: $backend_url"
else
  echo "❌ Backend er IKKE aktivt deployet endnu."
fi

# 5. OPENAI KEY
if grep -q OPENAI_API_KEY .env 2>/dev/null; then
  echo "🔑 OpenAI API-nøgle er konfigureret i .env"
else
  echo "⚠️  OpenAI API-nøgle ikke fundet i .env"
fi

# 6. VIGTIGE FILER TJEK
echo "📂 Nøglefiler:"
for f in Dockerfile index.js package.json serviceAccountKey.json; do
  if [ -f "$f" ]; then
    echo " - ✔️  $f"
  else
    echo " - ❌  $f mangler"
  fi
done

echo "---------------------------------------------"
echo "🕹️  Tip: Du kan generere nye cases med fx: bash generate_cases_openai.sh"
echo "🧠 Husk at strukturere og uploade til Firestore bagefter!"
