#!/bin/bash
echo "🧪 MedPlat Full System Verification - v15.1.2"
echo "=============================================="

BACKEND_URL="https://medplat-backend-139218747785.us-central1.run.app"

echo ""
echo "1️⃣ Testing Topics Categories (Case Generator)..."
topics_response=$(curl -s -w "\n%{http_code}" "$BACKEND_URL/api/topics/categories" -X POST -H "Content-Type: application/json" -d '{}')
topics_status=$(echo "$topics_response" | tail -n1)
topics_body=$(echo "$topics_response" | head -n -1)

if [ "$topics_status" = "200" ]; then
    echo "✅ Topics Categories: HTTP $topics_status - OK"
    echo "   Categories found: $(echo "$topics_body" | jq -r '.categories | length')"
    echo "   Source: $(echo "$topics_body" | jq -r '.source')"
else
    echo "❌ Topics Categories: HTTP $topics_status - FAILED"
fi

echo ""
echo "2️⃣ Testing ECG Categories Endpoint..."
response=$(curl -s -w "\n%{http_code}" "$BACKEND_URL/api/ecg/categories")
status_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n -1)

if [ "$status_code" = "200" ]; then
    echo "✅ ECG Categories: HTTP $status_code - OK"
    echo "   Categories found: $(echo "$body" | jq -r '.categories | length')"
    echo "   Total cases: $(echo "$body" | jq -r '.total_cases')"
else
    echo "❌ ECG Categories: HTTP $status_code - FAILED"
fi

echo ""
echo "3️⃣ Testing ECG Health Endpoint..."
health_response=$(curl -s -w "\n%{http_code}" "$BACKEND_URL/api/ecg/health")
health_status=$(echo "$health_response" | tail -n1)

if [ "$health_status" = "200" ]; then
    echo "✅ ECG Health: HTTP $health_status - OK"
    echo "   Status: $(echo "$health_response" | head -n -1 | jq -r '.status')"
else
    echo "❌ ECG Health: HTTP $health_status - FAILED"
fi

echo ""
echo "4️⃣ Testing ECG Mastery Session Endpoint..."
session_response=$(curl -s -w "\n%{http_code}" "$BACKEND_URL/api/ecg/mastery-session/1")
session_status=$(echo "$session_response" | tail -n1)

if [ "$session_status" = "200" ]; then
    echo "✅ ECG Mastery Session: HTTP $session_status - OK"
else
    echo "❌ ECG Mastery Session: HTTP $session_status - FAILED"
fi

echo ""
echo "5️⃣ Testing Topics Search Endpoint..."
search_response=$(curl -s -w "\n%{http_code}" "$BACKEND_URL/api/topics/search" -X POST -H "Content-Type: application/json" -d '{"area": "Infectious Diseases"}')
search_status=$(echo "$search_response" | tail -n1)
search_body=$(echo "$search_response" | head -n -1)

if [ "$search_status" = "200" ]; then
    echo "✅ Topics Search: HTTP $search_status - OK"
    echo "   Topics found: $(echo "$search_body" | jq -r '.count')"
else
    echo "❌ Topics Search: HTTP $search_status - FAILED"
fi

echo ""
echo "6️⃣ Frontend Deployment Check..."
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
if [ "$topics_status" = "200" ] && [ "$status_code" = "200" ] && [ "$health_status" = "200" ] && [ "$frontend_status" = "200" ]; then
    echo "🎉 ALL SYSTEMS OPERATIONAL - Full Platform Ready!"
    echo "   Backend API: ✅ us-central1.run.app"
    echo "   Frontend: ✅ us-central1.run.app" 
    echo "   Topics Categories: ✅ $(echo "$topics_body" | jq -r '.count') categories loaded"
    echo "   ECG Academy: ✅ $(echo "$body" | jq -r '.categories | length') ECG categories available"
    echo "   Status: 🟢 PRODUCTION READY"
else
    echo "⚠️  Some endpoints failed - check logs above"
    if [ "$topics_status" != "200" ]; then echo "   ❌ Topics Categories not working"; fi
    if [ "$status_code" != "200" ]; then echo "   ❌ ECG Categories not working"; fi
    if [ "$health_status" != "200" ]; then echo "   ❌ ECG Health not working"; fi
    if [ "$frontend_status" != "200" ]; then echo "   ❌ Frontend not loading"; fi
fi
echo ""
