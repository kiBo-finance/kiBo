# kiBo - 今後の作業リスト

## 優先度: 高（セキュリティ・本番準備）

### 1. 管理者権限チェックの実装
通貨管理APIに管理者権限チェックが未実装です。

| ファイル | 行 | 内容 |
|----------|-----|------|
| `src/pages/_api/api/currencies.ts` | 56 | POST（通貨追加）に権限チェック必要 |
| `src/pages/_api/api/currencies/[code].ts` | 72 | PUT（通貨更新）に権限チェック必要 |
| `src/pages/_api/api/currencies/[code].ts` | 127 | DELETE（通貨削除）に権限チェック必要 |

### 2. メール送信機能の本番実装
`src/lib/email.ts` はプレースホルダー実装（console.logのみ）です。
本番環境では SendGrid、Resend 等のメール送信サービスに置き換えが必要です。

### 3. 環境変数の設定
- `BETTER_AUTH_SECRET` - 本番用の安全なシークレットキーを設定

## 優先度: 中（機能改善）

### 4. エラーハンドリングの改善
| ファイル | 行 | 内容 |
|----------|-----|------|
| `src/components/AccountDetailClient.tsx` | 87 | 口座読み込みエラーの表示 |
| `src/components/accounts/CreateAccountForm.tsx` | 148 | フォームエラーのtoast表示 |

### 5. ユーザー設定のサーバー保存
`src/components/SettingsClient.tsx:74` - 現在はローカルのみ。サーバー側に保存する機能が必要。

### 6. 為替レート履歴機能
| ファイル | 行 | 内容 |
|----------|-----|------|
| `src/components/currency/CurrencyConverter.tsx` | 239 | 為替レート変動表示 |
| `src/components/currency/ExchangeRatesList.tsx` | 245 | 変動率表示 |

履歴データの取得・表示機能の実装が必要です。

## 優先度: 低（UI改善）

### 7. 口座詳細ページの関連情報表示
| ファイル | 行 | 内容 |
|----------|-----|------|
| `src/components/accounts/AccountDetails.tsx` | 255 | 関連カード情報の表示 |
| `src/components/accounts/AccountDetails.tsx` | 278 | 取引履歴の表示 |

## コード品質

### 8. デバッグログの整理
本番デプロイ前に以下のconsole.log/errorを整理またはロギングサービスに置き換え：

- `src/lib/email.ts` - 📧 絵文字付きログ
- `src/lib/notifications/reminder-service.ts` - 🔔🚨✅❌ 絵文字付きログ
- `src/lib/sync-service.ts` - [SyncService] ログ
- `src/components/providers/ServiceWorkerProvider.tsx` - [PWA] ログ

---

## 完了した作業

- [x] Next.js → Waku 移行
- [x] cmdk (Radix UI) → 純粋React実装
- [x] @パスエイリアス設定
- [x] 未使用コード削除
- [x] ビルド警告の抑制
- [x] Service Worker キャッシュ修正
- [x] API レスポンスラッパー対応
