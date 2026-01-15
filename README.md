# kiBoアプリ

**多通貨対応家計簿管理システム**

kiBoアプリは、複数の銀行口座・クレジットカード・多通貨に対応した Waku ベースの家計簿アプリケーションです。予定取引管理、オフライン対応（PWA）、Slack/Discord通知機能を特長としています。

## 主要機能

- **多通貨対応** - JPY、USD、EUR等の主要通貨をサポート
- **口座管理** - 銀行口座・現金・定期預金を一元管理
- **カード管理** - クレジット・デビットカードの管理
- **予定取引** - 将来の収入・支出を事前登録・自動実行
- **定期取引** - 給料・家賃等の繰り返し取引を自動化
- **オフライン対応** - PWAによるオフライン取引入力・自動同期
- **通知機能** - Slack・Discord への事前リマインダー
- **為替レート** - リアルタイムレート取得・履歴管理
- **ダークモード** - システム設定に連動したテーマ切り替え

## 技術スタック

| カテゴリ | 技術 |
|---------|------|
| **ランタイム** | Bun |
| **フレームワーク** | Waku v1.0.0-alpha.2 (React Server Components) |
| **言語** | TypeScript |
| **データベース** | PostgreSQL 16 + Prisma ORM |
| **認証** | better-auth |
| **状態管理** | Jotai |
| **スタイリング** | Tailwind CSS v4 + shadcn/ui (JollyUI) |
| **通貨処理** | @dinero.js/currencies + Decimal.js |
| **コード品質** | oxlint + oxfmt |

## クイックスタート

### Docker（推奨）

```bash
# リポジトリをクローン
git clone https://github.com/your-username/kibo.git
cd kibo

# Docker Compose で起動
docker-compose up --build

# アプリケーションにアクセス
open http://localhost:3000
```

### ローカル開発

```bash
# 依存関係をインストール
bun install

# 環境変数を設定
cp .env.example .env
# .env を編集

# データベース設定
bun run db:push
bun run db:seed

# 開発サーバー起動
bun run dev
```

詳細な手順は **[SETUP.md](SETUP.md)** を参照してください。

## 環境変数

```bash
# 必須
DATABASE_URL="postgresql://user:pass@localhost:5432/kibo_dev"
BETTER_AUTH_SECRET="your-32-character-secret-key"
BETTER_AUTH_URL="http://localhost:3000"

# オプション
REDIS_URL="redis://localhost:6379"
EXCHANGE_RATE_API_KEY="your-api-key"
```

## 開発コマンド

```bash
# 開発
bun run dev              # 開発サーバー起動
bun run build            # 本番ビルド
bun run start            # 本番サーバー起動

# データベース
bun run db:push          # スキーマ変更をプッシュ
bun run db:migrate       # マイグレーション作成
bun run db:seed          # 初期データ投入
bun run db:studio        # Prisma Studio起動

# コード品質
bun run lint             # oxlint チェック
bun run lint:fix         # 自動修正
bun run format           # oxfmt フォーマット
bun run type-check       # TypeScript型チェック

# テスト
bun test                 # テスト実行
bun run test:watch       # ウォッチモード
bun run test:coverage    # カバレッジレポート
```

## プロジェクト構造

```
kibo/
├── src/
│   ├── pages/              # Waku pages (file-based routing)
│   │   ├── _layout.tsx     # ルートレイアウト
│   │   ├── index.tsx       # ホームページ
│   │   ├── login.tsx       # ログインページ
│   │   ├── dashboard/      # ダッシュボードページ
│   │   └── _api/           # API routes
│   ├── components/         # Reactコンポーネント
│   │   ├── ui/             # shadcn/ui コンポーネント
│   │   └── providers/      # Context providers
│   └── lib/                # ユーティリティ・設定
│       ├── actions/        # Server actions
│       ├── atoms/          # Jotai atoms
│       └── hooks/          # Custom hooks
├── public/                 # 静的ファイル（PWA assets）
├── prisma/                 # データベーススキーマ
└── docs/                   # ドキュメント
```

## ドキュメント

| ドキュメント | 説明 |
|-------------|------|
| **[SETUP.md](SETUP.md)** | セットアップ手順（必読） |
| [DEPLOYMENT.md](DEPLOYMENT.md) | デプロイ手順 |
| [CLAUDE.md](CLAUDE.md) | 開発ガイドライン |
| [TROUBLESHOOTING.md](TROUBLESHOOTING.md) | トラブルシューティング |
| [docs/NOTIFICATIONS_SETUP.md](docs/NOTIFICATIONS_SETUP.md) | 通知設定 |

## 推奨サーバースペック

| 構成 | CPU | メモリ | ストレージ |
|-----|-----|--------|-----------|
| 最小（個人利用） | 1 vCPU | 1 GB | 10 GB SSD |
| 推奨（10〜50ユーザー） | 2 vCPU | 2〜4 GB | 20 GB SSD |
| 本番（100+ユーザー） | 4+ vCPU | 8+ GB | 50+ GB SSD |

## ライセンス

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**kiBoアプリ** - あなたの資産管理を次のレベルへ
