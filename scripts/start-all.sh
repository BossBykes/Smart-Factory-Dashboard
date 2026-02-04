#!/bin/bash
echo " Starting Complete Smart Factory System..."

# Start backend in background
gnome-terminal --tab --title="Backend" -- bash -c "cd ~/smart-factory-dashboard/backend && npm run dev; exec bash"

# Wait a moment for backend to start
sleep 3

# Start frontend in new tab
gnome-terminal --tab --title="Frontend" -- bash -c "cd ~/smart-factory-dashboard/frontend && npm run dev; exec bash"

echo " Smart Factory Dashboard started!"
echo " Frontend: http://localhost:3000"
echo " Backend: http://localhost:3000/health"
echo " WebSocket: ws://localhost:3001"
