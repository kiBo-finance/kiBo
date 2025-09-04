# トラブルシューティングガイド

## よくある問題と解決方法

### 1. Docker関連

#### ポート競合エラー
```bash
# 使用中ポートの確認
netstat -ano | findstr :3001
netstat -ano | findstr :5432

# プロセス停止
npx kill-port 3001
npx kill-port 5432
```

#### Docker環境初期化
```bash
# 完全リセット
docker-compose down -v
docker-compose up --build

# データベースのみ再起動
docker-compose restart postgres
```

### 2. ビルド・コンパイル問題

#### TypeScript型エラー
```bash
# 型チェック実行
npm run type-check

# よくある問題
# - better-auth型拡張: lib/types/auth.ts参照
# - @testing-library/jest-dom: jest-types.d.ts参照
```

#### better-auth Edge Runtime問題
- **症状**: Dynamic Code Evaluation error
- **解決**: middleware.tsでcookieベース認証に変更済み
- **設定**: next.config.js serverExternalPackagesに追加済み

#### CSS/Tailwind問題
```bash
# Tailwind設定確認
npm run build  # border-border等の未定義クラス警告

# 解決: tailwind.config.js でカスタムクラス定義
# または標準クラス(border-gray-200等)使用
```

### 3. 認証関連

#### アカウント作成失敗
- **症状**: "アカウント作成に失敗しました"
- **原因**: ポート番号不一致 (3000 vs 3001)
- **解決**: 
  ```bash
  # .env.local確認
  BETTER_AUTH_URL="http://localhost:3001"
  NEXT_PUBLIC_BETTER_AUTH_URL="http://localhost:3001"
  ```

#### セッション取得エラー
- **症状**: ERR_CONNECTION_REFUSED
- **解決**: baseURL設定をDockerポート(3001)に変更

#### メール認証
- **開発環境**: コンソールログでメール内容確認
- **本番環境**: SMTP設定が必要

### 4. テスト関連

#### Jest設定問題
```bash
# よくある問題
# - moduleNameMapper (not moduleNameMapping)
# - @types/jest の型定義
# - ESM module compatibility
```

#### Mock設定
- **better-auth**: __mocks__/better-auth/ で対応
- **nanostores**: __mocks__/nanostores.js で対応
- **React hooks**: act() wrapper必要

### 5. 開発環境切り替え

#### Docker → Local
```bash
# Docker停止
docker-compose down

# 環境変数変更
BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_BETTER_AUTH_URL="http://localhost:3000"

# ローカル起動
npm run dev
```

#### Local → Docker
```bash
# ローカル停止
npx kill-port 3000

# 環境変数変更
BETTER_AUTH_URL="http://localhost:3001"
NEXT_PUBLIC_BETTER_AUTH_URL="http://localhost:3001"

# Docker起動
docker-compose up --build
```

## デバッグコマンド

### 接続確認
```bash
# Health check
curl http://localhost:3001/api/health

# データベース接続
docker-compose exec postgres psql -U kibo_user -d kibo_dev

# Redis接続
docker-compose exec redis redis-cli
```

### ログ確認
```bash
# アプリケーションログ
docker-compose logs app -f

# データベースログ
docker-compose logs postgres -f

# 全サービスログ
docker-compose logs -f
```

### データベース操作
```bash
# スキーマ更新
npm run db:push

# マイグレーション作成
npm run db:migrate

# Prisma Studio起動
npm run db:studio
```

## パフォーマンス

### 現在のビルドサイズ
- **Total**: ~135kB (ダッシュボード)
- **Shared**: 105kB
- **Middleware**: 32kB

### テスト実行時間
- **全テスト**: ~8秒 (36テスト)
- **ビルド**: ~10秒

## セキュリティ

### 設定済み
- CSRF protection (better-auth)
- セッション管理 (7日間有効)
- パスワードハッシュ化
- メール認証必須

### TODO (Phase 4以降)
- 口座情報暗号化
- 操作ログ記録
- レート制限
- 入力値サニタイゼーション