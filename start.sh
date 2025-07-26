#!/bin/bash
# Start backend and frontend dev servers

cd "$(dirname "$0")"

# Start backend
cd backend
npm run dev &
BACKEND_PID=$!
cd ..

# Start frontend
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

# Wait for both processes
trap "kill $BACKEND_PID $FRONTEND_PID" EXIT
wait $BACKEND_PID
wait $FRONTEND_PID
