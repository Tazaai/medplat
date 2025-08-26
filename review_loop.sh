#!/bin/bash
# /workspaces/medplat/review_loop.sh
# Auto refinement loop for generate_case_clinical.mjs
# External expert panel feedback -> JSON -> overwrite file

TARGET_FILE="/workspaces/medplat/backend/generate_case_clinical.mjs"
CYCLES=3
API_KEY=$OPENAI_API_KEY

if [ -z "$API_KEY" ]; then
  echo "❌ OPENAI_API_KEY not set"
  exit 1
fi

for i in $(seq 1 $CYCLES); do
  echo "🔄 Cycle $i / $CYCLES"

  # 1. Generate a test case from current code
  RESPONSE=$(curl -s -X POST http://localhost:8080/api/dialog \
    -H "Content-Type: application/json" \
    -d '{"area":"Emergency Medicine","topic":"Sepsis","language":"en","model":"gpt-4o-mini"}')

  # 2. Ask external panel to review & return edited code in JSON
  PANEL=$(curl -s https://api.openai.com/v1/chat/completions \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $API_KEY" \
    -d "{
      \"model\": \"gpt-4o-mini\",
      \"messages\": [
        {\"role\": \"system\", \"content\": \"You are an external expert development panel reviewing a medical case generator script.\"},
        {\"role\": \"user\", \"content\": \"Here is the current case generator output: $RESPONSE\"},
        {\"role\": \"user\", \"content\": \"Review critically as a panel (medical student, doctor, specialists, pharmacist, radiologists, professor, competitor). Return JSON only with key 'edited_code' containing the FULL corrected JavaScript code of $TARGET_FILE.\"}
      ],
      \"temperature\": 0.5
    }")

  CODE=$(echo "$PANEL" | jq -r '.choices[0].message.content' | jq -r '.edited_code // empty')

  if [ -z "$CODE" ]; then
    echo "❌ Panel did not return valid JSON with edited_code in cycle $i. Stopping."
    break
  fi

  # 3. Overwrite file
  echo "$CODE" > "$TARGET_FILE"
  echo "✅ Updated $TARGET_FILE in cycle $i"
done

echo "🏁 Finished $CYCLES cycles. Review final $TARGET_FILE manually."
