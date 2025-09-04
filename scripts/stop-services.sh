#!/bin/bash

# Prisma Studioを停止
if [ -f /tmp/prisma-studio.pid ]; then
    PID=$(cat /tmp/prisma-studio.pid)
    if kill -0 $PID 2>/dev/null; then
        echo "Stopping Prisma Studio (PID: $PID)..."
        kill $PID
        rm /tmp/prisma-studio.pid
        echo "Prisma Studio stopped."
    else
        echo "Prisma Studio process not found."
        rm /tmp/prisma-studio.pid
    fi
else
    echo "Prisma Studio PID file not found."
fi