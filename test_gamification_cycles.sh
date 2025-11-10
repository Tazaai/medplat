#!/bin/bash
# Test script: Run 2 gamification cycles with external panel review and auto-correction
# This is for AGENT development testing only - user will test in production without external panel

set -e

BACKEND_URL="http://localhost:8080"
TOPIC="Acute Myocardial Infarction"

echo "=========================================="
echo "🧪 GAMIFICATION DEVELOPMENT CYCLE TEST"
echo "=========================================="
echo ""
echo "Topic: $TOPIC"
echo "Cycles: 2 (with external panel review)"
echo ""

# Check backend is running
if ! curl -sf "$BACKEND_URL/api/topics" > /dev/null 2>&1; then
  echo "❌ Backend not running at $BACKEND_URL"
  echo "Start it with: cd backend && PORT=8080 node index.js"
  exit 1
fi

echo "✅ Backend is running"
echo ""

# ============================================================================
# CYCLE 1: Generate case + MCQs, external panel review
# ============================================================================

echo "=========================================="
echo "🔬 CYCLE 1: Generate + External Review"
echo "=========================================="
echo ""

echo "Step 1.1: Generating clinical case..."
CASE1=$(curl -sf -X POST "$BACKEND_URL/api/dialog" \
  -H "Content-Type: application/json" \
  -d "{
    \"topic\": \"$TOPIC\",
    \"model\": \"gpt-4o-mini\",
    \"professor_mode\": \"clinical\"
  }")

if [ $? -ne 0 ]; then
  echo "❌ Case generation failed"
  exit 1
fi

echo "✅ Case generated"
echo ""

echo "Step 1.2: Generating 12 MCQs..."
CASE_TEXT=$(echo "$CASE1" | jq -r '.aiReply')
MCQ1=$(curl -sf -X POST "$BACKEND_URL/api/gamify" \
  -H "Content-Type: application/json" \
  -d "{
    \"text\": $(echo "$CASE1" | jq -c '.case_output // .aiReply'),
    \"caseId\": \"cycle1_ami\"
  }")

if [ $? -ne 0 ]; then
  echo "❌ MCQ generation failed"
  exit 1
fi

MCQ_COUNT=$(echo "$MCQ1" | jq -r '.mcqs | length')
echo "✅ Generated $MCQ_COUNT MCQs"
echo ""

echo "Step 1.3: Calling external panel for system review..."
REVIEW1=$(curl -sf -X POST "$BACKEND_URL/api/external-panel/system-review" \
  -H "Content-Type: application/json" \
  -d "{
    \"case_samples\": [{
      \"topic\": \"$TOPIC\",
      \"mcqs\": $(echo "$MCQ1" | jq -c '.mcqs'),
      \"quality_metrics\": { \"count\": $MCQ_COUNT },
      \"user_feedback\": \"Cycle 1 development test\"
    }],
    \"focus_area\": \"gamification_quality\",
    \"system_version\": \"1.0\"
  }")

if [ $? -ne 0 ]; then
  echo "❌ External panel review failed"
  exit 1
fi

# Save full review
echo "$REVIEW1" > /tmp/cycle1_review.json

# Extract key metrics
OVERALL_SCORE=$(echo "$REVIEW1" | jq -r '.scores.overall_system_quality // "N/A"')
CRITICAL_COUNT=$(echo "$REVIEW1" | jq -r '.global_consensus.critical_actions | length')
HIGH_COUNT=$(echo "$REVIEW1" | jq -r '.global_consensus.high_priority | length')

echo "✅ External panel review complete"
echo ""
echo "📊 CYCLE 1 RESULTS:"
echo "   Overall System Quality: $OVERALL_SCORE/10"
echo "   CRITICAL actions: $CRITICAL_COUNT"
echo "   HIGH priority: $HIGH_COUNT"
echo ""
echo "🎯 Top Action Items:"
echo "$REVIEW1" | jq -r '.global_consensus.critical_actions[]' 2>/dev/null | head -3 | sed 's/^/   /'
echo "$REVIEW1" | jq -r '.global_consensus.high_priority[]' 2>/dev/null | head -3 | sed 's/^/   /'
echo ""
echo "📁 Full review saved: /tmp/cycle1_review.json"
echo ""

# ============================================================================
# AUTO-CORRECTION ANALYSIS
# ============================================================================

echo "=========================================="
echo "🔧 AUTO-CORRECTION ANALYSIS"
echo "=========================================="
echo ""
echo "Analyzing external panel feedback for auto-corrections..."
echo ""

# Extract core reviewer recommendations
echo "USMLE Expert recommendations:"
echo "$REVIEW1" | jq -r '.core_review.usmle_expert.recommendations[]' 2>/dev/null | sed 's/^/   - /'
echo ""

echo "Medical Researcher recommendations:"
echo "$REVIEW1" | jq -r '.core_review.medical_researcher.recommendations[]' 2>/dev/null | sed 's/^/   - /'
echo ""

echo "Professor of Medicine recommendations:"
echo "$REVIEW1" | jq -r '.core_review.professor_of_medicine.recommendations[]' 2>/dev/null | sed 's/^/   - /'
echo ""

echo "AI Expert recommendations:"
echo "$REVIEW1" | jq -r '.core_review.ai_coding_expert.recommendations[]' 2>/dev/null | sed 's/^/   - /'
echo ""

echo "⏸️  PAUSE: Review recommendations above"
echo "   Agent should now implement top 3 auto-corrections in code"
echo "   Press Enter when ready to run Cycle 2..."
read

# ============================================================================
# CYCLE 2: Generate with corrections applied
# ============================================================================

echo ""
echo "=========================================="
echo "🔬 CYCLE 2: Validate Improvements"
echo "=========================================="
echo ""

echo "Step 2.1: Generating clinical case (with corrections)..."
CASE2=$(curl -sf -X POST "$BACKEND_URL/api/dialog" \
  -H "Content-Type: application/json" \
  -d "{
    \"topic\": \"$TOPIC\",
    \"model\": \"gpt-4o-mini\",
    \"professor_mode\": \"clinical\"
  }")

echo "✅ Case generated"
echo ""

echo "Step 2.2: Generating 12 MCQs (with corrections)..."
MCQ2=$(curl -sf -X POST "$BACKEND_URL/api/gamify" \
  -H "Content-Type: application/json" \
  -d "{
    \"text\": $(echo "$CASE2" | jq -c '.case_output // .aiReply'),
    \"caseId\": \"cycle2_ami\"
  }")

MCQ_COUNT2=$(echo "$MCQ2" | jq -r '.mcqs | length')
echo "✅ Generated $MCQ_COUNT2 MCQs"
echo ""

echo "Step 2.3: Calling external panel for system review..."
REVIEW2=$(curl -sf -X POST "$BACKEND_URL/api/external-panel/system-review" \
  -H "Content-Type: application/json" \
  -d "{
    \"case_samples\": [{
      \"topic\": \"$TOPIC\",
      \"mcqs\": $(echo "$MCQ2" | jq -c '.mcqs'),
      \"quality_metrics\": { \"count\": $MCQ_COUNT2 },
      \"user_feedback\": \"Cycle 2 development test (post-corrections)\"
    }],
    \"focus_area\": \"gamification_quality\",
    \"system_version\": \"1.0\"
  }")

# Save full review
echo "$REVIEW2" > /tmp/cycle2_review.json

# Extract key metrics
OVERALL_SCORE2=$(echo "$REVIEW2" | jq -r '.scores.overall_system_quality // "N/A"')
CRITICAL_COUNT2=$(echo "$REVIEW2" | jq -r '.global_consensus.critical_actions | length')
HIGH_COUNT2=$(echo "$REVIEW2" | jq -r '.global_consensus.high_priority | length')

echo "✅ External panel review complete"
echo ""
echo "📊 CYCLE 2 RESULTS:"
echo "   Overall System Quality: $OVERALL_SCORE2/10"
echo "   CRITICAL actions: $CRITICAL_COUNT2"
echo "   HIGH priority: $HIGH_COUNT2"
echo ""
echo "📁 Full review saved: /tmp/cycle2_review.json"
echo ""

# ============================================================================
# COMPARISON SUMMARY
# ============================================================================

echo "=========================================="
echo "📈 CYCLE COMPARISON SUMMARY"
echo "=========================================="
echo ""
echo "Overall Quality Score:"
echo "   Cycle 1: $OVERALL_SCORE/10"
echo "   Cycle 2: $OVERALL_SCORE2/10"
echo "   Improvement: $(echo "$OVERALL_SCORE2 - $OVERALL_SCORE" | bc 2>/dev/null || echo 'N/A')"
echo ""
echo "Critical Actions:"
echo "   Cycle 1: $CRITICAL_COUNT"
echo "   Cycle 2: $CRITICAL_COUNT2"
echo ""
echo "High Priority:"
echo "   Cycle 1: $HIGH_COUNT"
echo "   Cycle 2: $HIGH_COUNT2"
echo ""
echo "✅ Development cycles complete!"
echo "📁 Reviews saved:"
echo "   - /tmp/cycle1_review.json"
echo "   - /tmp/cycle2_review.json"
echo ""
echo "🚀 Next steps:"
echo "   1. Review auto-corrections applied"
echo "   2. Commit changes to main branch"
echo "   3. Deploy to Cloud Run (external panel will NOT run)"
echo "   4. User tests gamification in production frontend"
echo ""
