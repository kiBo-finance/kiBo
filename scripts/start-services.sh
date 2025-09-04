#!/bin/bash

# Prisma Studioをバックグラウンドで起動
echo "Starting Prisma Studio..."
nohup npm run db:studio > /dev/null 2>&1 &

# プロセスIDを保存
echo $! > /tmp/prisma-studio.pid

echo "Prisma Studio started at http://localhost:5555"
echo "PID: $(cat /tmp/prisma-studio.pid)"