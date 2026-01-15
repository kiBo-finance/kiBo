# kiBoアプリ セットアップガイド

このガイドでは、kiBoアプリを新規環境で動作させるための手順を説明します。

## 目次

1. [必要な環境](#必要な環境)
2. [クイックスタート（ネイティブ）](#クイックスタートネイティブ)
3. [クイックスタート（Docker）](#クイックスタートdocker)
4. [ローカル開発環境のセットアップ](#ローカル開発環境のセットアップ)
5. [環境変数の設定](#環境変数の設定)
6. [データベースの設定](#データベースの設定)
7. [開発サーバーの起動](#開発サーバーの起動)
8. [本番ビルドとデプロイ](#本番ビルドとデプロイ)
9. [トラブルシューティング](#トラブルシューティング)

---

## 必要な環境

### 必須

| ソフトウェア | バージョン | 用途 |
|-------------|-----------|------|
| **Node.js** | 18.x 以上 | ランタイム |
| **Bun** | 1.x 以上 | パッケージ管理・ランタイム |
| **PostgreSQL** | 16.x | データベース |

### オプション

| ソフトウェア | バージョン | 用途 |
|-------------|-----------|------|
| Docker | 24.x 以上 | コンテナ環境 |
| Redis | 7.x | セッション・キャッシュ |

### インストール方法

```bash
# macOS (Homebrew)
brew install node
brew install oven-sh/bun/bun
brew install postgresql@16

# Ubuntu/Debian
curl -fsSL https://bun.sh/install | bash
sudo apt install postgresql-16

# Windows (Scoop)
scoop install nodejs
scoop install bun
scoop install postgresql
```

---

## クイックスタート（ネイティブ）

Docker を使わずにネイティブ環境で起動する手順です。

### 前提条件

以下がインストールされている必要があります:

- **Bun** 1.x 以上
- **PostgreSQL** 16.x

### macOS

```bash
# 1. 前提ソフトウェアをインストール
brew install oven-sh/bun/bun postgresql@16

# 2. PostgreSQL を起動
brew services start postgresql@16

# 3. リポジトリをクローン
git clone https://github.com/kiBo-finance/kiBo.git
cd kiBo

# 4. 依存関係をインストール
bun install

# 5. データベースを作成
createdb kibo_dev

# 6. 環境変数を設定
cat > .env << 'EOF'
DATABASE_URL="postgresql://$(whoami)@localhost:5432/kibo_dev"
BETTER_AUTH_SECRET="dev-secret-key-minimum-32-characters-long"
BETTER_AUTH_URL="http://localhost:3000"
EOF

# 7. データベーススキーマを適用
bun run db:push

# 8. 初期データを投入
bun run db:seed

# 9. 開発サーバーを起動
bun run dev

# ブラウザで http://localhost:3000 にアクセス
```

### Ubuntu/Debian

```bash
# 1. 前提ソフトウェアをインストール
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc
sudo apt update && sudo apt install -y postgresql postgresql-contrib

# 2. PostgreSQL を起動
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 3. データベースユーザーを作成
sudo -u postgres createuser --createdb $(whoami)

# 4. リポジトリをクローン
git clone https://github.com/kiBo-finance/kiBo.git
cd kiBo

# 5. 依存関係をインストール
bun install

# 6. データベースを作成
createdb kibo_dev

# 7. 環境変数を設定
cat > .env << 'EOF'
DATABASE_URL="postgresql://localhost:5432/kibo_dev"
BETTER_AUTH_SECRET="dev-secret-key-minimum-32-characters-long"
BETTER_AUTH_URL="http://localhost:3000"
EOF

# 8. データベーススキーマを適用
bun run db:push

# 9. 初期データを投入
bun run db:seed

# 10. 開発サーバーを起動
bun run dev

# ブラウザで http://localhost:3000 にアクセス
```

### Windows (PowerShell)

```powershell
# 1. 前提ソフトウェアをインストール（管理者権限で実行）
# Scoop を使用する場合
scoop install bun postgresql

# 2. PostgreSQL サービスを起動
pg_ctl start -D "C:\Program Files\PostgreSQL\16\data"

# 3. リポジトリをクローン
git clone https://github.com/kiBo-finance/kiBo.git
cd kiBo

# 4. 依存関係をインストール
bun install

# 5. データベースを作成
createdb kibo_dev

# 6. 環境変数ファイルを作成
Copy-Item .env.example .env
# .env ファイルを編集して以下を設定:
# DATABASE_URL="postgresql://postgres:password@localhost:5432/kibo_dev"
# BETTER_AUTH_SECRET="dev-secret-key-minimum-32-characters-long"
# BETTER_AUTH_URL="http://localhost:3000"

# 7. データベーススキーマを適用
bun run db:push

# 8. 初期データを投入
bun run db:seed

# 9. 開発サーバーを起動
bun run dev
```

### ワンライナー（macOS/Linux 上級者向け）

PostgreSQL がすでに動作している場合、以下のコマンドで一発起動できます:

```bash
git clone https://github.com/kiBo-finance/kiBo.git && cd kiBo && bun install && createdb kibo_dev 2>/dev/null; echo 'DATABASE_URL="postgresql://localhost:5432/kibo_dev"
BETTER_AUTH_SECRET="dev-secret-key-minimum-32-characters-long"
BETTER_AUTH_URL="http://localhost:3000"' > .env && bun run db:push && bun run db:seed && bun run dev
```

---

## クイックスタート（Docker）

Docker Compose を使用する方法です。

```bash
# 1. リポジトリをクローン
git clone https://github.com/kiBo-finance/kiBo.git
cd kibo

# 2. 環境変数ファイルを作成
cp .env.example .env

# 3. Docker Compose で起動
docker-compose up --build

# 4. アプリケーションにアクセス
open http://localhost:3000
```

### Docker サービス構成

| サービス | ポート | 説明 |
|---------|-------|------|
| app | 3000 | Waku アプリケーション |
| postgres | 5432 | PostgreSQL データベース |
| redis | 6379 | Redis キャッシュ（オプション） |

---

## ローカル開発環境のセットアップ

### 1. リポジトリのクローン

```bash
git clone https://github.com/kiBo-finance/kiBo.git
cd kibo
```

### 2. 依存関係のインストール

```bash
bun install
```

### 3. PostgreSQL の起動

```bash
# macOS (Homebrew)
brew services start postgresql@16

# または Docker で PostgreSQL のみ起動
docker-compose up -d postgres
```

### 4. 環境変数の設定

```bash
# .env ファイルを作成
cp .env.example .env

# .env を編集（後述の「環境変数の設定」を参照）
```

### 5. データベースの初期化

```bash
# スキーマをプッシュ
bun run db:push

# 初期データを投入
bun run db:seed
```

### 6. 開発サーバーの起動

```bash
bun run dev
```

ブラウザで http://localhost:3000 にアクセスしてください。

---

## 環境変数の設定

`.env` ファイルに以下の変数を設定します。

### 必須の環境変数

```env
# データベース接続URL
DATABASE_URL="postgresql://kibo_user:kibo_password@localhost:5432/kibo_dev"

# 認証シークレット（32文字以上の安全な文字列）
BETTER_AUTH_SECRET="your-super-secret-key-minimum-32-characters-long"

# アプリケーションURL
BETTER_AUTH_URL="http://localhost:3000"
```

### オプションの環境変数

```env
# Redis（セッション・キャッシュ用）
REDIS_URL="redis://localhost:6379"

# 為替レートAPI
EXCHANGE_RATE_API_KEY="your-api-key"

# 通知サービス
SLACK_WEBHOOK_URL="https://hooks.slack.com/services/..."
DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/..."

# 環境設定
NODE_ENV="development"
```

### シークレットの生成方法

```bash
# 安全なシークレットを生成
openssl rand -base64 32

# または Node.js で生成
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## データベースの設定

### PostgreSQL データベースの作成

```bash
# PostgreSQL に接続
psql -U postgres

# データベースとユーザーを作成
CREATE USER kibo_user WITH PASSWORD 'kibo_password';
CREATE DATABASE kibo_dev OWNER kibo_user;
GRANT ALL PRIVILEGES ON DATABASE kibo_dev TO kibo_user;
\q
```

### Prisma コマンド

```bash
# スキーマをデータベースに反映
bun run db:push

# マイグレーションを作成
bun run db:migrate

# 初期データを投入
bun run db:seed

# Prisma Studio でデータを確認
bun run db:studio
# http://localhost:5555 でアクセス
```

### スキーマの確認

```bash
# 現在のスキーマを表示
cat prisma/schema.prisma
```

---

## 開発サーバーの起動

### 基本コマンド

```bash
# 開発サーバー起動
bun run dev

# 型チェック
bun run type-check

# Lint チェック
bun run lint

# Lint 自動修正
bun run lint:fix

# コードフォーマット
bun run format
```

### 開発サーバーのポート

デフォルトは `3000` です。変更する場合：

```bash
# ポートを指定して起動
bun run dev -- --port 3001
```

---

## 本番ビルドとデプロイ

### ビルド

```bash
# 本番ビルド
bun run build

# ビルド成果物の確認
ls -la dist/
```

### 本番サーバーの起動

```bash
# 本番モードで起動
bun run start
```

### Docker での本番デプロイ

```bash
# イメージをビルド
docker build -t kibo-app .

# コンテナを起動
docker run -d \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/db" \
  -e BETTER_AUTH_SECRET="your-secret" \
  -e BETTER_AUTH_URL="https://your-domain.com" \
  kibo-app
```

---

## PWA（Progressive Web App）

kiBoアプリはPWAに対応しています。

### 機能

- オフライン対応（取引のオフライン入力・自動同期）
- ホーム画面へのインストール
- プッシュ通知（予定）

### 確認方法

1. Chrome DevTools を開く（F12）
2. Application タブを選択
3. Manifest / Service Workers セクションを確認

---

## コマンド一覧

| コマンド | 説明 |
|---------|------|
| `bun run dev` | 開発サーバー起動 |
| `bun run build` | 本番ビルド |
| `bun run start` | 本番サーバー起動 |
| `bun run lint` | Lintチェック |
| `bun run lint:fix` | Lint自動修正 |
| `bun run format` | コードフォーマット |
| `bun run format:check` | フォーマットチェック |
| `bun run type-check` | TypeScript型チェック |
| `bun run db:push` | スキーマをDBに反映 |
| `bun run db:migrate` | マイグレーション作成 |
| `bun run db:seed` | 初期データ投入 |
| `bun run db:studio` | Prisma Studio起動 |
| `bun test` | テスト実行 |
| `bun run test:watch` | テストウォッチモード |
| `bun run test:coverage` | テストカバレッジ |

---

## トラブルシューティング

### データベース接続エラー

```bash
# PostgreSQL が起動しているか確認
pg_isready -h localhost -p 5432

# 接続テスト
psql -U kibo_user -d kibo_dev -h localhost

# Docker の場合
docker-compose ps
docker-compose logs postgres
```

### Prisma エラー

```bash
# Prisma Client を再生成
bun run db:generate

# スキーマをリセット（データが消えます）
bunx prisma migrate reset

# データベースをプル（既存DBからスキーマ取得）
bunx prisma db pull
```

### ポートが使用中

```bash
# 使用中のポートを確認
lsof -i :3000

# プロセスを終了
kill -9 <PID>
```

### node_modules の問題

```bash
# キャッシュをクリアして再インストール
rm -rf node_modules bun.lock
bun install
```

### ビルドエラー（Prisma ESM）

Prisma 6 の ESM 互換性問題が発生する場合：

```bash
# prisma-resolver-hook が正しく設定されているか確認
cat prisma-resolver-hook.mjs
cat prisma-loader.mjs

# package.json の build スクリプトを確認
grep "build" package.json
# NODE_OPTIONS="--import ./prisma-resolver-hook.mjs" が含まれている必要があります
```

---

## 推奨サーバースペック

### 最小構成（個人利用）

- CPU: 1 vCPU
- メモリ: 1 GB
- ストレージ: 10 GB SSD

### 推奨構成（10〜50ユーザー）

- CPU: 2 vCPU
- メモリ: 2〜4 GB
- ストレージ: 20 GB SSD

詳細は [サーバースペックガイド](#推奨サーバースペック) を参照してください。

---

## 関連ドキュメント

- [README.md](README.md) - プロジェクト概要
- [CLAUDE.md](CLAUDE.md) - 開発ガイドライン
- [DEPLOYMENT.md](DEPLOYMENT.md) - 詳細なデプロイ手順
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - 詳細なトラブルシューティング
- [docs/NOTIFICATIONS_SETUP.md](docs/NOTIFICATIONS_SETUP.md) - 通知設定

---

## サポート

問題が解決しない場合：

1. [GitHub Issues](https://github.com/kiBo-finance/kiBo/issues) で報告
2. [TROUBLESHOOTING.md](TROUBLESHOOTING.md) を確認
3. Docker ログを確認: `docker-compose logs -f`
