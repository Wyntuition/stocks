#!/bin/bash

echo "Testing Stock Portfolio API..."

# Test health endpoint
echo "1. Testing health endpoint..."
curl -s http://localhost:3001/health | head -3

echo -e "\n2. Testing portfolio endpoints..."
curl -s http://localhost:3001/api/portfolio | head -3

echo -e "\n3. Testing portfolio summary..."
curl -s http://localhost:3001/api/portfolio/summary | head -3

echo -e "\nAPI tests completed!"
