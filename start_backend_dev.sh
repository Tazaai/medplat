#!/bin/bash
# Simple backend starter with env from .env.local

cd /workspaces/medplat

# Parse .env.local and export vars
while IFS='=' read -r key value; do
  # Skip comments and empty lines
  [[ "$key" =~ ^#.*$ ]] && continue
  [[ -z "$key" ]] && continue
  
  # Remove quotes from value
  value="${value%\"}"
  value="${value#\"}"
  
  export "$key=$value"
done < <(cat .env.local)

cd backend
PORT=8080 node index.js
