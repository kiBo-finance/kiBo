# 通知システムセットアップガイド

## 概要

kiBoアプリの通知システムは、予定取引のリマインダーや期限切れ通知をSlack・Discordに送信する機能です。このガイドでは、プラットフォームに依存しない汎用的なセットアップ方法を説明します。

## 前提条件

1. アプリケーションがデプロイ済み
2. PostgreSQLデータベースが稼働中
3. 環境変数 `NOTIFICATION_API_KEY` が設定済み

## 1. Slack通知設定

### Slack Incoming Webhookの作成

1. Slack workspace にログイン
2. https://api.slack.com/apps でアプリを作成
3. "Incoming Webhooks" 機能を有効化
4. チャンネルを選択してWebhook URLを取得
5. URLの形式: `https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX`

### アプリ内でのSlack設定

1. `/dashboard/settings/notifications` にアクセス
2. "新しい通知設定を追加" をクリック
3. 以下を入力：
   - **タイプ**: Webhook
   - **プラットフォーム**: Slack
   - **Webhook URL**: 取得したSlack Webhook URL
   - **通知対象**: 必要に応じて選択
4. "設定を保存" をクリック
5. "テスト送信" で動作確認

## 2. Discord通知設定

### Discord Webhookの作成

1. Discordサーバーの設定を開く
2. "連携サービス" → "ウェブフック"
3. "新しいウェブフック" を作成
4. チャンネルを選択してWebhook URLをコピー
5. URLの形式: `https://discord.com/api/webhooks/123456789012345678/AbCdEfGhIjKlMnOpQrStUvWxYz`

### アプリ内でのDiscord設定

1. `/dashboard/settings/notifications` にアクセス
2. "新しい通知設定を追加" をクリック
3. 以下を入力：
   - **タイプ**: Webhook
   - **プラットフォーム**: Discord
   - **Webhook URL**: 取得したDiscord Webhook URL
   - **通知対象**: 必要に応じて選択
4. "設定を保存" をクリック
5. "テスト送信" で動作確認

## 3. 定期実行の設定

通知システムの核となる定期実行は、デプロイ先のプラットフォームによって設定方法が異なります。

### API エンドポイント

```
POST /api/notifications/send-reminders
```

**認証ヘッダー:**

```
Authorization: Bearer YOUR_NOTIFICATION_API_KEY
```

### プラットフォーム別設定

#### A. Vercel

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

#### B. Netlify

```javascript
// netlify/functions/scheduled-reminders.js
exports.handler = async (event, context) => {
  const response = await fetch(`${process.env.BETTER_AUTH_URL}/api/notifications/send-reminders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.NOTIFICATION_API_KEY}`,
      'Content-Type': 'application/json',
    },
  })

  return {
    statusCode: response.status,
    body: JSON.stringify({ success: response.ok }),
  }
}
```

#### C. Railway

Railway Cronを利用：

1. Railway Dashboard → Cron Jobs
2. URL: `https://your-app.railway.app/api/notifications/send-reminders`
3. Method: POST
4. Headers: `Authorization: Bearer YOUR_API_KEY`
5. Schedule: `0 9 * * *`

#### D. DigitalOcean

```yaml
# .do/app.yaml に追加
jobs:
- name: send-reminders
  run_command: curl -X POST -H "Authorization: Bearer $NOTIFICATION_API_KEY" $BETTER_AUTH_URL/api/notifications/send-reminders
  schedule: "0 9 * * *"
```

#### E. 外部Cronサービス

**EasyCron:**

1. https://www.easycron.com/ でアカウント作成
2. 新しいCron Jobを作成
3. URL: `https://your-domain.com/api/notifications/send-reminders`
4. Method: POST
5. Headers: `Authorization: Bearer YOUR_API_KEY`
6. Schedule: `0 9 * * *` (毎日9:00AM)

**cron-job.org:**

1. https://cron-job.org/en/ でアカウント作成
2. Create cronjob
3. URL設定と同様の設定を行う

#### F. 自前サーバー

```bash
# crontabに追加
crontab -e

# 毎日9:00AMに実行
0 9 * * * curl -X POST \
  -H "Authorization: Bearer YOUR_NOTIFICATION_API_KEY" \
  -H "Content-Type: application/json" \
  https://your-domain.com/api/notifications/send-reminders
```

## 4. 動作確認

### 手動テスト

```bash
# ヘルスチェック
curl https://your-domain.com/api/health

# リマインダー送信テスト
curl -X POST \
  -H "Authorization: Bearer YOUR_NOTIFICATION_API_KEY" \
  -H "Content-Type: application/json" \
  https://your-domain.com/api/notifications/send-reminders
```

### 設定確認

1. アプリの `/dashboard/settings/notifications` で設定を確認
2. 予定取引を作成（期日は明日に設定）
3. 手動でリマインダーAPIを実行
4. Slack/Discordに通知が届くことを確認

## 5. トラブルシューティング

### よくある問題

**通知が届かない場合:**

1. Webhook URLが正しいか確認
2. API キーが正しく設定されているか確認
3. 予定取引のリマインダー日数設定を確認
4. `/api/notifications/settings` で設定を確認

**Cronが動作しない場合:**

1. APIキーの環境変数が設定されているか確認
2. 手動実行でエラーがないか確認
3. プラットフォーム固有のログを確認

### ログ確認

```bash
# アプリケーションログの確認方法（プラットフォーム別）
# Vercel: Vercel Dashboard → Functions → Logs
# Railway: Railway Dashboard → Deployments → Logs
# DigitalOcean: doctl apps logs your-app-id
```

### APIレスポンス例

**成功時:**

```json
{
  "success": true,
  "message": "Notifications processed successfully",
  "processed": 3,
  "sent": 2,
  "errors": 0
}
```

**エラー時:**

```json
{
  "error": "Invalid API key",
  "statusCode": 401
}
```

## 6. セキュリティ考慮事項

1. **API Key管理**: `NOTIFICATION_API_KEY`は秘匿情報として適切に管理
2. **Webhook URL保護**: Slack/Discord Webhook URLは外部に漏洩しないよう注意
3. **HTTPS必須**: 本番環境では必ずHTTPS接続を使用
4. **ログ監視**: 通知送信の成功・失敗をログで監視

## 7. 制限事項と注意点

### Slack

- レート制限: 1メッセージ/秒
- メッセージサイズ: 最大40KB
- アタッチメント: 最大20個

### Discord

- レート制限: 30リクエスト/分
- メッセージサイズ: 最大2000文字
- Embed: 最大10個

### 一般的な制限

- 同時接続数の制限
- プラットフォーム固有の実行時間制限
- 無料プランでの機能制限

詳細は各プラットフォームのドキュメントを参照してください。
