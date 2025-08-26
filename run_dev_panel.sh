#!/bin/bash
# /workspaces/medplat/run_dev_panel.sh
# Automated dev panel review loop

API_URL="http://localhost:8080/api/dialog"
PROMPT_FILE="dev_panel_review_prompt.txt"
REVIEW_DIR="reviews"

# Topics to sample from (add more globally as needed)
TOPICS=(
  "Sepsis|Emergency Medicine"
  "Acute Stroke|Neurology"
  "Febrile Seizure|Pediatrics"
  "Acute Myocardial Infarction|Cardiology"
  "Asthma Exacerbation|Pulmonology"
)

# Ensure reviews dir exists
mkdir -p "$REVIEW_DIR"

echo "🔄 Running external dev panel review on ${#TOPICS[@]} topics..."

for entry in "${TOPICS[@]}"; do
  topic="${entry%%|*}"
  area="${entry##*|}"
  file_safe=$(echo "$topic" | tr ' ' '_' | tr '[:upper:]' '[:lower:]')

  echo "➡️  Testing $topic ($area)..."

  # 1. Generate case JSON via curl
  response=$(curl -s -X POST $API_URL \
    -H "Content-Type: application/json" \
    -d "{
      \"area\": \"$area\",
      \"topic\": \"$topic\",
      \"language\": \"en\",
      \"model\": \"gpt-4o-mini\"
    }")

  # 2. Extract just the JSON case part
  case_json=$(echo "$response" | jq -r '.aiReply.json')

  # 3. Send to GPT with dev panel prompt (fixed payload)
  review=$(curl -s -X POST "https://api.openai.com/v1/chat/completions" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $OPENAI_API_KEY" \
    -d "{
      \"model\": \"gpt-4o-mini\",
      \"messages\": [
        {\"role\": \"system\", \"content\": \"You are an external multidisciplinary expert panel reviewing cases for global improvements.\"},
        {\"role\": \"user\", \"content\": \"Generated Case: $case_json\n\n$(cat $PROMPT_FILE)\"}
      ],
      \"temperature\": 0.7
    }" | jq -r '.choices[0].message.content')

  # 4. Save review
  out_file="$REVIEW_DIR/${file_safe}_panel.txt"
  echo "$review" > "$out_file"
  echo "✅ Saved review to $out_file"
done

echo "🎯 All reviews complete. Check the $REVIEW_DIR/ folder."
