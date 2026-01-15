# VSCode DevContainer セットアップガイド

## DevContainer開始手順

### 1. 前提条件

- VSCode + Remote-Containers拡張機能
- Docker Desktop稼働中
- kiBoアプリリポジトリをクローン

### 2. DevContainer起動

1. VSCodeでプロジェクトフォルダを開く
2. コマンドパレット (`Ctrl+Shift+P`) を開く
3. "Dev Containers: Reopen in Container" を選択
4. 初回は数分かかります（Docker image build）

### 3. 環境確認

DevContainer起動後、ターミナルで以下を実行:

```bash
# Welcome script（環境確認）
welcome.sh

# 手動確認コマンド
npm run dev          # 開発サーバー起動
npm run db:studio    # データベース管理画面
npm test             # テスト実行
```

## 利用可能なサービス

### アプリケーション

- **開発サーバー**: http://localhost:3001
- **API**: http://localhost:3001/api/\*

### データベース

- **PostgreSQL**: localhost:5432
- **Prisma Studio**: http://localhost:5555
- **Redis**: localhost:6379

### 管理ツール

- **Health Check**: http://localhost:3001/api/health

## VSCode統合機能

### 拡張機能（自動インストール）

- TypeScript Next.js support
- Tailwind CSS IntelliSense
- Prisma ORM support
- Biome (linting & formatting)
- Jest Test Runner
- Docker support

### デバッグ設定

- **F5**: Next.js フルスタックデバッグ
- **Jest**: テストデバッグ対応
- **Chrome DevTools**: クライアントサイドデバッグ

### タスク実行 (`Ctrl+Shift+P` → "Tasks: Run Task")

- `dev: Start Development Server`
- `test: Run All Tests`
- `lint: Check Code Quality`
- `db: Push Schema`
- `db: Open Prisma Studio`

## 開発ワークフロー

### 1. 日常開発

```bash
# 開発サーバー起動
npm run dev

# 別ターミナルでテスト実行
npm run test:watch

# 別ターミナルでPrisma Studio
npm run db:studio
```

### 2. コード品質チェック

```bash
# Linting + Formatting
npm run lint:fix

# TypeScript確認
npm run type-check

# テスト実行
npm test
```

### 3. データベース操作

```bash
# スキーマ更新
npm run db:push

# マイグレーション作成
npm run db:migrate

# シードデータ投入
npm run db:seed
```

## ファイル監視・同期

### Volume Mount設定

- **Source**: ローカル `D:\kiBo`
- **Target**: コンテナ `/app`
- **Type**: cached (高パフォーマンス)

### 除外ディレクトリ

- `node_modules/` - コンテナ内で管理
- `.next/` - ビルド成果物
- `dist/` - 配布用ビルド

## 環境変数

DevContainer内で自動設定される環境変数:

```bash
NODE_ENV=development
DATABASE_URL=postgresql://kibo_user:kibo_password@postgres:5432/kibo_dev
BETTER_AUTH_SECRET=dev-secret-key-minimum-32-characters-long-for-security
BETTER_AUTH_URL=http://localhost:3001
NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3001
REDIS_URL=redis://redis:6379
```

## トラブルシューティング

### コンテナ起動失敗

```bash
# Docker情報確認
docker --version
docker-compose --version

# コンテナ再構築
# VSCode: "Dev Containers: Rebuild Container"
```

### ポート競合

```bash
# 使用中ポート確認
netstat -ano | findstr :3001

# プロセス停止
npx kill-port 3001
```

### 権限問題

```bash
# ファイル権限確認
ls -la /app

# ユーザー確認
whoami  # nodeユーザーであることを確認
```

### データベース接続問題

```bash
# PostgreSQL接続テスト
psql postgresql://kibo_user:kibo_password@postgres:5432/kibo_dev

# Prisma接続確認
npx prisma db pull
```

## 開発効率化

### VSCode設定済み機能

- **自動フォーマット**: 保存時にBiome適用
- **自動インポート**: TypeScript自動インポート
- **Tailwind IntelliSense**: クラス名補完
- **Jest統合**: テスト実行・デバッグ

### ショートカット

- **Ctrl+Shift+P**: コマンドパレット
- **F5**: デバッグ実行
- **Ctrl+`**: ターミナル表示
- **Ctrl+Shift+E**: エクスプローラー

## Phase 4開発の始め方

1. **DevContainer起動**
2. **データベース確認**: `npm run db:studio`
3. **開発サーバー起動**: `npm run dev`
4. **Phase 4タスク開始**: `PHASE4_TODO.md` 参照

DevContainer環境で効率的な開発を開始できます。
