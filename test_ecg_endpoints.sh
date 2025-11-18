#!/bin/bash
echo "🧪 ECG Academy Endpoint Verification - v15.1.1"
echo "================================================"

BACKEND_URL="https://medplat-backend-139218747785.us-central1.run.app"

echo ""
echo "1️⃣ Testing ECG Categories Endpoint..."
response=$(curl -s -w "\n%{http_code}" "$BACKEND_URL/api/ecg/categories")
status_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n -1)

if [ "$status_code" = "200" ]; then
    echo "✅ Categories: HTTP $status_code - OK"
    echo "   Categories found: $(echo "$body" | jq -r '.categories | length')"
    echo "   Total cases: $(echo "$body" | jq -r '.total_cases')"
else
    echo "❌ Categories: HTTP $status_code - FAILED"
fi

echo ""
echo "2️⃣ Testing ECG Health Endpoint..."
health_response=$(curl -s -w "\n%{http_code}" "$BACKEND_URL/api/ecg/health")
health_status=$(echo "$health_response" | tail -n1)

if [ "$health_status" = "200" ]; then
    echo "✅ Health: HTTP $health_status - OK"
    echo "   Status: $(echo "$health_response" | head -n -1 | jq -r '.status')"
else
    echo "❌ Health: HTTP $health_status - FAILED"
fi

echo ""
echo "3️⃣ Testing ECG Mastery Session Endpoint..."
session_response=$(curl -s -w "\n%{http_code}" "$BACKEND_URL/api/ecg/mastery-session/1")
session_status=$(echo "$session_response" | tail -n1)

if [ "$session_status" = "200" ]; then
    echo "✅ Mastery Session: HTTP $session_status - OK"
else
    echo "❌ Mastery Session: HTTP $session_status - FAILED"
fi

echo ""
echo "4️⃣ Frontend Deployment Check..."
frontend_response=$(curl -s -w "\n%{http_code}" "https://medplat-frontend-139218747785.us-central1.run.app/")
frontend_status=$(echo "$frontend_response" | tail -n1)

if [ "$frontend_status" = "200" ]; then
    echo "✅ Frontend: HTTP $frontend_status - OK"
    if echo "$frontend_response" | head -n -1 | grep -q "MedPlat"; then
        echo "   Page title: MedPlat found ✓"
    fi
else
    echo "❌ Frontend: HTTP $frontend_status - FAILED"
fi

echo ""
echo "🎯 Summary:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ "$status_code" = "200" ] && [ "$health_status" = "200" ] && [ "$frontend_status" = "200" ]; then
    echo "🎉 ALL SYSTEMS OPERATIONAL - ECG Academy Ready!"
    echo "   Backend API: ✅ us-central1.run.app"
    echo "   Frontend: ✅ us-central1.run.app" 
    echo "   ECG Categories: ✅ Loading properly"
    echo "   Status: 🟢 PRODUCTION READY"
else
    echo "⚠️  Some endpoints failed - check logs above"
fi
echo ""
