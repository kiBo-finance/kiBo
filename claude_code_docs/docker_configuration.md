# Docker設定 - kiBoアプリ

## 概要

kiBoアプリを開発からプロダクションまで完全にDockerで管理します。マルチステージビルドとDockerComposeを使用して、効率的で一貫性のある環境を構築します。

## ファイル構成

```
kibo/
├── Dockerfile                 # メインのDockerfile
├── docker-compose.yml         # 開発環境用
├── docker-compose.prod.yml    # プロダクション環境用
├── docker/
│   ├── nginx/
│   │   ├── Dockerfile
│   │   └── nginx.conf
│   ├── postgres/
│   │   └── init.sql
│   └── redis/
│       └── redis.conf
├── .dockerignore
└── scripts/
    ├── docker-dev.sh
    ├── docker-prod.sh
    └── backup.sh
```

## メインDockerfile

```dockerfile
# Dockerfile
FROM node:20-alpine AS base

# 依存関係インストール用ステージ
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# パッケージファイルコピー
COPY package.json package-lock.json* ./
RUN npm ci --only=production && npm cache clean --force

# 開発依存関係込みインストール
FROM base AS deps-dev
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# ビルド用ステージ
FROM base AS builder
WORKDIR /app
COPY --from=deps-dev /app/node_modules ./node_modules
COPY . .

# 環境変数設定（ビルド時）
ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_ENV production

# Prisma生成とビルド実行
RUN npx prisma generate
RUN npm run build

# プロダクション実行用ステージ
FROM base AS runner
WORKDIR /app

# セキュリティ: 非rootユーザー作成
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 必要なファイルをコピー
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

# 自動的に生成されたスタンドアローンファイルを活用
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Prisma関連ファイル
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# 実行スクリプト作成
COPY --chmod=755 <<EOF /app/start.sh
#!/bin/sh
set -e

echo "Starting kiBoアプリ..."

# データベースマイグレーション実行
if [ "\$NODE_ENV" = "production" ]; then
  echo "Running production migrations..."
  npx prisma migrate deploy
else
  echo "Running development migrations..."
  npx prisma migrate dev --name init || true
fi

# シードデータ実行（プロダクション以外）
if [ "\$NODE_ENV" != "production" ]; then
  echo "Running seed data..."
  npx prisma db seed || true
fi

echo "Starting Next.js server..."
exec node server.js
EOF

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["/app/start.sh"]

# 開発用ステージ
FROM deps-dev AS development
WORKDIR /app
COPY . .

# 開発用の追加パッケージ
RUN apk add --no-cache curl

ENV NODE_ENV development
ENV NEXT_TELEMETRY_DISABLED 1

EXPOSE 3000
CMD ["npm", "run", "dev"]
```

## 開発環境用 Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  # Next.js アプリケーション（開発モード）
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: development
    ports:
      - '3000:3000'
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://kibo_user:kibo_password@postgres:5432/kibo_dev
      - BETTER_AUTH_URL=http://localhost:3000
      - BETTER_AUTH_SECRET=dev-secret-key-minimum-32-characters-long
      - EXCHANGE_RATE_API_KEY=${EXCHANGE_RATE_API_KEY}
      - REDIS_URL=redis://redis:6379
    volumes:
      - .:/app
      - /app/node_modules
      - /app/.next
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - kibo-network
    restart: unless-stopped
    develop:
      watch:
        - action: sync
          path: ./src
          target: /app/src
        - action: rebuild
          path: ./package.json

  # PostgreSQL データベース
  postgres:
    image: postgres:16-alpine
    ports:
      - '5432:5432'
    environment:
      POSTGRES_DB: kibo_dev
      POSTGRES_USER: kibo_user
      POSTGRES_PASSWORD: kibo_password
      POSTGRES_INITDB_ARGS: '--encoding=UTF-8 --locale=C'
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./docker/postgres/init.sql:/docker-entrypoint-initdb.d/init.sql
    networks:
      - kibo-network
    restart: unless-stopped
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U kibo_user -d kibo_dev']
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis（セッション・キャッシュ用）
  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
    volumes:
      - redis_data:/data
      - ./docker/redis/redis.conf:/etc/redis/redis.conf
    command: redis-server /etc/redis/redis.conf
    networks:
      - kibo-network
    restart: unless-stopped
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 10s
      timeout: 5s
      retries: 3

  # Prisma Studio（開発時のDB管理）
  prisma-studio:
    build:
      context: .
      dockerfile: Dockerfile
      target: development
    ports:
      - '5555:5555'
    environment:
      - DATABASE_URL=postgresql://kibo_user:kibo_password@postgres:5432/kibo_dev
    volumes:
      - .:/app
      - /app/node_modules
    command: npx prisma studio --port 5555 --hostname 0.0.0.0
    depends_on:
      - postgres
    networks:
      - kibo-network
    profiles:
      - tools

  # メール開発サーバー（Mailhog）
  mailhog:
    image: mailhog/mailhog:latest
    ports:
      - '1025:1025' # SMTP
      - '8025:8025' # Web UI
    networks:
      - kibo-network
    profiles:
      - tools

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local

networks:
  kibo-network:
    driver: bridge
```

## プロダクション環境用 Docker Compose

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  # Nginx リバースプロキシ
  nginx:
    build:
      context: ./docker/nginx
      dockerfile: Dockerfile
    ports:
      - '80:80'
      - '443:443'
    volumes:
      - ./docker/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./docker/nginx/ssl:/etc/nginx/ssl:ro
      - static_files:/app/public:ro
    depends_on:
      - app
    networks:
      - kibo-network
    restart: unless-stopped
    logging:
      driver: 'json-file'
      options:
        max-size: '10m'
        max-file: '3'

  # Next.js アプリケーション（プロダクション）
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: runner
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
      - BETTER_AUTH_URL=${BETTER_AUTH_URL}
      - BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET}
      - EXCHANGE_RATE_API_KEY=${EXCHANGE_RATE_API_KEY}
      - REDIS_URL=redis://redis:6379
      - NEXT_TELEMETRY_DISABLED=1
    volumes:
      - static_files:/app/public
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - kibo-network
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '0.5'
        reservations:
          memory: 512M
          cpus: '0.25'
    logging:
      driver: 'json-file'
      options:
        max-size: '10m'
        max-file: '3'
    healthcheck:
      test: ['CMD', 'wget', '--quiet', '--tries=1', '--spider', 'http://localhost:3000/api/health']
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s

  # PostgreSQL データベース（プロダクション）
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_INITDB_ARGS: '--encoding=UTF-8 --locale=C'
    volumes:
      - postgres_prod_data:/var/lib/postgresql/data
      - ./backups:/backups
    networks:
      - kibo-network
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '1.0'
    logging:
      driver: 'json-file'
      options:
        max-size: '50m'
        max-file: '5'
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}']
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis（プロダクション）
  redis:
    image: redis:7-alpine
    volumes:
      - redis_prod_data:/data
      - ./docker/redis/redis.conf:/etc/redis/redis.conf
    command: redis-server /etc/redis/redis.conf --appendonly yes
    networks:
      - kibo-network
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.25'
    logging:
      driver: 'json-file'
      options:
        max-size: '10m'
        max-file: '3'
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 30s
      timeout: 10s
      retries: 3

  # バックアップサービス
  backup:
    image: postgres:16-alpine
    environment:
      PGPASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - ./backups:/backups
      - ./scripts/backup.sh:/backup.sh
    command: >
      sh -c "
        apk add --no-cache dcron &&
        echo '0 2 * * * /backup.sh' > /etc/crontabs/root &&
        crond -f
      "
    depends_on:
      - postgres
    networks:
      - kibo-network
    restart: unless-stopped
    profiles:
      - backup

volumes:
  postgres_prod_data:
    driver: local
  redis_prod_data:
    driver: local
  static_files:
    driver: local

networks:
  kibo-network:
    driver: bridge
```

## Nginx設定

```dockerfile
# docker/nginx/Dockerfile
FROM nginx:1.25-alpine

# 必要なパッケージをインストール
RUN apk add --no-cache openssl

# SSL証明書生成（開発用）
RUN mkdir -p /etc/nginx/ssl && \
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/nginx.key \
    -out /etc/nginx/ssl/nginx.crt \
    -subj "/C=JP/ST=Tokyo/L=Tokyo/O=kiBoApp/CN=localhost"

COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
```

```nginx
# docker/nginx/nginx.conf
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # ログフォーマット
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    # パフォーマンス設定
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 10M;

    # Gzip圧縮
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;

    # セキュリティヘッダー
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;

    upstream app {
        server app:3000 max_fails=3 fail_timeout=30s;
        keepalive 32;
    }

    server {
        listen 80;
        server_name localhost;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name localhost;

        # SSL設定
        ssl_certificate /etc/nginx/ssl/nginx.crt;
        ssl_certificate_key /etc/nginx/ssl/nginx.key;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;

        # Next.js アプリケーション
        location / {
            proxy_pass http://app;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
            proxy_connect_timeout 30s;
            proxy_send_timeout 30s;
            proxy_read_timeout 30s;
        }

        # API Rate Limiting
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # 認証API専用レート制限
        location /api/auth/ {
            limit_req zone=login burst=5 nodelay;
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # 静的ファイル
        location /_next/static {
            proxy_cache_valid 200 1d;
            proxy_pass http://app;
        }

        # ヘルスチェック
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }
    }
}
```

## 環境変数設定

```env
# .env.docker.dev
NODE_ENV=development
DATABASE_URL=postgresql://kibo_user:kibo_password@postgres:5432/kibo_dev
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=dev-secret-key-minimum-32-characters-long
EXCHANGE_RATE_API_KEY=your-api-key
REDIS_URL=redis://redis:6379
```

```env
# .env.docker.prod
NODE_ENV=production
POSTGRES_DB=kibo_prod
POSTGRES_USER=kibo_user
POSTGRES_PASSWORD=your-secure-password-here
DATABASE_URL=postgresql://kibo_user:your-secure-password-here@postgres:5432/kibo_prod
BETTER_AUTH_URL=https://your-domain.com
BETTER_AUTH_SECRET=your-super-secure-secret-key-minimum-32-characters
EXCHANGE_RATE_API_KEY=your-production-api-key
REDIS_URL=redis://redis:6379
```

## Docker補助設定

```dockerignore
# .dockerignore
Dockerfile*
docker-compose*
.dockerignore
.git
.gitignore
README.md
.env
.env.*
coverage
.nyc_output
node_modules
npm-debug.log*
.next
.cache
.vscode
.idea
```

## 運用スクリプト

```bash
#!/bin/bash
# scripts/docker-dev.sh
set -e

echo "🚀 Starting kiBoアプリ development environment..."

# 環境変数ファイル確認
if [ ! -f .env.docker.dev ]; then
    echo "❌ .env.docker.dev file not found!"
    exit 1
fi

# Docker Compose実行
docker-compose --env-file .env.docker.dev up --build

echo "✅ Development environment started!"
echo "📱 App: http://localhost:3000"
echo "🗄️  DB Admin: http://localhost:5555 (run with --profile tools)"
echo "📧 Mail: http://localhost:8025 (run with --profile tools)"
```

```bash
#!/bin/bash
# scripts/docker-prod.sh
set -e

echo "🚀 Starting kiBoアプリ production environment..."

# 環境変数ファイル確認
if [ ! -f .env.docker.prod ]; then
    echo "❌ .env.docker.prod file not found!"
    exit 1
fi

# プロダクションビルド
echo "📦 Building production images..."
docker-compose -f docker-compose.prod.yml --env-file .env.docker.prod build

# データベースマイグレーション
echo "🗄️  Running database migrations..."
docker-compose -f docker-compose.prod.yml --env-file .env.docker.prod run --rm app npx prisma migrate deploy

# プロダクション起動
echo "🏃 Starting production services..."
docker-compose -f docker-compose.prod.yml --env-file .env.docker.prod up -d

echo "✅ Production environment started!"
echo "🌐 App: https://localhost"
```

```bash
#!/bin/bash
# scripts/backup.sh
set -e

BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
POSTGRES_HOST=${POSTGRES_HOST:-postgres}
POSTGRES_DB=${POSTGRES_DB:-kibo_prod}
POSTGRES_USER=${POSTGRES_USER:-kibo_user}

echo "🗄️  Starting backup at $DATE..."

# データベースバックアップ
pg_dump -h $POSTGRES_HOST -U $POSTGRES_USER -d $POSTGRES_DB -f "$BACKUP_DIR/kibo_backup_$DATE.sql"

# 古いバックアップ削除（30日以上古い）
find $BACKUP_DIR -name "kibo_backup_*.sql" -type f -mtime +30 -delete

echo "✅ Backup completed: kibo_backup_$DATE.sql"
```

## Next.js設定更新

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
  },
  // Docker用の設定
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
  // パフォーマンス最適化
  compress: true,
  poweredByHeader: false,
  generateEtags: false,
  // 画像最適化
  images: {
    domains: ['localhost'],
    formats: ['image/webp', 'image/avif'],
  },
  // セキュリティヘッダー
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
```

## ヘルスチェックAPI

```typescript
// app/api/health/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    // データベース接続確認
    await prisma.$queryRaw`SELECT 1`

    const healthCheck = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'kiBoアプリ',
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV,
      database: 'connected',
    }

    return NextResponse.json(healthCheck, { status: 200 })
  } catch (error) {
    const healthCheck = {
      status: 'error',
      timestamp: new Date().toISOString(),
      service: 'kiBoアプリ',
      error: error instanceof Error ? error.message : 'Unknown error',
      database: 'disconnected',
    }

    return NextResponse.json(healthCheck, { status: 503 })
  }
}
```

## 使用方法

### 開発環境起動

```bash
# 基本開発環境
chmod +x scripts/docker-dev.sh
./scripts/docker-dev.sh

# 開発ツール込み
docker-compose --env-file .env.docker.dev --profile tools up
```

### プロダクション環境起動

```bash
# プロダクション環境
chmod +x scripts/docker-prod.sh
./scripts/docker-prod.sh

# バックアップ有効化
docker-compose -f docker-compose.prod.yml --env-file .env.docker.prod --profile backup up -d
```

### 運用コマンド

```bash
# ログ確認
docker-compose logs -f app

# データベースアクセス
docker-compose exec postgres psql -U kibo_user -d kibo_dev

# アプリケーションシェル
docker-compose exec app sh

# 手動バックアップ
docker-compose -f docker-compose.prod.yml exec backup /backup.sh
```

これにより、完全にDockerで管理された開発・プロダクション環境が構築できます。セキュリティ、パフォーマンス、運用性すべてに配慮した設定になっています。
