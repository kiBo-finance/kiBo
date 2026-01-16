# kiBo - 今後の作業リスト

## 優先度: 高（セキュリティ・本番準備）

### ~~1. 管理者権限チェックの実装~~ ✅
~~通貨管理APIに管理者権限チェックが未実装です。~~ → **実装完了**

- UserモデルにisAdminフィールドを追加
- better-auth設定を更新
- POST/PATCH/DELETE エンドポイントに権限チェックを実装

### ~~1.5. 認証機能の拡張~~ ✅
~~better-authの認証方式を拡張します。~~ → **実装完了**

- パスキー認証（WebAuthn/FIDO2）対応を追加
- Google/GitHub OAuth対応を追加（環境変数設定で有効化）
- Passkeyモデルをスキーマに追加
- クライアント側にpasskeyClient追加

### 2. メール送信機能の本番実装
`src/lib/email.ts` はプレースホルダー実装（console.logのみ）です。
本番環境では SendGrid、Resend 等のメール送信サービスに置き換えが必要です。

### 3. 環境変数の設定
- `BETTER_AUTH_SECRET` - 本番用の安全なシークレットキーを設定

## 優先度: 中（機能改善）

### ~~4. エラーハンドリングの改善~~ ✅
~~エラー表示が未実装です。~~ → **実装完了**

- sonner toastを使用してエラー/成功メッセージを表示
- AccountDetailClient.tsx: 削除エラー/成功のtoast追加
- CreateAccountForm.tsx: 作成エラー/成功のtoast追加

### ~~5. ユーザー設定のサーバー保存~~ ✅
~~`src/components/SettingsClient.tsx:74` - 現在はローカルのみ。サーバー側に保存する機能が必要。~~ → **実装完了**

- `/api/user/settings` エンドポイントを作成（GET/PATCH）
- 基準通貨の変更をサーバーに保存
- ページ読み込み時にサーバーから設定を同期

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

### ~~8. デバッグログの整理~~ ✅
~~本番デプロイ前にconsole.log/errorを整理する必要があります。~~ → **実装完了**

- `src/lib/logger.ts` - 条件付きロガーユーティリティを作成
- 本番環境ではデバッグログを自動的に無効化
- 絵文字付きログをstructuredなログに置き換え

---

## 完了した作業

- [x] Next.js → Waku 移行
- [x] cmdk (Radix UI) → 純粋React実装
- [x] @パスエイリアス設定
- [x] 未使用コード削除
- [x] ビルド警告の抑制
- [x] Service Worker キャッシュ修正
- [x] API レスポンスラッパー対応
- [x] 管理者権限チェックの実装（通貨API）
- [x] エラーハンドリングの改善（toast表示）
- [x] デバッグログの整理（ロガーユーティリティ導入）
- [x] ユーザー設定のサーバー保存（基準通貨）
- [x] 認証機能の拡張（パスキー・OAuth対応）
