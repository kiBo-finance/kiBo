# Bun公式イメージをベースに使用
FROM oven/bun:1 AS base

# 開発用ステージ
FROM base AS development
WORKDIR /app

# 依存関係のインストール
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# アプリケーションコードのコピー
COPY . .

# Prisma生成
RUN bunx prisma generate

ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1

EXPOSE 3000
CMD ["bun", "run", "dev"]

# 本番用ビルドステージ
FROM base AS builder
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bunx prisma generate
RUN bun run build

# 本番用ステージ
FROM base AS production
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 本番用依存関係のみインストール
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# ビルド成果物とPrismaクライアントをコピー
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000
CMD ["bun", "run", "start"]
