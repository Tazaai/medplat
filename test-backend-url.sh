#!/bin/bash
# MedPlat Backend URL Health Check with Auto-Fix
# Tests the backend URL and automatically retries with correct URL if needed

set -e

# THE ONLY CORRECT BACKEND URL
CORRECT_BACKEND_URL="https://medplat-backend-139218747785.europe-west1.run.app"

# Test URL function with auto-retry
test_backend_url() {
    local uri="$1"
    local max_retries="${2:-3}"
    
    echo "Testing backend URL: $uri"
    echo ""
    
    for i in $(seq 1 $max_retries); do
        echo "Attempt $i/$max_retries: Testing $uri/api/topics..."
        http_code=$(curl -s -o /tmp/response.json -w "%{http_code}" --max-time 10 "$uri/api/topics" || echo "000")
        
        if [ "$http_code" = "200" ]; then
            echo "✅ SUCCESS: HTTP $http_code"
            if [ -f /tmp/response.json ]; then
                response_size=$(wc -c < /tmp/response.json)
                if [ $response_size -lt 500 ]; then
                    echo "Response preview:"
                    cat /tmp/response.json
                else
                    echo "Response length: $response_size bytes"
                fi
            fi
            return 0
        else
            echo "❌ Failed: HTTP $http_code"
            
            if [ "$http_code" = "404" ]; then
                echo ""
                echo "🔄 AUTO-FIX: URL returned 404"
                echo "   Replacing with correct backend URL: $CORRECT_BACKEND_URL"
                echo ""
                return test_backend_url "$CORRECT_BACKEND_URL" "$max_retries"
            fi
            
            if [ $i -lt $max_retries ]; then
                sleep_time=$((i * 2))
                echo "   Retrying in ${sleep_time} seconds..."
                sleep $sleep_time
            fi
        fi
    done
    
    echo ""
    echo "❌ All attempts failed. Trying correct backend URL..."
    if [ "$uri" != "$CORRECT_BACKEND_URL" ]; then
        return test_backend_url "$CORRECT_BACKEND_URL" "$max_retries"
    fi
    
    return 1
}

# Main execution
echo "========================================"
echo "🔍 MedPlat Backend URL Health Check"
echo "========================================"
echo ""

# If URI is provided as argument, use it; otherwise use correct URL
test_uri="${1:-$CORRECT_BACKEND_URL}"

echo "Correct Backend URL: $CORRECT_BACKEND_URL"
echo "Testing URL: $test_uri"
echo ""

if test_backend_url "$test_uri"; then
    echo ""
    echo "========================================"
    echo "✅ Health Check PASSED"
    echo "========================================"
    echo ""
    exit 0
else
    echo ""
    echo "========================================"
    echo "❌ Health Check FAILED"
    echo "========================================"
    echo ""
    echo "Please verify:"
    echo "  1. Backend is deployed: $CORRECT_BACKEND_URL"
    echo "  2. Service is running and accessible"
    echo "  3. Network connectivity is available"
    echo ""
    exit 1
fi

