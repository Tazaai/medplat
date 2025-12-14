#!/bin/bash
# backend/scripts/test_hybrid_engine.sh
# Hybrid Gamification v2.0: Backend Test Script

echo "🧪 Testing Hybrid Gamification v2.0 Engine"
echo "=========================================="

# Test topics for top specialties
TOPICS=(
  "Acute Myocardial Infarction"
  "Pneumonia"
  "Stroke"
  "Diabetic Ketoacidosis"
  "Sepsis"
)

CATEGORIES=(
  "Cardiology"
  "Infectious Diseases"
  "Neurology"
  "Endocrinology"
  "Emergency Medicine"
)

ERRORS=0
PASSED=0

for i in "${!TOPICS[@]}"; do
  TOPIC="${TOPICS[$i]}"
  CATEGORY="${CATEGORIES[$i]}"
  
  echo ""
  echo "📋 Testing: $TOPIC ($CATEGORY)"
  echo "--------------------------------"
  
  # Test classic mode
  echo "  Testing classic mode..."
  RESPONSE=$(curl -s -X POST http://localhost:8080/api/dialog \
    -H "Content-Type: application/json" \
    -d "{\"topic\":\"$TOPIC\",\"category\":\"$CATEGORY\",\"mode\":\"classic\"}")
  
  if echo "$RESPONSE" | grep -q '"ok":true'; then
    echo "  ✅ Classic mode: PASS"
    PASSED=$((PASSED + 1))
  else
    echo "  ❌ Classic mode: FAIL"
    ERRORS=$((ERRORS + 1))
  fi
  
  # Test gamified mode
  echo "  Testing gamified mode..."
  RESPONSE=$(curl -s -X POST http://localhost:8080/api/dialog \
    -H "Content-Type: application/json" \
    -d "{\"topic\":\"$TOPIC\",\"category\":\"$CATEGORY\",\"mode\":\"gamified\"}")
  
  if echo "$RESPONSE" | grep -q '"ok":true' && echo "$RESPONSE" | grep -q 'mcq_pack'; then
    echo "  ✅ Gamified mode: PASS"
    PASSED=$((PASSED + 1))
  else
    echo "  ❌ Gamified mode: FAIL"
    ERRORS=$((ERRORS + 1))
  fi
  
  # Test simulation mode
  echo "  Testing simulation mode..."
  RESPONSE=$(curl -s -X POST http://localhost:8080/api/dialog \
    -H "Content-Type: application/json" \
    -d "{\"topic\":\"$TOPIC\",\"category\":\"$CATEGORY\",\"mode\":\"simulation\"}")
  
  if echo "$RESPONSE" | grep -q '"ok":true' && echo "$RESPONSE" | grep -q 'simulation_steps'; then
    echo "  ✅ Simulation mode: PASS"
    PASSED=$((PASSED + 1))
    
    # Validate simulation schema
    if echo "$RESPONSE" | grep -q 'interaction_points' && \
       echo "$RESPONSE" | grep -q 'vitals_timeline' && \
       echo "$RESPONSE" | grep -q 'branching_logic'; then
      echo "  ✅ Simulation schema: PASS"
      PASSED=$((PASSED + 1))
    else
      echo "  ❌ Simulation schema: FAIL (missing required fields)"
      ERRORS=$((ERRORS + 1))
    fi
  else
    echo "  ❌ Simulation mode: FAIL"
    ERRORS=$((ERRORS + 1))
  fi
  
  # Validate region guidelines
  echo "  Validating region guidelines..."
  if echo "$RESPONSE" | grep -q 'guidelines'; then
    echo "  ✅ Region guidelines: PASS"
    PASSED=$((PASSED + 1))
  else
    echo "  ❌ Region guidelines: FAIL"
    ERRORS=$((ERRORS + 1))
  fi
done

echo ""
echo "=========================================="
echo "📊 Test Results:"
echo "  Passed: $PASSED"
echo "  Failed: $ERRORS"
echo "  Total:  $((PASSED + ERRORS))"
echo ""

if [ $ERRORS -eq 0 ]; then
  echo "✅ All tests passed!"
  exit 0
else
  echo "❌ Some tests failed"
  exit 1
fi

