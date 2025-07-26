#!/bin/bash

echo "Testing backend server..."
cd /Users/wyn/dev/ai/financial-management-agents/backend

echo "Current directory: $(pwd)"
echo "Files in directory:"
ls -la

echo "Testing Node.js:"
node -v

echo "Testing npm:"
npm -v

echo "Testing if package.json exists:"
if [ -f package.json ]; then
  echo "✓ package.json exists"
else
  echo "✗ package.json missing"
fi

echo "Testing if tsx is available:"
if [ -f node_modules/.bin/tsx ]; then
  echo "✓ tsx available"
else
  echo "✗ tsx missing"
fi

echo "Attempting to run server..."
npx tsx src/server.ts 2>&1 | head -20
