#!/bin/bash
# Regression test for /api/panel/review endpoint
# Tests multiple clinical topics and measures response times

set -e

BACKEND_URL="${1:-https://medplat-backend-139218747785.europe-west1.run.app}"
TARGET_TIME=60
RESULTS_FILE="/tmp/panel_regression_results.txt"

echo "=====================================================" | tee "$RESULTS_FILE"
echo "🧪 Expert Panel Review - Regression Test" | tee -a "$RESULTS_FILE"
echo "Backend: $BACKEND_URL" | tee -a "$RESULTS_FILE"
echo "Target response time: <${TARGET_TIME}s" | tee -a "$RESULTS_FILE"
echo "=====================================================" | tee -a "$RESULTS_FILE"
echo "" | tee -a "$RESULTS_FILE"

# Test cases: topic, age, sex, chief complaint
declare -a test_cases=(
  "stroke|72|M|Sudden onset left-sided weakness and slurred speech"
  "sepsis|45|F|Fever, confusion, and hypotension following UTI"
  "diabetic_ketoacidosis|28|M|Nausea, vomiting, and fruity breath odor"
  "acute_mi|58|M|Crushing chest pain radiating to left arm"
  "pulmonary_embolism|62|F|Sudden dyspnea and pleuritic chest pain"
)

total_tests=0
passed_tests=0
failed_tests=0

for test_case in "${test_cases[@]}"; do
  IFS='|' read -r topic age sex complaint <<< "$test_case"
  
  echo "---------------------------------------------------" | tee -a "$RESULTS_FILE"
  echo "Testing: $topic (age: $age, sex: $sex)" | tee -a "$RESULTS_FILE"
  echo "Complaint: $complaint" | tee -a "$RESULTS_FILE"
  
  # Create test payload
  cat > /tmp/panel_test_${topic}.json << EOF
{
  "case_json": {
    "meta": {
      "topic": "${topic}",
      "language": "en",
      "region": "EU/DK",
      "demographics": {"age": ${age}, "sex": "${sex}"},
      "geography_of_living": "urban"
    },
    "history": {
      "presenting_complaint": "${complaint}",
      "onset_duration_severity": "acute onset",
      "context_triggers": "at rest",
      "post_event": "persists",
      "past_medical_history": [],
      "medications_current": [],
      "allergies": []
    }
  }
}
EOF

  # Measure response time
  start_time=$(date +%s)
  
  response=$(curl -sS -m 90 -w "\n%{http_code}" -X POST "${BACKEND_URL}/api/panel/review" \
    -H 'Content-Type: application/json' \
    --data-binary @/tmp/panel_test_${topic}.json 2>&1)
  
  end_time=$(date +%s)
  elapsed=$((end_time - start_time))
  
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)
  
  total_tests=$((total_tests + 1))
  
  # Check response
  if [ "$http_code" = "200" ]; then
    # Check if response contains expected fields
    if echo "$body" | jq -e '.ok' >/dev/null 2>&1 && \
       echo "$body" | jq -e '.parsed.reviewers' >/dev/null 2>&1; then
      reviewer_count=$(echo "$body" | jq -r '.parsed.reviewers | length' 2>/dev/null || echo "0")
      
      if [ "$elapsed" -le "$TARGET_TIME" ]; then
        echo "✅ PASS: ${elapsed}s (${reviewer_count} reviewers)" | tee -a "$RESULTS_FILE"
        passed_tests=$((passed_tests + 1))
      else
        echo "⚠️  SLOW: ${elapsed}s (${reviewer_count} reviewers) - exceeded target" | tee -a "$RESULTS_FILE"
        passed_tests=$((passed_tests + 1))
      fi
      
      # Show sample reviewer
      if [ "$reviewer_count" -gt "0" ]; then
        first_reviewer=$(echo "$body" | jq -r '.parsed.reviewers[0].name' 2>/dev/null || echo "N/A")
        echo "   Sample reviewer: $first_reviewer" | tee -a "$RESULTS_FILE"
      fi
    else
      echo "❌ FAIL: Invalid response structure (${elapsed}s)" | tee -a "$RESULTS_FILE"
      failed_tests=$((failed_tests + 1))
    fi
  else
    echo "❌ FAIL: HTTP $http_code (${elapsed}s)" | tee -a "$RESULTS_FILE"
    echo "   Error: $(echo "$body" | head -n 3)" | tee -a "$RESULTS_FILE"
    failed_tests=$((failed_tests + 1))
  fi
  
  echo "" | tee -a "$RESULTS_FILE"
  
  # Small delay between tests
  sleep 2
done

echo "=====================================================" | tee -a "$RESULTS_FILE"
echo "📊 Test Summary" | tee -a "$RESULTS_FILE"
echo "Total tests: $total_tests" | tee -a "$RESULTS_FILE"
echo "Passed: $passed_tests" | tee -a "$RESULTS_FILE"
echo "Failed: $failed_tests" | tee -a "$RESULTS_FILE"
echo "" | tee -a "$RESULTS_FILE"

if [ $failed_tests -eq 0 ]; then
  echo "✅ All tests passed!" | tee -a "$RESULTS_FILE"
  exit 0
else
  echo "❌ Some tests failed" | tee -a "$RESULTS_FILE"
  exit 1
fi
