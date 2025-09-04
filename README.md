# kiBoアプリ

**多通貨対応家計簿管理システム**

kiBoアプリは、複数の銀行口座・クレジットカード・多通貨に対応した Next.js ベースの家計簿アプリケーションです。予定取引管理とSlack/Discord通知機能を特長としています。

## ✨ 主要機能

- 📱 **多通貨対応** - JPY、USD、EUR等の主要通貨をサポート
- 🏦 **口座管理** - 銀行口座・現金・定期預金を一元管理  
- 💳 **カード管理** - クレジット・デビットカードの管理
- 📅 **予定取引** - 将来の収入・支出を事前登録・自動実行
- 🔄 **定期取引** - 給料・家賃等の繰り返し取引を自動化
- 🔔 **通知機能** - Slack・Discord への事前リマインダー
- 📊 **為替レート** - リアルタイムレート取得・履歴管理
- 🎨 **モダンUI** - Tailwind CSS + shadcn/ui による美しいUI

## 🛠 技術スタック

- **フレームワーク**: Next.js 15 (App Router)
- **言語**: TypeScript
- **データベース**: PostgreSQL + Prisma ORM
- **認証**: better-auth
- **状態管理**: Jotai
- **スタイリング**: Tailwind CSS + shadcn/ui  
- **通貨処理**: @dinero.js/currencies + Decimal.js

## 🚀 クイックスタート

### Docker利用（推奨）

```bash
# リポジトリをクローン
git clone https://github.com/your-username/kibo-app
cd kibo-app

# Docker環境で起動
docker-compose up --build

# アプリケーションにアクセス
open http://localhost:3001
```

### ローカル開発

```bash
# 依存関係をインストール
npm install

# 環境変数を設定
cp .env.example .env.local
# .env.local を編集

# データベース設定
npm run db:push
npm run db:seed

# 開発サーバー起動
npm run dev
```

## 📋 環境変数

```bash
# 必須
DATABASE_URL="postgresql://user:pass@localhost:5432/kibo_dev"
BETTER_AUTH_SECRET="your-32-character-secret-key"
BETTER_AUTH_URL="http://localhost:3001"

# オプション
EXCHANGE_RATE_API_KEY="your-api-key"
NOTIFICATION_API_KEY="your-notification-key"
```

## 🌐 デプロイ

kiBoアプリは複数のプラットフォームでデプロイ可能です：

### 推奨プラットフォーム

- **個人利用**: Vercel + PlanetScale
- **チーム利用**: Railway + Railway PostgreSQL  
- **企業利用**: DigitalOcean + Managed Database

詳細な設定方法は [DEPLOYMENT.md](DEPLOYMENT.md) を参照してください。

## 📖 ドキュメント

- **[デプロイガイド](DEPLOYMENT.md)** - プラットフォーム別デプロイ手順
- **[通知設定](docs/NOTIFICATIONS_SETUP.md)** - Slack・Discord通知の設定方法  
- **[技術仕様](claude_code_docs/technical_specifications.md)** - 詳細な技術仕様
- **[開発ガイド](CLAUDE.md)** - 開発時の指針

## 🔧 開発コマンド

```bash
# 開発
npm run dev              # 開発サーバー起動
npm run build           # 本番ビルド
npm run start           # 本番サーバー起動

# データベース
npm run db:push         # スキーマ変更をプッシュ
npm run db:migrate      # マイグレーション作成
npm run db:seed         # 初期データ投入
npm run db:studio       # Prisma Studio起動

# コード品質
npm run lint            # Biome linting
npm run lint:fix        # 自動修正
npm run format          # コードフォーマット  
npm run type-check      # TypeScript型チェック

# テスト
npm test                # テスト実行
npm run test:watch      # ウォッチモード
npm run test:coverage   # カバレッジレポート
```

## 🏗 プロジェクト構造

```
kibo-app/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── dashboard/         # メインアプリケーション
│   │   ├── accounts/      # 口座管理
│   │   ├── scheduled/     # 予定取引（核機能）
│   │   ├── transactions/  # 取引履歴
│   │   └── settings/      # 設定
│   └── (auth)/           # 認証ページ
├── components/            # Reactコンポーネント
├── lib/                  # ユーティリティ・設定
│   ├── atoms/            # Jotai状態管理
│   ├── hooks/            # カスタムフック
│   └── notifications/    # 通知システム
├── prisma/               # データベーススキーマ
└── docs/                 # ドキュメント
```

## 🎯 主要機能の使い方

### 1. 予定取引の作成

1. `/dashboard/scheduled` にアクセス
2. "予定追加" ボタンをクリック
3. 金額・説明・実行日を入力
4. 必要に応じて繰り返し設定を有効化

### 2. 通知設定

1. `/dashboard/settings/notifications` にアクセス  
2. Slack または Discord の Webhook URL を設定
3. "テスト送信" で動作確認
4. 通知対象を選択して保存

### 3. 口座・取引管理

1. `/dashboard/accounts` で口座を登録
2. `/dashboard/transactions` で取引を記録
3. 多通貨取引は自動で為替変換

## 🤝 コントリビューション

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)  
5. Open a Pull Request

## 📄 ライセンス

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 謝辞

- [Next.js](https://nextjs.org/) - React framework
- [Prisma](https://www.prisma.io/) - Database toolkit
- [shadcn/ui](https://ui.shadcn.com/) - UI components
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework

## 📞 サポート

- 📧 Email: support@kibo-app.com
- 🐛 Issues: [GitHub Issues](https://github.com/your-username/kibo-app/issues)
- 💬 Discord: [Community Server](https://discord.gg/kibo-app)

---

**kiBoアプリ** - あなたの資産管理を次のレベルへ 🚀