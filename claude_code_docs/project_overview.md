# 家計簿アプリ開発仕様書

## プロジェクト概要

### アプリケーション名
**kiBoアプリ** - 多通貨対応家計簿管理システム

### 目的
複数の銀行口座、クレジットカード、多通貨に対応した家計簿アプリケーション。入金予定日や支払期限の管理を重視し、将来的なスマートフォンアプリ展開を見据えたWeb First設計。

### 技術スタック

#### Core Stack
- **Framework**: Next.js 15 (App Router) - フルスタック
- **Language**: TypeScript (厳密設定)
- **State Management**: Jotai (アトミック状態管理)
- **Authentication**: better-auth
- **Database**: PostgreSQL + Prisma ORM
- **Styling**: Tailwind CSS + shadcn/ui
- **Development Tools**: Biome (Linting + Formatting)

#### 多通貨対応
- **Currency Handling**: @dinero.js/currencies
- **Decimal Calculation**: decimal.js
- **Exchange Rate API**: ExchangeRate-API (外部サービス)

#### 追加ライブラリ
- **Date Handling**: date-fns
- **Form Validation**: zod
- **Icons**: lucide-react

### 主要機能要件

#### 1. 口座管理
- 複数銀行口座管理（現金含む）
- 定期預金管理
- 通貨別残高管理
- 口座間資金移動

#### 2. カード管理
- クレジットカード・デビットカード管理
- 口座との紐付け
- 利用限度額管理
- カード別取引履歴

#### 3. 多通貨対応
- 主要通貨対応（JPY, USD, EUR, GBP等）
- リアルタイム為替レート取得
- 基準通貨での総資産表示
- 通貨間換算機能

#### 4. 予定管理（重要機能）
- 入金予定日管理
- 支払期限管理
- 定期的な入出金設定
- 予定アラート・通知

#### 5. 取引管理
- 手動取引入力
- カテゴリ分類
- 取引履歴検索・フィルタ
- 添付ファイル対応

#### 6. レポート・分析
- 月次・年次レポート
- カテゴリ別支出分析
- 予算vs実績比較
- 多通貨での資産推移

#### 7. セキュリティ
- エンドツーエンド暗号化
- セッション管理
- 2FA対応（将来実装）

### 非機能要件

#### パフォーマンス
- 初期ページ読み込み: 3秒以内
- 状態更新レスポンス: 100ms以内
- 大量取引データ対応: 10,000件まで

#### セキュリティ
- 金融データ暗号化
- HTTPS通信必須
- SQL Injection対策
- XSS対策

#### 可用性
- 99.9%稼働率目標
- オフライン基本機能対応（PWA）
- 自動バックアップ

### 開発フェーズ

#### 現在の実装状況（2024年9月時点）
✅ **完了済み**
- Phase 1: 基盤構築（Docker環境、Prisma、better-auth）
- Phase 2: 認証・セキュリティ（ユーザー登録・ログイン）
- Phase 3: コアUI・状態管理（Jotai、shadcn/ui、レイアウト）
- Phase 4: 通貨・口座管理（多通貨、口座CRUD、為替レート）
- Phase 5: 基本取引システム（取引API・UI）
- Phase 6: 通知システム（Slack/Discord Webhook）
- Phase 7: 予定取引UI・統合（完全なUI、自動実行、通知統合）

❌ **未実装**
- Phase 8: レポート・分析
- カード管理UI
- 予算管理システム
- データエクスポート機能

#### Phase 1: 基盤構築（Week 1-2）
- Next.js 15環境構築
- Biome設定・コード品質設定
- データベース設計・Prisma設定
- better-auth認証基盤

#### Phase 2: 認証・セキュリティ（Week 3）
- ユーザー登録・ログイン
- セッション管理
- セキュリティミドルウェア

#### Phase 3: コアUI・状態管理（Week 4-5）
- Jotai状態設計
- 基本レイアウト・ナビゲーション
- shadcn/ui統合

#### Phase 4: 通貨・口座管理（Week 6-8）
- 多通貨システム実装
- 口座CRUD機能
- カード管理機能
- 為替レート統合

#### Phase 5: 取引・予定管理システム（Week 9-11）
- 基本取引記録システム（実装済み）
- 予定取引API（実装済み）
- 予定取引UI（未実装）

#### Phase 6: 通知システム（Week 12）
- Slack/Discord Webhook通知（実装済み）
- リマインダーサービス（実装済み）
- 通知設定UI（実装済み）

#### Phase 7: 予定取引UI・統合（Week 13-14）
- 予定取引管理画面
- カレンダービュー
- 通知システム統合
- 自動実行機能

#### Phase 8: レポート・分析（Week 15-16）
- レポート・分析機能
- 予算管理システム
- データエクスポート

#### Phase 9: 最適化・テスト（Week 17-18）
- パフォーマンス最適化
- 包括的テスト
- セキュリティ監査

#### Phase 10: PWA・デプロイ（Week 19-20）
- PWA機能実装
- 本番デプロイ設定
- モニタリング設定

### 将来の拡張計画

#### Short-term (3-6ヶ月)
- React Native版開発
- 銀行API連携
- 詳細分析機能

#### Long-term (6-12ヶ月)
- 投資管理機能
- 家族共有機能
- AIベース支出予測

### 品質基準

#### コード品質
- Biome設定による自動フォーマット
- TypeScript strict mode
- 最小80%テストカバレッジ
- ESModules使用

#### UI/UX
- レスポンシブデザイン必須
- アクセシビリティ対応（WCAG 2.1 AA）
- ダークモード対応
- 多言語対応準備

### デプロイ・運用

#### 推奨プラットフォーム

**小規模・個人利用:**
- **Platform**: Vercel または Netlify
- **Database**: PlanetScale または Supabase
- **Monitoring**: Vercel Analytics

**中規模・チーム利用:**
- **Platform**: Railway または DigitalOcean App Platform  
- **Database**: Railway PostgreSQL または DO Managed Database
- **Files**: Cloudflare R2
- **Monitoring**: Sentry

**大規模・企業利用:**
- **Platform**: AWS ECS または Google Cloud Run
- **Database**: AWS RDS または Google Cloud SQL
- **Files**: AWS S3 または Google Cloud Storage
- **Monitoring**: DataDog または New Relic

#### 環境管理
```
Development → Staging → Production
```

### セキュリティ考慮事項

#### データ保護
- 機密データ暗号化（AES-256）
- PII情報の適切な取り扱い
- GDPR/個人情報保護法対応

#### 認証・認可
- 強力なパスワードポリシー
- セッションタイムアウト
- 不正ログイン検知

この文書はClaude Codeでの開発時の指針となります。次に、技術実装の詳細仕様書を作成します。