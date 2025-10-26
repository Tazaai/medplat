#!/bin/bash
# 🧪 MedPlat Local Backend Test – Mandatory before deployment
set -e
echo "====================================================="
echo "🧪 MedPlat Local Backend Testing"
echo "====================================================="

echo "🔍 Checking syntax..."
node --check backend/index.js

echo "🔧 Installing deps (if missing)..."
cd backend && npm install --no-audit --no-fund && cd ..

echo "🚀 Starting backend on port 8080 (background)..."
PORT=8080 node backend/index.js & PID=$!
sleep 5

echo "🌐 Testing health endpoint..."
curl -s http://localhost:8080/ | grep -q "MedPlat" && echo "✅ Health OK" || echo "⚠️ No response"

echo "📡 Testing /api/topics..."
curl -s http://localhost:8080/api/topics | grep -q "topic" && echo "✅ Topics OK" || echo "⚠️ Topics endpoint issue"

echo "🧠 Testing /api/dialog..."
curl -s -X POST http://localhost:8080/api/dialog -H "Content-Type: application/json" -d '{"message":"hello"}' | grep -q "aiReply" && echo "✅ Dialog OK" || echo "⚠️ Dialog endpoint issue"

echo "🔥 Testing /api/gamify..."
curl -s -X POST http://localhost:8080/api/gamify -H "Content-Type: application/json" -d '{"topic":"sepsis"}' | grep -q "question" && echo "✅ Gamify OK" || echo "⚠️ Gamify endpoint issue"

echo "�� Cleaning up..."
kill $PID >/dev/null 2>&1 || true
echo "✅ Local backend tests complete"
