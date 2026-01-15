# 次のステップ - Phase 4実装ガイド

## 即座に開始すべきタスク

### 1. データベーススキーマの確認・調整

```bash
# 現在のスキーマ確認
npm run db:studio

# 必要に応じてスキーマ更新
npm run db:push
```

**確認項目:**

- User.baseCurrencyフィールドの追加
- Account/Card/Transactionテーブルの整合性
- 外部キー制約の確認

### 2. Account管理ページの実装

**優先順位1**: `/accounts` ページ作成

```typescript
// app/accounts/page.tsx
// components/accounts/AccountList.tsx
// components/accounts/AccountForm.tsx
```

**機能要件:**

- 口座一覧表示 (残高・通貨込み)
- 新規口座追加フォーム
- 口座編集・削除機能
- 口座種別選択 (CASH/CHECKING/SAVINGS/FIXED_DEPOSIT)

### 3. Server Actions実装

**ファイル作成:**

```typescript
// lib/actions/accounts.ts - 口座CRUD
// lib/actions/cards.ts - カードCRUD
// lib/actions/currencies.ts - 通貨設定
```

**実装パターン:**

```typescript
'use server'

export async function createAccount(data: CreateAccountData) {
  // Zod validation
  // Prisma database operation
  // Error handling
  // revalidatePath
}
```

## 実装順序

### Week 1: データベース連携

1. **Day 1**: Prismaスキーマ調整・マイグレーション
2. **Day 2**: Account Server Actions実装
3. **Day 3**: Account管理UI作成
4. **Day 4**: Card Server Actions実装
5. **Day 5**: Card管理UI作成

### Week 2: 通貨・為替機能

1. **Day 1**: 為替レートAPI連携実装
2. **Day 2**: 通貨変換機能
3. **Day 3**: 多通貨表示UI
4. **Day 4**: 通貨設定画面
5. **Day 5**: テスト・バグ修正

## 重要なファイル

### 修正が必要なファイル

1. **lib/atoms/accounts.ts**: モックデータ → DB連携
2. **lib/atoms/currency.ts**: 静的レート → API取得
3. **components/dashboard/OverviewCards.tsx**: 実データ表示
4. **lib/auth.ts**: baseCurrency additionalFields確認

### 新規作成するファイル

1. **app/accounts/page.tsx** - 口座管理ページ
2. **app/cards/page.tsx** - カード管理ページ
3. **lib/actions/accounts.ts** - 口座Server Actions
4. **lib/actions/cards.ts** - カードServer Actions
5. **components/accounts/** - 口座管理UI
6. **components/cards/** - カード管理UI

## 技術的ポイント

### Decimal.js使用

```typescript
import Decimal from 'decimal.js'

// 金額計算は必ずDecimal.jsを使用
const total = new Decimal(amount1).plus(amount2)
```

### 多通貨対応

```typescript
// 取引記録時は必ず通貨+レートを保存
{
  amount: 1000,
  currency: 'USD',
  exchangeRate: 150.25, // USD/JPY rate at transaction time
}
```

### エラーハンドリング

```typescript
// Server Actions統一パターン
return {
  success: boolean,
  data?: T,
  error?: string,
}
```

## テスト戦略

### Phase 4テスト作成

```bash
# 作成するテストファイル
__tests__/lib/actions/accounts.test.ts
__tests__/lib/actions/cards.test.ts
__tests__/components/accounts/AccountList.test.tsx
__tests__/components/cards/CardList.test.tsx
```

### データベーステスト

- トランザクションでロールバック
- テスト専用データベース使用
- モック vs 実DB テストの使い分け

## 設定・環境

### 必要な環境変数追加

```bash
# .env.local に追加
EXCHANGE_RATE_API_KEY="your-api-key"  # 為替API
ENCRYPTION_KEY="your-encryption-key"   # 口座情報暗号化用
```

### パッケージ追加予定

```bash
npm install @fixer/fixer  # 為替レートAPI (例)
npm install crypto-js     # 暗号化ライブラリ (必要時)
```

## コード規約

### 命名規則

- **ファイル名**: PascalCase (コンポーネント), camelCase (utilities)
- **関数名**: camelCase
- **定数**: UPPER_SNAKE_CASE
- **型名**: PascalCase

### インポート順序

1. React/Next.js
2. 外部ライブラリ
3. 内部コンポーネント
4. 内部ユーティリティ
5. 型定義

### コンポーネント構造

```typescript
'use client' // 必要時のみ

// Imports
// Types
// Component
// Export
```

## Phase 4完了の定義

✅ **完了条件:**

1. 口座・カード管理の完全CRUD動作
2. 実データベース連携完了
3. 多通貨・為替レート機能動作
4. 全テスト通過 (Phase 3: 36 → Phase 4: 50+ 目標)
5. Docker環境での完全動作確認
6. TypeScript・Lint エラー0
7. ビルドプロセス正常

**予想期間**: 1-2週間  
**次フェーズ**: Phase 5 (Transaction & Scheduled Transaction System)
