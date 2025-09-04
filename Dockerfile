FROM node:20-alpine AS base

# 開発用ステージ
FROM base AS development
WORKDIR /app

# 依存関係のインストール
COPY package.json package-lock.json ./
RUN npm ci

# アプリケーションコードのコピー
COPY . .

# Prisma生成
RUN npx prisma generate

ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1

EXPOSE 3000
CMD ["npm", "run", "dev"]