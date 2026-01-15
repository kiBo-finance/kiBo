# 初期セットアップ・開発手順書

## セットアップ手順

### 1. プロジェクト初期化

```bash
# Next.js 15プロジェクト作成
npx create-next-app@latest kibo --typescript --tailwind --app --src-dir=false --import-alias="@/*"
cd kibo

# 基本依存関係インストール
npm install jotai better-auth prisma @prisma/client
npm install @dinero.js/currencies decimal.js date-fns zod
npm install lucide-react class-variance-authority clsx tailwind-merge

# 開発依存関係
npm install --save-dev @biomejs/biome @types/node
npm install --save-dev @testing-library/react @testing-library/jest-dom jest jest-environment-jsdom

# shadcn/ui初期化
npx shadcn@latest init
```

### 2. Biome設定

```bash
# Biome初期化
npx @biomejs/biome init
```

```json
// biome.json
{
  "schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "vcs": {
    "enabled": true,
    "clientKind": "git",
    "useIgnoreFile": true
  },
  "files": {
    "ignoreUnknown": false,
    "ignore": [".next/", "dist/", "node_modules/", "prisma/migrations/"]
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "organizeImports": {
    "enabled": true
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "suspicious": {
        "noExplicitAny": "error"
      },
      "style": {
        "useImportType": "error",
        "useConst": "error"
      }
    }
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "trailingCommas": "es5",
      "semicolons": "asNeeded"
    }
  },
  "typescript": {
    "formatter": {
      "quoteStyle": "single",
      "trailingCommas": "es5",
      "semicolons": "asNeeded"
    }
  }
}
```

### 3. package.json更新

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "biome check .",
    "lint:fix": "biome check --write .",
    "format": "biome format --write .",
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:seed": "tsx prisma/seed.ts",
    "db:studio": "prisma studio",
    "type-check": "tsc --noEmit"
  }
}
```

### 4. 環境変数設定

```env
# .env.local
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/kibo_db"

# Better Auth
BETTER_AUTH_SECRET="your-super-secret-key-minimum-32-characters"
BETTER_AUTH_URL="http://localhost:3000"

# Exchange Rate API (optional - 無料枠あり)
EXCHANGE_RATE_API_KEY="your-api-key"

# Next.js
NEXTAUTH_URL="http://localhost:3000"
NODE_ENV="development"
```

```env
# .env.example（Gitにコミット用）
DATABASE_URL="postgresql://username:password@localhost:5432/kibo_db"
BETTER_AUTH_SECRET="your-secret-key-here"
BETTER_AUTH_URL="http://localhost:3000"
EXCHANGE_RATE_API_KEY="optional-api-key"
NEXTAUTH_URL="http://localhost:3000"
NODE_ENV="development"
```

## 初期実装チェックリスト

### Phase 1: 基盤構築

#### □ 1.1 プロジェクト設定

- [ ] Next.js 15プロジェクト作成
- [ ] 依存関係インストール
- [ ] Biome設定・動作確認
- [ ] Git初期化・.gitignore設定
- [ ] TypeScript厳密設定確認

#### □ 1.2 データベース設定

- [ ] PostgreSQLローカル起動
- [ ] Prismaスキーマ作成
- [ ] 初回マイグレーション実行
- [ ] シードデータ作成
- [ ] Prisma Studio動作確認

#### □ 1.3 認証基盤

- [ ] better-auth設定
- [ ] API Routes設定（/api/auth/[...all]）
- [ ] ミドルウェア設定
- [ ] 基本認証フロー動作確認

#### □ 1.4 UI基盤

- [ ] shadcn/ui設定
- [ ] Tailwind設定確認
- [ ] 基本レイアウトコンポーネント
- [ ] Jotai Provider設定

### Phase 2: コア機能実装順序

#### □ 2.1 通貨システム（最優先）

```typescript
// 実装順序
1. Currency model & seed data
2. ExchangeRate service
3. Currency conversion utilities
4. Base currency selection UI
5. Exchange rate display component
```

#### □ 2.2 口座管理

```typescript
// 実装順序
1. Account CRUD API
2. Account atoms & hooks
3. Account list component
4. Account form component
5. Balance display & currency conversion
```

#### □ 2.3 予定管理

```typescript
// 実装順序
1. ScheduledTransaction model
2. Recurring transaction logic
3. Due date notification system
4. Calendar view component
5. Overdue transaction alerts
```

## 重要な実装ガイドライン

### セキュリティ実装

```typescript
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'

export async function middleware(request: NextRequest) {
  // CSRF Protection
  if (request.method === 'POST' || request.method === 'PUT' || request.method === 'DELETE') {
    const origin = request.headers.get('origin')
    const host = request.headers.get('host')

    if (!origin || !host || !origin.endsWith(host)) {
      return NextResponse.json({ error: 'CSRF Error' }, { status: 403 })
    }
  }

  // Authentication check
  const isAuthRoute = request.nextUrl.pathname.startsWith('/api/auth')
  const isPublicRoute = ['/login', '/register', '/'].includes(request.nextUrl.pathname)

  if (!isAuthRoute && !isPublicRoute) {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      if (request.nextUrl.pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public/).*)'],
}
```

### 通貨計算ユーティリティ

```typescript
// lib/utils/currency.ts
import { Decimal } from 'decimal.js'

export class CurrencyCalculator {
  static add(a: number, b: number): number {
    return new Decimal(a).add(new Decimal(b)).toNumber()
  }

  static subtract(a: number, b: number): number {
    return new Decimal(a).sub(new Decimal(b)).toNumber()
  }

  static multiply(a: number, b: number): number {
    return new Decimal(a).mul(new Decimal(b)).toNumber()
  }

  static divide(a: number, b: number): number {
    return new Decimal(a).div(new Decimal(b)).toNumber()
  }

  static convertCurrency(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
    exchangeRate: number
  ): number {
    if (fromCurrency === toCurrency) return amount
    return this.multiply(amount, exchangeRate)
  }

  static formatCurrency(amount: number, currency: string, locale = 'ja-JP'): string {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
    }).format(amount)
  }
}
```

### エラーハンドリング

```typescript
// lib/utils/errors.ts
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export function handleApiError(error: unknown) {
  console.error('API Error:', error)

  if (error instanceof AppError) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: error.statusCode,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' },
  })
}
```

## 開発開始のコマンド例

```bash
# 1. プロジェクト作成・設定
npx create-next-app@latest kakeibo-app --typescript --tailwind --app
cd kakeibo-app

# 2. 依存関係追加
npm install jotai better-auth prisma @prisma/client @dinero.js/currencies decimal.js date-fns zod lucide-react

# 3. 開発ツール設定
npm install --save-dev @biomejs/biome
npx @biomejs/biome init

# 4. shadcn/ui設定
npx shadcn@latest init

# 5. データベース初期化
npx prisma init
# schema.prismaを編集後
npx prisma generate
npx prisma db push

# 6. 開発サーバー起動
npm run dev
```

## 初期実装の優先度

### 最優先（Week 1）

1. **基本環境構築** - Next.js + Biome + TypeScript
2. **データベース設計** - Prismaスキーマ作成
3. **認証システム** - better-auth基本設定
4. **通貨システム** - 基本的な通貨管理

### 高優先度（Week 2-3）

1. **口座管理** - CRUD機能
2. **基本UI** - レイアウト・ナビゲーション
3. **状態管理** - Jotaiの基本設定
4. **為替レート** - 外部API統合

### 中優先度（Week 4-6）

1. **予定管理** - スケジュール機能
2. **取引管理** - 手動入力機能
3. **レポート** - 基本的な集計

## トラブルシューティング

### よくある問題と解決策

#### 1. Prisma接続エラー

```bash
# データベース接続確認
npx prisma db pull
# スキーマリセット
npx prisma migrate reset
```

#### 2. better-auth設定エラー

```typescript
// 環境変数確認
console.log('BETTER_AUTH_SECRET:', process.env.BETTER_AUTH_SECRET?.length)
console.log('DATABASE_URL:', process.env.DATABASE_URL?.includes('postgresql'))
```

#### 3. Jotai SSR問題

```typescript
// Hydration mismatch回避
const [isClient, setIsClient] = useState(false)
useEffect(() => setIsClient(true), [])

if (!isClient) return null
```

## 品質管理

### コードレビューチェックポイント

- [ ] Biome rules compliance
- [ ] TypeScript strict mode
- [ ] Proper error handling
- [ ] Security considerations
- [ ] Performance optimizations
- [ ] Accessibility features

### テスト戦略

```typescript
// 基本テスト設定
// jest.config.js
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
}

module.exports = createJestConfig(customJestConfig)
```

この文書により、Claude Codeは段階的かつ効率的に開発を進められます。特に複数通貨対応とNext.js 15の特性を活かした実装が可能になります。
