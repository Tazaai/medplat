#!/bin/bash
echo "🚀 Starter OpenAI-case-generator..."
mkdir -p cases
npm install openai dotenv --omit=dev
node generate_cases_openai.mjs
