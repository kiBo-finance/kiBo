# kiBoアプリ デプロイガイド

## 概要

kiBoアプリは複数のプラットフォームでデプロイ可能です。このドキュメントではプラットフォーム別の設定方法を説明します。

## 環境変数

すべてのプラットフォームで以下の環境変数が必要です：

```bash
# データベース
DATABASE_URL="postgresql://username:password@host:port/database"

# 認証
BETTER_AUTH_SECRET="your-secret-key-minimum-32-characters"
BETTER_AUTH_URL="https://your-domain.com"

# 通知システム
NOTIFICATION_API_KEY="your-secure-api-key-for-cron-jobs"

# オプション
EXCHANGE_RATE_API_KEY="your-exchange-rate-api-key"
```

## 定期実行（Cron Jobs）設定

予定取引のリマインダー機能には定期実行が必要です。プラットフォーム別の設定方法：

### 1. Vercel

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/notifications/send-reminders",
      "schedule": "0 9 * * *"
    }
  ]
}
```

### 2. Netlify

```toml
# netlify.toml
[build]
  functions = "api"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200

# Netlify Scheduled Functions
# Create: netlify/functions/send-reminders.js
```

Netlify用の関数ファイルを作成：

```javascript
// netlify/functions/send-reminders.js
exports.handler = async (event, context) => {
  const response = await fetch(`${process.env.BETTER_AUTH_URL}/api/notifications/send-reminders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.NOTIFICATION_API_KEY}`,
    },
  })

  return {
    statusCode: 200,
    body: JSON.stringify({ success: true }),
  }
}
```

### 3. Railway

Railway Cronを使用：

```yaml
# railway.toml
[build]
  builder = "NIXPACKS"

[deploy]
  healthcheckPath = "/api/health"

# Cron job設定はRailway UIから設定
# URL: https://your-app.railway.app/api/notifications/send-reminders
# Schedule: 0 9 * * *
# Headers: Authorization: Bearer YOUR_NOTIFICATION_API_KEY
```

### 4. DigitalOcean App Platform

```yaml
# .do/app.yaml
name: kibo-app
services:
- name: web
  source_dir: /
  github:
    repo: your-username/kibo-app
    branch: main
  run_command: npm start
  environment_slug: node-js
  instance_count: 1
  instance_size_slug: basic-xxs

jobs:
- name: send-reminders
  source_dir: /
  github:
    repo: your-username/kibo-app
    branch: main
  run_command: curl -X POST -H "Authorization: Bearer $NOTIFICATION_API_KEY" $BETTER_AUTH_URL/api/notifications/send-reminders
  schedule: "0 9 * * *"
```

### 5. 外部Cronサービス

#### EasyCron

```bash
# URL設定
POST https://your-domain.com/api/notifications/send-reminders

# Headers
Authorization: Bearer YOUR_NOTIFICATION_API_KEY
Content-Type: application/json

# Schedule: 0 9 * * * (毎日9:00AM)
```

#### cron-job.org

```bash
URL: https://your-domain.com/api/notifications/send-reminders
Method: POST
Headers: Authorization=Bearer YOUR_NOTIFICATION_API_KEY
Schedule: 0 9 * * *
```

### 6. 自前サーバー（Ubuntu/CentOS）

```bash
# crontabに追加
crontab -e

# 毎日9:00AMに実行
0 9 * * * curl -X POST \
  -H "Authorization: Bearer YOUR_NOTIFICATION_API_KEY" \
  https://your-domain.com/api/notifications/send-reminders
```

### 7. Docker + Kubernetes

```yaml
# k8s-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: kibo-reminders
spec:
  schedule: '0 9 * * *'
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: reminder-job
              image: curlimages/curl
              args:
                - /bin/sh
                - -c
                - >
                  curl -X POST 
                  -H "Authorization: Bearer $NOTIFICATION_API_KEY" 
                  https://your-domain.com/api/notifications/send-reminders
              env:
                - name: NOTIFICATION_API_KEY
                  valueFrom:
                    secretKeyRef:
                      name: kibo-secrets
                      key: notification-api-key
          restartPolicy: OnFailure
```

## 手動実行での動作確認

デプロイ後、以下のコマンドで動作確認：

```bash
# ヘルスチェック
curl https://your-domain.com/api/health

# リマインダー送信テスト
curl -X POST \
  -H "Authorization: Bearer YOUR_NOTIFICATION_API_KEY" \
  -H "Content-Type: application/json" \
  https://your-domain.com/api/notifications/send-reminders
```

## プラットフォーム選択の考慮点

### Vercel ✅

- 簡単デプロイ
- 組み込みCron機能
- Hobby プラン制限あり

### Netlify ✅

- 静的サイト最適化
- Functions + Scheduled Functions
- 制限がやや厳しい

### Railway ✅

- フルスタックアプリに最適
- PostgreSQL統合
- スケーラブル

### DigitalOcean ✅

- 柔軟な設定
- 予測可能な料金
- Managed Database対応

### 自前サーバー ✅

- 完全制御
- カスタマイズ自由
- 運用負荷高

## データベースマイグレーション

### マイグレーションの概要

本プロジェクトではPrisma Migrateを使用してデータベーススキーマを管理しています。

### 開発環境

```bash
# マイグレーションの作成と適用
bun run db:migrate

# スキーマの直接プッシュ（マイグレーション履歴なし）
bun run db:push

# マイグレーション状態の確認
bunx prisma migrate status
```

### 本番環境へのデプロイ

本番環境へのデプロイ時は、以下の手順でマイグレーションを適用します：

```bash
# 本番データベースにマイグレーションを適用
bunx prisma migrate deploy
```

**重要**: `migrate deploy` は以下の点で `migrate dev` と異なります：
- マイグレーションファイルを自動作成しません
- 既存のマイグレーションファイルのみを適用します
- 本番環境での使用に適しています

### 新規データベースのセットアップ

新しい環境でデータベースを初期化する場合：

```bash
# マイグレーションの適用
bunx prisma migrate deploy

# 初期データの投入（通貨マスターなど）
bun run db:seed
```

### マイグレーション作成のベストプラクティス

1. **開発環境でマイグレーションを作成**
   ```bash
   bunx prisma migrate dev --name describe_your_changes
   ```

2. **マイグレーションファイルをコミット**
   ```bash
   git add prisma/migrations
   git commit -m "Add migration: describe_your_changes"
   ```

3. **本番環境でデプロイ**
   ```bash
   bunx prisma migrate deploy
   ```

### トラブルシューティング

#### マイグレーションの競合

複数の開発者が同時にマイグレーションを作成した場合：

```bash
# ローカルのマイグレーションを一度リセット
bunx prisma migrate reset --skip-seed

# 最新のマイグレーションを取得してから再作成
git pull origin main
bunx prisma migrate dev --name your_changes
```

#### 既存データベースのベースライン設定

`db push` を使用していた既存データベースをマイグレーション管理に移行する場合：

```bash
# ベースラインマイグレーションを作成（適用はスキップ）
bunx prisma migrate dev --name initial_baseline --create-only

# 既に適用済みとしてマーク
bunx prisma migrate resolve --applied [migration_name]
```

## 推奨構成

**小規模・個人利用**: Vercel + PlanetScale
**中規模・チーム利用**: Railway + Railway PostgreSQL
**大規模・企業利用**: DigitalOcean + Managed PostgreSQL
