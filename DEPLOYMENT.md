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
      'Authorization': `Bearer ${process.env.NOTIFICATION_API_KEY}`
    }
  });
  
  return {
    statusCode: 200,
    body: JSON.stringify({ success: true })
  };
};
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
  schedule: "0 9 * * *"
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

## 推奨構成

**小規模・個人利用**: Vercel + PlanetScale  
**中規模・チーム利用**: Railway + Railway PostgreSQL  
**大規模・企業利用**: DigitalOcean + Managed PostgreSQL